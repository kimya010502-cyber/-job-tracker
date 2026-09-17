/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 25a
 * Phase F2-B · 스크롤 / 뷰포트 구조 PROBE
 *
 * 실제 노드에는 쓰지 않는다. 23b 와 같은 방식으로 최상위 프레임 1002:2 를 통째로 clone 해
 * 화면 밖에 두고, 복제본 안에서만 실험한 뒤 지운다.
 *   안 A : 1002:3 Main 을 스크롤 뷰포트로 (높이 824 / 828 / 838 / 848 비교)
 *   안 B : 1002:139 목록 Section 만 스크롤 (별도 복제본)
 *
 * 앞선 계산 정정
 *   23a 표는 "목록 시작 + 219×2 + gap + 조각" 이었다. 3번째 줄까지는 gap 을 두 번 지나야 해서
 *   모든 값이 gap 하나만큼 작았다. 이 probe 는 공식을 믿지 않고 복제본의 실제 좌표로 잰다.
 *
 * 모든 쓰기는 W() 를 지나고, W() 는 대상이 복제본 안에 있고 실제 id 가 아닐 때만 쓴다.
 * 실행 전후 실제 노드 스냅샷을 비교한다.
 * ========================================================================== */

const SCRIPT_VERSION = '25a-F2B-v1-scroll-viewport-probe';

const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', listSection: '1002:139',
  listContainer: '1009:2', grid: '1002:140', footer: '1002:451', header: '1002:469', aside: '1002:492'
};
const PROTECTED = ['1002:2', '1002:3', '1002:4', '1002:139', '1009:2', '1002:140', '1002:451', '1002:469', '1002:492'];
const VIEWPORTS = [824, 828, 838, 848];
const SLICE_TARGETS = [20, 30, 40];
const PROBE_TAG = 'JOOB F2B PROBE TEMP — 삭제해도 됨';
const FAR_X = 34000;

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function safeGet(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function pathOf(node, root) {
  const path = []; let cur = node;
  while (cur && cur.id !== root.id) { const p = cur.parent; if (!p || !Array.isArray(p.children)) return null; path.unshift(p.children.indexOf(cur)); cur = p; }
  return cur && cur.id === root.id ? path : null;
}
function atPath(root, path) { let cur = root; for (const i of path) { const cs = kids(cur); if (i < 0 || i >= cs.length) return null; cur = cs[i]; } return cur; }
function isInside(n, a) { let c = n; while (c) { if (c.id === a.id) return true; c = c.parent; } return false; }
function flow(n) { return kids(n).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function geo(n) { return { x: r2(n.x), y: r2(n.y), w: r2(n.width), h: r2(n.height) }; }
function pads(n) { return { t: r2(safeGet(n, 'paddingTop') || 0), b: r2(safeGet(n, 'paddingBottom') || 0), l: r2(safeGet(n, 'paddingLeft') || 0), r: r2(safeGet(n, 'paddingRight') || 0) }; }
/* node 의 y 를 ancestor 좌표계로 — 부모 y 를 차례로 더한다 (스크롤 오프셋 0 기준) */
function yIn(node, ancestor) {
  let y = 0, cur = node;
  while (cur && cur.id !== ancestor.id) { y += cur.y || 0; cur = cur.parent; }
  return cur ? r2(y) : null;
}
function visiblePx(top, bottom, viewTop, viewBottom) { return r2(Math.max(0, Math.min(bottom, viewBottom) - Math.max(top, viewTop))); }

/* ---------- 실제 노드 스냅샷 ---------- */
async function realSnapshot() {
  const snap = {};
  for (const id of PROTECTED) {
    const n = await figma.getNodeByIdAsync(id);
    snap[id] = n ? { g: geo(n), visible: n.visible, sizV: safeGet(n, 'layoutSizingVertical'), clip: safeGet(n, 'clipsContent'),
      overflow: safeGet(n, 'overflowDirection'), pos: safeGet(n, 'layoutPositioning'), childCount: kids(n).length,
      parent: n.parent ? n.parent.id : null } : 'missing';
  }
  return JSON.stringify(snap);
}
const realBefore = await realSnapshot();

const real = {};
for (const k of Object.keys(IDS)) real[k] = await figma.getNodeByIdAsync(IDS[k]);
const missing = Object.keys(IDS).filter(k => !real[k]);
if (missing.length) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '노드를 찾지 못했다: ' + missing.join(', '), realMutationCount: 0 });
if (!real.main.parent || real.main.parent.type !== 'PAGE') return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '1002:2 가 최상위 프레임이 아니다', realMutationCount: 0 });
const paths = {};
for (const k of Object.keys(IDS)) paths[k] = k === 'main' ? [] : pathOf(real[k], real.main);

/* ---------- 쓰기 관문 ---------- */
const clones = [];
let tempMutationCount = 0;
const log = [];
function W(node, what, fn) {
  if (!node || !clones.some(c => isInside(node, c))) throw new Error('복제본 밖 노드에는 쓰지 않는다: ' + what);
  if (PROTECTED.indexOf(node.id) >= 0) throw new Error('실제 노드 id 다: ' + what);
  tempMutationCount++; log.push(what);
  return fn();
}
function tryW(node, what, fn) { try { W(node, what, fn); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }
function makeClone(label, slot) {
  const c = real.main.clone();
  clones.push(c);
  if (!c.parent || c.parent.type !== 'PAGE') throw new Error('복제본이 페이지에 놓이지 않았다');
  W(c, '이름', () => { c.name = PROBE_TAG + ' / ' + label; });
  W(c, '위치', () => { c.x = real.main.x + FAR_X + slot * 1500; });
  const map = {};
  for (const k of Object.keys(IDS)) { map[k] = k === 'main' ? c : atPath(c, paths[k]); if (!map[k]) throw new Error(label + ' 복제본에서 ' + k + ' 를 찾지 못했다'); }
  return map;
}

/* ---------- 좌표 읽기 (Main 좌표계, 스크롤 0) ---------- */
function measure(c) {
  const cards = flow(c.grid);
  const rowTopsInGrid = cards.map(x => r2(x.y)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const gridTop = yIn(c.grid, c.mainContent);
  const cardH = cards.length ? r2(Math.max.apply(null, cards.map(x => x.height))) : null;
  const rows = rowTopsInGrid.map((y, i) => ({ row: i + 1, top: r2(gridTop + y), bottom: r2(gridTop + y + cardH) }));
  const footerTop = yIn(c.footer, c.mainContent);
  const p = pads(c.mainContent);
  const containerTop = yIn(c.contentContainer, c.mainContent);
  const containerBottom = r2(containerTop + c.contentContainer.height);
  return { gridTopInMain: gridTop, cardHeight: cardH, rowTopsInGrid, rows,
    footerTop, footerBottom: r2(footerTop + c.footer.height),
    containerTop, containerBottom, mainPadding: p,
    scrollContentHeight: r2(containerBottom + p.b) };
}

const result = {};
let aborted = false, abortReason = null;
try {
  /* ================= 안 A: 1002:3 Main 스크롤 ================= */
  const A = makeClone('A-main-scroll', 0);
  const base = measure(A);
  result.baseline = {
    mainContent: Object.assign(geo(A.mainContent), { sizV: safeGet(A.mainContent, 'layoutSizingVertical'), clip: safeGet(A.mainContent, 'clipsContent'), overflow: safeGet(A.mainContent, 'overflowDirection'),
      primaryAxisAlign: safeGet(A.mainContent, 'primaryAxisAlignItems'), padding: pads(A.mainContent) }),
    mainFrame: geo(A.main), contentContainer: Object.assign(geo(A.contentContainer), { sizV: safeGet(A.contentContainer, 'layoutSizingVertical') }),
    header: geo(A.header), aside: geo(A.aside), positions: base
  };
  result.cloneMatchesOriginal = near(A.mainContent.height, real.mainContent.height) && near(A.contentContainer.height, real.contentContainer.height) &&
    near(A.grid.height, real.grid.height) && near(A.footer.y, real.footer.y) && near(A.main.height, real.main.height);

  /* 정정된 공식 — 3번째 줄 위 = 목록 시작 + (카드 + gap) × 2 */
  const rowGap = r2(safeGet(A.grid, 'gridRowGap'));
  const formulaRow3Top = r2(base.gridTopInMain + (base.cardHeight + rowGap) * 2);
  result.formulaCheck = {
    oldFormula: '목록 시작 + 카드×2 + gap + 조각 (gap 하나 누락)',
    correctedFormula: '목록 시작 + (카드 + gap)×2 + 조각',
    row3TopByFormula: formulaRow3Top, row3TopMeasured: base.rows[2] ? base.rows[2].top : null,
    formulaMatchesMeasured: base.rows[2] ? near(formulaRow3Top, base.rows[2].top) : false,
    viewportForSlice: SLICE_TARGETS.map(s => ({ slice: s, viewport: r2((base.rows[2] ? base.rows[2].top : formulaRow3Top) + s) }))
  };

  /* 설정: FIXED → clip → VERTICAL (높이는 아래에서 바꿔 가며 잰다) */
  const ms = {};
  ms.sizingWrite = tryW(A.mainContent, 'Main FIXED', () => { A.mainContent.layoutSizingVertical = 'FIXED'; });
  ms.clipsWrite = tryW(A.mainContent, 'Main clip', () => { A.mainContent.clipsContent = true; });
  ms.overflowWrite = tryW(A.mainContent, 'Main overflow VERTICAL', () => { A.mainContent.overflowDirection = 'VERTICAL'; });
  ms.sizingAfter = safeGet(A.mainContent, 'layoutSizingVertical');
  ms.clipsAfter = safeGet(A.mainContent, 'clipsContent');
  ms.overflowDirectionAfter = safeGet(A.mainContent, 'overflowDirection');
  ms.setterAccepted = ms.sizingWrite.ok && ms.clipsWrite.ok && ms.overflowWrite.ok &&
    ms.sizingAfter === 'FIXED' && ms.clipsAfter === true && ms.overflowDirectionAfter === 'VERTICAL';
  result.mainScrollProbe = ms;

  const headerBefore = geo(A.header), asideBefore = geo(A.aside);
  const comparisons = [];
  let resizeAllOk = true;
  for (const H of VIEWPORTS) {
    const rw = tryW(A.mainContent, 'Main 높이 ' + H, () => { A.mainContent.resize(A.mainContent.width, H); });
    const m = measure(A);
    const vis = m.rows.map(r => visiblePx(r.top, r.bottom, 0, H));
    const row = {
      viewport: H, resizeOk: rw.ok && near(A.mainContent.height, H), widthAfter: r2(A.mainContent.width),
      sizingAfter: safeGet(A.mainContent, 'layoutSizingVertical'),
      contentContainerSizing: safeGet(A.contentContainer, 'layoutSizingVertical'), contentContainerHeight: r2(A.contentContainer.height),
      contentStartsAtPaddingTop: near(m.containerTop, m.mainPadding.t),
      rows: m.rows, row1Visible: vis[0], row2Visible: vis[1], row3Visible: vis[2],
      row3VisibleRatio: m.cardHeight ? r2(vis[2] / m.cardHeight) : null,
      row1Full: near(vis[0], m.cardHeight), row2Full: near(vis[1], m.cardHeight),
      footerTop: m.footerTop, footerVisible: m.footerTop < H, footerEntersViewport: m.footerTop < H,
      scrollContentHeight: m.scrollContentHeight, maxScrollDistance: r2(Math.max(0, m.scrollContentHeight - H)),
      bottomPadding: r2(m.scrollContentHeight - m.containerBottom),
      spaceBelowFooterAtEnd: r2(m.scrollContentHeight - m.footerBottom),
      scrollNeeded: m.scrollContentHeight > H,
      mainFrameHeightAfter: r2(A.main.height),
      asideTallerThanFrame: r2(A.aside.height) > r2(A.main.height) + 0.5,
      headerUnchanged: JSON.stringify(geo(A.header)) === JSON.stringify(headerBefore),
      asideUnchanged: JSON.stringify(geo(A.aside)) === JSON.stringify(asideBefore)
    };
    row.bottomPaddingOk = near(row.bottomPadding, m.mainPadding.b) && row.bottomPadding > 0;
    row.clippingProblem = !row.contentStartsAtPaddingTop || r2(A.contentContainer.x + A.contentContainer.width) > r2(A.mainContent.width) + 0.5;
    row.meetsGoal = row.row1Full && row.row2Full && row.row3Visible >= SLICE_TARGETS[0] - 0.5 && row.row3Visible <= SLICE_TARGETS[SLICE_TARGETS.length - 1] + 0.5 && !row.footerVisible;
    if (!row.resizeOk) resizeAllOk = false;
    comparisons.push(row);
  }
  result.viewportComparisons = comparisons;
  result.viewportResizeAccepted = resizeAllOk;

  /* Header / Aside */
  const mainChildren = kids(A.main);
  const headerFills = (safeGet(A.header, 'fills') || []).filter(f => f.visible !== false);
  const headerSolid = headerFills.filter(f => f.type === 'SOLID');
  const headerOpaque = headerSolid.some(f => (typeof f.opacity === 'number' ? f.opacity : 1) >= 0.99 && (!f.color || f.color.a === undefined || f.color.a >= 0.99));
  const headerNodeOpacity = r2(safeGet(A.header, 'opacity'));
  const lastVP = comparisons[comparisons.length - 1];
  result.headerAsideProbe = {
    siblingOrderInMainFrame: mainChildren.map(x => x.name + ' (' + (x === A.mainContent ? 'Main' : x === A.header ? 'Header' : x === A.aside ? 'Aside' : 'other') + ')'),
    headerIndex: mainChildren.indexOf(A.header), mainIndex: mainChildren.indexOf(A.mainContent), asideIndex: mainChildren.indexOf(A.aside),
    headerAboveMain: mainChildren.indexOf(A.header) > mainChildren.indexOf(A.mainContent),
    asideAboveMain: mainChildren.indexOf(A.aside) > mainChildren.indexOf(A.mainContent),
    headerOutsideScroll: !isInside(A.header, A.mainContent), asideOutsideScroll: !isInside(A.aside, A.mainContent),
    headerPositioning: safeGet(A.header, 'layoutPositioning'), asidePositioning: safeGet(A.aside, 'layoutPositioning'),
    unchanged: comparisons.every(x => x.headerUnchanged && x.asideUnchanged),
    headerBounds: headerBefore, asideBounds: asideBefore,
    headerOverlapsMainTop: A.header.y < A.mainContent.y + A.mainContent.height && A.header.x < A.mainContent.x + A.mainContent.width &&
      A.header.x + A.header.width > A.mainContent.x,
    mainPaddingTopEqualsHeaderHeight: near(pads(A.mainContent).t, A.header.height),
    headerFills: headerFills.map(f => ({ type: f.type, opacity: f.opacity, visible: f.visible })),
    headerNodeOpacity,
    headerBackgroundOccludesContent: headerOpaque && (headerNodeOpacity === null || headerNodeOpacity >= 0.99),
    asideHeight: r2(A.aside.height), mainFrameHeightWithViewport: lastVP ? lastVP.mainFrameHeightAfter : null,
    asideTallerThanFrameNote: lastVP && lastVP.asideTallerThanFrame
      ? 'Main 을 FIXED 로 줄이면 HUG 인 1002:2 도 ' + lastVP.mainFrameHeightAfter + ' 로 줄어드는데 Aside 는 FIXED ' + r2(A.aside.height) +
        ' 이다 — Aside 가 프레임 아래로 삐져나온다. F2-B 적용 때 Aside 높이(또는 1002:2 높이)도 함께 정해야 한다'
      : null
  };

  /* ================= 안 B: 목록 Section 만 스크롤 ================= */
  const B = makeClone('B-list-scroll', 1);
  const bBase = measure(B);
  const sectionTopInMain = yIn(B.listSection, B.mainContent);
  const listRow3TopInSection = r2((bBase.cardHeight + rowGap) * 2);
  const sectionViewport = r2(listRow3TopInSection + 30);
  const bw = {
    sizing: tryW(B.listSection, 'Section FIXED', () => { B.listSection.layoutSizingVertical = 'FIXED'; }),
    resize: tryW(B.listSection, 'Section 높이', () => { B.listSection.resize(B.listSection.width, sectionViewport); }),
    clip: tryW(B.listSection, 'Section clip', () => { B.listSection.clipsContent = true; }),
    overflow: tryW(B.listSection, 'Section overflow', () => { B.listSection.overflowDirection = 'VERTICAL'; })
  };
  const bAfter = measure(B);
  const listContentH = r2(B.listContainer.height + pads(B.listSection).t + pads(B.listSection).b);
  result.listScrollProbe = {
    writes: bw, allAccepted: Object.keys(bw).every(k => bw[k].ok),
    sectionHeight: r2(B.listSection.height), sectionTopInMain, listViewportForSlice30: sectionViewport,
    row3VisibleInList: visiblePx(listRow3TopInSection, listRow3TopInSection + bBase.cardHeight, 0, sectionViewport),
    listScrollContentHeight: listContentH, maxScrollDistance: r2(Math.max(0, listContentH - sectionViewport)),
    footerInsideListScroll: isInside(B.footer, B.listSection),
    mainContentHeightAfter: r2(B.mainContent.height), mainFrameHeightAfter: r2(B.main.height),
    pageStillTallerThan1024: r2(B.main.height) > 1024,
    kpiToolbarScrollWithList: false
  };

  const LB = result.listScrollProbe;
  const bestA = comparisons.filter(x => x.meetsGoal);
  result.candidateComparison = {
    mainScroll: { node: IDS.mainContent,
      nestedScrollRisk: '없음 — 화면에 스크롤 영역이 하나뿐이다',
      headerAside: result.headerAsideProbe.headerOutsideScroll && result.headerAsideProbe.asideOutsideScroll ? 'Main 밖이라 고정된 채 남는다 (실측 bounds 불변)' : '확인 필요',
      kpiToolbar: '같이 위로 스크롤된다 — 의도와 맞다',
      listOnly: false,
      uxNaturalness: '웹 페이지 스크롤과 같다',
      handoff: '사이드바·헤더 고정 + 본문 overflow-y: auto — 흔한 구조',
      goalAchievable: bestA.length > 0, viewportsMeetingGoal: bestA.map(x => x.viewport + ' (3번째 줄 ' + x.row3Visible + 'px)'),
      bottomSpacing: comparisons.length ? comparisons[0].bottomPadding + 'px (Main padding-bottom), footer 아래 ' + comparisons[0].spaceBelowFooterAtEnd + 'px' : null,
      complexity: '속성 4개 (Main 세로 FIXED · 높이 · clip · overflow) + Aside/프레임 높이 정리' },
    listScroll: { node: IDS.listSection,
      nestedScrollRisk: LB.mainFrameHeightAfter > 1024
        ? '있음 — 페이지 높이 ' + LB.mainFrameHeightAfter + ' 가 화면보다 커서 페이지 스크롤과 목록 스크롤이 겹친다'
        : '페이지 높이 ' + LB.mainFrameHeightAfter + ' 는 화면 안이지만, 화면 높이가 이보다 작아지면 페이지 스크롤과 목록 스크롤이 겹친다',
      headerAside: '영향 없음',
      kpiToolbar: '고정된다 — 의도(같이 사라져도 됨)와 반대',
      listOnly: true,
      uxNaturalness: '관리 화면 안의 작은 스크롤 영역 — 휠이 어디에 걸리는지 헷갈린다',
      handoff: '목록 컨테이너 고정 높이 + 내부 스크롤, 반응형 높이 계산이 필요하다',
      goalAchievable: LB.allAccepted, listViewport: LB.listViewportForSlice30, row3Visible: LB.row3VisibleInList,
      bottomSpacing: 'footer 가 목록 스크롤 안 마지막에 붙는다 — 페이지 아래 여백과 따로 논다',
      complexity: 'Section 속성 4개 + 페이지 높이 결정 + 중첩 스크롤 처리' }
  };

  /* 추천 — 실측으로 목표를 만족하는 높이 중, 3번째 줄이 30px 이상 보이는 가장 작은 값 */
  const clearly = bestA.filter(x => x.row3Visible >= 29.5).sort((a, b) => a.viewport - b.viewport)[0] || bestA[bestA.length - 1] || null;
  result.recommendedScrollContainer = { node: IDS.mainContent, name: 'Main',
    basis: '헤더·사이드바 밖, 중첩 스크롤 없음, KPI·Toolbar 가 같이 스크롤되는 의도와 일치, 목표 노출량 실측 달성' };
  result.recommendedViewport = clearly ? { height: clearly.viewport, row3Visible: clearly.row3Visible, ratio: clearly.row3VisibleRatio,
    basis: '실측으로 1·2번째 줄 전부 보이고 footer 가 안 보이는 높이 중, 3번째 줄이 30px 이상 보여 "더 있다" 가 분명한 가장 작은 값',
    alternatives: bestA.map(x => ({ height: x.viewport, row3Visible: x.row3Visible })) } : null;
} catch (e) {
  aborted = true; abortReason = e.message; errors.push('실험 중단: ' + e.message);
}

/* ---------- 정리 ---------- */
const cleanup = { tempNodesCreated: clones.map(c => c.id), tempNodesRemoved: [], failed: [] };
for (const c of clones) {
  try { if (!c.removed) c.remove(); cleanup.tempNodesRemoved.push(c.id); } catch (e) { cleanup.failed.push({ id: c.id, error: e.message }); }
}
cleanup.strayTempNodes = kids(figma.currentPage).filter(n => typeof n.name === 'string' && n.name.indexOf(PROBE_TAG) === 0).map(n => n.id);
const realAfter = await realSnapshot();
cleanup.realNodesMutated = realAfter !== realBefore;
if (cleanup.realNodesMutated) errors.push('실제 노드 스냅샷이 달라졌다 — 결과를 신뢰하지 말 것');
if (cleanup.failed.length || cleanup.strayTempNodes.length) errors.push("임시 노드가 남았다 — '" + PROBE_TAG + "' 로 시작하는 프레임을 지워주세요");

const VC = result.viewportComparisons || [];
const HA = result.headerAsideProbe || {};
const gate = {
  notAborted: !aborted,
  cloneMatchesOriginal: result.cloneMatchesOriginal === true,
  mainScrollSettingsAccepted: !!result.mainScrollProbe && result.mainScrollProbe.setterAccepted === true,
  viewportResizeAccepted: result.viewportResizeAccepted === true,
  clipsAccepted: !!result.mainScrollProbe && result.mainScrollProbe.clipsAfter === true,
  overflowDirectionAccepted: !!result.mainScrollProbe && result.mainScrollProbe.overflowDirectionAfter === 'VERTICAL',
  contentRemainsHug: VC.length === VIEWPORTS.length && VC.every(x => x.contentContainerSizing === 'HUG' && near(x.contentContainerHeight, real.contentContainer.height)),
  rowPositionsResolved: !!result.formulaCheck && result.formulaCheck.formulaMatchesMeasured === true,
  viewportMathResolved: VC.length === VIEWPORTS.length && VC.every(x => typeof x.row3Visible === 'number' && typeof x.maxScrollDistance === 'number'),
  headerOutsideScrollConfirmed: HA.headerOutsideScroll === true && HA.unchanged === true,
  asideOutsideScrollConfirmed: HA.asideOutsideScroll === true && HA.unchanged === true,
  noUnexpectedClipping: VC.length > 0 && VC.every(x => !x.clippingProblem),
  bottomPaddingResolved: VC.length > 0 && VC.every(x => x.bottomPaddingOk),
  candidateComparisonResolved: !!result.candidateComparison && !!result.listScrollProbe && result.listScrollProbe.allAccepted === true,
  tempNodesRemoved: clones.length === 2 && cleanup.failed.length === 0 && cleanup.strayTempNodes.length === 0,
  realNodesNotMutated: cleanup.realNodesMutated === false,
  noErrors: errors.length === 0
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'PROBE',
  realMutationCount: cleanup.realNodesMutated ? 'SNAPSHOT_CHANGED' : 0, tempMutationCount,
  aborted, abortReason,
  gate, gatePassed, gateFailures: Object.keys(gate).filter(k => !gate[k]),
  baseline: result.baseline, cloneMatchesOriginal: result.cloneMatchesOriginal,
  formulaCheck: result.formulaCheck,
  mainScrollProbe: result.mainScrollProbe,
  viewportComparisons: VC,
  headerAsideProbe: HA,
  listScrollProbe: result.listScrollProbe,
  candidateComparison: result.candidateComparison,
  recommendedViewport: result.recommendedViewport,
  recommendedScrollContainer: result.recommendedScrollContainer,
  cleanup,
  notes, errorCount: errors.length, errors: errors.slice(0, 10), writeLogSample: log.slice(0, 40),
  nextStep: gatePassed ? 'probe 통과. 뷰포트 높이와 Aside/프레임 높이 처리를 결정한 뒤 F2-B DRY_RUN 을 설계합니다.' : '실패한 gate 항목을 확인해주세요.'
});
