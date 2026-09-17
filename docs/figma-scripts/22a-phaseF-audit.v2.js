/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 22a
 * Phase F AUDIT v2 · Sidebar Nav + Pagination Item 4개 (읽기 전용)
 *
 * v1 에서 바뀐 것
 *   - "Nav 는 1002:511 아래 6개" 라는 가정을 버렸다. 실제로는 4개였다.
 *   - 설정 / 도움말 을 사이드바 범위(1002:493, 필요하면 1002:2 아래 사이드바 조상) 안에서만 찾는다.
 *   - 찾은 결과로 경우 A(4+2) / B(4개뿐) 를 정하고, 대상 수를 그에 맞춘다.
 *   - 사람이 승인한 Nav 4개 · Pagination 4개 매핑을 기준값으로 두고, 파일에서 다시 읽어 일치하는지 대조한다.
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * setPluginData / .characters= / .fills= / .visible= / .layoutSizing= 를
 * 한 줄도 포함하지 않는다.
 *
 * Phase E 에서 배운 것을 그대로 적용한다.
 *   - 화면 전체를 훑어서 후보를 모으지 않는다. 부모의 직계 자식만 대상으로 본다.
 *   - active / current / disabled 는 이름이 아니라 실제 칠·글자색·투명도로 판정하고,
 *     판정 근거를 카드마다 함께 출력한다.
 *   - 판정이 애매하면 추측으로 채우지 않고 unresolved 로 둔다.
 * ========================================================================== */

const SCRIPT_VERSION = '22a-v2-phaseF-audit';

const NAV_PARENT_ID = '1002:511';
const SIDEBAR_CONTAINER_ID = '1002:493';   // 1002:511 의 부모. 설정/도움말은 먼저 여기서 찾는다
const MAIN_SCREEN_ID = '1002:2';           // 넓히더라도 이 화면의 사이드바 조상까지만

/* 설정/도움말 라벨 — 글자 전체가 일치할 때만 (공백은 무시) */
const EXTRA_LABEL_RE = /^(설정|도움말|도움|settings?|help)$/i;
const EXTRA_PARTIAL_RE = /설정|도움|setting|help/i;

/* 사람이 승인한 매핑 — 파일에서 다시 읽어 일치하는지 대조한다 */
const HUMAN_NAV_APPROVED = {
  '1002:512': { label: '지원 내역', state: 'active', icon: 'applications' },
  '1002:517': { label: '통계', state: 'inactive', icon: 'statistics' },
  '1002:522': { label: '캘린더', state: 'inactive', icon: 'calendar' },
  '1002:527': { label: '메모', state: 'inactive', icon: 'memo' }
};
const HUMAN_PAG_APPROVED = {
  '1002:459': { role: 'prev', state: 'disabled', icon: 'chevronLeft', iconVisible: true },
  '1002:462': { role: 'page', label: '1', state: 'current', icon: null, iconVisible: false },
  '1002:464': { role: 'page', label: '2', state: 'default', icon: null, iconVisible: false },
  '1002:466': { role: 'next', state: 'default', icon: 'chevronRight', iconVisible: true }
};
const APPROVED_PAG_PARENT = { before: '124×28', after: '140×32', gap: 4 };
const PAGINATION_PARENT_ID = '1002:458';

const NAV_SET_ID = '1042:36';
const NAV_VARIANT_IDS = { active: '1042:30', inactive: '1042:33' };
const NAV_ICON_PROP = 'icon#1056:16';

const PAG_SET_ID = '1042:46';
const PAG_VARIANT_IDS = { default: '1042:37', current: '1042:40', disabled: '1042:43' };
const PAG_ICON_PROP = 'icon#1056:19';

/* 사용자가 알려준 아이콘 id — 파일에서 실제 이름이 맞는지 확인한 뒤에만 쓴다 */
const ICON_IDS = {
  applications: '1048:798', statistics: '1048:800', calendar: '1048:802',
  memo: '1048:804', settings: '1048:806', help: '1048:808',
  chevronLeft: '1048:810', chevronRight: '1048:812'
};

/* 라벨 → 아이콘 의미. 라벨 텍스트만으로 정하지 않고, 기존 아이콘 이름도 함께 대조한다. */
const NAV_MEANING = [
  { key: 'applications', label: /지원|내역|현황|대시보드|홈|목록|application|dashboard|home/i,
    icon: /application|지원|list|home|dashboard|briefcase|folder/i },
  { key: 'statistics', label: /통계|분석|리포트|statistic|analytic|report/i,
    icon: /statistic|chart|graph|bar|analytic/i },
  { key: 'calendar', label: /캘린더|일정|달력|calendar|schedule/i,
    icon: /calendar|date|schedule/i },
  { key: 'memo', label: /메모|노트|기록|memo|note/i,
    icon: /memo|note|pencil|edit|file/i },
  { key: 'settings', label: /설정|환경|setting|preference/i,
    icon: /setting|gear|cog/i },
  { key: 'help', label: /도움|문의|가이드|faq|help|support/i,
    icon: /help|question|info|support/i }
];
const PREV_RE = /이전|prev|previous|back|left/i;
const NEXT_RE = /다음|next|forward|right/i;
const DISABLED_VAR_RE = /disabled|muted|tertiary|placeholder|inactive/i;

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
function kids(n) { return Array.isArray(n.children) ? n.children : null; }
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
async function mainSetIdOf(inst) {
  const mc = await mainCompOf(inst);
  return mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null;
}
function hexOf(paint) {
  if (!paint || paint.type !== 'SOLID' || !paint.color) return null;
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return ('#' + h(paint.color.r) + h(paint.color.g) + h(paint.color.b)).toUpperCase();
}
async function paintInfo(node) {
  const fills = safeGet(node, 'fills');
  if (!Array.isArray(fills)) return { visible: false, hex: null, variable: null, opacity: null };
  for (const f of fills) {
    if (f.visible === false) continue;
    if (typeof f.opacity === 'number' && f.opacity === 0) continue;
    let variable = null;
    try {
      const bound = f.boundVariables && f.boundVariables.color;
      if (bound && bound.id) {
        const v = await figma.variables.getVariableByIdAsync(bound.id);
        variable = v ? v.name : bound.id;
      }
    } catch (e) { /* 변수 못 읽어도 색은 남긴다 */ }
    return { visible: true, hex: hexOf(f), variable, opacity: typeof f.opacity === 'number' ? r2(f.opacity) : 1 };
  }
  return { visible: false, hex: null, variable: null, opacity: null };
}
function sig(p) { return p && p.visible ? (p.variable || p.hex) : 'none'; }
function fontStyleOf(t) {
  const f = safeGet(t, 'fontName');
  return f && f.style ? f.style : (f === figma.mixed ? 'mixed' : null);
}
function geometry(n) {
  return { x: r2(n.x), y: r2(n.y), width: r2(n.width), height: r2(n.height),
    size: r2(n.width) + '×' + r2(n.height) };
}
function layoutOf(n) {
  return {
    layoutMode: safeGet(n, 'layoutMode'),
    layoutWrap: safeGet(n, 'layoutWrap'),
    padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
      .map(k => r2(safeGet(n, k) || 0)).join('/'),
    paddingLeft: r2(safeGet(n, 'paddingLeft') || 0), paddingRight: r2(safeGet(n, 'paddingRight') || 0),
    paddingTop: r2(safeGet(n, 'paddingTop') || 0), paddingBottom: r2(safeGet(n, 'paddingBottom') || 0),
    itemSpacing: r2(safeGet(n, 'itemSpacing') || 0),
    primaryAxisAlignItems: safeGet(n, 'primaryAxisAlignItems'),
    counterAxisAlignItems: safeGet(n, 'counterAxisAlignItems'),
    primaryAxisSizingMode: safeGet(n, 'primaryAxisSizingMode'),
    counterAxisSizingMode: safeGet(n, 'counterAxisSizingMode'),
    layoutSizingHorizontal: safeGet(n, 'layoutSizingHorizontal'),
    layoutSizingVertical: safeGet(n, 'layoutSizingVertical'),
    clipsContent: safeGet(n, 'clipsContent'),
    cornerRadius: safeGet(n, 'cornerRadius') === figma.mixed ? 'mixed' : r2(safeGet(n, 'cornerRadius'))
  };
}
/* 자식 구조를 짧게 요약한다 — 사람이 눈으로 확인할 수 있게 */
async function treeOf(n, depth) {
  const rec = { id: n.id, name: n.name, type: n.type, size: r2(n.width) + '×' + r2(n.height),
    visible: n.visible };
  if (n.type === 'TEXT') rec.text = n.characters;
  if (n.type === 'INSTANCE') { const mc = await mainCompOf(n); rec.mainComponent = mc ? mc.name : null; }
  const cs = kids(n);
  if (cs && depth > 0) { rec.children = []; for (const c of cs) rec.children.push(await treeOf(c, depth - 1)); }
  return rec;
}
/* 아이콘처럼 보이는 것: 글자가 없고, 작고, 도형이나 아이콘 인스턴스인 것 — 가장 바깥 것 하나 */
async function findIcon(root) {
  const cands = collectDeep(root, x =>
    x.type !== 'TEXT' && x.width <= 28 && x.height <= 28 && x.width >= 8 &&
    (x.type === 'INSTANCE' || x.type === 'VECTOR' || x.type === 'BOOLEAN_OPERATION' ||
     ((x.type === 'FRAME' || x.type === 'GROUP') &&
       collectDeep(x, y => y.type === 'VECTOR' || y.type === 'BOOLEAN_OPERATION', 4).length > 0 &&
       collectDeep(x, y => y.type === 'TEXT', 4).length === 0)), 6);
  /* 다른 후보 안에 들어 있는 것은 뺀다 — 가장 바깥 아이콘만 */
  const outer = cands.filter(c => !cands.some(o => o.id !== c.id && isInside(c, o)));
  if (!outer.length) return null;
  const n = outer[0];
  const mc = n.type === 'INSTANCE' ? await mainCompOf(n) : null;
  const stroke = collectDeep(n, y => y.type === 'VECTOR', 4)[0] || (n.type === 'VECTOR' ? n : null);
  let color = null;
  if (stroke) {
    const strokes = safeGet(stroke, 'strokes');
    const s = Array.isArray(strokes) ? strokes.filter(p => p.visible !== false)[0] : null;
    color = s ? hexOf(s) : (await paintInfo(stroke)).hex;
  }
  return { id: n.id, name: n.name, type: n.type, size: r2(n.width) + '×' + r2(n.height),
    visible: n.visible, x: r2(n.x), y: r2(n.y),
    mainComponent: mc ? mc.name : null, mainComponentId: mc ? mc.id : null,
    vectorNames: collectDeep(n, y => y.type === 'VECTOR', 4).map(v => v.name).slice(0, 4),
    candidateCount: outer.length, color };
}
function isInside(node, ancestor) {
  let cur = node.parent;
  while (cur) { if (cur.id === ancestor.id) return true; cur = cur.parent; }
  return false;
}

/* ---------- 아이콘 라이브러리 ---------- */
const iconLibrary = {};
for (const key of Object.keys(ICON_IDS)) {
  const n = await figma.getNodeByIdAsync(ICON_IDS[key]);
  iconLibrary[key] = { id: ICON_IDS[key], found: !!n, name: n ? n.name : null,
    type: n ? n.type : null, isComponent: !!n && n.type === 'COMPONENT' };
  if (!iconLibrary[key].isComponent) errors.push('아이콘 ' + key + ' (' + ICON_IDS[key] + ') 를 컴포넌트로 읽지 못했다');
}

/* ---------- 컴포넌트 세트 ---------- */
async function readSet(setId, variantIds, iconPropKey) {
  const set = await figma.getNodeByIdAsync(setId);
  const rec = { setId, found: !!set && set.type === 'COMPONENT_SET', name: set ? set.name : null,
    variants: {}, iconProperty: null, issues: [] };
  if (!rec.found) { rec.issues.push(setId + ' 를 컴포넌트 세트로 읽지 못했다'); return rec; }
  let defs = null;
  try { defs = set.componentPropertyDefinitions; } catch (e) { rec.issues.push('속성 정의를 읽지 못했다'); }
  rec.propertyKeys = defs ? Object.keys(defs) : [];
  if (defs && defs[iconPropKey]) {
    const d = defs[iconPropKey];
    const def = d.defaultValue ? await figma.getNodeByIdAsync(d.defaultValue) : null;
    rec.iconProperty = { key: iconPropKey, type: d.type, defaultValue: d.defaultValue,
      defaultName: def ? def.name : null,
      preferredValuesCount: Array.isArray(d.preferredValues) ? d.preferredValues.length : 0,
      isInstanceSwap: d.type === 'INSTANCE_SWAP' };
  } else rec.issues.push('아이콘 속성 ' + iconPropKey + ' 가 없다');

  for (const state of Object.keys(variantIds)) {
    const v = await figma.getNodeByIdAsync(variantIds[state]);
    if (!v || v.type !== 'COMPONENT' || !v.parent || v.parent.id !== setId) {
      rec.issues.push(state + ' variant ' + variantIds[state] + ' 가 세트 안의 컴포넌트가 아니다');
      rec.variants[state] = { id: variantIds[state], found: false };
      continue;
    }
    const texts = collectDeep(v, x => x.type === 'TEXT', 6);
    const icon = await findIcon(v);
    let iconRef = null;
    if (icon) {
      const iconNode = await figma.getNodeByIdAsync(icon.id);
      try { iconRef = iconNode.componentPropertyReferences || null; } catch (e) { /* 무시 */ }
    }
    rec.variants[state] = { id: v.id, found: true, name: v.name, geometry: geometry(v), layout: layoutOf(v),
      fill: await paintInfo(v),
      textNodes: texts.map(t => ({ id: t.id, name: t.name, characters: t.characters,
        fontStyle: fontStyleOf(t) })),
      icon, iconBoundToProperty: !!(iconRef && iconRef.mainComponent === iconPropKey),
      iconPropertyReference: iconRef ? iconRef.mainComponent || null : null };
  }
  return rec;
}
const navSet = await readSet(NAV_SET_ID, NAV_VARIANT_IDS, NAV_ICON_PROP);
const pagSet = await readSet(PAG_SET_ID, PAG_VARIANT_IDS, PAG_ICON_PROP);

/* ---------- 부모 ---------- */
async function readParent(id, label) {
  const p = await figma.getNodeByIdAsync(id);
  if (!p) { errors.push(label + ' 부모 ' + id + ' 를 찾지 못했다'); return null; }
  const cs = kids(p) || [];
  return { node: p, id: p.id, name: p.name, type: p.type, geometry: geometry(p), layout: layoutOf(p),
    childCount: cs.length,
    visibleChildCount: cs.filter(c => c.visible !== false).length,
    hiddenChildIds: cs.filter(c => c.visible === false).map(c => c.id),
    absoluteChildIds: cs.filter(c => safeGet(c, 'layoutPositioning') === 'ABSOLUTE').map(c => c.id),
    parentOfParent: p.parent ? { id: p.parent.id, name: p.parent.name,
      layoutMode: safeGet(p.parent, 'layoutMode'), geometry: geometry(p.parent) } : null };
}
const navParent = await readParent(NAV_PARENT_ID, 'Sidebar Nav');
const pagParent = await readParent(PAGINATION_PARENT_ID, 'Pagination');

/* 숨긴 자식이 흐름에서 빠지는가 — Auto Layout(VERTICAL/HORIZONTAL, wrap 없음) 일 때만 Phase A~D 방식을 쓸 수 있다 */
function hiddenStrategyOf(parent) {
  if (!parent) return { applicable: false, reason: '부모를 읽지 못했다' };
  const lm = parent.layout.layoutMode;
  const autoLayout = lm === 'VERTICAL' || lm === 'HORIZONTAL';
  const wrap = parent.layout.layoutWrap === 'WRAP';
  return {
    layoutMode: lm, layoutWrap: parent.layout.layoutWrap,
    applicable: autoLayout && !wrap,
    reason: !autoLayout ? ('Auto Layout 이 아니다 (' + lm + ') — GRID 나 NONE 이면 Phase E 처럼 따로 실험해야 한다')
      : (wrap ? 'wrap 이 켜져 있다 — 숨김이 줄바꿈에 영향을 주는지 따로 봐야 한다'
              : 'Auto Layout 에서는 숨긴 자식이 흐름에서 빠진다 (Phase A~D 에서 실측으로 확인된 동작)'),
    evidenceFromPhases: 'Phase A~D 의 Auto Layout 부모에서 old visible=false 후 형제 위치가 유지됐다',
    currentHiddenChildren: parent.hiddenChildIds.length
  };
}

/* ---------- Nav — 개수를 미리 정하지 않는다 ----------
 * v1 은 "1002:511 아래 6개" 를 전제했고 실제로는 4개였다.
 * v2 는 1002:511 의 4개를 기준 그룹으로 두고, 설정 / 도움말 을 사이드바 범위 안에서만 찾는다.
 * 찾은 위치에 따라 대상 수가 4개인지 6개인지 결정한다. */

/* 기준 그룹: 1002:511 의 보이는 직계 자식 */
const navUnexpectedInstances = [];
const baseNavNodes = [];
if (navParent) {
  for (const c of kids(navParent.node) || []) {
    if (c.type === 'INSTANCE' && (await mainSetIdOf(c)) === NAV_SET_ID) { navUnexpectedInstances.push(c.id); continue; }
    if (c.visible === false) continue;
    baseNavNodes.push(c);
  }
}

/* 사이드바 범위 — 1002:493 부터. 못 찾으면 1002:2 바로 아래의 사이드바 조상까지만 넓힌다. 페이지 전체는 보지 않는다. */
function ancestorsOf(node) {
  const list = [];
  let cur = node ? node.parent : null;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { list.push(cur); cur = cur.parent; }
  return list;
}
const sidebarContainer = await figma.getNodeByIdAsync(SIDEBAR_CONTAINER_ID);
const mainScreen = await figma.getNodeByIdAsync(MAIN_SCREEN_ID);
const navAncestors = navParent ? ancestorsOf(navParent.node) : [];
/* 1002:2 의 직계 자식이면서 1002:511 의 조상인 노드 = 사이드바 루트 */
const sidebarRoot = mainScreen ? (navAncestors.filter(a => a.parent && a.parent.id === MAIN_SCREEN_ID)[0] || null) : null;

function findExtraLabels(scope) {
  if (!scope) return [];
  return collectDeep(scope, x => x.type === 'TEXT' && EXTRA_LABEL_RE.test(trim(x.characters) || ''), 12);
}
const searchLog = [];
let searchScope = sidebarContainer;
let extraTexts = findExtraLabels(sidebarContainer);
searchLog.push({ scope: SIDEBAR_CONTAINER_ID, scopeName: sidebarContainer ? sidebarContainer.name : null,
  found: extraTexts.map(t => ({ id: t.id, text: t.characters })) });
if (!extraTexts.length && sidebarRoot && (!sidebarContainer || sidebarRoot.id !== sidebarContainer.id)) {
  searchScope = sidebarRoot;
  extraTexts = findExtraLabels(sidebarRoot);
  searchLog.push({ scope: sidebarRoot.id, scopeName: sidebarRoot.name, widenedBecause: SIDEBAR_CONTAINER_ID + ' 안에서 못 찾았다',
    found: extraTexts.map(t => ({ id: t.id, text: t.characters })) });
}
/* 부분 일치 후보도 기록만 한다 (예: '도움말 센터') — 대상으로 쓰지는 않는다 */
const partialCandidates = searchScope ? collectDeep(searchScope, x => x.type === 'TEXT' &&
  EXTRA_PARTIAL_RE.test(x.characters || '') && !EXTRA_LABEL_RE.test(trim(x.characters) || ''), 12)
  .map(t => ({ id: t.id, text: t.characters, parentId: t.parent ? t.parent.id : null })) : [];

/* 라벨 TEXT 에서 위로 올라가며 "아이콘 + 글자" 를 함께 가진 가장 가까운 조상 = 메뉴 항목 */
async function itemOfLabel(textNode, stopAt) {
  let cur = textNode.parent;
  while (cur && (!stopAt || cur.id !== stopAt.id)) {
    const icon = await findIcon(cur);
    const texts = collectDeep(cur, x => x.type === 'TEXT', 6);
    if (icon && texts.length >= 1) return cur;
    cur = cur.parent;
  }
  return null;
}
const baseShape = baseNavNodes.length ? {
  width: r2(baseNavNodes[0].width), height: r2(baseNavNodes[0].height),
  childTypes: (kids(baseNavNodes[0]) || []).map(c => c.type).join(','),
  layoutMode: safeGet(baseNavNodes[0], 'layoutMode')
} : null;

const extraItems = [];
for (const t of extraTexts) {
  const item = await itemOfLabel(t, searchScope);
  const rec = { labelTextId: t.id, label: trim(t.characters), itemFound: !!item };
  /* 항목을 못 찾아도 글자 자체의 위치는 남긴다 */
  rec.labelGeometry = geometry(t);
  rec.labelParent = t.parent ? { id: t.parent.id, name: t.parent.name, type: t.parent.type,
    layoutMode: safeGet(t.parent, 'layoutMode') } : null;
  rec.labelAncestors = ancestorsOf(t).slice(0, 5).map(a => a.id + ' ' + a.name);
  if (!item) rec.notReplaceableBecause = ['라벨 위로 아이콘+글자를 함께 가진 항목이 없다 — 메뉴 항목이 아니라 글자만 있다'];
  if (item) {
    const p = item.parent;
    const icon = await findIcon(item);
    const texts = collectDeep(item, x => x.type === 'TEXT', 6);
    rec.nodeId = item.id; rec.nodeName = item.name; rec.type = item.type;
    rec.isVisible = item.visible;
    rec.geometry = geometry(item);
    rec.directParent = p ? { id: p.id, name: p.name, layoutMode: safeGet(p, 'layoutMode'),
      layoutWrap: safeGet(p, 'layoutWrap'), itemSpacing: r2(safeGet(p, 'itemSpacing') || 0),
      padding: layoutOf(p).padding } : null;
    rec.originalIndex = p && Array.isArray(p.children) ? p.children.indexOf(item) : null;
    rec.sameParentAsBaseNav = !!p && !!navParent && p.id === navParent.id;
    rec.textNodeCount = texts.length;
    rec.icon = icon;
    rec.background = await paintInfo(item);
    rec.textColor = await paintInfo(t);
    rec.labelFontStyle = fontStyleOf(t);
    rec.structure = await treeOf(item, 3);
    rec.shapeLikeBaseNav = !!baseShape &&
      near(rec.geometry.width, baseShape.width, 2) && near(rec.geometry.height, baseShape.height, 2) &&
      (kids(item) || []).map(c => c.type).join(',') === baseShape.childTypes;
    rec.replaceableAsNavItem = !!icon && texts.length === 1 && item.visible !== false &&
      !!rec.directParent && (rec.directParent.layoutMode === 'VERTICAL' || rec.directParent.layoutMode === 'HORIZONTAL');
    const reasons = [];
    if (!icon) reasons.push('아이콘이 없다');
    if (texts.length !== 1) reasons.push('TEXT 가 ' + texts.length + '개');
    if (item.visible === false) reasons.push('숨겨져 있다');
    if (rec.directParent && ['VERTICAL', 'HORIZONTAL'].indexOf(rec.directParent.layoutMode) < 0) {
      reasons.push('부모가 Auto Layout 이 아니다 (' + rec.directParent.layoutMode + ')');
    }
    rec.notReplaceableBecause = reasons;
  }
  extraItems.push(rec);
}
/* 같은 항목을 두 번 잡지 않게 */
const seenItem = {};
const extraUnique = extraItems.filter(e => {
  if (!e.nodeId) return true;
  if (seenItem[e.nodeId]) return false;
  seenItem[e.nodeId] = true; return true;
});

/* 경우 판정 */
const foundSettings = extraUnique.filter(e => /설정|setting/i.test(e.label));
const foundHelp = extraUnique.filter(e => /도움|help/i.test(e.label));
let navCase, navCaseReason;
if (!foundSettings.length && !foundHelp.length) {
  navCase = 'B'; navCaseReason = '사이드바 범위 안에 설정/도움말 라벨이 없다 — 화면에는 4개만 있다';
} else if (foundSettings.length === 1 && foundHelp.length === 1 &&
           extraUnique.every(e => e.itemFound && e.replaceableAsNavItem)) {
  navCase = 'A'; navCaseReason = '설정/도움말이 각각 하나씩, NavItem 으로 바꿀 수 있는 구조로 있다';
} else {
  navCase = null;
  navCaseReason = '설정 ' + foundSettings.length + '개, 도움말 ' + foundHelp.length + '개 — ' +
    (extraUnique.some(e => !e.itemFound || !e.replaceableAsNavItem)
      ? '찾았지만 NavItem 구조가 아닌 항목이 있다' : '개수가 맞지 않는다') + '. 사람이 정해야 한다';
}
const navTargets = baseNavNodes.slice();
if (navCase === 'A') for (const e of extraUnique) navTargets.push(await figma.getNodeByIdAsync(e.nodeId));
const expectedNavCount = navCase === 'A' ? baseNavNodes.length + 2 : (navCase === 'B' ? baseNavNodes.length : null);

/* 부모 그룹 */
const navGroups = {};
for (const n of navTargets) {
  const p = n.parent;
  if (!navGroups[p.id]) navGroups[p.id] = { parentId: p.id, parentName: p.name, memberIds: [] };
  navGroups[p.id].memberIds.push(n.id);
}
for (const gid of Object.keys(navGroups)) {
  const g = navGroups[gid];
  g.parent = gid === NAV_PARENT_ID ? navParent : await readParent(gid, 'Nav 그룹');
  g.hiddenStrategy = hiddenStrategyOf(g.parent);
}

const navRows = [];
for (let i = 0; i < navTargets.length; i++) {
  const n = navTargets[i];
  const texts = collectDeep(n, x => x.type === 'TEXT', 6);
  const labelNode = texts[0] || null;
  const icon = await findIcon(n);
  let bg = await paintInfo(n);
  let bgSource = 'self';
  if (!bg.visible) {
    for (const f of collectDeep(n, x => x.type === 'FRAME' || x.type === 'RECTANGLE', 2)) {
      const p = await paintInfo(f);
      if (p.visible && f.width >= n.width * 0.8) { bg = p; bgSource = f.id; break; }
    }
  }
  const textPaint = labelNode ? await paintInfo(labelNode) : null;
  navRows.push({
    key: 'nav-' + (i + 1), srcId: n.id, srcName: n.name, type: n.type,
    group: n.parent.id, groupName: n.parent.name,
    originalIndex: (kids(n.parent) || []).indexOf(n),
    visible: n.visible, geometry: geometry(n), layout: layoutOf(n),
    label: labelNode ? trim(labelNode.characters) : null,
    labelNodeId: labelNode ? labelNode.id : null,
    textNodeCount: texts.length,
    labelFontStyle: labelNode ? fontStyleOf(labelNode) : null,
    background: bg, backgroundSource: bgSource,
    textColor: textPaint,
    opacity: r2(safeGet(n, 'opacity')),
    oldIcon: icon,
    structure: await treeOf(n, 3)
  });
}

/* active 판정 — 전체 대상에서 배경 칠(→ 글자색 → 굵기)이 혼자 다른 항목 */
function uniqueOutlier(rows, keyFn) {
  const counts = {};
  for (const r of rows) { const k = keyFn(r); counts[k] = (counts[k] || 0) + 1; }
  const singles = rows.filter(r => counts[keyFn(r)] === 1);
  return { singles, counts, distinct: Object.keys(counts).length };
}
const activeTrials = [
  { basis: '배경 칠', fn: r => sig(r.background) },
  { basis: '글자색', fn: r => sig(r.textColor) },
  { basis: '글자 굵기', fn: r => String(r.labelFontStyle) }
];
let activeBasis = null, activeRow = null;
const activeEvidence = [];
for (const t of activeTrials) {
  const o = uniqueOutlier(navRows, t.fn);
  activeEvidence.push({ basis: t.basis, distinctValues: o.distinct, counts: o.counts,
    singleOutIds: o.singles.map(s => s.srcId) });
  if (!activeRow && navRows.length > 1 && o.distinct === 2 && o.singles.length === 1) {
    activeRow = o.singles[0]; activeBasis = t.basis;
  }
}

/* 아이콘 매핑 — 사람이 승인한 4개는 승인값, 나머지는 라벨·기존 아이콘 대조 */
for (const r of navRows) {
  r.oldState = activeRow ? (r.srcId === activeRow.srcId ? 'active' : 'inactive') : null;
  r.stateSource = activeRow ? (activeBasis + ' 가 혼자 다른 항목 = active') : '판정 불가';

  const iconText = r.oldIcon ? [r.oldIcon.name, r.oldIcon.mainComponent].concat(r.oldIcon.vectorNames || []).join(' ') : '';
  const byLabel = NAV_MEANING.filter(m => r.label && m.label.test(r.label)).map(m => m.key);
  const byIcon = NAV_MEANING.filter(m => iconText && m.icon.test(iconText)).map(m => m.key);
  let key = null, source = null, confidence = 'low';
  if (byLabel.length === 1 && byIcon.length === 1 && byLabel[0] === byIcon[0]) {
    key = byLabel[0]; source = '라벨과 기존 아이콘 이름이 같은 의미'; confidence = 'high';
  } else if (byLabel.length === 1 && byIcon.length === 0) {
    key = byLabel[0]; source = '라벨 (기존 아이콘은 이름으로 의미를 알 수 없다)'; confidence = 'medium';
  } else if (byLabel.length === 0 && byIcon.length === 1) {
    key = byIcon[0]; source = '기존 아이콘 이름 (라벨로는 알 수 없다)'; confidence = 'medium';
  } else if (byLabel.length === 1 && byIcon.length >= 1 && byIcon.indexOf(byLabel[0]) < 0) {
    source = '라벨(' + byLabel[0] + ')과 기존 아이콘(' + byIcon.join('/') + ')이 다른 의미 — 사람이 정해야 한다';
  } else {
    source = '라벨 후보 ' + JSON.stringify(byLabel) + ', 아이콘 후보 ' + JSON.stringify(byIcon) + ' — 하나로 정할 수 없다';
  }
  r.iconMeaningCandidates = { byLabel, byIcon };

  const approved = HUMAN_NAV_APPROVED[r.srcId];
  if (approved) {
    r.humanApproved = approved;
    r.auditAgreesWithApproval = {
      label: r.label === approved.label, state: r.oldState === approved.state, icon: key === approved.icon };
    r.plannedIconKey = approved.icon;
    r.iconMappingSource = '사람이 승인한 매핑 (audit 판정: ' + (key || 'null') + ', ' + confidence + ')';
    r.iconMappingConfidence = 'human-approved';
    if (!r.auditAgreesWithApproval.label || !r.auditAgreesWithApproval.state || !r.auditAgreesWithApproval.icon) {
      notes.push(r.srcId + ' — 파일에서 다시 읽은 값이 승인값과 다르다: ' + JSON.stringify(r.auditAgreesWithApproval) +
        ' (읽은 값: ' + r.label + ' / ' + r.oldState + ' / ' + key + ')');
    }
  } else {
    r.plannedIconKey = key;
    r.iconMappingSource = source;
    r.iconMappingConfidence = confidence;
  }
  r.plannedIcon = r.plannedIconKey ? iconLibrary[r.plannedIconKey].name : null;
  r.plannedIconId = r.plannedIconKey ? iconLibrary[r.plannedIconKey].id : null;
  r.plannedIconVisible = true;
  r.plannedVariant = r.oldState;
  r.plannedVariantId = r.oldState ? NAV_VARIANT_IDS[r.oldState] : null;
}
const iconUse = {};
for (const r of navRows) if (r.plannedIconKey) iconUse[r.plannedIconKey] = (iconUse[r.plannedIconKey] || 0) + 1;
const duplicateNavIcons = Object.keys(iconUse).filter(k => iconUse[k] > 1);
if (duplicateNavIcons.length) notes.push('같은 아이콘이 두 항목 이상에 매핑됐다: ' + duplicateNavIcons.join(', '));

/* 크기 위험 */
const navMaster = navSet.variants.inactive && navSet.variants.inactive.found ? navSet.variants.inactive : null;
for (const r of navRows) {
  const mw = navMaster ? navMaster.geometry.width : null, mh = navMaster ? navMaster.geometry.height : null;
  const rs = [];
  if (mw !== null && !near(r.geometry.width, mw)) rs.push('폭 ' + r.geometry.width + ' → ' + mw + ' (old 가로 sizing: ' + r.layout.layoutSizingHorizontal + ')');
  if (mh !== null && !near(r.geometry.height, mh)) rs.push('높이 ' + r.geometry.height + ' → ' + mh);
  if (r.textNodeCount !== 1) rs.push('TEXT 가 ' + r.textNodeCount + '개');
  if (!r.oldIcon) rs.push('기존 아이콘을 찾지 못했다');
  else if (r.oldIcon.candidateCount > 1) rs.push('아이콘 후보가 ' + r.oldIcon.candidateCount + '개');
  r.expectedNewSize = mw !== null ? (r.layout.layoutSizingHorizontal === 'FILL'
    ? ('FILL (부모 안쪽 폭) × ' + mh) : (mw + '×' + mh)) : null;
  r.layoutRisk = rs;
}

/* ---------- Pagination 4개 ---------- */
const pagTargets = [];
const pagUnexpectedInstances = [];
if (pagParent) {
  for (const c of kids(pagParent.node) || []) {
    if (c.type === 'INSTANCE' && (await mainSetIdOf(c)) === PAG_SET_ID) { pagUnexpectedInstances.push(c.id); continue; }
    if (c.visible === false) continue;
    pagTargets.push(c);
  }
}
const pagRows = [];
for (let i = 0; i < pagTargets.length; i++) {
  const n = pagTargets[i];
  const texts = collectDeep(n, x => x.type === 'TEXT', 6);
  const t = texts[0] || null;
  const icon = await findIcon(n);
  let bg = await paintInfo(n);
  let bgSource = 'self';
  if (!bg.visible) {
    for (const f of collectDeep(n, x => x.type === 'FRAME' || x.type === 'RECTANGLE', 2)) {
      const p = await paintInfo(f);
      if (p.visible && f.width >= n.width * 0.8) { bg = p; bgSource = f.id; break; }
    }
  }
  let iconColorVar = null;
  if (icon) {
    const iconNode = await figma.getNodeByIdAsync(icon.id);
    const vec = collectDeep(iconNode, y => y.type === 'VECTOR', 4)[0] || (iconNode.type === 'VECTOR' ? iconNode : null);
    if (vec) {
      const strokes = safeGet(vec, 'strokes');
      const s = Array.isArray(strokes) ? strokes.filter(p => p.visible !== false)[0] : null;
      try {
        const bound = s && s.boundVariables && s.boundVariables.color;
        if (bound && bound.id) { const v = await figma.variables.getVariableByIdAsync(bound.id); iconColorVar = v ? v.name : bound.id; }
      } catch (e) { /* 무시 */ }
    }
  }
  const label = t ? trim(t.characters) : null;
  pagRows.push({
    key: 'page-' + (i + 1), srcId: n.id, srcName: n.name, type: n.type,
    originalIndex: (kids(pagParent.node) || []).indexOf(n),
    visible: n.visible, geometry: geometry(n), layout: layoutOf(n),
    label, labelNodeId: t ? t.id : null, textNodeCount: texts.length,
    labelFontStyle: t ? fontStyleOf(t) : null,
    isNumeric: !!label && /^\d+$/.test(label),
    hasIcon: !!icon, oldIcon: icon, iconColorVariable: iconColorVar,
    background: bg, backgroundSource: bgSource,
    textColor: t ? await paintInfo(t) : null,
    opacity: r2(safeGet(n, 'opacity')),
    structure: await treeOf(n, 3)
  });
}

/* 역할: 숫자 / 이전 / 다음 */
for (const r of pagRows) {
  if (r.isNumeric) { r.role = 'page'; r.roleSource = '숫자 텍스트'; continue; }
  const text = [r.label, r.srcName, r.oldIcon ? r.oldIcon.name : '', r.oldIcon ? r.oldIcon.mainComponent : '']
    .concat(r.oldIcon ? r.oldIcon.vectorNames : []).join(' ');
  const prev = PREV_RE.test(text), next = NEXT_RE.test(text);
  if (prev && !next) { r.role = 'prev'; r.roleSource = '이름/텍스트에 이전 의미'; }
  else if (next && !prev) { r.role = 'next'; r.roleSource = '이름/텍스트에 다음 의미'; }
  else r.role = null;
}
/* 이름으로 못 정한 비숫자 항목은 위치로 — 맨 앞이 이전, 맨 뒤가 다음 */
const nonNumeric = pagRows.filter(r => !r.isNumeric);
for (const r of nonNumeric) {
  if (r.role) continue;
  if (r === pagRows[0] && !pagRows.some(x => x.role === 'prev')) { r.role = 'prev'; r.roleSource = '위치 (맨 앞)'; }
  else if (r === pagRows[pagRows.length - 1] && !pagRows.some(x => x.role === 'next')) { r.role = 'next'; r.roleSource = '위치 (맨 뒤)'; }
  else r.roleSource = '이전/다음/숫자 어느 쪽인지 정하지 못했다';
}
const structureString = pagRows.map(r => r.role === 'prev' ? '[이전]' : r.role === 'next' ? '[다음]'
  : r.role === 'page' ? '[' + r.label + ']' : '[?]').join(' ');

/* current — 숫자 항목 중 하나 */
const numericRows = pagRows.filter(r => r.isNumeric);
const currentTrials = [
  { basis: '배경 칠이 있는 숫자가 하나뿐', pick: () => { const v = numericRows.filter(r => r.background.visible); return v.length === 1 ? v[0] : null; } },
  { basis: '배경 칠 서명이 혼자 다른 숫자', pick: () => { const o = uniqueOutlier(pagRows, r => sig(r.background)); const s = o.singles.filter(x => x.isNumeric); return s.length === 1 ? s[0] : null; } },
  { basis: '글자색이 혼자 다른 숫자', pick: () => { const o = uniqueOutlier(numericRows, r => sig(r.textColor)); return numericRows.length > 2 && o.singles.length === 1 ? o.singles[0] : null; } },
  { basis: '글자 굵기가 혼자 다른 숫자', pick: () => { const o = uniqueOutlier(numericRows, r => String(r.labelFontStyle)); return numericRows.length > 2 && o.singles.length === 1 ? o.singles[0] : null; } }
];
let currentRow = null, currentBasis = null;
const currentEvidence = [];
for (const t of currentTrials) {
  const picked = t.pick();
  currentEvidence.push({ basis: t.basis, picked: picked ? picked.srcId : null });
  if (!currentRow && picked) { currentRow = picked; currentBasis = t.basis; }
}

/* disabled — 이전/다음에만. 투명도·색 변수·이름 중 하나라도 근거가 있어야 disabled 로 본다. */
for (const r of pagRows) {
  r.disabledEvidence = [];
  if (r.role !== 'prev' && r.role !== 'next') continue;
  if (typeof r.opacity === 'number' && r.opacity < 1) r.disabledEvidence.push('투명도 ' + r.opacity);
  if (/disabled/i.test(r.srcName || '')) r.disabledEvidence.push('이름에 disabled');
  if (r.iconColorVariable && DISABLED_VAR_RE.test(r.iconColorVariable)) r.disabledEvidence.push('아이콘 색 변수 ' + r.iconColorVariable);
  if (r.textColor && r.textColor.variable && DISABLED_VAR_RE.test(r.textColor.variable)) r.disabledEvidence.push('글자색 변수 ' + r.textColor.variable);
}
const prevRow = pagRows.filter(r => r.role === 'prev')[0] || null;
const nextRow = pagRows.filter(r => r.role === 'next')[0] || null;
const prevNextColorDiffer = !!(prevRow && nextRow && prevRow.oldIcon && nextRow.oldIcon &&
  prevRow.oldIcon.color !== nextRow.oldIcon.color);

/* 이전·다음 중 한쪽에 disabled 근거가 있으면 색 차이는 이미 설명된다 */
const colorDifferenceExplained = !!(prevRow && nextRow &&
  (prevRow.disabledEvidence.length > 0 || nextRow.disabledEvidence.length > 0));

for (const r of pagRows) {
  if (r.role === 'page') {
    r.oldState = currentRow ? (r.srcId === currentRow.srcId ? 'current' : 'default') : null;
    r.stateSource = currentRow ? currentBasis : 'current 페이지를 정하지 못했다';
    r.plannedIconKey = null; r.plannedIcon = null; r.plannedIconId = null;
    r.plannedIconVisible = false;
    r.plannedLabel = r.label;
  } else if (r.role === 'prev' || r.role === 'next') {
    if (r.disabledEvidence.length) { r.oldState = 'disabled'; r.stateSource = r.disabledEvidence.join(', '); }
    else if (prevNextColorDiffer && !colorDifferenceExplained) {
      r.oldState = null;
      r.stateSource = '이전/다음 아이콘 색이 서로 다른데 변수·투명도 근거가 없다 — disabled 인지 사람이 정해야 한다 (' +
        (prevRow.oldIcon.color) + ' vs ' + (nextRow.oldIcon.color) + ')';
    } else { r.oldState = 'default'; r.stateSource = 'disabled 근거 없음 (투명도 1, 비활성 색 변수 없음, 이전·다음 색 같음)'; }
    r.plannedIconKey = r.role === 'prev' ? 'chevronLeft' : 'chevronRight';
    r.plannedIcon = iconLibrary[r.plannedIconKey].name;
    r.plannedIconId = iconLibrary[r.plannedIconKey].id;
    r.plannedIconVisible = true;
    r.plannedLabel = null;
  } else {
    r.oldState = null; r.stateSource = '역할을 정하지 못했다';
    r.plannedIconKey = null; r.plannedIcon = null; r.plannedIconVisible = null;
  }
  r.plannedVariant = r.oldState;
  r.plannedVariantId = r.oldState ? PAG_VARIANT_IDS[r.oldState] : null;
  const pm = pagSet.variants.default && pagSet.variants.default.found ? pagSet.variants.default.geometry : null;
  r.expectedNewSize = pm ? pm.size : null;
  r.layoutRisk = [];
  if (pm && (!near(r.geometry.width, pm.width) || !near(r.geometry.height, pm.height))) {
    r.layoutRisk.push('크기 ' + r.geometry.size + ' → ' + pm.size);
  }
  if (r.textNodeCount > 1) r.layoutRisk.push('TEXT 가 ' + r.textNodeCount + '개');
}

/* ---------- Pagination 승인값 대조 ---------- */
const paginationApprovalCheck = Object.keys(HUMAN_PAG_APPROVED).map(id => {
  const a = HUMAN_PAG_APPROVED[id];
  const r = pagRows.filter(x => x.srcId === id)[0] || null;
  if (!r) return { srcId: id, found: false, agrees: false };
  const c = { srcId: id, found: true,
    role: r.role === a.role, state: r.oldState === a.state,
    label: a.label ? r.label === a.label : true,
    icon: a.icon ? r.plannedIconKey === a.icon : r.plannedIconKey === null,
    iconVisible: r.plannedIconVisible === a.iconVisible,
    read: { role: r.role, state: r.oldState, label: r.label, icon: r.plannedIconKey, iconVisible: r.plannedIconVisible } };
  c.agrees = c.role && c.state && c.label && c.icon && c.iconVisible;
  if (!c.agrees) notes.push('Pagination ' + id + ' 가 승인값과 다르다: ' + JSON.stringify(c.read));
  return c;
});

/* ---------- 부모 크기 예측 — 공식이 지금 값을 재현하는지 먼저 본다 ---------- */
function predictParent(parent, rows, newW, newH) {
  if (!parent) return null;
  const L = parent.layout;
  const vertical = L.layoutMode === 'VERTICAL';
  const horizontal = L.layoutMode === 'HORIZONTAL';
  if (!vertical && !horizontal) return { measurable: false, reason: 'Auto Layout 이 아니다: ' + L.layoutMode };
  const vis = (kids(parent.node) || []).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE');
  const spaceBetween = L.primaryAxisAlignItems === 'SPACE_BETWEEN';
  function mainLen(sizes) {
    return r2((vertical ? L.paddingTop + L.paddingBottom : L.paddingLeft + L.paddingRight) +
      sizes.reduce((a, b) => a + b, 0) + (spaceBetween ? 0 : L.itemSpacing * (sizes.length - 1)));
  }
  function crossLen(sizes) {
    return r2((vertical ? L.paddingLeft + L.paddingRight : L.paddingTop + L.paddingBottom) + Math.max.apply(null, sizes));
  }
  const curMain = vis.map(c => vertical ? c.height : c.width);
  const curCross = vis.map(c => vertical ? c.width : c.height);
  const measuredMain = vertical ? parent.geometry.height : parent.geometry.width;
  const measuredCross = vertical ? parent.geometry.width : parent.geometry.height;
  const mainHug = (vertical ? L.layoutSizingVertical : L.layoutSizingHorizontal) === 'HUG';
  const crossHug = (vertical ? L.layoutSizingHorizontal : L.layoutSizingVertical) === 'HUG';
  const formulaMain = mainLen(curMain), formulaCross = crossLen(curCross);
  const reproducesMain = !mainHug || spaceBetween ? null : near(formulaMain, measuredMain, 1);
  const reproducesCross = !crossHug ? null : near(formulaCross, measuredCross, 1);

  /* 교체 후: 대상 행들만 새 크기로 바꾼다 */
  const targetIds = rows.map(r => r.srcId);
  const newMainSizes = vis.map(c => targetIds.indexOf(c.id) >= 0 ? (vertical ? newH : newW) : (vertical ? c.height : c.width));
  const newCrossSizes = vis.map(c => targetIds.indexOf(c.id) >= 0 ? (vertical ? newW : newH) : (vertical ? c.width : c.height));
  return {
    measurable: reproducesMain !== false && reproducesCross !== false,
    direction: L.layoutMode, spaceBetween, mainHug, crossHug,
    visibleChildren: vis.length,
    measured: parent.geometry.size,
    formulaMainNow: formulaMain, formulaCrossNow: formulaCross,
    formulaReproducesMain: reproducesMain, formulaReproducesCross: reproducesCross,
    predictedMainAfter: mainHug ? mainLen(newMainSizes) : measuredMain,
    predictedCrossAfter: crossHug ? crossLen(newCrossSizes) : measuredCross,
    predictedSizeAfter: vertical
      ? ((crossHug ? crossLen(newCrossSizes) : measuredCross) + '×' + (mainHug ? mainLen(newMainSizes) : measuredMain))
      : ((mainHug ? mainLen(newMainSizes) : measuredMain) + '×' + (crossHug ? crossLen(newCrossSizes) : measuredCross)),
    note: spaceBetween ? 'SPACE_BETWEEN — itemSpacing 을 고정 간격으로 더하지 않았다' : null
  };
}
const navNew = navSet.variants.inactive && navSet.variants.inactive.found ? navSet.variants.inactive.geometry : null;
const pagNew = pagSet.variants.default && pagSet.variants.default.found ? pagSet.variants.default.geometry : null;
for (const gid of Object.keys(navGroups)) {
  navGroups[gid].prediction = navNew ? predictParent(navGroups[gid].parent,
    navRows.filter(r => r.group === gid), navNew.width, navNew.height) : null;
}
const navParentPrediction = navGroups[NAV_PARENT_ID] ? navGroups[NAV_PARENT_ID].prediction : null;
const pagParentPrediction = pagNew ? predictParent(pagParent, pagRows, pagNew.width, pagNew.height) : null;

/* 넘침 · 줄바꿈 · 폭 변화 위험 */
const risks = { nav: [], pagination: [] };
if (navParent && navNew) {
  const inner = r2(navParent.geometry.width - navParent.layout.paddingLeft - navParent.layout.paddingRight);
  if (!near(inner, navNew.width)) risks.nav.push('부모 안쪽 폭 ' + inner + ' 와 NavItem 폭 ' + navNew.width + ' 가 다르다 — FILL 이면 늘어나고 FIXED 면 남거나 넘친다');
  if (navRows.some(r => !near(r.geometry.width, navNew.width))) risks.nav.push('old 폭이 ' + navNew.width + ' 와 다른 항목이 있다');
  for (const gid of Object.keys(navGroups)) {
    const g = navGroups[gid], pr = g.prediction;
    if (pr && pr.mainHug && g.parent && !near(pr.predictedMainAfter, g.parent.geometry.height)) {
      risks.nav.push(g.parentName + ' (' + gid + ') 높이가 ' + g.parent.geometry.height + ' → ' + pr.predictedMainAfter + ' 로 바뀐다');
    }
  }
  if (navParent.parentOfParent) risks.nav.push('참고: 조부모 ' + navParent.parentOfParent.name + ' (' + navParent.parentOfParent.layoutMode + ')');
}
if (pagParent && pagNew) {
  if (pagParent.layout.layoutWrap === 'WRAP') risks.pagination.push('wrap 이 켜져 있다');
  if (pagParentPrediction && pagParentPrediction.predictedMainAfter !== null &&
      !near(pagParentPrediction.predictedMainAfter, pagParent.geometry.width)) {
    risks.pagination.push('Pagination 폭이 ' + pagParent.geometry.width + ' → ' + pagParentPrediction.predictedMainAfter + ' 로 바뀐다 (가운데 정렬이면 위치도 움직인다)');
  }
}

/* ---------- gate ---------- */
const pagHidden = hiddenStrategyOf(pagParent);
const dupIds = list => list.length !== new Set(list).size;
const navIdxOk = navRows.every(r => r.originalIndex >= 0) &&
  Object.keys(navGroups).every(g => !dupIds(navRows.filter(r => r.group === g).map(r => r.originalIndex)));
const pagIdx = pagRows.map(r => r.originalIndex);
const groupIds = Object.keys(navGroups);

const gate = {
  navParentFound: !!navParent,
  sidebarSearchScopeFound: !!searchScope,
  expectedNavTargetsResolved: navCase === 'A' || navCase === 'B',
  allExpectedNavTargetsFound: expectedNavCount !== null && navRows.length === expectedNavCount,
  noDuplicateNavTargets: !dupIds(navRows.map(r => r.srcId)),
  baseNavMatchesApproval: Object.keys(HUMAN_NAV_APPROVED).every(id => navRows.some(r => r.srcId === id)) &&
    navRows.filter(r => r.humanApproved).every(r =>
      r.auditAgreesWithApproval.label && r.auditAgreesWithApproval.state),
  navSetFound: navSet.found,
  navVariantsFound: ['active', 'inactive'].every(s => navSet.variants[s] && navSet.variants[s].found),
  navIconPropertyFound: !!(navSet.iconProperty && navSet.iconProperty.isInstanceSwap),
  allNavLabelsResolved: navRows.length > 0 && navRows.every(r => !!r.label && r.textNodeCount === 1),
  allNavStatesResolved: navRows.length > 0 && navRows.every(r => !!r.oldState),
  allNavIconMappingsResolved: navRows.length > 0 && navRows.every(r => !!r.plannedIconId) &&
    duplicateNavIcons.length === 0,
  exactlyOneActiveNav: navRows.filter(r => r.oldState === 'active').length === 1,

  paginationParentFound: !!pagParent,
  exactly4PaginationTargets: pagRows.length === 4,
  noDuplicatePaginationTargets: !dupIds(pagRows.map(r => r.srcId)),
  paginationSetFound: pagSet.found,
  paginationVariantsFound: ['default', 'current', 'disabled'].every(s => pagSet.variants[s] && pagSet.variants[s].found),
  paginationIconPropertyFound: !!(pagSet.iconProperty && pagSet.iconProperty.isInstanceSwap),
  allPaginationStatesResolved: pagRows.length === 4 && pagRows.every(r => !!r.oldState),
  allPaginationLabelsResolved: pagRows.length === 4 && pagRows.every(r =>
    r.role === 'page' ? !!r.label : (r.role === 'prev' || r.role === 'next')),
  allPaginationIconMappingsResolved: pagRows.length === 4 && pagRows.every(r =>
    r.role === 'page' ? r.plannedIconVisible === false : !!r.plannedIconId),
  exactlyOneCurrentPage: pagRows.filter(r => r.oldState === 'current').length === 1,
  paginationMatchesApproval: paginationApprovalCheck.every(c => c.agrees),
  iconLibraryResolved: Object.keys(iconLibrary).every(k => iconLibrary[k].isComponent),

  replacementOrderMeasurable: navIdxOk && pagIdx.every(i => i >= 0) && !dupIds(pagIdx),
  parentGeometryMeasurable: groupIds.length > 0 && groupIds.every(g => navGroups[g].prediction && navGroups[g].prediction.measurable) &&
    !!(pagParentPrediction && pagParentPrediction.measurable),
  allNavParentsLayoutSafe: groupIds.length > 0 && groupIds.every(g => navGroups[g].hiddenStrategy.applicable === true),
  paginationHiddenStrategyApplicable: pagHidden.applicable === true,
  noExistingUnexpectedNavInstances: navUnexpectedInstances.length === 0,
  noExistingUnexpectedPaginationInstances: pagUnexpectedInstances.length === 0
};
if (navCase === 'A') gate.navParentGroupsResolved = groupIds.length >= 1 && groupIds.every(g => !!navGroups[g].parent);
const gatePassed = Object.keys(gate).every(k => gate[k]);
const gateFailures = Object.keys(gate).filter(k => !gate[k]);

if (!activeRow) notes.push('active Nav 를 하나로 정하지 못했다: ' + JSON.stringify(activeEvidence));
if (!currentRow) notes.push('current 페이지를 하나로 정하지 못했다: ' + JSON.stringify(currentEvidence));

const sidebarInventory = {
  searchedScopes: searchLog,
  searchScopeId: searchScope ? searchScope.id : null,
  searchScopeName: searchScope ? searchScope.name : null,
  scopeRule: '1002:493 → 못 찾으면 1002:2 바로 아래 사이드바 조상까지만. 페이지 전체는 보지 않는다',
  exactLabelRule: String(EXTRA_LABEL_RE),
  found: extraUnique,
  partialMatchesNotUsed: partialCandidates,
  settingsCount: foundSettings.length,
  helpCount: foundHelp.length,
  navCase, navCaseReason,
  expectedNavTargetCount: expectedNavCount
};

const navTable = navRows.map(r => ({
  key: r.key, srcId: r.srcId, group: r.group, label: r.label,
  oldState: r.oldState, plannedVariant: r.plannedVariant ? 'state=' + r.plannedVariant : null,
  oldIcon: r.oldIcon ? (r.oldIcon.mainComponent || r.oldIcon.name) + ' (' + r.oldIcon.type + ')' : null,
  plannedIcon: r.plannedIcon, iconConfidence: r.iconMappingConfidence,
  originalIndex: r.originalIndex, xy: r.geometry.x + ',' + r.geometry.y,
  size: r.geometry.size, expectedNewSize: r.expectedNewSize, layoutRisk: r.layoutRisk
}));
const paginationTable = pagRows.map(r => ({
  key: r.key, srcId: r.srcId, label: r.label, role: r.role,
  oldState: r.oldState, plannedVariant: r.plannedVariant ? 'state=' + r.plannedVariant : null,
  plannedIcon: r.plannedIcon, iconVisible: r.plannedIconVisible,
  originalIndex: r.originalIndex, xy: r.geometry.x + ',' + r.geometry.y,
  size: r.geometry.size, expectedNewSize: r.expectedNewSize, layoutRisk: r.layoutRisk
}));

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT', readOnly: true, aborted: false,
  gate, gatePassed, gateFailures,

  sidebarInventory,
  navTable,
  navGroups: groupIds.map(g => ({ parentId: g, parentName: navGroups[g].parentName,
    memberIds: navGroups[g].memberIds,
    before: navGroups[g].parent ? { geometry: navGroups[g].parent.geometry, layout: navGroups[g].parent.layout,
      childCount: navGroups[g].parent.childCount } : null,
    predictedSizeAfter: navGroups[g].prediction ? navGroups[g].prediction.predictedSizeAfter : null,
    prediction: navGroups[g].prediction, hiddenStrategy: navGroups[g].hiddenStrategy })),

  paginationTable,
  paginationStructure: structureString,
  paginationApprovalCheck,
  paginationParentBefore: pagParent ? { id: pagParent.id, geometry: pagParent.geometry, layout: pagParent.layout,
    childCount: pagParent.childCount } : null,
  paginationParentPredictedSizeAfter: pagParentPrediction ? pagParentPrediction.predictedSizeAfter : null,
  paginationParentPrediction: pagParentPrediction,

  navActiveEvidence: { decidedBy: activeBasis, activeId: activeRow ? activeRow.srcId : null, trials: activeEvidence },
  paginationCurrentEvidence: { decidedBy: currentBasis, currentId: currentRow ? currentRow.srcId : null, trials: currentEvidence },
  risks,
  hiddenChildStrategy: { pagination: pagHidden },

  iconLibrary,
  navSet, paginationSet: pagSet,
  navRows, paginationRows: pagRows,
  existingInstances: { nav: navUnexpectedInstances, pagination: pagUnexpectedInstances },

  notes,
  errorCount: errors.length,
  errors: errors.slice(0, 10),
  nextStep: gatePassed
    ? ('gate 전부 통과. 경우 ' + navCase + ' (Nav ' + navRows.length + '개 + Pagination 4개). 확인받은 뒤 22-v1 DRY_RUN 을 씁니다.')
    : 'gate 실패 항목부터 확인해주세요: ' + gateFailures.join(', ')
});
