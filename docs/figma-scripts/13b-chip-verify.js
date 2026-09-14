/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 13b
 * Chip 세트 재검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API 를 포함하지 않으며, 모든 대입은 로컬 보고 객체에만 이뤄진다.
 *
 * 대상: Chip 컴포넌트 세트 1029:1984
 *
 * 13 APPLY **전에** 미리 작성했다. 수정 후에 검증기를 새로 만들면
 * 문제가 생겼을 때 "수정이 잘못된 건지 / 검증기가 잘못된 건지" 가 섞인다.
 *
 * 확인 항목
 *   variant 5개 · 높이 24 · padding 4/8/4/8 · gap 4 · radius/full
 *   빈 leading FRAME 이 남아 있지 않을 것
 *   variant 마다 leading Icon 인스턴스 정확히 1개 · 16×16 · visible=false
 *   기본 컴포넌트 = Icon / Dot · 속성 타입 INSTANCE_SWAP · 속성 이름 leading
 *   preferredValues = Icon 라이브러리 전체
 *   label / tone 토큰 구조 유지 · 예상 외 자식 없음
 * ========================================================================== */

const SCRIPT_VERSION = '13b-v2-chip-verify-defaultvalue-id';

const CHIP_SET_ID = '1029:1984';
const CHIP_SET_NAME = 'Chip';
const PROP_NAME = 'leading';
const DEFAULT_ICON = 'Icon / Dot';
const SLOT = 16;
const EXPECT_HEIGHT = 24;
const EXPECT_PADDING = '4/8/4/8';
const EXPECT_GAP = 4;
const EXPECT_CHILDREN = ['leading', 'label'];

// tone 별 기대 토큰 (배경 / 라벨)
const TONE_TOKENS = {
  'tone=neutral': { bg: 'surface/subtle', fg: 'text/secondary' },
  'tone=brand':   { bg: 'brand/surface',  fg: 'brand/strong' },
  'tone=success': { bg: 'success/soft',   fg: 'success/strong' },
  'tone=danger':  { bg: 'danger/soft',    fg: 'danger/strong' },
  'tone=waiting': { bg: 'warning/soft',   fg: 'warning/strong' }
};

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 ---------- */
const set = await figma.getNodeByIdAsync(CHIP_SET_ID);
if (!set) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
                       reason: CHIP_SET_ID + ' 없음' });
if (set.type !== 'COMPONENT_SET') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
               reason: CHIP_SET_ID + ' 는 ' + set.type });
}
if (set.name !== CHIP_SET_NAME) notes.push('세트 이름이 ' + CHIP_SET_NAME + ' 가 아니라 ' + set.name);

/* ---------- 헬퍼 ---------- */
async function fillToken(n) {
  try {
    if (!('fills' in n) || !Array.isArray(n.fills) || n.fills.length !== 1) return null;
    const p = n.fills[0];
    if (p.type !== 'SOLID' || !p.boundVariables || !p.boundVariables.color) return null;
    const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}
async function radiusToken(n) {
  try {
    const bv = n.boundVariables;
    if (!bv || !bv.topLeftRadius) return null;
    const v = await figma.variables.getVariableByIdAsync(bv.topLeftRadius.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}

/* ---------- 아이콘 라이브러리 (preferredValues 대조용) ---------- */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const keyToName = {};
const idToName = {};
for (const c of iconComps) { if (c.key) keyToName[c.key] = c.name; idToName[c.id] = c.name; }
const iconDot = iconComps.find(c => c.name === DEFAULT_ICON) || null;

/* ---------- 컴포넌트 속성 ---------- */
let propDefs = null;
try { propDefs = set.componentPropertyDefinitions; }
catch (e) { errors.push('componentPropertyDefinitions 읽기 실패: ' + e.message); }

const propKey = propDefs ? Object.keys(propDefs).find(k => k.split('#')[0] === PROP_NAME) : null;
const propDef = propKey ? propDefs[propKey] : null;
const preferred = propDef && propDef.preferredValues ? propDef.preferredValues : [];
const preferredNames = preferred.map(p => keyToName[p.key] || ('(미상 key ' + String(p.key).slice(0, 8) + '…)'));

const property = {
  found: !!propKey,
  key: propKey || null,
  nameIsLeading: !!propKey && propKey.split('#')[0] === PROP_NAME,
  type: propDef ? propDef.type : null,
  typeIsInstanceSwap: !!propDef && propDef.type === 'INSTANCE_SWAP',
  // INSTANCE_SWAP 의 defaultValue 는 컴포넌트 key 가 아니라 **노드 id** 다 (Figma 공식 문서 예시 기준).
  // 다만 런타임이 어느 형태로 돌려주는지 단정하지 않고 둘 다 대조해 어느 쪽이 맞았는지 보고한다.
  defaultValue: propDef ? propDef.defaultValue : null,
  defaultMatchesNodeId: !!(propDef && iconDot && propDef.defaultValue === iconDot.id),
  defaultMatchesKey: !!(propDef && iconDot && iconDot.key && propDef.defaultValue === iconDot.key),
  defaultIsIconDot: !!(propDef && iconDot &&
    (propDef.defaultValue === iconDot.id || (iconDot.key && propDef.defaultValue === iconDot.key))),
  defaultValueForm: propDef && iconDot
    ? (propDef.defaultValue === iconDot.id ? 'node id'
       : (iconDot.key && propDef.defaultValue === iconDot.key ? 'component key' : 'unknown'))
    : null,
  defaultResolvedName: propDef ? (idToName[propDef.defaultValue] || keyToName[propDef.defaultValue] || null) : null,
  preferredValueCount: preferred.length,
  preferredValueNames: preferredNames,
  preferredCoversLibrary: preferred.length === iconComps.length,
  preferredOmitted: preferred.length === 0,   // 13 이 preferredValues 없이 생성했을 수 있다
  preferredAllAreIcons: preferredNames.every(n => n.indexOf('Icon / ') === 0)
};
if (!property.found) errors.push('INSTANCE_SWAP 속성 ' + PROP_NAME + ' 을 찾지 못함');
else {
  if (!property.typeIsInstanceSwap) errors.push('속성 타입이 INSTANCE_SWAP 이 아님: ' + property.type);
  if (!property.nameIsLeading) errors.push('속성 이름이 ' + PROP_NAME + ' 이 아님');
  if (!property.defaultIsIconDot) errors.push('기본 컴포넌트가 ' + DEFAULT_ICON + ' 이 아님 (해석: ' + property.defaultResolvedName + ')');
  if (property.preferredOmitted) notes.push('preferredValues 가 비어 있다 — 13 이 옵션 없이 속성을 만들었을 수 있다. 치명적이지 않으나 스왑 목록이 전체 컴포넌트로 열린다.');
  else if (!property.preferredCoversLibrary) errors.push('preferredValues 가 ' + preferred.length + '개로 아이콘 라이브러리 ' + iconComps.length + '개와 다름');
  if (!property.preferredAllAreIcons) errors.push('preferredValues 에 Icon 이 아닌 항목이 있음');
}

/* ---------- variant 별 ---------- */
const rows = [];
for (const v of set.children) {
  const row = { variant: v.name, id: v.id, checks: {} };

  row.size = r2(v.width) + '×' + r2(v.height);
  row.height = r2(v.height);
  row.padding = [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/');
  row.itemSpacing = r2(v.itemSpacing);
  row.cornerRadius = typeof v.cornerRadius === 'number' ? r2(v.cornerRadius) : 'mixed';
  row.radiusToken = await radiusToken(v);
  row.childNames = v.children.map(c => c.name);

  row.checks.height24 = near(v.height, EXPECT_HEIGHT);
  row.checks.padding48 = row.padding === EXPECT_PADDING;
  row.checks.gap4 = near(v.itemSpacing, EXPECT_GAP);
  row.checks.radiusFullBound = row.radiusToken === 'radius/full';

  // 자식 구성
  row.checks.exactlyTwoChildren = v.children.length === 2;
  row.checks.childNamesExpected = EXPECT_CHILDREN.every(n => row.childNames.indexOf(n) !== -1);
  row.unexpectedChildren = row.childNames.filter(n => EXPECT_CHILDREN.indexOf(n) === -1);
  row.checks.noUnexpectedChildren = row.unexpectedChildren.length === 0;

  // leading
  const leadings = v.children.filter(c => c.name === 'leading');
  row.leadingCount = leadings.length;
  row.checks.exactlyOneLeading = leadings.length === 1;
  const lead = leadings[0] || null;

  if (lead) {
    row.leading = {
      type: lead.type, size: r2(lead.width) + '×' + r2(lead.height),
      visible: lead.visible, index: v.children.indexOf(lead)
    };
    row.checks.leadingIsInstance = lead.type === 'INSTANCE';
    row.checks.leadingNotFrame = lead.type !== 'FRAME';     // 빈 FRAME 이 남아 있으면 실패
    row.checks.leading16 = near(lead.width, SLOT) && near(lead.height, SLOT);
    row.checks.leadingHidden = lead.visible === false;

    let mc = null;
    try { mc = await lead.getMainComponentAsync(); }
    catch (e) { try { mc = lead.mainComponent; } catch (e2) { /* 무시 */ } }
    row.leading.mainComponent = mc ? mc.name : null;
    row.checks.leadingIsIconDot = !!mc && mc.name === DEFAULT_ICON;

    let ref = null;
    try { ref = lead.componentPropertyReferences ? lead.componentPropertyReferences.mainComponent : null; }
    catch (e) { /* 무시 */ }
    row.leading.propertyReference = ref;
    row.checks.leadingBoundToProperty = !!ref && ref === propKey;
  } else {
    row.leading = null;
    row.checks.leadingIsInstance = false;
  }

  // label 과 tone 토큰
  const label = v.children.find(c => c.name === 'label') || null;
  row.label = label ? {
    type: label.type,
    characters: 'characters' in label ? label.characters : null,
    fillToken: await fillToken(label)
  } : null;
  row.bgToken = await fillToken(v);

  const expect = TONE_TOKENS[v.name];
  row.expectedTokens = expect || null;
  row.checks.bgTokenCorrect = expect ? row.bgToken === expect.bg : null;
  row.checks.labelTokenCorrect = expect ? (row.label && row.label.fillToken === expect.fg) : null;
  row.checks.labelHasText = !!(row.label && row.label.characters && row.label.characters.length > 0);

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  row.failedChecks = failed;
  if (failed.length) errors.push(v.name + ' 실패: ' + failed.join(', '));

  rows.push(row);
}

/* ---------- 집계 ---------- */
const variantCount5 = set.children.length === 5;
if (!variantCount5) errors.push('variant 가 ' + set.children.length + '개로 5개가 아님');

const allHeight24 = rows.every(r => r.checks.height24);
const allPaddingOk = rows.every(r => r.checks.padding48);
const allGapOk = rows.every(r => r.checks.gap4);
const allRadiusFull = rows.every(r => r.checks.radiusFullBound);
const noEmptyLeadingFrames = rows.every(r => r.checks.leadingNotFrame === true);
const allLeadingInstances = rows.every(r => r.checks.leadingIsInstance);
const allLeading16 = rows.every(r => r.checks.leading16);
const allLeadingHidden = rows.every(r => r.checks.leadingHidden);
const allLeadingAreIconDot = rows.every(r => r.checks.leadingIsIconDot);
const allLeadingBound = rows.every(r => r.checks.leadingBoundToProperty);
const allTonesIntact = rows.every(r => r.checks.bgTokenCorrect !== false && r.checks.labelTokenCorrect !== false);
const noUnexpectedChildren = rows.every(r => r.checks.noUnexpectedChildren);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  componentSetId: CHIP_SET_ID,
  componentSetName: set.name,
  variantCount: set.children.length,

  variantCount5,
  allHeight24,
  allPaddingOk,
  allGapOk,
  allRadiusFull,
  noEmptyLeadingFrames,
  allLeadingInstances,
  allLeading16,
  allLeadingHidden,
  allLeadingAreIconDot,
  allLeadingBound,
  allTonesIntact,
  noUnexpectedChildren,

  property,
  iconLibraryCount: iconComps.length,
  variants: rows,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
