/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 24
 * Phase F2-A · Grid / Footer / content 높이 구조 정상화
 *
 * DRY_RUN = true 인 동안 파일을 한 글자도 바꾸지 않는다.
 *   모든 쓰기는 W() 를 지나고, DRY_RUN 이면 W() 가 예외를 던진다.
 *
 * 쓰는 것 (23b probe 로 복제본에서 확인한 값)
 *   Grid 1002:140      gridRowSizes FIXED 219 ×3, gridRowGap 24
 *   Footer 1002:451    layoutPositioning ABSOLUTE → AUTO, layoutSizingHorizontal → FILL
 *   Pagination 1002:458  visible = false  (삭제하지 않는다)
 *   Content 1002:4     layoutSizingVertical FIXED → HUG
 *
 * 쓰지 않는 것
 *   카피(텍스트 변경·삭제 0), 카드 12장, 열 트랙·columnGap, pagination 안 old 4개,
 *   1002:3 · 1002:2 의 크기·스크롤 속성, Header · Aside · KPI · Toolbar · 기록 추가 · Nav
 *   1002:3 · 1002:2 는 세로 HUG 라 높이가 따라 늘어난다 (예측값으로 출력, F2-B 에서 처리)
 *
 * 예측은 공식이 "지금 값" 을 재현하는지 먼저 확인한 뒤에만 쓴다.
 * ========================================================================== */

const SCRIPT_VERSION = '24-F2A-v1-layout-normalize';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

/* ======== 공통 시작 (24b verifier 가 이 구간을 그대로 가져간다) ======== */
const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', listSection: '1002:139',
  listContainer: '1009:2', grid: '1002:140', footer: '1002:451', footerLeft: '1002:452', pagination: '1002:458',
  header: '1002:469', aside: '1002:492', kpiStrip: '1002:23', toolbar: '1003:1695', topHeader: '1009:698', addRow: '1009:715',
  navTop: '1002:511', navBottom: '1002:533'
};
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const APPCARD_SET_ID = '1037:2163';
const BASELINE_KEY = 'joob.F2A.baseline';
const PLAN = { rowTrack: 219, rowGap: 24, columnGap: 12 };
const EXPECT = {
  before: { grid: '976×687', rowTracks: [205, 205, 205], rowGap: 36, rowYs: [0, 241, 482], contentBottom: 701, overflow: 14,
    footerPositioning: 'ABSOLUTE', footerWidthMode: 'FIXED', footerSize: '976×52', footerY: 635.5, paginationVisible: true,
    list: 687, section: 687, containerSizing: 'FIXED', container: 896, overlap: 65.5, containerOverflow: 49 },
  after: { grid: '976×705', rowYs: [0, 243, 486], contentBottom: 705, overflow: 0, footerY: 717, footerHeightWithPagination: 52,
    listWithPagination: 769, footerHeight: 40, list: 757, section: 757, container: 1015, mainContent: 1143, main: 1143,
    overlap: 0, containerOverflow: 0 }
};

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function safeGet(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { try { return n.mainComponent; } catch (e2) { return null; } } }
function trackValue(t) { if (typeof t === 'number') return r2(t); if (t && typeof t === 'object' && typeof t.value === 'number') return r2(t.value); return null; }
function trackType(t) { return t && typeof t === 'object' ? (t.type || null) : (typeof t === 'number' ? 'NUMBER' : null); }
function flow(n) { return kids(n).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: r2(safeGet(n, 'paddingTop') || 0), b: r2(safeGet(n, 'paddingBottom') || 0), l: r2(safeGet(n, 'paddingLeft') || 0), r: r2(safeGet(n, 'paddingRight') || 0) }; }
function gapOf(n) { return r2(safeGet(n, 'itemSpacing') || 0); }
function sb(n) { return safeGet(n, 'primaryAxisAlignItems') === 'SPACE_BETWEEN'; }
/* 세로 방향 HUG 높이 — heightOf 로 일부 자식 높이를 바꿔 넣을 수 있다 */
function vStack(n, heightOf) {
  const f = flow(n), p = pads(n), h = c => (heightOf ? heightOf(c) : c.height);
  return r2(p.t + p.b + f.reduce((a, c) => a + h(c), 0) + (sb(n) ? 0 : gapOf(n) * Math.max(0, f.length - 1)));
}
function hStackHeight(n, visibleFilter) {
  const f = flow(n).filter(visibleFilter || (() => true)), p = pads(n);
  return f.length ? r2(p.t + p.b + Math.max.apply(null, f.map(c => c.height))) : r2(p.t + p.b);
}
function size(n) { return r2(n.width) + '×' + r2(n.height); }

async function readNodes() {
  const n = {};
  for (const k of Object.keys(IDS)) n[k] = await figma.getNodeByIdAsync(IDS[k]);
  return n;
}
async function readState(n) {
  const s = {};
  const g = n.grid;
  if (g) {
    const tracks = safeGet(g, 'gridRowSizes');
    const cards = kids(g);
    s.grid = { size: size(g), width: r2(g.width), height: r2(g.height), sizingV: safeGet(g, 'layoutSizingVertical'),
      rowTracks: Array.isArray(tracks) ? tracks.map(trackValue) : null, rowTrackTypes: Array.isArray(tracks) ? tracks.map(trackType) : null,
      rowGap: r2(safeGet(g, 'gridRowGap')), columnGap: r2(safeGet(g, 'gridColumnGap')),
      columnTracks: JSON.stringify(safeGet(g, 'gridColumnSizes')), rowCount: safeGet(g, 'gridRowCount'),
      cardCount: cards.length, visibleCards: flow(g).length,
      rowYs: flow(g).map(c => r2(c.y)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b),
      cardHeights: flow(g).map(c => r2(c.height)),
      contentBottom: flow(g).length ? r2(Math.max.apply(null, flow(g).map(c => c.y + c.height))) : null };
    s.grid.overflow = s.grid.contentBottom === null ? null : r2(Math.max(0, s.grid.contentBottom - g.height));
    s.cards = [];
    for (const c of cards) {
      const mc = await mainCompOf(c);
      s.cards.push({ id: c.id, name: c.name, type: c.type, visible: c.visible, mainId: mc ? mc.id : null,
        inAppCardSet: !!mc && !!mc.parent && mc.parent.id === APPCARD_SET_ID, index: cards.indexOf(c),
        row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'), w: r2(c.width), h: r2(c.height) });
    }
  }
  const f = n.footer;
  if (f) s.footer = { positioning: safeGet(f, 'layoutPositioning'), widthMode: safeGet(f, 'layoutSizingHorizontal'),
    size: size(f), width: r2(f.width), height: r2(f.height), x: r2(f.x), y: r2(f.y), constraints: safeGet(f, 'constraints'),
    parentId: f.parent ? f.parent.id : null, index: f.parent ? kids(f.parent).indexOf(f) : null };
  const p = n.pagination;
  if (p) s.pagination = { visible: p.visible, size: size(p), parentId: p.parent ? p.parent.id : null,
    children: PAG_OLD_IDS.map(id => { const c = kids(p).filter(x => x.id === id)[0]; return c ? { id, visible: c.visible, size: size(c), type: c.type } : { id, missing: true }; }) };
  for (const k of ['listContainer', 'listSection', 'contentContainer', 'mainContent', 'main']) {
    const x = n[k];
    if (x) s[k] = { size: size(x), height: r2(x.height), width: r2(x.width), sizingV: safeGet(x, 'layoutSizingVertical'),
      clipsContent: safeGet(x, 'clipsContent'), overflowDirection: safeGet(x, 'overflowDirection'),
      absoluteFlowChildren: kids(x).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') === 'ABSOLUTE').map(c => c.id) };
  }
  if (n.contentContainer) {
    s.contentContainer.contentHeight = vStack(n.contentContainer);
    s.contentContainer.overflow = r2(Math.max(0, s.contentContainer.contentHeight - n.contentContainer.height));
  }
  if (g && f) s.overlap = r2(Math.max(0, (s.grid.contentBottom + r2(g.y)) - r2(f.y)));
  return s;
}
async function protectedSnapshot(n) {
  const snap = {};
  for (const k of ['header', 'aside', 'kpiStrip', 'toolbar', 'topHeader', 'addRow', 'navTop', 'navBottom']) {
    const x = n[k];
    snap[k] = x ? { id: x.id, size: size(x), x: r2(x.x), y: r2(x.y), visible: x.visible, childCount: kids(x).length,
      positioning: safeGet(x, 'layoutPositioning') } : 'missing';
  }
  for (const k of ['mainContent', 'main']) {
    const x = n[k];
    snap[k] = x ? { width: r2(x.width), sizingV: safeGet(x, 'layoutSizingVertical'), sizingH: safeGet(x, 'layoutSizingHorizontal'),
      clipsContent: safeGet(x, 'clipsContent'), overflowDirection: safeGet(x, 'overflowDirection'),
      childCount: kids(x).length, x: r2(x.x), y: r2(x.y) } : 'missing';
  }
  const left = n.footerLeft;
  snap.footerTexts = left ? (function walk(x, acc) { for (const c of kids(x)) { if (c.type === 'TEXT') acc.push({ id: c.id, text: c.characters, visible: c.visible }); walk(c, acc); } return acc; })(left, []) : 'missing';
  snap.paginationChildren = n.pagination ? PAG_OLD_IDS.map(id => { const c = kids(n.pagination).filter(x => x.id === id)[0];
    return c ? { id, visible: c.visible, size: size(c), type: c.type, childCount: kids(c).length } : { id, missing: true }; }) : 'missing';
  snap.gridColumns = n.grid ? { tracks: JSON.stringify(safeGet(n.grid, 'gridColumnSizes')), columnGap: r2(safeGet(n.grid, 'gridColumnGap')),
    columnCount: safeGet(n.grid, 'gridColumnCount'), width: r2(n.grid.width) } : 'missing';
  snap.cards = [];
  for (const c of kids(n.grid)) {
    const mc = await mainCompOf(c);
    snap.cards.push({ id: c.id, name: c.name, visible: c.visible, mainId: mc ? mc.id : null, index: kids(n.grid).indexOf(c),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'), size: size(c) });
  }
  return snap;
}
async function strayAppCards() {
  const acc = [];
  for (const c of kids(figma.currentPage)) {
    if (c.type !== 'INSTANCE') continue;
    const mc = await mainCompOf(c);
    if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) acc.push(c.id);
  }
  return acc;
}
/* ======== 공통 끝 ======== */

/* ---------- 쓰기 관문 ---------- */
let mutationCount = 0;
const mutationLog = [];
function W(what, fn) {
  if (DRY_RUN) throw new Error('DRY_RUN 인데 쓰기를 시도했다: ' + what);
  mutationCount++; mutationLog.push(what);
  return fn();
}

/* ---------- 읽기 ---------- */
const nodes = await readNodes();
const missing = Object.keys(IDS).filter(k => !nodes[k]);
const before = await readState(nodes);
const protectedBefore = await protectedSnapshot(nodes);
const strayBefore = await strayAppCards();

/* ---------- 예측 — 공식이 지금 값을 재현하는지 먼저 본다 ---------- */
const g = nodes.grid, f = nodes.footer, pag = nodes.pagination, list = nodes.listContainer, section = nodes.listSection,
      container = nodes.contentContainer, mainContent = nodes.mainContent, main = nodes.main;
const P = {};
if (!missing.length) {
  const rows = before.grid.rowCount;
  const cardH = before.grid.cardHeights.length ? before.grid.cardHeights[0] : null;
  const allCards219 = before.grid.cardHeights.length === 12 && before.grid.cardHeights.every(h => near(h, PLAN.rowTrack));
  const gridNowFormula = r2(before.grid.rowTracks.reduce((a, b) => a + b, 0) + before.grid.rowGap * (rows - 1));
  const gridAfterH = r2(PLAN.rowTrack * rows + PLAN.rowGap * (rows - 1));
  const rowYsAfter = Array.from({ length: rows }, (_, i) => r2(i * (PLAN.rowTrack + PLAN.rowGap)));
  const contentBottomAfter = r2(rowYsAfter[rowYsAfter.length - 1] + cardH);

  /* footer 높이: 가로 HUG = 가장 높은 보이는 자식 + padding */
  const footerNowFormula = hStackHeight(f);
  const footerHWithPag = footerNowFormula;
  const footerHAfter = hStackHeight(f, c => c.id !== IDS.pagination);
  const lp = pads(list);
  const footerYAfter = r2(lp.t + gridAfterH + gapOf(list));
  /* 목록: 지금은 footer 가 ABSOLUTE 라 grid 만 흐름에 있다 */
  const listNowFormula = vStack(list);
  const listWithPag = r2(lp.t + lp.b + gridAfterH + gapOf(list) + footerHWithPag);
  const listAfter = r2(lp.t + lp.b + gridAfterH + gapOf(list) + footerHAfter);
  const sectionNowFormula = vStack(section);
  const sectionAfter = vStack(section, c => (c.id === list.id ? listAfter : c.height));
  const containerContentNow = vStack(container);
  const lastBottomNow = flow(container).length ? r2(Math.max.apply(null, flow(container).map(c => c.y + c.height)) + pads(container).b) : null;
  const containerAfter = vStack(container, c => (c.id === section.id ? sectionAfter : c.height));
  const mainContentNowFormula = vStack(mainContent);
  const mainContentAfter = vStack(mainContent, c => (c.id === container.id ? containerAfter : c.height));
  const mainNowFormula = vStack(main);
  const mainAfter = vStack(main, c => (c.id === mainContent.id ? mainContentAfter : c.height));

  Object.assign(P, {
    allCards219, cardHeight: cardH,
    grid: { formulaNow: gridNowFormula, reproducesNow: near(gridNowFormula, before.grid.height),
      sizeAfter: r2(g.width) + '×' + gridAfterH, heightAfter: gridAfterH, rowTracksAfter: Array(rows).fill(PLAN.rowTrack),
      rowGapAfter: PLAN.rowGap, rowYsAfter, contentBottomAfter, overflowAfter: r2(Math.max(0, contentBottomAfter - gridAfterH)) },
    footer: { heightFormulaNow: footerNowFormula, reproducesNow: near(footerNowFormula, f.height),
      yAfter: footerYAfter, heightWithPagination: footerHWithPag, heightAfter: footerHAfter,
      widthAfter: r2(list.width - lp.l - lp.r), positioningAfter: 'AUTO', widthModeAfter: 'FILL',
      paginationVisibleAfter: false,
      followsGrid: kids(list).indexOf(g) < kids(list).indexOf(f),
      leftInfoXAfter: pads(f).l },
    list: { formulaNow: listNowFormula, reproducesNow: near(listNowFormula, list.height), withPagination: listWithPag, after: listAfter },
    section: { formulaNow: sectionNowFormula, reproducesNow: near(sectionNowFormula, section.height), after: sectionAfter },
    container: { contentFormulaNow: containerContentNow, reproducesContentNow: near(containerContentNow, lastBottomNow, 1),
      heightNow: r2(container.height), after: containerAfter },
    mainContent: { formulaNow: mainContentNowFormula, reproducesNow: near(mainContentNowFormula, mainContent.height), after: mainContentAfter,
      directWrite: false },
    main: { formulaNow: mainNowFormula, reproducesNow: near(mainNowFormula, main.height), after: mainAfter, directWrite: false }
  });

  /* 조상 중 clip 이 켜져 있고 FIXED 높이라 새로 잘릴 곳이 있는가 */
  const chain = [list, section, container, mainContent, main];
  const afterH = { [list.id]: listAfter, [section.id]: sectionAfter, [container.id]: containerAfter, [mainContent.id]: mainContentAfter, [main.id]: mainAfter };
  P.clipping = chain.map(x => ({ id: x.id, name: x.name, clipsContent: safeGet(x, 'clipsContent'),
    sizingVAfter: x.id === container.id ? 'HUG' : safeGet(x, 'layoutSizingVertical'),
    contentAfter: afterH[x.id], frameHeightAfter: (x.id === container.id || safeGet(x, 'layoutSizingVertical') === 'HUG') ? afterH[x.id] : r2(x.height) }))
    .map(x => Object.assign(x, { clipsNewContent: x.clipsContent === true && x.contentAfter > x.frameHeightAfter + 0.5 }));
}

/* ---------- 계획 ---------- */
const plannedWrites = [
  { step: 2, node: IDS.grid, property: 'gridRowSizes', from: before.grid ? before.grid.rowTracks.map(v => ({ type: 'FIXED', value: v })) : null,
    to: [0, 1, 2].map(() => ({ type: 'FIXED', value: PLAN.rowTrack })) },
  { step: 3, node: IDS.grid, property: 'gridRowGap', from: before.grid ? before.grid.rowGap : null, to: PLAN.rowGap },
  { step: 5, node: IDS.footer, property: 'layoutPositioning', from: before.footer ? before.footer.positioning : null, to: 'AUTO' },
  { step: 6, node: IDS.footer, property: 'layoutSizingHorizontal', from: before.footer ? before.footer.widthMode : null, to: 'FILL' },
  { step: 7, node: IDS.pagination, property: 'visible', from: before.pagination ? before.pagination.visible : null, to: false },
  { step: 9, node: IDS.contentContainer, property: 'layoutSizingVertical', from: before.contentContainer ? before.contentContainer.sizingV : null, to: 'HUG' }
];
const plannedTextWrites = 0;
const plannedNodeDeletes = 0;

/* ---------- preflight ---------- */
const B = EXPECT.before, A = EXPECT.after;
const pf = {
  gridFound: !!g, footerFound: !!f, paginationFound: !!pag, contentContainerFound: !!container,
  allChainNodesFound: missing.length === 0,
  exact12CardsFound: !!before.grid && before.grid.cardCount === 12 && before.grid.visibleCards === 12 && before.cards.every(c => c.inAppCardSet),
  allCards219: P.allCards219 === true,
  gridCurrentStateMatches: !!before.grid && before.grid.size === B.grid && JSON.stringify(before.grid.rowTracks) === JSON.stringify(B.rowTracks) &&
    before.grid.rowGap === B.rowGap && before.grid.columnGap === PLAN.columnGap && JSON.stringify(before.grid.rowYs) === JSON.stringify(B.rowYs) &&
    near(before.grid.contentBottom, B.contentBottom) && near(before.grid.overflow, B.overflow),
  footerCurrentStateMatches: !!before.footer && before.footer.positioning === B.footerPositioning && before.footer.widthMode === B.footerWidthMode &&
    before.footer.size === B.footerSize && near(before.footer.y, B.footerY) && before.footer.parentId === IDS.listContainer,
  paginationCurrentStateMatches: !!before.pagination && before.pagination.visible === B.paginationVisible && before.pagination.parentId === IDS.footer &&
    before.pagination.children.every(c => !c.missing),
  contentContainerCurrentStateMatches: !!before.contentContainer && before.contentContainer.sizingV === B.containerSizing && near(before.contentContainer.height, B.container) &&
    near(before.contentContainer.overflow, B.containerOverflow),
  listAndSectionCurrentStateMatches: !!before.listContainer && near(before.listContainer.height, B.list) && near(before.listSection.height, B.section),
  currentOverlapMatches: near(before.overlap, B.overlap),
  gridSetterPlanValid: !!before.grid && before.grid.rowTrackTypes.every(t => t === 'FIXED') && before.grid.rowCount === 3 && P.grid && P.grid.reproducesNow,
  footerFlowPlanValid: !!P.footer && P.footer.reproducesNow && P.footer.followsGrid && P.list.reproducesNow && P.section.reproducesNow,
  paginationHidePlanValid: !!pag && pag.parent && pag.parent.id === IDS.footer && flow(f).length === 2,
  contentHugPlanValid: !!P.container && P.container.reproducesContentNow && P.mainContent.reproducesNow && P.main.reproducesNow,
  predictedGridHeight705: !!P.grid && near(P.grid.heightAfter, 705) && JSON.stringify(P.grid.rowYsAfter) === JSON.stringify(A.rowYs),
  predictedFooterY717: !!P.footer && near(P.footer.yAfter, A.footerY),
  predictedFooterHeight40: !!P.footer && near(P.footer.heightAfter, A.footerHeight),
  predictedListHeight757: !!P.list && near(P.list.after, A.list) && near(P.section.after, A.section),
  predictedContentHeight1015: !!P.container && near(P.container.after, A.container),
  predictedMainHeight1143: !!P.main && near(P.mainContent.after, A.mainContent) && near(P.main.after, A.main),
  noGridOverflowAfter: !!P.grid && near(P.grid.overflowAfter, 0),
  noGridFooterOverlapAfter: !!P.grid && !!P.footer && P.grid.contentBottomAfter <= P.footer.yAfter - pads(list).t + 0.5,
  /* 1002:4 가 HUG 가 되면 높이 = 내용 높이 — 내용 공식이 지금 값을 재현할 때만 그 예측을 믿는다 */
  noContentOverflowAfter: !!P.container && P.container.reproducesContentNow === true && P.container.after > 0,
  noNewClipping: Array.isArray(P.clipping) && P.clipping.every(x => !x.clipsNewContent),
  noUnexpectedReparenting: !!f && f.parent && f.parent.id === IDS.listContainer && kids(list).length === 2 && plannedWrites.every(w => w.property !== 'parent'),
  noOtherAbsoluteInListFlow: !!list && kids(list).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') === 'ABSOLUTE' && c.id !== IDS.footer).length === 0,
  noTextOrDeleteWrites: plannedTextWrites === 0 && plannedNodeDeletes === 0,
  protectedNodesPreserved: Object.keys(protectedBefore).every(k => protectedBefore[k] !== 'missing'),
  noStrayInstances: strayBefore.length === 0,
  mutationCountIsZero: mutationCount === 0
};
pf.everyTargetReady = Object.keys(pf).every(k => pf[k] === true);
const preflightPassed = pf.everyTargetReady;
const preflightFailures = Object.keys(pf).filter(k => pf[k] !== true);
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));

const debtResolution = {
  before: { cardGridOverflow: before.grid ? before.grid.overflow : null, gridFooterOverlap: before.overlap,
    contentContainerOverflow: before.contentContainer ? before.contentContainer.overflow : null },
  afterPrediction: { cardGridOverflow: P.grid ? P.grid.overflowAfter : null,
    gridFooterOverlap: P.grid && P.footer ? r2(Math.max(0, P.grid.contentBottomAfter - (P.footer.yAfter - pads(list).t))) : null,
    contentContainerOverflow: 0, contentContainerNote: '세로 HUG 가 되면 높이 = 내용 높이라 넘침이 없다' },
  newIssues: { newClipping: Array.isArray(P.clipping) ? P.clipping.filter(x => x.clipsNewContent).map(x => x.id) : null,
    strayAbsoluteInListFlowAfter: 0, footerInFlowAfter: true }
};

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'DRY_RUN', dryRun: true, readOnly: true,
    mutationCount, preflight: pf, preflightPassed, preflightFailures,
    before, plannedWrites, plannedTextWrites, plannedNodeDeletes,
    predictedAfter: {
      grid: P.grid ? P.grid.sizeAfter : null, rowTracks: P.grid ? P.grid.rowTracksAfter : null, rowGap: PLAN.rowGap,
      rowYs: P.grid ? P.grid.rowYsAfter : null, contentBottom: P.grid ? P.grid.contentBottomAfter : null, overflow: P.grid ? P.grid.overflowAfter : null,
      footer: P.footer ? { positioning: 'AUTO', widthMode: 'FILL', width: P.footer.widthAfter, y: P.footer.yAfter, height: P.footer.heightAfter } : null,
      paginationVisible: false,
      listContainer: P.list ? P.list.after : null, listSection: P.section ? P.section.after : null,
      contentContainer: P.container ? { sizing: 'HUG', height: P.container.after } : null,
      mainContent: P.mainContent ? { height: P.mainContent.after, directWrite: false } : null,
      main: P.main ? { height: P.main.after, directWrite: false } : null
    },
    gridPrediction: P.grid, footerPrediction: P.footer,
    propagationPrediction: { list: P.list, section: P.section, container: P.container, mainContent: P.mainContent, main: P.main, clipping: P.clipping },
    debtResolution,
    protectedNodes: protectedBefore,
    preservationChecks: { textWrites: 0, nodeDeletes: 0, cardsUnchanged: '카드에는 쓰기가 없다 — APPLY 후 스냅샷 비교', paginationOldChildrenUntouched: '컨테이너만 숨긴다',
      mainContentScrollUntouched: protectedBefore.mainContent, mainFrameScrollUntouched: protectedBefore.main },
    notes, errorCount: errors.length, errors: errors.slice(0, 10),
    nextStep: preflightPassed ? 'preflight 전부 통과. 확인받은 뒤 같은 스크립트에서 DRY_RUN = false 로 APPLY 합니다.'
                              : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * APPLY — DRY_RUN = false 일 때만
 * 단계마다 read-back 하고 예상과 다르면 즉시 멈춘 뒤, 끝낸 단계를 거꾸로 되돌린다.
 * ========================================================================== */
if (!preflightPassed) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, reason: 'preflight 실패 — 시작하지 않는다',
    preflight: pf, preflightFailures, mutationCount });
}

/* 1. baseline */
const baseline = { writtenBy: SCRIPT_VERSION, writtenAt: Date.now(), before, protectedBefore, predictions: P, expect: EXPECT };
W('baseline 기록', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline)));

const done = [];              /* 되돌리기 위한 기록: { step, undo } */
const steps = [];
let failedAt = null, rollbackAttempted = false, rollbackSucceeded = null, rollbackLog = [];

function check(step, ok, detail) {
  steps.push({ step, ok, detail });
  if (!ok) throw new Error(step + ' read-back 실패: ' + JSON.stringify(detail));
}

try {
  /* 2. 행 트랙 */
  const oldTracks = safeGet(g, 'gridRowSizes');
  W('grid gridRowSizes', () => { g.gridRowSizes = [0, 1, 2].map(() => ({ type: 'FIXED', value: PLAN.rowTrack })); });
  done.push({ step: 'rowTracks', undo: () => { g.gridRowSizes = oldTracks; } });
  /* 3. 행 간격 */
  const oldGap = safeGet(g, 'gridRowGap');
  W('grid gridRowGap', () => { g.gridRowGap = PLAN.rowGap; });
  done.push({ step: 'rowGap', undo: () => { g.gridRowGap = oldGap; } });
  /* 4. grid read-back */
  const s4 = await readState(nodes);
  check('4 grid', JSON.stringify(s4.grid.rowTracks) === JSON.stringify(P.grid.rowTracksAfter) && s4.grid.rowTrackTypes.every(t => t === 'FIXED') &&
    near(s4.grid.rowGap, PLAN.rowGap) && s4.grid.size === P.grid.sizeAfter && JSON.stringify(s4.grid.rowYs) === JSON.stringify(P.grid.rowYsAfter) &&
    near(s4.grid.overflow, 0) && near(s4.grid.columnGap, PLAN.columnGap),
    { tracks: s4.grid.rowTracks, gap: s4.grid.rowGap, size: s4.grid.size, rowYs: s4.grid.rowYs, overflow: s4.grid.overflow, columnGap: s4.grid.columnGap });

  /* 5. footer ABSOLUTE → AUTO */
  const oldPos = { positioning: safeGet(f, 'layoutPositioning'), x: f.x, y: f.y, constraints: safeGet(f, 'constraints') };
  W('footer AUTO', () => { f.layoutPositioning = 'AUTO'; });
  done.push({ step: 'footerAuto', undo: () => { f.layoutPositioning = oldPos.positioning; f.x = oldPos.x; f.y = oldPos.y; if (oldPos.constraints) f.constraints = oldPos.constraints; } });
  const s5 = await readState(nodes);
  check('5 footer AUTO', s5.footer.positioning === 'AUTO' && near(s5.footer.y, P.footer.yAfter) && near(s5.footer.height, P.footer.heightWithPagination) &&
    near(s5.listContainer.height, P.list.withPagination) && s5.footer.parentId === IDS.listContainer && s5.footer.index === 1,
    { positioning: s5.footer.positioning, y: s5.footer.y, h: s5.footer.height, list: s5.listContainer.height, index: s5.footer.index });

  /* 6. footer FILL */
  const oldWidthMode = safeGet(f, 'layoutSizingHorizontal'), oldWidth = f.width;
  W('footer FILL', () => { f.layoutSizingHorizontal = 'FILL'; });
  done.push({ step: 'footerFill', undo: () => { f.layoutSizingHorizontal = oldWidthMode; if (!near(f.width, oldWidth)) f.resize(oldWidth, f.height); } });
  check('6 footer FILL', safeGet(f, 'layoutSizingHorizontal') === 'FILL' && near(f.width, P.footer.widthAfter),
    { mode: safeGet(f, 'layoutSizingHorizontal'), width: r2(f.width) });

  /* 7. pagination 숨김 */
  W('pagination hidden', () => { pag.visible = false; });
  done.push({ step: 'paginationHidden', undo: () => { pag.visible = true; } });
  /* 8. footer / list read-back */
  const s8 = await readState(nodes);
  check('8 footer/list', s8.pagination.visible === false && near(s8.footer.height, P.footer.heightAfter) && near(s8.footer.y, P.footer.yAfter) &&
    near(s8.listContainer.height, P.list.after) && near(s8.listSection.height, P.section.after) &&
    s8.pagination.children.every(c => !c.missing && c.visible !== false),
    { pagVisible: s8.pagination.visible, footerH: s8.footer.height, footerY: s8.footer.y, list: s8.listContainer.height, section: s8.listSection.height });

  /* 9. 1002:4 HUG */
  const oldSizing = safeGet(container, 'layoutSizingVertical'), oldH = container.height;
  W('content HUG', () => { container.layoutSizingVertical = 'HUG'; });
  done.push({ step: 'contentHug', undo: () => { container.layoutSizingVertical = oldSizing; if (!near(container.height, oldH)) container.resize(container.width, oldH); } });

  /* 10. 전체 전파 read-back */
  const s10 = await readState(nodes);
  const protectedNow = await protectedSnapshot(nodes);
  const protectedSame = JSON.stringify(protectedNow) === JSON.stringify(protectedBefore);
  check('10 propagation', s10.contentContainer.sizingV === 'HUG' && near(s10.contentContainer.height, P.container.after) &&
    near(s10.contentContainer.overflow, 0) && near(s10.mainContent.height, P.mainContent.after) && near(s10.main.height, P.main.after) &&
    near(s10.overlap, 0) && protectedSame && s10.listContainer.absoluteFlowChildren.length === 0,
    { container: s10.contentContainer.height, sizing: s10.contentContainer.sizingV, overflow: s10.contentContainer.overflow,
      mainContent: s10.mainContent.height, main: s10.main.height, overlap: s10.overlap, protectedSame,
      absoluteInList: s10.listContainer.absoluteFlowChildren });
} catch (e) {
  failedAt = e.message;
  errors.push(e.message);
  rollbackAttempted = done.length > 0;
  for (const d of done.slice().reverse()) {
    try { W('롤백 ' + d.step, d.undo); rollbackLog.push({ step: d.step, ok: true }); }
    catch (e2) { rollbackLog.push({ step: d.step, ok: false, error: e2.message }); }
  }
  if (rollbackAttempted) {
    const sr = await readState(nodes);
    rollbackSucceeded = rollbackLog.every(x => x.ok) && sr.grid.size === before.grid.size &&
      JSON.stringify(sr.grid.rowTracks) === JSON.stringify(before.grid.rowTracks) && near(sr.grid.rowGap, before.grid.rowGap) &&
      sr.footer.positioning === before.footer.positioning && near(sr.footer.y, before.footer.y) && sr.pagination.visible === before.pagination.visible &&
      sr.contentContainer.sizingV === before.contentContainer.sizingV && near(sr.contentContainer.height, before.contentContainer.height);
    baseline.rollbackState = sr;
  }
}

const after = await readState(nodes);
const protectedAfter = await protectedSnapshot(nodes);
const strayAfter = await strayAppCards();
baseline.after = after;
baseline.applyCompleted = !failedAt;
try { W('baseline 갱신', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline))); } catch (e) { errors.push('baseline 갱신 실패: ' + e.message); }

const successCriteria = {
  allStepsCompleted: !failedAt,
  gridAsPredicted: after.grid.size === P.grid.sizeAfter && JSON.stringify(after.grid.rowYs) === JSON.stringify(P.grid.rowYsAfter),
  noGridOverflow: near(after.grid.overflow, 0),
  footerInFlow: after.footer.positioning === 'AUTO' && near(after.footer.y, P.footer.yAfter),
  footerHeight40: near(after.footer.height, P.footer.heightAfter),
  paginationHidden: after.pagination.visible === false,
  listAndSection757: near(after.listContainer.height, P.list.after) && near(after.listSection.height, P.section.after),
  container1015Hug: after.contentContainer.sizingV === 'HUG' && near(after.contentContainer.height, P.container.after),
  noOverlap: near(after.overlap, 0),
  protectedNodesPreserved: JSON.stringify(protectedAfter) === JSON.stringify(protectedBefore),
  noStrayInstances: strayAfter.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', dryRun: false, mutationCount,
  successCriteria, successCriteriaMet,
  steps, failedAt, partialMutationDetected: !!failedAt && done.length > 0,
  completedSteps: done.map(d => d.step), rollbackAttempted, rollbackSucceeded, rollbackLog,
  before, after, predictions: P, debtResolution,
  protectedChanged: JSON.stringify(protectedAfter) !== JSON.stringify(protectedBefore),
  baselineKey: BASELINE_KEY,
  notes, errorCount: errors.length, errors: errors.slice(0, 10), mutationLog,
  nextStep: successCriteriaMet ? '24b verifier 를 실행합니다.' : '실패 지점과 롤백 결과를 확인해주세요.'
});
