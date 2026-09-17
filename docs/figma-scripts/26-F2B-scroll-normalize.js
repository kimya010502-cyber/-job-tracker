/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 26
 * Phase F2-B · 스크롤 구조 정상화
 *
 * DRY_RUN = true 인 동안 파일을 한 글자도 바꾸지 않는다. 모든 쓰기는 W() 를 지난다.
 *
 * 결정 (25b probe 이후)
 *   shell 1002:2 와 Aside 는 1024 를 유지하고, 1002:3 Main 이 shell 높이 전체를 채우는
 *   스크롤 영역이 된다. 838 같은 고정 뷰포트는 쓰지 않는다 — 1024 화면에서 3번째 줄이
 *   대부분 보이는 것은 실패가 아니고, 더 낮은 브라우저 높이에서 자연스럽게 덜 보인다.
 *
 * 쓰는 것
 *   1002:3 Main   minHeight 1024 → null, 세로 HUG → FIXED, 높이 1024, clip true, overflow VERTICAL
 *                 (resize 가 가로 FILL 을 FIXED 로 바꾸면 FILL 로 되돌린다 — 조건부)
 *   1002:2 shell  세로 HUG → FIXED, 높이 1024
 *
 * 쓰지 않는 것
 *   Grid · 카드 · Footer · Pagination 숨김 상태 · footer 문구 · KPI · Toolbar · 기록 추가 · Nav ·
 *   Header(불투명도·블러 포함) · Aside · 1002:4 크기/sizing · 모든 컴포넌트 인스턴스
 * ========================================================================== */

const SCRIPT_VERSION = '26-F2B-v1-scroll-normalize';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

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
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));
const before = missing.length ? null : scrollState(nodes);
const keepBefore = missing.length ? null : await f2aAndProtected(nodes);
const strayBefore = await strayAppCards();
const m = nodes.mainContent, frame = nodes.main, aside = nodes.aside, header = nodes.header, cc = nodes.contentContainer;

/* ---------- 예측 ---------- */
const P = {};
if (before) {
  /* 1002:2 는 VERTICAL 이고 흐름 자식은 Main 하나 — HUG 공식이 지금 높이를 재현하는지 먼저 본다 */
  const frameFlow = flow(frame);
  const frameNowFormula = r2(pads(frame).t + pads(frame).b + frameFlow.reduce((a, c) => a + c.height, 0) + gapOf(frame) * Math.max(0, frameFlow.length - 1));
  const mainNowFormula = r2(pads(m).t + pads(m).b + flow(m).reduce((a, c) => a + c.height, 0) + gapOf(m) * Math.max(0, flow(m).length - 1));
  P.shell = { frameHugFormulaNow: frameNowFormula, frameFormulaReproduces: near(frameNowFormula, frame.height),
    mainOnlyFlowChild: frameFlow.length === 1 && frameFlow[0].id === m.id,
    frameAfter: r2(frame.width) + '×' + SHELL, frameSizingAfter: 'FIXED',
    mainTopInShell: r2(m.y), blankBelowMainAfter: r2(SHELL - (m.y + SHELL)),
    asideAfter: before.aside.size, asideInsideShellAfter: r2(aside.y) >= -0.5 && r2(aside.y + aside.height) <= SHELL + 0.5,
    headerAfter: before.header.size, headerUnchangedAfter: true };
  P.scroll = { mainHugFormulaNow: mainNowFormula, mainFormulaReproduces: near(mainNowFormula, m.height),
    mainAfter: r2(m.width) + '×' + SHELL, viewportAfter: SHELL,
    contentHeightAfter: before.scroll.contentHeight, contentSizingAfter: before.scroll.contentSizing,
    scrollContentHeightAfter: before.scroll.scrollContentHeight,
    maxScrollAfter: r2(Math.max(0, before.scroll.scrollContentHeight - SHELL)),
    bottomPaddingAfter: before.scroll.bottomPaddingAtEnd, spaceBelowFooterAfter: before.scroll.spaceBelowFooterAtEnd,
    contentStartsAtPaddingTop: before.scroll.contentStartsAtPaddingTop, contentFitsWidth: before.scroll.contentFitsWidth,
    footerReachableByScroll: before.scroll.footerBottomInMain <= before.scroll.scrollContentHeight + 0.5,
    rowVisibilityNote: '1024 뷰포트에서는 3번째 줄이 대부분 보인다 — 성공 조건이 아니다. 더 낮은 뷰포트에서 자연스럽게 덜 보인다' };
}

const plannedWrites = [
  { step: 2, node: IDS.mainContent, property: 'minHeight', from: before ? before.mainContent.minHeight : null, to: null },
  { step: 3, node: IDS.mainContent, property: 'layoutSizingVertical', from: before ? before.mainContent.sizingV : null, to: 'FIXED' },
  { step: 4, node: IDS.mainContent, property: 'height (resize)', from: before ? before.mainContent.height : null, to: SHELL },
  { step: '4b', node: IDS.mainContent, property: 'layoutSizingHorizontal', from: before ? before.mainContent.sizingH : null, to: before ? before.mainContent.sizingH : null,
    conditional: 'resize 가 가로 sizing 을 바꿨을 때만 원래 값으로 되돌린다' },
  { step: 5, node: IDS.mainContent, property: 'clipsContent', from: before ? before.mainContent.clipsContent : null, to: true },
  { step: 6, node: IDS.mainContent, property: 'overflowDirection', from: before ? before.mainContent.overflowDirection : null, to: 'VERTICAL' },
  { step: 7, node: IDS.main, property: 'layoutSizingVertical', from: before ? before.mainFrame.sizingV : null, to: 'FIXED' },
  { step: 8, node: IDS.main, property: 'height (resize)', from: before ? before.mainFrame.height : null, to: SHELL }
];

const E = EXPECT.before, EA = EXPECT.after;
const pf = {
  mainFound: !!m, mainFrameFound: !!frame, contentFound: !!cc, headerFound: !!header, asideFound: !!aside,
  currentF2AStateMatches: !!keepBefore && keepBefore.grid && keepBefore.grid.size === E.grid && near(keepBefore.footer.y, E.footerY) &&
    keepBefore.footer.size === '976×' + E.footerHeight && keepBefore.footer.positioning === 'AUTO' && keepBefore.pagination.visible === false &&
    keepBefore.listContainer.size === '976×' + E.list && keepBefore.contentContainer.size === '976×' + E.container &&
    keepBefore.contentContainer.sizingV === E.containerSizing && near(keepBefore.overlap, 0),
  mainMinHeight1024: !!before && before.mainContent.minHeight === E.mainMinHeight,
  mainCurrentlyHug: !!before && before.mainContent.sizingV === E.mainSizingV && near(before.mainContent.height, E.mainHeight),
  mainFrameCurrentlyHug: !!before && before.mainFrame.sizingV === E.frameSizingV && near(before.mainFrame.height, E.frameHeight),
  mainCurrentlyNotClipped: !!before && before.mainContent.clipsContent === E.mainClip,
  mainOverflowNone: !!before && before.mainContent.overflowDirection === E.mainOverflow,
  plannedMinHeightNullValid: !!before && typeof before.mainContent.minHeight === 'number',
  plannedMainFixedValid: !!P.scroll && P.scroll.mainFormulaReproduces && m.parent && m.parent.id === IDS.main,
  plannedMainHeight1024Valid: !!before && SHELL < before.mainContent.height && P.scroll.contentStartsAtPaddingTop,
  plannedClipValid: !!P.scroll && P.scroll.contentFitsWidth,
  plannedOverflowVerticalValid: !!P.scroll && P.scroll.scrollContentHeightAfter > SHELL,
  plannedShellFixed1024Valid: !!P.shell && P.shell.frameFormulaReproduces && P.shell.mainOnlyFlowChild && frame.parent && frame.parent.type === 'PAGE',
  predictedMain1024: !!P.scroll && P.scroll.mainAfter === EA.main,
  predictedShell1024: !!P.shell && P.shell.frameAfter === EA.frame && near(P.shell.blankBelowMainAfter, 0),
  predictedAsideInsideShell: !!P.shell && P.shell.asideInsideShellAfter && P.shell.asideAfter === EA.aside,
  predictedHeaderUnchanged: !!P.shell && P.shell.headerAfter === EA.header,
  predictedContentHug1015: !!P.scroll && P.scroll.contentSizingAfter === 'HUG' && near(P.scroll.contentHeightAfter, EA.container),
  predictedScrollContent1143: !!P.scroll && near(P.scroll.scrollContentHeightAfter, EA.scrollContent),
  predictedMaxScroll119: !!P.scroll && near(P.scroll.maxScrollAfter, EA.maxScroll),
  predictedBottomPadding64: !!P.scroll && near(P.scroll.bottomPaddingAfter, EA.bottomPadding) && near(P.scroll.spaceBelowFooterAfter, EA.belowFooter),
  footerReachableByScroll: !!P.scroll && P.scroll.footerReachableByScroll,
  gridFooterF2AUnchanged: plannedWrites.every(w => [IDS.mainContent, IDS.main].indexOf(w.node) >= 0),
  noUnexpectedReparenting: plannedWrites.every(w => w.property !== 'parent') && !!m && m.parent && m.parent.id === IDS.main,
  noNewOverlap: !!keepBefore && near(keepBefore.overlap, 0),
  noUnexpectedClipping: !!P.scroll && P.scroll.contentFitsWidth && !!header && !isInsideNode(header, m) && !!aside && !isInsideNode(aside, m),
  protectedNodesPreserved: !!keepBefore && Object.keys(keepBefore.protected).every(k => keepBefore.protected[k] !== 'missing'),
  noStrayInstances: strayBefore.length === 0,
  mutationCountIsZero: mutationCount === 0
};
function isInsideNode(n, a) { let c = n; while (c) { if (c.id === a.id) return true; c = c.parent; } return false; }
pf.everyTargetReady = Object.keys(pf).every(k => pf[k] === true);
const preflightPassed = pf.everyTargetReady;
const preflightFailures = Object.keys(pf).filter(k => pf[k] !== true);

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'DRY_RUN', dryRun: true, readOnly: true, mutationCount,
    preflight: pf, preflightPassed, preflightFailures,
    before, plannedWrites,
    predictedAfter: P.scroll && P.shell ? {
      mainContent: { size: P.scroll.mainAfter, sizingV: 'FIXED', minHeight: null, clipsContent: true, overflowDirection: 'VERTICAL', sizingH: before.mainContent.sizingH },
      mainFrame: { size: P.shell.frameAfter, sizingV: 'FIXED' }, aside: P.shell.asideAfter, header: P.shell.headerAfter,
      contentContainer: { sizing: P.scroll.contentSizingAfter, height: P.scroll.contentHeightAfter } } : null,
    scrollPrediction: P.scroll, shellPrediction: P.shell,
    preservationChecks: { f2aStateAndProtectedNow: keepBefore, headerStyleUntouched: { fills: before ? before.header.fills : null, effects: before ? before.header.effects : null },
      writesOnlyTo: [IDS.mainContent, IDS.main] },
    notes, errorCount: errors.length, errors: errors.slice(0, 10),
    nextStep: preflightPassed ? 'preflight 전부 통과. 확인받은 뒤 같은 스크립트에서 DRY_RUN = false 로 APPLY 합니다.'
                              : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * APPLY — 단계마다 read-back, 어긋나면 멈추고 거꾸로 되돌린다
 * ========================================================================== */
if (!preflightPassed) return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, reason: 'preflight 실패', preflight: pf, preflightFailures, mutationCount });

const baseline = { writtenBy: SCRIPT_VERSION, writtenAt: Date.now(), before, keepBefore, predictions: P, expect: EXPECT };
W('baseline 기록', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline)));

const done = [], steps = [];
let failedAt = null, rollbackAttempted = false, rollbackSucceeded = null;
const rollbackLog = [];
function check(step, ok, detail) { steps.push({ step, ok, detail }); if (!ok) throw new Error(step + ' read-back 실패: ' + JSON.stringify(detail)); }

try {
  const old = { minHeight: safeGet(m, 'minHeight'), sizingV: safeGet(m, 'layoutSizingVertical'), sizingH: safeGet(m, 'layoutSizingHorizontal'),
    height: m.height, width: m.width, clip: safeGet(m, 'clipsContent'), overflow: safeGet(m, 'overflowDirection'),
    frameSizingV: safeGet(frame, 'layoutSizingVertical'), frameHeight: frame.height };

  W('Main minHeight null', () => { m.minHeight = null; });
  done.push({ step: 'minHeight', undo: () => { m.minHeight = old.minHeight; } });
  check('2 minHeight', safeGet(m, 'minHeight') === null, { minHeight: safeGet(m, 'minHeight') });

  W('Main FIXED', () => { m.layoutSizingVertical = 'FIXED'; });
  done.push({ step: 'mainFixed', undo: () => { m.layoutSizingVertical = old.sizingV; } });
  check('3 Main FIXED', safeGet(m, 'layoutSizingVertical') === 'FIXED', { sizingV: safeGet(m, 'layoutSizingVertical') });

  W('Main resize 1024', () => { m.resize(m.width, SHELL); });
  /* resize 를 되돌릴 때도 resize 가 가로 sizing 을 다시 바꿀 수 있으므로 여기서 함께 복원한다 */
  done.push({ step: 'mainResize', undo: () => { m.resize(old.width, old.height); if (safeGet(m, 'layoutSizingHorizontal') !== old.sizingH) m.layoutSizingHorizontal = old.sizingH; } });
  let sizingHAfterResize = safeGet(m, 'layoutSizingHorizontal');
  if (sizingHAfterResize !== old.sizingH) {
    W('Main 가로 sizing 복원', () => { m.layoutSizingHorizontal = old.sizingH; });
    sizingHAfterResize = safeGet(m, 'layoutSizingHorizontal');
    notes.push('resize 가 Main 가로 sizing 을 바꿔서 ' + old.sizingH + ' 로 되돌렸다');
  }
  done.push({ step: 'mainSizingH', undo: () => { if (safeGet(m, 'layoutSizingHorizontal') !== old.sizingH) m.layoutSizingHorizontal = old.sizingH; } });
  check('4 Main 1024', near(m.height, SHELL) && near(m.width, old.width) && sizingHAfterResize === old.sizingH && safeGet(m, 'layoutSizingVertical') === 'FIXED',
    { height: r2(m.height), width: r2(m.width), sizingH: sizingHAfterResize });

  W('Main clip', () => { m.clipsContent = true; });
  done.push({ step: 'clip', undo: () => { m.clipsContent = old.clip; } });
  check('5 clip', safeGet(m, 'clipsContent') === true, { clip: safeGet(m, 'clipsContent') });

  W('Main overflow VERTICAL', () => { m.overflowDirection = 'VERTICAL'; });
  done.push({ step: 'overflow', undo: () => { m.overflowDirection = old.overflow; } });
  check('6 overflow', safeGet(m, 'overflowDirection') === 'VERTICAL', { overflow: safeGet(m, 'overflowDirection') });

  W('shell FIXED', () => { frame.layoutSizingVertical = 'FIXED'; });
  done.push({ step: 'shellFixed', undo: () => { frame.layoutSizingVertical = old.frameSizingV; } });
  W('shell resize 1024', () => { frame.resize(frame.width, SHELL); });
  done.push({ step: 'shellResize', undo: () => { if (old.frameSizingV !== 'HUG') frame.resize(frame.width, old.frameHeight); } });
  check('8 shell 1024', safeGet(frame, 'layoutSizingVertical') === 'FIXED' && near(frame.height, SHELL), { sizingV: safeGet(frame, 'layoutSizingVertical'), height: r2(frame.height) });

  const s9 = scrollState(nodes);
  check('9 전체', s9.mainContent.size === EXPECT.after.main && s9.mainContent.minHeight === null && s9.mainContent.clipsContent === true &&
    s9.mainContent.overflowDirection === 'VERTICAL' && s9.mainFrame.size === EXPECT.after.frame && s9.aside.size === EXPECT.after.aside &&
    s9.asideInsideShell === true && s9.header.size === EXPECT.after.header && near(s9.blankBelowMainInShell, 0) &&
    near(s9.scroll.scrollContentHeight, EXPECT.after.scrollContent) && near(s9.scroll.maxScrollDistance, EXPECT.after.maxScroll) &&
    near(s9.scroll.bottomPaddingAtEnd, EXPECT.after.bottomPadding) && s9.header.fills === before.header.fills && s9.header.effects === before.header.effects,
    { main: s9.mainContent.size, frame: s9.mainFrame.size, aside: s9.aside.size, asideInside: s9.asideInsideShell, blank: s9.blankBelowMainInShell,
      scroll: s9.scroll.scrollContentHeight, maxScroll: s9.scroll.maxScrollDistance, bottomPad: s9.scroll.bottomPaddingAtEnd });

  const keep10 = await f2aAndProtected(nodes);
  check('10 보존', JSON.stringify(keep10) === JSON.stringify(keepBefore), { changed: Object.keys(keep10).filter(k => JSON.stringify(keep10[k]) !== JSON.stringify(keepBefore[k])) });
} catch (e) {
  failedAt = e.message; errors.push(e.message);
  rollbackAttempted = done.length > 0;
  for (const d of done.slice().reverse()) {
    try { W('롤백 ' + d.step, d.undo); rollbackLog.push({ step: d.step, ok: true }); } catch (e2) { rollbackLog.push({ step: d.step, ok: false, error: e2.message }); }
  }
  if (rollbackAttempted) {
    const sr = scrollState(nodes);
    rollbackSucceeded = rollbackLog.every(x => x.ok) && sr.mainContent.minHeight === before.mainContent.minHeight &&
      sr.mainContent.sizingV === before.mainContent.sizingV && sr.mainContent.sizingH === before.mainContent.sizingH &&
      near(sr.mainContent.height, before.mainContent.height) && sr.mainContent.clipsContent === before.mainContent.clipsContent &&
      sr.mainContent.overflowDirection === before.mainContent.overflowDirection &&
      sr.mainFrame.sizingV === before.mainFrame.sizingV && near(sr.mainFrame.height, before.mainFrame.height);
    baseline.rollbackState = sr;
  }
}

const after = scrollState(nodes);
const keepAfter = await f2aAndProtected(nodes);
const strayAfter = await strayAppCards();
baseline.after = after; baseline.applyCompleted = !failedAt;
try { W('baseline 갱신', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline))); } catch (e) { errors.push('baseline 갱신 실패: ' + e.message); }

const successCriteria = {
  allStepsCompleted: !failedAt,
  main1024ScrollContainer: after.mainContent.size === EXPECT.after.main && after.mainContent.sizingV === 'FIXED' && after.mainContent.minHeight === null &&
    after.mainContent.clipsContent === true && after.mainContent.overflowDirection === 'VERTICAL' && after.mainContent.sizingH === before.mainContent.sizingH,
  shell1024: after.mainFrame.size === EXPECT.after.frame && after.mainFrame.sizingV === 'FIXED',
  noBlankShellArea: near(after.blankBelowMainInShell, 0),
  asideInsideShell: after.asideInsideShell === true && after.aside.size === EXPECT.after.aside,
  headerUnchanged: after.header.size === before.header.size && after.header.fills === before.header.fills && after.header.effects === before.header.effects,
  contentScrolls: after.scroll.scrollContentHeight > after.scroll.viewportHeight && near(after.scroll.maxScrollDistance, EXPECT.after.maxScroll),
  footerReachable: after.scroll.footerBottomInMain <= after.scroll.scrollContentHeight + 0.5,
  bottomPaddingKept: near(after.scroll.bottomPaddingAtEnd, EXPECT.after.bottomPadding),
  f2aAndProtectedUnchanged: JSON.stringify(keepAfter) === JSON.stringify(keepBefore),
  noStrayInstances: strayAfter.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', dryRun: false, mutationCount,
  successCriteria, successCriteriaMet, steps, failedAt,
  partialMutationDetected: !!failedAt && done.length > 0, completedSteps: done.map(d => d.step),
  rollbackAttempted, rollbackSucceeded, rollbackLog,
  before, after, baselineKey: BASELINE_KEY,
  notes, errorCount: errors.length, errors: errors.slice(0, 10), mutationLog,
  nextStep: successCriteriaMet ? '26b verifier 를 실행합니다.' : '실패 지점과 롤백 결과를 확인해주세요.'
});
