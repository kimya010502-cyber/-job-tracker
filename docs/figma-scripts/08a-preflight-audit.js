/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 08a
 * 인스턴스 교체 전 사전 점검 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API 를 포함하지 않으며, 모든 대입은 로컬 보고 객체에만 이뤄진다.
 *
 * 점검 대상 7개 영역
 *   1) 지원 카드 그리드 1002:140 — layoutMode / wrap / gap / 행·열 구조 / clipsContent / sizing
 *   2) KPI Strip 1002:23        — Auto Layout · STRETCH 가능 여부
 *   3) Toolbar 1003:1695        — Auto Layout 구조
 *   4) Sidebar Nav 1002:511     — NavItem 부모 layout
 *   5) Pagination 부모 1002:458 — layoutMode / gap
 *   6) Footer 1002:451          — 현재 위치와 그리드와의 관계
 *   7) Main content 1002:3/1002:4 — 스크롤 구조, 4×2 + 3행 일부 UX 유지 가능 여부
 *
 * 이 결과로 정할 것
 *   그리드가 Auto Layout 이면  → Phase E(카드 12장 교체)를 독립 실행
 *   그리드가 절대 배치이면     → Phase E 를 12단계 그리드 재구성과 합쳐서 진행
 *   (absolute 좌표를 새 인스턴스에 복제하는 방식은 쓰지 않는다)
 * ========================================================================== */

const SCRIPT_VERSION = '08a-v1-preflight';

const IDS = {
  main: '1002:2',
  mainColumn: '1002:3',
  container: '1002:4',
  topHeader: '1009:698',
  kpiStrip: '1002:23',
  toolbar: '1003:1695',
  tableSection: '1002:139',
  tableInner: '1009:2',
  cardGrid: '1002:140',
  footer: '1002:451',
  pagination: '1002:458',
  sidebar: '1002:492',
  nav: '1002:511',
  appHeader: '1002:469'
};

// 새 컴포넌트 실측값 (교체 후 예상 배치 계산용)
const NEW_CARD_H = 219;
const GRID_GAP_X = 12;
const GRID_GAP_Y = 24;   // 40 → 24 축소 확정
const VIEWPORT_H = 1024;

const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 공통 리포터 ---------- */
function layoutOf(n) {
  if (!n) return null;
  const o = {
    id: n.id, name: n.name, type: n.type,
    size: r2(n.width) + '×' + r2(n.height),
    x: r2(n.x), y: r2(n.y),
    layoutMode: n.layoutMode || 'NONE',
    isAutoLayout: !!n.layoutMode && n.layoutMode !== 'NONE'
  };
  if (o.isAutoLayout) {
    o.primaryAxisSizingMode = n.primaryAxisSizingMode;
    o.counterAxisSizingMode = n.counterAxisSizingMode;
    o.primaryAxisAlignItems = n.primaryAxisAlignItems;
    o.counterAxisAlignItems = n.counterAxisAlignItems;
    o.itemSpacing = r2(n.itemSpacing);
    o.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/');
    try { o.layoutWrap = n.layoutWrap; } catch (e) { o.layoutWrap = '(읽기 불가)'; }
    try { o.counterAxisSpacing = n.counterAxisSpacing === null ? null : r2(n.counterAxisSpacing); }
    catch (e) { o.counterAxisSpacing = '(읽기 불가)'; }
  }
  try { o.clipsContent = n.clipsContent; } catch (e) { /* 무시 */ }
  try { o.overflowDirection = n.overflowDirection; } catch (e) { /* 무시 */ }
  try { o.layoutSizingHorizontal = n.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { o.layoutSizingVertical = n.layoutSizingVertical; } catch (e) { /* 무시 */ }
  o.childCount = 'children' in n ? n.children.length : 0;
  return o;
}
function childrenOf(n, limit) {
  if (!n || !('children' in n)) return [];
  return n.children.slice(0, limit || 20).map(c => ({
    name: c.name, id: c.id, type: c.type,
    x: r2(c.x), y: r2(c.y), size: r2(c.width) + '×' + r2(c.height),
    layoutPositioning: (function () { try { return c.layoutPositioning; } catch (e) { return null; } })(),
    layoutGrow: (function () { try { return c.layoutGrow; } catch (e) { return null; } })(),
    layoutAlign: (function () { try { return c.layoutAlign; } catch (e) { return null; } })(),
    H: (function () { try { return c.layoutSizingHorizontal; } catch (e) { return null; } })(),
    V: (function () { try { return c.layoutSizingVertical; } catch (e) { return null; } })()
  }));
}

const N = {};
for (const k of Object.keys(IDS)) {
  N[k] = await figma.getNodeByIdAsync(IDS[k]);
  if (!N[k]) notes.push(k + ' (' + IDS[k] + ') 노드를 찾지 못함');
}
if (!N.main) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'PREFLIGHT', readOnly: true, aborted: true, reason: '메인 프레임을 찾지 못함' });
}

/* ---------- 1. 지원 카드 그리드 ---------- */
const grid = N.cardGrid;
const gridCards = grid && 'children' in grid ? grid.children.filter(c => c.name.indexOf('Article - Card') === 0) : [];
const gridReport = {
  layout: layoutOf(grid),
  cardCount: gridCards.length,
  cards: gridCards.map(c => ({ name: c.name, x: r2(c.x), y: r2(c.y), size: r2(c.width) + '×' + r2(c.height) })),
  distinctX: [...new Set(gridCards.map(c => r2(c.x)))].sort((a, b) => a - b),
  distinctY: [...new Set(gridCards.map(c => r2(c.y)))].sort((a, b) => a - b),
  allChildren: childrenOf(grid, 20)
};
gridReport.columnCount = gridReport.distinctX.length;
gridReport.rowCount = gridReport.distinctY.length;
gridReport.currentColumnPitch = gridReport.distinctX.length > 1 ? r2(gridReport.distinctX[1] - gridReport.distinctX[0]) : null;
gridReport.currentRowPitch = gridReport.distinctY.length > 1 ? r2(gridReport.distinctY[1] - gridReport.distinctY[0]) : null;
gridReport.verdict = gridReport.layout && gridReport.layout.isAutoLayout
  ? 'AUTO_LAYOUT — Phase E 를 독립 실행할 수 있다'
  : 'ABSOLUTE — Phase E 를 12단계 그리드 재구성과 합쳐야 한다';

/* ---------- 2~6. 나머지 영역 ---------- */
const kpiReport = {
  layout: layoutOf(N.kpiStrip),
  children: childrenOf(N.kpiStrip),
  stretchReady: N.kpiStrip && N.kpiStrip.layoutMode === 'HORIZONTAL',
  note: 'counterAxisAlignItems 가 STRETCH 여야 4장이 같은 높이가 된다. 현재값을 layout 에서 확인할 것.'
};
const toolbarReport = { layout: layoutOf(N.toolbar), children: childrenOf(N.toolbar) };
const navReport = {
  layout: layoutOf(N.nav),
  children: childrenOf(N.nav),
  note: 'NavItem 은 가로 FILL 로 배치한다. 부모가 VERTICAL Auto Layout 이어야 한다.'
};
const pagReport = { layout: layoutOf(N.pagination), children: childrenOf(N.pagination) };
const footerReport = {
  layout: layoutOf(N.footer),
  parent: N.footer && N.footer.parent ? { id: N.footer.parent.id, name: N.footer.parent.name, type: N.footer.parent.type } : null,
  siblingIndex: N.footer && N.footer.parent ? N.footer.parent.children.indexOf(N.footer) : null,
  tableSection: layoutOf(N.tableSection),
  tableInner: layoutOf(N.tableInner),
  tableInnerChildren: childrenOf(N.tableInner)
};
if (grid && N.footer) {
  const gridBottom = grid.y + grid.height;
  footerReport.gridBottom = r2(gridBottom);
  footerReport.footerTop = r2(N.footer.y);
  footerReport.overlapPx = r2(gridBottom - N.footer.y);
  footerReport.overlaps = gridBottom - N.footer.y > 0.5;
}

/* ---------- 7. 본문 스크롤 구조 / viewport 투영 ---------- */
const mainReport = {
  frame: layoutOf(N.main),
  mainColumn: layoutOf(N.mainColumn),
  container: layoutOf(N.container),
  containerChildren: childrenOf(N.container),
  appHeader: layoutOf(N.appHeader),
  sidebar: layoutOf(N.sidebar)
};

// 그리드의 프레임 기준 절대 y (부모를 거슬러 올라가며 누적)
function absYWithin(node, rootId) {
  let y = 0, cur = node;
  let guard = 0;
  while (cur && cur.id !== rootId && guard < 20) { y += cur.y; cur = cur.parent; guard++; }
  return cur && cur.id === rootId ? r2(y) : null;
}
const gridAbsY = grid ? absYWithin(grid, IDS.main) : null;

const projection = { gridAbsoluteY: gridAbsY, viewportHeight: VIEWPORT_H, newCardHeight: NEW_CARD_H, gapY: GRID_GAP_Y };
if (gridAbsY !== null) {
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const top = r2(gridAbsY + i * (NEW_CARD_H + GRID_GAP_Y));
    const bottom = r2(top + NEW_CARD_H);
    rows.push({
      row: i + 1, top, bottom,
      fullyVisible: bottom <= VIEWPORT_H,
      visiblePx: r2(Math.max(0, Math.min(bottom, VIEWPORT_H) - top))
    });
  }
  projection.rows = rows;
  projection.rowsFullyVisible = rows.filter(r => r.fullyVisible).length;
  projection.thirdRowVisiblePx = rows[2] ? rows[2].visiblePx : null;
  projection.uxIntentHeld = projection.rowsFullyVisible >= 2 && projection.thirdRowVisiblePx > 0;
  projection.note = '교체 후 카드 219 · 세로 gap 24 기준. 2행이 온전히 보이고 3행이 일부 보이면 현재 UX 가 유지된다.';
}

/* ---------- 결론 ---------- */
const conclusions = [];
conclusions.push('카드 그리드: ' + gridReport.verdict);
if (footerReport.overlaps) conclusions.push('푸터가 그리드와 ' + footerReport.overlapPx + 'px 겹쳐 있다 (12단계에서 해소)');
if (kpiReport.layout && kpiReport.layout.counterAxisAlignItems !== 'STRETCH') {
  conclusions.push('KPI Strip 의 counterAxisAlignItems 가 ' + kpiReport.layout.counterAxisAlignItems + ' 다 — 4장 동일 높이를 위해 STRETCH 필요');
}
if (projection.uxIntentHeld === false) {
  conclusions.push('교체 후 2행+3행 일부 UX 가 현재 컨테이너 높이에서 유지되지 않는다 — 스크롤 구조 조정 필요');
}

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'PREFLIGHT',
  readOnly: true,
  aborted: false,
  cardGrid: gridReport,
  kpiStrip: kpiReport,
  toolbar: toolbarReport,
  sidebarNav: navReport,
  pagination: pagReport,
  footer: footerReport,
  mainContent: mainReport,
  viewportProjection: projection,
  conclusions,
  notes
});
