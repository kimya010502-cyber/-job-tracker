/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 29
 * Phase G1-A — View icon 2종 + View Toggle Component Set 생성 (화면 수정 없음)
 *
 * 만드는 것 (3개, 전부 새 노드)
 *   Icon / View / Table   16×16, glyph = 1003:1738 clone (13.5 그대로, 중앙), 기본 색 text/muted
 *   Icon / View / Card    16×16, glyph = 1003:1741 clone (13.5 그대로, 중앙), 기본 색 text/muted
 *   View Toggle           Component Set, variant 속성 view = table | card
 *     variant   52×36 FIXED · horizontal · padding 4 · gap 0 · radius/md · fill surface/subtle · 세로 중앙
 *     segment   table / card 22×28 FIXED · 중앙 정렬 · radius/sm · 안에 아이콘 인스턴스 16×16
 *     선택      fill surface/default + effect style elevation/card + 아이콘 glyph → brand/strong
 *     비선택    fill 없음 · effect 없음 · 아이콘 glyph → text/muted (마스터와 같은 값이지만 명시적으로 override)
 *   INSTANCE_SWAP · boolean 속성은 만들지 않는다.
 *
 * 건드리지 않는 것 (전후 snapshot 대조)
 *   메인 화면 1002:2 전체 · source 벡터 1003:1738 / 1003:1741 · 기존 Icon 17종 ·
 *   backup copy 1019:115 / 1044:160 · 페이지 최상위의 기존 노드 전부
 *
 * clone 주의 (12 와 같은 방식)
 *   node.clone() 은 복제본을 원본과 같은 부모(= 메인 화면 안)에 넣는다.
 *   clone 직후 곧바로 아이콘 컴포넌트로 옮긴다. 원본 부모의 자식 수를 전후로 대조한다.
 *
 * 실패 정책
 *   APPLY 중 어느 단계든 실패하면 이번 실행에서 만든 노드를 **전부 역순으로 지운다** (rollback).
 *   지운 뒤 남은 것이 0 인지, 보호 대상 snapshot 이 원래와 같은지 다시 확인해서 보고한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 사전 조건 · 배치 위치 · 예상 구조 · 보호 대상 기준값만 출력. 아무것도 만들지 않는다.
 *   2) 사용자가 결과를 보고 승인하면 **같은 scriptVersion** 에서 DRY_RUN = false 로 바꿔 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '29-G1A-v1-viewtoggle-create';

const IDS = { mainFrame: '1002:2', srcTable: '1003:1738', srcCard: '1003:1741', paginationSet: '1042:46' };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const ICON_LIBRARY = [
  ['Icon / Search', '1048:784'], ['Icon / Reset', '1048:786'], ['Icon / Plus', '1048:788'], ['Icon / Arrow Up', '1048:790'],
  ['Icon / Stage Count', '1048:792'], ['Icon / External Link', '1048:794'], ['Icon / More', '1048:796'],
  ['Icon / Nav / Applications', '1048:798'], ['Icon / Nav / Statistics', '1048:800'], ['Icon / Nav / Calendar', '1048:802'],
  ['Icon / Nav / Memo', '1048:804'], ['Icon / Nav / Settings', '1048:806'], ['Icon / Nav / Help', '1048:808'],
  ['Icon / Chevron Left', '1048:810'], ['Icon / Chevron Right', '1048:812'], ['Icon / Bell', '1048:814'], ['Icon / Dot', '1048:816']
];
const NEW_ICONS = [
  { key: 'table', name: 'Icon / View / Table', src: IDS.srcTable },
  { key: 'card',  name: 'Icon / View / Card',  src: IDS.srcCard }
];
const SET_NAME = 'View Toggle';
const VIEWS = ['table', 'card'];               // variant 순서 = 화면 순서
const SPEC = { w: 52, h: 36, pad: 4, gap: 0, segW: 22, segH: 28, icon: 16, glyph: 13.5 };
const NEEDED_VARS = ['surface/subtle', 'surface/default', 'text/muted', 'brand/strong', 'radius/md', 'radius/sm'];
const NEEDED_EFFECT = 'elevation/card';
const CANVAS = 16, GRID_COLS = 6, GRID_PITCH = 56;   // 12 에서 쓴 Icon Library 격자
const BASELINE_KEY = 'joob.G1A.baseline';

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function pageOf(n) { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x; }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function boundColorId(p) { return p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null; }
function rectsOverlap(a, b, m) { m = m || 0; return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y; }

/* 서브트리 snapshot — 이름·타입·크기·위치·표시·자식 수·벡터 경로·fill 색. 해시와 노드 수를 낸다 */
function snapshot(root) {
  if (!root) return { exists: false };
  const lines = [];
  (function w(n) {
    let fill = '';
    try { fill = visiblePaints(n.fills).map(p => (p.type === 'SOLID' ? hex(p.color) : p.type) + (boundColorId(p) || '')).join(','); } catch (e) { fill = '?'; }
    const pd = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') ? String((pathDataOf(n) || '').length) : '';
    lines.push([n.id, n.type, n.name, r2(n.width), r2(n.height), r2(n.x), r2(n.y), n.visible !== false, kids(n).length, pd, fill].join('|'));
    for (const c of kids(n)) w(c);
  })(root);
  return { exists: true, nodeCount: lines.length, hash: hash(lines.join('\n')) };
}

/* ========================================================================
 * 0. 가드 + 사전 조건
 * ====================================================================== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, reason: '메인 화면 1002:2 를 찾을 수 없다 — 다른 파일이 열려 있는지 확인' });

await figma.loadAllPagesAsync();
const preflight = {};
const blockers = [];

/* 0-1. 이름 충돌 — 파일 전체 */
const allComps = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
const plannedNames = NEW_ICONS.map(i => i.name).concat([SET_NAME]);
const collisions = allComps.filter(c => plannedNames.indexOf(c.name) >= 0).map(c => ({ id: c.id, name: c.name, type: c.type, page: pageOf(c) ? pageOf(c).name : null }));
preflight.noNameCollision = collisions.length === 0;
if (!preflight.noNameCollision) blockers.push('같은 이름의 컴포넌트가 이미 있다: ' + collisions.map(c => c.name + ' ' + c.id).join(', '));

/* 0-2. 변수 · effect style */
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const missingVars = NEEDED_VARS.filter(n => !V[n]);
preflight.variablesFound = missingVars.length === 0;
if (missingVars.length) blockers.push('변수 없음: ' + missingVars.join(', '));
let effectStyle = null;
for (const s of await figma.getLocalEffectStylesAsync()) if (s.name === NEEDED_EFFECT) effectStyle = s;
preflight.effectStyleFound = !!effectStyle;
if (!effectStyle) blockers.push('effect style 없음: ' + NEEDED_EFFECT);
const radiusValues = {};
for (const n of ['radius/md', 'radius/sm']) {
  if (!V[n]) continue;
  /* alias 면 끝까지 따라간다 (최대 5단계) */
  let cur = V[n], val = null;
  for (let hop = 0; hop < 5 && cur; hop++) {
    const col = await figma.variables.getVariableCollectionByIdAsync(cur.variableCollectionId);
    val = col ? cur.valuesByMode[col.defaultModeId] : null;
    if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') cur = await figma.variables.getVariableByIdAsync(val.id);
    else break;
  }
  radiusValues[n] = typeof val === 'number' ? r2(val) : val;
}
preflight.radiusValuesAsExpected = radiusValues['radius/md'] === 8 && radiusValues['radius/sm'] === 4;
if (!preflight.radiusValuesAsExpected) blockers.push('radius 변수 값이 예상(md 8 / sm 4)과 다르다: ' + JSON.stringify(radiusValues));

/* 0-3. source 벡터 */
const sources = {};
for (const ic of NEW_ICONS) {
  const n = await figma.getNodeByIdAsync(ic.src);
  const rec = { id: ic.src, found: !!n };
  if (n) {
    const vf = visiblePaints(n.fills), vs = visiblePaints(n.strokes);
    rec.type = n.type; rec.size = size(n); rec.parent = n.parent ? n.parent.id : null;
    rec.parentChildCount = kids(n.parent).length;
    rec.pathLength = (pathDataOf(n) || '').length;
    rec.visibleFills = vf.length; rec.visibleStrokes = vs.length; rec.strokeWeight = n.strokeWeight;
    rec.colorChannel = vf.length && !vs.length ? 'fills' : (!vf.length && vs.length ? 'strokes' : (vf.length && vs.length ? 'both' : 'none'));
    rec.currentColorVariable = null;
    const ch = rec.colorChannel === 'fills' ? vf : (rec.colorChannel === 'strokes' ? vs : []);
    if (ch.length && boundColorId(ch[0])) { const v = await figma.variables.getVariableByIdAsync(boundColorId(ch[0])); rec.currentColorVariable = v ? v.name : null; }
    rec.ok = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') && near(n.width, SPEC.glyph) && near(n.height, SPEC.glyph) &&
             rec.pathLength > 0 && (rec.colorChannel === 'fills' || rec.colorChannel === 'strokes');
  }
  sources[ic.key] = rec;
  if (!rec.ok) blockers.push('source ' + ic.src + ' 가 조건(벡터 · 13.5×13.5 · 경로 있음 · 색 채널 하나)에 맞지 않는다: ' + JSON.stringify(rec));
}
preflight.sourcesOk = NEW_ICONS.every(ic => sources[ic.key].ok);

/* 0-4. 기존 Icon Library — 위치 · 구조 관례 */
const lib = [];
for (const [name, id] of ICON_LIBRARY) {
  const n = await figma.getNodeByIdAsync(id);
  lib.push({ name, id, node: n, ok: !!n && n.name === name && n.type === 'COMPONENT' && near(n.width, CANVAS) && near(n.height, CANVAS) });
}
preflight.iconLibraryIntact = lib.every(l => l.ok);
if (!preflight.iconLibraryIntact) blockers.push('기존 Icon 17종 중 이름/크기가 다른 것: ' + lib.filter(l => !l.ok).map(l => l.name).join(', '));
const libParent = lib[0].node ? lib[0].node.parent : null;
preflight.iconLibrarySameParent = lib.every(l => l.node && libParent && l.node.parent && l.node.parent.id === libParent.id);
if (!preflight.iconLibrarySameParent) blockers.push('기존 Icon 17종의 부모가 하나가 아니다 — 새 아이콘 위치를 정할 수 없다');
/* 관례: 아이콘 컴포넌트 = fills 없음 + 자식 1개 'glyph' + constraints CENTER */
const convention = lib.map(l => l.node).filter(Boolean).map(n => ({
  noFill: visiblePaints(n.fills).length === 0, oneGlyph: kids(n).length === 1 && kids(n)[0].name === 'glyph',
  clips: n.clipsContent
}));
preflight.iconConventionConsistent = convention.every(c => c.noFill && c.oneGlyph);
if (!preflight.iconConventionConsistent) notes.push('기존 Icon 중 fills 없음/glyph 1개 관례를 따르지 않는 것이 있다 — 새 아이콘은 관례대로 만든다');
const libClips = convention.length && convention.every(c => c.clips === convention[0].clips) ? convention[0].clips : false;

/* 0-5. 배치 — 아이콘은 12 의 격자(6열 · 56 간격) 17·18번 칸, 세트는 Pagination 세트 아래 */
const origin = lib[0].node ? { x: lib[0].node.x, y: lib[0].node.y } : null;
const gridConfirmed = !!origin && lib.every((l, i) => l.node && near(l.node.x, origin.x + (i % GRID_COLS) * GRID_PITCH) && near(l.node.y, origin.y + Math.floor(i / GRID_COLS) * GRID_PITCH));
preflight.iconGridConfirmed = gridConfirmed;
const siblingsRects = libParent ? kids(libParent).map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, w: c.width, h: c.height })) : [];
const iconSlots = NEW_ICONS.map((ic, k) => {
  const i = ICON_LIBRARY.length + k;
  const rect = gridConfirmed ? { x: r2(origin.x + (i % GRID_COLS) * GRID_PITCH), y: r2(origin.y + Math.floor(i / GRID_COLS) * GRID_PITCH), w: CANVAS, h: CANVAS } : null;
  const hits = rect ? siblingsRects.filter(s => rectsOverlap(rect, s, 8)).map(s => s.name + ' ' + s.id) : null;
  return { name: ic.name, gridIndex: i, rect, free: !!rect && hits.length === 0, overlaps: hits };
});
preflight.iconSlotsFree = iconSlots.every(s => s.free);
if (!gridConfirmed) blockers.push('Icon Library 격자(6열 · 56)를 확인하지 못했다 — 새 아이콘 위치를 추측하지 않는다');
else if (!preflight.iconSlotsFree) blockers.push('새 아이콘 칸이 다른 노드와 겹친다: ' + JSON.stringify(iconSlots.filter(s => !s.free)));

const pagSet = await figma.getNodeByIdAsync(IDS.paginationSet);
const setParent = pagSet && pagSet.parent ? pagSet.parent : libParent;
const SET_PAD = 16, SET_GAP = 16;
const predictedSet = { w: SET_PAD * 2 + SPEC.w * VIEWS.length + SET_GAP * (VIEWS.length - 1), h: SET_PAD * 2 + SPEC.h };
let setRect = null, setPlacementBasis = null;
if (pagSet) {
  const r = { x: r2(pagSet.x), y: r2(pagSet.y + pagSet.height + 64), w: predictedSet.w, h: predictedSet.h };
  const hits = kids(setParent).filter(c => rectsOverlap(r, { x: c.x, y: c.y, w: c.width, h: c.height }, 16));
  if (!hits.length) { setRect = r; setPlacementBasis = 'Pagination Item 세트(1042:46) 아래 64'; }
  else notes.push('Pagination 세트 아래 칸이 막혀 있다: ' + hits.map(h => h.name + ' ' + h.id).join(', '));
}
if (!setRect && setParent) {
  const maxRight = Math.max.apply(null, kids(setParent).map(c => c.x + c.width));
  setRect = { x: r2(maxRight + 400), y: pagSet ? r2(pagSet.y) : 0, w: predictedSet.w, h: predictedSet.h };
  setPlacementBasis = '페이지 오른쪽 끝 + 400 (대체 위치)';
}
preflight.setPlacementFound = !!setRect;
if (!setRect) blockers.push('View Toggle 세트를 둘 위치를 정하지 못했다');

/* 0-6. 보호 대상 기준값 */
const protectedNodes = [
  { key: 'mainFrame', node: mainFrame },
  { key: 'srcTable', node: await figma.getNodeByIdAsync(IDS.srcTable) },
  { key: 'srcCard', node: await figma.getNodeByIdAsync(IDS.srcCard) }
];
for (const id of BACKUP_COPY_IDS) protectedNodes.push({ key: 'backup ' + id, node: await figma.getNodeByIdAsync(id) });
for (const l of lib) protectedNodes.push({ key: l.name, node: l.node });
function takeProtected() {
  const res = {};
  for (const p of protectedNodes) res[p.key] = snapshot(p.node);
  return res;
}
const protectedBefore = takeProtected();
const backupsExist = BACKUP_COPY_IDS.map(id => ({ id, exists: protectedBefore['backup ' + id].exists }));
if (backupsExist.some(b => !b.exists)) notes.push('backup copy 중 없는 것이 있다 (보호할 대상이 없을 뿐, 차단 사유 아님): ' + JSON.stringify(backupsExist));
const sourceParentCounts = {};
for (const ic of NEW_ICONS) if (sources[ic.key].parent) sourceParentCounts[sources[ic.key].parent] = sources[ic.key].parentChildCount;
const pageTopBefore = { icons: libParent ? kids(libParent).length : null, set: setParent ? kids(setParent).length : null, sameParent: !!libParent && !!setParent && libParent.id === setParent.id };

/* 0-7. 예상 구조 */
const plan = {
  icons: NEW_ICONS.map((ic, k) => ({ name: ic.name, source: ic.src, canvas: CANVAS + '×' + CANVAS, glyph: SPEC.glyph + '×' + SPEC.glyph,
    glyphPos: r2((CANVAS - SPEC.glyph) / 2) + ',' + r2((CANVAS - SPEC.glyph) / 2), resize: false,
    colorChannel: sources[ic.key].colorChannel, defaultColor: 'text/muted', sourceColorNow: sources[ic.key].currentColorVariable,
    parent: libParent ? libParent.name + ' (' + libParent.id + ')' : null, position: iconSlots[k].rect })),
  set: { name: SET_NAME, property: 'view (VARIANT) = ' + VIEWS.join(' | '), otherProperties: 'none',
    parent: setParent ? setParent.name + ' (' + setParent.id + ')' : null, position: setRect, placementBasis: setPlacementBasis,
    predictedSetSize: predictedSet.w + '×' + predictedSet.h },
  variant: SPEC.w + '×' + SPEC.h + ' FIXED · HORIZONTAL · padding ' + SPEC.pad + ' · gap ' + SPEC.gap + ' · radius/md · surface/subtle',
  widthCheck: SPEC.pad * 2 + SPEC.segW * 2 + SPEC.gap + ' == ' + SPEC.w,
  heightCheck: SPEC.pad * 2 + SPEC.segH + ' == ' + SPEC.h,
  segments: VIEWS.map(v => ({ view: v, variants: VIEWS.map(sel => ({ variant: 'view=' + sel, selected: v === sel,
    fill: v === sel ? 'surface/default' : 'none', effect: v === sel ? NEEDED_EFFECT : 'none', icon: 'Icon / View / ' + (v === 'table' ? 'Table' : 'Card'),
    iconColor: v === sel ? 'brand/strong' : 'text/muted' })) }))
};
preflight.arithmetic = SPEC.pad * 2 + SPEC.segW * 2 + SPEC.gap === SPEC.w && SPEC.pad * 2 + SPEC.segH === SPEC.h;

const applyAllowed = blockers.length === 0;

if (DRY_RUN || !applyAllowed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !applyAllowed,
    applyAllowed, blockers, preflight,
    radiusValues, sources, collisions,
    iconSlots, setPlacement: { rect: setRect, basis: setPlacementBasis },
    plan,
    protectedBaseline: protectedBefore,
    pageTopBefore, sourceParentCounts,
    willCreate: plannedNames,
    willNotTouch: '1002:2 전체 · 1003:1738 · 1003:1741 · 기존 Icon 17종 · 1019:115 · 1044:160',
    notes, errorCount: errors.length + blockers.length
  });
}

/* ========================================================================
 * 1. APPLY — 실패하면 만든 것을 전부 지운다
 * ====================================================================== */
const createdIds = [];           // 역순 삭제용 (clone 포함)
const built = { icons: {}, variants: {} };
function track(n) { createdIds.push(n.id); return n; }
function boundPaint(varName) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[varName]); }
function mustBind(node, field, varName) { node.setBoundVariable(field, V[varName]); }
function bindRadius(node, varName, value) {
  node.cornerRadius = value;
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) mustBind(node, f, varName);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function channelBoundTo(node, channel, varName) {
  const ps = visiblePaints(node[channel]);
  return ps.length === 1 && boundColorId(ps[0]) === V[varName].id;
}

let failure = null;
try {
  /* 1-1. 아이콘 2종 */
  for (let k = 0; k < NEW_ICONS.length; k++) {
    const ic = NEW_ICONS[k];
    const src = await figma.getNodeByIdAsync(ic.src);
    const srcParent = src.parent;
    const srcPath = pathDataOf(src);
    const comp = track(figma.createComponent());
    comp.name = ic.name;
    comp.resize(CANVAS, CANVAS);
    comp.fills = []; comp.strokes = [];
    comp.clipsContent = libClips;
    libParent.appendChild(comp);
    comp.x = iconSlots[k].rect.x; comp.y = iconSlots[k].rect.y;

    const glyph = track(src.clone());       // clone 은 원본 부모에 들어간다 → 곧바로 옮긴다
    comp.appendChild(glyph);
    assert(kids(srcParent).length === sourceParentCounts[srcParent.id], ic.src + ' 의 부모 자식 수가 clone 후 원래대로 돌아오지 않았다');
    glyph.name = 'glyph';
    glyph.x = r2((CANVAS - glyph.width) / 2); glyph.y = r2((CANVAS - glyph.height) / 2);
    try { glyph.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }; } catch (e) { notes.push(ic.name + ' constraints 설정 실패: ' + e.message); }
    const channel = sources[ic.key].colorChannel;
    glyph[channel] = [boundPaint('text/muted')];

    assert(pathDataOf(glyph) === srcPath, ic.name + ' 경로가 원본과 다르다');
    assert(near(glyph.width, SPEC.glyph, 0.01) && near(glyph.height, SPEC.glyph, 0.01), ic.name + ' glyph 크기가 13.5 가 아니다: ' + size(glyph));
    assert(channelBoundTo(glyph, channel, 'text/muted'), ic.name + ' 기본 색이 text/muted 로 연결되지 않았다');
    built.icons[ic.key] = { comp, channel, id: comp.id, glyphId: glyph.id, glyphPos: r2(glyph.x) + ',' + r2(glyph.y), size: size(comp) };
  }

  /* 1-2. variant 2개 */
  const comps = [];
  for (const sel of VIEWS) {
    const c = track(figma.createComponent());
    c.name = 'view=' + sel;
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED';
    c.primaryAxisAlignItems = 'MIN'; c.counterAxisAlignItems = 'CENTER';
    c.paddingTop = c.paddingBottom = c.paddingLeft = c.paddingRight = SPEC.pad;
    c.itemSpacing = SPEC.gap;
    c.resize(SPEC.w, SPEC.h);
    c.fills = [boundPaint('surface/subtle')]; c.strokes = [];
    c.clipsContent = false;
    bindRadius(c, 'radius/md', 8);
    setParent.appendChild(c);

    const segs = {};
    for (const v of VIEWS) {
      const selected = v === sel;
      const seg = figma.createFrame();
      seg.name = v;
      seg.layoutMode = 'HORIZONTAL';
      seg.primaryAxisSizingMode = 'FIXED'; seg.counterAxisSizingMode = 'FIXED';
      seg.primaryAxisAlignItems = 'CENTER'; seg.counterAxisAlignItems = 'CENTER';
      seg.paddingTop = seg.paddingBottom = seg.paddingLeft = seg.paddingRight = 0;
      seg.itemSpacing = 0;
      seg.resize(SPEC.segW, SPEC.segH);
      seg.strokes = []; seg.clipsContent = false;
      seg.fills = selected ? [boundPaint('surface/default')] : [];
      bindRadius(seg, 'radius/sm', 4);
      if (selected) { if (typeof seg.setEffectStyleIdAsync === 'function') await seg.setEffectStyleIdAsync(effectStyle.id); else seg.effectStyleId = effectStyle.id; }
      c.appendChild(seg);
      seg.layoutSizingHorizontal = 'FIXED'; seg.layoutSizingVertical = 'FIXED';

      const icon = built.icons[v];
      const inst = icon.comp.createInstance();
      inst.name = 'icon';
      seg.appendChild(inst);
      const g = kids(inst).find(x => x.name === 'glyph');
      assert(!!g, 'view=' + sel + ' / ' + v + ' 아이콘 인스턴스에서 glyph 를 찾지 못했다');
      const colorVar = selected ? 'brand/strong' : 'text/muted';
      g[icon.channel] = [boundPaint(colorVar)];
      assert(channelBoundTo(g, icon.channel, colorVar), 'view=' + sel + ' / ' + v + ' 아이콘 색 override 가 ' + colorVar + ' 로 연결되지 않았다');
      segs[v] = { seg, inst, selected, colorVar };
    }
    comps.push(c);
    built.variants[sel] = { comp: c, segs };
  }

  /* 1-3. Component Set */
  const set = track(figma.combineAsVariants(comps, setParent));
  set.name = SET_NAME;
  set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = SET_GAP;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = SET_PAD;
  set.x = setRect.x; set.y = setRect.y;
  try {
    set.description = '목록 보기 전환 토글. view = table | card, 선택된 쪽이 현재 보기다.\n' +
      '52×36 (툴바 컨트롤 높이 36), padding 4, segment 22×28, radius/md · radius/sm.\n' +
      '선택: surface/default + elevation/card + 아이콘 brand/strong. 비선택: 배경 없음 + 아이콘 text/muted.\n' +
      '아이콘 마스터(Icon / View / *)는 상태 색을 갖지 않는다 — 상태 색은 이 세트가 override 로 책임진다.';
  } catch (e) { /* 무시 */ }
  built.set = set;
} catch (e) {
  failure = e && e.message ? e.message : String(e);
}

/* ========================================================================
 * 2. 실패 시 rollback
 * ====================================================================== */
if (failure) {
  const rollback = [];
  for (let i = createdIds.length - 1; i >= 0; i--) {
    const n = await figma.getNodeByIdAsync(createdIds[i]);
    if (!n || n.removed) { rollback.push({ id: createdIds[i], result: 'already gone' }); continue; }
    try { n.remove(); rollback.push({ id: createdIds[i], result: 'removed' }); }
    catch (e) { rollback.push({ id: createdIds[i], result: 'remove failed: ' + e.message }); }
  }
  const leftovers = [];
  for (const id of createdIds) { const n = await figma.getNodeByIdAsync(id); if (n && !n.removed) leftovers.push(id); }
  const strayByName = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).filter(c => plannedNames.indexOf(c.name) >= 0).map(c => c.id);
  const protectedAfter = takeProtected();
  const protectedDiff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(protectedAfter[k]));
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure,
    rolledBack: true, rollback, leftovers, strayByName,
    rollbackClean: leftovers.length === 0 && strayByName.length === 0,
    protectedUnchanged: protectedDiff.length === 0, protectedDiff,
    notes, errorCount: 1
  });
}

/* ========================================================================
 * 3. 되읽기 검증
 * ====================================================================== */
const set = built.set;
const checks = {};
const defs = set.componentPropertyDefinitions || {};
const defKeys = Object.keys(defs);
checks.onlyViewVariantProperty = defKeys.length === 1 && defs[defKeys[0]].type === 'VARIANT' && /^view/.test(defKeys[0]);
checks.variantOptions = defKeys.length ? (defs[defKeys[0]].variantOptions || []).slice().sort().join(',') === VIEWS.slice().sort().join(',') : false;
checks.variantCount = kids(set).length === VIEWS.length;

const variantReport = [];
let allVariantGeometry = true, allSegmentGeometry = true, allSegmentState = true, allIconLinks = true, allIconColors = true, allRadius = true;
for (const sel of VIEWS) {
  const vc = built.variants[sel].comp;
  const vOk = near(vc.width, SPEC.w) && near(vc.height, SPEC.h) && vc.paddingLeft === SPEC.pad && vc.paddingTop === SPEC.pad && vc.itemSpacing === SPEC.gap &&
    channelBoundTo(vc, 'fills', 'surface/subtle');
  if (!vOk) allVariantGeometry = false;
  const vRadius = vc.boundVariables && vc.boundVariables.topLeftRadius && vc.boundVariables.topLeftRadius.id === V['radius/md'].id;
  if (!vRadius) allRadius = false;
  const segRep = [];
  const order = kids(vc).map(x => x.name).join(',');
  if (order !== VIEWS.join(',')) allSegmentGeometry = false;
  for (const v of VIEWS) {
    const { seg, inst, selected, colorVar } = built.variants[sel].segs[v];
    const geo = near(seg.width, SPEC.segW) && near(seg.height, SPEC.segH) && near(seg.x, SPEC.pad + VIEWS.indexOf(v) * SPEC.segW) && near(seg.y, SPEC.pad);
    if (!geo) allSegmentGeometry = false;
    const fillOk = selected ? channelBoundTo(seg, 'fills', 'surface/default') : visiblePaints(seg.fills).length === 0;
    const fxOk = selected ? seg.effectStyleId === effectStyle.id : (!seg.effectStyleId && visiblePaints(seg.effects || []).length === 0);
    if (!fillOk || !fxOk) allSegmentState = false;
    const sRadius = seg.boundVariables && seg.boundVariables.topLeftRadius && seg.boundVariables.topLeftRadius.id === V['radius/sm'].id;
    if (!sRadius) allRadius = false;
    const mc = await inst.getMainComponentAsync();
    const linkOk = !!mc && mc.id === built.icons[v].id && near(inst.width, CANVAS) && near(inst.height, CANVAS) &&
      near(inst.x, (SPEC.segW - CANVAS) / 2) && near(inst.y, (SPEC.segH - CANVAS) / 2);
    if (!linkOk) allIconLinks = false;
    const g = kids(inst).find(x => x.name === 'glyph');
    const colorOk = !!g && channelBoundTo(g, built.icons[v].channel, colorVar);
    if (!colorOk) allIconColors = false;
    segRep.push({ segment: v, selected, size: size(seg), pos: r2(seg.x) + ',' + r2(seg.y), fillOk, effectOk: fxOk, radiusOk: !!sRadius,
      iconMaster: mc ? mc.name : null, iconPos: r2(inst.x) + ',' + r2(inst.y), iconColor: colorVar, iconColorOk: colorOk });
  }
  variantReport.push({ variant: vc.name, id: vc.id, size: size(vc), geometryOk: vOk, radiusOk: !!vRadius, segmentOrder: order, segments: segRep });
}
Object.assign(checks, { allVariantGeometry, allSegmentGeometry, allSegmentState, allIconLinks, allIconColors, allRadiusBound: allRadius });

const iconReport = [];
let allIconsOk = true;
for (const ic of NEW_ICONS) {
  const b = built.icons[ic.key];
  const src = await figma.getNodeByIdAsync(ic.src);
  const g = kids(b.comp)[0];
  const ok = near(b.comp.width, CANVAS) && near(b.comp.height, CANVAS) && kids(b.comp).length === 1 && g.name === 'glyph' &&
    pathDataOf(g) === pathDataOf(src) && near(g.width, SPEC.glyph, 0.01) && near(g.x, (CANVAS - SPEC.glyph) / 2) && near(g.y, (CANVAS - SPEC.glyph) / 2) &&
    channelBoundTo(g, b.channel, 'text/muted') && b.comp.parent.id === libParent.id;
  if (!ok) allIconsOk = false;
  iconReport.push({ name: ic.name, id: b.id, size: b.size, glyphPos: b.glyphPos, channel: b.channel, defaultColor: 'text/muted', pathMatchesSource: pathDataOf(g) === pathDataOf(src), ok });
}
checks.allIconsOk = allIconsOk;

/* stray — 이름당 정확히 1개, 페이지 최상위 증가 = 계획한 수 */
const nameCounts = {};
for (const nm of plannedNames) nameCounts[nm] = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).filter(c => c.name === nm).length;
checks.eachNameExactlyOnce = plannedNames.every(nm => nameCounts[nm] === 1);
const pageTopAfter = { icons: kids(libParent).length, set: kids(setParent).length };
const expectedTopDelta = pageTopBefore.sameParent ? { icons: NEW_ICONS.length + 1, set: NEW_ICONS.length + 1 } : { icons: NEW_ICONS.length, set: 1 };
checks.pageTopDeltaExact = pageTopAfter.icons - pageTopBefore.icons === expectedTopDelta.icons && pageTopAfter.set - pageTopBefore.set === expectedTopDelta.set;
const srcParentNow = {};
for (const pid of Object.keys(sourceParentCounts)) { const p = await figma.getNodeByIdAsync(pid); srcParentNow[pid] = p ? kids(p).length : null; }
checks.sourceParentsRestored = Object.keys(sourceParentCounts).every(pid => srcParentNow[pid] === sourceParentCounts[pid]);

/* 보호 대상 */
const protectedAfter = takeProtected();
const protectedDiff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(protectedAfter[k]));
checks.protectedUnchanged = protectedDiff.length === 0;

const failedCriteria = Object.keys(checks).filter(k => checks[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

/* 성공했을 때만 verifier 용 기준값을 남긴다 */
if (successCriteriaMet) {
  try {
    figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
      scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
      ids: { iconTable: built.icons.table.id, iconCard: built.icons.card.id, set: set.id,
             variantTable: built.variants.table.comp.id, variantCard: built.variants.card.comp.id },
      channels: { table: built.icons.table.channel, card: built.icons.card.channel },
      protected: protectedAfter, pageTopAfter, sourceParentCounts
    }));
  } catch (e) { notes.push('기준값 저장 실패 (verifier 가 대신 다시 잰다): ' + e.message); }
} else {
  errors.push('되읽기 검증 실패: ' + failedCriteria.join(', ') + ' — 만든 노드는 지우지 않았다. 결과를 보고 판단한다.');
}

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet, failedCriteria, checks,
  created: { iconTable: built.icons.table.id, iconCard: built.icons.card.id, set: set.id, setSize: size(set), setPos: r2(set.x) + ',' + r2(set.y),
    properties: defKeys.map(k => ({ key: k, type: defs[k].type, options: defs[k].variantOptions, default: defs[k].defaultValue })) },
  icons: iconReport, variants: variantReport,
  nameCounts, pageTopBefore, pageTopAfter, sourceParentCounts, srcParentNow,
  protectedDiff,
  notes, errorCount: errors.length, errors
});
