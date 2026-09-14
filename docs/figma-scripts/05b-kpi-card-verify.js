/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 05b
 * KPI Card 세트 재검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API(createXxx / appendChild / resize / remove / setBoundVariable / .fills= 등)를
 * 한 줄도 포함하지 않는다. 노드 속성을 읽어 기대값과 대조만 한다.
 *
 * 대상: KPI Card 컴포넌트 세트 1033:2085
 *
 * 기대값 (v2 APPLY 실측으로 확정)
 *   카드 높이      86   = 16(padding) + 16(label) + 38(value row) + 16(padding)
 *   value row      38   = 자신의 padding-top 4 + 콘텐츠 34      ← 박스 높이 기준
 *   value          34   = number(KPI number 28/34) 기준 hug
 *   meta           24   = Chip 24 기준 hug
 *   badge          24   = Chip 인스턴스
 *   label          16   = Caption 12/16
 *
 * 05 v1 의 검증 실패는 컴포넌트 문제가 아니라 이 기대값 오류였다.
 * valueRow 의 padding-top 4 는 그 프레임 자신의 높이에 포함되므로 34 가 아니라 38 이 맞다.
 * ========================================================================== */

const SCRIPT_VERSION = '05b-v2-kpi-verify-versioned';

const SET_ID = '1033:2085';
const SET_NAME = 'KPI Card';

const EXPECT = {
  card: 86,
  label: 16,
  valueRow: 38,
  value: 34,
  meta: 24,
  badge: 24
};
const EXPECTED_TONE = {
  'delta=positive': 'tone=success',
  'delta=negative': 'tone=danger',
  'delta=neutral':  'tone=neutral'
};

const errors = [];
const notes = [];
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 확인 ---------- */
const set = await figma.getNodeByIdAsync(SET_ID);
if (!set) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', aborted: true, reason: SET_ID + ' 노드를 찾을 수 없음' });
}
if (set.type !== 'COMPONENT_SET') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', aborted: true, reason: SET_ID + ' 는 COMPONENT_SET 이 아니라 ' + set.type });
}
if (set.name !== SET_NAME) {
  notes.push("세트 이름이 '" + SET_NAME + "' 가 아니라 '" + set.name + "'");
}

/* ---------- 변수 / 스타일 이름 조회 헬퍼 ---------- */
async function boundVarName(paint) {
  try {
    if (!paint || !paint.boundVariables || !paint.boundVariables.color) return null;
    const v = await figma.variables.getVariableByIdAsync(paint.boundVariables.color.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}
async function styleName(id) {
  try {
    if (!id) return null;
    const s = await figma.getStyleByIdAsync(id);
    return s ? s.name : null;
  } catch (e) { return null; }
}

/* ---------- variant 별 검사 ---------- */
const rows = [];

for (const card of set.children) {
  const row = {
    variant: card.name,
    id: card.id,
    width: r2(card.width),
    height: r2(card.height),
    checks: {}
  };

  // 중첩 프레임
  const label = card.findOne(n => n.name === 'label');
  const valueRow = card.findOne(n => n.name === 'value row');
  const value = card.findOne(n => n.name === 'value');
  const meta = card.findOne(n => n.name === 'meta');
  const badge = card.findOne(n => n.name === 'badge');
  const caption = card.findOne(n => n.name === 'caption');

  row.nested = {
    label: label ? r2(label.height) : null,
    valueRow: valueRow ? r2(valueRow.height) : null,
    value: value ? r2(value.height) : null,
    meta: meta ? r2(meta.height) : null,
    badge: badge ? r2(badge.height) : null
  };

  // 높이
  row.checks.cardHeight = near(row.height, EXPECT.card);
  row.checks.labelHeight = near(row.nested.label, EXPECT.label);
  row.checks.valueRowHeight = near(row.nested.valueRow, EXPECT.valueRow);
  row.checks.valueHeight = near(row.nested.value, EXPECT.value);
  row.checks.metaHeight = near(row.nested.meta, EXPECT.meta);
  row.checks.badgeHeight = near(row.nested.badge, EXPECT.badge);

  // value row 의 padding-top 이 4 인지 (38 의 근거)
  row.valueRowPaddingTop = valueRow ? valueRow.paddingTop : null;
  row.checks.valueRowPaddingTop4 = near(row.valueRowPaddingTop, 4);

  // 배지가 Chip 인스턴스인지 + tone 이 맞는지
  row.checks.badgeIsInstance = !!badge && badge.type === 'INSTANCE';

  // Chip 마스터가 Icon 인스턴스를 품게 되면 배지 안에도 중첩 인스턴스가 생긴다.
  // 이는 정상이므로 개수를 성공 조건으로 두지 않고 내역만 기록한다.
  row.badgeNestedInstances = [];
  if (badge && 'findAll' in badge) {
    for (const ni of badge.findAll(n => n.type === 'INSTANCE')) {
      let nmc = null;
      try { nmc = await ni.getMainComponentAsync(); }
      catch (e) { try { nmc = ni.mainComponent; } catch (e2) { /* 무시 */ } }
      row.badgeNestedInstances.push({ name: ni.name, main: nmc ? nmc.name : null, visible: ni.visible });
    }
  }
  let mainName = null, mainSet = null;
  if (badge && badge.type === 'INSTANCE') {
    let mc = null;
    try { mc = await badge.getMainComponentAsync(); }
    catch (e) { try { mc = badge.mainComponent; } catch (e2) { /* 무시 */ } }
    if (mc) {
      mainName = mc.name;
      mainSet = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : null;
    }
  }
  row.badgeMainComponent = mainName;
  row.badgeMainSet = mainSet;
  row.checks.badgeFromChipSet = mainSet === 'Chip';
  row.checks.badgeToneCorrect = EXPECTED_TONE[card.name] ? mainName === EXPECTED_TONE[card.name] : null;

  // caption 기본 숨김
  row.checks.captionHidden = !!caption && caption.visible === false;

  // 카드 표면 규칙: 보더 없음 / surface/default / elevation/card / radius 8
  row.checks.noBorder = Array.isArray(card.strokes) && card.strokes.length === 0;
  row.cardFillVar = Array.isArray(card.fills) && card.fills.length === 1
    ? await boundVarName(card.fills[0]) : null;
  row.checks.fillIsSurfaceDefault = row.cardFillVar === 'surface/default';
  row.cardEffectStyle = await styleName(card.effectStyleId);
  row.checks.shadowIsElevationCard = row.cardEffectStyle === 'elevation/card';
  row.cornerRadius = card.cornerRadius;
  row.checks.radius8 = near(typeof card.cornerRadius === 'number' ? card.cornerRadius : NaN, 8);

  // sizing mode: 세로 hug / 가로 고정
  row.sizing = { primary: card.primaryAxisSizingMode, counter: card.counterAxisSizingMode };
  row.checks.heightHugs = card.primaryAxisSizingMode === 'AUTO';
  row.checks.widthFixed = card.counterAxisSizingMode === 'FIXED';
  row.checks.cardSpaceBetween = card.primaryAxisAlignItems === 'SPACE_BETWEEN';

  // 중첩 프레임도 hug 인지 (v1 버그 재발 감지)
  row.nestedSizing = {
    valueRow: valueRow ? valueRow.counterAxisSizingMode : null,
    value: value ? value.counterAxisSizingMode : null,
    meta: meta ? meta.counterAxisSizingMode : null
  };
  row.checks.nestedFramesHug =
    row.nestedSizing.valueRow === 'AUTO' &&
    row.nestedSizing.value === 'AUTO' &&
    row.nestedSizing.meta === 'AUTO';

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(card.name + ' 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;

  rows.push(row);
}

/* ---------- 집계 ---------- */
const allHeightOk = rows.every(r => r.checks.cardHeight);
const nestedHeightsOk = rows.every(r =>
  r.checks.valueRowHeight && r.checks.valueHeight && r.checks.metaHeight &&
  r.checks.labelHeight && r.checks.badgeHeight);
const allBadgesAreInstances = rows.every(r => r.checks.badgeIsInstance);
const allTokensBound = rows.every(r =>
  r.checks.fillIsSurfaceDefault && r.checks.shadowIsElevationCard && r.checks.noBorder && r.checks.radius8);
const allBadgeTonesCorrect = rows.every(r => r.checks.badgeToneCorrect !== false);
const allAutoLayoutOk = rows.every(r =>
  r.checks.heightHugs && r.checks.widthFixed && r.checks.cardSpaceBetween && r.checks.nestedFramesHug);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  componentSetId: SET_ID,
  componentSetName: set.name,
  variantCount: set.children.length,
  expectedHeights: {
    expectedCardHeight: EXPECT.card,
    valueRowExpectedHeight: EXPECT.valueRow,
    valueExpectedHeight: EXPECT.value,
    metaExpectedHeight: EXPECT.meta,
    badgeExpectedHeight: EXPECT.badge,
    labelExpectedHeight: EXPECT.label
  },
  allHeightOk,
  nestedHeightsOk,
  allBadgesAreInstances,
  allBadgeTonesCorrect,
  badgeNestedInstanceSummary: rows.map(r => ({ variant: r.variant, nested: r.badgeNestedInstances })),
  nestedInstanceNote: "Chip leading 이 Icon 인스턴스가 되면서 배지 안에 중첩 인스턴스가 생긴다. 정상이며 개수를 조건으로 두지 않는다.",
  allTokensBound,
  allAutoLayoutOk,
  variants: rows,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
