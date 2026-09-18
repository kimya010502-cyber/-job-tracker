/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 27b
 * Phase F3 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않고 아무것도 지우지 않는다.
 * 상태 읽기 코드는 27 의 공통 구간을 그대로 쓴다. APPLY 가 남긴 기준값(joob.F3.baseline)과 비교한다.
 * ========================================================================== */

const SCRIPT_VERSION = '27b-F3-v1-footer-remove-verify';

const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', listSection: '1002:139',
  listContainer: '1009:2', grid: '1002:140', footer: '1002:451', footerLeft: '1002:452', pagination: '1002:458',
  header: '1002:469', aside: '1002:492', kpiStrip: '1002:23', toolbar: '1003:1695', topHeader: '1009:698', addRow: '1009:715',
  navTop: '1002:511', navBottom: '1002:533'
};
const FOOTER_DESCENDANT_IDS = ['1002:452', '1002:454', '1002:457', '1002:458', '1002:459', '1002:462', '1002:464', '1002:466'];
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const PAGINATION_MASTER_SET_ID = '1042:46';
const APPCARD_SET_ID = '1037:2163';
const BASELINE_KEY = 'joob.F3.baseline';
const BACKUP_TAG = '[Backup] F3 footer 1002:451 — 성공 시 자동 삭제';
const EXPECT = {
  before: { grid: '976×705', footer: '976×40', footerIndex: 1, listGap: 12, list: '976×757', section: '976×757', container: '976×1015',
    main: '1024×1024', mainSizingV: 'FIXED', mainClip: true, mainOverflow: 'VERTICAL', mainMinHeight: null, frame: '1280×1024',
    scrollContent: 1143, maxScroll: 119 },
  after: { grid: '976×705', list: '976×705', section: '976×705', container: '976×963', scrollContent: 1091, maxScroll: 67,
    bottomPadding: 64, spaceBelowGrid: 64 }
};

/* ======== 공통 (24 에서 그대로 가져옴) ======== */
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

/* ======== F2-B 공통 (26b 가 그대로 가져간다) ======== */
function absBox(n) { const b = safeGet(n, 'absoluteBoundingBox'); return b && typeof b.y === 'number' ? { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) } : null; }
function yInAncestor(node, ancestor) { let y = 0, cur = node; while (cur && cur.id !== ancestor.id) { y += cur.y || 0; cur = cur.parent; } return cur ? r2(y) : null; }
function scrollState(n) {
  const m = n.mainContent, f = n.main, a = n.aside, h = n.header, cc = n.contentContainer;
  const s = {};
  if (m) s.mainContent = { size: size(m), width: r2(m.width), height: r2(m.height), x: r2(m.x), y: r2(m.y),
    sizingV: safeGet(m, 'layoutSizingVertical'), sizingH: safeGet(m, 'layoutSizingHorizontal'),
    minHeight: safeGet(m, 'minHeight'), maxHeight: safeGet(m, 'maxHeight'),
    clipsContent: safeGet(m, 'clipsContent'), overflowDirection: safeGet(m, 'overflowDirection'),
    padding: pads(m), primaryAxisAlign: safeGet(m, 'primaryAxisAlignItems') };
  if (f) s.mainFrame = { size: size(f), width: r2(f.width), height: r2(f.height), sizingV: safeGet(f, 'layoutSizingVertical'),
    minHeight: safeGet(f, 'minHeight'), clipsContent: safeGet(f, 'clipsContent'), overflowDirection: safeGet(f, 'overflowDirection'),
    childOrder: kids(f).map(c => c.id) };
  if (a) s.aside = { size: size(a), x: r2(a.x), y: r2(a.y), positioning: safeGet(a, 'layoutPositioning') };
  if (h) s.header = { size: size(h), x: r2(h.x), y: r2(h.y), positioning: safeGet(h, 'layoutPositioning'),
    fills: JSON.stringify(safeGet(h, 'fills')), effects: JSON.stringify(safeGet(h, 'effects')), opacity: safeGet(h, 'opacity') };
  if (m && cc) {
    const ccTop = yInAncestor(cc, m);
    const p = pads(m);
    s.scroll = { contentTopInMain: ccTop, contentHeight: r2(cc.height), contentSizing: safeGet(cc, 'layoutSizingVertical'),
      scrollContentHeight: r2(ccTop + cc.height + p.b), viewportHeight: r2(m.height) };
    s.scroll.maxScrollDistance = r2(Math.max(0, s.scroll.scrollContentHeight - s.scroll.viewportHeight));
    s.scroll.bottomPaddingAtEnd = r2(s.scroll.scrollContentHeight - (ccTop + cc.height));
    if (n.footer) {
      const fb = r2(yInAncestor(n.footer, m) + n.footer.height);
      s.scroll.footerBottomInMain = fb;
      s.scroll.spaceBelowFooterAtEnd = r2(s.scroll.scrollContentHeight - fb);
    }
    s.scroll.contentStartsAtPaddingTop = near(ccTop, p.t);
    s.scroll.contentFitsWidth = r2(cc.x + cc.width) <= r2(m.width) + 0.5;
  }
  if (f && m) s.blankBelowMainInShell = r2(f.height - (m.y + m.height));
  if (f && a) s.asideInsideShell = r2(a.y) >= -0.5 && r2(a.y + a.height) <= r2(f.height) + 0.5;
  return s;
}
/* F2-A 결과와 보존 대상 — F2-B 가 건드리면 안 되는 것만 모은다 */
async function f2aAndProtected(n) {
  const st = await readState(n);
  const pr = await protectedSnapshot(n);
  delete pr.mainContent; delete pr.main;       /* 이 둘은 F2-B 에서 바꾸는 대상이다 */
  return {
    grid: st.grid ? { size: st.grid.size, rowTracks: st.grid.rowTracks, rowGap: st.grid.rowGap, rowYs: st.grid.rowYs, overflow: st.grid.overflow } : null,
    cards: st.cards ? st.cards.map(c => [c.id, c.name, c.mainId, c.index, c.visible, c.row, c.col, c.w, c.h]) : null,
    footer: st.footer ? { positioning: st.footer.positioning, widthMode: st.footer.widthMode, size: st.footer.size, y: st.footer.y, parentId: st.footer.parentId } : null,
    pagination: st.pagination ? { visible: st.pagination.visible, children: st.pagination.children } : null,
    listContainer: st.listContainer ? { size: st.listContainer.size, sizingV: st.listContainer.sizingV } : null,
    listSection: st.listSection ? { size: st.listSection.size, sizingV: st.listSection.sizingV } : null,
    contentContainer: st.contentContainer ? { size: st.contentContainer.size, sizingV: st.contentContainer.sizingV } : null,
    overlap: st.overlap,
    protected: pr
  };
}
/* ======== F2-B 공통 끝 ======== */

/* ======== F3 공통 (27b 가 그대로 가져간다) ======== */
function gridBottomState(n, s) {
  if (!n.grid || !n.mainContent || !s.scroll) return null;
  const gb = r2(yInAncestor(n.grid, n.mainContent) + n.grid.height);
  return { gridBottomInMain: gb, spaceBelowGridAtEnd: r2(s.scroll.scrollContentHeight - gb) };
}
async function f3Snapshot(n0) {
  /* footer 쪽 노드는 삭제 대상이므로 읽지 않는다 (삭제된 노드의 속성을 읽으면 Figma 가 오류를 낸다) */
  const n = Object.assign({}, n0, { footer: null, footerLeft: null, pagination: null });
  const st = await readState(n);
  const pr = await protectedSnapshot(n);
  const sc = scrollState(n);
  delete pr.footerTexts; delete pr.paginationChildren;     /* 이 둘은 footer 와 함께 사라지는 대상이다 */
  return {
    grid: st.grid ? { size: st.grid.size, rowTracks: st.grid.rowTracks, rowGap: st.grid.rowGap, rowYs: st.grid.rowYs, overflow: st.grid.overflow,
      columnGap: st.grid.columnGap, columnTracks: st.grid.columnTracks } : null,
    cards: st.cards ? st.cards.map(c => [c.id, c.name, c.mainId, c.index, c.visible, c.row, c.col, c.w, c.h]) : null,
    sizingModes: { list: st.listContainer ? st.listContainer.sizingV : null, section: st.listSection ? st.listSection.sizingV : null,
      container: st.contentContainer ? st.contentContainer.sizingV : null },
    mainScroll: sc.mainContent ? { size: sc.mainContent.size, sizingV: sc.mainContent.sizingV, sizingH: sc.mainContent.sizingH,
      minHeight: sc.mainContent.minHeight, clip: sc.mainContent.clipsContent, overflow: sc.mainContent.overflowDirection } : null,
    shell: sc.mainFrame ? { size: sc.mainFrame.size, sizingV: sc.mainFrame.sizingV, childOrder: sc.mainFrame.childOrder } : null,
    header: sc.header || null, aside: sc.aside || null,
    protected: pr
  };
}
async function footerGone() {
  const acc = {};
  for (const id of [IDS.footer].concat(FOOTER_DESCENDANT_IDS)) acc[id] = !(await figma.getNodeByIdAsync(id));
  return acc;
}
/* ======== F3 공통 끝 ======== */

/* ========================================================================== *
 * 27b 검증 — 읽기만 한다
 * ========================================================================== */
let baseline = null, baselineError = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); if (raw) baseline = JSON.parse(raw); else baselineError = 'APPLY 기준값(' + BASELINE_KEY + ')이 없다'; }
catch (e) { baselineError = '기준값을 읽지 못했다: ' + e.message; }

const nodes = await readNodes();
const required = ['main', 'mainContent', 'contentContainer', 'listSection', 'listContainer', 'grid', 'header', 'aside'];
const missing = required.filter(k => !nodes[k]);
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));
const sc = scrollState(nodes);
const gb = gridBottomState(nodes, sc);
const snap = await f3Snapshot(nodes);
const gone = await footerGone();
const stray = await strayAppCards();
const leftoverBackups = kids(figma.currentPage).filter(n => n.name === BACKUP_TAG).map(n => n.id);
const EA = EXPECT.after;
const base = baseline ? baseline.snapBefore : null;
const diff = {};
if (base) for (const k of Object.keys(snap)) if (JSON.stringify(snap[k]) !== JSON.stringify(base[k])) diff[k] = { before: base[k], now: snap[k] };
const p = base ? base.protected : null;

const successCriteria = {
  baselineReadable: !!baseline,
  applyCompletedPerBaseline: !!baseline && baseline.applyCompleted === true,
  allNodesFound: missing.length === 0,
  footerRemoved: gone[IDS.footer] === true,
  footerChildrenRemovedWithParent: FOOTER_DESCENDANT_IDS.every(id => gone[id] === true),
  paginationMasterKept: !!(await figma.getNodeByIdAsync(PAGINATION_MASTER_SET_ID)),
  noLeftoverBackup: leftoverBackups.length === 0,
  grid705Unchanged: !!base && snap.grid.size === EA.grid && JSON.stringify(snap.grid) === JSON.stringify(base.grid),
  twelveCardsUnchanged: !!base && snap.cards.length === 12 && JSON.stringify(snap.cards) === JSON.stringify(base.cards),
  listContainer705: size(nodes.listContainer) === EA.list && kids(nodes.listContainer).length === 1 && kids(nodes.listContainer)[0].id === IDS.grid,
  listSection705: size(nodes.listSection) === EA.section,
  contentContainer963: size(nodes.contentContainer) === EA.container,
  sizingModesUnchanged: !!base && JSON.stringify(snap.sizingModes) === JSON.stringify(base.sizingModes),
  main1024ScrollUnchanged: !!base && JSON.stringify(snap.mainScroll) === JSON.stringify(base.mainScroll),
  shell1024Unchanged: !!base && JSON.stringify(snap.shell) === JSON.stringify(base.shell) && snap.shell.size === '1280×1024',
  scrollContent1091: near(sc.scroll.scrollContentHeight, EA.scrollContent),
  maxScroll67: near(sc.scroll.maxScrollDistance, EA.maxScroll),
  bottomPadding64: near(sc.scroll.bottomPaddingAtEnd, EA.bottomPadding),
  spaceBelowGrid64: !!gb && near(gb.spaceBelowGridAtEnd, EA.spaceBelowGrid),
  headerUnchanged: !!base && JSON.stringify(snap.header) === JSON.stringify(base.header),
  asideUnchanged: !!base && JSON.stringify(snap.aside) === JSON.stringify(base.aside),
  kpiToolbarNavUnchanged: !!p && ['kpiStrip', 'toolbar', 'topHeader', 'addRow', 'navTop', 'navBottom']
    .every(k => JSON.stringify(snap.protected[k]) === JSON.stringify(p[k])),
  protectedUnchanged: !!base && JSON.stringify(snap.protected) === JSON.stringify(base.protected),
  noStrayInstances: stray.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (baselineError) notes.push(baselineError);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  successCriteria, successCriteriaMet, failedCriteria,
  now: { list: size(nodes.listContainer), section: size(nodes.listSection), contentContainer: size(nodes.contentContainer),
    scroll: sc.scroll, gridBottom: gb, gone }, diff, strayAppCards: stray, leftoverBackups, expectedAfter: EA,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet ? 'Phase F3 CLOSED — Footer bar 를 제거했고 목록은 마지막 카드 뒤 64px 여백으로 끝납니다.'
                              : '아직 닫을 수 없습니다. failedCriteria 와 diff 를 확인해주세요.'
});
