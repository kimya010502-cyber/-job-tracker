/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 15d
 * NavItem 아이콘 슬롯 검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= 를 한 줄도 포함하지 않는다.
 *
 * 대상: NavItem 컴포넌트 세트 1042:36 (variant 2)
 *
 * 성공 조건
 *   - icon INSTANCE_SWAP 속성이 존재
 *   - 기본값이 Icon / Nav / Applications 를 가리킴 (노드 id 또는 컴포넌트 key — 형태는 단정하지 않는다)
 *   - 2개 variant 모두 icon 이 INSTANCE 이고 16×16 이며 **보이는 상태**
 *     (Button/Input/Pagination 과 달리 NavItem 의 아이콘은 기본 노출이다)
 *   - 외곽 232×32 · padding 0/12/0/12 · gap 8 유지
 *
 * 참고만 하는 값 (성공 조건 아님)
 *   - instanceCountRecursive — findAll 이 인스턴스 내부까지 재귀하므로 숫자가 커질 수 있다
 * ========================================================================== */

const SCRIPT_VERSION = '15d-v1-navitem-verify';

const SET_ID = '1042:36';
const SET_NAME = 'NavItem';
const PROP_NAME = 'icon';
const DEFAULT_ICON = 'Icon / Nav / Applications';
const SLOT = 16;
const EXPECT = { width: 232, height: 32, padding: '0/12/0/12', gap: 8, variantCount: 2, slotVisible: true };

const errors = [];
const notes = [];
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 ---------- */
const set = await figma.getNodeByIdAsync(SET_ID);
if (!set) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
                       reason: SET_ID + ' 노드를 찾을 수 없음' });
if (set.type !== 'COMPONENT_SET') return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
                       aborted: true, reason: SET_ID + ' 는 COMPONENT_SET 이 아니라 ' + set.type });
if (set.name !== SET_NAME) notes.push("세트 이름이 '" + SET_NAME + "' 가 아니라 '" + set.name + "'");

/* ---------- 아이콘 라이브러리 ---------- */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const icon = iconComps.find(c => c.name === DEFAULT_ICON) || null;

/* ---------- 속성 정의 ---------- */
let defs = null;
try { defs = set.componentPropertyDefinitions; } catch (e) { notes.push('속성 정의 읽기 실패: ' + e.message); }
const propKey = defs ? (Object.keys(defs).find(k => k.split('#')[0] === PROP_NAME) || null) : null;
const propDef = propKey && defs ? defs[propKey] : null;

const property = {
  key: propKey,
  type: propDef ? propDef.type : null,
  defaultValue: propDef ? propDef.defaultValue : null,
  preferredValuesCount: propDef && Array.isArray(propDef.preferredValues) ? propDef.preferredValues.length : 0,
  defaultIconNodeId: icon ? icon.id : null,
  defaultIconKey: icon ? icon.key : null,
  defaultMatchesNodeId: !!(propDef && icon && propDef.defaultValue === icon.id),
  defaultMatchesKey: !!(propDef && icon && icon.key && propDef.defaultValue === icon.key)
};
property.defaultValueForm = property.defaultMatchesNodeId ? 'node id'
  : (property.defaultMatchesKey ? 'component key' : 'unknown');
property.defaultPointsToIcon = property.defaultMatchesNodeId || property.defaultMatchesKey;

/* ---------- variant 별 ---------- */
const rows = [];
for (const v of set.children) {
  const row = { variant: v.name, id: v.id, size: r2(v.width) + '×' + r2(v.height), checks: {} };

  row.padding = [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/');
  row.gap = r2(v.itemSpacing);
  row.childNames = v.children.map(c => c.name);

  row.checks.widthOk = near(v.width, EXPECT.width);
  row.checks.heightOk = near(v.height, EXPECT.height);
  row.checks.paddingOk = row.padding === EXPECT.padding;
  row.checks.gapOk = near(v.itemSpacing, EXPECT.gap);

  const slots = v.children.filter(c => c.name === PROP_NAME);
  const s = slots[0] || null;
  row.slotCount = slots.length;
  row.checks.exactlyOneSlot = slots.length === 1;
  row.checks.slotIsInstance = !!s && s.type === 'INSTANCE';
  row.slotSize = s ? r2(s.width) + '×' + r2(s.height) : null;
  row.checks.slotSize16 = !!s && near(s.width, SLOT) && near(s.height, SLOT);
  row.slotVisible = s ? s.visible : null;
  row.checks.slotVisibleAsSpec = !!s && s.visible === EXPECT.slotVisible;

  // 남아 있는 빈 FRAME 슬롯이 없어야 한다
  row.checks.noLeftoverFrameSlot = !v.children.some(c => c.name === PROP_NAME && c.type === 'FRAME');

  // 슬롯이 아이콘 컴포넌트에서 왔는지
  let mainName = null;
  if (s && s.type === 'INSTANCE') {
    let mc = null;
    try { mc = await s.getMainComponentAsync(); }
    catch (e) { try { mc = s.mainComponent; } catch (e2) { /* 무시 */ } }
    if (mc) mainName = mc.name;
  }
  row.slotMainComponent = mainName;
  row.checks.slotFromIconLibrary = typeof mainName === 'string' && mainName.indexOf('Icon / ') === 0;
  row.checks.slotIsDefaultIcon = mainName === DEFAULT_ICON;

  // 속성 참조 연결
  let refs = null;
  try { refs = s ? s.componentPropertyReferences : null; } catch (e) { /* 무시 */ }
  row.propertyReference = refs && refs.mainComponent ? refs.mainComponent : null;
  row.checks.slotBoundToProperty = !!propKey && row.propertyReference === propKey;

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(v.name + ' 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;
  rows.push(row);
}

/* ---------- 참고 수치 ---------- */
const recursiveInstances = [];
for (const v of set.children) {
  for (const n of v.findAll(x => x.type === 'INSTANCE')) recursiveInstances.push(v.name + ' / ' + n.name);
}

/* ---------- 집계 ---------- */
const successCriteria = {
  variantCount: set.children.length === EXPECT.variantCount,
  propertyExists: !!propKey,
  propertyIsInstanceSwap: property.type === 'INSTANCE_SWAP',
  defaultPointsToIcon: property.defaultPointsToIcon,
  allSlotsAreInstances: rows.length > 0 && rows.every(r => r.checks.slotIsInstance),
  allSlots16: rows.length > 0 && rows.every(r => r.checks.slotSize16),
  allSlotsVisible: rows.length > 0 && rows.every(r => r.checks.slotVisibleAsSpec),
  allSlotsFromIconLibrary: rows.length > 0 && rows.every(r => r.checks.slotFromIconLibrary),
  allSlotsBoundToProperty: rows.length > 0 && rows.every(r => r.checks.slotBoundToProperty),
  noLeftoverFrameSlots: rows.length > 0 && rows.every(r => r.checks.noLeftoverFrameSlot),
  geometryIntact: rows.length > 0 && rows.every(r => r.checks.widthOk && r.checks.heightOk &&
                                                     r.checks.paddingOk && r.checks.gapOk),
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  componentSetId: SET_ID,
  componentSetName: set.name,
  variantCount: set.children.length,
  property,
  variants: rows,
  iconLibraryCount: iconComps.length,
  instanceCountRecursive: recursiveInstances.length,
  instanceListRecursive: recursiveInstances,
  recursiveNote: 'findAll 은 인스턴스 내부까지 재귀한다. 이 숫자는 참고용이며 성공 조건이 아니다.',
  visibilityNote: 'NavItem 의 아이콘은 다른 세 마스터와 달리 기본 노출이다. slotVisible = true 가 정상이다.',
  successCriteria,
  successCriteriaMet,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
