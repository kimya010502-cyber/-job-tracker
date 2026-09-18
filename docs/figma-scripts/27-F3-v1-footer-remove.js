/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 27
 * Phase F3 · Footer bar 제거
 *
 * DRY_RUN = true 인 동안 파일을 한 글자도 바꾸지 않는다. 모든 쓰기는 W() 를 지난다.
 *
 * 이 프로젝트에서 처음으로 노드를 "삭제" 하는 단계다.
 * 지금까지의 원칙은 "지우지 말고 숨긴다" 였고, 이번 삭제는 사용자가 명시적으로 결정했다.
 *   이유: pagination 은 이미 제거 방향, "총 20개 중 1-8 표시" 는 연속 스크롤과 맞지 않고,
 *         "정렬: 지원일 최신순" 은 Toolbar 정렬 UI 와 중복이다.
 *
 * 지우는 것: Footer 1002:451 하나. 자식(문구 2개, 숨긴 pagination, old 버튼 4개)은 부모와 함께 사라진다.
 *            자식을 따로 먼저 지우지 않는다.
 * 지우지 않는 것: Pagination Item 컴포넌트 마스터(1042:46) 를 포함한 모든 컴포넌트 마스터.
 *
 * 롤백 방식 (삭제는 되돌릴 수 없으므로)
 *   APPLY 는 지우기 전에 footer 를 clone 해서 페이지 바깥 먼 곳에 백업으로 둔다.
 *   중간 read-back 이 어긋나면 백업을 원래 부모의 원래 순서에 다시 넣는다 (새 id 가 된다).
 *   전부 성공하면 백업도 지워서 아무것도 남기지 않는다.
 *   Figma 편집기의 실행 취소(Ctrl+Z)와 버전 기록으로도 되돌릴 수 있다.
 * ========================================================================== */

const SCRIPT_VERSION = '27-F3-v1-footer-remove';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

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

/* ---------- 쓰기 관문 ---------- */
let mutationCount = 0;
const mutationLog = [];
function W(what, fn) {
  if (DRY_RUN) throw new Error('DRY_RUN 인데 쓰기를 시도했다: ' + what);
  mutationCount++; mutationLog.push(what);
  return fn();
}
function isInsideNode(n, a) { let c = n; while (c) { if (c.id === a.id) return true; c = c.parent; } return false; }

/* ---------- 읽기 ---------- */
const nodes = await readNodes();
const footer = nodes.footer, list = nodes.listContainer, section = nodes.listSection, cc = nodes.contentContainer, m = nodes.mainContent, grid = nodes.grid;
const required = ['main', 'mainContent', 'contentContainer', 'listSection', 'listContainer', 'grid', 'header', 'aside'];
const missing = required.filter(k => !nodes[k]);
if (missing.length) errors.push('찾지 못한 노드: ' + missing.join(', '));
const scBefore = missing.length ? null : scrollState(nodes);
const snapBefore = missing.length ? null : await f3Snapshot(nodes);
const gridBottomBefore = scBefore ? gridBottomState(nodes, scBefore) : null;
const strayBefore = await strayAppCards();

/* footer 안에 무엇이 들어 있는가 — 컴포넌트 마스터가 섞여 있으면 지우면 안 된다 */
const footerContents = footer ? (function () {
  const all = [];
  (function walk(x) { for (const c of kids(x)) { all.push(c); walk(c); } })(footer);
  return {
    descendantCount: all.length,
    componentMasters: all.filter(x => x.type === 'COMPONENT' || x.type === 'COMPONENT_SET').map(x => x.id + ' ' + x.name),
    instances: all.filter(x => x.type === 'INSTANCE').map(x => x.id + ' ' + x.name),
    texts: all.filter(x => x.type === 'TEXT').map(x => ({ id: x.id, text: x.characters })),
    expectedDescendantsInside: FOOTER_DESCENDANT_IDS.map(id => ({ id, inside: all.some(x => x.id === id) }))
  };
})() : null;
const pagMaster = await figma.getNodeByIdAsync(PAGINATION_MASTER_SET_ID);

/* ---------- 예측 — 공식이 지금 값을 재현하는지 먼저 본다 ---------- */
const P = {};
if (scBefore && footer) {
  const lp = pads(list);
  const listNow = vStack(list);
  const listAfter = r2(lp.t + lp.b + flow(list).filter(c => c.id !== footer.id).reduce((a, c) => a + c.height, 0) +
    gapOf(list) * Math.max(0, flow(list).filter(c => c.id !== footer.id).length - 1));
  const sectionNow = vStack(section);
  const sectionAfter = vStack(section, c => (c.id === list.id ? listAfter : c.height));
  const containerNow = vStack(cc);
  const containerAfter = vStack(cc, c => (c.id === section.id ? sectionAfter : c.height));
  const contentTop = scBefore.scroll.contentTopInMain, mp = pads(m);
  const scrollAfter = r2(contentTop + containerAfter + mp.b);
  P.propagation = {
    list: { formulaNow: listNow, reproducesNow: near(listNow, list.height), after: listAfter, delta: r2(listAfter - list.height),
      remainingFlowChildren: flow(list).filter(c => c.id !== footer.id).map(c => c.id + ' ' + c.name) },
    section: { formulaNow: sectionNow, reproducesNow: near(sectionNow, section.height), after: sectionAfter },
    contentContainer: { formulaNow: containerNow, reproducesNow: near(containerNow, cc.height), after: containerAfter, sizing: safeGet(cc, 'layoutSizingVertical') },
    removedHeight: r2(footer.height + gapOf(list))
  };
  P.scroll = {
    viewport: r2(m.height), scrollContentNow: scBefore.scroll.scrollContentHeight, scrollContentAfter: scrollAfter,
    maxScrollNow: scBefore.scroll.maxScrollDistance, maxScrollAfter: r2(Math.max(0, scrollAfter - m.height)),
    bottomPaddingAfter: mp.b,
    gridBottomInMain: gridBottomBefore.gridBottomInMain,
    gridDoesNotMove: kids(list).indexOf(grid) < kids(list).indexOf(footer),
    spaceBelowGridAfter: r2(scrollAfter - gridBottomBefore.gridBottomInMain),
    stillScrolls: scrollAfter > m.height
  };
}

const plannedDeletes = footer ? [{ node: IDS.footer, name: footer.name, type: footer.type, parent: footer.parent ? footer.parent.id : null,
  index: footer.parent ? kids(footer.parent).indexOf(footer) : null, removesWithIt: footerContents ? footerContents.descendantCount : null,
  method: 'footer.remove() 한 번. 자식을 따로 먼저 지우지 않는다' }] : [];
const plannedTextWrites = 0;
const plannedOtherWrites = 0;

const E = EXPECT.before, EA = EXPECT.after;
const pf = {
  footerFound: !!footer,
  footerParentIsListContainer: !!footer && !!footer.parent && footer.parent.id === IDS.listContainer,
  footerIndexExpected: !!footer && !!footer.parent && kids(footer.parent).indexOf(footer) === E.footerIndex && kids(footer.parent).length === 2,
  footerContainsExpectedChildren: !!footerContents && footerContents.expectedDescendantsInside.every(x => x.inside),
  noComponentMasterInsideFooter: !!footerContents && footerContents.componentMasters.length === 0,
  paginationMasterOutsideFooter: !!pagMaster && (!footer || !isInsideNode(pagMaster, footer)),
  gridFound: !!grid,
  gridSize705: !!snapBefore && snapBefore.grid.size === E.grid,
  listContainer757: !!list && size(list) === E.list,
  listSection757: !!section && size(section) === E.section,
  contentContainer1015: !!cc && size(cc) === E.container && safeGet(cc, 'layoutSizingVertical') === 'HUG',
  mainScrollStateMatchesF2B: !!snapBefore && snapBefore.mainScroll.size === E.main && snapBefore.mainScroll.sizingV === E.mainSizingV &&
    snapBefore.mainScroll.clip === E.mainClip && snapBefore.mainScroll.overflow === E.mainOverflow && snapBefore.mainScroll.minHeight === E.mainMinHeight &&
    snapBefore.shell.size === E.frame && near(scBefore.scroll.scrollContentHeight, E.scrollContent) && near(scBefore.scroll.maxScrollDistance, E.maxScroll),
  footerHeight40: !!footer && size(footer) === E.footer,
  parentGap12: !!list && near(gapOf(list), E.listGap),
  formulasReproduceNow: !!P.propagation && P.propagation.list.reproducesNow && P.propagation.section.reproducesNow && P.propagation.contentContainer.reproducesNow,
  predictedList705: !!P.propagation && near(P.propagation.list.after, 705),
  predictedSection705: !!P.propagation && near(P.propagation.section.after, 705),
  predictedContent963: !!P.propagation && near(P.propagation.contentContainer.after, 963),
  predictedScrollContent1091: !!P.scroll && near(P.scroll.scrollContentAfter, EA.scrollContent),
  predictedMaxScroll67: !!P.scroll && near(P.scroll.maxScrollAfter, EA.maxScroll),
  predictedBottomPadding64: !!P.scroll && near(P.scroll.bottomPaddingAfter, EA.bottomPadding) && near(P.scroll.spaceBelowGridAfter, EA.spaceBelowGrid),
  gridUnchanged: !!P.scroll && P.scroll.gridDoesNotMove,
  cardsUnchanged: !!snapBefore && snapBefore.cards && snapBefore.cards.length === 12,
  mainScrollUnchanged: plannedOtherWrites === 0,
  shellUnchanged: plannedOtherWrites === 0,
  headerUnchanged: !!nodes.header && (!footer || !isInsideNode(nodes.header, footer)),
  asideUnchanged: !!nodes.aside && (!footer || !isInsideNode(nodes.aside, footer)),
  protectedNodesPreserved: !!snapBefore && Object.keys(snapBefore.protected).every(k => snapBefore.protected[k] !== 'missing') &&
    ['header', 'aside', 'kpiStrip', 'toolbar', 'topHeader', 'addRow', 'navTop', 'navBottom', 'grid', 'contentContainer', 'listSection', 'mainContent', 'main']
      .every(k => !nodes[k] || !footer || !isInsideNode(nodes[k], footer)),
  onlyFooterWillBeDeleted: plannedDeletes.length === 1 && plannedDeletes[0].node === IDS.footer,
  noOtherNodeDeletes: plannedDeletes.length === 1,
  noTextWrites: plannedTextWrites === 0,
  noStrayInstances: strayBefore.length === 0,
  mutationCountIsZero: mutationCount === 0
};
pf.everyTargetReady = Object.keys(pf).every(k => pf[k] === true);
const preflightPassed = pf.everyTargetReady;
const preflightFailures = Object.keys(pf).filter(k => pf[k] !== true);

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'DRY_RUN', dryRun: true, readOnly: true, mutationCount,
    preflight: pf, preflightPassed, preflightFailures,
    before: { list: list ? size(list) : null, section: section ? size(section) : null, contentContainer: cc ? size(cc) : null,
      footer: footer ? { size: size(footer), index: footer.parent ? kids(footer.parent).indexOf(footer) : null, contents: footerContents } : null,
      scroll: scBefore ? scBefore.scroll : null, gridBottom: gridBottomBefore },
    plannedDeletes, plannedTextWrites, plannedOtherWrites,
    predictedAfter: P.propagation && P.scroll ? {
      grid: snapBefore.grid.size + ' (그대로)', listContainer: '976×' + P.propagation.list.after, listSection: '976×' + P.propagation.section.after,
      contentContainer: '976×' + P.propagation.contentContainer.after, main: snapBefore.mainScroll.size + ' (그대로)', shell: snapBefore.shell.size + ' (그대로)',
      scrollContent: P.scroll.scrollContentAfter, maxScroll: P.scroll.maxScrollAfter, bottomPadding: P.scroll.bottomPaddingAfter,
      spaceBelowGrid: P.scroll.spaceBelowGridAfter, footer: '없음', footerDescendants: 'footer 와 함께 없음', paginationMaster: '그대로 (' + PAGINATION_MASTER_SET_ID + ')' } : null,
    propagationPrediction: P.propagation, scrollPrediction: P.scroll,
    preservationChecks: { snapshotNow: snapBefore, paginationMasterId: PAGINATION_MASTER_SET_ID, paginationMasterFound: !!pagMaster },
    rollbackPlan: 'APPLY 는 지우기 전에 footer 를 페이지 바깥에 백업 clone 으로 둔다. 어긋나면 원래 부모·순서에 다시 넣고(새 id), 성공하면 백업도 지운다.',
    notes, errorCount: errors.length, errors: errors.slice(0, 10),
    nextStep: preflightPassed ? 'preflight 전부 통과. 확인받은 뒤 같은 스크립트에서 DRY_RUN = false 로 APPLY 합니다.'
                              : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * APPLY
 * ========================================================================== */
if (!preflightPassed) return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, reason: 'preflight 실패', preflight: pf, preflightFailures, mutationCount });

const baseline = { writtenBy: SCRIPT_VERSION, writtenAt: Date.now(), scBefore, snapBefore, gridBottomBefore, footerContents, predictions: P, expect: EXPECT };
W('baseline 기록', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline)));

const steps = [];
let failedAt = null, deleted = false, backup = null;
let rollbackAttempted = false, rollbackSucceeded = null, restoredFooterId = null;
const originalName = footer.name, originalIndex = kids(list).indexOf(footer);
const originalSizing = { h: safeGet(footer, 'layoutSizingHorizontal'), v: safeGet(footer, 'layoutSizingVertical'), positioning: safeGet(footer, 'layoutPositioning') };
function check(step, ok, detail) { steps.push({ step, ok, detail }); if (!ok) throw new Error(step + ' read-back 실패: ' + JSON.stringify(detail)); }

try {
  /* 2. 다시 확인 */
  check('2 footer 재확인', !footer.removed && footer.parent && footer.parent.id === IDS.listContainer && kids(list).indexOf(footer) === E.footerIndex,
    { parent: footer.parent ? footer.parent.id : null, index: kids(list).indexOf(footer) });

  /* 2b. 백업 — clone 은 같은 부모에 먼저 들어가므로 즉시 페이지로 옮기고, 목록 높이가 원래대로인지 본다 */
  backup = W('footer 백업 clone', () => footer.clone());
  W('백업을 페이지로', () => figma.currentPage.appendChild(backup));
  W('백업 이름', () => { backup.name = BACKUP_TAG; });
  W('백업 위치', () => { backup.x = nodes.main.x + 42000; backup.y = nodes.main.y; });
  check('2b 백업 후 원래 상태', size(list) === E.list && kids(list).length === 2 && kids(list).indexOf(footer) === E.footerIndex && !isInsideNode(backup, nodes.main),
    { list: size(list), children: kids(list).length });

  /* 3. 삭제 */
  W('footer 삭제', () => footer.remove());
  deleted = true;
  nodes.footer = null; nodes.footerLeft = null; nodes.pagination = null;   /* 삭제된 노드는 더 이상 읽지 않는다 */

  /* 4~7. read-back */
  check('4 목록', size(list) === '976×' + P.propagation.list.after && kids(list).length === 1 && kids(list)[0].id === IDS.grid, { list: size(list), children: kids(list).map(c => c.id) });
  check('5 section', size(section) === '976×' + P.propagation.section.after, { section: size(section) });
  check('6 content', size(cc) === '976×' + P.propagation.contentContainer.after && safeGet(cc, 'layoutSizingVertical') === 'HUG', { content: size(cc) });
  const sc7 = scrollState(nodes);
  const gb7 = gridBottomState(nodes, sc7);
  check('7 스크롤', near(sc7.scroll.scrollContentHeight, P.scroll.scrollContentAfter) && near(sc7.scroll.maxScrollDistance, P.scroll.maxScrollAfter) &&
    near(sc7.scroll.bottomPaddingAtEnd, P.scroll.bottomPaddingAfter) && near(gb7.spaceBelowGridAtEnd, P.scroll.spaceBelowGridAfter) &&
    near(gb7.gridBottomInMain, gridBottomBefore.gridBottomInMain),
    { scroll: sc7.scroll.scrollContentHeight, maxScroll: sc7.scroll.maxScrollDistance, bottom: sc7.scroll.bottomPaddingAtEnd, belowGrid: gb7.spaceBelowGridAtEnd });

  /* 8. 보존 */
  const snap8 = await f3Snapshot(nodes);
  const changed = Object.keys(snap8).filter(k => JSON.stringify(snap8[k]) !== JSON.stringify(snapBefore[k]));
  check('8 보존', changed.length === 0, { changed });

  /* 9. 떠도는 인스턴스 · 사라져야 할 노드 */
  const stray9 = await strayAppCards();
  const gone9 = await footerGone();
  check('9 정리', stray9.length === 0 && Object.keys(gone9).every(k => gone9[k]) && !!(await figma.getNodeByIdAsync(PAGINATION_MASTER_SET_ID)),
    { stray: stray9, gone: gone9 });

  /* 성공 — 백업도 지운다 */
  W('백업 삭제', () => backup.remove());
  backup = null;
} catch (e) {
  failedAt = e.message; errors.push(e.message);
  if (backup && !backup.removed) {
    if (deleted) {
      rollbackAttempted = true;
      try {
        W('백업을 원래 자리로', () => list.insertChild(originalIndex, backup));
        W('원래 이름', () => { backup.name = originalName; });
        if (safeGet(backup, 'layoutPositioning') !== originalSizing.positioning) W('원래 positioning', () => { backup.layoutPositioning = originalSizing.positioning; });
        if (safeGet(backup, 'layoutSizingHorizontal') !== originalSizing.h) W('원래 가로 sizing', () => { backup.layoutSizingHorizontal = originalSizing.h; });
        if (safeGet(backup, 'layoutSizingVertical') !== originalSizing.v) W('원래 세로 sizing', () => { backup.layoutSizingVertical = originalSizing.v; });
        restoredFooterId = backup.id;
        rollbackSucceeded = size(list) === E.list && size(section) === E.section && size(cc) === E.container &&
          near(scrollState(nodes).scroll.scrollContentHeight, E.scrollContent) && kids(list).indexOf(backup) === originalIndex;
        notes.push('footer 를 백업에서 복원했다 — 새 id ' + restoredFooterId + ' (원래 ' + IDS.footer + ')');
      } catch (e2) { rollbackSucceeded = false; errors.push('복원 실패: ' + e2.message + " — 캔버스의 '" + BACKUP_TAG + "' 를 직접 확인해주세요"); }
    } else {
      try { W('삭제 전 실패 — 백업 정리', () => backup.remove()); } catch (e3) { errors.push('백업 정리 실패: ' + e3.message); }
    }
  }
}

const scAfter = scrollState(nodes);
const snapAfter = await f3Snapshot(nodes);
const goneAfter = await footerGone();
const leftoverBackups = kids(figma.currentPage).filter(n => n.name === BACKUP_TAG).map(n => n.id);
baseline.after = { scroll: scAfter.scroll, gridBottom: gridBottomState(nodes, scAfter), gone: goneAfter };
baseline.applyCompleted = !failedAt;
try { W('baseline 갱신', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline))); } catch (e) { errors.push('baseline 갱신 실패: ' + e.message); }

const successCriteria = {
  allStepsCompleted: !failedAt,
  footerRemoved: goneAfter[IDS.footer] === true,
  footerChildrenRemovedWithParent: FOOTER_DESCENDANT_IDS.every(id => goneAfter[id] === true),
  listSectionContentAsPredicted: size(list) === '976×' + (P.propagation ? P.propagation.list.after : '?') && size(cc) === '976×' + (P.propagation ? P.propagation.contentContainer.after : '?'),
  scrollAsPredicted: !!P.scroll && near(scAfter.scroll.scrollContentHeight, P.scroll.scrollContentAfter) && near(scAfter.scroll.maxScrollDistance, P.scroll.maxScrollAfter),
  protectedUnchanged: JSON.stringify(snapAfter) === JSON.stringify(snapBefore),
  paginationMasterKept: !!(await figma.getNodeByIdAsync(PAGINATION_MASTER_SET_ID)),
  noLeftoverBackup: leftoverBackups.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', dryRun: false, mutationCount,
  successCriteria, successCriteriaMet, steps, failedAt,
  partialMutationDetected: !!failedAt && deleted, rollbackAttempted, rollbackSucceeded, restoredFooterId, leftoverBackups,
  after: { list: size(list), section: size(section), contentContainer: size(cc), scroll: scAfter.scroll, gone: goneAfter },
  baselineKey: BASELINE_KEY,
  notes, errorCount: errors.length, errors: errors.slice(0, 10), mutationLog,
  nextStep: successCriteriaMet ? '27b verifier 를 실행합니다.' : '실패 지점과 복원 결과를 확인해주세요.'
});
