/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 06
 * 8단계) Status Indicator · Icon Button · Application Card 생성
 *
 * 의존 순서대로 한 스크립트에서 만든다.
 *   1) Status Indicator  (state = inProgress / ended)
 *   2) Icon Button       (단일 컴포넌트)
 *   3) Application Card  (state = inProgress / ended) — 위 둘과 Chip 을 인스턴스로 참조
 *
 * Status Indicator
 *   outer 18×18 · padding 4 · radius full · fill = soft
 *   inner 10×10 · radius full · fill = strong
 *   effect / shadow 를 쓰지 않는다. 기존 semantic token 만으로 ring 을 표현한다.
 *   inProgress: brand/surface + brand/strong      ended: danger/soft + danger/strong
 *
 * Icon Button
 *   24×24 고정 · ghost(fill·stroke 없음) · radius/sm(4) · icon 슬롯 12×12
 *   여백 (24−12)/2 = 6 (스케일 값). variant 없음. 기존 Button 세트는 건드리지 않는다.
 *
 * Application Card
 *   padding 16 · gap 12 · radius 8 · surface/default · border/subtle · elevation/card
 *   직속 자식 3개: header / info / footer  (기존의 래퍼 2겹 제거)
 *   Chip · Status Indicator · Icon Button 을 전부 인스턴스로 재사용한다.
 *   absolute positioning 을 쓰지 않는다.
 *
 * gap 12 를 itemSpacing 이 아니라 info 의 상하 padding 으로 두는 이유
 *   primaryAxisAlignItems = SPACE_BETWEEN 을 쓰면 hug 상태에서 itemSpacing 이 무시된다.
 *   (KPI Card 에서 확인된 동작) SPACE_BETWEEN 은 footer 하단 정렬에 필요하므로,
 *   header↔info 와 info↔footer 간격을 info 의 paddingTop / paddingBottom 12 로 준다.
 *   footer 의 paddingTop 8 은 구분선과 내용 사이 간격이라 별개다.
 *
 * 예상 높이 (강제하지 않는다 — 실측으로 검증만 한다)
 *   16 + 24(header) + 128(info = 12 + 104 + 12) + 32(footer = 8 + 24) + 16 = 216
 *   info 행 = 24(칩) + 24(칩) + 16 + 16 = 80, 행 간격 8×3 = 24 → 104
 *   현재 실측 211 대비 +5. 새 Chip 24 와 Caption 12 의 결과다.
 *
 * 범위
 *   컴포넌트 원형만 만든다. 메인 화면의 기존 카드 12장은 교체하지 않는다 (11단계).
 *
 * 실행법
 *   1) DRY_RUN = true  → 사전 조건만 검사, 아무것도 만들지 않음
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';

const SI_NAME = 'Status Indicator';
const IB_NAME = 'Icon Button';
const AC_NAME = 'Application Card';

const HEIGHT_ESTIMATE = 216;   // 참고값. 이 숫자에 맞추려고 padding/gap 을 조정하지 않는다.

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;

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
const loneComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => !c.parent || c.parent.type !== 'COMPONENT_SET');

const existingAC = sets.find(n => n.name === AC_NAME);
if (existingAC) {
  return out({
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: "'" + AC_NAME + "' 세트가 이미 존재함 (id " + existingAC.id + "). 아무것도 삭제하지 않았다.",
    existingId: existingAC.id
  });
}
const existingSI = sets.find(n => n.name === SI_NAME) || null;
const existingIB = loneComps.find(n => n.name === IB_NAME) || null;
if (existingSI) notes.push(SI_NAME + ' 이미 존재 (' + existingSI.id + ') — 새로 만들지 않고 재사용');
if (existingIB) notes.push(IB_NAME + ' 이미 존재 (' + existingIB.id + ') — 새로 만들지 않고 재사용');

/* ========================================================================
 * 1. 사전 조건
 * ====================================================================== */
const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

const textStyles = await figma.getLocalTextStylesAsync();
const stCardTitle = textStyles.find(s => s.name === 'Card title');
const stCaption = textStyles.find(s => s.name === 'Caption');
const stChip = textStyles.find(s => s.name === 'Chip');

const effectStyles = await figma.getLocalEffectStylesAsync();
const cardShadow = effectStyles.find(s => s.name === 'elevation/card');

const chipSet = sets.find(n => n.name === 'Chip');
const chipTone = {};
if (chipSet) {
  for (const t of ['neutral', 'brand', 'danger']) {
    chipTone[t] = chipSet.children.find(c => c.name === 'tone=' + t) || null;
  }
}

const NEEDED_VARS = ['surface/default', 'border/subtle', 'text/primary', 'text/muted',
                     'brand/surface', 'brand/strong', 'danger/soft', 'danger/strong',
                     'radius/md', 'radius/sm', 'radius/full',
                     'space/16', 'space/12', 'space/8', 'space/6', 'space/4'];

const preflight = {
  cardTitleStyle: !!stCardTitle,
  captionStyle: !!stCaption,
  chipStyle: !!stChip,
  cardShadowStyle: !!cardShadow,
  chipComponentSet: !!chipSet,
  'Chip tone=neutral': !!chipTone.neutral,
  'Chip tone=brand': !!chipTone.brand,
  'Chip tone=danger': !!chipTone.danger
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
 * 2. 계획
 * ====================================================================== */
const CARD_STATES = [
  { key: 'inProgress', si: 'state=inProgress', statusChipTone: 'brand',  statusLabel: '접수완료',
    company: '피아스페이스', position: '제품 기획', stage: '서류', applied: '2026.09.09', schedule: '-', count: '1' },
  { key: 'ended',      si: 'state=ended',      statusChipTone: 'danger', statusLabel: '불합격',
    company: '카카오',     position: '제품 기획', stage: '서류', applied: '2026.09.09', schedule: '-', count: '1' }
];

if (DRY_RUN) {
  return out({
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    wouldCreate: [
      existingSI ? null : SI_NAME + ' (COMPONENT_SET · state=inProgress/ended)',
      existingIB ? null : IB_NAME + ' (단일 COMPONENT)',
      AC_NAME + ' (COMPONENT_SET · state=inProgress/ended)'
    ].filter(Boolean),
    reuseExisting: [existingSI ? SI_NAME : null, existingIB ? IB_NAME : null].filter(Boolean),
    variablesWouldCreate: [],
    statusIndicator: {
      outer: '18×18 · padding 4 · radius full',
      inner: '10×10 · radius full',
      inProgress: 'outer brand/surface / inner brand/strong',
      ended: 'outer danger/soft / inner danger/strong',
      effects: '없음 (shadow 미사용)'
    },
    iconButton: {
      size: '24×24 고정', fill: '없음 (ghost)', stroke: '없음',
      radius: 'radius/sm (4)', iconSlot: '12×12', padding: '(24-12)/2 = 6',
      note: 'icon 슬롯은 비어 있다. 글리프가 버튼마다 달라 기본값을 두지 않았고, 11단계에서 기존 벡터를 옮겨 넣는다.'
    },
    applicationCard: {
      hierarchy: [
        'Application Card  VERTICAL · padding 16 · SPACE_BETWEEN · radius 8 · border/subtle · elevation/card',
        '├ header          HORIZONTAL · FILL · SPACE_BETWEEN · CENTER',
        '│ ├ identity      HORIZONTAL · gap 8 · CENTER · hug',
        '│ │ ├ status      INSTANCE Status Indicator',
        '│ │ └ company     TEXT Card title · text/primary',
        '│ └ position      INSTANCE Chip tone=neutral',
        '├ info            VERTICAL · FILL · gap 8 · padding-top 12 · padding-bottom 12',
        '│ ├ row stage     label(Caption·muted) + INSTANCE Chip tone=neutral',
        '│ ├ row status    label + INSTANCE Chip (brand / danger)',
        '│ ├ row applied   label + TEXT Caption · text/primary',
        '│ └ row schedule  label + TEXT Caption · text/primary',
        '└ footer          HORIZONTAL · FILL · SPACE_BETWEEN · CENTER · border-top · padding-top 8',
        '  ├ stage count   INSTANCE Chip tone=neutral (leading 슬롯 ON)',
        '  └ actions       HORIZONTAL · gap 4 · INSTANCE Icon Button ×2'
      ],
      heightEstimate: HEIGHT_ESTIMATE,
      heightMath: '16 + 24(header) + 128(info: 12 + 104 + 12) + 32(footer: 8 + 24) + 16 = ' + HEIGHT_ESTIMATE,
      heightPolicy: '이 숫자에 맞추려고 padding/gap 을 조정하지 않는다. content hug 로 만들고 실측만 보고한다.',
      gapNote: 'SPACE_BETWEEN 은 hug 에서 itemSpacing 을 무시하므로 gap 12 를 info 의 상하 padding 으로 둔다.',
      instanceReuse: 'Chip ×4 (position / stage / status / stage count), Status Indicator ×1, Icon Button ×2'
    },
    card10Note: 'Card 10 의 justify-between 누락은 인스턴스 교체(11단계)로 자동 해소된다.',
    scopeNote: '컴포넌트 원형만 만든다. 메인 화면의 카드 12장은 이 단계에서 교체하지 않는다.',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 3. 생성 (APPLY)
 * ====================================================================== */
await figma.loadFontAsync(stCardTitle.fontName);
await figma.loadFontAsync(stCaption.fontName);
await figma.loadFontAsync(stChip.fontName);

function boundPaint(varName) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[varName]);
}
function tryBind(node, field, varName) {
  try { node.setBoundVariable(field, V[varName]); return true; }
  catch (e) { notes.push('bind ' + field + '←' + varName + ' 실패: ' + e.message); return false; }
}
function bindRadius(node, varName) {
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) tryBind(node, f, varName);
}
function autoFrame(name, dir) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  f.primaryAxisSizingMode = 'AUTO';     // createFrame 은 100×100 FIXED — 반드시 명시
  f.counterAxisSizingMode = 'AUTO';
  f.fills = [];
  f.strokes = [];
  return f;
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
function chipInstance(tone, label, showLeading) {
  const inst = chipTone[tone].createInstance();
  try {
    const t = inst.findOne(n => n.type === 'TEXT');
    if (t) t.characters = label;
  } catch (e) { notes.push('칩 텍스트 수정 실패(' + label + '): ' + e.message); }
  if (showLeading) {
    try {
      const lead = inst.findOne(n => n.name === 'leading');
      if (lead) lead.visible = true; else notes.push('leading 슬롯을 찾지 못함');
    } catch (e) { notes.push('leading 표시 실패: ' + e.message); }
  }
  return inst;
}

// 배치 기준점
let anchor = null;
for (const n of ['KPI Card', 'Input', 'Select', 'Button', 'Chip']) {
  anchor = sets.find(s => s.name === n); if (anchor) break;
}
const originX = anchor ? anchor.x : Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0))) + 400;
let originY = anchor ? anchor.y + anchor.height + 64 : -491;

const createdNodeIds = [];

/* ---------- 3-1. Status Indicator ---------- */
let siSet = existingSI;
const siCreated = [];
if (!siSet) {
  const siComps = [];
  for (const s of [{ k: 'inProgress', soft: 'brand/surface', strong: 'brand/strong' },
                   { k: 'ended', soft: 'danger/soft', strong: 'danger/strong' }]) {
    const outer = figma.createComponent();
    outer.name = 'state=' + s.k;
    outer.layoutMode = 'HORIZONTAL';
    outer.primaryAxisSizingMode = 'AUTO';
    outer.counterAxisSizingMode = 'AUTO';
    outer.counterAxisAlignItems = 'CENTER';
    outer.paddingTop = 4; outer.paddingBottom = 4; outer.paddingLeft = 4; outer.paddingRight = 4;
    outer.itemSpacing = 0;
    outer.cornerRadius = 999;
    outer.fills = [boundPaint(s.soft)];
    outer.strokes = [];
    for (const f of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) tryBind(outer, f, 'space/4');
    bindRadius(outer, 'radius/full');

    const dot = figma.createFrame();
    dot.name = 'dot';
    dot.resize(10, 10);
    dot.cornerRadius = 999;
    dot.fills = [boundPaint(s.strong)];
    dot.strokes = [];
    outer.appendChild(dot);
    dot.layoutSizingHorizontal = 'FIXED';
    dot.layoutSizingVertical = 'FIXED';
    bindRadius(dot, 'radius/full');

    figma.currentPage.appendChild(outer);
    siComps.push(outer);
    siCreated.push({ state: s.k, id: outer.id, size: r2(outer.width) + '×' + r2(outer.height) });
  }
  siSet = figma.combineAsVariants(siComps, figma.currentPage);
  siSet.name = SI_NAME;
  siSet.x = originX; siSet.y = originY;
  try {
    siSet.layoutMode = 'HORIZONTAL'; siSet.primaryAxisSizingMode = 'AUTO'; siSet.counterAxisSizingMode = 'AUTO';
    siSet.itemSpacing = 16; siSet.paddingTop = 16; siSet.paddingBottom = 16; siSet.paddingLeft = 16; siSet.paddingRight = 16;
  } catch (e) { notes.push('Status Indicator 세트 레이아웃 실패: ' + e.message); }
  try {
    siSet.description = '지원 건 상태 표시. outer 18×18(soft) + inner dot 10×10(strong). ' +
                        'shadow 를 쓰지 않고 semantic color 두 겹으로 ring 을 만든다.';
  } catch (e) { /* 무시 */ }
  createdNodeIds.push(siSet.id);
  for (const c of siComps) createdNodeIds.push(c.id);
  originY += siSet.height + 64;
}

/* ---------- 3-2. Icon Button ---------- */
let ibComp = existingIB;
if (!ibComp) {
  ibComp = figma.createComponent();
  ibComp.name = IB_NAME;
  ibComp.layoutMode = 'HORIZONTAL';
  ibComp.counterAxisAlignItems = 'CENTER';
  ibComp.primaryAxisAlignItems = 'CENTER';
  ibComp.paddingTop = 6; ibComp.paddingBottom = 6; ibComp.paddingLeft = 6; ibComp.paddingRight = 6;
  ibComp.itemSpacing = 0;
  ibComp.cornerRadius = 4;
  ibComp.fills = [];                       // ghost
  ibComp.strokes = [];
  for (const f of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) tryBind(ibComp, f, 'space/6');
  bindRadius(ibComp, 'radius/sm');

  const icon = figma.createFrame();
  icon.name = 'icon';
  icon.resize(12, 12);
  icon.fills = [];
  icon.strokes = [];
  ibComp.appendChild(icon);
  icon.layoutSizingHorizontal = 'FIXED';
  icon.layoutSizingVertical = 'FIXED';

  ibComp.resize(24, 24);
  ibComp.primaryAxisSizingMode = 'FIXED';
  ibComp.counterAxisSizingMode = 'FIXED';

  ibComp.x = originX; ibComp.y = originY;
  figma.currentPage.appendChild(ibComp);
  try {
    ibComp.description = '아이콘 전용 버튼. 24×24 고정, ghost, radius 4, 아이콘 12×12. ' +
                         '공고 바로가기 / 더보기 공통. 36px Button 과는 별개 컴포넌트다.';
  } catch (e) { /* 무시 */ }
  createdNodeIds.push(ibComp.id);
  originY += 24 + 64;
}

/* ---------- 3-3. Application Card ---------- */
const acComps = [];
const acRows = [];

for (const s of CARD_STATES) {
  const card = figma.createComponent();
  card.name = 'state=' + s.key;
  card.layoutMode = 'VERTICAL';
  card.counterAxisAlignItems = 'MIN';
  card.paddingTop = 16; card.paddingBottom = 16; card.paddingLeft = 16; card.paddingRight = 16;
  card.cornerRadius = 8;
  card.fills = [boundPaint('surface/default')];
  card.strokes = [boundPaint('border/subtle')];
  card.strokeWeight = 1;
  card.strokeAlign = 'INSIDE';
  for (const f of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) tryBind(card, f, 'space/16');
  bindRadius(card, 'radius/md');
  try { await card.setEffectStyleIdAsync(cardShadow.id); }
  catch (e) { notes.push('카드 shadow 적용 실패: ' + e.message); }

  // header
  const header = autoFrame('header', 'HORIZONTAL');
  header.counterAxisAlignItems = 'CENTER';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  card.appendChild(header);

  const identity = autoFrame('identity', 'HORIZONTAL');
  identity.counterAxisAlignItems = 'CENTER';
  identity.itemSpacing = 8;
  header.appendChild(identity);
  tryBind(identity, 'itemSpacing', 'space/8');

  const siVariant = siSet.children.find(c => c.name === s.si) || siSet.children[0];
  const siInst = siVariant.createInstance();
  siInst.name = 'status';
  identity.appendChild(siInst);
  await mkText(identity, 'company', stCardTitle, 'text/primary', s.company);

  const positionChip = chipInstance('neutral', s.position, false);
  positionChip.name = 'position';
  header.appendChild(positionChip);

  // info
  const info = autoFrame('info', 'VERTICAL');
  info.itemSpacing = 8;
  info.paddingTop = 12; info.paddingBottom = 12;   // SPACE_BETWEEN 이 itemSpacing 을 무시하므로 여기서 gap 12
  card.appendChild(info);
  tryBind(info, 'itemSpacing', 'space/8');
  tryBind(info, 'paddingTop', 'space/12');
  tryBind(info, 'paddingBottom', 'space/12');

  const infoRows = [];
  async function infoRow(name, labelText) {
    const row = autoFrame('row / ' + name, 'HORIZONTAL');
    row.counterAxisAlignItems = 'CENTER';
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    info.appendChild(row);
    await mkText(row, 'label', stCaption, 'text/muted', labelText);
    infoRows.push(row);
    return row;
  }
  (await infoRow('stage', '현재 단계')).appendChild(chipInstance('neutral', s.stage, false));
  (await infoRow('status', '전형 상태')).appendChild(chipInstance(s.statusChipTone, s.statusLabel, false));
  await mkText(await infoRow('applied', '지원일'), 'value', stCaption, 'text/primary', s.applied);
  await mkText(await infoRow('schedule', '일정'), 'value', stCaption, 'text/primary', s.schedule);

  // footer
  const footer = autoFrame('footer', 'HORIZONTAL');
  footer.counterAxisAlignItems = 'CENTER';
  footer.primaryAxisAlignItems = 'SPACE_BETWEEN';
  footer.paddingTop = 8;
  card.appendChild(footer);
  tryBind(footer, 'paddingTop', 'space/8');
  footer.strokes = [boundPaint('border/subtle')];
  footer.strokeAlign = 'INSIDE';
  try {
    footer.strokeTopWeight = 1;
    footer.strokeRightWeight = 0;
    footer.strokeBottomWeight = 0;
    footer.strokeLeftWeight = 0;
  } catch (e) {
    footer.strokes = [];
    notes.push('개별 stroke weight 미지원 → footer 상단 구분선 생략됨: ' + e.message);
  }

  const countChip = chipInstance('neutral', s.count, true);
  countChip.name = 'stage count';
  footer.appendChild(countChip);

  const actions = autoFrame('actions', 'HORIZONTAL');
  actions.counterAxisAlignItems = 'CENTER';
  actions.itemSpacing = 4;
  footer.appendChild(actions);
  tryBind(actions, 'itemSpacing', 'space/4');
  const linkBtn = ibComp.createInstance(); linkBtn.name = 'link'; actions.appendChild(linkBtn);
  const moreBtn = ibComp.createInstance(); moreBtn.name = 'more'; actions.appendChild(moreBtn);

  // 크기: 가로 235 고정(배치 시 FILL), 세로 콘텐츠 hug
  card.resize(235, Math.max(card.height, 1));
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.primaryAxisAlignItems = 'SPACE_BETWEEN';

  // FILL 은 부모 폭이 확정된 뒤에 준다. 카드 → 직속 3개 → 정보 행 순서.
  header.layoutSizingHorizontal = 'FILL';
  info.layoutSizingHorizontal = 'FILL';
  footer.layoutSizingHorizontal = 'FILL';
  for (const r of infoRows) r.layoutSizingHorizontal = 'FILL';

  figma.currentPage.appendChild(card);
  acComps.push(card);
  acRows.push({
    state: s.key, id: card.id,
    width: r2(card.width), height: r2(card.height),
    nested: {
      header: r2(header.height),
      info: r2(info.height),
      footer: r2(footer.height),
      statusIndicator: r2(siInst.height)
    },
    // 방향 무관 속성으로 읽는다. info 는 VERTICAL 이라 counterAxisSizingMode 는 '폭'을 뜻하므로
    // 세 프레임을 같은 축으로 비교하면 안 된다.
    nestedSizing: {
      header: { H: header.layoutSizingHorizontal, V: header.layoutSizingVertical },
      info: { H: info.layoutSizingHorizontal, V: info.layoutSizingVertical },
      footer: { H: footer.layoutSizingHorizontal, V: footer.layoutSizingVertical }
    },
    childNames: card.children.map(c => c.name),
    instanceCount: card.findAll(n => n.type === 'INSTANCE').length
  });
}

const acSet = figma.combineAsVariants(acComps, figma.currentPage);
acSet.name = AC_NAME;
acSet.x = originX; acSet.y = originY;
try {
  acSet.layoutMode = 'HORIZONTAL';
  acSet.primaryAxisSizingMode = 'AUTO'; acSet.counterAxisSizingMode = 'AUTO';
  acSet.itemSpacing = 24;
  acSet.paddingTop = 16; acSet.paddingBottom = 16; acSet.paddingLeft = 16; acSet.paddingRight = 16;
} catch (e) { notes.push('Application Card 세트 레이아웃 실패: ' + e.message); }
try {
  acSet.description =
    '지원 카드. padding 16, radius 8, border/subtle, elevation/card. 세로는 콘텐츠 hug.\n' +
    '직속 자식 3개: header / info / footer. 래퍼를 두지 않는다.\n' +
    'gap 12 는 info 의 상하 padding 이다 — SPACE_BETWEEN 이 hug 에서 itemSpacing 을 무시하기 때문.\n' +
    'Chip ×4, Status Indicator ×1, Icon Button ×2 를 인스턴스로 재사용한다.\n' +
    '그리드 배치 시: 행을 HORIZONTAL·gap 12·STRETCH 로 두고 카드를 가로 FILL·세로 FILL 로 놓는다.';
} catch (e) { /* 무시 */ }
createdNodeIds.push(acSet.id);
for (const c of acComps) createdNodeIds.push(c.id);

/* ---------- 검증 ---------- */
const nestedHug = acRows.every(r =>
  r.nestedSizing.header.V === 'HUG' && r.nestedSizing.info.V === 'HUG' && r.nestedSizing.footer.V === 'HUG');
if (!nestedHug) errors.push('중첩 프레임이 hug 가 아님 (createFrame 100px 버그 재발): ' + JSON.stringify(acRows.map(r => r.nestedSizing)));

const cardHugs = acComps.every(c => c.primaryAxisSizingMode === 'AUTO');
if (!cardHugs) errors.push('카드 세로가 hug 가 아님');

const heightsEqual = acRows.length > 1 ? Math.abs(acRows[0].height - acRows[1].height) < 0.5 : true;
if (!heightsEqual) notes.push('두 variant 높이가 다름 — 콘텐츠 길이 차이일 수 있다: ' + JSON.stringify(acRows.map(r => r.height)));

const allInstancesPresent = acRows.every(r => r.instanceCount === 7);   // Chip 4 + SI 1 + IconButton 2
if (!allInstancesPresent) errors.push('인스턴스 개수가 7 이 아님: ' + JSON.stringify(acRows.map(r => r.instanceCount)));

return out({
  mode: 'APPLY',
  aborted: false,
  preflight,
  statusIndicatorSetId: siSet.id,
  statusIndicatorCreated: siCreated,
  iconButtonId: ibComp.id,
  iconButtonSize: r2(ibComp.width) + '×' + r2(ibComp.height),
  applicationCardSetId: acSet.id,
  variantsCreated: acRows,
  heightEstimate: HEIGHT_ESTIMATE,
  measuredHeights: acRows.map(r => r.height),
  heightMatchesEstimate: acRows.every(r => Math.abs(r.height - HEIGHT_ESTIMATE) < 0.5),
  nestedHug,
  cardHugs,
  heightsEqual,
  allInstancesPresent,
  createdNodeIds,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
