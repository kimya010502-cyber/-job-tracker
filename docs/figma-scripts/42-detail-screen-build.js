/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 42
 * 상세 화면(지원 기업별 상세 페이지) 구현 — 신규 icon + Timeline Step Card + Guide Card + 화면 조립
 * G5 방식(audit→cleanup→backup→세대관리)이 아니다. 순수 추가 작업이라 rollback 도 "새로 만든 것만 지우면" 끝난다.
 *
 * 소스
 *   레이아웃/정보구조: 사용자 첨부 「지원 기업별 상세 페이지」 PNG
 *   스타일/컴포넌트: 메인 화면 디자인 시스템(41 discovery 로 확보한 정확한 id)
 *
 * 재사용(41 discovery 결과 그대로)
 *   Button 1029:1997(variant) · Select 1030:2007(state) · Input 1030:2017(state, leading#1056:12) ·
 *   Chip 1029:1984(tone, leading#1052:0) · Icon Button 1037:2091(icon#1055:6) · NavItem 1042:36 ·
 *   Icon: ChevronLeft 1048:810 · ExternalLink 1048:794 · Calendar 1048:802 · Dot 1048:816
 *
 * 신규
 *   Icon / Edit · Icon / Trash · Icon / Lock · Icon / Check · Icon / Copy (16×16, 파일 전체 어디에도
 *   없던 것만 — 41 결과에 없었던 5개) · Timeline Step Card(state=current/waiting-locked) · Guide Card
 *
 * 배치   새 컴포넌트들은 Chip 세트와 같은 부모 밑에(디자인 시스템 옆). 새 화면 프레임은 mainFrame 과 같은
 *        부모 밑에, mainFrame 바로 아래(y + height + 400)에 — 기존 backup 들(오른쪽에 나란히 있음)과
 *        절대 안 겹치는 자리.
 *
 * 실행법
 *   1) DRY_RUN = true  → 필요한 기존 id 가 전부 그대로 있는지, 배치 좌표만 확인. mutation 0.
 *   2) 결과 검토 후 같은 scriptVersion 에서 DRY_RUN = false 로 APPLY.
 *   실패 시: 이번에 새로 만든 최상위 노드만 지우고 원상복귀(기존 무엇도 건드리지 않았으므로 이것으로 충분).
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '42-v1-detail-screen-build';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', aside: '1002:492', toolbar: '1003:1695',
  buttonSet: '1029:1997', buttonLeadingKey: 'leading#1056:7',
  selectSet: '1030:2007',
  inputSet: '1030:2017', inputLeadingKey: 'leading#1056:12',
  chipSet: '1029:1984', chipLeadingKey: 'leading#1052:0',
  iconButton: '1037:2091', iconButtonIconKey: 'icon#1055:6',
  navItemSet: '1042:36',
  iconChevronLeft: '1048:810', iconExternalLink: '1048:794', iconCalendar: '1048:802', iconDot: '1048:816'
};

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const createdTopLevel = []; // 새로 만든 최상위 노드 id — 실패 시 이것만 지우면 원상복귀
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
async function loadFontSafe(fontName) { try { await figma.loadFontAsync(fontName); return true; } catch (e) { return false; } }

/* ======== 0. 가드 + 기존 id 재확인(추측 없이, 41 결과 그대로) ======== */
const N = {};
for (const key of ['mainFrame', 'header', 'aside', 'toolbar', 'buttonSet', 'selectSet', 'inputSet', 'chipSet', 'iconButton', 'navItemSet', 'iconChevronLeft', 'iconExternalLink', 'iconCalendar', 'iconDot']) {
  N[key] = await figma.getNodeByIdAsync(IDS[key]);
}
const blockers = [];
function gate(key, cond, why) { if (!cond) blockers.push(key + ' — ' + why); }
for (const key of Object.keys(N)) gate(key + ':exists', !!N[key], IDS[key] + ' 를 찾지 못했다');

const textStyles = {};
if (blockers.length === 0) {
  for (const s of await figma.getLocalTextStylesAsync()) textStyles[s.name] = s;
  for (const role of ['Page title', 'Section title', 'Card title', 'Body', 'Label', 'Caption', 'Chip', 'KPI number']) {
    gate('textStyle:' + role, !!textStyles[role], '로컬 텍스트 스타일을 찾지 못했다');
  }
}

/* variant 자식 찾기 헬퍼 — "propKey=value" 이름의 COMPONENT 를 찾는다 */
function variantChild(setNode, propKey, value) {
  return kids(setNode).find(c => c.name === (propKey + '=' + value)) || null;
}
if (blockers.length === 0) {
  gate('button:primary', !!variantChild(N.buttonSet, 'variant', 'primary'), '');
  gate('button:secondary', !!variantChild(N.buttonSet, 'variant', 'secondary'), '');
  gate('button:danger', !!variantChild(N.buttonSet, 'variant', 'danger'), '');
  gate('select:default', !!variantChild(N.selectSet, 'state', 'default'), '');
  gate('input:default', !!variantChild(N.inputSet, 'state', 'default'), '');
  for (const tone of ['neutral', 'brand', 'success', 'waiting']) gate('chip:' + tone, !!variantChild(N.chipSet, 'tone', tone), '');
}

/* 아이콘 색으로 쓸 변수 — 있으면 바인딩, 없으면 하드코딩 fallback */
let iconColorVar = null, mutedTextVar = null, subtleBgVar = null;
try {
  const V = {};
  for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
  iconColorVar = V['icon/default'] || V['text/default'] || V['text/muted'] || null;
  mutedTextVar = V['text/muted'] || V['text/weak'] || V['text/default'] || null;
  subtleBgVar = V['surface/subtle'] || null;
} catch (e) { notes.push('변수 조회 실패(치명적 아님, fallback 색 사용): ' + e.message); }

const mainFrame = N.mainFrame;
const newScreenX = blockers.length === 0 ? r2(mainFrame.x) : null;
const newScreenY = blockers.length === 0 ? r2(mainFrame.y + mainFrame.height + 400) : null;
const componentsParent = blockers.length === 0 ? N.chipSet.parent : null;
const screenParent = blockers.length === 0 ? mainFrame.parent : null;

const preflightPassed = blockers.length === 0 && errors.length === 0;

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers,
    plan: preflightPassed ? {
      newComponentsParent: { id: componentsParent.id, name: componentsParent.name },
      newScreenParent: { id: screenParent.id, name: screenParent.name },
      newScreenPosition: { x: newScreenX, y: newScreenY },
      willCreate: ['Icon / Edit', 'Icon / Trash', 'Icon / Lock', 'Icon / Check', 'Icon / Copy',
        'Timeline Step Card (state=current, state=waiting-locked)', 'Guide Card', '상세 화면 프레임(Aside·Header clone 포함)'],
      colorBindings: { iconColorVar: iconColorVar ? iconColorVar.name : '(fallback #464555)', mutedTextVar: mutedTextVar ? mutedTextVar.name : '(fallback #777587)', subtleBgVar: subtleBgVar ? subtleBgVar.name : '(fallback #eff4ff)' }
    } : null,
    mutationCount, notes, errorCount: errors.length, errors
  });
}

/* ======== APPLY ======== */

function fillFromVar(variable, fallbackHex) {
  if (variable) return [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } }];
  const h = fallbackHex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
  return [{ type: 'SOLID', color: { r, g, b } }];
}
const ICON_FILL = fillFromVar(iconColorVar, '#464555');
const MUTED_FILL = fillFromVar(mutedTextVar, '#777587');

async function mkText(content, role, opts) {
  opts = opts || {};
  const t = figma.createText();
  const style = textStyles[role];
  if (style) { await loadFontSafe(style.fontName); t.fontName = style.fontName; t.fontSize = style.fontSize; t.lineHeight = style.lineHeight; t.letterSpacing = style.letterSpacing; t.characters = content; t.textStyleId = style.id; }
  else { await loadFontSafe({ family: 'Pretendard', style: 'Regular' }); t.characters = content; }
  if (opts.muted) t.fills = MUTED_FILL;
  if (opts.align) t.textAlignHorizontal = opts.align;
  if (opts.fixedW) { t.textAutoResize = 'HEIGHT'; t.resize(opts.fixedW, t.height); }
  return t;
}
function vframe(name, opts) {
  opts = opts || {};
  const f = figma.createFrame();
  f.name = name; f.layoutMode = opts.horizontal ? 'HORIZONTAL' : 'VERTICAL';
  f.itemSpacing = opts.gap || 0;
  f.paddingLeft = f.paddingRight = opts.padX || 0; f.paddingTop = f.paddingBottom = opts.padY || 0;
  if (opts.padTop != null) f.paddingTop = opts.padTop; if (opts.padBottom != null) f.paddingBottom = opts.padBottom;
  if (opts.padLeft != null) f.paddingLeft = opts.padLeft; if (opts.padRight != null) f.paddingRight = opts.padRight;
  /* layoutSizingHorizontal/Vertical(신규 API)만 쓴다 — primaryAxisSizingMode/counterAxisSizingMode(구 API)를
     같이 건드리면 축 방향에 따라 반대로 걸려 서로 충돌할 수 있어서 하나만 쓴다 */
  f.layoutSizingHorizontal = opts.fixedW ? 'FIXED' : 'HUG'; f.layoutSizingVertical = opts.fixedH ? 'FIXED' : 'HUG';
  f.fills = opts.fills || [];
  if (opts.align) f.primaryAxisAlignItems = opts.align;
  if (opts.calign) f.counterAxisAlignItems = opts.calign;
  if (opts.cornerRadius != null) f.cornerRadius = opts.cornerRadius;
  if (opts.fixedW) f.resize(opts.fixedW, Math.max(f.height, 1));
  return f;
}
/* 자식을 겹쳐서(오버레이) 배치해야 할 때 쓰는 절대 배치 컨테이너 — auto-layout 이 아니라서 x/y 를 직접 쓸 수 있다 */
function overlayFrame(name, w, h) {
  const f = figma.createFrame(); f.name = name; f.layoutMode = 'NONE'; f.resize(w, h); f.fills = [];
  return f;
}
function iconGlyphFrame(w, h) { const f = figma.createFrame(); f.name = 'glyph'; f.resize(w, h); f.fills = []; f.clipsContent = false; return f; }

/* ---- 새 아이콘 5개 ---- */
async function makeIconEdit() {
  const comp = figma.createComponent(); comp.name = 'Icon / Edit'; comp.resize(16, 16); comp.fills = [];
  const v = figma.createVector(); v.name = 'glyph';
  v.vectorPaths = [{ windingRule: 'NONZERO', data: 'M11.4 2.3 L13.7 4.6 L5.6 12.7 L2.3 13.7 L3.3 10.4 Z' }];
  v.resize(16, 16); v.fills = ICON_FILL;
  comp.appendChild(v); return comp;
}
async function makeIconTrash() {
  const comp = figma.createComponent(); comp.name = 'Icon / Trash'; comp.resize(16, 16); comp.fills = [];
  const glyph = iconGlyphFrame(16, 16); comp.appendChild(glyph);
  const lid = figma.createRectangle(); lid.name = 'lid'; lid.resize(11, 1.4); lid.x = 2.5; lid.y = 3.6; lid.cornerRadius = 0.7; lid.fills = ICON_FILL;
  const handle = figma.createRectangle(); handle.name = 'handle'; handle.resize(4, 1.6); handle.x = 6; handle.y = 2; handle.cornerRadius = 0.8; handle.fills = ICON_FILL;
  const body = figma.createRectangle(); body.name = 'body'; body.resize(9, 8.5); body.x = 3.5; body.y = 5.5; body.bottomLeftRadius = 1.2; body.bottomRightRadius = 1.2; body.fills = ICON_FILL;
  glyph.appendChild(handle); glyph.appendChild(lid); glyph.appendChild(body);
  return comp;
}
async function makeIconLock() {
  const comp = figma.createComponent(); comp.name = 'Icon / Lock'; comp.resize(16, 16); comp.fills = [];
  const glyph = iconGlyphFrame(16, 16); comp.appendChild(glyph);
  const shackle = figma.createRectangle(); shackle.name = 'shackle'; shackle.resize(6.5, 6); shackle.x = 4.75; shackle.y = 1.5;
  shackle.topLeftRadius = 3.25; shackle.topRightRadius = 3.25; shackle.bottomLeftRadius = 0; shackle.bottomRightRadius = 0;
  shackle.fills = []; shackle.strokes = ICON_FILL; shackle.strokeWeight = 1.4;
  const body = figma.createRectangle(); body.name = 'body'; body.resize(10, 7.5); body.x = 3; body.y = 6.5; body.cornerRadius = 1.4; body.fills = ICON_FILL;
  glyph.appendChild(shackle); glyph.appendChild(body);
  return comp;
}
async function makeIconCheck() {
  const comp = figma.createComponent(); comp.name = 'Icon / Check'; comp.resize(16, 16); comp.fills = [];
  const v = figma.createVector(); v.name = 'glyph';
  v.vectorPaths = [{ windingRule: 'NONZERO', data: 'M3 8.6 L6.6 12.2 L13.2 4.4' }];
  v.resize(16, 16); v.fills = []; v.strokes = ICON_FILL; v.strokeWeight = 1.7; v.strokeCap = 'ROUND'; v.strokeJoin = 'ROUND';
  comp.appendChild(v); return comp;
}
async function makeIconCopy() {
  const comp = figma.createComponent(); comp.name = 'Icon / Copy'; comp.resize(16, 16); comp.fills = [];
  const glyph = iconGlyphFrame(16, 16); comp.appendChild(glyph);
  const back = figma.createRectangle(); back.name = 'back'; back.resize(9, 9); back.x = 2; back.y = 2; back.cornerRadius = 1.6; back.fills = []; back.strokes = ICON_FILL; back.strokeWeight = 1.3;
  const front = figma.createRectangle(); front.name = 'front'; front.resize(9, 9); front.x = 5; front.y = 5; front.cornerRadius = 1.6; front.fills = fillFromVar(null, '#f8f9ff'); front.strokes = ICON_FILL; front.strokeWeight = 1.3;
  glyph.appendChild(back); glyph.appendChild(front);
  return comp;
}

let iconEdit, iconTrash, iconLock, iconCheck, iconCopy;
let applyFailure = null;
try {
  iconEdit = await makeIconEdit(); componentsParent.appendChild(iconEdit); createdTopLevel.push(iconEdit.id); mutationCount++;
  iconTrash = await makeIconTrash(); componentsParent.appendChild(iconTrash); createdTopLevel.push(iconTrash.id); mutationCount++;
  iconLock = await makeIconLock(); componentsParent.appendChild(iconLock); createdTopLevel.push(iconLock.id); mutationCount++;
  iconCheck = await makeIconCheck(); componentsParent.appendChild(iconCheck); createdTopLevel.push(iconCheck.id); mutationCount++;
  iconCopy = await makeIconCopy(); componentsParent.appendChild(iconCopy); createdTopLevel.push(iconCopy.id); mutationCount++;
  let iy = N.chipSet.y + N.chipSet.height + 60;
  for (const ic of [iconEdit, iconTrash, iconLock, iconCheck, iconCopy]) { ic.x = N.chipSet.x; ic.y = iy; iy += 40; }
} catch (e) { applyFailure = '아이콘 생성 실패: ' + (e && e.message ? e.message : String(e)); }

async function rollback(reason) {
  const removed = [];
  for (const id of createdTopLevel) {
    try { const n = await figma.getNodeByIdAsync(id); if (n) { n.remove(); removed.push(id); } } catch (e) { notes.push('되돌리기 중 ' + id + ' 삭제 실패: ' + e.message); }
  }
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, removed, mutationCount, errorCount: 1 });
}
if (applyFailure) return await rollback(applyFailure);

/* ---- 카드 컨테이너 스타일(Toolbar 에서 그대로 복사 — 구조는 안 복사, 시각 속성만) ---- */
const cardStyle = { fills: N.toolbar.fills, cornerRadius: N.toolbar.cornerRadius, effects: N.toolbar.effects, strokes: N.toolbar.strokes, strokeWeight: N.toolbar.strokeWeight };
function applyCardStyle(f) { f.fills = cardStyle.fills; f.cornerRadius = cardStyle.cornerRadius; f.effects = cardStyle.effects; f.strokes = cardStyle.strokes; f.strokeWeight = cardStyle.strokeWeight; }

/* ---- 기존 컴포넌트 인스턴스 생성 헬퍼 ---- */
async function buttonInstance(variant, label) {
  const v = variantChild(N.buttonSet, 'variant', variant);
  const inst = v.createInstance();
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  if (lbl) { await loadFontSafe(lbl.fontName); lbl.characters = label; }
  return inst;
}
async function buttonWithIcon(variant, label, iconId) {
  const inst = await buttonInstance(variant, label);
  try { inst.setProperties({ [IDS.buttonLeadingKey]: iconId }); } catch (e) { notes.push('버튼 leading swap 실패: ' + e.message); }
  return inst;
}
async function chipInstance(tone, label) {
  const v = variantChild(N.chipSet, 'tone', tone);
  const inst = v.createInstance();
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  if (lbl) { await loadFontSafe(lbl.fontName); lbl.characters = label; }
  return inst;
}
async function selectInstance(label) {
  const v = variantChild(N.selectSet, 'state', 'default');
  const inst = v.createInstance();
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  if (lbl) { await loadFontSafe(lbl.fontName); lbl.characters = label; }
  return inst;
}
async function inputInstance(value) {
  const v = variantChild(N.inputSet, 'state', 'default');
  const inst = v.createInstance();
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  if (lbl) { await loadFontSafe(lbl.fontName); lbl.characters = value; }
  return inst;
}
async function iconButtonInstance(iconId) {
  const inst = N.iconButton.createInstance();
  try { inst.setProperties({ [IDS.iconButtonIconKey]: iconId }); } catch (e) { notes.push('Icon Button swap 실패: ' + e.message); }
  return inst;
}
async function labeledField(labelText, controlInst) {
  const col = vframe('field', { gap: 4 });
  col.appendChild(await mkText(labelText, 'Label'));
  col.appendChild(controlInst);
  return col;
}

/* ======== Timeline Step Card ======== */
let timelineCardSet = null, guideCard = null, detailScreen = null;
try {
  /* -- state=current -- */
  const cur = figma.createComponent(); cur.name = 'state=current'; cur.layoutMode = 'VERTICAL'; cur.itemSpacing = 16;
  cur.paddingLeft = cur.paddingRight = cur.paddingTop = cur.paddingBottom = 20;
  cur.primaryAxisSizingMode = 'AUTO'; cur.counterAxisSizingMode = 'FIXED'; cur.layoutSizingHorizontal = 'FIXED'; cur.resize(660, 100);
  applyCardStyle(cur);

  const curHeaderRow = vframe('header', { horizontal: true, gap: 12, align: 'SPACE_BETWEEN', calign: 'CENTER' });
  const curLeftGroup = vframe('left', { horizontal: true, gap: 10, calign: 'CENTER' });
  /* 숫자를 원 위에 겹쳐야 해서 auto-layout 프레임이 아니라 절대 배치 컨테이너를 쓴다 */
  const badgeWrap = overlayFrame('badge-wrap', 28, 28);
  const badge = figma.createEllipse(); badge.name = 'step-badge'; badge.resize(28, 28); badge.x = 0; badge.y = 0; badge.fills = fillFromVar(null, '#4f46e5');
  badgeWrap.appendChild(badge);
  const badgeNum = await mkText('1', 'Label'); badgeNum.fills = fillFromVar(null, '#ffffff'); badgeNum.textAlignHorizontal = 'CENTER'; badgeNum.resize(28, badgeNum.height); badgeNum.x = 0; badgeNum.y = 6; badgeWrap.appendChild(badgeNum);
  curLeftGroup.appendChild(badgeWrap);
  curLeftGroup.appendChild(await mkText('서류 전형', 'Card title'));
  curLeftGroup.appendChild(await chipInstance('brand', '현재 단계'));
  curHeaderRow.appendChild(curLeftGroup);
  const curRightGroup = vframe('right', { horizontal: true, gap: 6, calign: 'CENTER' });
  curRightGroup.appendChild(await iconButtonInstance(iconCheck.id));
  curRightGroup.appendChild(await mkText('작성 및 수정 가능', 'Caption', { muted: true }));
  curHeaderRow.appendChild(curRightGroup);
  cur.appendChild(curHeaderRow);

  const row1 = vframe('row', { horizontal: true, gap: 16 });
  row1.appendChild(await labeledField('전형 상태', await selectInstance('접수완료')));
  row1.appendChild(await labeledField('전형 진행일 (제출일)', await inputInstance('09/09/2026')));
  cur.appendChild(row1);
  const row2 = vframe('row', { horizontal: true, gap: 16 });
  row2.appendChild(await labeledField('인사팀 서류 확인일', await inputInstance('09/10/2026')));
  row2.appendChild(await labeledField('결과 발표 예정일', await inputInstance('09/15/2026')));
  cur.appendChild(row2);

  const memoHeader = vframe('memo-header', { horizontal: true, gap: 8, align: 'SPACE_BETWEEN', calign: 'CENTER' });
  memoHeader.appendChild(await mkText('전형별 상세 메모', 'Label'));
  const memoActions = vframe('memo-actions', { horizontal: true, gap: 4, calign: 'CENTER' });
  memoActions.appendChild(await iconButtonInstance(iconEdit.id));
  memoActions.appendChild(await iconButtonInstance(iconTrash.id));
  memoActions.appendChild(await mkText('마지막 수정: 1시간 전', 'Caption', { muted: true }));
  memoHeader.appendChild(memoActions);
  cur.appendChild(memoHeader);
  const memoBox = vframe('memo-box', { padX: 12, padY: 10, fixedW: 620 });
  memoBox.fills = fillFromVar(subtleBgVar, '#eff4ff'); memoBox.cornerRadius = 8;
  memoBox.appendChild(await mkText('서류 제출 완료. 사전 과제 안내는 접수 후 영업일 5일 이내 전달 예정이라고 기재됨.', 'Body'));
  cur.appendChild(memoBox);

  /* -- state=waiting-locked -- */
  const locked = figma.createComponent(); locked.name = 'state=waiting-locked'; locked.layoutMode = 'HORIZONTAL'; locked.itemSpacing = 12;
  locked.paddingLeft = locked.paddingRight = 20; locked.paddingTop = locked.paddingBottom = 16;
  locked.primaryAxisAlignItems = 'SPACE_BETWEEN'; locked.counterAxisAlignItems = 'CENTER';
  locked.primaryAxisSizingMode = 'AUTO'; locked.counterAxisSizingMode = 'FIXED'; locked.layoutSizingHorizontal = 'FIXED'; locked.resize(660, 60);
  applyCardStyle(locked); locked.fills = fillFromVar(subtleBgVar, '#f8f9ff');
  const lockedLeft = vframe('left', { horizontal: true, gap: 10, calign: 'CENTER' });
  const lockedBadgeWrap = overlayFrame('badge-wrap', 28, 28);
  const lockedBadge = figma.createEllipse(); lockedBadge.resize(28, 28); lockedBadge.x = 0; lockedBadge.y = 0; lockedBadge.fills = fillFromVar(null, '#c7c4d8'); lockedBadgeWrap.appendChild(lockedBadge);
  lockedLeft.appendChild(lockedBadgeWrap);
  const lockedTextCol = vframe('text', { gap: 2 });
  const lockedTitleRow = vframe('title-row', { horizontal: true, gap: 8, calign: 'CENTER' });
  lockedTitleRow.appendChild(await mkText('1차 실무 면접', 'Card title', { muted: true }));
  lockedTitleRow.appendChild(await chipInstance('waiting', '대기중'));
  lockedTextCol.appendChild(lockedTitleRow);
  lockedTextCol.appendChild(await mkText('이전 전형(서류)을 통과하면 활성화됩니다.', 'Caption', { muted: true }));
  lockedLeft.appendChild(lockedTextCol);
  locked.appendChild(lockedLeft);
  locked.appendChild(await iconButtonInstance(iconLock.id));

  timelineCardSet = figma.combineAsVariants([cur, locked], componentsParent);
  timelineCardSet.name = 'Timeline Step Card';
  timelineCardSet.x = N.chipSet.x; timelineCardSet.y = N.chipSet.y + N.chipSet.height + 260;
  createdTopLevel.push(timelineCardSet.id); mutationCount++;

  /* ======== Guide Card ======== */
  guideCard = figma.createComponent(); guideCard.name = 'Guide Card'; guideCard.layoutMode = 'VERTICAL'; guideCard.itemSpacing = 6;
  guideCard.paddingLeft = guideCard.paddingRight = guideCard.paddingTop = guideCard.paddingBottom = 14;
  guideCard.primaryAxisSizingMode = 'AUTO'; guideCard.counterAxisSizingMode = 'FIXED'; guideCard.layoutSizingHorizontal = 'FIXED'; guideCard.resize(280, 80);
  guideCard.cornerRadius = 8; guideCard.fills = fillFromVar(subtleBgVar, '#eff4ff');
  const guideTitle = await mkText('줍줍(JOOB) 기록 가이드', 'Label');
  guideCard.appendChild(guideTitle);
  guideCard.appendChild(await mkText('필요한 내용을 미리 기록해두면 다음 전형 준비가 훨씬 쉬워져요. 전형 단계별 키워드와 인터뷰 질문 복기를 잊지 마세요.', 'Caption', { muted: true }));
  componentsParent.appendChild(guideCard);
  guideCard.x = N.chipSet.x; guideCard.y = N.chipSet.y + N.chipSet.height + 480;
  createdTopLevel.push(guideCard.id); mutationCount++;

  /* ======== 상세 화면 조립 ======== */
  detailScreen = figma.createFrame(); detailScreen.name = '상세 화면 (지원 기업별)';
  detailScreen.resize(mainFrame.width, mainFrame.height); detailScreen.fills = mainFrame.fills;
  screenParent.appendChild(detailScreen); detailScreen.x = newScreenX; detailScreen.y = newScreenY;
  createdTopLevel.push(detailScreen.id); mutationCount++;

  const clonedAside = N.aside.clone(); mutationCount++;
  detailScreen.appendChild(clonedAside); clonedAside.x = 0; clonedAside.y = 0;

  const contentX = N.aside.width;
  const mainContent = figma.createFrame(); mainContent.name = 'Main'; mainContent.layoutMode = 'VERTICAL';
  mainContent.itemSpacing = 16; mainContent.paddingLeft = mainContent.paddingRight = 24; mainContent.paddingTop = 64; mainContent.paddingBottom = 64;
  mainContent.clipsContent = true; mainContent.overflowDirection = 'VERTICAL'; mainContent.resize(mainFrame.width - contentX, mainFrame.height);
  mainContent.primaryAxisSizingMode = 'FIXED'; mainContent.counterAxisSizingMode = 'FIXED';
  mainContent.fills = [];
  detailScreen.appendChild(mainContent); mainContent.x = contentX; mainContent.y = 0;

  /* -- Page Top Bar -- */
  const topBar = vframe('page-top', { horizontal: true, gap: 16, align: 'SPACE_BETWEEN', calign: 'CENTER' });
  const topLeft = vframe('top-left', { horizontal: true, gap: 16, calign: 'CENTER' });
  const backGroup = vframe('back', { horizontal: true, gap: 4, calign: 'CENTER' });
  const backIcon = N.iconChevronLeft.createInstance(); backGroup.appendChild(backIcon);
  backGroup.appendChild(await mkText('지원 내역으로', 'Label', { muted: true }));
  topLeft.appendChild(backGroup);
  topLeft.appendChild(await mkText('피아스페이스 · 제품 기획', 'Section title'));
  topBar.appendChild(topLeft);
  const topRight = vframe('top-right', { horizontal: true, gap: 10, calign: 'CENTER' });
  topRight.appendChild(await chipInstance('sync', '변경사항 자동 저장됨'));
  topRight.appendChild(await buttonInstance('secondary', '수정'));
  topRight.appendChild(await buttonInstance('danger', '삭제'));
  topRight.appendChild(await buttonWithIcon('primary', '공고 원문 보기', N.iconExternalLink.id));
  topBar.appendChild(topRight);
  mainContent.appendChild(topBar);

  /* -- Summary Bar -- */
  const summaryBar = vframe('summary-bar', { horizontal: true, gap: 24, padX: 16, padY: 12, calign: 'CENTER', fixedW: mainFrame.width - contentX - 48 });
  applyCardStyle(summaryBar);
  async function summaryItem(label, valueNode) { const it = vframe('item', { horizontal: true, gap: 6, calign: 'CENTER' }); it.appendChild(await mkText(label, 'Label', { muted: true })); it.appendChild(valueNode); return it; }
  summaryBar.appendChild(await summaryItem('지원일', await mkText('2026-09-09', 'Body')));
  summaryBar.appendChild(await summaryItem('전체 현황', await chipInstance('brand', '진행중')));
  summaryBar.appendChild(await summaryItem('현재 단계', await mkText('서류 전형', 'Body')));
  summaryBar.appendChild(await summaryItem('전형 상태', await chipInstance('success', '접수완료')));
  const summarySpacer = vframe('spacer', {}); summarySpacer.layoutGrow = 1;
  summaryBar.appendChild(summarySpacer);
  const nextSchedule = vframe('next', { horizontal: true, gap: 6, calign: 'CENTER' });
  nextSchedule.appendChild(N.iconCalendar.createInstance());
  nextSchedule.appendChild(await mkText('다음 일정', 'Label', { muted: true }));
  nextSchedule.appendChild(await mkText('2026.09.15 (서류 발표)', 'Body'));
  summaryBar.appendChild(nextSchedule);
  mainContent.appendChild(summaryBar);

  /* -- 2-column body -- */
  const body = vframe('body', { horizontal: true, gap: 24 });
  const leftCol = vframe('timeline', { gap: 16 });
  const curVariant = variantChild(timelineCardSet, 'state', 'current');
  const lockedVariant = variantChild(timelineCardSet, 'state', 'waiting-locked');
  leftCol.appendChild(curVariant.createInstance());
  leftCol.appendChild(lockedVariant.createInstance());
  leftCol.appendChild(lockedVariant.createInstance()); // 3단계(최종 임원 면접) — 문구는 기본값 그대로, 다음 라운드에서 텍스트만 교체 가능
  body.appendChild(leftCol);

  const rightCol = vframe('memo-panel', { gap: 16, fixedW: 280 });
  const memoPanel = vframe('memo-card', { gap: 12, padX: 16, padY: 16, fixedW: 280 });
  applyCardStyle(memoPanel);
  const memoPanelHeader = vframe('mp-header', { horizontal: true, gap: 8, align: 'SPACE_BETWEEN', calign: 'CENTER' });
  memoPanelHeader.appendChild(await mkText('기업 메모', 'Card title'));
  memoPanelHeader.appendChild(N.iconDot.createInstance());
  memoPanel.appendChild(memoPanelHeader);
  const tagRow = vframe('tags', { horizontal: true, gap: 6 });
  for (const tag of ['#SaaS 메트릭', '#Vision AI', '#리텐션 최적화', '#B2B 온보딩']) tagRow.appendChild(await chipInstance('neutral', tag));
  memoPanel.appendChild(tagRow);
  memoPanel.appendChild(await mkText('기업 상세 메모', 'Label'));
  memoPanel.appendChild(await mkText('국내 주요 이커머스 솔루션 및 풀필먼트 B2B SaaS 제공 기업. 주력 서비스의 판매자 콘솔 UI 및 데이터 대시보드 리뉴얼 추진 중.', 'Body'));
  memoPanel.appendChild(await mkText('마지막 수정: 3시간 전', 'Caption', { muted: true }));
  rightCol.appendChild(memoPanel);
  rightCol.appendChild(guideCard.createInstance());
  body.appendChild(rightCol);
  mainContent.appendChild(body);

  const clonedHeader = N.header.clone(); mutationCount++;
  detailScreen.appendChild(clonedHeader); clonedHeader.x = contentX; clonedHeader.y = 0;
} catch (e) {
  return await rollback('구현 중 실패: ' + (e && e.message ? e.message : String(e)));
}

/* ======== 되읽기 — 가벼운 구조 확인만 ======== */
const c = {};
c.iconsCreated = [iconEdit, iconTrash, iconLock, iconCheck, iconCopy].every(n => !!n);
c.timelineCardSetOk = !!timelineCardSet && kids(timelineCardSet).length === 2;
c.guideCardOk = !!guideCard;
c.detailScreenOk = !!detailScreen && detailScreen.width === mainFrame.width;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '));

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false, successCriteriaMet: true, checks: c,
  created: {
    icons: { edit: iconEdit.id, trash: iconTrash.id, lock: iconLock.id, check: iconCheck.id, copy: iconCopy.id },
    timelineStepCard: timelineCardSet.id, guideCard: guideCard.id, detailScreen: detailScreen.id
  },
  detailScreenPosition: { x: newScreenX, y: newScreenY },
  mutationCount, notes, errorCount: errors.length, errors
});
