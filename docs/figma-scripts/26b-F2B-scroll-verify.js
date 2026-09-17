/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 26b
 * Phase F2-B 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 상태 읽기 코드는 26 의 공통 구간(24 에서 가져온 부분 포함)을 그대로 쓴다.
 * APPLY 가 남긴 기준값과 비교한다. 1024 뷰포트의 3번째 줄 노출량은 성공 조건이 아니다.
 * ========================================================================== */

const SCRIPT_VERSION = '26b-F2B-v1-scroll-verify';

const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', listSection: '1002:139',
  listContainer: '1009:2', grid: '1002:140', footer: '1002:451', footerLeft: '1002:452', pagination: '1002:458',
  header: '1002:469', aside: '1002:492', kpiStrip: '1002:23', toolbar: '1003:1695', topHeader: '1009:698', addRow: '1009:715',
  navTop: '1002:511', navBottom: '1002:533'
};
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const APPCARD_SET_ID = '1037:2163';
const BASELINE_KEY = 'joob.F2B.baseline';
const SHELL = 1024;
const EXPECT = {
  before: { mainHeight: 1143, mainSizingV: 'HUG', mainMinHeight: 1024, mainClip: false, mainOverflow: 'NONE',
    frameHeight: 1143, frameSizingV: 'HUG', grid: '976×705', footerY: 717, footerHeight: 40, list: 757, container: 1015, containerSizing: 'HUG' },
  after: { main: '1024×1024', mainSizingV: 'FIXED', mainMinHeight: null, mainClip: true, mainOverflow: 'VERTICAL',
    frame: '1280×1024', frameSizingV: 'FIXED', aside: '256×1024', header: '1024×64', container: 1015,
    scrollContent: 1143, maxScroll: 119, bottomPadding: 64, belowFooter: 64 }
};

/* ======== 24 에서 가져온 상태 읽기 (F2-A 결과 확인용) ======== */
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
/* ======== 24 에서 가져온 부분 끝 ======== */

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

/* ========================================================================== *
 * 26b 검증 — 읽기만 한다
 * ========================================================================== */
let baseline = null, baselineError = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); if (raw) baseline = JSON.parse(raw); else baselineError = 'APPLY 기준값(' + BASELINE_KEY + ')이 없다'; }
catch (e) { baselineError = '기준값을 읽지 못했다: ' + e.message; }

const nodes = await readNodes();
const missing = Object.keys(IDS).filter(k => !nodes[k]);
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));
const now = scrollState(nodes);
const keepNow = await f2aAndProtected(nodes);
const stray = await strayAppCards();
const EA = EXPECT.after;
const b = baseline ? baseline.before : null;
const kb = baseline ? baseline.keepBefore : null;
const keepDiff = {};
if (kb) for (const k of Object.keys(keepNow)) if (JSON.stringify(keepNow[k]) !== JSON.stringify(kb[k])) keepDiff[k] = { before: kb[k], now: keepNow[k] };

const successCriteria = {
  baselineReadable: !!baseline,
  applyCompletedPerBaseline: !!baseline && baseline.applyCompleted === true,
  allNodesFound: missing.length === 0,

  mainSize1024: now.mainContent.size === EA.main,
  mainSizingFixed: now.mainContent.sizingV === 'FIXED',
  mainMinHeightNull: now.mainContent.minHeight === null,
  mainClipsContent: now.mainContent.clipsContent === true,
  mainOverflowVertical: now.mainContent.overflowDirection === 'VERTICAL',
  mainHorizontalSizingUnchanged: !!b && now.mainContent.sizingH === b.mainContent.sizingH && near(now.mainContent.width, b.mainContent.width),

  shell1024Fixed: now.mainFrame.size === EA.frame && now.mainFrame.sizingV === 'FIXED',
  noBlankShellArea: near(now.blankBelowMainInShell, 0),
  shellChildOrderUnchanged: !!b && JSON.stringify(now.mainFrame.childOrder) === JSON.stringify(b.mainFrame.childOrder),
  asideInsideShell: now.asideInsideShell === true && now.aside.size === EA.aside,
  asideUnchanged: !!b && JSON.stringify(now.aside) === JSON.stringify(b.aside),
  headerUnchanged: !!b && now.header.size === b.header.size && now.header.x === b.header.x && now.header.y === b.header.y && now.header.positioning === b.header.positioning,
  headerStyleUnchanged: !!b && now.header.fills === b.header.fills && now.header.effects === b.header.effects && now.header.opacity === b.header.opacity,

  contentHug1015: now.scroll.contentSizing === 'HUG' && near(now.scroll.contentHeight, EA.container),
  contentStartsAtPaddingTop: now.scroll.contentStartsAtPaddingTop === true,
  scrollContent1143: near(now.scroll.scrollContentHeight, EA.scrollContent),
  maxScroll119: near(now.scroll.maxScrollDistance, EA.maxScroll),
  contentScrolls: now.scroll.scrollContentHeight > now.scroll.viewportHeight,
  footerReachableByScroll: now.scroll.footerBottomInMain <= now.scroll.scrollContentHeight + 0.5,
  bottomPadding64: near(now.scroll.bottomPaddingAtEnd, EA.bottomPadding),
  spaceBelowFooter64: near(now.scroll.spaceBelowFooterAtEnd, EA.belowFooter),
  noHorizontalClipping: now.scroll.contentFitsWidth === true,

  f2aStateUnchanged: !!kb && ['grid', 'cards', 'footer', 'pagination', 'listContainer', 'listSection', 'contentContainer', 'overlap']
    .every(k => JSON.stringify(keepNow[k]) === JSON.stringify(kb[k])),
  protectedNodesUnchanged: !!kb && JSON.stringify(keepNow.protected) === JSON.stringify(kb.protected),
  noStrayInstances: stray.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (baselineError) notes.push(baselineError);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  successCriteria, successCriteriaMet, failedCriteria,
  now, keepDiff, strayAppCards: stray, expectedAfter: EA,
  uxNote: '1024 뷰포트에서 3번째 줄이 대부분 보이는 것은 실패가 아니다 — 성공 조건에 넣지 않았다',
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet ? 'Phase F2-B CLOSED — Main 이 shell 1024 를 채우는 스크롤 영역이 됐습니다.'
                              : '아직 닫을 수 없습니다. failedCriteria 와 keepDiff 를 확인해주세요.'
});
