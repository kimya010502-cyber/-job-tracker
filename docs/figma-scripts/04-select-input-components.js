/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 04
 * 5단계) Select 컴포넌트화 (state 3종)
 * 6단계) Input  컴포넌트화 (state 3종)
 *
 * 공통 확정 사양
 *   height            36px 고정 (세로 중앙 정렬 / 세로 padding 0)
 *   horizontal padding 12px (좌우 통일)
 *   radius            8 (radius/md)
 *   text              Label 스타일 (13 / 18 / 500)
 *   absolute 배치     사용하지 않음 — 화살표·아이콘 모두 Auto Layout 자식
 *   신규 color token  없음
 *
 * Select  state=default / focus / disabled
 *   default   bg surface/subtle + text/secondary + border border/subtle
 *   focus     default + border brand/primary 1px + elevation/focus-ring
 *   disabled  default + opacity 40%
 *   chevron   항상 보이는 trailing 자식 (hidden 슬롯 아님)
 *
 * Input   state=default / focus / disabled
 *   default   bg surface/subtle + border border/subtle, placeholder text/muted
 *   focus     default + border brand/primary 1px + elevation/focus-ring
 *   disabled  default + opacity 40%
 *   leading   12×12 아이콘 슬롯, 기본 hidden (Chip·Button 과 동일 방식)
 *
 * 판단이 필요했던 것 — 아래 3가지는 지시에 명시되지 않아 정하고 보고한다
 *   1) Input 기본 폭 240 고정 (현재 검색창 249 에 가장 가까운 정수. 배치 시 FILL 로 덮어쓰면 됨)
 *      Select 는 라벨 길이에 맞춰 hug (현재 셀렉트들이 121.7~128 로 제각각인 것과 같은 성격)
 *   2) Input 의 '값이 입력된 상태'는 variant 로 만들지 않는다.
 *      텍스트 노드 하나를 placeholder(text/muted)로 두고, 값이 있는 인스턴스에서
 *      텍스트 색만 text/primary 로 오버라이드한다. (variant 를 늘리지 말라는 지시에 따름)
 *   3) leading 슬롯은 12×12 로 통일 (Chip·Button 과 동일). 현재 검색 아이콘은 13.5 라
 *      교체 시 0.75px 줄어든다. 13.5 는 스케일 밖 값이라 12 를 택했다.
 *
 * 실행법
 *   1) DRY_RUN = true  로 실행 → 사전 조건만 검사하고 아무것도 만들지 않는다
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *
 * 멱등성
 *   'Select' / 'Input' 세트가 이미 있으면 그것만 건너뛰고 나머지를 만든다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';    // 파일 확인용. 이 프레임은 수정하지 않는다
const HEIGHT = 36;
const INPUT_WIDTH = 240;

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
const existing = {
  Select: sets.find(n => n.name === 'Select') || null,
  Input: sets.find(n => n.name === 'Input') || null
};
const todo = ['Select', 'Input'].filter(n => !existing[n]);
for (const n of ['Select', 'Input']) {
  if (existing[n]) notes.push(n + " 세트가 이미 존재함 (id " + existing[n].id + ") — 건너뜀");
}
if (todo.length === 0) {
  return out({
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: 'Select / Input 세트가 둘 다 이미 존재함. 만들 것이 없음.',
    existingSelectId: existing.Select && existing.Select.id,
    existingInputId: existing.Input && existing.Input.id
  });
}

/* ========================================================================
 * 1. 사전 조건
 * ====================================================================== */
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

const textStyles = await figma.getLocalTextStylesAsync();
const labelStyle = textStyles.find(s => s.name === 'Label');

const effectStyles = await figma.getLocalEffectStylesAsync();
const focusRing = effectStyles.find(s => s.name === 'elevation/focus-ring');

const NEEDED_VARS = ['surface/subtle', 'text/secondary', 'text/muted', 'text/primary',
                     'border/subtle', 'brand/primary', 'radius/md', 'space/12', 'space/8'];

const preflight = {
  colorCollection: !!collections.find(c => c.name === 'Color'),
  radiusCollection: !!collections.find(c => c.name === 'Radius'),
  spacingCollection: !!collections.find(c => c.name === 'Spacing'),
  labelTextStyle: !!labelStyle,
  focusRingEffectStyle: !!focusRing
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
 * 2. state 정의 (Select / Input 공용)
 * ====================================================================== */
const STATES = [
  { key: 'default',  border: 'border/subtle',  opacity: 1,   focus: false, usedInScreen: true  },
  { key: 'focus',    border: 'brand/primary',  opacity: 1,   focus: true,  usedInScreen: false },
  { key: 'disabled', border: 'border/subtle',  opacity: 0.4, focus: false, usedInScreen: false }
];

function planFor(kind) {
  return STATES.map(s => ({
    name: 'state=' + s.key,
    component: kind,
    height: HEIGHT + ' (고정, 세로 중앙 정렬)',
    width: kind === 'Input' ? INPUT_WIDTH + ' 고정' : '내용에 맞춰 hug',
    horizontalPadding: 12,
    verticalPadding: 0,
    radius: 'radius/md (8)',
    background: 'surface/subtle',
    text: kind === 'Select' ? 'text/secondary' : 'text/muted (placeholder)',
    border: s.border + ' 1px',
    effect: s.focus ? 'elevation/focus-ring' : '(없음)',
    opacity: s.opacity,
    trailing: kind === 'Select' ? 'chevron — 항상 표시되는 Auto Layout 자식' : '(없음)',
    leading: kind === 'Input' ? '12×12 슬롯, 기본 hidden' : '(없음)',
    화면에실제존재: s.usedInScreen
      ? (kind === 'Select' ? '예 — 필터 셀렉트 4개' : '예 — 검색 입력')
      : '아니오 (시스템 variant, 현재 화면에 적용하지 않음)'
  }));
}

if (DRY_RUN) {
  return out({
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    componentSetsWouldCreate: todo,
    alreadyExisting: Object.keys(existing).filter(k => existing[k]),
    variantsWouldCreate: [].concat(
      todo.includes('Select') ? planFor('Select') : [],
      todo.includes('Input') ? planFor('Input') : []
    ),
    variablesWouldCreate: [],
    heightStrategy: '세로 padding 대신 고정 높이 ' + HEIGHT + ' + counterAxisAlignItems=CENTER. ' +
                    'spacing scale 밖의 세로 padding 값을 만들지 않는다.',
    absolutePositioning: '사용하지 않음. Select 의 chevron 은 trailing 자식, Input 의 아이콘은 leading 자식.',
    decisionsIMade: [
      'Input 기본 폭 ' + INPUT_WIDTH + ' 고정 / Select 는 hug',
      "Input 의 '값 입력됨' 상태는 variant 로 만들지 않고 텍스트 색 오버라이드(text/primary)로 처리",
      'leading 슬롯 12×12 로 통일 (현재 검색 아이콘 13.5 → 12 로 줄어듦)'
    ],
    scopeNote: '컴포넌트만 생성. 메인 화면 프레임은 읽기만 하며, focus/disabled 는 화면에 적용하지 않는다.',
    placement: 'Button 세트 아래 (없으면 Chip 아래, 그것도 없으면 우측 빈 공간)',
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

function makeChevron() {
  try {
    const v = figma.createVector();
    v.name = 'chevron';
    v.vectorPaths = [{ windingRule: 'NONE', data: 'M 2 4.5 L 6 8.5 L 10 4.5' }];
    v.fills = [];
    v.strokes = [boundPaint('text/muted')];
    v.strokeWeight = 1.5;
    v.strokeCap = 'ROUND';
    v.strokeJoin = 'ROUND';
    v.resize(12, 12);
    return v;
  } catch (e) {
    notes.push('chevron 벡터 생성 실패 → 빈 12×12 프레임으로 대체: ' + e.message);
    const f = figma.createFrame();
    f.name = 'chevron';
    f.resize(12, 12);
    f.fills = [];
    return f;
  }
}

// 배치 기준점
const buttonSet = sets.find(n => n.name === 'Button');
const chipSet = sets.find(n => n.name === 'Chip');
const anchor = buttonSet || chipSet || null;
let originX, originY;
if (anchor) {
  originX = anchor.x;
  originY = anchor.y + anchor.height + 64;
} else {
  originX = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0))) + 400;
  originY = -491;
  notes.push('Button/Chip 세트를 찾지 못해 우측 빈 공간에 배치');
}

async function buildSet(kind) {
  const comps = [];
  const rows = [];

  for (const s of STATES) {
    const c = figma.createComponent();
    c.name = 'state=' + s.key;
    c.layoutMode = 'HORIZONTAL';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingTop = 0; c.paddingBottom = 0;
    c.paddingLeft = 12; c.paddingRight = 12;
    c.itemSpacing = 8;
    c.cornerRadius = 8;
    c.fills = [boundPaint('surface/subtle')];
    c.strokes = [boundPaint(s.border)];
    c.strokeWeight = 1;
    c.strokeAlign = 'INSIDE';

    tryBind(c, 'paddingLeft', 'space/12');
    tryBind(c, 'paddingRight', 'space/12');
    tryBind(c, 'itemSpacing', 'space/8');
    for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
      tryBind(c, f, 'radius/md');
    }

    if (kind === 'Input') {
      const lead = figma.createFrame();
      lead.name = 'leading';
      lead.resize(12, 12);
      lead.fills = [];
      c.appendChild(lead);
      lead.layoutSizingHorizontal = 'FIXED';
      lead.layoutSizingVertical = 'FIXED';
      lead.visible = false;      // boolean/visibility 오버라이드 전용
    }

    const t = figma.createText();
    c.appendChild(t);
    await t.setTextStyleIdAsync(labelStyle.id);
    t.name = kind === 'Input' ? 'placeholder' : 'label';
    t.characters = kind === 'Input' ? '기업명, 직무 검색' : '지원 상태: 전체';
    t.fills = [boundPaint(kind === 'Input' ? 'text/muted' : 'text/secondary')];

    let chev = null;
    if (kind === 'Select') {
      chev = makeChevron();
      c.appendChild(chev);
      chev.layoutSizingHorizontal = 'FIXED';
      chev.layoutSizingVertical = 'FIXED';
    }

    // 크기 확정: resize 가 sizing mode 를 FIXED 로 되돌리므로 resize 를 먼저
    if (kind === 'Input') {
      c.resize(INPUT_WIDTH, HEIGHT);
      c.primaryAxisSizingMode = 'FIXED';
      c.counterAxisSizingMode = 'FIXED';
      t.textAutoResize = 'HEIGHT';
      t.layoutSizingHorizontal = 'FILL';
    } else {
      c.resize(Math.max(c.width, 1), HEIGHT);
      c.primaryAxisSizingMode = 'AUTO';
      c.counterAxisSizingMode = 'FIXED';
      t.textAutoResize = 'WIDTH_AND_HEIGHT';
    }

    if (s.focus && focusRing) {
      try { await c.setEffectStyleIdAsync(focusRing.id); }
      catch (e) { notes.push(kind + ' focus 이펙트 적용 실패: ' + e.message); }
    }
    if (s.opacity !== 1) c.opacity = s.opacity;

    figma.currentPage.appendChild(c);
    comps.push(c);
    rows.push({
      component: kind, state: s.key, id: c.id,
      width: Math.round(c.width * 100) / 100,
      height: Math.round(c.height * 100) / 100,
      opacity: c.opacity,
      hasChevron: !!chev
    });
  }

  const set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = kind;
  set.x = originX;
  set.y = originY + (kind === 'Input' ? 220 : 0);
  try {
    set.layoutMode = 'VERTICAL';
    set.primaryAxisSizingMode = 'AUTO';
    set.counterAxisSizingMode = 'AUTO';
    set.itemSpacing = 12;
    set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
  } catch (e) { notes.push(kind + ' variant set 레이아웃 설정 실패: ' + e.message); }

  try {
    set.description = kind === 'Select'
      ? '드롭다운 셀렉트. height 36 고정(세로 중앙 정렬), 좌우 padding 12, radius 8, Label 13/18/500.\n' +
        'chevron 은 absolute 가 아니라 항상 표시되는 trailing Auto Layout 자식이다.\n' +
        'state: default(화면 사용) / focus / disabled(opacity 40%).'
      : '텍스트 입력. height 36 고정(세로 중앙 정렬), 좌우 padding 12, radius 8, 기본 폭 ' + INPUT_WIDTH + '.\n' +
        'placeholder 는 text/muted. 값이 입력된 상태는 인스턴스에서 텍스트 색을 text/primary 로 오버라이드한다.\n' +
        'leading 12×12 슬롯은 기본 숨김 — 검색 아이콘처럼 필요한 곳에서만 표시로 바꾼다.\n' +
        'state: default(화면 사용) / focus / disabled(opacity 40%).';
  } catch (e) { notes.push(kind + ' description 설정 실패: ' + e.message); }

  return { set, rows, comps };
}

const results = {};
const createdNodeIds = [];
for (const kind of todo) {
  const r = await buildSet(kind);
  results[kind] = r;
  createdNodeIds.push(r.set.id);
  for (const c of r.comps) createdNodeIds.push(c.id);
}

const allRows = [].concat(...Object.keys(results).map(k => results[k].rows));
const allHeight36 = allRows.every(r => Math.abs(r.height - HEIGHT) < 0.01);
if (!allHeight36) errors.push('높이가 ' + HEIGHT + ' 이 아닌 variant 있음: ' + JSON.stringify(allRows));

return out({
  mode: 'APPLY',
  aborted: false,
  preflight,
  componentSetsCreated: Object.keys(results).map(k => ({ name: k, id: results[k].set.id })),
  variantsCreated: allRows,
  allHeight36,
  createdNodeIds,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
