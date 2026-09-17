/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 22-F1
 * Phase F1 · Sidebar NavItem 6개만 교체
 *
 * Phase F 를 둘로 나눴다.
 *   F1 (이 스크립트) : NavItem 6개
 *   F2 (나중)        : Pagination 4개 + footer/layout debt
 * 22-v2 DRY_RUN 에서 footer 가 ABSOLUTE + constraints.vertical = MAX 로 확인됐다.
 * Pagination 을 32px 로 바꾸면 footer 가 위로 4px 올라가 grid 겹침이 65.5 → 69.5 로 악화된다.
 * 그래서 Pagination 은 이번에 건드리지 않는다.
 *
 * DRY_RUN = true 인 동안 파일을 한 글자도 바꾸지 않는다.
 *   모든 쓰기는 W() 를 지나고, DRY_RUN 이면 W() 가 예외를 던진다.
 *
 * 쓰지 않는 영역 (전후 스냅샷으로 확인한다)
 *   Pagination 1002:458 과 그 자식 4개 · footer 1002:451 · grid 1002:140 · 1002:533 의 index 0 (Margin)
 *
 * 교체 방식과 실패 처리는 22-v1 의 Nav 부분을 그대로 쓴다 (모형에서 롤백까지 확인한 코드).
 *   새 instance 완성 → old 바로 앞 삽입 → FILL → read-back → 성공한 뒤에만 old 숨김
 * ========================================================================== */

const SCRIPT_VERSION = '22-F1-v1-phaseF-nav-only-replace';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

const NAV_SET_ID = '1042:36';
const NAV_VARIANTS = { active: '1042:30', inactive: '1042:33' };
const NAV_ICON_PROP = 'icon#1056:16';
/* F1 에서는 Pagination 을 교체하지 않는다. 공용 교체 함수가 이름만 참조하므로 비워 둔다. */
const pagSet = null;
const PAG_ICON_PROP = null;

const NAV_TOP_PARENT = '1002:511';
const NAV_BOTTOM_PARENT = '1002:533';
const PAG_PARENT = '1002:458';
const FOOTER_ID = '1002:451';
const GRID_ID = '1002:140';
const BASELINE_KEY = 'joob.phaseF1.baseline';

const NAV_TARGETS = [
  { key: 'nav-1', srcId: '1002:512', parentId: NAV_TOP_PARENT, originalIndex: 0, label: '지원 내역', state: 'active', iconId: '1048:798', iconName: 'Icon / Nav / Applications' },
  { key: 'nav-2', srcId: '1002:517', parentId: NAV_TOP_PARENT, originalIndex: 1, label: '통계', state: 'inactive', iconId: '1048:800', iconName: 'Icon / Nav / Statistics' },
  { key: 'nav-3', srcId: '1002:522', parentId: NAV_TOP_PARENT, originalIndex: 2, label: '캘린더', state: 'inactive', iconId: '1048:802', iconName: 'Icon / Nav / Calendar' },
  { key: 'nav-4', srcId: '1002:527', parentId: NAV_TOP_PARENT, originalIndex: 3, label: '메모', state: 'inactive', iconId: '1048:804', iconName: 'Icon / Nav / Memo' },
  { key: 'nav-5', srcId: '1002:537', parentId: NAV_BOTTOM_PARENT, originalIndex: 1, label: '설정', state: 'inactive', iconId: '1048:806', iconName: 'Icon / Nav / Settings' },
  { key: 'nav-6', srcId: '1002:542', parentId: NAV_BOTTOM_PARENT, originalIndex: 2, label: '도움말', state: 'inactive', iconId: '1048:808', iconName: 'Icon / Nav / Help' }
];
const NON_TARGET_EXPECTED = { nodeId: '1002:534', name: 'Margin', index: 0, size: '232×30', visible: true };
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const EXPECT = {
  navItemSize: { w: 232, h: 32 }, pagItemSize: { w: 32, h: 32 },
  navTopBefore: '256×142', navTopAfter: '256×134',
  navBottomBefore: '232×102', navBottomAfter: '232×98',
  paginationSize: '124×28', footerSize: '976×52', footerY: 635.5, gridSize: '976×687'
};

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' &&
                          Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
const trim = s => (typeof s === 'string' ? s.trim() : s);

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function safeGet(node, key) {
  try { const v = node[key]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; }
}
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs.length || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
async function mainSetIdOf(inst) {
  if (!inst || inst.type !== 'INSTANCE') return null;
  const mc = await mainCompOf(inst);
  return mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null;
}
function geo(n) {
  return { x: r2(n.x), y: r2(n.y), width: r2(n.width), height: r2(n.height), size: r2(n.width) + '×' + r2(n.height) };
}
function layoutOf(n) {
  return {
    layoutMode: safeGet(n, 'layoutMode'), layoutWrap: safeGet(n, 'layoutWrap'),
    paddingLeft: r2(safeGet(n, 'paddingLeft') || 0), paddingRight: r2(safeGet(n, 'paddingRight') || 0),
    paddingTop: r2(safeGet(n, 'paddingTop') || 0), paddingBottom: r2(safeGet(n, 'paddingBottom') || 0),
    itemSpacing: r2(safeGet(n, 'itemSpacing') || 0),
    primaryAxisAlignItems: safeGet(n, 'primaryAxisAlignItems'),
    counterAxisAlignItems: safeGet(n, 'counterAxisAlignItems'),
    layoutSizingHorizontal: safeGet(n, 'layoutSizingHorizontal'),
    layoutSizingVertical: safeGet(n, 'layoutSizingVertical'),
    constraints: safeGet(n, 'constraints')
  };
}
function pathOf(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur.id !== root.id) {
    const p = cur.parent;
    if (!p || !Array.isArray(p.children)) return null;
    path.unshift(p.children.indexOf(cur));
    cur = p;
  }
  return cur && cur.id === root.id ? path : null;
}
function atPath(root, path) {
  let cur = root;
  for (const i of path) { const cs = kids(cur); if (i < 0 || i >= cs.length) return null; cur = cs[i]; }
  return cur;
}
function visibleOrder(parent) {
  return kids(parent).filter(c => c.visible !== false).map(c => c.id);
}

/* ---------- 쓰기 관문 ---------- */
let mutationCount = 0;
const mutationLog = [];
function W(what, fn) {
  if (DRY_RUN) throw new Error('DRY_RUN 인데 쓰기를 시도했다: ' + what);
  mutationCount++;
  mutationLog.push(what);
  return fn();
}


async function readSet(setId, variantIds, iconProp) {
  const set = await figma.getNodeByIdAsync(setId);
  const rec = { setId, found: !!set && set.type === 'COMPONENT_SET', name: set ? set.name : null,
    variants: {}, iconProperty: null, booleanProperties: [], issues: [] };
  if (!rec.found) { rec.issues.push(setId + ' 를 컴포넌트 세트로 읽지 못했다'); return rec; }
  let defs = null;
  try { defs = set.componentPropertyDefinitions; } catch (e) { rec.issues.push('속성 정의를 읽지 못했다'); }
  if (defs) {
    const d = defs[iconProp];
    rec.iconProperty = d ? { key: iconProp, type: d.type, defaultValue: d.defaultValue,
      isInstanceSwap: d.type === 'INSTANCE_SWAP' } : null;
    if (!d) rec.issues.push('아이콘 속성 ' + iconProp + ' 가 없다');
    rec.booleanProperties = Object.keys(defs).filter(k => defs[k].type === 'BOOLEAN')
      .map(k => ({ key: k, defaultValue: defs[k].defaultValue }));
  }
  for (const state of Object.keys(variantIds)) {
    const v = await figma.getNodeByIdAsync(variantIds[state]);
    const ok = !!v && v.type === 'COMPONENT' && !!v.parent && v.parent.id === setId;
    const e = { id: variantIds[state], found: ok };
    if (!ok) { rec.issues.push(state + ' variant ' + variantIds[state] + ' 가 세트 안의 컴포넌트가 아니다'); rec.variants[state] = e; continue; }
    e.name = v.name; e.geometry = geo(v);
    const texts = collectDeep(v, x => x.type === 'TEXT', 6);
    e.textCount = texts.length;
    e.labelPath = texts[0] ? pathOf(texts[0], v) : null;
    e.labelDefault = texts[0] ? texts[0].characters : null;
    e.labelVisibleByDefault = texts[0] ? texts[0].visible : null;
    e.labelFont = texts[0] ? safeGet(texts[0], 'fontName') : null;
    e.labelVisibleBoundTo = null;
    try { const ref = texts[0] ? texts[0].componentPropertyReferences : null; e.labelVisibleBoundTo = ref && ref.visible ? ref.visible : null; } catch (err) { /* 무시 */ }
    /* 아이콘 = 아이콘 속성에 묶인 인스턴스 */
    let iconNode = null;
    for (const inst of collectDeep(v, x => x.type === 'INSTANCE', 6)) {
      let ref = null;
      try { ref = inst.componentPropertyReferences; } catch (err) { /* 무시 */ }
      if (ref && ref.mainComponent === iconProp) { iconNode = inst; break; }
    }
    e.iconPath = iconNode ? pathOf(iconNode, v) : null;
    e.iconVisibleByDefault = iconNode ? iconNode.visible : null;
    e.iconVisibleBoundTo = null;
    try { const ref = iconNode ? iconNode.componentPropertyReferences : null; e.iconVisibleBoundTo = ref && ref.visible ? ref.visible : null; } catch (err) { /* 무시 */ }
    if (!e.labelPath) rec.issues.push(state + ' variant 에 TEXT 가 없다');
    if (!e.iconPath) rec.issues.push(state + ' variant 에서 ' + iconProp + ' 에 묶인 아이콘을 찾지 못했다');
    rec.variants[state] = e;
  }
  return rec;
}

async function readParent(id) {
  const p = await figma.getNodeByIdAsync(id);
  if (!p) return null;
  return { node: p, id: p.id, name: p.name, geometry: geo(p), layout: layoutOf(p),
    childCount: kids(p).length, childIds: kids(p).map(c => c.id),
    hiddenChildIds: kids(p).filter(c => c.visible === false).map(c => c.id) };
}

function layoutSafe(p) {
  return !!p && (p.layout.layoutMode === 'VERTICAL' || p.layout.layoutMode === 'HORIZONTAL') &&
    p.layout.layoutWrap !== 'WRAP';
}

/* 부모 크기 예측 — 공식이 지금 값을 재현할 때만 믿는다 */
function predictStack(p, targetIds, newW, newH) {
  if (!p) return null;
  const L = p.layout;
  const vertical = L.layoutMode === 'VERTICAL';
  const vis = kids(p.node).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE');
  const sb = L.primaryAxisAlignItems === 'SPACE_BETWEEN';
  const main = arr => r2((vertical ? L.paddingTop + L.paddingBottom : L.paddingLeft + L.paddingRight) +
    arr.reduce((a, b) => a + b, 0) + (sb ? 0 : L.itemSpacing * Math.max(0, arr.length - 1)));
  const cross = arr => r2((vertical ? L.paddingLeft + L.paddingRight : L.paddingTop + L.paddingBottom) + Math.max.apply(null, arr));
  const mainHug = (vertical ? L.layoutSizingVertical : L.layoutSizingHorizontal) === 'HUG';
  const crossHug = (vertical ? L.layoutSizingHorizontal : L.layoutSizingVertical) === 'HUG';
  const curMain = vis.map(c => vertical ? c.height : c.width);
  const curCross = vis.map(c => vertical ? c.width : c.height);
  const measuredMain = vertical ? p.geometry.height : p.geometry.width;
  const measuredCross = vertical ? p.geometry.width : p.geometry.height;
  const repMain = mainHug && !sb ? near(main(curMain), measuredMain, 1) : null;
  const repCross = crossHug ? near(cross(curCross), measuredCross, 1) : null;
  const nMain = vis.map(c => targetIds.indexOf(c.id) >= 0 ? (vertical ? newH : newW) : (vertical ? c.height : c.width));
  const nCross = vis.map(c => targetIds.indexOf(c.id) >= 0 ? (vertical ? newW : newH) : (vertical ? c.width : c.height));
  /* FILL 로 들어가는 새 NavItem 은 교차축이 부모 폭을 따른다 — 부모 폭 자체는 그대로 */
  const afterMain = mainHug ? main(nMain) : measuredMain;
  const afterCross = crossHug ? cross(nCross) : measuredCross;
  return {
    measurable: repMain !== false && repCross !== false,
    formulaReproducesMain: repMain, formulaReproducesCross: repCross,
    before: p.geometry.size,
    after: vertical ? (afterCross + '×' + afterMain) : (afterMain + '×' + afterCross)
  };
}


/* ---------- 세트 · 아이콘 · 부모 ---------- */
const navSet = await readSet(NAV_SET_ID, NAV_VARIANTS, NAV_ICON_PROP);
const iconNodes = {};
for (const id of NAV_TARGETS.map(t => t.iconId)) {
  const n = await figma.getNodeByIdAsync(id);
  iconNodes[id] = { id, found: !!n && n.type === 'COMPONENT', name: n ? n.name : null, key: n ? safeGet(n, 'key') : null };
}
const parents = {
  [NAV_TOP_PARENT]: await readParent(NAV_TOP_PARENT),
  [NAV_BOTTOM_PARENT]: await readParent(NAV_BOTTOM_PARENT)
};

/* ---------- 쓰지 않는 영역 스냅샷 ---------- */
async function untouchedSnapshot() {
  const pag = await figma.getNodeByIdAsync(PAG_PARENT);
  const footer = await figma.getNodeByIdAsync(FOOTER_ID);
  const grid = await figma.getNodeByIdAsync(GRID_ID);
  const pagChildren = [];
  for (const id of PAG_OLD_IDS) {
    const n = await figma.getNodeByIdAsync(id);
    pagChildren.push(n ? { id, type: n.type, visible: n.visible, geometry: geo(n),
      parentId: n.parent ? n.parent.id : null, index: n.parent ? kids(n.parent).indexOf(n) : null } : { id, missing: true });
  }
  return {
    pagination: pag ? { size: geo(pag).size, geometry: geo(pag), itemSpacing: r2(safeGet(pag, 'itemSpacing') || 0),
      childIds: kids(pag).map(c => c.id), visibleChildIds: kids(pag).filter(c => c.visible !== false).map(c => c.id) } : null,
    paginationChildren: pagChildren,
    footer: footer ? { size: geo(footer).size, geometry: geo(footer), childIds: kids(footer).map(c => c.id) } : null,
    grid: grid ? { size: geo(grid).size, geometry: geo(grid), childCount: kids(grid).length } : null
  };
}
const untouchedBefore = await untouchedSnapshot();
const paginationChildrenOk = untouchedBefore.paginationChildren.every(c => !c.missing && c.parentId === PAG_PARENT && c.visible !== false);
let paginationAlreadyReplaced = false;
for (const id of PAG_OLD_IDS) { const n = await figma.getNodeByIdAsync(id); if (n && n.type === 'INSTANCE') paginationAlreadyReplaced = true; }

/* ---------- Nav 대상 ---------- */
const navPlan = [];
for (const t of NAV_TARGETS) {
  const n = await figma.getNodeByIdAsync(t.srcId);
  const p = parents[t.parentId];
  const variant = navSet.variants[t.state];
  const rec = Object.assign({}, t, { found: !!n, issues: [] });
  if (!n) { rec.issues.push('노드를 찾지 못했다'); rec.ready = false; navPlan.push(rec); continue; }
  const texts = collectDeep(n, x => x.type === 'TEXT', 6);
  rec.readLabel = texts[0] ? trim(texts[0].characters) : null;
  rec.labelMatchesApproval = rec.readLabel === t.label;
  rec.readParentId = n.parent ? n.parent.id : null;
  rec.parentMatches = rec.readParentId === t.parentId;
  rec.readIndex = n.parent ? kids(n.parent).indexOf(n) : null;
  rec.indexMatches = rec.readIndex === t.originalIndex;
  rec.visibleNow = n.visible;
  rec.isAlreadyNavItem = (await mainSetIdOf(n)) === NAV_SET_ID;
  rec.oldSize = geo(n).size;
  rec.oldGeometry = geo(n);
  rec.plannedVariant = 'state=' + t.state;
  rec.plannedVariantId = NAV_VARIANTS[t.state];
  rec.plannedIcon = t.iconName;
  rec.iconFileName = iconNodes[t.iconId] ? iconNodes[t.iconId].name : null;
  rec.iconResolved = !!iconNodes[t.iconId] && iconNodes[t.iconId].found && iconNodes[t.iconId].name === t.iconName;
  rec.iconVisible = true;
  rec.expectedNewSize = EXPECT.navItemSize.w + '×' + EXPECT.navItemSize.h;
  rec.plannedSizing = { layoutSizingHorizontal: 'FILL', when: '부모에 삽입한 뒤' };
  if (!rec.labelMatchesApproval) rec.issues.push('라벨이 승인값과 다르다: ' + rec.readLabel);
  if (!rec.parentMatches) rec.issues.push('부모가 다르다: ' + rec.readParentId);
  if (!rec.indexMatches) rec.issues.push('순서가 다르다: ' + rec.readIndex);
  if (rec.visibleNow === false) rec.issues.push('이미 숨겨져 있다');
  if (rec.isAlreadyNavItem) rec.issues.push('이미 NavItem 인스턴스다');
  if (!rec.iconResolved) rec.issues.push('아이콘 ' + t.iconId + ' 이름이 ' + rec.iconFileName + ' 이다 (기대 ' + t.iconName + ')');
  if (!variant || !variant.found) rec.issues.push('variant 를 읽지 못했다');
  rec.ready = rec.issues.length === 0 && !!p;
  navPlan.push(rec);
}


/* ---------- 1002:533 의 대상 아닌 자식 ---------- */
const bottom = parents[NAV_BOTTOM_PARENT];
const targetIds = NAV_TARGETS.map(t => t.srcId);
const nonTargets = bottom ? kids(bottom.node).map((c, i) => ({ c, i })).filter(x => targetIds.indexOf(x.c.id) < 0) : [];
const nonTargetChildren = [];
for (const x of nonTargets) {
  nonTargetChildren.push({ nodeId: x.c.id, name: x.c.name, type: x.c.type, index: x.i,
    visible: x.c.visible, geometry: geo(x.c),
    isNavItemInstance: (await mainSetIdOf(x.c)) === NAV_SET_ID,
    plannedWrites: 0, preserved: true });
}
const index0 = nonTargetChildren.filter(x => x.index === 0)[0] || null;

/* ---------- Pagination 부모와 footer 의 가로 영향 ---------- */

const navTopPrediction = predictStack(parents[NAV_TOP_PARENT], targetIds, EXPECT.navItemSize.w, EXPECT.navItemSize.h);
const navBottomPrediction = predictStack(bottom, targetIds, EXPECT.navItemSize.w, EXPECT.navItemSize.h);

async function instancesOfSet(nodes, setId) {
  const acc = [];
  for (const c of nodes) if ((await mainSetIdOf(c)) === setId) acc.push(c.id);
  return acc;
}

const existingNav = (await instancesOfSet(kids(parents[NAV_TOP_PARENT] ? parents[NAV_TOP_PARENT].node : null), NAV_SET_ID))
  .concat(await instancesOfSet(kids(bottom ? bottom.node : null), NAV_SET_ID));
const strayNavOnPage = await instancesOfSet(kids(figma.currentPage), NAV_SET_ID);

/* ---------- preflight ---------- */
const navActive = navPlan.filter(p => p.state === 'active');
const preflight = {
  navSetFound: navSet.found,
  navVariantsFound: ['active', 'inactive'].every(s => navSet.variants[s] && navSet.variants[s].found),
  navIconPropertyFound: !!(navSet.iconProperty && navSet.iconProperty.isInstanceSwap),
  navVariantStructureResolved: ['active', 'inactive'].every(s => navSet.variants[s] && !!navSet.variants[s].labelPath && !!navSet.variants[s].iconPath),
  exactly6NavTargetsFound: navPlan.length === 6 && navPlan.every(p => p.found),
  bothNavParentsFound: !!parents[NAV_TOP_PARENT] && !!bottom,
  allNavLabelsMatchApproval: navPlan.every(p => p.labelMatchesApproval === true),
  allNavPositionsMatchApproval: navPlan.every(p => p.parentMatches === true && p.indexMatches === true),
  allNavVariantsResolved: navPlan.every(p => !!p.plannedVariantId),
  allNavIconsResolved: navPlan.every(p => p.iconResolved === true),
  exactlyOneActiveNav: navActive.length === 1 && navActive[0].label === '지원 내역',
  nonTargetChildResolved: !!index0 && index0.nodeId === NON_TARGET_EXPECTED.nodeId && index0.name === NON_TARGET_EXPECTED.name &&
    index0.geometry.size === NON_TARGET_EXPECTED.size && index0.visible === NON_TARGET_EXPECTED.visible,
  nonTargetChildPreservable: !!index0 && !index0.isNavItemInstance && !!bottom && bottom.childCount === 3 && nonTargetChildren.length === 1,
  bothNavParentsLayoutSafe: layoutSafe(parents[NAV_TOP_PARENT]) && layoutSafe(bottom),
  navTopPredictionMatches: !!navTopPrediction && navTopPrediction.measurable &&
    navTopPrediction.before === EXPECT.navTopBefore && navTopPrediction.after === EXPECT.navTopAfter,
  navBottomPredictionMatches: !!navBottomPrediction && navBottomPrediction.measurable &&
    navBottomPrediction.before === EXPECT.navBottomBefore && navBottomPrediction.after === EXPECT.navBottomAfter,
  paginationUntouched: !!untouchedBefore.pagination && untouchedBefore.pagination.size === EXPECT.paginationSize &&
    paginationChildrenOk && !paginationAlreadyReplaced,
  footerUntouched: !!untouchedBefore.footer && untouchedBefore.footer.size === EXPECT.footerSize &&
    near(untouchedBefore.footer.geometry.y, EXPECT.footerY),
  gridUntouched: !!untouchedBefore.grid && untouchedBefore.grid.size === EXPECT.gridSize,
  noExistingUnexpectedNavInstances: existingNav.length === 0,
  noStrayNavInstancesOnPage: strayNavOnPage.length === 0,
  everyTargetReady: navPlan.every(p => p.ready)
};
const preflightPassed = Object.keys(preflight).every(k => preflight[k]);
const preflightFailures = Object.keys(preflight).filter(k => !preflight[k]);
for (const p of navPlan) if (p.issues.length) notes.push(p.key + ' (' + p.srcId + '): ' + p.issues.join(' / '));
if (navSet.issues.length) notes.push('NavItem: ' + navSet.issues.join(' / '));

function navOrderPrediction(parentId) {
  const p = parents[parentId];
  if (!p) return null;
  return kids(p.node).filter(c => c.visible !== false).map(c => {
    const t = NAV_TARGETS.filter(x => x.srcId === c.id)[0];
    return t ? ('NavItem ' + t.label) : ('(대상 아님) ' + c.name);
  });
}

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'DRY_RUN', dryRun: true, readOnly: true,
    mutationCount, mutationCountIsZero: mutationCount === 0,
    writeGate: '모든 쓰기는 W() 를 거친다. DRY_RUN 이면 W() 가 예외를 던진다',
    scope: 'F1 — NavItem 6개만. Pagination · footer · grid 는 쓰지 않는다',
    preflight, preflightPassed, preflightFailures,
    nav: navPlan.map(p => ({ key: p.key, srcId: p.srcId, parentId: p.parentId, originalIndex: p.originalIndex,
      label: p.readLabel, plannedVariant: p.plannedVariant, plannedIcon: p.plannedIcon, iconVisible: p.iconVisible,
      oldSize: p.oldSize, expectedNewSize: p.expectedNewSize, plannedSizing: p.plannedSizing, ready: p.ready, issues: p.issues })),
    navPredictedVisibleOrder: { [NAV_TOP_PARENT]: navOrderPrediction(NAV_TOP_PARENT), [NAV_BOTTOM_PARENT]: navOrderPrediction(NAV_BOTTOM_PARENT) },
    parents: { [NAV_TOP_PARENT]: navTopPrediction, [NAV_BOTTOM_PARENT]: navBottomPrediction },
    nonTargetChildrenIn1002_533: nonTargetChildren,
    nonTargetChildrenPreserved: nonTargetChildren.length > 0 && nonTargetChildren.every(x => x.plannedWrites === 0),
    untouchedAreas: untouchedBefore,
    untouchedExpected: { pagination: EXPECT.paginationSize, footer: EXPECT.footerSize + ' @ y ' + EXPECT.footerY, grid: EXPECT.gridSize },
    navSet, iconNodes,
    notes, errorCount: errors.length, errors: errors.slice(0, 10),
    nextStep: preflightPassed
      ? 'preflight 전부 통과. 확인받은 뒤 같은 스크립트에서 DRY_RUN = false 로 APPLY 합니다.'
      : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * APPLY — DRY_RUN = false 일 때만
 * ========================================================================== */
if (!preflightPassed) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
    reason: 'preflight 실패 — 시작하지 않는다', preflight, preflightFailures, mutationCount });
}
const fonts = [];
for (const k of Object.keys(navSet.variants)) {
  const f = navSet.variants[k].labelFont;
  if (!f || f === figma.mixed || !f.family) continue;
  if (fonts.every(x => x.family !== f.family || x.style !== f.style)) fonts.push({ family: f.family, style: f.style });
}
const fontLoad = { requested: fonts.map(f => f.family + ' / ' + f.style), failed: [] };
for (const f of fonts) { try { await figma.loadFontAsync(f); } catch (e) { fontLoad.failed.push(f.family + ' / ' + f.style + ': ' + e.message); } }
if (fontLoad.failed.length) return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, reason: '폰트를 불러오지 못했다', fontLoad, mutationCount });

const baseline = {
  writtenBy: SCRIPT_VERSION, writtenAt: Date.now(),
  nonTargetChildren: nonTargetChildren.map(x => ({ nodeId: x.nodeId, name: x.name, index: x.index, visible: x.visible, geometry: x.geometry })),
  parentsBefore: { [NAV_TOP_PARENT]: parents[NAV_TOP_PARENT].geometry, [NAV_BOTTOM_PARENT]: bottom.geometry },
  untouchedBefore,
  navTargets: NAV_TARGETS,
  replacements: {}
};
function saveBaseline() { W('기준값 기록', () => figma.root.setPluginData(BASELINE_KEY, JSON.stringify(baseline))); }
saveBaseline();

const completedTargets = [];
let failedAt = null, stoppedAt = null;
let rollbackAttempted = false, rollbackSucceeded = null;
let partialMutationDetected = false, partialMutationKind = null;
const strayInstanceIds = [];
const results = [];

async function iconMainOf(inst, path) {
  const node = path ? atPath(inst, path) : null;
  const mc = node && node.type === 'INSTANCE' ? await mainCompOf(node) : null;
  return { node, id: mc ? mc.id : null, name: mc ? mc.name : null };
}
function sameGeo(a, b) {
  return near(a.x, b.x) && near(a.y, b.y) && near(a.width, b.width) && near(a.height, b.height);
}

async function replaceOne(kind, p) {
  const setRec = kind === 'nav' ? navSet : pagSet;
  const prop = kind === 'nav' ? NAV_ICON_PROP : PAG_ICON_PROP;
  const v = setRec.variants[p.state];
  const rec = { key: p.key, srcId: p.srcId, kind, steps: {}, complete: false };
  const old = await figma.getNodeByIdAsync(p.srcId);
  if (!old || !old.parent) throw Object.assign(new Error('old 노드를 찾지 못했다'), { rec });
  const parent = old.parent;
  const parentBefore = geo(parent);
  const orderBefore = visibleOrder(parent);
  let inst = null, inserted = false, oldHidden = false;

  try {
    const comp = await figma.getNodeByIdAsync(p.plannedVariantId);
    inst = W(p.key + ': 인스턴스 생성', () => comp.createInstance());

    /* 라벨 */
    const label = atPath(inst, v.labelPath);
    if (!label || label.type !== 'TEXT') throw new Error('라벨 TEXT 를 인스턴스에서 찾지 못했다');
    if (kind === 'nav' || p.role === 'page') {
      W(p.key + ': 라벨', () => { label.characters = p.label; });
      rec.steps.label = { wanted: p.label, readBack: label.characters, ok: label.characters === p.label };
    } else {
      if (v.labelVisibleBoundTo) W(p.key + ': 라벨 숨김(속성)', () => inst.setProperties({ [v.labelVisibleBoundTo]: false }));
      else W(p.key + ': 라벨 숨김', () => { label.visible = false; });
      rec.steps.label = { wanted: 'hidden', readBack: label.visible, ok: label.visible === false };
    }
    if (!rec.steps.label.ok) throw new Error('라벨 read-back 실패: ' + JSON.stringify(rec.steps.label));

    /* 아이콘 */
    if (p.iconId) {
      W(p.key + ': 아이콘 swap', () => inst.setProperties({ [prop]: p.iconId }));
      let back = await iconMainOf(inst, v.iconPath);
      let via = 'node id';
      if (back.id !== p.iconId && iconNodes[p.iconId] && iconNodes[p.iconId].key) {
        W(p.key + ': 아이콘 swap (key)', () => inst.setProperties({ [prop]: iconNodes[p.iconId].key }));
        back = await iconMainOf(inst, v.iconPath);
        via = 'component key';
      }
      if (!back.node) throw new Error('아이콘 노드를 인스턴스에서 찾지 못했다');
      if (back.node.visible !== true) {
        if (v.iconVisibleBoundTo) W(p.key + ': 아이콘 표시(속성)', () => inst.setProperties({ [v.iconVisibleBoundTo]: true }));
        else W(p.key + ': 아이콘 표시', () => { back.node.visible = true; });
      }
      rec.steps.icon = { wanted: p.iconName, readBack: back.name, via, visible: back.node.visible,
        ok: back.id === p.iconId && back.node.visible === true };
    } else {
      const back = await iconMainOf(inst, v.iconPath);
      rec.steps.icon = { wanted: 'hidden', visible: back.node ? back.node.visible : null,
        ok: !!back.node && back.node.visible === false };
    }
    if (!rec.steps.icon.ok) throw new Error('아이콘 read-back 실패: ' + JSON.stringify(rec.steps.icon));

    /* old 바로 앞에 삽입 */
    const idx = kids(parent).indexOf(old);
    W(p.key + ': old 앞에 삽입', () => parent.insertChild(idx, inst));
    inserted = true;
    if (kind === 'nav') W(p.key + ': FILL', () => { inst.layoutSizingHorizontal = 'FILL'; });

    /* read-back */
    const want = kind === 'nav' ? EXPECT.navItemSize : EXPECT.pagItemSize;
    const mc = await mainCompOf(inst);
    rec.steps.readBack = {
      mainSetOk: !!mc && !!mc.parent && mc.parent.id === setRec.setId,
      variantOk: !!mc && mc.id === p.plannedVariantId,
      parentOk: !!inst.parent && inst.parent.id === parent.id,
      rightBeforeOld: kids(parent).indexOf(inst) === kids(parent).indexOf(old) - 1,
      size: geo(inst).size,
      sizeOk: near(inst.width, want.w) && near(inst.height, want.h),
      sizing: safeGet(inst, 'layoutSizingHorizontal'),
      sizingOk: kind === 'nav' ? safeGet(inst, 'layoutSizingHorizontal') === 'FILL' : true
    };
    const rb = rec.steps.readBack;
    if (!(rb.mainSetOk && rb.variantOk && rb.parentOk && rb.rightBeforeOld && rb.sizeOk && rb.sizingOk)) {
      throw new Error('새 인스턴스 read-back 실패: ' + JSON.stringify(rb));
    }

    /* 새 것이 확인된 뒤에만 old 를 숨긴다 */
    W(p.key + ': old 숨김', () => { old.visible = false; });
    oldHidden = true;
    const expectedOrder = orderBefore.map(id => id === old.id ? inst.id : id);
    const orderAfter = visibleOrder(parent);
    rec.steps.after = {
      oldHidden: old.visible === false,
      orderOk: JSON.stringify(orderAfter) === JSON.stringify(expectedOrder),
      parentSize: geo(parent).size
    };
    if (parent.id === NAV_BOTTOM_PARENT) {
      rec.steps.after.nonTarget = nonTargetChildren.map(x => {
        const n = kids(parent).filter(c => c.id === x.nodeId)[0];
        return { nodeId: x.nodeId, present: !!n, visibleSame: !!n && n.visible === x.visible,
          geometrySame: !!n && sameGeo(geo(n), x.geometry), indexSame: !!n && kids(parent).indexOf(n) === x.index };
      });
      rec.steps.after.nonTargetOk = rec.steps.after.nonTarget.every(x => x.present && x.visibleSame && x.geometrySame && x.indexSame);
    } else rec.steps.after.nonTargetOk = true;
    if (!(rec.steps.after.oldHidden && rec.steps.after.orderOk && rec.steps.after.nonTargetOk)) {
      throw new Error('교체 후 확인 실패: ' + JSON.stringify(rec.steps.after));
    }

    rec.newInstanceId = inst.id;
    rec.complete = true;
    baseline.replacements[p.srcId] = inst.id;
    return rec;
  } catch (e) {
    rec.error = e.message;
    rollbackAttempted = true;
    partialMutationDetected = true;
    partialMutationKind = inserted ? (oldHidden ? 'afterOldHidden' : 'insertedBeforeOldHidden') : 'instanceNotInserted';
    const rb = { steps: [] };
    try {
      if (inst && !inst.removed) { W(p.key + ': 롤백 — 새 인스턴스 제거', () => inst.remove()); rb.steps.push('새 인스턴스 제거'); }
      if (old.visible !== true) { W(p.key + ': 롤백 — old 표시', () => { old.visible = true; }); rb.steps.push('old 다시 표시'); }
      rb.oldVisible = old.visible === true;
      rb.parentSizeRestored = sameGeo(geo(parent), parentBefore);
      rb.orderRestored = JSON.stringify(visibleOrder(parent)) === JSON.stringify(orderBefore);
      rollbackSucceeded = rb.oldVisible && rb.parentSizeRestored && rb.orderRestored;
    } catch (e2) { rb.error = e2.message; rollbackSucceeded = false; }
    if (inst && !inst.removed) strayInstanceIds.push(inst.id);
    rec.rollback = rb;
    throw Object.assign(new Error(e.message), { rec });
  }
}


for (const p of navPlan) {
  try {
    const rec = await replaceOne('nav', p);
    results.push(rec);
    completedTargets.push(p.srcId);
  } catch (e) {
    results.push(e.rec || { key: p.key, srcId: p.srcId, error: e.message });
    failedAt = p.key; stoppedAt = p.key;
    errors.push(p.key + ' 실패: ' + e.message);
    break;
  }
}
const targetsNotStarted = navPlan.filter(p => completedTargets.indexOf(p.srcId) < 0 && p.key !== failedAt).map(p => p.srcId);
try { saveBaseline(); } catch (e) { errors.push('기준값 갱신 실패: ' + e.message); }

const topNow = await figma.getNodeByIdAsync(NAV_TOP_PARENT);
const bottomNow = await figma.getNodeByIdAsync(NAV_BOTTOM_PARENT);
const untouchedAfter = await untouchedSnapshot();
const strayAfter = await instancesOfSet(kids(figma.currentPage), NAV_SET_ID);
const successCriteria = {
  allTargetsCompleted: completedTargets.length === navPlan.length,
  noErrors: errors.length === 0,
  navTopSize: geo(topNow).size === EXPECT.navTopAfter,
  navBottomSize: geo(bottomNow).size === EXPECT.navBottomAfter,
  paginationUntouched: JSON.stringify(untouchedAfter.pagination) === JSON.stringify(untouchedBefore.pagination) &&
    JSON.stringify(untouchedAfter.paginationChildren) === JSON.stringify(untouchedBefore.paginationChildren),
  footerUntouched: JSON.stringify(untouchedAfter.footer) === JSON.stringify(untouchedBefore.footer),
  gridUntouched: JSON.stringify(untouchedAfter.grid) === JSON.stringify(untouchedBefore.grid),
  noStrayInstances: strayInstanceIds.length === 0 && strayAfter.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', dryRun: false, aborted: false,
  mutationCount, successCriteria, successCriteriaMet,
  completedTargets, targetsNotStarted, failedAt, stoppedAt,
  rollbackAttempted, rollbackSucceeded, strayInstanceIds, partialMutationDetected, partialMutationKind,
  parentsAfter: { [NAV_TOP_PARENT]: geo(topNow).size, [NAV_BOTTOM_PARENT]: geo(bottomNow).size },
  untouchedBefore, untouchedAfter,
  results, fontLoad, baselineKey: BASELINE_KEY,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  mutationLogSample: mutationLog.slice(0, 40), mutationLogTotal: mutationLog.length,
  nextStep: successCriteriaMet ? '22b-F1 verifier 를 실행합니다.' : '실패 지점부터 확인해주세요. 완료된 대상은 그대로 두었습니다.'
});
