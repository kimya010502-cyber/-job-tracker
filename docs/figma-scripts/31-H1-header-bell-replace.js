/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 31
 * Phase H1 — 메인 Header 의 legacy Bell 1002:487 을 Icon Button(icon = Icon / Bell) 인스턴스로 교체
 *
 * 대상      1002:487 하나 (29.33×34.67 FRAME, 부모 1003:1744 "Frame 2", flow index 0)
 * 방식      같은 부모 · 같은 index 에 Icon Button(1037:2091) 인스턴스를 넣고 icon#1055:6 → Icon / Bell(1048:814),
 *           원본은 visible=false 로 숨긴다 (삭제는 G5). 새 wrapper 는 만들지 않는다.
 * 허용되는 변화  부모 1003:1744 가 HUG 라 164.33×34.67 → 159×24 로 줄고, 그 위 조상 · 형제 위치가 auto layout 으로 움직인다.
 *           형제 1002:478 은 크기 · 내용 그대로, 위치만 바뀔 수 있다.
 * 예측      30-v2 와 같은 배치 함수(childPos)로 부모 사슬을 Header 까지 올라가며 크기를, 내려오며 위치를 계산한다.
 *           같은 함수로 "지금 구조"를 먼저 계산해 실제 위치와 맞는지 확인한다 (predictionModelMatchesCurrent).
 *
 * 보호 (전후 대조)
 *   Header 1002:469 — size · x · y · positioning · opacity · fills · effects · effectStyle 을 **값 그대로** 비교
 *   메인 화면 1002:2 전체 snapshot — 교체로 당연히 바뀌는 값만 가린다:
 *     부모 사슬(1003:1744 ~ Header 바로 아래)의 w·h·x·y, 사슬 노드 직속 자식의 x·y, 1003:1744 의 자식 목록(따로 검사)
 *   원본 1002:487 서브트리 (루트 visible·x·y 만 가림) · 형제 1002:478 서브트리 (루트 x·y 만 가림)
 *   Icon Button 1037:2091 · Icon / Bell 1048:814 · 다른 Bell 복제본 7개 (1019:675 · 1044:720 backup 포함)
 *
 * 실패 정책  중간 실패 또는 되읽기 한 항목이라도 틀리면 → 새 인스턴스 삭제 + 원본 visible 복원 + 크기 · 보호 대상 재확인
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + 예측만. mutation 0.
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '31-H1-v1-header-bell-replace';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', legacy: '1002:487', legacyVector: '1002:489', parent: '1003:1744', sibling: '1002:478',
  iconButton: '1037:2091', iconBell: '1048:814'
};
const SWAP_KEY = 'icon#1055:6';
const OTHER_BELL_COPIES = ['1009:232', '1009:252', '1009:274', '1011:1852', '1010:1155', '1019:675', '1044:720'];
const EXPECT = { legacy: [29.33, 34.67], parentBefore: [164.33, 34.67], parentAfter: [159, 24], sibling: [131, 24], gap: 4, header: [1024, 64], ib: [24, 24], headerCenter: 32 };
const BASELINE_KEY = 'joob.H1.baseline';

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function boundColorId(p) { return p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null; }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function isVectorish(n) { return ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'ELLIPSE', 'RECTANGLE'].indexOf(n.type) >= 0; }
function walk(n, fn) { fn(n); for (const c of kids(n)) walk(c, fn); }
function absX(n) { return n.absoluteTransform[0][2]; }
function absY(n) { return n.absoluteTransform[1][2]; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
async function varName(id) { if (!id) return null; try { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null; } catch (e) { return null; } }
async function colorVarsOf(n) {
  const res = [];
  for (const ch of ['fills', 'strokes']) for (const p of visiblePaints(sg(n, ch))) res.push(ch + ':' + ((await varName(boundColorId(p))) || hex(p.color)));
  return res.join(',');
}

/* snapshot — mask: { id: ['x','y','width','height','visible'] } / skipChildren: [id] */
function snapshot(root, mask, skipChildren) {
  if (!root) return { exists: false };
  mask = mask || {}; skipChildren = skipChildren || [];
  const lines = [];
  (function w(n) {
    const m = mask[n.id] || [];
    const v = k => (m.indexOf(k) >= 0 ? '*' : k === 'visible' ? n.visible !== false : r2(n[k]));
    let fill = '';
    try { fill = visiblePaints(n.fills).map(p => (p.type === 'SOLID' ? hex(p.color) : p.type) + (boundColorId(p) || '')).join(','); } catch (e) { fill = '?'; }
    const pd = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') ? String((pathDataOf(n) || '').length) : '';
    const skip = skipChildren.indexOf(n.id) >= 0;
    lines.push([n.id, n.type, n.name, v('width'), v('height'), v('x'), v('y'), v('visible'), skip ? '*' : kids(n).length, pd, fill].join('|'));
    if (!skip) for (const c of kids(n)) w(c);
  })(root);
  return { exists: true, nodeCount: lines.length, hash: hash(lines.join('\n')) };
}
/* Header 스타일은 해시가 아니라 값 그대로 */
function headerProps(h) {
  if (!h) return null;
  return JSON.stringify({
    size: size(h), x: r2(h.x), y: r2(h.y), positioning: sg(h, 'layoutPositioning'), opacity: r2(sg(h, 'opacity')), visible: h.visible,
    fills: (sg(h, 'fills') || []).map(p => ({ t: p.type, c: hex(p.color), o: r2(p.opacity), v: p.visible !== false, b: boundColorId(p) })),
    effects: (sg(h, 'effects') || []).map(e => ({ t: e.type, v: e.visible !== false, c: e.color ? hex(e.color) + '@' + r2(e.color.a) : null, off: e.offset ? [e.offset.x, e.offset.y] : null, r: r2(e.radius), s: r2(e.spread) })),
    effectStyle: sg(h, 'effectStyleId'), fillStyle: sg(h, 'fillStyleId'), blend: sg(h, 'blendMode'),
    layoutMode: sg(h, 'layoutMode'), sizingH: sg(h, 'layoutSizingHorizontal'), sizingV: sg(h, 'layoutSizingVertical')
  });
}

/* ======== 배치 계산 (30-v2 와 같은 함수) ======== */
function childPos(node, nodeW, nodeH, sizes, index) {
  const p = pads(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const ms = horizontal ? p.l : p.t, me = horizontal ? p.r : p.b, cs = horizontal ? p.t : p.l, ce = horizontal ? p.b : p.r;
  const mainExt = horizontal ? nodeW : nodeH, crossExt = horizontal ? nodeH : nodeW;
  const mains = sizes.map(z => (horizontal ? z.w : z.h));
  const gap = sg(node, 'itemSpacing') || 0, align = sg(node, 'primaryAxisAlignItems'), calign = sg(node, 'counterAxisAlignItems');
  const used = mains.reduce((a, b) => a + b, 0);
  let pos, step;
  if (align === 'SPACE_BETWEEN' && mains.length > 1) { step = (mainExt - ms - me - used) / (mains.length - 1); pos = ms; }
  else {
    step = gap; const total = used + gap * Math.max(0, mains.length - 1);
    if (align === 'CENTER') pos = ms + (mainExt - ms - me - total) / 2;
    else if (align === 'MAX') pos = mainExt - me - total;
    else if (align === 'MIN' || align === 'SPACE_BETWEEN') pos = ms;
    else return null;
  }
  for (let k = 0; k < index; k++) pos += mains[k] + step;
  const cz = horizontal ? sizes[index].h : sizes[index].w;
  let cross;
  if (calign === 'CENTER') cross = cs + (crossExt - cs - ce - cz) / 2;
  else if (calign === 'MAX') cross = crossExt - ce - cz;
  else if (calign === 'MIN') cross = cs;
  else return null;
  return horizontal ? { x: r2(pos), y: r2(cross) } : { x: r2(cross), y: r2(pos) };
}
/* auto layout 노드의 HUG 크기 — HUG 가 아닌 축은 지금 크기 유지 */
function hugSize(node, sizes) {
  const p = pads(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const gap = sg(node, 'itemSpacing') || 0, sb = sg(node, 'primaryAxisAlignItems') === 'SPACE_BETWEEN';
  const sumW = sizes.reduce((a, z) => a + z.w, 0), sumH = sizes.reduce((a, z) => a + z.h, 0);
  const maxW = Math.max.apply(null, [0].concat(sizes.map(z => z.w))), maxH = Math.max.apply(null, [0].concat(sizes.map(z => z.h)));
  const gaps = sb ? 0 : gap * Math.max(0, sizes.length - 1);
  const cW = horizontal ? sumW + gaps : maxW, cH = horizontal ? maxH : sumH + gaps;
  return {
    w: sg(node, 'layoutSizingHorizontal') === 'HUG' ? r2(p.l + p.r + cW) : node.width,
    h: sg(node, 'layoutSizingVertical') === 'HUG' ? r2(p.t + p.b + cH) : node.height,
    neededW: r2(p.l + p.r + cW), neededH: r2(p.t + p.b + cH)
  };
}

/* ======== 0. 노드 읽기 · preflight ======== */
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!N.mainFrame || !N.header) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, reason: '메인 화면 1002:2 또는 Header 1002:469 를 찾지 못했다' });

const pf = {};
const blockers = [];
function gate(key, cond, why) { pf[key] = !!cond; if (!cond) blockers.push(key + ' — ' + why); }
function inside(n, id) { let x = n; while (x) { if (x.id === id) return true; x = x.parent; } return false; }

const P = N.parent, L = N.legacy, S = N.sibling, H = N.header;
gate('legacyBellFound', L && L.type === 'FRAME' && L.visible !== false && near(L.width, EXPECT.legacy[0], 0.05) && near(L.height, EXPECT.legacy[1], 0.05), '1002:487 가 없거나 숨겨져 있거나 크기가 29.33×34.67 이 아니다: ' + size(L));
gate('legacyParentCorrect', L && L.parent && L.parent.id === IDS.parent && inside(P, IDS.header), '1002:487 의 부모가 Header 안의 1003:1744 가 아니다');
gate('legacyIndex0', P && kids(P).indexOf(L) === 0 && flow(P).indexOf(L) === 0, '1002:487 이 부모의 index 0 / flow index 0 이 아니다');
let legacyVectors = [];
if (L) walk(L, x => { if (x !== L && isVectorish(x) && x.visible !== false) legacyVectors.push(x); });
gate('legacyNoExtras', legacyVectors.length === 1 && N.legacyVector && legacyVectors[0].id === IDS.legacyVector, 'Bell 안의 보이는 도형이 벡터 1002:489 하나가 아니다: ' + legacyVectors.map(v => v.id).join(','));
gate('iconButtonMasterFound', N.iconButton && N.iconButton.type === 'COMPONENT' && near(N.iconButton.width, 24) && near(N.iconButton.height, 24), 'Icon Button 1037:2091 이 없거나 24×24 가 아니다');
gate('iconBellFound', N.iconBell && N.iconBell.type === 'COMPONENT' && N.iconBell.name === 'Icon / Bell', 'Icon / Bell 1048:814 가 없다');
let swapDef = null;
try { const defs = N.iconButton.componentPropertyDefinitions || {}; swapDef = defs[SWAP_KEY] || null; } catch (e) { swapDef = null; }
gate('iconSwapPropertyFound', swapDef && swapDef.type === 'INSTANCE_SWAP', 'Icon Button 에 INSTANCE_SWAP 속성 ' + SWAP_KEY + ' 가 없다');

/* Bell 모양 — 31a 와 같은 판정 */
let shape = null;
if (N.legacyVector && N.iconBell) {
  const g = kids(N.iconBell).find(c => c.name === 'glyph') || kids(N.iconBell)[0];
  const pdS = pathDataOf(N.legacyVector), pdG = pathDataOf(g);
  const cmd = pd => (pd ? (pd.match(/[A-Za-z]/g) || []).join('') : null);
  const nums = pd => (pd ? (pd.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number) : []);
  const a = nums(pdS), b = nums(pdG), kx = g.width / N.legacyVector.width, ky = g.height / N.legacyVector.height;
  let maxErr = null;
  if (a.length === b.length && near(kx, ky, 0.001)) { maxErr = 0; for (let i = 0; i < a.length; i++) maxErr = Math.max(maxErr, Math.abs(a[i] * kx - b[i])); }
  shape = { sameCommandSequence: !!cmd(pdS) && cmd(pdS) === cmd(pdG), scale: r2(kx * 1000) / 1000, aspectPreserved: near(kx, ky, 0.001), maxErr: maxErr === null ? null : Math.round(maxErr * 10000) / 10000 };
  shape.sameShape = shape.sameCommandSequence && shape.aspectPreserved && maxErr !== null && maxErr < 0.01;
}
gate('iconBellSameShape', shape && shape.sameShape, 'Icon / Bell 모양이 원본과 다르다: ' + JSON.stringify(shape));
const legacyColor = N.legacyVector ? await colorVarsOf(N.legacyVector) : null;

gate('parentLayoutHorizontal', P && sg(P, 'layoutMode') === 'HORIZONTAL', '1003:1744 가 HORIZONTAL auto layout 이 아니다');
gate('parentSizingHug', P && sg(P, 'layoutSizingHorizontal') === 'HUG' && sg(P, 'layoutSizingVertical') === 'HUG', '1003:1744 가 HUG/HUG 가 아니다');
gate('parentGap4', P && sg(P, 'itemSpacing') === EXPECT.gap, '1003:1744 gap 이 4 가 아니다: ' + sg(P, 'itemSpacing'));
gate('parentCurrentSize', P && near(P.width, EXPECT.parentBefore[0], 0.05) && near(P.height, EXPECT.parentBefore[1], 0.05), '1003:1744 크기가 164.33×34.67 이 아니다: ' + size(P));
gate('siblingFound', S && S.parent && S.parent.id === IDS.parent && flow(P).length === 2 && flow(P)[1].id === IDS.sibling && near(S.width, EXPECT.sibling[0]) && near(S.height, EXPECT.sibling[1]),
  '형제가 1002:478 (131×24) 하나가 아니다: ' + (P ? flow(P).map(c => c.id + ' ' + size(c)).join(', ') : null));
gate('headerFound', H && H.type === 'FRAME', 'Header 가 없다');
gate('header64Fixed', H && near(H.width, EXPECT.header[0]) && near(H.height, EXPECT.header[1]) && sg(H, 'layoutSizingVertical') !== 'HUG', 'Header 가 1024×64 고정이 아니다: ' + size(H) + ' / sizingV ' + sg(H, 'layoutSizingVertical'));
const headerEffectTypes = (sg(H, 'effects') || []).filter(e => e.visible !== false).map(e => e.type);
gate('headerEffectsProtected', headerEffectTypes.indexOf('DROP_SHADOW') >= 0 && headerEffectTypes.indexOf('BACKGROUND_BLUR') >= 0, 'Header effect 가 DROP_SHADOW + BACKGROUND_BLUR 가 아니다: ' + headerEffectTypes.join(','));

/* 대상 부모에 이미 Icon Button 인스턴스가 있으면 중복 */
const ibInParent = [];
for (const c of kids(P)) if (c.type === 'INSTANCE') { const mc = await mainCompOf(c); if (mc && mc.id === IDS.iconButton) ibInParent.push(c.id); }
gate('noExistingBellIconButtonAtTarget', ibInParent.length === 0, '1003:1744 에 이미 Icon Button 인스턴스가 있다: ' + ibInParent.join(','));

/* ======== 1. 예측 ======== */
/* 부모 사슬: [1003:1744, ..., Header 바로 아래 조상, Header] */
const chain = [];
{ let x = P; while (x && x.id !== IDS.header) { chain.push(x); x = x.parent; } if (x) chain.push(x); }
gate('chainReachesHeader', chain.length >= 2 && chain[chain.length - 1].id === IDS.header && chain.slice(0, -1).every(c => sg(c, 'layoutMode') === 'HORIZONTAL' || sg(c, 'layoutMode') === 'VERTICAL') &&
  (sg(H, 'layoutMode') === 'HORIZONTAL' || sg(H, 'layoutMode') === 'VERTICAL'), '부모 사슬이 Header 까지 auto layout 으로 이어지지 않는다: ' + chain.map(c => c.id + ':' + sg(c, 'layoutMode')).join(' › '));

let pred = null;
if (blockers.length === 0) {
  /* 위로 올라가며 크기 */
  const IB = { w: N.iconButton.width, h: N.iconButton.height };
  const levels = [];      // levels[k] = { node, sizesAfter[], sizesNow[], idx(자식 쪽 사슬 노드의 flow index), after{w,h} }
  let childNode = null, childAfter = null;
  for (let k = 0; k < chain.length; k++) {
    const node = chain[k], f = flow(node);
    const sizesNow = f.map(c => ({ w: c.width, h: c.height }));
    let sizesAfter, idx;
    if (k === 0) {
      sizesAfter = f.map(c => (c.id === IDS.legacy ? { w: IB.w, h: IB.h } : { w: c.width, h: c.height }));
      idx = f.findIndex(c => c.id === IDS.legacy);
    } else {
      sizesAfter = f.map(c => (c.id === childNode.id ? childAfter : { w: c.width, h: c.height }));
      idx = f.findIndex(c => c.id === childNode.id);
    }
    const after = k === chain.length - 1 ? { w: node.width, h: node.height, neededW: hugSize(node, sizesAfter).neededW, neededH: hugSize(node, sizesAfter).neededH } : hugSize(node, sizesAfter);
    levels.push({ node, sizesNow, sizesAfter, idx, after });
    childNode = node; childAfter = { w: after.w, h: after.h };
  }
  /* 모델 자기 검증 — 지금 구조로 계산하면 지금 위치 */
  const selfCheck = [];
  for (let k = 0; k < levels.length; k++) {
    const L0 = levels[k];
    const c = k === 0 ? L : levels[k - 1].node;
    const q = childPos(L0.node, L0.node.width, L0.node.height, L0.sizesNow, L0.idx);
    selfCheck.push({ parent: L0.node.id, child: c.id, predicted: q, actual: r2(c.x) + ',' + r2(c.y), ok: !!q && near(q.x, c.x, 0.01) && near(q.y, c.y, 0.01) });
    if (k === 0) {
      const sq = childPos(L0.node, L0.node.width, L0.node.height, L0.sizesNow, flow(L0.node).findIndex(x => x.id === IDS.sibling));
      selfCheck.push({ parent: L0.node.id, child: IDS.sibling, predicted: sq, actual: r2(S.x) + ',' + r2(S.y), ok: !!sq && near(sq.x, S.x, 0.01) && near(sq.y, S.y, 0.01) });
    }
  }
  const selfOk = selfCheck.every(s => s.ok);
  /* 아래로 내려오며 위치 (Header 기준) */
  let offX = 0, offY = 0, overflow = [];
  for (let k = levels.length - 1; k >= 1; k--) {
    const par = levels[k], childLevel = levels[k - 1];
    const q = childPos(par.node, par.after.w, par.after.h, par.sizesAfter, par.idx);
    if (!q) { overflow.push('정렬 해석 불가 ' + par.node.id); continue; }
    offX += q.x; offY += q.y;
    const cw = childLevel.after.w, ch = childLevel.after.h;
    if (q.x < -0.01 || q.y < -0.01 || q.x + cw > par.after.w + 0.01 || q.y + ch > par.after.h + 0.01) overflow.push(childLevel.node.id + ' 가 ' + par.node.id + ' 밖으로 나감');
  }
  const L0 = levels[0];
  const iq = childPos(L0.node, L0.after.w, L0.after.h, L0.sizesAfter, L0.idx);
  const sIdx = flow(P).findIndex(c => c.id === IDS.sibling);
  const sq = childPos(L0.node, L0.after.w, L0.after.h, L0.sizesAfter, sIdx);
  const bellTop = iq ? r2(offY + iq.y) : null;
  const bellCenter = bellTop !== null ? r2(bellTop + IB.h / 2) : null;
  const centerBefore = r2(absY(L) - absY(H) + L.height / 2);
  const siblingGap = iq && sq ? r2(sq.x - (iq.x + IB.w)) : null;
  const headerNeeds = levels[levels.length - 1].after;
  if (headerNeeds.neededW > H.width + 0.01 || headerNeeds.neededH > H.height + 0.01) overflow.push('Header 내용이 Header 보다 크다 ' + headerNeeds.neededW + '×' + headerNeeds.neededH);

  pred = {
    chain: levels.map(l => ({ id: l.node.id, name: l.node.name, layout: sg(l.node, 'layoutMode'), sizingH: sg(l.node, 'layoutSizingHorizontal'), sizingV: sg(l.node, 'layoutSizingVertical'),
      before: size(l.node), after: r2(l.after.w) + '×' + r2(l.after.h) })),
    modelSelfCheck: { ok: selfOk, rows: selfCheck },
    newIconButton: { size: IB.w + '×' + IB.h, parent: IDS.parent, flowIndex: L0.idx, localPos: iq, icon: 'Icon / Bell (1048:814)', swapKey: SWAP_KEY },
    parentAfter: r2(L0.after.w) + '×' + r2(L0.after.h),
    sibling: { id: IDS.sibling, size: size(S), localPosBefore: r2(S.x) + ',' + r2(S.y), localPosAfter: sq, gapFromIconButton: siblingGap, shiftX: sq ? r2(sq.x - S.x) : null },
    header: { size: size(H), bellCenterBefore: centerBefore, bellTopAfter: bellTop, bellCenterAfter: bellCenter, headerCenter: r2(H.height / 2) },
    iconColor: { legacy: legacyColor, note: 'Icon Button 안의 Icon / Bell glyph 색은 APPLY 되읽기에서 원본과 같은지 확인한다' },
    overflow
  };
  gate('predictionModelMatchesCurrent', selfOk, '배치 함수로 지금 구조를 계산한 값이 실제 위치와 다르다: ' + JSON.stringify(selfCheck.filter(s => !s.ok)));
  gate('newIconButton24x24', near(IB.w, 24) && near(IB.h, 24), '');
  gate('newIconButtonFlowIndex0', L0.idx === 0 && !!iq, 'flow index ' + L0.idx);
  gate('parentAfter159x24', near(L0.after.w, EXPECT.parentAfter[0], 0.05) && near(L0.after.h, EXPECT.parentAfter[1], 0.05), '부모 예상 크기 ' + pred.parentAfter);
  gate('siblingSizeUnchanged', near(S.width, EXPECT.sibling[0]) && near(S.height, EXPECT.sibling[1]), '');
  gate('siblingGap4', near(siblingGap, EXPECT.gap, 0.01), '형제 예상 간격 ' + siblingGap);
  gate('header1024x64Unchanged', near(H.width, 1024) && near(H.height, 64), '');
  gate('bellCenterY32', near(bellCenter, EXPECT.headerCenter, 0.01) && near(H.height / 2, EXPECT.headerCenter, 0.01), '예상 Bell 중심 ' + bellCenter + ' / Header 중심 ' + r2(H.height / 2));
  gate('noOverflow', overflow.length === 0, overflow.join(' / '));
  gate('noUnexpectedReparenting', flow(P).length === 2 && kids(P).length === 2, '1003:1744 자식 수가 2 가 아니다: ' + kids(P).map(c => c.id).join(','));
}

/* ======== 2. 보호 대상 기준값 ======== */
const MASK = {}, SKIP = [IDS.parent];
for (const c of chain.slice(0, -1)) MASK[c.id] = ['width', 'height', 'x', 'y'];
for (const c of chain) for (const k of kids(c)) if (!MASK[k.id]) MASK[k.id] = ['x', 'y'];
async function takeProtected() {
  const res = {
    'mainFrame(masked)': snapshot(N.mainFrame, MASK, SKIP),
    'legacy(visible/x/y masked)': snapshot(L, { [IDS.legacy]: ['visible', 'x', 'y'] }),
    'sibling(x/y masked)': snapshot(S, { [IDS.sibling]: ['x', 'y'] }),
    'iconButton 1037:2091': snapshot(N.iconButton), 'iconBell 1048:814': snapshot(N.iconBell)
  };
  for (const id of OTHER_BELL_COPIES) res['bellCopy ' + id] = snapshot(await figma.getNodeByIdAsync(id));
  return res;
}
const protectedBefore = await takeProtected();
const headerBefore = headerProps(H);
const missingCopies = OTHER_BELL_COPIES.filter(id => !protectedBefore['bellCopy ' + id].exists);
if (missingCopies.length) notes.push('다른 Bell 복제본 중 찾지 못한 것 (보호할 대상이 없을 뿐, 차단 아님): ' + missingCopies.join(','));
pf.otherBellCopiesRecorded = true;
pf.componentMastersRecorded = protectedBefore['iconButton 1037:2091'].exists && protectedBefore['iconBell 1048:814'].exists;

await figma.loadAllPagesAsync();
async function ibInstances() {
  const res = [];
  for (const x of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await mainCompOf(x);
    if (mc && mc.id === IDS.iconButton) res.push({ id: x.id, parent: x.parent ? x.parent.id : null });
  }
  return res;
}
const instancesBefore = await ibInstances();

pf.mutationCountIsZero = mutationCount === 0;
pf.everyTargetReady = blockers.length === 0;
const preflightPassed = blockers.length === 0 && Object.keys(pf).every(k => pf[k] === true);

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers, preflight: pf,
    prediction: pred, shape,
    plan: preflightPassed ? [
      'Icon Button(1037:2091) 인스턴스를 만든다',
      SWAP_KEY + ' → Icon / Bell(1048:814), 되읽어서 아이콘 main component 확인',
      '1003:1744 의 index 0 에 넣는다 (원본은 index 1 로 밀린다)',
      '원본 1002:487 visible = false (삭제는 G5)',
      '되읽기: 인스턴스 · 부모 159×24 · 형제 131×24 · 간격 4 · Bell 중심 32 · Header 값 · 보호 대상 · stray'
    ] : null,
    protectedBaseline: protectedBefore, headerBaseline: JSON.parse(headerBefore),
    iconButtonInstancesBefore: instancesBefore.length,
    mutationCount, notes, errorCount: errors.length + blockers.length
  });
}

/* ======== 3. APPLY ======== */
let inst = null, legacyHidden = false, failure = null;
try {
  inst = N.iconButton.createInstance(); mutationCount++;
  inst.setProperties({ [SWAP_KEY]: IDS.iconBell }); mutationCount++;
  const slot = kids(inst).find(c => c.type === 'INSTANCE');
  const smc = slot ? await mainCompOf(slot) : null;
  if (!smc || smc.id !== IDS.iconBell) throw new Error('아이콘 swap 후 슬롯의 main component 가 Icon / Bell 이 아니다: ' + (smc ? smc.id + ' ' + smc.name : null));
  P.insertChild(0, inst); mutationCount++;
  L.visible = false; legacyHidden = true; mutationCount++;
  if (inst.visible === false) { inst.visible = true; mutationCount++; }
  if (!inst.parent || inst.parent.id !== IDS.parent || kids(P).indexOf(inst) !== 0) throw new Error('인스턴스가 1003:1744 의 index 0 에 있지 않다');
} catch (e) { failure = e && e.message ? e.message : String(e); }

async function rollback(reason) {
  const steps = [];
  if (inst && !inst.removed) { try { inst.remove(); steps.push('instance removed'); } catch (e) { steps.push('instance remove failed: ' + e.message); } }
  if (legacyHidden || L.visible === false) { try { L.visible = true; steps.push('legacy visible restored'); } catch (e) { steps.push('legacy restore failed: ' + e.message); } }
  const after = await takeProtected();
  const diff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(after[k]));
  const sizesBack = near(P.width, EXPECT.parentBefore[0], 0.05) && near(P.height, EXPECT.parentBefore[1], 0.05);
  const instNow = await ibInstances();
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackSteps: steps,
    rollbackClean: diff.length === 0 && sizesBack && instNow.length === instancesBefore.length && headerProps(H) === headerBefore && L.visible !== false,
    protectedDiff: diff, headerUnchanged: headerProps(H) === headerBefore, parentSize: size(P), iconButtonInstancesNow: instNow.length, errorCount: 1 });
}
if (failure) return await rollback(failure);

/* ======== 4. 되읽기 ======== */
const c = {};
const imc = await mainCompOf(inst);
const slotNow = kids(inst).find(x => x.type === 'INSTANCE');
const slotMc = slotNow ? await mainCompOf(slotNow) : null;
const glyphNow = slotNow ? kids(slotNow).find(x => x.name === 'glyph') : null;
const newColor = glyphNow ? await colorVarsOf(glyphNow) : null;
c.usesIconButtonMaster = !!imc && imc.id === IDS.iconButton;
c.bellIconSwapCorrect = !!slotMc && slotMc.id === IDS.iconBell;
c.iconColorMatchesLegacy = !!newColor && newColor === legacyColor;
c.instance24x24 = near(inst.width, 24) && near(inst.height, 24);
c.instanceVisible = inst.visible !== false;
c.instanceAtFlowIndex0 = flow(P)[0] && flow(P)[0].id === inst.id && kids(P).indexOf(inst) === 0;
c.instancePosMatchesPrediction = !!pred.newIconButton.localPos && near(inst.x, pred.newIconButton.localPos.x, 0.01) && near(inst.y, pred.newIconButton.localPos.y, 0.01);
c.legacyStillExists = !L.removed && L.parent && L.parent.id === IDS.parent;
c.legacyHidden = L.visible === false;
c.parent159x24 = near(P.width, EXPECT.parentAfter[0], 0.05) && near(P.height, EXPECT.parentAfter[1], 0.05);
c.siblingSizeUnchanged = near(S.width, EXPECT.sibling[0]) && near(S.height, EXPECT.sibling[1]);
const gapNow = r2(S.x - (inst.x + inst.width));
c.siblingGap4 = near(gapNow, EXPECT.gap, 0.01);
c.siblingPosMatchesPrediction = !!pred.sibling.localPosAfter && near(S.x, pred.sibling.localPosAfter.x, 0.01) && near(S.y, pred.sibling.localPosAfter.y, 0.01);
c.header1024x64 = near(H.width, 1024) && near(H.height, 64);
const centerNow = r2(absY(inst) - absY(H) + inst.height / 2);
c.headerCenterPreserved = near(centerNow, EXPECT.headerCenter, 0.01);
c.headerPropsUnchanged = headerProps(H) === headerBefore;
c.chainSizesMatchPrediction = pred.chain.slice(0, -1).every(row => { const n = chain.find(x => x.id === row.id); return n && size(n) === row.after; });
const protectedAfter = await takeProtected();
const protectedDiff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(protectedAfter[k]));
c.otherBellCopiesUnchanged = OTHER_BELL_COPIES.every(id => JSON.stringify(protectedBefore['bellCopy ' + id]) === JSON.stringify(protectedAfter['bellCopy ' + id]));
c.componentMastersUnchanged = ['iconButton 1037:2091', 'iconBell 1048:814'].every(k => JSON.stringify(protectedBefore[k]) === JSON.stringify(protectedAfter[k]));
c.protectedNodesUnchanged = protectedDiff.length === 0;
const instancesAfter = await ibInstances();
const added = instancesAfter.filter(x => !instancesBefore.some(b => b.id === x.id));
c.noStrayInstances = instancesAfter.length === instancesBefore.length + 1 && added.length === 1 && added[0].id === inst.id && added[0].parent === IDS.parent;
c.mutationCountExpected = mutationCount === 4 || mutationCount === 5;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '));

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
    instanceId: inst.id, legacyId: IDS.legacy, legacyColor, iconButtonInstanceCount: instancesAfter.length,
    protectedAfter, headerProps: headerBefore,
    expect: { parent: size(P), instancePos: r2(inst.x) + ',' + r2(inst.y), siblingPos: r2(S.x) + ',' + r2(S.y), gap: gapNow, center: centerNow,
      chain: chain.map(n => ({ id: n.id, size: size(n) })) }
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: true, failedCriteria: [], checks: c,
  result: {
    instance: { id: inst.id, name: inst.name, master: imc ? imc.name : null, icon: slotMc ? slotMc.name : null, iconColor: newColor, size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: kids(P).indexOf(inst), visible: inst.visible },
    legacy: { id: IDS.legacy, visible: L.visible, index: kids(P).indexOf(L) },
    parent: { id: IDS.parent, size: size(P) },
    sibling: { id: IDS.sibling, size: size(S), pos: r2(S.x) + ',' + r2(S.y), gap: gapNow },
    header: { size: size(H), bellCenterY: centerNow, headerCenterY: r2(H.height / 2), propsUnchanged: c.headerPropsUnchanged },
    chain: chain.map(n => ({ id: n.id, size: size(n), pos: r2(n.x) + ',' + r2(n.y) }))
  },
  prediction: pred, protectedDiff, iconButtonInstances: { before: instancesBefore.length, after: instancesAfter.length },
  mutationCount, notes, errorCount: errors.length, errors
});
