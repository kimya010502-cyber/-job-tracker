/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 23b
 * Phase F2-A · Grid / Footer / content 높이 구조 PROBE
 *
 * 실제 노드에는 쓰지 않는다. 메인 화면 1002:2 를 통째로 clone 해서 화면 밖 먼 곳에 두고,
 * 그 복제본 안에서만 실험한 뒤 복제본을 지운다.
 *
 * 왜 1002:2 를 복제하나
 *   1002:4 같은 중간 노드를 clone 하면 Figma 는 복제본을 같은 부모(Auto Layout)에 먼저 넣는다.
 *   그 순간 실제 1002:3 Main 의 높이가 잠깐 바뀐다. 최상위 프레임 1002:2 를 복제하면
 *   복제본이 페이지에 바로 들어가 실제 노드가 한 번도 흔들리지 않는다.
 *
 * 쓰기는 전부 W() 를 지나고, W() 는 대상이 복제본 안에 있는지 확인한 뒤에만 쓴다.
 * 실행 전후 실제 노드 스냅샷을 비교한다 (realNodesMutated).
 *
 * 기대값은 파일에서 읽은 값으로 계산한다. 사용자 메시지 숫자는 참고값으로 나란히 출력한다.
 * ========================================================================== */

const SCRIPT_VERSION = '23b-F2A-v1-layout-probe';

const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', topHeader: '1009:698', addRow: '1009:715',
  kpiStrip: '1002:23', toolbar: '1003:1695', listSection: '1002:139', listContainer: '1009:2',
  grid: '1002:140', footer: '1002:451', footerLeft: '1002:452', pagination: '1002:458'
};
const PROTECTED = ['1002:140', '1002:451', '1002:458', '1009:2', '1002:139', '1002:4', '1002:3', '1002:2'];
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const PLAN = { rowTrack: 219, rowGap: 24 };
const USER_NUMBERS = { gridHeight: 705, rowYs: [0, 243, 486], cardBottom: 705, footerY: 717,
  footerHeightWithPagination: 52, listHeightWithPagination: 769, footerHeightHidden: 40, listHeightHidden: 757, contentContainer: 1015 };
const PROBE_TAG = 'JOOB F2A PROBE TEMP — 삭제해도 됨';
const FAR_X = 30000;

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
function trackValue(t) { if (typeof t === 'number') return r2(t); if (t && typeof t === 'object' && typeof t.value === 'number') return r2(t.value); return null; }
function lay(n) {
  return { lm: safeGet(n, 'layoutMode'), sizV: safeGet(n, 'layoutSizingVertical'), sizH: safeGet(n, 'layoutSizingHorizontal'),
    pT: r2(safeGet(n, 'paddingTop') || 0), pB: r2(safeGet(n, 'paddingBottom') || 0), pL: r2(safeGet(n, 'paddingLeft') || 0), pR: r2(safeGet(n, 'paddingRight') || 0),
    gap: r2(safeGet(n, 'itemSpacing') || 0), sb: safeGet(n, 'primaryAxisAlignItems') === 'SPACE_BETWEEN' };
}
/* Auto Layout 세로 HUG 공식 — 보이는 흐름 자식만 센다 */
function flow(n) { return kids(n).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function verticalHugHeight(n) {
  const L = lay(n), f = flow(n);
  if (L.lm === 'VERTICAL') return r2(L.pT + L.pB + f.reduce((a, c) => a + c.height, 0) + (L.sb ? 0 : L.gap * Math.max(0, f.length - 1)));
  if (L.lm === 'HORIZONTAL') return f.length ? r2(L.pT + L.pB + Math.max.apply(null, f.map(c => c.height))) : r2(L.pT + L.pB);
  return null;
}

/* ---------- 실제 노드 스냅샷 ---------- */
async function realSnapshot() {
  const snap = {};
  for (const id of PROTECTED.concat(PAG_OLD_IDS)) {
    const n = await figma.getNodeByIdAsync(id);
    snap[id] = n ? { w: r2(n.width), h: r2(n.height), x: r2(n.x), y: r2(n.y), visible: n.visible,
      pos: safeGet(n, 'layoutPositioning'), sizV: safeGet(n, 'layoutSizingVertical'), sizH: safeGet(n, 'layoutSizingHorizontal'),
      rows: safeGet(n, 'gridRowSizes'), rowGap: safeGet(n, 'gridRowGap'), childCount: kids(n).length,
      parent: n.parent ? n.parent.id : null } : 'missing';
  }
  return JSON.stringify(snap);
}
const realBefore = await realSnapshot();

/* ---------- 원본에서 경로와 기준값 읽기 ---------- */
const real = {};
for (const k of Object.keys(IDS)) real[k] = await figma.getNodeByIdAsync(IDS[k]);
const missing = Object.keys(IDS).filter(k => !real[k]);
if (missing.length) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '노드를 찾지 못했다: ' + missing.join(', '), realMutationCount: 0 });
if (!real.main.parent || real.main.parent.type !== 'PAGE') {
  return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '1002:2 가 최상위 프레임이 아니다 — 복제 방식이 안전하지 않다', realMutationCount: 0 });
}
const paths = {};
for (const k of Object.keys(IDS)) paths[k] = k === 'main' ? [] : pathOf(real[k], real.main);
const cardH = Math.max.apply(null, flow(real.grid).map(c => r2(c.height)));
const cardsSameHeight = flow(real.grid).every(c => near(c.height, cardH));
const rowCount = safeGet(real.grid, 'gridRowCount');

/* ---------- 복제 ---------- */
let clone = null, probeCreated = false;
const tempIds = [];
let tempMutationCount = 0;
const log = [];
function W(node, what, fn) {
  if (!clone) throw new Error('복제본이 없다: ' + what);
  if (!node || !isInside(node, clone)) throw new Error('복제본 밖 노드에는 쓰지 않는다: ' + what);
  if (PROTECTED.indexOf(node.id) >= 0 || PAG_OLD_IDS.indexOf(node.id) >= 0) throw new Error('실제 노드 id 다: ' + what);
  tempMutationCount++; log.push(what);
  return fn();
}
function tryW(node, what, fn) { try { W(node, what, fn); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }

const result = { gridProbe: {}, footerProbe: {}, propagationProbe: {}, hiddenNodesProbe: {} };
let aborted = false, abortReason = null;

try {
  clone = real.main.clone();                    /* 최상위 프레임이라 페이지에 바로 들어간다 */
  probeCreated = true; tempIds.push(clone.id);
  if (!clone.parent || clone.parent.type !== 'PAGE') throw new Error('복제본이 페이지에 놓이지 않았다');
  W(clone, '이름', () => { clone.name = PROBE_TAG; });
  W(clone, '위치', () => { clone.x = real.main.x + FAR_X; });
  const c = {};
  for (const k of Object.keys(IDS)) {
    c[k] = k === 'main' ? clone : atPath(clone, paths[k]);
    if (!c[k]) throw new Error('복제본에서 ' + k + ' 를 찾지 못했다');
  }

  /* ---------- 0. 복제 직후 기준 — 원본과 같은지 ---------- */
  const base = { grid: r2(c.grid.height), list: r2(c.listContainer.height), section: r2(c.listSection.height),
    container: r2(c.contentContainer.height), footerY: r2(c.footer.y), footerH: r2(c.footer.height) };
  result.cloneMatchesOriginal = near(base.grid, real.grid.height) && near(base.list, real.listContainer.height) &&
    near(base.container, real.contentContainer.height) && near(base.footerY, real.footer.y);
  result.cloneBaseline = base;

  /* ---------- 1. Grid ---------- */
  const g = result.gridProbe;
  const wantTracks = [];
  for (let i = 0; i < rowCount; i++) wantTracks.push({ type: 'FIXED', value: PLAN.rowTrack });
  g.planRowTrack = PLAN.rowTrack; g.planRowGap = PLAN.rowGap; g.cardHeight = cardH; g.cardsSameHeight = cardsSameHeight;
  const tr = tryW(c.grid, 'gridRowSizes', () => { c.grid.gridRowSizes = wantTracks; });
  g.rowTracksWrite = tr;
  const tracksAfter = safeGet(c.grid, 'gridRowSizes');
  g.rowTracksAfter = tracksAfter;
  g.setterAccepted = tr.ok && Array.isArray(tracksAfter) && tracksAfter.length === rowCount &&
    tracksAfter.every(t => t && t.type === 'FIXED' && near(trackValue(t), PLAN.rowTrack));
  const gp = tryW(c.grid, 'gridRowGap', () => { c.grid.gridRowGap = PLAN.rowGap; });
  g.rowGapWrite = gp;
  g.rowGapAfter = r2(safeGet(c.grid, 'gridRowGap'));
  g.rowGapAccepted = gp.ok && near(g.rowGapAfter, PLAN.rowGap);
  g.columnGapAfter = r2(safeGet(c.grid, 'gridColumnGap'));
  g.columnGapUnchanged = near(g.columnGapAfter, safeGet(real.grid, 'gridColumnGap'));
  const expectGridH = r2(PLAN.rowTrack * rowCount + PLAN.rowGap * (rowCount - 1));
  g.gridHeightExpected = expectGridH;
  g.gridHeightAfter = r2(c.grid.height);
  g.gridWidthAfter = r2(c.grid.width);
  g.gridSizeAfter = g.gridWidthAfter + '×' + g.gridHeightAfter;
  g.rowYsExpected = Array.from({ length: rowCount }, (_, i) => r2(i * (PLAN.rowTrack + PLAN.rowGap)));
  g.rowYsAfter = flow(c.grid).map(x => r2(x.y)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  g.cardBottomAfter = r2(Math.max.apply(null, flow(c.grid).map(x => x.y + x.height)));
  g.overflowAfter = r2(g.cardBottomAfter - g.gridHeightAfter);
  g.ok = g.setterAccepted && g.rowGapAccepted && near(g.gridHeightAfter, expectGridH) &&
    JSON.stringify(g.rowYsAfter) === JSON.stringify(g.rowYsExpected) && near(g.overflowAfter, 0);
  g.userNumbers = { gridHeight: USER_NUMBERS.gridHeight, rowYs: USER_NUMBERS.rowYs, cardBottom: USER_NUMBERS.cardBottom };
  g.matchesUserNumbers = near(g.gridHeightAfter, USER_NUMBERS.gridHeight) && JSON.stringify(g.rowYsAfter) === JSON.stringify(USER_NUMBERS.rowYs);

  /* ---------- 2. Footer ABSOLUTE → AUTO (Pagination 보이는 상태) ---------- */
  const f = result.footerProbe;
  const listGap = lay(c.listContainer).gap;
  f.positioningBefore = safeGet(c.footer, 'layoutPositioning');
  const fa = tryW(c.footer, 'footer AUTO', () => { c.footer.layoutPositioning = 'AUTO'; });
  f.absoluteToAutoWrite = fa;
  f.positioningAfter = safeGet(c.footer, 'layoutPositioning');
  f.absoluteToAutoAccepted = fa.ok && f.positioningAfter === 'AUTO';
  f.orderInList = kids(c.listContainer).map(x => x === c.grid ? 'Grid' : (x === c.footer ? 'Footer' : x.name));
  f.orderGridThenFooter = kids(c.listContainer).indexOf(c.grid) < kids(c.listContainer).indexOf(c.footer);
  f.footerYExpected = r2(g.gridHeightAfter + listGap + lay(c.listContainer).pT);
  f.footerYWithPagination = r2(c.footer.y);
  f.footerHeightWithPagination = r2(c.footer.height);
  f.listHeightWithPaginationExpected = r2(lay(c.listContainer).pT + lay(c.listContainer).pB + g.gridHeightAfter + listGap + f.footerHeightWithPagination);
  f.listHeightWithPagination = r2(c.listContainer.height);
  f.withPaginationOk = f.absoluteToAutoAccepted && f.orderGridThenFooter && near(f.footerYWithPagination, f.footerYExpected) &&
    near(f.listHeightWithPagination, f.listHeightWithPaginationExpected);

  /* ---------- 3. Pagination 숨김 ---------- */
  const leftBefore = { x: r2(c.footerLeft.x), y: r2(c.footerLeft.y) };
  const ph = tryW(c.pagination, 'pagination hidden', () => { c.pagination.visible = false; });
  f.paginationHiddenWrite = ph;
  f.paginationHiddenAccepted = ph.ok && c.pagination.visible === false;
  f.paginationRemovedFromFlow = flow(c.footer).indexOf(c.pagination) < 0;
  const Lf = lay(c.footer);
  f.footerHeightExpectedHidden = r2(Lf.pT + Lf.pB + Math.max.apply(null, flow(c.footer).map(x => x.height)));
  f.footerHeightAfter = r2(c.footer.height);
  f.footerYAfter = r2(c.footer.y);
  f.leftInfoBefore = leftBefore;
  f.leftInfoAfter = { x: r2(c.footerLeft.x), y: r2(c.footerLeft.y), h: r2(c.footerLeft.height) };
  f.leftInfoNote = 'SPACE_BETWEEN 에 자식이 하나만 남으면 앞쪽(padding-left)에 놓인다';
  f.listHeightHiddenExpected = r2(lay(c.listContainer).pT + lay(c.listContainer).pB + g.gridHeightAfter + listGap + f.footerHeightAfter);
  f.listHeightHidden = r2(c.listContainer.height);
  f.hiddenOk = f.paginationHiddenAccepted && f.paginationRemovedFromFlow && near(f.footerHeightAfter, f.footerHeightExpectedHidden) &&
    near(f.footerYAfter, f.footerYExpected) && near(f.listHeightHidden, f.listHeightHiddenExpected);

  /* ---------- 4. Footer 폭 FILL ---------- */
  f.footerWidthModeBefore = safeGet(c.footer, 'layoutSizingHorizontal');
  const fw = tryW(c.footer, 'footer FILL', () => { c.footer.layoutSizingHorizontal = 'FILL'; });
  f.fillWrite = fw;
  f.footerWidthMode = safeGet(c.footer, 'layoutSizingHorizontal');
  f.footerWidthAfter = r2(c.footer.width);
  f.fillKeepsWidth = fw.ok && f.footerWidthMode === 'FILL' && near(f.footerWidthAfter, c.listContainer.width - lay(c.listContainer).pL - lay(c.listContainer).pR);
  f.userNumbers = { footerY: USER_NUMBERS.footerY, footerHeightWithPagination: USER_NUMBERS.footerHeightWithPagination,
    listHeightWithPagination: USER_NUMBERS.listHeightWithPagination, footerHeightHidden: USER_NUMBERS.footerHeightHidden, listHeightHidden: USER_NUMBERS.listHeightHidden };

  /* ---------- 5. 높이 전파 · 1002:4 HUG ---------- */
  const p = result.propagationProbe;
  p.listContainerHeight = r2(c.listContainer.height);
  p.listSectionExpected = verticalHugHeight(c.listSection);
  p.listSectionHeight = r2(c.listSection.height);
  p.contentContainerSizingBefore = safeGet(c.contentContainer, 'layoutSizingVertical');
  p.contentContainerHeightBeforeHug = r2(c.contentContainer.height);
  const hug = tryW(c.contentContainer, '1002:4 HUG', () => { c.contentContainer.layoutSizingVertical = 'HUG'; });
  p.hugWrite = hug;
  p.contentContainerSizingAfter = safeGet(c.contentContainer, 'layoutSizingVertical');
  p.contentContainerExpected = verticalHugHeight(c.contentContainer);
  p.contentContainerHeight = r2(c.contentContainer.height);
  p.contentContainerFormula = flow(c.contentContainer).map(x => x.name + ' ' + r2(x.height)).join(' + gap ' + lay(c.contentContainer).gap + ' + ') +
    ' (+ padding ' + lay(c.contentContainer).pT + '/' + lay(c.contentContainer).pB + ')';
  p.mainContentHeightAfter = r2(c.mainContent.height);
  p.mainContentSizing = safeGet(c.mainContent, 'layoutSizingVertical');
  p.mainFrameHeightAfter = r2(clone.height);
  p.mainFrameNote = '1002:3 · 1002:2 는 F2-A 에서 바꾸지 않는다. 다만 둘 다 세로 HUG 라 콘텐츠가 길어지면 같이 커진다 — F2-B 에서 뷰포트를 정할 때 참고';
  p.expectedVsActual = {
    listContainer: { expected: f.listHeightHiddenExpected, actual: p.listContainerHeight, same: near(f.listHeightHiddenExpected, p.listContainerHeight) },
    listSection: { expected: p.listSectionExpected, actual: p.listSectionHeight, same: near(p.listSectionExpected, p.listSectionHeight) },
    contentContainer: { expected: p.contentContainerExpected, actual: p.contentContainerHeight, same: near(p.contentContainerExpected, p.contentContainerHeight) }
  };
  p.userNumbers = { contentContainer: USER_NUMBERS.contentContainer };
  p.ok = hug.ok && p.contentContainerSizingAfter === 'HUG' && Object.keys(p.expectedVsActual).every(k => p.expectedVsActual[k].same);

  /* ---------- 6. 숨긴 old 노드가 HUG 계산에 들어가는가 ---------- */
  const h = result.hiddenNodesProbe;
  const checks = [];
  const scanRoots = [c.contentContainer];
  const autoFrames = [];
  (function walk(n, depth) {
    if (depth > 4 || n.type === 'INSTANCE') return;
    if ((safeGet(n, 'layoutMode') === 'VERTICAL' || safeGet(n, 'layoutMode') === 'HORIZONTAL') && kids(n).some(k => k.visible === false)) autoFrames.push(n);
    for (const k of kids(n)) walk(k, depth + 1);
  })(c.contentContainer, 0);
  for (const n of autoFrames) {
    const L = lay(n);
    const hugV = safeGet(n, 'layoutSizingVertical') === 'HUG';
    const withHidden = (function () {
      const all = kids(n).filter(k => safeGet(k, 'layoutPositioning') !== 'ABSOLUTE');
      if (L.lm === 'VERTICAL') return r2(L.pT + L.pB + all.reduce((a, k) => a + k.height, 0) + (L.sb ? 0 : L.gap * Math.max(0, all.length - 1)));
      return all.length ? r2(L.pT + L.pB + Math.max.apply(null, all.map(k => k.height))) : null;
    })();
    checks.push({ id: n.id, name: n.name, layoutMode: L.lm, hugVertical: hugV,
      hiddenChildren: kids(n).filter(k => k.visible === false).map(k => k.name + ' ' + r2(k.width) + '×' + r2(k.height)),
      heightActual: r2(n.height), heightIfHiddenIgnored: verticalHugHeight(n), heightIfHiddenCounted: withHidden,
      ignoresHidden: !hugV ? null : near(n.height, verticalHugHeight(n)),
      distinguishable: withHidden !== null && !near(withHidden, verticalHugHeight(n)) });
  }
  h.framesWithHiddenChildren = checks;
  h.hiddenNodesIgnoredByLayout = checks.length > 0 && checks.filter(x => x.hugVertical).every(x => x.ignoresHidden === true);
  h.note = checks.some(x => x.hugVertical && x.distinguishable)
    ? '숨긴 자식을 넣었을 때와 뺐을 때 높이가 다른 프레임에서 실제 높이가 "뺀 값" 과 같다 — 숨긴 노드는 계산에서 빠진다'
    : '숨긴 자식이 있어도 높이 차이가 나지 않는 경우만 있어 구분이 약하다 — 결과를 그대로 믿기 어렵다';
  h.evidenceStrong = checks.some(x => x.hugVertical && x.distinguishable && x.ignoresHidden === true);
} catch (e) {
  aborted = true; abortReason = e.message; errors.push('실험 중단: ' + e.message);
}

/* ---------- 정리 ---------- */
const cleanup = { tempNodesCreated: tempIds.slice(), tempNodesRemoved: [], failed: [] };
if (clone) {
  try { if (!clone.removed) clone.remove(); cleanup.tempNodesRemoved.push(clone.id); }
  catch (e) { cleanup.failed.push({ id: clone.id, error: e.message }); }
}
cleanup.strayTempNodes = kids(figma.currentPage).filter(n => n.name === PROBE_TAG).map(n => n.id);
const realAfter = await realSnapshot();
cleanup.realNodesMutated = realAfter !== realBefore;
if (cleanup.realNodesMutated) errors.push('실제 노드 스냅샷이 달라졌다 — 결과를 신뢰하지 말 것');
if (cleanup.failed.length || cleanup.strayTempNodes.length) {
  errors.push("임시 노드가 남았다 — 캔버스에서 '" + PROBE_TAG + "' 를 지워주세요: " + JSON.stringify(cleanup.strayTempNodes));
}

const G = result.gridProbe, F = result.footerProbe, P = result.propagationProbe, H = result.hiddenNodesProbe;
const gate = {
  notAborted: !aborted,
  cloneMatchesOriginal: result.cloneMatchesOriginal === true,
  cardsSameHeight: cardsSameHeight,
  gridRowTracksSetterAccepted: G.setterAccepted === true,
  gridRowGapAccepted: G.rowGapAccepted === true,
  gridHeightAsExpected: near(G.gridHeightAfter, G.gridHeightExpected),
  rowYsAsExpected: JSON.stringify(G.rowYsAfter) === JSON.stringify(G.rowYsExpected),
  cardOverflowZero: near(G.overflowAfter, 0),
  footerAbsoluteToAutoAccepted: F.absoluteToAutoAccepted === true,
  footerFollowsGrid: F.withPaginationOk === true,
  paginationHiddenRemovedFromFlow: F.hiddenOk === true,
  footerFillKeepsWidth: F.fillKeepsWidth === true,
  heightPropagationAsExpected: P.ok === true,
  hiddenNodesIgnoredByLayout: H.hiddenNodesIgnoredByLayout === true,
  tempNodesRemoved: cleanup.failed.length === 0 && cleanup.strayTempNodes.length === 0 && tempIds.length > 0,
  realNodesNotMutated: cleanup.realNodesMutated === false,
  noErrors: errors.length === 0
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'PROBE',
  writeScope: '1002:2 복제본 안의 노드만. 실제 노드 쓰기 0',
  realMutationCount: cleanup.realNodesMutated ? 'SNAPSHOT_CHANGED' : 0,
  tempMutationCount, aborted, abortReason,
  gate, gatePassed, gateFailures: Object.keys(gate).filter(k => !gate[k]),
  cloneBaseline: result.cloneBaseline, cloneMatchesOriginal: result.cloneMatchesOriginal,
  gridProbe: G, footerProbe: F, propagationProbe: P, hiddenNodesProbe: H,
  cleanup,
  userNumbersVsProbe: {
    gridHeight: [USER_NUMBERS.gridHeight, G.gridHeightAfter], rowYs: [USER_NUMBERS.rowYs, G.rowYsAfter],
    footerY: [USER_NUMBERS.footerY, F.footerYAfter], footerHeightWithPagination: [USER_NUMBERS.footerHeightWithPagination, F.footerHeightWithPagination],
    listHeightWithPagination: [USER_NUMBERS.listHeightWithPagination, F.listHeightWithPagination],
    footerHeightHidden: [USER_NUMBERS.footerHeightHidden, F.footerHeightAfter], listHeightHidden: [USER_NUMBERS.listHeightHidden, F.listHeightHidden],
    contentContainer: [USER_NUMBERS.contentContainer, P.contentContainerHeight]
  },
  copyPlanNote: '이 probe 는 문구를 바꾸지 않는다. "중 1-8 표시" 제거 방식은 DRY_RUN 전에 따로 계획한다',
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  writeLogSample: log.slice(0, 30),
  nextStep: gatePassed ? 'probe 통과. 결과를 확인받은 뒤 F2-A DRY_RUN 을 설계합니다.' : '실패한 gate 항목을 확인해주세요.'
});
