/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 03
 * 4단계) Button 컴포넌트화 (variant 4종)
 *
 * 확정 사양
 *   height            36px 고정 (세로 중앙 정렬 / 세로 padding 0)
 *   horizontal padding 12px
 *   radius            8 (radius/md)
 *   text              Label 스타일 (13 / 18 / 500)
 *   leading 슬롯      12×12, 기본 hidden (Chip 과 동일 방식)
 *   variant           primary / secondary / ghost / danger
 *   신규 토큰         없음
 *
 * variant 색
 *   primary    bg brand/primary   + text/on-brand                     (기록 추가 버튼)
 *   secondary  bg surface/subtle  + text/secondary + border/subtle    (시스템용)
 *   ghost      bg 없음            + text/secondary                    (초기화 버튼)
 *   danger     bg danger/strong   + text/on-brand                     (시스템용, 삭제/영구 액션)
 *
 * 높이 36과 spacing scale
 *   Label 13/18 을 hug 시키면 세로 padding 9 가 필요해 스케일(2·4·6·8·12…)을 벗어난다.
 *   그래서 세로 padding 대신 **고정 높이 36 + 세로 중앙 정렬**로 만든다.
 *   확정값 36을 정확히 지키면서 스케일 밖 값을 만들지 않는다.
 *
 * 범위
 *   컴포넌트 생성만 한다. 메인 화면 프레임(1002:2)은 읽기만 하고 수정하지 않는다.
 *   secondary / danger 는 시스템용 variant 로 만들 뿐, 현재 화면에 적용하지 않는다.
 *
 * 실행법
 *   1) DRY_RUN = true  로 실행 → 사전 조건만 검사하고 아무것도 만들지 않는다
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *
 * 멱등성
 *   이미 'Button' 컴포넌트 세트가 있으면 만들지 않고 그 사실을 보고한다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';    // 파일 확인용. 이 프레임은 수정하지 않는다
const SET_NAME = 'Button';
const HEIGHT = 36;

const errors = [];
const notes = [];

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ========================================================================
 * 0. 가드
 * ====================================================================== */
const mainFrame = await figma.getNodeByIdAsync(TARGET_ID);
if (!mainFrame || mainFrame.name !== EXPECTED_FRAME_NAME) {
  return out({
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '대상 파일이 아님. ' + TARGET_ID + ' = ' + (mainFrame ? '"' + mainFrame.name + '"' : '없음')
  });
}

const sets = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT_SET'] });
const existingSet = sets.find(n => n.name === SET_NAME);
if (existingSet) {
  return out({
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: "'" + SET_NAME + "' 컴포넌트 세트가 이미 존재함 (id " + existingSet.id + "). 중복 생성하지 않음.",
    existingSetId: existingSet.id,
    existingVariants: existingSet.children.map(c => c.name)
  });
}

/* ========================================================================
 * 1. 사전 조건
 * ====================================================================== */
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colorCol = collections.find(c => c.name === 'Color');
const radiusCol = collections.find(c => c.name === 'Radius');
const spacingCol = collections.find(c => c.name === 'Spacing');

const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

const styles = await figma.getLocalTextStylesAsync();
const labelStyle = styles.find(s => s.name === 'Label');

const NEEDED_VARS = ['brand/primary', 'text/on-brand', 'surface/subtle', 'text/secondary',
                     'border/subtle', 'danger/strong', 'radius/md', 'space/12'];

const preflight = {
  colorCollection: !!colorCol,
  radiusCollection: !!radiusCol,
  spacingCollection: !!spacingCol,
  labelTextStyle: !!labelStyle
};
for (const n of NEEDED_VARS) preflight[n] = !!V[n];

const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight
  });
}

/* ========================================================================
 * 2. variant 정의
 * ====================================================================== */
const VARIANTS = [
  { key: 'primary',   bg: 'brand/primary',  fg: 'text/on-brand',  border: null,            sample: '기록 추가', usedInScreen: true  },
  { key: 'secondary', bg: 'surface/subtle', fg: 'text/secondary', border: 'border/subtle', sample: '취소',      usedInScreen: false },
  { key: 'ghost',     bg: null,             fg: 'text/secondary', border: null,            sample: '초기화',    usedInScreen: true  },
  { key: 'danger',    bg: 'danger/strong',  fg: 'text/on-brand',  border: null,            sample: '삭제',      usedInScreen: false }
];

const plan = VARIANTS.map(v => ({
  name: 'variant=' + v.key,
  height: HEIGHT + ' (고정, 세로 중앙 정렬)',
  horizontalPadding: 12,
  verticalPadding: 0,
  radius: 'radius/md (8)',
  textStyle: 'Label (13/18/500)',
  bg: v.bg || '(없음)',
  text: v.fg,
  border: v.border || '(없음)',
  sample: v.sample,
  화면에실제존재: v.usedInScreen ? '예 — ' + (v.key === 'primary' ? '기록 추가 버튼' : '초기화 버튼') : '아니오 (시스템용, 현재 화면에 적용하지 않음)'
}));

if (DRY_RUN) {
  return out({
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    componentSetWouldCreate: SET_NAME,
    variantsWouldCreate: plan,
    variablesWouldCreate: [],
    heightStrategy: '세로 padding 대신 고정 높이 ' + HEIGHT + ' + counterAxisAlignItems=CENTER. ' +
                    'Label 13/18 을 hug 하면 세로 padding 9 가 필요해 spacing scale 을 벗어나므로 이 방식을 쓴다.',
    leadingSlotNote: 'Chip 과 동일하게 12×12 leading 프레임을 visible=false 로 넣는다. ' +
                     '기록 추가(아이콘 9.3)·초기화(아이콘 10.7×12.3) 교체 시 오버라이드로 켠다.',
    scopeNote: '컴포넌트만 생성한다. 메인 화면 프레임은 읽기만 하며, secondary/danger 는 화면에 적용하지 않는다.',
    placement: 'Chip 세트 아래에 배치 (없으면 기존 프레임 우측 빈 공간)',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 3. 생성 (APPLY)
 * ====================================================================== */
await figma.loadFontAsync(labelStyle.fontName);

function boundPaint(varName) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[varName]);
}
function tryBind(node, field, varName) {
  try { node.setBoundVariable(field, V[varName]); return true; }
  catch (e) { notes.push('bind ' + field + ' 실패(값 직접 지정으로 대체): ' + e.message); return false; }
}

// 배치: Chip 세트 아래
const chipSet = sets.find(n => n.name === 'Chip');
let originX, originY;
if (chipSet) {
  originX = chipSet.x;
  originY = chipSet.y + chipSet.height + 64;
} else {
  originX = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0))) + 400;
  originY = -491;
  notes.push('Chip 세트를 찾지 못해 우측 빈 공간에 배치');
}

const created = [];
const comps = [];

for (const v of VARIANTS) {
  const c = figma.createComponent();
  c.name = 'variant=' + v.key;
  c.layoutMode = 'HORIZONTAL';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisAlignItems = 'CENTER';
  c.paddingTop = 0; c.paddingBottom = 0;
  c.paddingLeft = 12; c.paddingRight = 12;
  c.itemSpacing = 4;
  c.cornerRadius = 8;

  c.fills = v.bg ? [boundPaint(v.bg)] : [];
  if (v.border) {
    c.strokes = [boundPaint(v.border)];
    c.strokeWeight = 1;
    c.strokeAlign = 'INSIDE';
  } else {
    c.strokes = [];
  }

  tryBind(c, 'paddingLeft', 'space/12');
  tryBind(c, 'paddingRight', 'space/12');
  tryBind(c, 'itemSpacing', 'space/4');
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
    tryBind(c, f, 'radius/md');
  }

  // leading 슬롯 (기본 숨김)
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
  await t.setTextStyleIdAsync(labelStyle.id);
  t.characters = v.sample;
  t.fills = [boundPaint(v.fg)];
  t.name = 'label';
  t.textAutoResize = 'WIDTH_AND_HEIGHT';

  // 높이 고정 36 (resize 가 sizing mode 를 FIXED 로 되돌리므로 resize 를 먼저)
  c.resize(Math.max(c.width, 1), HEIGHT);
  c.primaryAxisSizingMode = 'AUTO';    // 가로는 내용에 맞춰 hug
  c.counterAxisSizingMode = 'FIXED';   // 세로는 36 고정

  figma.currentPage.appendChild(c);
  comps.push(c);
  created.push({
    variant: v.key, id: c.id,
    width: Math.round(c.width * 100) / 100,
    height: Math.round(c.height * 100) / 100
  });
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
    '액션 버튼. height 36 고정(세로 중앙 정렬), 가로 padding 12, radius 8, Label 13/18/500.\n' +
    'primary: 주요 액션(기록 추가) / secondary: 보조 액션 / ghost: 약한 액션(초기화) / danger: 삭제·영구 액션.\n' +
    'leading 프레임은 기본 숨김. 아이콘이 붙는 버튼은 인스턴스에서 표시로 바꿔 사용.\n' +
    'secondary·danger 는 시스템용으로, 현재 메인 화면에는 사용처가 없다.';
} catch (e) { notes.push('description 설정 실패: ' + e.message); }

// 검증
const allHeight36 = created.every(c => Math.abs(c.height - HEIGHT) < 0.01);
if (!allHeight36) errors.push('높이가 ' + HEIGHT + ' 이 아닌 variant 있음: ' + JSON.stringify(created));

return out({
  mode: 'APPLY',
  aborted: false,
  preflight,
  componentSetId: set.id,
  componentSetName: set.name,
  variantsCreated: created,
  allHeight36,
  placement: { x: set.x, y: set.y },
  createdNodeIds: [set.id].concat(comps.map(c => c.id)),
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
