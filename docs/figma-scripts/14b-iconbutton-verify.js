/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 14b
 * Icon Button 재검증 + Application Card 의 link/more 아이콘 확인 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API 를 포함하지 않으며, 모든 대입은 로컬 보고 객체에만 이뤄진다.
 *
 * 14 APPLY **전에** 미리 작성했다. 수정 후에 검증기를 만들면
 * 문제가 생겼을 때 수정 탓인지 검증기 탓인지 섞인다.
 *
 * 대상
 *   Icon Button      1037:2091
 *   Application Card 1037:2163 (link/more 아이콘만 확인 — 높이·구조는 06b-v4 담당)
 *
 * 핵심 판정
 *   linkAndMoreDiffer — link 와 more 가 서로 다른 아이콘이어야 한다.
 *   둘 다 Icon / More 로 남으면 이번 단계의 목적 자체가 실패다.
 * ========================================================================== */

const SCRIPT_VERSION = '14b-v1-iconbutton-verify';

const IB_ID = '1037:2091';
const IB_NAME = 'Icon Button';
const AC_SET_ID = '1037:2163';
const PROP_NAME = 'icon';
const DEFAULT_ICON = 'Icon / More';
const LINK_ICON = 'Icon / External Link';
const SLOT = 16;
const OUTER = 24;
const EXPECT_PADDING = '4/4/4/4';
const BUTTON_ICON = { link: LINK_ICON, more: DEFAULT_ICON };

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 ---------- */
const ib = await figma.getNodeByIdAsync(IB_ID);
if (!ib) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
                      reason: IB_ID + ' 없음' });
if (ib.type !== 'COMPONENT') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
               reason: IB_ID + ' 는 ' + ib.type });
}
if (ib.name !== IB_NAME) notes.push('이름이 ' + IB_NAME + ' 가 아니라 ' + ib.name);

const acSet = await figma.getNodeByIdAsync(AC_SET_ID);
if (!acSet) notes.push(AC_SET_ID + ' (Application Card) 를 찾지 못해 카드 확인을 건너뛴다');

/* ---------- 아이콘 라이브러리 ---------- */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const keyToName = {}, idToName = {}, byName = {};
for (const c of iconComps) { if (c.key) keyToName[c.key] = c.name; idToName[c.id] = c.name; byName[c.name] = c; }
const iconMore = byName[DEFAULT_ICON] || null;

async function mainNameOf(inst) {
  let mc = null;
  try { mc = await inst.getMainComponentAsync(); }
  catch (e) { try { mc = inst.mainComponent; } catch (e2) { /* 무시 */ } }
  return mc ? mc.name : null;
}
async function radiusTokenOf(n) {
  try {
    const bv = n.boundVariables;
    if (!bv || !bv.topLeftRadius) return null;
    const v = await figma.variables.getVariableByIdAsync(bv.topLeftRadius.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}

/* ---------- Icon Button 속성 ---------- */
let propDefs = null;
try { propDefs = ib.componentPropertyDefinitions; }
catch (e) { errors.push('componentPropertyDefinitions 읽기 실패: ' + e.message); }

const propKey = propDefs ? Object.keys(propDefs).find(k => k.split('#')[0] === PROP_NAME) : null;
const propDef = propKey ? propDefs[propKey] : null;
const preferred = propDef && propDef.preferredValues ? propDef.preferredValues : [];
const preferredNames = preferred.map(p => keyToName[p.key] || '(미상)');

const property = {
  found: !!propKey,
  key: propKey || null,
  nameIsIcon: !!propKey && propKey.split('#')[0] === PROP_NAME,
  type: propDef ? propDef.type : null,
  typeIsInstanceSwap: !!propDef && propDef.type === 'INSTANCE_SWAP',
  defaultValue: propDef ? propDef.defaultValue : null,
  // defaultValue 는 노드 id 가 정석이지만 런타임 형태를 단정하지 않고 둘 다 대조한다
  defaultMatchesNodeId: !!(propDef && iconMore && propDef.defaultValue === iconMore.id),
  defaultMatchesKey: !!(propDef && iconMore && iconMore.key && propDef.defaultValue === iconMore.key),
  defaultIsIconMore: !!(propDef && iconMore &&
    (propDef.defaultValue === iconMore.id || (iconMore.key && propDef.defaultValue === iconMore.key))),
  defaultValueForm: propDef && iconMore
    ? (propDef.defaultValue === iconMore.id ? 'node id'
       : (iconMore.key && propDef.defaultValue === iconMore.key ? 'component key' : 'unknown'))
    : null,
  defaultResolvedName: propDef ? (idToName[propDef.defaultValue] || keyToName[propDef.defaultValue] || null) : null,
  preferredValueCount: preferred.length,
  preferredCoversLibrary: preferred.length === iconComps.length,
  preferredOmitted: preferred.length === 0,
  preferredAllAreIcons: preferredNames.every(n => n.indexOf('Icon / ') === 0)
};
if (!property.found) errors.push('INSTANCE_SWAP 속성 ' + PROP_NAME + ' 을 찾지 못함');
else {
  if (!property.typeIsInstanceSwap) errors.push('속성 타입이 INSTANCE_SWAP 이 아님: ' + property.type);
  if (!property.nameIsIcon) errors.push('속성 이름이 ' + PROP_NAME + ' 이 아님');
  if (!property.defaultIsIconMore) errors.push('기본 컴포넌트가 ' + DEFAULT_ICON + ' 이 아님 (해석: ' + property.defaultResolvedName + ')');
  if (property.preferredOmitted) notes.push('preferredValues 가 비어 있다 — 14 가 옵션 없이 생성했을 수 있다');
  else if (!property.preferredCoversLibrary) errors.push('preferredValues 가 ' + preferred.length + '개로 라이브러리 ' + iconComps.length + '개와 다름');
  else if (!property.preferredAllAreIcons) errors.push('preferredValues 에 Icon 이 아닌 항목이 있음');
}

/* ---------- Icon Button 구조 ---------- */
const slots = ib.children.filter(c => c.name === PROP_NAME);
const slot = slots[0] || null;
const checks = {};

const iconButton = {
  size: r2(ib.width) + '×' + r2(ib.height),
  padding: [ib.paddingTop, ib.paddingRight, ib.paddingBottom, ib.paddingLeft].map(r2).join('/'),
  cornerRadius: typeof ib.cornerRadius === 'number' ? r2(ib.cornerRadius) : 'mixed',
  radiusToken: await radiusTokenOf(ib),
  fillCount: Array.isArray(ib.fills) ? ib.fills.length : null,
  strokeCount: Array.isArray(ib.strokes) ? ib.strokes.length : null,
  childNames: ib.children.map(c => c.name),
  slotCount: slots.length
};

checks.outer24 = near(ib.width, OUTER) && near(ib.height, OUTER);
checks.padding4 = iconButton.padding === EXPECT_PADDING;
checks.radius4 = near(typeof ib.cornerRadius === 'number' ? ib.cornerRadius : NaN, 4);
checks.ghostNoFill = Array.isArray(ib.fills) && ib.fills.length === 0;
checks.ghostNoStroke = Array.isArray(ib.strokes) && ib.strokes.length === 0;
checks.exactlyOneSlot = slots.length === 1;
checks.onlyIconChild = ib.children.length === 1 && ib.children[0].name === PROP_NAME;

if (slot) {
  iconButton.slot = {
    type: slot.type, size: r2(slot.width) + '×' + r2(slot.height), visible: slot.visible
  };
  checks.slotIsInstance = slot.type === 'INSTANCE';
  checks.slotNotFrame = slot.type !== 'FRAME';
  checks.slot16 = near(slot.width, SLOT) && near(slot.height, SLOT);
  checks.slotVisible = slot.visible === true;
  iconButton.slot.mainComponent = slot.type === 'INSTANCE' ? await mainNameOf(slot) : null;
  checks.slotIsIconMore = iconButton.slot.mainComponent === DEFAULT_ICON;
  let ref = null;
  try { ref = slot.componentPropertyReferences ? slot.componentPropertyReferences.mainComponent : null; }
  catch (e) { /* 무시 */ }
  iconButton.slot.propertyReference = ref;
  checks.slotBoundToProperty = !!ref && ref === propKey;
} else {
  errors.push('icon 슬롯을 찾지 못함');
}

const failedIb = Object.keys(checks).filter(k => checks[k] === false);
if (failedIb.length) errors.push('Icon Button 실패: ' + failedIb.join(', '));

/* ---------- Application Card 의 link / more ---------- */
const cards = [];
let linkAndMoreDiffer = null;
if (acSet && acSet.type === 'COMPONENT_SET') {
  for (const v of acSet.children) {
    const row = { variant: v.name, height: r2(v.height), buttons: {}, checks: {} };
    for (const nm of Object.keys(BUTTON_ICON)) {
      const nodes = v.findAll(n => n.type === 'INSTANCE' && n.name === nm);
      const btn = nodes[0] || null;
      let iconName = null, iconVisible = null, iconSize = null;
      if (btn) {
        const inner = btn.findAll(n => n.type === 'INSTANCE');
        if (inner.length) {
          iconName = await mainNameOf(inner[0]);
          iconVisible = inner[0].visible;
          iconSize = r2(inner[0].width) + '×' + r2(inner[0].height);
        }
      }
      row.buttons[nm] = { count: nodes.length, icon: iconName, expected: BUTTON_ICON[nm],
                          visible: iconVisible, size: iconSize };
      row.checks[nm + 'Correct'] = iconName === BUTTON_ICON[nm];
      row.checks[nm + 'Visible'] = iconVisible === true;
    }
    row.checks.differ = !!(row.buttons.link.icon && row.buttons.more.icon &&
                           row.buttons.link.icon !== row.buttons.more.icon);
    const f = Object.keys(row.checks).filter(k => row.checks[k] === false);
    row.failedChecks = f;
    if (f.length) errors.push(v.name + ' 실패: ' + f.join(', '));
    cards.push(row);
  }
  linkAndMoreDiffer = cards.every(c => c.checks.differ);
  if (linkAndMoreDiffer === false) errors.push('link 와 more 가 같은 아이콘이다 — 이번 단계의 핵심 목표 실패');
}

/* ---------- 집계 ---------- */
return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,

  iconButtonId: IB_ID,
  outer24: checks.outer24 === true,
  padding4: checks.padding4 === true,
  radius4: checks.radius4 === true,
  ghostStyleIntact: checks.ghostNoFill === true && checks.ghostNoStroke === true,
  slotIsInstance: checks.slotIsInstance === true,
  slot16: checks.slot16 === true,
  slotVisible: checks.slotVisible === true,
  slotIsIconMore: checks.slotIsIconMore === true,
  slotBoundToProperty: checks.slotBoundToProperty === true,

  property,
  iconButton,
  iconButtonChecks: checks,
  iconButtonFailedChecks: failedIb,

  applicationCardId: AC_SET_ID,
  linkAndMoreDiffer,
  cards,

  iconLibraryCount: iconComps.length,
  paddingChangeNote: 'padding 6 → 4 는 의도된 변경이다. 외곽 ' + OUTER + '×' + OUTER + ' 와 글리프 시각 크기는 유지되어야 한다.',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
