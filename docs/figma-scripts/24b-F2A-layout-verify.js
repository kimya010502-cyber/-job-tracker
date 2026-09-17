/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 24b
 * Phase F2-A 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 상태를 읽는 코드와 보존 스냅샷 코드는 24 에서 그대로 가져왔다 (둘이 다르게 읽지 않도록).
 * APPLY 가 남긴 기준값(교체 전 상태 · 보존 스냅샷)과 비교한다.
 * ========================================================================== */

const SCRIPT_VERSION = '24b-F2A-v1-layout-verify';
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

/* ========================================================================== *
 * 24b 검증 — 읽기만 한다
 * ========================================================================== */
let baseline = null, baselineError = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); if (raw) baseline = JSON.parse(raw); else baselineError = 'APPLY 기준값(' + BASELINE_KEY + ')이 없다'; }
catch (e) { baselineError = '기준값을 읽지 못했다: ' + e.message; }

const nodes = await readNodes();
const missing = Object.keys(IDS).filter(k => !nodes[k]);
const now = await readState(nodes);
const protectedNow = await protectedSnapshot(nodes);
const stray = await strayAppCards();
const A = EXPECT.after;
const pb = baseline ? baseline.protectedBefore : null;

/* 보존 대상별로 무엇이 달라졌는지 */
const protectedDiff = {};
if (pb) for (const k of Object.keys(protectedNow)) {
  if (JSON.stringify(protectedNow[k]) !== JSON.stringify(pb[k])) protectedDiff[k] = { before: pb[k], now: protectedNow[k] };
}
const cardsBefore = baseline && baseline.before ? baseline.before.cards : null;

const successCriteria = {
  baselineReadable: !!baseline,
  applyCompletedPerBaseline: !!baseline && baseline.applyCompleted === true,
  allNodesFound: missing.length === 0,

  gridSize705: !!now.grid && now.grid.size === A.grid,
  gridRowTracks219Fixed: !!now.grid && JSON.stringify(now.grid.rowTracks) === JSON.stringify([219, 219, 219]) && now.grid.rowTrackTypes.every(t => t === 'FIXED'),
  gridRowGap24: !!now.grid && near(now.grid.rowGap, 24),
  gridColumnGap12: !!now.grid && near(now.grid.columnGap, PLAN.columnGap),
  gridRowYs: !!now.grid && JSON.stringify(now.grid.rowYs) === JSON.stringify(A.rowYs),
  gridContentBottom705: !!now.grid && near(now.grid.contentBottom, A.contentBottom),
  gridOverflowZero: !!now.grid && near(now.grid.overflow, 0),
  twelveCardsUnchanged: !!now.cards && now.cards.length === 12 && !!cardsBefore &&
    JSON.stringify(now.cards.map(c => [c.id, c.name, c.mainId, c.index, c.visible, c.row, c.col, c.w, c.h])) ===
    JSON.stringify(cardsBefore.map(c => [c.id, c.name, c.mainId, c.index, c.visible, c.row, c.col, c.w, c.h])),

  footerPositioningAuto: !!now.footer && now.footer.positioning === 'AUTO',
  footerWidthFill976: !!now.footer && now.footer.widthMode === 'FILL' && near(now.footer.width, 976),
  footerY717: !!now.footer && near(now.footer.y, A.footerY),
  footerHeight40: !!now.footer && near(now.footer.height, A.footerHeight),
  footerParentUnchanged: !!now.footer && now.footer.parentId === IDS.listContainer && now.footer.index === 1,
  footerTextsUnchanged: !!pb && JSON.stringify(protectedNow.footerTexts) === JSON.stringify(pb.footerTexts),

  paginationHidden: !!now.pagination && now.pagination.visible === false,
  paginationOld4Untouched: !!pb && JSON.stringify(protectedNow.paginationChildren) === JSON.stringify(pb.paginationChildren),

  listContainer757: !!now.listContainer && near(now.listContainer.height, A.list),
  listSection757: !!now.listSection && near(now.listSection.height, A.section),
  noAbsoluteInListFlow: !!now.listContainer && now.listContainer.absoluteFlowChildren.length === 0,
  contentContainerHug1015: !!now.contentContainer && now.contentContainer.sizingV === 'HUG' && near(now.contentContainer.height, A.container),
  contentContainerOverflowZero: !!now.contentContainer && near(now.contentContainer.overflow, 0),
  gridFooterOverlapZero: near(now.overlap, 0),
  mainContentHeight1143: !!now.mainContent && near(now.mainContent.height, A.mainContent),
  mainFrameHeight1143: !!now.main && near(now.main.height, A.main),

  mainContentScrollPropsUnchanged: !!pb && JSON.stringify(protectedNow.mainContent) === JSON.stringify(pb.mainContent),
  mainFrameScrollPropsUnchanged: !!pb && JSON.stringify(protectedNow.main) === JSON.stringify(pb.main),
  gridColumnsUnchanged: !!pb && JSON.stringify(protectedNow.gridColumns) === JSON.stringify(pb.gridColumns),
  headerAsideKpiToolbarNavUnchanged: !!pb && ['header', 'aside', 'kpiStrip', 'toolbar', 'topHeader', 'addRow', 'navTop', 'navBottom']
    .every(k => JSON.stringify(protectedNow[k]) === JSON.stringify(pb[k])),
  noNewClipping: ['listContainer', 'listSection', 'contentContainer', 'mainContent', 'main'].every(k => !now[k] || now[k].clipsContent !== true),
  noStrayInstances: stray.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (baselineError) notes.push(baselineError);
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  successCriteria, successCriteriaMet, failedCriteria,
  now,
  debtResolution: {
    before: baseline && baseline.before ? { cardGridOverflow: baseline.before.grid.overflow, gridFooterOverlap: baseline.before.overlap,
      contentContainerOverflow: baseline.before.contentContainer.overflow } : null,
    now: { cardGridOverflow: now.grid ? now.grid.overflow : null, gridFooterOverlap: now.overlap,
      contentContainerOverflow: now.contentContainer ? now.contentContainer.overflow : null }
  },
  protectedDiff,
  strayAppCards: stray,
  expectedAfter: A,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet ? 'Phase F2-A CLOSED — grid/footer/content 높이 구조 정상화 완료. 스크롤·뷰포트는 F2-B 에서 처리합니다.'
                              : '아직 닫을 수 없습니다. failedCriteria 와 protectedDiff 를 확인해주세요.'
});
