/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 22b-F1
 * Phase F1 검증 (읽기 전용) · NavItem 6개
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 대상 목록 · 기대값 · helper 는 22-F1 에서 그대로 가져왔다.
 * Nav 검증 본문은 22b-v1 의 Nav 부분을 그대로 쓴다.
 * F1 은 Pagination · footer · grid 를 건드리지 않았어야 한다 — 기준값 스냅샷과 고정 기대값 둘 다와 비교한다.
 * ========================================================================== */

const SCRIPT_VERSION = '22b-F1-v1-phaseF-nav-only-verify';
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

let baseline = null, baselineError = null;
try {
  const raw = figma.root.getPluginData(BASELINE_KEY);
  if (raw) baseline = JSON.parse(raw); else baselineError = 'APPLY 가 남긴 기준값(' + BASELINE_KEY + ')이 없다';
} catch (e) { baselineError = '기준값을 읽지 못했다: ' + e.message; }

async function iconOf(inst, prop) {
  for (const n of collectDeep(inst, x => x.type === 'INSTANCE', 6)) {
    let ref = null;
    try { ref = n.componentPropertyReferences; } catch (e) { /* 무시 */ }
    if (ref && ref.mainComponent === prop) {
      const mc = await mainCompOf(n);
      return { found: true, name: mc ? mc.name : null, id: mc ? mc.id : null, visible: n.visible };
    }
  }
  return { found: false };
}
async function newFor(t, setId) {
  const old = await figma.getNodeByIdAsync(t.srcId);
  let id = baseline && baseline.replacements ? baseline.replacements[t.srcId] : null;
  let inst = id ? await figma.getNodeByIdAsync(id) : null;
  let via = inst ? '기준값 기록' : null;
  if (!inst && old && old.parent) {
    const cs = kids(old.parent), i = cs.indexOf(old);
    const prev = i > 0 ? cs[i - 1] : null;
    if (prev && (await mainSetIdOf(prev)) === setId) { inst = prev; via = 'old 바로 앞 형제'; }
  }
  return { old, inst, via };
}

/* ---------- Nav ---------- */
const navRows = [];
for (const t of NAV_TARGETS) {
  const { old, inst, via } = await newFor(t, NAV_SET_ID);
  const row = { key: t.key, srcId: t.srcId, newInstanceId: inst ? inst.id : null, foundVia: via, checks: {}, detail: {} };
  const mc = inst ? await mainCompOf(inst) : null;
  const label = inst ? collectDeep(inst, x => x.type === 'TEXT', 6)[0] : null;
  const icon = inst ? await iconOf(inst, NAV_ICON_PROP) : { found: false };
  row.detail = { variant: mc ? mc.name : null, label: label ? label.characters : null, icon,
    size: inst ? geo(inst).size : null, sizing: inst ? safeGet(inst, 'layoutSizingHorizontal') : null,
    parentId: inst && inst.parent ? inst.parent.id : null, oldVisible: old ? old.visible : null };
  row.checks.isNavItem = !!mc && !!mc.parent && mc.parent.id === NAV_SET_ID;
  row.checks.variantCorrect = !!mc && mc.id === NAV_VARIANTS[t.state];
  row.checks.labelCorrect = !!label && trim(label.characters) === t.label;
  row.checks.iconCorrect = icon.found && icon.id === t.iconId;
  row.checks.iconVisible = icon.found && icon.visible === true;
  row.checks.size232x32 = !!inst && near(inst.width, 232) && near(inst.height, 32);
  row.checks.sizingFill = row.detail.sizing === 'FILL';
  row.checks.parentCorrect = row.detail.parentId === t.parentId;
  row.checks.oldHidden = !!old && old.visible === false;
  row.checks.rightBeforeOld = !!inst && !!old && !!old.parent && kids(old.parent).indexOf(inst) === kids(old.parent).indexOf(old) - 1;
  row.failed = Object.keys(row.checks).filter(k => !row.checks[k]);
  if (row.failed.length) errors.push(t.key + ' 실패: ' + row.failed.join(', '));
  navRows.push(row);
}

/* 부모별 보이는 순서 · 크기 · 대상 아닌 자식 */
async function readParentNow(id) { return await figma.getNodeByIdAsync(id); }
const topNow = await readParentNow(NAV_TOP_PARENT);
const bottomNow = await readParentNow(NAV_BOTTOM_PARENT);
async function visibleLabels(p) {
  const acc = [];
  for (const c of kids(p).filter(x => x.visible !== false)) {
    const isNav = (await mainSetIdOf(c)) === NAV_SET_ID;
    const t = collectDeep(c, x => x.type === 'TEXT', 6)[0];
    acc.push(isNav ? ('NavItem ' + (t ? trim(t.characters) : '?')) : ('(대상 아님) ' + c.id));
  }
  return acc;
}
const topOrder = topNow ? await visibleLabels(topNow) : null;
const bottomOrder = bottomNow ? await visibleLabels(bottomNow) : null;
const nonTargetCheck = (baseline && Array.isArray(baseline.nonTargetChildren) ? baseline.nonTargetChildren : []).map(x => {
  const n = bottomNow ? kids(bottomNow).filter(c => c.id === x.nodeId)[0] : null;
  return { nodeId: x.nodeId, present: !!n, visibleSame: !!n && n.visible === x.visible,
    indexSame: !!n && kids(bottomNow).indexOf(n) === x.index,
    sizeSame: !!n && near(n.width, x.geometry.width) && near(n.height, x.geometry.height),
    positionSame: !!n && near(n.x, x.geometry.x) && near(n.y, x.geometry.y),
    notReplaced: !!n && n.type !== 'INSTANCE' };
});
const navInstancesInParents = [];
for (const p of [topNow, bottomNow]) for (const c of kids(p)) if ((await mainSetIdOf(c)) === NAV_SET_ID) navInstancesInParents.push(c.id);


/* ---------- 쓰지 않았어야 하는 영역 ---------- */
async function untouchedNow() {
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
const untouched = await untouchedNow();
const before = baseline && baseline.untouchedBefore ? baseline.untouchedBefore : null;
const pagInstancesNow = [];
const pagNode = await figma.getNodeByIdAsync(PAG_PARENT);
for (const c of kids(pagNode)) if (c.type === 'INSTANCE') pagInstancesNow.push(c.id);

const strayOnPage = [];
for (const c of kids(figma.currentPage)) if ((await mainSetIdOf(c)) === NAV_SET_ID) strayOnPage.push({ id: c.id, name: c.name });

const every = k => navRows.length > 0 && navRows.every(r => r.checks[k] === true);
const activeRows = navRows.filter(r => r.checks.isNavItem && r.detail.variant && /active/i.test(r.detail.variant) && !/inactive/i.test(r.detail.variant));
const successCriteria = {
  baselineReadable: !!baseline,
  all6AreNavItems: navRows.length === 6 && every('isNavItem'),
  exactlyOneActive: activeRows.length === 1,
  activeIsApplications: activeRows.length === 1 && activeRows[0].srcId === '1002:512',
  otherFiveInactive: navRows.filter(r => r.checks.variantCorrect && r.srcId !== '1002:512').length === 5,
  allNavVariantsCorrect: every('variantCorrect'),
  allNavLabelsCorrect: every('labelCorrect'),
  allNavIconsCorrect: every('iconCorrect'),
  allNavIconsVisible: every('iconVisible'),
  allNav232x32: every('size232x32'),
  allNavSizingFill: every('sizingFill'),
  allNavParentsCorrect: every('parentCorrect'),
  allOldNavHidden: every('oldHidden'),
  allNavOrderKept: every('rightBeforeOld'),
  navTopOrder: JSON.stringify(topOrder) === JSON.stringify(['NavItem 지원 내역', 'NavItem 통계', 'NavItem 캘린더', 'NavItem 메모']),
  navBottomOrder: !!bottomOrder && bottomOrder.length === 3 && bottomOrder[0].indexOf('(대상 아님)') === 0 &&
    bottomOrder[1] === 'NavItem 설정' && bottomOrder[2] === 'NavItem 도움말',
  marginUntouched: nonTargetCheck.length === 1 && nonTargetCheck[0].nodeId === NON_TARGET_EXPECTED.nodeId &&
    nonTargetCheck.every(x => x.present && x.visibleSame && x.indexSame && x.sizeSame && x.positionSame && x.notReplaced),
  navTopSize: !!topNow && geo(topNow).size === EXPECT.navTopAfter,
  navBottomSize: !!bottomNow && geo(bottomNow).size === EXPECT.navBottomAfter,
  noDuplicateNavInstances: navInstancesInParents.length === 6,

  paginationSizeUnchanged: !!untouched.pagination && untouched.pagination.size === EXPECT.paginationSize,
  paginationMatchesSnapshot: !!before && JSON.stringify(untouched.pagination) === JSON.stringify(before.pagination),
  paginationOld4Unchanged: !!before && JSON.stringify(untouched.paginationChildren) === JSON.stringify(before.paginationChildren) &&
    untouched.paginationChildren.every(c => !c.missing && c.type !== 'INSTANCE' && c.visible !== false),
  paginationNotReplaced: pagInstancesNow.length === 0,
  footerSizeUnchanged: !!untouched.footer && untouched.footer.size === EXPECT.footerSize,
  footerYUnchanged: !!untouched.footer && near(untouched.footer.geometry.y, EXPECT.footerY),
  footerMatchesSnapshot: !!before && JSON.stringify(untouched.footer) === JSON.stringify(before.footer),
  gridSizeUnchanged: !!untouched.grid && untouched.grid.size === EXPECT.gridSize,
  gridMatchesSnapshot: !!before && JSON.stringify(untouched.grid) === JSON.stringify(before.grid),

  noStrayNavInstancesOnPage: strayOnPage.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (baselineError) notes.push(baselineError);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  successCriteria, successCriteriaMet, failedCriteria,
  nav: navRows, navVisibleOrder: { [NAV_TOP_PARENT]: topOrder, [NAV_BOTTOM_PARENT]: bottomOrder },
  marginCheck: nonTargetCheck,
  parents: { [NAV_TOP_PARENT]: topNow ? geo(topNow).size : null, [NAV_BOTTOM_PARENT]: bottomNow ? geo(bottomNow).size : null },
  untouchedNow: untouched, untouchedBeforeApply: before, strayOnPage,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet ? 'Phase F1 CLOSED — NavItem 6개 교체 완료, Pagination · footer · grid 는 그대로입니다.'
                              : '아직 닫을 수 없습니다. failedCriteria 를 확인해주세요.'
});
