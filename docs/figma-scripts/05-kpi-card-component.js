/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 05
 * 7단계) KPI Card 컴포넌트화 (delta 3종)
 *
 * 확정 사양
 *   background   surface/default        border  없음 (지시로 확정)
 *   shadow       elevation/card         radius  radius/md (8)
 *   padding      16                     기본 폭 235 (배치 시 FILL)
 *   숫자         KPI number (28/34/700) + text/primary
 *   라벨·단위·캡션 Caption (12/16/400)   + text/muted
 *   배지         Chip 인스턴스 재사용 (새 배지 컴포넌트를 만들지 않는다)
 *   absolute     전부 제거 — 숫자 블록과 델타 영역을 Auto Layout 형제로 바꾼다
 *   신규 토큰    없음
 *
 * delta variant (A안 확정)
 *   positive → Chip tone=success    negative → Chip tone=danger    neutral → Chip tone=neutral
 *   brand tone 은 KPI delta 에 쓰지 않는다. 브랜드 강조(활성 메뉴·접수완료)에만 남긴다.
 *   → 현재 카드 1 "+12 전월 대비" 는 brand 에서 success 로 바뀐다 (의도된 변경).
 *
 * 높이 86 이 유지되는 계산
 *   16(padding) + 16(label) + 4(value row padding-top) + 34(value row) + 16(padding) = 86
 *   value row 높이 = max(number 34, unit 16, caption 16, badge 24) = 34
 *   현재 카드 높이 86 과 정확히 같다. absolute 를 걷어내도 화면 크기가 변하지 않는다.
 *
 * 4 개 카드 동일 높이 전략
 *   카드 자신 : 세로 hug (콘텐츠 기반)
 *   KPI Strip : counterAxisAlignItems = STRETCH + 카드 layoutSizingHorizontal = FILL
 *   카드 내부 : primaryAxisAlignItems = SPACE_BETWEEN → 늘어나도 라벨 위 / 값 아래 고정
 *   4px 간격을 itemSpacing 이 아니라 value row 의 padding-top 으로 둔 이유:
 *     SPACE_BETWEEN 을 쓰면 hug 상태에서 itemSpacing 이 무시되어 높이가 82 로 줄어든다.
 *     현재 디자인도 Margin 래퍼의 pt-4 로 같은 효과를 내고 있다.
 *
 * caption ("파이프라인 70.0%" 등)
 *   4개 카드 중 2개에만 있다. 기본 hidden 텍스트로 두고 인스턴스에서 표시로 바꾼다.
 *   Chip·Button·Input 의 leading 슬롯과 같은 방식 — boolean 속성을 새로 만들지 않는다.
 *
 * 범위
 *   컴포넌트 생성만 한다. 메인 화면 프레임(1002:2)은 읽기만 하고 수정하지 않는다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 사전 조건만 검사, 아무것도 만들지 않음
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';
const SET_NAME = 'KPI Card';
const CARD_WIDTH = 235;
const EXPECTED_HEIGHT = 86;

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
    reason: "'" + SET_NAME + "' 세트가 이미 존재함 (id " + existingSet.id + "). 중복 생성하지 않음.",
    existingSetId: existingSet.id,
    existingVariants: existingSet.children.map(c => c.name)
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
const captionStyle = textStyles.find(s => s.name === 'Caption');
const kpiStyle = textStyles.find(s => s.name === 'KPI number');
const chipStyle = textStyles.find(s => s.name === 'Chip');

const effectStyles = await figma.getLocalEffectStylesAsync();
const cardShadow = effectStyles.find(s => s.name === 'elevation/card');

// Chip 컴포넌트 세트와 필요한 tone variant
const chipSet = sets.find(n => n.name === 'Chip');
const CHIP_TONE = { positive: 'tone=success', negative: 'tone=danger', neutral: 'tone=neutral' };
const chipVariant = {};
if (chipSet) {
  for (const k of Object.keys(CHIP_TONE)) {
    chipVariant[k] = chipSet.children.find(c => c.name === CHIP_TONE[k]) || null;
  }
}

const NEEDED_VARS = ['surface/default', 'text/primary', 'text/muted',
                     'radius/md', 'space/16', 'space/8', 'space/4'];

const preflight = {
  captionTextStyle: !!captionStyle,
  kpiNumberTextStyle: !!kpiStyle,
  chipTextStyle: !!chipStyle,
  cardShadowEffectStyle: !!cardShadow,
  chipComponentSet: !!chipSet,
  'Chip tone=success': !!chipVariant.positive,
  'Chip tone=danger': !!chipVariant.negative,
  'Chip tone=neutral': !!chipVariant.neutral
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
  { key: 'positive', chipTone: 'tone=success', label: '진행 중',        number: '14', badge: '+8',            screen: '카드 2 (진행 중). 카드 1 "+12 전월 대비" 도 여기로 통합 — brand → success' },
  { key: 'negative', chipTone: 'tone=danger',  label: '이번 달 불합격', number: '6',  badge: '+4',            screen: '카드 3 (이번 달 불합격)' },
  { key: 'neutral',  chipTone: 'tone=neutral', label: '최종 합격',      number: '0',  badge: '시즌 목표 1개사', screen: '카드 4 (최종 합격)' }
];

const plan = VARIANTS.map(v => ({
  name: 'delta=' + v.key,
  badgeComponent: 'Chip 인스턴스 · ' + v.chipTone,
  width: CARD_WIDTH + ' (배치 시 FILL)',
  height: EXPECTED_HEIGHT + ' (콘텐츠 hug — 16+16+4+34+16)',
  padding: 16,
  radius: 'radius/md (8)',
  background: 'surface/default',
  border: '없음',
  shadow: 'elevation/card',
  number: 'KPI number + text/primary',
  labelUnitCaption: 'Caption + text/muted',
  caption: '기본 hidden (인스턴스에서 표시)',
  sample: v.label + ' / ' + v.number + ' 건 / ' + v.badge,
  화면매핑: v.screen
}));

if (DRY_RUN) {
  return out({
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    componentSetWouldCreate: SET_NAME,
    variantsWouldCreate: plan,
    variablesWouldCreate: [],
    hierarchy: [
      'KPI Card            VERTICAL · padding 16 · SPACE_BETWEEN · radius 8 · shadow · border 없음',
      '├ label             TEXT Caption · width FILL',
      '└ value row         HORIZONTAL · width FILL · SPACE_BETWEEN · align CENTER · padding-top 4',
      '  ├ value           HORIZONTAL · gap 4 · align BASELINE',
      '  │ ├ number        TEXT KPI number',
      '  │ └ unit          TEXT Caption ("건")',
      '  └ meta            HORIZONTAL · gap 8 · align CENTER',
      '    ├ caption       TEXT Caption · 기본 hidden',
      '    └ badge         INSTANCE of Chip'
    ],
    heightMath: '16 + 16(label) + 4(value row padding-top) + 34(value row) + 16 = ' + EXPECTED_HEIGHT +
                ' — 현재 카드 높이와 동일',
    equalHeightStrategy: '카드는 세로 hug. KPI Strip 에서 counterAxisAlignItems=STRETCH + 카드 FILL 로 같은 행 높이를 맞추고, ' +
                         '카드 내부 SPACE_BETWEEN 으로 라벨 위 / 값 아래를 고정한다.',
    absolutePositioning: '제거. 숫자 블록과 델타 영역이 Auto Layout 형제가 된다 (현재는 둘 다 absolute, top 13 vs 15 로 어긋나 있음).',
    reuseNote: '배지는 새로 만들지 않고 Chip 인스턴스를 쓴다. 아이콘이 필요한 카드는 Chip 의 leading 슬롯을 켠다.',
    scopeNote: '컴포넌트만 생성. 메인 화면 프레임은 읽기만 하며, 기존 KPI 카드 4개는 이 단계에서 교체하지 않는다 (11단계).',
    placement: 'Input 세트 아래 (없으면 Select/Button/Chip 순, 그것도 없으면 우측 빈 공간)',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 3. 생성 (APPLY)
 * ====================================================================== */
await figma.loadFontAsync(captionStyle.fontName);
await figma.loadFontAsync(kpiStyle.fontName);
await figma.loadFontAsync(chipStyle.fontName);

function boundPaint(varName) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[varName]);
}
function tryBind(node, field, varName) {
  try { node.setBoundVariable(field, V[varName]); return true; }
  catch (e) { notes.push('bind ' + field + ' 실패(값 직접 지정으로 대체): ' + e.message); return false; }
}
async function mkText(parent, name, style, colorVar, chars) {
  const t = figma.createText();
  parent.appendChild(t);
  await t.setTextStyleIdAsync(style.id);
  t.name = name;
  t.characters = chars;
  t.fills = [boundPaint(colorVar)];
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  return t;
}

// 배치 기준점
const anchorNames = ['Input', 'Select', 'Button', 'Chip'];
let anchor = null;
for (const n of anchorNames) { anchor = sets.find(s => s.name === n); if (anchor) break; }
let originX, originY;
if (anchor) {
  originX = anchor.x;
  originY = anchor.y + anchor.height + 64;
} else {
  originX = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0))) + 400;
  originY = -491;
  notes.push('기준 컴포넌트 세트를 찾지 못해 우측 빈 공간에 배치');
}

const created = [];
const comps = [];

for (const v of VARIANTS) {
  const card = figma.createComponent();
  card.name = 'delta=' + v.key;
  card.layoutMode = 'VERTICAL';
  card.counterAxisAlignItems = 'MIN';
  card.paddingTop = 16; card.paddingBottom = 16;
  card.paddingLeft = 16; card.paddingRight = 16;
  card.cornerRadius = 8;
  card.fills = [boundPaint('surface/default')];
  card.strokes = [];                       // 보더 없음 (확정)

  for (const f of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) tryBind(card, f, 'space/16');
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) tryBind(card, f, 'radius/md');

  try { await card.setEffectStyleIdAsync(cardShadow.id); }
  catch (e) { notes.push('card shadow 적용 실패: ' + e.message); }

  // 1) 라벨
  const label = await mkText(card, 'label', captionStyle, 'text/muted', v.label);

  // 2) value row
  const row = figma.createFrame();
  row.name = 'value row';
  row.layoutMode = 'HORIZONTAL';
  row.counterAxisAlignItems = 'CENTER';
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.fills = [];
  row.paddingTop = 4;                      // SPACE_BETWEEN 은 hug 에서 itemSpacing 을 무시하므로 padding 으로
  card.appendChild(row);
  tryBind(row, 'paddingTop', 'space/4');

  //   2-1) 숫자 + 단위
  const value = figma.createFrame();
  value.name = 'value';
  value.layoutMode = 'HORIZONTAL';
  value.counterAxisAlignItems = 'BASELINE';
  value.itemSpacing = 4;
  value.fills = [];
  row.appendChild(value);
  tryBind(value, 'itemSpacing', 'space/4');
  await mkText(value, 'number', kpiStyle, 'text/primary', v.number);
  await mkText(value, 'unit', captionStyle, 'text/muted', '건');

  //   2-2) 캡션 + 배지
  const meta = figma.createFrame();
  meta.name = 'meta';
  meta.layoutMode = 'HORIZONTAL';
  meta.counterAxisAlignItems = 'CENTER';
  meta.itemSpacing = 8;
  meta.fills = [];
  row.appendChild(meta);
  tryBind(meta, 'itemSpacing', 'space/8');

  const caption = await mkText(meta, 'caption', captionStyle, 'text/muted', '파이프라인 70.0%');
  caption.visible = false;                 // 4개 중 2개만 사용 — 인스턴스에서 표시

  const chipComp = chipSet.children.find(c => c.name === v.chipTone);
  const badge = chipComp.createInstance();
  badge.name = 'badge';
  meta.appendChild(badge);
  try {
    const badgeLabel = badge.findOne(n => n.type === 'TEXT');
    if (badgeLabel) badgeLabel.characters = v.badge;
    else notes.push(v.key + ' 배지 텍스트 노드를 찾지 못함');
  } catch (e) { notes.push(v.key + ' 배지 텍스트 수정 실패: ' + e.message); }

  // 3) 크기 확정 (resize 가 sizing mode 를 되돌리므로 resize 를 먼저)
  card.resize(CARD_WIDTH, Math.max(card.height, 1));
  card.primaryAxisSizingMode = 'AUTO';     // 세로 = 콘텐츠 hug
  card.counterAxisSizingMode = 'FIXED';    // 가로 = 235 고정 (배치 시 FILL)
  card.primaryAxisAlignItems = 'SPACE_BETWEEN';

  label.layoutSizingHorizontal = 'FILL';
  row.layoutSizingHorizontal = 'FILL';
  row.layoutSizingVertical = 'HUG';

  figma.currentPage.appendChild(card);
  comps.push(card);
  created.push({
    delta: v.key, id: card.id,
    width: Math.round(card.width * 100) / 100,
    height: Math.round(card.height * 100) / 100,
    badgeTone: v.chipTone,
    badgeIsInstance: badge.type === 'INSTANCE'
  });
}

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
    '상단 요약 지표 카드. padding 16, radius 8, shadow elevation/card, 보더 없음.\n' +
    '높이는 콘텐츠 hug(86). KPI Strip 에서 STRETCH + FILL 로 4장 높이를 맞추고, 내부 SPACE_BETWEEN 으로 라벨 위/값 아래를 고정한다.\n' +
    'delta: positive(Chip success) / negative(Chip danger) / neutral(Chip neutral). brand tone 은 쓰지 않는다.\n' +
    'caption 은 기본 숨김 — "파이프라인 70.0%" 처럼 보조 수치가 있는 카드에서만 표시한다.\n' +
    '배지는 Chip 인스턴스다. 아이콘이 필요하면 Chip 의 leading 슬롯을 켠다.';
} catch (e) { notes.push('description 설정 실패: ' + e.message); }

const allHeightOk = created.every(c => Math.abs(c.height - EXPECTED_HEIGHT) < 0.5);
if (!allHeightOk) {
  errors.push('높이가 ' + EXPECTED_HEIGHT + ' 이 아닌 variant 있음: ' + JSON.stringify(created));
}
const allBadgesAreInstances = created.every(c => c.badgeIsInstance);

return out({
  mode: 'APPLY',
  aborted: false,
  preflight,
  componentSetId: set.id,
  componentSetName: set.name,
  variantsCreated: created,
  expectedHeight: EXPECTED_HEIGHT,
  allHeightOk,
  allBadgesAreInstances,
  placement: { x: set.x, y: set.y },
  createdNodeIds: [set.id].concat(comps.map(c => c.id)),
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
