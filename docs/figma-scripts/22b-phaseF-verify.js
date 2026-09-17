/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 22b
 * Phase F 최종 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 대상 목록 · 기대값 · helper 는 22 스크립트에서 그대로 가져왔다 (둘이 다르게 읽지 않도록).
 * APPLY 가 figma.root 에 남긴 기준값으로 대상 아닌 자식이 그대로인지 비교한다.
 * ========================================================================== */

const SCRIPT_VERSION = '22b-v1-phaseF-verify';
const NAV_SET_ID = '1042:36';
const NAV_VARIANTS = { active: '1042:30', inactive: '1042:33' };
const NAV_ICON_PROP = 'icon#1056:16';
const PAG_SET_ID = '1042:46';
const PAG_VARIANTS = { default: '1042:37', current: '1042:40', disabled: '1042:43' };
const PAG_ICON_PROP = 'icon#1056:19';

const NAV_TOP_PARENT = '1002:511';
const NAV_BOTTOM_PARENT = '1002:533';
const PAG_PARENT = '1002:458';
const FOOTER_ID = '1002:451';
const BASELINE_KEY = 'joob.phaseF.baseline';

/* 사람이 승인한 대상 */
const NAV_TARGETS = [
  { key: 'nav-1', srcId: '1002:512', parentId: NAV_TOP_PARENT, originalIndex: 0, label: '지원 내역', state: 'active', iconId: '1048:798', iconName: 'Icon / Nav / Applications' },
  { key: 'nav-2', srcId: '1002:517', parentId: NAV_TOP_PARENT, originalIndex: 1, label: '통계', state: 'inactive', iconId: '1048:800', iconName: 'Icon / Nav / Statistics' },
  { key: 'nav-3', srcId: '1002:522', parentId: NAV_TOP_PARENT, originalIndex: 2, label: '캘린더', state: 'inactive', iconId: '1048:802', iconName: 'Icon / Nav / Calendar' },
  { key: 'nav-4', srcId: '1002:527', parentId: NAV_TOP_PARENT, originalIndex: 3, label: '메모', state: 'inactive', iconId: '1048:804', iconName: 'Icon / Nav / Memo' },
  { key: 'nav-5', srcId: '1002:537', parentId: NAV_BOTTOM_PARENT, originalIndex: 1, label: '설정', state: 'inactive', iconId: '1048:806', iconName: 'Icon / Nav / Settings' },
  { key: 'nav-6', srcId: '1002:542', parentId: NAV_BOTTOM_PARENT, originalIndex: 2, label: '도움말', state: 'inactive', iconId: '1048:808', iconName: 'Icon / Nav / Help' }
];
const PAG_TARGETS = [
  { key: 'page-1', srcId: '1002:459', originalIndex: 0, role: 'prev', label: null, state: 'disabled', iconId: '1048:810', iconName: 'Icon / Chevron Left', iconVisible: true },
  { key: 'page-2', srcId: '1002:462', originalIndex: 1, role: 'page', label: '1', state: 'current', iconId: null, iconName: null, iconVisible: false },
  { key: 'page-3', srcId: '1002:464', originalIndex: 2, role: 'page', label: '2', state: 'default', iconId: null, iconName: null, iconVisible: false },
  { key: 'page-4', srcId: '1002:466', originalIndex: 3, role: 'next', label: null, state: 'default', iconId: '1048:812', iconName: 'Icon / Chevron Right', iconVisible: true }
];
const EXPECT = {
  navItemSize: { w: 232, h: 32 }, pagItemSize: { w: 32, h: 32 },
  navTopBefore: '256×142', navTopAfter: '256×134',
  navBottomBefore: '232×102', navBottomAfter: '232×98',
  pagBefore: '124×28', pagAfter: '140×32', pagGap: 4,
  footerWidth: 976
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


/* ========================================================================== *
 * 22b 검증 본문 — 읽기만 한다
 * ========================================================================== */
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

/* ---------- Pagination ---------- */
const pagRows = [];
for (const t of PAG_TARGETS) {
  const { old, inst, via } = await newFor(t, PAG_SET_ID);
  const row = { key: t.key, srcId: t.srcId, role: t.role, newInstanceId: inst ? inst.id : null, foundVia: via, checks: {}, detail: {} };
  const mc = inst ? await mainCompOf(inst) : null;
  const label = inst ? collectDeep(inst, x => x.type === 'TEXT', 6)[0] : null;
  const icon = inst ? await iconOf(inst, PAG_ICON_PROP) : { found: false };
  row.detail = { variant: mc ? mc.name : null, label: label ? label.characters : null, labelVisible: label ? label.visible : null,
    icon, size: inst ? geo(inst).size : null, oldVisible: old ? old.visible : null };
  row.checks.isPaginationItem = !!mc && !!mc.parent && mc.parent.id === PAG_SET_ID;
  row.checks.variantCorrect = !!mc && mc.id === PAG_VARIANTS[t.state];
  row.checks.labelCorrect = t.role === 'page'
    ? (!!label && trim(label.characters) === t.label && label.visible !== false)
    : (!label || label.visible === false);
  row.checks.iconCorrect = t.iconId ? (icon.found && icon.id === t.iconId && icon.visible === true)
                                    : (icon.found && icon.visible === false);
  row.checks.size32x32 = !!inst && near(inst.width, 32) && near(inst.height, 32);
  row.checks.parentCorrect = !!inst && !!inst.parent && inst.parent.id === PAG_PARENT;
  row.checks.oldHidden = !!old && old.visible === false;
  row.checks.rightBeforeOld = !!inst && !!old && !!old.parent && kids(old.parent).indexOf(inst) === kids(old.parent).indexOf(old) - 1;
  row.failed = Object.keys(row.checks).filter(k => !row.checks[k]);
  if (row.failed.length) errors.push(t.key + ' 실패: ' + row.failed.join(', '));
  pagRows.push(row);
}
const pagNow = await figma.getNodeByIdAsync(PAG_PARENT);
const pagVisible = kids(pagNow).filter(c => c.visible !== false);
const pagOrderIds = pagVisible.map(c => c.id);
const pagExpectedOrder = pagRows.map(r => r.newInstanceId);
const pagInstances = [];
for (const c of kids(pagNow)) if ((await mainSetIdOf(c)) === PAG_SET_ID) pagInstances.push(c.id);

/* ---------- Footer 가로 확인 (현재 실제 좌표) ---------- */
const footer = await figma.getNodeByIdAsync(FOOTER_ID);
const footerCheck = { found: !!footer };
if (footer && pagNow) {
  const px0 = r2(pagNow.x), px1 = r2(pagNow.x + pagNow.width), py0 = r2(pagNow.y), py1 = r2(pagNow.y + pagNow.height);
  footerCheck.pagination = { x: px0, right: px1, width: r2(pagNow.width) };
  footerCheck.footerWidth = r2(footer.width);
  footerCheck.overlaps = kids(footer).filter(c => c.id !== PAG_PARENT && c.visible !== false).filter(c => {
    const vy = !(r2(c.y + c.height) <= py0 || py1 <= r2(c.y));
    const hx = r2(c.x) < px1 - 0.5 && px0 < r2(c.x + c.width) - 0.5;
    return vy && hx;
  }).map(c => ({ id: c.id, name: c.name, range: r2(c.x) + '~' + r2(c.x + c.width) }));
  footerCheck.horizontalOverlap = footerCheck.overlaps.length > 0;
  footerCheck.horizontalOverflow = px0 < -0.5 || px1 > footerCheck.footerWidth + 0.5 || footerCheck.footerWidth > EXPECT.footerWidth + 0.5;
}

/* 떠도는 인스턴스 */
const strayOnPage = [];
for (const c of kids(figma.currentPage)) {
  const sid = await mainSetIdOf(c);
  if (sid === NAV_SET_ID || sid === PAG_SET_ID) strayOnPage.push({ id: c.id, name: c.name });
}

const every = (rows, k) => rows.length > 0 && rows.every(r => r.checks[k] === true);
const activeRows = navRows.filter(r => r.checks.isNavItem && r.detail.variant && /active/i.test(r.detail.variant) && !/inactive/i.test(r.detail.variant));
const successCriteria = {
  baselineReadable: !!baseline,
  all6AreNavItems: every(navRows, 'isNavItem') && navRows.length === 6,
  exactlyOneActive: activeRows.length === 1,
  activeIsApplications: activeRows.length === 1 && activeRows[0].srcId === '1002:512',
  otherFiveInactive: navRows.filter(r => r.checks.variantCorrect && r.srcId !== '1002:512').length === 5,
  allNavVariantsCorrect: every(navRows, 'variantCorrect'),
  allNavLabelsCorrect: every(navRows, 'labelCorrect'),
  allNavIconsCorrect: every(navRows, 'iconCorrect'),
  allNavIconsVisible: every(navRows, 'iconVisible'),
  allNav232x32: every(navRows, 'size232x32'),
  allNavSizingFill: every(navRows, 'sizingFill'),
  allNavParentsCorrect: every(navRows, 'parentCorrect'),
  allOldNavHidden: every(navRows, 'oldHidden'),
  allNavOrderKept: every(navRows, 'rightBeforeOld'),
  navTopOrder: JSON.stringify(topOrder) === JSON.stringify(['NavItem 지원 내역', 'NavItem 통계', 'NavItem 캘린더', 'NavItem 메모']),
  navBottomOrder: !!bottomOrder && bottomOrder.length === 3 && bottomOrder[0].indexOf('(대상 아님)') === 0 &&
    bottomOrder[1] === 'NavItem 설정' && bottomOrder[2] === 'NavItem 도움말',
  nonTargetChildUntouched: nonTargetCheck.length > 0 && nonTargetCheck.every(x => x.present && x.visibleSame && x.indexSame && x.sizeSame && x.positionSame && x.notReplaced),
  navTopSize: !!topNow && geo(topNow).size === EXPECT.navTopAfter,
  navBottomSize: !!bottomNow && geo(bottomNow).size === EXPECT.navBottomAfter,
  noDuplicateNavInstances: navInstancesInParents.length === 6,

  all4ArePaginationItems: every(pagRows, 'isPaginationItem') && pagRows.length === 4,
  allPaginationVariantsCorrect: every(pagRows, 'variantCorrect'),
  allPaginationLabelsCorrect: every(pagRows, 'labelCorrect'),
  allPaginationIconsCorrect: every(pagRows, 'iconCorrect'),
  allPagination32x32: every(pagRows, 'size32x32'),
  allPaginationParentsCorrect: every(pagRows, 'parentCorrect'),
  allOldPaginationHidden: every(pagRows, 'oldHidden'),
  paginationOrder: JSON.stringify(pagOrderIds) === JSON.stringify(pagExpectedOrder) && pagVisible.length === 4,
  paginationGap4: !!pagNow && near(safeGet(pagNow, 'itemSpacing'), EXPECT.pagGap),
  paginationSize: !!pagNow && geo(pagNow).size === EXPECT.pagAfter,
  noDuplicatePaginationInstances: pagInstances.length === 4,

  footerNoHorizontalOverlap: footerCheck.horizontalOverlap === false,
  footerNoHorizontalOverflow: footerCheck.horizontalOverflow === false,
  noStrayInstancesOnPage: strayOnPage.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (baselineError) notes.push(baselineError);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  successCriteria, successCriteriaMet, failedCriteria,
  nav: navRows, navVisibleOrder: { [NAV_TOP_PARENT]: topOrder, [NAV_BOTTOM_PARENT]: bottomOrder },
  nonTargetChildCheck: nonTargetCheck,
  parents: { [NAV_TOP_PARENT]: topNow ? geo(topNow).size : null, [NAV_BOTTOM_PARENT]: bottomNow ? geo(bottomNow).size : null,
    [PAG_PARENT]: pagNow ? geo(pagNow).size : null },
  pagination: pagRows, footer: footerCheck, strayOnPage,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet ? 'Phase F CLOSED — Nav 6개와 Pagination 4개가 컴포넌트 인스턴스로 교체됐습니다.'
                              : '아직 닫을 수 없습니다. failedCriteria 를 확인해주세요.'
});
