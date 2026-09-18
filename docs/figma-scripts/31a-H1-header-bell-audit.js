/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 31a
 * Phase H1 사전 감사 — Header 알림(Bell) 버튼 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 *
 * 확인하는 것
 *   1) Header 1002:469 자체 — 크기 · 배치 · fill 투명도 · 그림자 · blur (읽기만, 보호 대상 기준값)
 *   2) Bell 후보 — 과거 기록 ID(버튼 1002:487, 벡터 1002:489) · 이름 · 구조 세 방향에서 찾아 서로 맞는지
 *   3) Bell 버튼 실제 — 크기 · local 위치 · padding · radius · fill · effect · 자식 · 아이콘 크기/색 · auto layout
 *      알림 점(badge) 같은 Icon Button 이 표현 못 하는 부속물이 있는지
 *   4) 부모와 형제 — Bell 앞뒤 요소, gap, 정렬, 부모 sizing, 부모 사슬(Header 까지)
 *   5) Icon Button 1037:2091 — 크기 · padding · radius · fill · 아이콘 슬롯 · INSTANCE_SWAP 속성 · 아이콘 색
 *      화면에 이미 쓰인 Icon Button 인스턴스 표본 (색을 override 하는 관례가 있는지)
 *   6) 24×24 로 바꾸면 — 부모 크기 · 형제 위치 · Header 안 세로 중심이 어떻게 되는지 (예측, 수정 없음)
 *   7) 원본 Bell 벡터 vs Icon / Bell 1048:814 — 명령 순서 · 종횡비 · 축척 보정 후 좌표 일치
 *   8) 같은 Bell 버튼 복제본이 다른 곳(backup)에 있는지
 * ========================================================================== */

const SCRIPT_VERSION = '31a-H1-v1-header-bell-audit';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', legacyButton: '1002:487', legacyVector: '1002:489',
  syncBadge: '1002:478', profile: '1002:491', iconButton: '1037:2091', iconBell: '1048:814'
};
const NAME_RE = /bell|알림|notif|noti/i;

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function pads(n) { return [sg(n, 'paddingTop'), sg(n, 'paddingRight'), sg(n, 'paddingBottom'), sg(n, 'paddingLeft')].map(r2); }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function isVectorish(n) { return ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'ELLIPSE'].indexOf(n.type) >= 0; }
function walk(n, fn, d) { d = d || 0; fn(n, d); for (const c of kids(n)) walk(c, fn, d + 1); }
function absX(n) { return n.absoluteTransform[0][2]; }
function absY(n) { return n.absoluteTransform[1][2]; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }

const varCache = {};
async function varName(id) {
  if (!id) return null;
  if (id in varCache) return varCache[id];
  let name; try { const v = await figma.variables.getVariableByIdAsync(id); name = v ? v.name : '(없음 ' + id + ')'; } catch (e) { name = '(읽기 실패)'; }
  return (varCache[id] = name);
}
async function styleName(id) {
  if (!id || id === figma.mixed) return id === figma.mixed ? 'MIXED' : null;
  try { const s = await figma.getStyleByIdAsync(id); return s ? s.name : '(없음)'; } catch (e) { return '(읽기 실패)'; }
}
async function paints(list) {
  if (!Array.isArray(list)) return list === figma.mixed ? 'MIXED' : null;
  const res = [];
  for (const p of list) res.push({ type: p.type, visible: p.visible !== false, color: p.type === 'SOLID' ? hex(p.color) : null,
    opacity: r2(typeof p.opacity === 'number' ? p.opacity : 1), variable: p.boundVariables && p.boundVariables.color ? await varName(p.boundVariables.color.id) : null });
  return res;
}
function effects(n) {
  const list = sg(n, 'effects');
  return Array.isArray(list) ? list.map(e => ({ type: e.type, visible: e.visible !== false, color: e.color ? hex(e.color) + '@' + r2(e.color.a) : null,
    offset: e.offset ? r2(e.offset.x) + ',' + r2(e.offset.y) : null, radius: r2(e.radius), spread: r2(e.spread) })) : [];
}
async function bound(n) {
  const bv = sg(n, 'boundVariables'); if (!bv || typeof bv !== 'object') return null;
  const res = {};
  for (const k of Object.keys(bv)) {
    if (k === 'fills' || k === 'strokes' || k === 'effects') continue;
    const v = bv[k];
    if (Array.isArray(v)) { res[k] = []; for (const x of v) res[k].push(await varName(x && x.id)); } else if (v && v.id) res[k] = await varName(v.id);
  }
  return Object.keys(res).length ? res : null;
}
async function describe(n) {
  if (!n) return null;
  const lm = sg(n, 'layoutMode');
  const d = {
    id: n.id, name: n.name, type: n.type, visible: n.visible !== false, size: size(n), x: r2(n.x), y: r2(n.y), opacity: r2(sg(n, 'opacity')),
    layoutMode: lm, layoutPositioning: sg(n, 'layoutPositioning'), sizingH: sg(n, 'layoutSizingHorizontal'), sizingV: sg(n, 'layoutSizingVertical'),
    layoutAlign: sg(n, 'layoutAlign'), layoutGrow: sg(n, 'layoutGrow'),
    padding: lm && lm !== 'NONE' ? pads(n) : null, itemSpacing: lm && lm !== 'NONE' ? r2(sg(n, 'itemSpacing')) : null,
    primaryAlign: lm && lm !== 'NONE' ? sg(n, 'primaryAxisAlignItems') : null, counterAlign: lm && lm !== 'NONE' ? sg(n, 'counterAxisAlignItems') : null,
    cornerRadius: sg(n, 'cornerRadius') === 'MIXED' ? [sg(n, 'topLeftRadius'), sg(n, 'topRightRadius'), sg(n, 'bottomRightRadius'), sg(n, 'bottomLeftRadius')].map(r2) : r2(sg(n, 'cornerRadius')),
    clipsContent: sg(n, 'clipsContent'),
    fills: await paints(sg(n, 'fills')), fillStyle: await styleName(sg(n, 'fillStyleId')),
    strokes: await paints(sg(n, 'strokes')), strokeWeight: sg(n, 'strokeWeight'),
    effects: effects(n), effectStyle: await styleName(sg(n, 'effectStyleId')),
    boundVariables: await bound(n), childCount: kids(n).length
  };
  if (n.type === 'INSTANCE') { const mc = await mainCompOf(n); d.mainComponent = mc ? mc.name + ' (' + mc.id + ')' : null; }
  if (n.type === 'TEXT') d.characters = n.characters;
  if (isVectorish(n)) { const pd = pathDataOf(n); d.pathLength = pd ? pd.length : null; d.pathCommands = pd ? (pd.match(/[A-Za-z]/g) || []).join('') : null; }
  return d;
}
async function tree(n, depth, maxDepth) {
  const d = await describe(n); if (!d) return null;
  if (depth < maxDepth && kids(n).length) { d.children = []; for (const c of kids(n)) d.children.push(await tree(c, depth + 1, maxDepth)); }
  return d;
}
function pathTo(n, stopId) { const p = []; let x = n; while (x && x.type !== 'PAGE') { p.unshift(x.name + ' (' + x.id + ')'); if (x.id === stopId) break; x = x.parent; } return p.join(' › '); }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }

/* ======== 0. 가드 ======== */
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!N.mainFrame || !N.header) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '메인 화면 1002:2 또는 Header 1002:469 를 찾지 못했다' });

/* ======== 1. Header 자체 (읽기만) ======== */
const headerInfo = await describe(N.header);
headerInfo.absolute = r2(absX(N.header)) + ',' + r2(absY(N.header));
const headerTree = await tree(N.header, 0, 4);

/* ======== 2. Bell 후보 ======== */
const byName = [], byStructure = [];
walk(N.header, (n, d) => {
  if (d === 0) return;
  if (NAME_RE.test(n.name)) byName.push({ id: n.id, name: n.name, type: n.type, size: size(n), visible: n.visible !== false });
  /* 구조: 글자 없는 작은 컨테이너(≤44) 안에 벡터가 있고, 그 조상 중 다른 후보가 없는 것 */
  if ((n.type === 'FRAME' || n.type === 'INSTANCE' || n.type === 'GROUP') && n.width <= 44 && n.height <= 44 && n.visible !== false) {
    let hasVec = false, hasText = false;
    walk(n, x => { if (x !== n && x.visible !== false) { if (isVectorish(x)) hasVec = true; if (x.type === 'TEXT') hasText = true; } });
    if (hasVec && !hasText) byStructure.push({ id: n.id, name: n.name, type: n.type, size: size(n), parent: n.parent ? n.parent.id : null, path: pathTo(n, IDS.header) });
  }
});
/* 구조 후보 중 가장 바깥 것만 (안쪽 Container 는 같은 버튼) */
const structOuter = [];
for (const s of byStructure) {
  const n = await figma.getNodeByIdAsync(s.id);
  const hasCandidateAncestor = byStructure.some(o => o.id !== s.id && n.parent && inside(n.parent, o.id));
  if (!hasCandidateAncestor) structOuter.push(s);
}
const legacyOk = !!N.legacyButton && inside(N.legacyButton, IDS.header) && !!N.legacyVector && inside(N.legacyVector, IDS.legacyButton);
const candidate = legacyOk ? N.legacyButton : (structOuter.length === 1 ? await figma.getNodeByIdAsync(structOuter[0].id) : null);
const candidateBasis = legacyOk ? 'legacyId' : (structOuter.length === 1 ? 'structureUnique' : (structOuter.length ? 'ambiguous' : 'notFound'));
if (!candidate) errors.push('Bell 버튼을 확정하지 못했다 — ' + candidateBasis);
const structureAgreesWithLegacy = legacyOk ? structOuter.some(s => s.id === IDS.legacyButton) : null;
const otherIconLikeInHeader = structOuter.filter(s => !candidate || s.id !== candidate.id);

/* ======== 3. Bell 버튼 실제 ======== */
let bell = null, bellVector = null, extras = [];
if (candidate) {
  bell = await tree(candidate, 0, 4);
  bell.absoluteInHeader = r2(absX(candidate) - absX(N.header)) + ',' + r2(absY(candidate) - absY(N.header));
  bell.path = pathTo(candidate, IDS.header);
  const vecs = []; walk(candidate, x => { if (x !== candidate && isVectorish(x) && x.visible !== false) vecs.push(x); });
  const main = legacyOk ? N.legacyVector : vecs.slice().sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (main) {
    bellVector = await describe(main);
    bellVector.absoluteInButton = r2(absX(main) - absX(candidate)) + ',' + r2(absY(main) - absY(candidate));
    bellVector.opticalCenterOffset = { x: r2(absX(main) + main.width / 2 - (absX(candidate) + candidate.width / 2)), y: r2(absY(main) + main.height / 2 - (absY(candidate) + candidate.height / 2)) };
  }
  /* 부속물 — 주 벡터가 아닌 보이는 벡터/작은 도형 (알림 점 등) */
  for (const v of vecs) if (!main || v.id !== main.id) extras.push(await describe(v));
  walk(candidate, x => { if (x !== candidate && (x.type === 'RECTANGLE') && x.visible !== false) extras.push({ id: x.id, name: x.name, type: x.type, size: size(x) }); });
}

/* ======== 4. 부모 · 형제 · 부모 사슬 ======== */
let siblings = null, parentChain = [];
if (candidate) {
  const p = candidate.parent;
  const f = flow(p);
  const i = f.indexOf(candidate);
  const rows = [];
  for (const c of kids(p)) rows.push({ id: c.id, name: c.name, type: c.type, size: size(c), x: r2(c.x), y: r2(c.y), visible: c.visible !== false,
    positioning: sg(c, 'layoutPositioning'), centerY: r2(c.y + c.height / 2), isBell: c.id === candidate.id });
  siblings = {
    parent: await describe(p), children: rows,
    bellIndex: kids(p).indexOf(candidate), bellFlowIndex: i,
    prev: i > 0 ? f[i - 1].id + ' ' + f[i - 1].name : null, next: i >= 0 && i < f.length - 1 ? f[i + 1].id + ' ' + f[i + 1].name : null,
    gapToPrev: i > 0 ? r2(candidate.x - (f[i - 1].x + f[i - 1].width)) : null,
    gapToNext: i >= 0 && i < f.length - 1 ? r2(f[i + 1].x - (candidate.x + candidate.width)) : null,
    bellIsTallestInParent: f.every(c => c.height <= candidate.height + 0.01),
    tallestOtherHeight: r2(Math.max.apply(null, [0].concat(f.filter(c => c.id !== candidate.id).map(c => c.height))))
  };
  let x = p;
  while (x && x.id !== IDS.header && x.type !== 'PAGE') {
    parentChain.push({ id: x.id, name: x.name, size: size(x), layoutMode: sg(x, 'layoutMode'), sizingH: sg(x, 'layoutSizingHorizontal'), sizingV: sg(x, 'layoutSizingVertical'),
      padding: sg(x, 'layoutMode') && sg(x, 'layoutMode') !== 'NONE' ? pads(x) : null, gap: r2(sg(x, 'itemSpacing')),
      primaryAlign: sg(x, 'primaryAxisAlignItems'), counterAlign: sg(x, 'counterAxisAlignItems'), childCount: kids(x).length, flowCount: flow(x).length });
    x = x.parent;
  }
  parentChain.push({ id: N.header.id, name: N.header.name, size: size(N.header), layoutMode: sg(N.header, 'layoutMode'),
    sizingH: sg(N.header, 'layoutSizingHorizontal'), sizingV: sg(N.header, 'layoutSizingVertical'), padding: pads(N.header),
    gap: r2(sg(N.header, 'itemSpacing')), primaryAlign: sg(N.header, 'primaryAxisAlignItems'), counterAlign: sg(N.header, 'counterAxisAlignItems') });
}

/* ======== 5. Icon Button 마스터 + 화면 표본 ======== */
let iconButton = null;
if (N.iconButton) {
  iconButton = await tree(N.iconButton, 0, 3);
  try {
    const defs = N.iconButton.componentPropertyDefinitions || {};
    iconButton.properties = [];
    for (const k of Object.keys(defs)) {
      let defName = null;
      if (defs[k].type === 'INSTANCE_SWAP') { const dn = await figma.getNodeByIdAsync(defs[k].defaultValue); defName = dn ? dn.name : null; }
      iconButton.properties.push({ key: k, type: defs[k].type, default: defs[k].defaultValue, defaultName: defName,
        preferredValues: defs[k].preferredValues ? defs[k].preferredValues.length : null });
    }
  } catch (e) { notes.push('Icon Button 속성 읽기 실패: ' + e.message); }
  const slot = kids(N.iconButton).find(c => c.type === 'INSTANCE');
  if (slot) {
    const g = kids(slot).find(c => c.name === 'glyph');
    iconButton.iconSlot = { id: slot.id, name: slot.name, size: size(slot), pos: r2(slot.x) + ',' + r2(slot.y), main: (await mainCompOf(slot) || {}).name || null,
      referencedByProperty: sg(slot, 'componentPropertyReferences'), glyphFills: g ? await paints(g.fills) : null, glyphStrokes: g ? await paints(g.strokes) : null };
  }
}
/* 화면 안 Icon Button 인스턴스 표본 — 색 override 관례 */
const ibInstances = [];
const allInst = N.mainFrame.findAllWithCriteria ? N.mainFrame.findAllWithCriteria({ types: ['INSTANCE'] }) : [];
for (const inst of allInst) {
  const mc = await mainCompOf(inst);
  if (!mc || mc.id !== IDS.iconButton) continue;
  if (ibInstances.length < 4) {
    const slot = kids(inst).find(c => c.type === 'INSTANCE');
    const g = slot ? kids(slot).find(c => c.name === 'glyph') : null;
    const smc = slot ? await mainCompOf(slot) : null;
    ibInstances.push({ id: inst.id, name: inst.name, size: size(inst), parent: inst.parent ? inst.parent.name + ' (' + inst.parent.id + ')' : null,
      icon: smc ? smc.name : null, glyphFills: g ? await paints(g.fills) : null, instanceFills: await paints(inst.fills) });
  } else ibInstances.push({ id: inst.id });
}

/* ======== 6. 24×24 로 바꾸면 (예측) ======== */
let fit = null;
if (candidate && N.iconButton) {
  const p = candidate.parent, lm = sg(p, 'layoutMode');
  const IB = { w: N.iconButton.width, h: N.iconButton.height };
  const f = flow(p);
  const dW = IB.w - candidate.width, dH = IB.h - candidate.height;
  const horizontal = lm === 'HORIZONTAL';
  const otherMaxH = Math.max.apply(null, [0].concat(f.filter(c => c.id !== candidate.id).map(c => c.height)));
  const pp = pads(p);
  let parentAfter = null;
  if (lm && lm !== 'NONE') {
    const hugW = sg(p, 'layoutSizingHorizontal') === 'HUG', hugV = sg(p, 'layoutSizingVertical') === 'HUG';
    const wAfter = hugW ? (horizontal ? p.width + dW : Math.max(pp[1] + pp[3] + IB.w, pp[1] + pp[3] + Math.max.apply(null, [0].concat(f.filter(c => c.id !== candidate.id).map(c => c.width))))) : p.width;
    const hAfter = hugV ? (horizontal ? pp[0] + pp[2] + Math.max(otherMaxH, IB.h) : p.height + dH) : p.height;
    parentAfter = { size: r2(wAfter) + '×' + r2(hAfter), widthDelta: r2(wAfter - p.width), heightDelta: r2(hAfter - p.height), hugW, hugV };
  }
  const bellCenterInHeader = r2(absY(candidate) - absY(N.header) + candidate.height / 2);
  fit = {
    iconButtonSize: IB.w + '×' + IB.h, legacySize: size(candidate), widthDelta: r2(dW), heightDelta: r2(dH),
    parentLayout: lm, parentAfter,
    bellCenterYInHeaderNow: bellCenterInHeader, headerCenterY: r2(N.header.height / 2),
    bellCenteredNow: near(bellCenterInHeader, N.header.height / 2, 0.01),
    note: lm && lm !== 'NONE'
      ? '부모가 auto layout 이라 같은 index 에 넣으면 위치는 부모 정렬이 정한다. 세로 중심은 부모 counterAlign 이 CENTER 면 유지된다.'
      : '부모가 auto layout 이 아니다 — 위치를 직접 맞춰야 한다 (x/y 계산 필요).',
    siblingsShift: horizontal && siblings ? '가로 흐름에서 Bell 뒤 형제들이 ' + r2(dW) + 'px 이동 (부모 정렬 MIN 기준, SPACE_BETWEEN/MAX 면 앞쪽이 이동)' : null
  };
}

/* ======== 7. 원본 벡터 vs Icon / Bell ======== */
let pathCompare = null;
if (bellVector && N.iconBell) {
  const src = await figma.getNodeByIdAsync(bellVector.id);
  const g = kids(N.iconBell).find(c => c.name === 'glyph') || kids(N.iconBell)[0];
  const pdS = pathDataOf(src), pdG = pathDataOf(g);
  const cmdS = pdS ? (pdS.match(/[A-Za-z]/g) || []).join('') : null, cmdG = pdG ? (pdG.match(/[A-Za-z]/g) || []).join('') : null;
  const numsS = pdS ? (pdS.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number) : [], numsG = pdG ? (pdG.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number) : [];
  const kx = g && src ? g.width / src.width : null, ky = g && src ? g.height / src.height : null;
  let maxErr = null;
  if (numsS.length === numsG.length && kx && ky && near(kx, ky, 0.001)) {
    maxErr = 0;
    for (let i = 0; i < numsS.length; i++) maxErr = Math.max(maxErr, Math.abs(numsS[i] * kx - numsG[i]));
    maxErr = Math.round(maxErr * 10000) / 10000;
  }
  pathCompare = {
    source: bellVector.id + ' ' + size(src), iconBell: IDS.iconBell + ' glyph ' + size(g) + ' @ ' + (g ? r2(g.x) + ',' + r2(g.y) : null),
    exactStringMatch: !!pdS && pdS === pdG,
    sameCommandSequence: !!cmdS && cmdS === cmdG, commandCount: cmdS ? cmdS.length : null,
    sameNumberCount: numsS.length === numsG.length, scaleX: r2(kx * 1000) / 1000, scaleY: r2(ky * 1000) / 1000,
    aspectPreserved: !!kx && near(kx, ky, 0.001),
    maxCoordErrorAfterScale: maxErr,
    sameShape: !!cmdS && cmdS === cmdG && maxErr !== null && maxErr < 0.01,
    glyphFills: g ? await paints(g.fills) : null, glyphStrokes: g ? await paints(g.strokes) : null,
    sourceFills: await paints(src.fills), sourceStrokes: await paints(src.strokes),
    visibleSizeChange: src && g ? size(src) + ' → ' + size(g) + ' (Icon Library 16 캔버스에 맞춰 축소된 값)' : null
  };
}

/* ======== 8. 복제본 ======== */
await figma.loadAllPagesAsync();
const copies = [];
if (candidate) {
  const sig = n => size(n) + '/' + kids(n).map(c => c.type + size(c)).join(',');
  const mySig = sig(candidate);
  for (const f of figma.root.findAllWithCriteria({ types: ['FRAME', 'INSTANCE', 'GROUP'] })) {
    if (f.id === candidate.id || !near(f.width, candidate.width) || !near(f.height, candidate.height)) continue;
    if (sig(f) !== mySig) continue;
    let pg = f; while (pg && pg.type !== 'PAGE') pg = pg.parent;
    copies.push({ id: f.id, name: f.name, page: pg ? pg.name : null, insideMainFrame: inside(f, IDS.mainFrame), path: pathTo(f, null).slice(0, 160) });
  }
}

/* ======== 요약 ======== */
const summary = {
  bellFound: !!candidate, bellId: candidate ? candidate.id : null, bellBasis: candidateBasis, structureAgreesWithLegacy,
  bellSize: candidate ? size(candidate) : null, bellType: candidate ? candidate.type : null,
  bellParent: candidate && candidate.parent ? candidate.parent.id + ' ' + candidate.parent.name : null,
  bellParentLayout: candidate ? sg(candidate.parent, 'layoutMode') : null,
  bellPadding: bell ? bell.padding : null, bellRadius: bell ? bell.cornerRadius : null,
  bellHasFill: bell && Array.isArray(bell.fills) ? bell.fills.some(f => f.visible && f.opacity > 0) : null,
  bellHasEffect: bell ? bell.effects.some(e => e.visible) : null,
  bellVector: bellVector ? bellVector.id + ' ' + bellVector.size : null,
  bellIconColor: bellVector ? (bellVector.fills || []).concat(bellVector.strokes || []).filter(p => p.visible).map(p => (p.variable || p.color)).join(',') : null,
  extrasInsideBell: extras.length,
  iconButtonSize: N.iconButton ? size(N.iconButton) : null,
  iconButtonSwapProperty: iconButton && iconButton.properties ? iconButton.properties.filter(p => p.type === 'INSTANCE_SWAP').map(p => p.key).join(',') : null,
  iconButtonInstancesOnScreen: ibInstances.length,
  sizeDelta: fit ? fit.widthDelta + ' × ' + fit.heightDelta : null,
  parentSizeAfter: fit && fit.parentAfter ? fit.parentAfter.size : null,
  bellCenteredInHeaderNow: fit ? fit.bellCenteredNow : null,
  iconBellSameShape: pathCompare ? pathCompare.sameShape : null,
  bellCopiesElsewhere: copies.length,
  otherIconLikeControlsInHeader: otherIconLikeInHeader.length,
  headerEffectsReadOnly: headerInfo.effects.map(e => e.type).join(','),
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary,
  header: headerInfo,
  headerTree,
  discovery: { legacyIdsValid: legacyOk, byName, byStructure, structureOutermost: structOuter, otherIconLikeInHeader },
  bell, bellVector, extras,
  siblings, parentChain,
  fitIfReplacedWithIconButton: fit,
  iconButton, iconButtonInstancesOnScreen: ibInstances,
  pathCompare,
  copies,
  notes, errors
});
