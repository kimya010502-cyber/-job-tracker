/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 29b
 * Phase G1-A 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그가 없다 — 그대로 실행한다.
 * 보호 대상 비교는 29 APPLY 가 성공 직후 남긴 기준값(joob.G1A.baseline)과 한다.
 * snapshot 함수는 29 와 글자 하나 다르지 않게 같은 것을 쓴다 (해시가 같은 규칙으로 나와야 비교가 된다).
 * ========================================================================== */

const SCRIPT_VERSION = '29b-G1A-v1-viewtoggle-create-verify';

const EXPECT_IDS = { iconTable: '1105:646', iconCard: '1105:648', set: '1105:664', variantTable: '1105:650', variantCard: '1105:657' };
const IDS = { mainFrame: '1002:2', srcTable: '1003:1738', srcCard: '1003:1741', originalToggle: '1003:1735', originalMargin: '1003:1734' };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const ICON_LIBRARY = [
  ['Icon / Search', '1048:784'], ['Icon / Reset', '1048:786'], ['Icon / Plus', '1048:788'], ['Icon / Arrow Up', '1048:790'],
  ['Icon / Stage Count', '1048:792'], ['Icon / External Link', '1048:794'], ['Icon / More', '1048:796'],
  ['Icon / Nav / Applications', '1048:798'], ['Icon / Nav / Statistics', '1048:800'], ['Icon / Nav / Calendar', '1048:802'],
  ['Icon / Nav / Memo', '1048:804'], ['Icon / Nav / Settings', '1048:806'], ['Icon / Nav / Help', '1048:808'],
  ['Icon / Chevron Left', '1048:810'], ['Icon / Chevron Right', '1048:812'], ['Icon / Bell', '1048:814'], ['Icon / Dot', '1048:816']
];
const ICONS = [
  { key: 'table', name: 'Icon / View / Table', id: EXPECT_IDS.iconTable, src: IDS.srcTable },
  { key: 'card',  name: 'Icon / View / Card',  id: EXPECT_IDS.iconCard,  src: IDS.srcCard }
];
const SET_NAME = 'View Toggle';
const VIEWS = ['table', 'card'];
const SPEC = { w: 52, h: 36, pad: 4, gap: 0, segW: 22, segH: 28, icon: 16, glyph: 13.5 };
const CANVAS = 16;
const BASELINE_KEY = 'joob.G1A.baseline';

/* ======== 공통 (29 와 동일) ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function boundColorId(p) { return p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null; }
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

/* ======== 기준값 · 변수 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { baseline = null; }
if (!baseline) errors.push('29 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 보호 대상 불변을 비교할 수 없다. 29 를 실행한 것과 같은 플러그인(Scripter)에서 실행했는지 확인');
else if (baseline.scriptVersion !== '29-G1A-v1-viewtoggle-create') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const varNameById = {};
for (const k of Object.keys(V)) varNameById[V[k].id] = k;
let effectStyle = null;
for (const s of await figma.getLocalEffectStylesAsync()) if (s.name === 'elevation/card') effectStyle = s;
if (!effectStyle) errors.push('effect style elevation/card 를 찾지 못했다');
function channelVar(node, channel) {
  const ps = visiblePaints(node && node[channel]);
  return ps.length === 1 ? (varNameById[boundColorId(ps[0])] || (boundColorId(ps[0]) ? '(다른 변수)' : null)) : (ps.length ? 'MULTIPLE' : null);
}
function radiusVar(node) {
  const bv = node && node.boundVariables ? node.boundVariables : {};
  const names = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].map(f => bv[f] && bv[f].id ? varNameById[bv[f].id] || '(다른 변수)' : null);
  return names.every(n => n === names[0]) ? names[0] : 'MIXED:' + names.join(',');
}

const checks = {};

/* ======== 1. 만든 노드 ======== */
const nodes = {};
for (const k of Object.keys(EXPECT_IDS)) nodes[k] = await figma.getNodeByIdAsync(EXPECT_IDS[k]);
checks.createdNodesFound = Object.keys(nodes).every(k => !!nodes[k]);
checks.iconTableId = !!nodes.iconTable && nodes.iconTable.type === 'COMPONENT' && nodes.iconTable.name === 'Icon / View / Table';
checks.iconCardId = !!nodes.iconCard && nodes.iconCard.type === 'COMPONENT' && nodes.iconCard.name === 'Icon / View / Card';
checks.viewToggleSetId = !!nodes.set && nodes.set.type === 'COMPONENT_SET' && nodes.set.name === SET_NAME;
if (baseline && baseline.ids) {
  const same = Object.keys(EXPECT_IDS).every(k => baseline.ids[k] === EXPECT_IDS[k]);
  if (!same) errors.push('기준값에 기록된 ID 가 이번 검증의 ID 와 다르다: ' + JSON.stringify(baseline.ids));
}

await figma.loadAllPagesAsync();
const allComps = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
const nameCounts = {};
for (const nm of ICONS.map(i => i.name).concat([SET_NAME])) nameCounts[nm] = allComps.filter(c => c.name === nm).length;
checks.eachNameExactlyOnce = Object.keys(nameCounts).every(k => nameCounts[k] === 1);

/* ======== 2. 아이콘 ======== */
const iconReport = [];
let iconCanvas16 = true, glyphSize13_5 = true, glyphCentered1_25 = true, pathMatchesSource = true, iconDefaultColorMuted = true, iconColorVariableBound = true;
const channels = {};
for (const ic of ICONS) {
  const comp = nodes[ic.key === 'table' ? 'iconTable' : 'iconCard'];
  const src = await figma.getNodeByIdAsync(ic.src);
  const g = comp && kids(comp).length === 1 ? kids(comp)[0] : null;
  const channel = g ? (visiblePaints(g.fills).length ? 'fills' : (visiblePaints(g.strokes).length ? 'strokes' : null)) : null;
  channels[ic.key] = channel;
  const color = g && channel ? channelVar(g, channel) : null;
  const rec = {
    name: ic.name, id: comp ? comp.id : null, size: size(comp), glyphName: g ? g.name : null, glyphSize: size(g),
    glyphPos: g ? r2(g.x) + ',' + r2(g.y) : null, channel, defaultColor: color,
    canvasOk: !!comp && near(comp.width, CANVAS, 0.01) && near(comp.height, CANVAS, 0.01),
    glyphSizeOk: !!g && near(g.width, SPEC.glyph, 0.01) && near(g.height, SPEC.glyph, 0.01),
    centeredOk: !!g && near(g.x, 1.25, 0.01) && near(g.y, 1.25, 0.01),
    pathOk: !!g && !!src && pathDataOf(g) !== null && pathDataOf(g) === pathDataOf(src),
    boundOk: !!g && !!channel && (function () { const ps = visiblePaints(g[channel]); return ps.length === 1 && !!boundColorId(ps[0]); })(),
    colorOk: color === 'text/muted'
  };
  if (!rec.canvasOk) iconCanvas16 = false;
  if (!rec.glyphSizeOk) glyphSize13_5 = false;
  if (!rec.centeredOk) glyphCentered1_25 = false;
  if (!rec.pathOk) pathMatchesSource = false;
  if (!rec.colorOk) iconDefaultColorMuted = false;
  if (!rec.boundOk) iconColorVariableBound = false;
  iconReport.push(rec);
}
Object.assign(checks, { iconCanvas16, glyphSize13_5, glyphCentered1_25, pathMatchesSource, iconDefaultColorMuted, iconColorVariableBound });

/* ======== 3. Component Set ======== */
const set = nodes.set;
const defs = set ? (set.componentPropertyDefinitions || {}) : {};
const defKeys = Object.keys(defs);
checks.onlyViewVariantProperty = defKeys.length === 1 && defs[defKeys[0]].type === 'VARIANT' && /^view/.test(defKeys[0]);
checks.variantOptionsTableCard = defKeys.length === 1 && (defs[defKeys[0]].variantOptions || []).slice().sort().join(',') === 'card,table';
checks.variantCount2 = !!set && kids(set).length === 2 && kids(set).every(c => c.type === 'COMPONENT');

const variantReport = [];
let variantSize52x36 = true, segmentSize22x28 = true, segmentOrderCorrect = true;
let selectedFillSurfaceDefault = true, selectedEffectElevationCard = true, selectedIconBrandStrong = true;
let unselectedNoFill = true, unselectedNoEffect = true, unselectedIconTextMuted = true;
let radiusBindingsCorrect = true, iconLinksCorrect = true;
for (const sel of VIEWS) {
  const vc = nodes[sel === 'table' ? 'variantTable' : 'variantCard'];
  if (!vc || vc.name !== 'view=' + sel || !vc.parent || vc.parent.id !== EXPECT_IDS.set) {
    variantSize52x36 = false; notes.push('view=' + sel + ' variant 가 없거나 세트 밖에 있다'); continue;
  }
  const vGeo = near(vc.width, SPEC.w) && near(vc.height, SPEC.h) && vc.layoutMode === 'HORIZONTAL' &&
    vc.paddingTop === SPEC.pad && vc.paddingBottom === SPEC.pad && vc.paddingLeft === SPEC.pad && vc.paddingRight === SPEC.pad && vc.itemSpacing === SPEC.gap;
  if (!vGeo) variantSize52x36 = false;
  const vFill = channelVar(vc, 'fills');
  const vRadius = radiusVar(vc);
  if (vRadius !== 'radius/md') radiusBindingsCorrect = false;
  if (vFill !== 'surface/subtle') notes.push('view=' + sel + ' 배경이 surface/subtle 이 아니다: ' + vFill);
  const order = kids(vc).map(x => x.name).join(',');
  if (order !== VIEWS.join(',')) segmentOrderCorrect = false;
  const segRep = [];
  for (const v of VIEWS) {
    const seg = kids(vc).find(x => x.name === v);
    if (!seg) { segmentSize22x28 = false; continue; }
    const selected = v === sel;
    const geo = near(seg.width, SPEC.segW) && near(seg.height, SPEC.segH) && near(seg.x, SPEC.pad + VIEWS.indexOf(v) * SPEC.segW) && near(seg.y, SPEC.pad);
    if (!geo) segmentSize22x28 = false;
    const fill = channelVar(seg, 'fills');
    const fxStyle = seg.effectStyleId || '';
    const fxVisible = visiblePaints(seg.effects || []).length;
    const sRadius = radiusVar(seg);
    if (sRadius !== 'radius/sm') radiusBindingsCorrect = false;
    const inst = kids(seg).find(x => x.type === 'INSTANCE');
    const mc = inst ? await inst.getMainComponentAsync() : null;
    const expectIconId = v === 'table' ? EXPECT_IDS.iconTable : EXPECT_IDS.iconCard;
    const linkOk = !!mc && mc.id === expectIconId && near(inst.width, CANVAS) && near(inst.height, CANVAS) &&
      near(inst.x, (SPEC.segW - CANVAS) / 2) && near(inst.y, (SPEC.segH - CANVAS) / 2);
    if (!linkOk) iconLinksCorrect = false;
    const g = inst ? kids(inst).find(x => x.name === 'glyph') : null;
    const iconColor = g && channels[v] ? channelVar(g, channels[v]) : null;
    if (selected) {
      if (fill !== 'surface/default') selectedFillSurfaceDefault = false;
      if (!effectStyle || fxStyle !== effectStyle.id) selectedEffectElevationCard = false;
      if (iconColor !== 'brand/strong') selectedIconBrandStrong = false;
    } else {
      if (visiblePaints(seg.fills).length !== 0) unselectedNoFill = false;
      if (fxStyle || fxVisible) unselectedNoEffect = false;
      if (iconColor !== 'text/muted') unselectedIconTextMuted = false;
    }
    segRep.push({ segment: v, selected, size: size(seg), pos: r2(seg.x) + ',' + r2(seg.y), fill, effectStyle: fxStyle ? (effectStyle && fxStyle === effectStyle.id ? 'elevation/card' : fxStyle) : null,
      visibleEffects: fxVisible, radius: sRadius, iconMaster: mc ? mc.name + ' (' + mc.id + ')' : null, iconPos: inst ? r2(inst.x) + ',' + r2(inst.y) : null, iconColor, linkOk });
  }
  variantReport.push({ variant: vc.name, id: vc.id, size: size(vc), padding: [vc.paddingTop, vc.paddingRight, vc.paddingBottom, vc.paddingLeft], gap: vc.itemSpacing,
    fill: vFill, radius: vRadius, segmentOrder: order, segments: segRep });
}
Object.assign(checks, { variantSize52x36, segmentSize22x28, segmentOrderCorrect,
  selectedFillSurfaceDefault, selectedEffectElevationCard, selectedIconBrandStrong,
  unselectedNoFill, unselectedNoEffect, unselectedIconTextMuted, radiusBindingsCorrect, iconLinksCorrect });

/* ======== 4. 보호 대상 ======== */
const protectedNow = {
  mainFrame: snapshot(await figma.getNodeByIdAsync(IDS.mainFrame)),
  srcTable: snapshot(await figma.getNodeByIdAsync(IDS.srcTable)),
  srcCard: snapshot(await figma.getNodeByIdAsync(IDS.srcCard))
};
for (const id of BACKUP_COPY_IDS) protectedNow['backup ' + id] = snapshot(await figma.getNodeByIdAsync(id));
for (const [name, id] of ICON_LIBRARY) protectedNow[name] = snapshot(await figma.getNodeByIdAsync(id));
const bp = baseline && baseline.protected ? baseline.protected : null;
const same = k => !!bp && !!bp[k] && JSON.stringify(bp[k]) === JSON.stringify(protectedNow[k]);
const protectedDiff = bp ? Object.keys(protectedNow).filter(k => !same(k)) : ['(기준값 없음)'];

checks.sourceVectorsUnchanged = same('srcTable') && same('srcCard');
/* 원래 토글 1003:1735 — 메인 화면 해시 불변 + 구조 사실 직접 확인 */
const og = await figma.getNodeByIdAsync(IDS.originalToggle);
const ogFacts = og ? { size: size(og), visible: og.visible !== false, parent: og.parent ? og.parent.id : null,
  children: kids(og).map(c => c.id + ' ' + size(c)), type: og.type } : null;
checks.originalToggleUnchanged = same('mainFrame') && !!og && og.type === 'FRAME' && og.visible !== false && og.parent && og.parent.id === IDS.originalMargin &&
  near(og.width, 51) && near(og.height, 35.5) && kids(og).map(c => c.id).join(',') === '1003:1736,1003:1739';
checks.mainFrameUnchanged = same('mainFrame');
checks.existing17IconsUnchanged = ICON_LIBRARY.every(([name]) => same(name));
checks.backup1019_115Unchanged = same('backup 1019:115');
checks.backup1044_160Unchanged = same('backup 1044:160');

/* ======== 5. stray ======== */
const libParent = (await figma.getNodeByIdAsync(ICON_LIBRARY[0][1])) ? (await figma.getNodeByIdAsync(ICON_LIBRARY[0][1])).parent : null;
const setParent = set ? set.parent : null;
const topNow = { icons: libParent ? kids(libParent).length : null, set: setParent ? kids(setParent).length : null };
const topSame = !!baseline && !!baseline.pageTopAfter && baseline.pageTopAfter.icons === topNow.icons && baseline.pageTopAfter.set === topNow.set;
/* 이 세트 밖에 떠 있는 variant/segment 이름의 노드, 부모 없는 glyph 복제본 */
const orphans = [];
for (const p of [libParent, setParent].filter((x, i, a) => x && a.findIndex(y => y && y.id === x.id) === i)) {
  for (const c of kids(p)) {
    if (/^view=/.test(c.name) || c.name === 'glyph' || ((c.name === 'table' || c.name === 'card') && c.type === 'FRAME')) orphans.push({ id: c.id, name: c.name, type: c.type });
  }
}
const srcParentNow = {};
if (baseline && baseline.sourceParentCounts) for (const pid of Object.keys(baseline.sourceParentCounts)) { const p = await figma.getNodeByIdAsync(pid); srcParentNow[pid] = p ? kids(p).length : null; }
const srcParentsSame = !!baseline && !!baseline.sourceParentCounts && Object.keys(baseline.sourceParentCounts).every(pid => srcParentNow[pid] === baseline.sourceParentCounts[pid]);
checks.noStrayDuplicates = checks.eachNameExactlyOnce && topSame && orphans.length === 0 && srcParentsSame;

checks.noErrors = errors.length === 0;

const failedCriteria = Object.keys(checks).filter(k => checks[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase G1-A CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks,
  ids: EXPECT_IDS,
  icons: iconReport,
  set: set ? { id: set.id, size: size(set), properties: defKeys.map(k => ({ key: k, type: defs[k].type, options: defs[k].variantOptions, default: defs[k].defaultValue })) } : null,
  variants: variantReport,
  nameCounts,
  protectedDiff,
  originalToggle: ogFacts,
  stray: { topNow, topBaseline: baseline ? baseline.pageTopAfter : null, orphans, srcParentNow, srcParentBaseline: baseline ? baseline.sourceParentCounts : null },
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at } : null,
  notes, errorCount: errors.length, errors
});
