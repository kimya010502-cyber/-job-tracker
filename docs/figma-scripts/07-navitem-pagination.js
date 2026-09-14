/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 07
 * 9단계)  NavItem        (state = active / inactive)
 * 10단계) Pagination Item (state = default / current / disabled)
 *
 * NavItem 확정 사양
 *   height 32 고정 · width 232(배치 시 FILL) · icon 16×16 · gap 8
 *   horizontal padding 12 · radius/md(8) · text Label(13/18/500)
 *   active   bg brand/surface · text brand/strong
 *   inactive bg 없음          · text text/secondary
 *   활성 표시는 색으로만 한다. 높이·글자 크기를 바꾸지 않는다.
 *   (현재는 활성 40 / 비활성 32 라 메뉴를 옮길 때마다 목록이 8px 밀린다)
 *
 * Pagination Item 확정 사양
 *   32×32 고정 · radius/sm(4) · text Chip(12/16/600)
 *   icon 슬롯 12×12 기본 hidden / label 기본 visible
 *   숫자·화살표를 variant 로 쪼개지 않고 슬롯 표시 전환으로 처리한다 (type×state 9종 회피)
 *   default  bg 없음          · text text/secondary
 *   current  bg brand/primary · text text/on-brand
 *   disabled default + opacity 40%
 *
 * 높이 32 를 만드는 방식
 *   세로 padding 으로 만들면 (32−18)/2 = 7 이라 spacing scale 을 벗어난다.
 *   Button 36 과 같이 **고정 높이 + 세로 중앙 정렬**로 처리한다.
 *
 * 아이콘 슬롯이 비어 있는 이유
 *   메뉴 6개의 글리프가 모두 다르고, 현재 화면의 아이콘 박스는 13.5~16.5 로 제각각이다.
 *   11단계 교체에서 기존 벡터를 복제해 슬롯에 넣으면 글리프가 보존되고 박스는 16 으로 통일된다.
 *
 * 범위
 *   컴포넌트 원형만 만든다. 메인 화면은 읽기만 하고 수정하지 않는다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 사전 조건만 검사, 아무것도 만들지 않음
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *
 * 멱등성
 *   'NavItem' / 'Pagination Item' 세트가 이미 있으면 그것만 건너뛰고 나머지를 만든다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경
const SCRIPT_VERSION = '07-v1-navitem-pagination';

const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const TARGET_ID = '1002:2';

const NAV_NAME = 'NavItem';
const PAG_NAME = 'Pagination Item';

const NAV_H = 32, NAV_W = 232, NAV_ICON = 16;
const PAG_SIZE = 32, PAG_ICON = 12;

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
    scriptVersion: SCRIPT_VERSION,
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '대상 파일이 아님. ' + TARGET_ID + ' = ' + (mainFrame ? '"' + mainFrame.name + '"' : '없음')
  });
}

const sets = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT_SET'] });
const existing = {
  NavItem: sets.find(n => n.name === NAV_NAME) || null,
  'Pagination Item': sets.find(n => n.name === PAG_NAME) || null
};
const todo = [NAV_NAME, PAG_NAME].filter(n => !existing[n]);
for (const n of [NAV_NAME, PAG_NAME]) {
  if (existing[n]) notes.push(n + ' 세트가 이미 존재함 (' + existing[n].id + ') — 건너뜀');
}
if (todo.length === 0) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '두 세트가 이미 존재함. 만들 것이 없음.',
    existingIds: { NavItem: existing.NavItem && existing.NavItem.id, 'Pagination Item': existing[PAG_NAME] && existing[PAG_NAME].id }
  });
}

/* ========================================================================
 * 1. 사전 조건
 * ====================================================================== */
const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

const textStyles = await figma.getLocalTextStylesAsync();
const stLabel = textStyles.find(s => s.name === 'Label');
const stChip = textStyles.find(s => s.name === 'Chip');

const NEEDED_VARS = ['brand/surface', 'brand/strong', 'brand/primary',
                     'text/secondary', 'text/on-brand',
                     'radius/md', 'radius/sm', 'space/12', 'space/8'];

const preflight = { labelTextStyle: !!stLabel, chipTextStyle: !!stChip };
for (const n of NEEDED_VARS) preflight[n] = !!V[n];

const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight
  });
}

/* ========================================================================
 * 2. variant 정의
 * ====================================================================== */
const NAV_STATES = [
  { key: 'active',   bg: 'brand/surface', fg: 'brand/strong',   sample: '지원 내역' },
  { key: 'inactive', bg: null,            fg: 'text/secondary', sample: '통계' }
];
const PAG_STATES = [
  { key: 'default',  bg: null,            fg: 'text/secondary', opacity: 1,   sample: '2' },
  { key: 'current',  bg: 'brand/primary', fg: 'text/on-brand',  opacity: 1,   sample: '1' },
  { key: 'disabled', bg: null,            fg: 'text/secondary', opacity: 0.4, sample: '3' }
];

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    componentSetsWouldCreate: todo,
    alreadyExisting: Object.keys(existing).filter(k => existing[k]),
    variablesWouldCreate: [],
    navItem: {
      size: NAV_W + '×' + NAV_H + ' (높이 고정, 폭은 배치 시 FILL)',
      padding: '0 / 12', gap: 8, radius: 'radius/md (8)',
      icon: NAV_ICON + '×' + NAV_ICON + ' (항상 표시, 글리프는 11단계에서 이전)',
      text: 'Label (13/18/500)',
      variants: NAV_STATES.map(s => ({
        name: 'state=' + s.key, background: s.bg || '(없음)', text: s.fg, sample: s.sample
      })),
      note: '활성/비활성이 높이와 글자 크기를 바꾸지 않는다. 현재는 40 vs 32 라 메뉴 이동 시 목록이 밀린다.'
    },
    paginationItem: {
      size: PAG_SIZE + '×' + PAG_SIZE + ' 고정',
      radius: 'radius/sm (4)', text: 'Chip (12/16/600)',
      icon: PAG_ICON + '×' + PAG_ICON + ' · 기본 hidden', label: '기본 visible',
      variants: PAG_STATES.map(s => ({
        name: 'state=' + s.key, background: s.bg || '(없음)', text: s.fg, opacity: s.opacity, sample: s.sample
      })),
      note: '숫자는 label, 화살표는 icon 을 켜서 쓴다. type×state 9종으로 쪼개지 않는다.',
      fixes: '현재 "1" 은 Chip, "2" 는 Caption 으로 스타일이 갈려 있다 (01 의 칩 판별 부작용). 하나로 통일된다.'
    },
    heightStrategy: '세로 padding 대신 고정 높이 + 중앙 정렬. (32−18)/2 = 7 은 spacing scale 밖이다.',
    scopeNote: '컴포넌트만 만든다. 메인 화면은 읽기만 한다.',
    placement: 'Application Card 세트 아래 (없으면 다른 세트 아래, 그것도 없으면 우측 빈 공간)',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 3. 생성 (APPLY)
 * ====================================================================== */
await figma.loadFontAsync(stLabel.fontName);
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
function slot(name, size) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(size, size);
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

let anchor = null;
for (const n of ['Application Card', 'KPI Card', 'Input', 'Select', 'Button', 'Chip']) {
  anchor = sets.find(s => s.name === n); if (anchor) break;
}
const originX = anchor ? anchor.x : Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0))) + 400;
let originY = anchor ? anchor.y + anchor.height + 64 : -491;

const createdNodeIds = [];
const built = {};

/* ---------- 3-1. NavItem ---------- */
if (todo.indexOf(NAV_NAME) !== -1) {
  const comps = [], rows = [];
  for (const s of NAV_STATES) {
    const c = figma.createComponent();
    c.name = 'state=' + s.key;
    c.layoutMode = 'HORIZONTAL';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingTop = 0; c.paddingBottom = 0;
    c.paddingLeft = 12; c.paddingRight = 12;
    c.itemSpacing = 8;
    c.cornerRadius = 8;
    c.fills = s.bg ? [boundPaint(s.bg)] : [];
    c.strokes = [];
    tryBind(c, 'paddingLeft', 'space/12');
    tryBind(c, 'paddingRight', 'space/12');
    tryBind(c, 'itemSpacing', 'space/8');
    bindRadius(c, 'radius/md');

    const ic = slot('icon', NAV_ICON);
    c.appendChild(ic);
    ic.layoutSizingHorizontal = 'FIXED';
    ic.layoutSizingVertical = 'FIXED';

    await mkText(c, 'label', stLabel, s.fg, s.sample);

    c.resize(NAV_W, NAV_H);
    c.primaryAxisSizingMode = 'FIXED';    // 가로 232 (배치 시 FILL)
    c.counterAxisSizingMode = 'FIXED';    // 세로 32 고정

    figma.currentPage.appendChild(c);
    comps.push(c);
    rows.push({ state: s.key, id: c.id, width: r2(c.width), height: r2(c.height) });
  }
  const set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = NAV_NAME;
  set.x = originX; set.y = originY;
  try {
    set.layoutMode = 'VERTICAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
    set.itemSpacing = 12; set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
  } catch (e) { notes.push('NavItem 세트 레이아웃 실패: ' + e.message); }
  try {
    set.description = '사이드바 메뉴 항목. height 32 고정(세로 중앙), 좌우 padding 12, gap 8, radius 8, Label.\n' +
      'active 는 brand/surface 배경 + brand/strong 텍스트. 높이와 글자 크기는 상태와 무관하게 같다.\n' +
      'icon 슬롯 16×16 은 비어 있다 — 교체 시 기존 벡터를 넣는다. 배치할 때 가로 FILL 로 둔다.';
  } catch (e) { /* 무시 */ }
  createdNodeIds.push(set.id);
  for (const c of comps) createdNodeIds.push(c.id);
  built.navItem = { setId: set.id, variants: rows };
  originY += set.height + 64;
}

/* ---------- 3-2. Pagination Item ---------- */
if (todo.indexOf(PAG_NAME) !== -1) {
  const comps = [], rows = [];
  for (const s of PAG_STATES) {
    const c = figma.createComponent();
    c.name = 'state=' + s.key;
    c.layoutMode = 'HORIZONTAL';
    c.counterAxisAlignItems = 'CENTER';
    c.primaryAxisAlignItems = 'CENTER';
    c.paddingTop = 0; c.paddingBottom = 0; c.paddingLeft = 0; c.paddingRight = 0;
    c.itemSpacing = 0;
    c.cornerRadius = 4;
    c.fills = s.bg ? [boundPaint(s.bg)] : [];
    c.strokes = [];
    bindRadius(c, 'radius/sm');

    const ic = slot('icon', PAG_ICON);
    c.appendChild(ic);
    ic.layoutSizingHorizontal = 'FIXED';
    ic.layoutSizingVertical = 'FIXED';
    ic.visible = false;                  // 화살표에서만 표시

    const lb = await mkText(c, 'label', stChip, s.fg, s.sample);

    c.resize(PAG_SIZE, PAG_SIZE);
    c.primaryAxisSizingMode = 'FIXED';
    c.counterAxisSizingMode = 'FIXED';
    if (s.opacity !== 1) c.opacity = s.opacity;

    figma.currentPage.appendChild(c);
    comps.push(c);
    rows.push({
      state: s.key, id: c.id, width: r2(c.width), height: r2(c.height),
      opacity: c.opacity, iconHidden: ic.visible === false, labelVisible: lb.visible !== false
    });
  }
  const set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = PAG_NAME;
  set.x = originX; set.y = originY;
  try {
    set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
    set.itemSpacing = 16; set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
  } catch (e) { notes.push('Pagination 세트 레이아웃 실패: ' + e.message); }
  try {
    set.description = '페이지네이션 버튼. 32×32 고정, radius 4, Chip 텍스트.\n' +
      'current 는 brand/primary + text/on-brand, disabled 는 opacity 40%.\n' +
      '숫자는 label 을, 화살표는 icon 슬롯을 켜서 쓴다 — type 을 variant 로 쪼개지 않는다.';
  } catch (e) { /* 무시 */ }
  createdNodeIds.push(set.id);
  for (const c of comps) createdNodeIds.push(c.id);
  built.paginationItem = { setId: set.id, variants: rows };
}

/* ---------- 검증 ---------- */
const navOk = !built.navItem || built.navItem.variants.every(v => Math.abs(v.height - NAV_H) < 0.5 && Math.abs(v.width - NAV_W) < 0.5);
const pagOk = !built.paginationItem || built.paginationItem.variants.every(v =>
  Math.abs(v.height - PAG_SIZE) < 0.5 && Math.abs(v.width - PAG_SIZE) < 0.5 && v.iconHidden && v.labelVisible);
if (!navOk) errors.push('NavItem 크기가 ' + NAV_W + '×' + NAV_H + ' 이 아님: ' + JSON.stringify(built.navItem));
if (!pagOk) errors.push('Pagination Item 크기/슬롯 상태 불일치: ' + JSON.stringify(built.paginationItem));

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  preflight,
  created: built,
  navItemSizeOk: navOk,
  paginationItemSizeOk: pagOk,
  createdNodeIds,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
