/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 02
 * 3단계) Chip 컴포넌트화 (variant 5종)
 *
 * 확정 사양
 *   height            24px  (상하 padding 4 + line-height 16 + 4)
 *   text              Chip 스타일 (12 / 16 / 600)
 *   padding           4px 8px
 *   radius            pill (radius/full)
 *   variant           neutral / brand / success / danger / waiting
 *   신규 토큰         warning/soft #FDF1DE, warning/strong #B8790F
 *
 * variant 색 매핑
 *   neutral  surface/subtle  + text/secondary    (포지션, 현재 단계, 단계 수)
 *   brand    brand/surface   + brand/strong      (접수완료, 일정 조율, 시즌 배지)
 *   success  success/soft    + success/strong    (서류 확인)
 *   danger   danger/soft     + danger/strong     (불합격)
 *   waiting  warning/soft    + warning/strong    (결과 대기)
 *
 * 실행법
 *   1) DRY_RUN = true  로 실행 → 사전 조건만 검사하고 아무것도 만들지 않는다
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *
 * 멱등성
 *   이미 'Chip' 컴포넌트 세트가 있으면 만들지 않고 그 사실을 보고한다.
 *   warning 토큰도 이미 있으면 다시 만들지 않는다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';    // 파일 확인용으로만 쓴다. 이 프레임은 수정하지 않는다
const SET_NAME = 'Chip';

const errors = [];
const notes = [];

/* ========================================================================
 * 0. 가드 — 올바른 파일인지 확인. 메인 화면 프레임은 읽기만 한다.
 * ====================================================================== */
const mainFrame = await figma.getNodeByIdAsync(TARGET_ID);
if (!mainFrame || mainFrame.name !== EXPECTED_FRAME_NAME) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '대상 파일이 아님. ' + TARGET_ID + ' = ' + (mainFrame ? '"' + mainFrame.name + '"' : '없음'),
  };
}

// 이미 만들어져 있으면 중복 생성하지 않는다
const existingSet = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT_SET'] })
  .find(n => n.name === SET_NAME);
if (existingSet) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: "'" + SET_NAME + "' 컴포넌트 세트가 이미 존재함 (id " + existingSet.id + "). 중복 생성하지 않음.",
    existingSetId: existingSet.id,
    existingVariants: existingSet.children.map(c => c.name)
  };
}

/* ========================================================================
 * 1. 사전 조건 — 필요한 토큰 / 텍스트 스타일이 있는지
 * ====================================================================== */
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colorCol = collections.find(c => c.name === 'Color');
const radiusCol = collections.find(c => c.name === 'Radius');
const spacingCol = collections.find(c => c.name === 'Spacing');

let vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

const styles = await figma.getLocalTextStylesAsync();
const chipStyle = styles.find(s => s.name === 'Chip');

const preflight = {
  colorCollection: !!colorCol,
  radiusCollection: !!radiusCol,
  spacingCollection: !!spacingCol,
  chipTextStyle: !!chipStyle,
  radiusFull: !!V['radius/full'],
  space4: !!V['space/4'],
  space8: !!V['space/8']
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight
  };
}

/* ========================================================================
 * 2. warning 토큰 신설 (앱 코드의 amber 를 Figma semantic token 으로 승격)
 * ====================================================================== */
function hexRGB(h) {
  const n = h.replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
    a: 1
  };
}

const NEW_TOKENS = [
  ['warning/soft',   '#FDF1DE', ['FRAME_FILL', 'SHAPE_FILL']],
  ['warning/strong', '#B8790F', ['TEXT_FILL', 'SHAPE_FILL']]
];

const variablesWouldCreate = [];
const variablesCreated = [];

for (const [name, hex, scopes] of NEW_TOKENS) {
  if (V[name]) { notes.push(name + ' 이미 존재 — 재생성 안 함'); continue; }
  variablesWouldCreate.push(name + ' ' + hex);
  if (!DRY_RUN) {
    const v = figma.variables.createVariable(name, colorCol, 'COLOR');
    v.setValueForMode(colorCol.modes[0].modeId, hexRGB(hex));
    v.scopes = scopes;
    V[name] = v;
    variablesCreated.push(name);
  }
}

/* ========================================================================
 * 3. Chip variant 정의
 * ====================================================================== */
const VARIANTS = [
  { tone: 'neutral', bg: 'surface/subtle', fg: 'text/secondary',  sample: '포지션' },
  { tone: 'brand',   bg: 'brand/surface',  fg: 'brand/strong',    sample: '접수완료' },
  { tone: 'success', bg: 'success/soft',   fg: 'success/strong',  sample: '서류 확인' },
  { tone: 'danger',  bg: 'danger/soft',    fg: 'danger/strong',   sample: '불합격' },
  { tone: 'waiting', bg: 'warning/soft',   fg: 'warning/strong',  sample: '결과 대기' }
];

const plan = VARIANTS.map(v => ({
  name: 'tone=' + v.tone,
  height: 24, padding: '4 / 8', radius: 'radius/full (pill)',
  textStyle: 'Chip (12/16/600)',
  bg: v.bg, fg: v.fg, sample: v.sample
}));

if (DRY_RUN) {
  return {
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    variablesWouldCreate,
    variablesCreated: [],
    componentSetWouldCreate: SET_NAME,
    variantsWouldCreate: plan,
    leadingSlotNote: '각 variant 안에 12×12 leading 프레임을 visible=false 로 넣는다. ' +
                     '아이콘/dot 이 있는 배지(단계 수 12, KPI 델타 1, 시즌 1, 동기화 1 = 15개)를 ' +
                     '인스턴스로 교체할 때 인스턴스 오버라이드로 켜서 쓴다. 기본 상태의 모양·높이에는 영향 없음.',
    placement: '기존 프레임 우측 빈 공간에 배치 (메인 화면 프레임은 수정하지 않음)',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  };
}

/* ========================================================================
 * 4. 생성 (APPLY)
 * ====================================================================== */
await figma.loadFontAsync(chipStyle.fontName);

function boundPaint(varName) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[varName]);
}
function tryBind(node, field, varName) {
  try { node.setBoundVariable(field, V[varName]); return true; }
  catch (e) { notes.push('bind ' + field + ' 실패(값 직접 지정으로 대체): ' + e.message); return false; }
}

// 빈 자리 찾기
const maxX = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0)));
const originX = maxX + 400;
const originY = -491;

const created = [];
const comps = [];

for (const v of VARIANTS) {
  const c = figma.createComponent();
  c.name = 'tone=' + v.tone;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'AUTO';
  c.counterAxisAlignItems = 'CENTER';
  c.paddingTop = 4; c.paddingBottom = 4; c.paddingLeft = 8; c.paddingRight = 8;
  c.itemSpacing = 4;
  c.cornerRadius = 999;
  c.fills = [boundPaint(v.bg)];

  tryBind(c, 'paddingTop', 'space/4');
  tryBind(c, 'paddingBottom', 'space/4');
  tryBind(c, 'paddingLeft', 'space/8');
  tryBind(c, 'paddingRight', 'space/8');
  tryBind(c, 'itemSpacing', 'space/4');
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
    tryBind(c, f, 'radius/full');
  }

  // leading 슬롯 (기본 숨김) — 아이콘/dot 배지 교체용
  const lead = figma.createFrame();
  lead.name = 'leading';
  lead.resize(12, 12);
  lead.fills = [];
  c.appendChild(lead);
  lead.layoutSizingHorizontal = 'FIXED';
  lead.layoutSizingVertical = 'FIXED';
  lead.visible = false;

  // 라벨
  const t = figma.createText();
  c.appendChild(t);
  await t.setTextStyleIdAsync(chipStyle.id);
  t.characters = v.sample;
  t.fills = [boundPaint(v.fg)];
  t.name = 'label';
  t.textAutoResize = 'WIDTH_AND_HEIGHT';

  figma.currentPage.appendChild(c);
  comps.push(c);
  created.push({ tone: v.tone, id: c.id, width: Math.round(c.width), height: Math.round(c.height) });
}

// variant 세트로 결합
const set = figma.combineAsVariants(comps, figma.currentPage);
set.name = SET_NAME;
set.x = originX;
set.y = originY;
try {
  set.layoutMode = 'VERTICAL';
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = 12;
  set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
} catch (e) { notes.push('variant set 레이아웃 설정 실패: ' + e.message); }

try {
  set.description =
    '상태/정보 표시용 칩. height 24 (padding 4/8, Chip 텍스트 12/16/600), radius pill.\n' +
    'tone: neutral(정보성) / brand(접수완료·일정 조율) / success(서류 확인) / danger(불합격) / waiting(결과 대기).\n' +
    'leading 프레임은 기본 숨김. 아이콘·dot 이 붙는 배지는 인스턴스에서 표시로 바꿔 사용.';
} catch (e) { notes.push('description 설정 실패: ' + e.message); }

// 검증
const heights = created.map(c => c.height);
const allHeight24 = heights.every(h => h === 24);
if (!allHeight24) errors.push('높이가 24가 아닌 variant 있음: ' + JSON.stringify(created));

const RESULT = {
  mode: 'APPLY',
  aborted: false,
  preflight,
  variablesWouldCreate,
  variablesCreated,
  componentSetId: set.id,
  componentSetName: set.name,
  variantsCreated: created,
  allHeight24,
  placement: { x: set.x, y: set.y },
  createdNodeIds: [set.id].concat(comps.map(c => c.id)),
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
};

try { print(JSON.stringify(RESULT, null, 2)); } catch (e) { /* Scripter 아님 */ }
return RESULT;
