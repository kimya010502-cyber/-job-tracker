/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 33
 * Phase H2-B — Header 의 legacy 동기화 배지 1002:478 을 Chip(tone=sync) 인스턴스로 교체
 *
 * 대상      1002:478 하나 (131×24, 부모 1003:1744). 부모 자식 순서는 [Bell 1110:672, 숨긴 원본 Bell 1002:487, 1002:478].
 *           새 인스턴스는 1002:478 과 **같은 index** 에 넣는다 → 보이는 흐름은 [Bell, 새 Chip] 그대로.
 * 인스턴스  tone=sync(1114:684) · 라벨 문구만 override ("실시간 동기화 완료"). 색은 전부 마스터에서 상속 —
 *           fills · strokes · glyph 색을 인스턴스에서 건드리지 않고, 되읽기에서 색 관련 override 가 0 인지 확인한다.
 * 원본      visible=false (삭제는 G5).
 * 허용 변화 부모 159×24 → 165×24 (HUG), 그 위 조상 폭 · 형제 위치가 auto layout 으로 움직인다. Header 는 스타일 · 크기 불변.
 * 예측      31 과 같은 childPos / hugSize 로 부모 사슬을 Header 까지 계산하고, 같은 함수로 지금 구조를 먼저 재현해 본다.
 *           새 Chip 폭 = padding + leading + gap + 라벨 폭. 라벨 글꼴이 원본과 같을 때만 정확(widthIsExact).
 *
 * 보호 (전후 대조)
 *   Header 1002:469 값 그대로 · 메인 화면 snapshot(사슬 노드 w/h/x/y 와 사슬 직속 자식 x/y 만 가림, 1003:1744 자식은 따로) ·
 *   Bell 1110:672 · 원본 1002:478 (visible/x/y 만 가림) · Chip 세트 전체(tone=sync 포함) · Icon / Dot ·
 *   파일 전체 기존 Chip 인스턴스 · 다른 동기화 배지 복제본(모양으로 찾음) · backup 1019:115 / 1044:160
 *
 * 실패 정책  중간 실패 또는 되읽기 한 항목이라도 틀리면 → 새 인스턴스 삭제(id 재조회로 확인) + 원본 visible 복원 + 재확인
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + 예측만. mutation 0 (라벨 글꼴 load 가능 여부만 확인 — 문서 변경 없음).
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '33-H2B-v1-sync-chip-screen-replace';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', legacy: '1002:478', parent: '1003:1744', bell: '1110:672', legacyBell: '1002:487',
  chipSet: '1029:1984', syncVariant: '1114:684', iconDot: '1048:816'
};
const LABEL = '실시간 동기화 완료';
const LEADING_KEY = 'leading#1052:0';
const COLORS = { bg: 'surface/subtle', label: 'success/strong', dot: 'success/strong' };
const EXPECT = { legacy: [131, 24], parentBefore: [159, 24], parentAfter: [165, 24], chip: [137, 24], header: [1024, 64], center: 32, gap: 4 };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const COLOR_OVERRIDE_FIELDS = ['fills', 'strokes', 'effects', 'fillStyleId', 'strokeStyleId', 'effectStyleId', 'opacity', 'boundVariables'];
const BASELINE_KEY = 'joob.H2B.baseline';

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
function walk(n, fn) { fn(n); for (const c of kids(n)) walk(c, fn); }
function absY(n) { return n.absoluteTransform[1][2]; }
function inside(n, id) { let x = n; while (x) { if (x.id === id) return true; x = x.parent; } return false; }
function pageOf(n) { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

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
    let extra = '';
    try { if (n.type === 'TEXT') extra = n.characters; } catch (e) { extra = '?'; }
    let refs = ''; try { refs = JSON.stringify(n.componentPropertyReferences || null); } catch (e) { refs = '?'; }
    const skip = skipChildren.indexOf(n.id) >= 0;
    lines.push([n.id, n.type, n.name, v('width'), v('height'), v('x'), v('y'), v('visible'), skip ? '*' : kids(n).length, pd, fill, extra, refs].join('|'));
    if (!skip) for (const c of kids(n)) w(c);
  })(root);
  return { exists: true, nodeCount: lines.length, hash: hash(lines.join('\n')) };
}
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

/* ======== 배치 계산 (31 과 동일) ======== */
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

/* ======== 0. 노드 · preflight ======== */
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!N.mainFrame || !N.header) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, reason: '메인 화면 또는 Header 를 찾지 못했다' });
const pf = {}, blockers = [];
function gate(key, cond, why) { pf[key] = !!cond; if (!cond) blockers.push(key + ' — ' + why); }
const P = N.parent, L = N.legacy, H = N.header, SV = N.syncVariant, BELL = N.bell;

const legacyText = L ? (function () { let t = null; walk(L, x => { if (!t && x.type === 'TEXT' && x.visible !== false) t = x; }); return t; })() : null;
gate('targetLegacyFound', L && L.visible !== false && near(L.width, EXPECT.legacy[0]) && near(L.height, EXPECT.legacy[1]) && !!legacyText && legacyText.characters === LABEL,
  '1002:478 이 없거나 숨겨져 있거나 131×24 / "' + LABEL + '" 가 아니다: ' + size(L) + ' / ' + (legacyText ? legacyText.characters : null));
gate('parentExpected', L && L.parent && L.parent.id === IDS.parent && inside(P, IDS.header), '1002:478 의 부모가 Header 안의 1003:1744 가 아니다');
gate('parentLayout', P && sg(P, 'layoutMode') === 'HORIZONTAL' && sg(P, 'layoutSizingHorizontal') === 'HUG' && sg(P, 'layoutSizingVertical') === 'HUG' && sg(P, 'itemSpacing') === EXPECT.gap,
  '1003:1744 가 HORIZONTAL · HUG/HUG · gap 4 가 아니다');
gate('parentCurrentSize', P && near(P.width, EXPECT.parentBefore[0], 0.05) && near(P.height, EXPECT.parentBefore[1], 0.05), '1003:1744 크기가 159×24 가 아니다: ' + size(P));
const fl = P ? flow(P) : [];
gate('bellFirstVisibleChild', fl.length === 2 && fl[0].id === IDS.bell && fl[1].id === IDS.legacy, '보이는 흐름이 [Bell 1110:672, 1002:478] 이 아니다: ' + fl.map(c => c.id).join(','));
const legacyIndex = P ? kids(P).indexOf(L) : -1;
pf.legacyChildIndex = legacyIndex;   // 기록용 (숨긴 원본 Bell 때문에 flow index 와 다르다)
gate('syncVariantFound', SV && SV.type === 'COMPONENT' && SV.name === 'tone=sync' && SV.parent && SV.parent.id === IDS.chipSet, 'tone=sync 1114:684 가 없다');
const svLead = SV ? kids(SV).find(c => c.name === 'leading') : null;
const svLabel = SV ? kids(SV).find(c => c.type === 'TEXT') : null;
gate('syncVariantLeadingReady', !!svLead && svLead.visible === true && !!svLead.componentPropertyReferences && svLead.componentPropertyReferences.mainComponent === LEADING_KEY,
  'tone=sync 의 leading 이 visible · ' + LEADING_KEY + ' 연결 상태가 아니다');
let fontLoad = null;
if (svLabel && svLabel.fontName && svLabel.fontName !== figma.mixed) { try { await figma.loadFontAsync(svLabel.fontName); fontLoad = 'ok ' + svLabel.fontName.family + ' ' + svLabel.fontName.style; } catch (e) { fontLoad = 'failed: ' + e.message; } }
gate('labelFontLoadable', !!fontLoad && fontLoad.indexOf('ok') === 0, '라벨 글꼴을 불러오지 못했다: ' + fontLoad);
gate('headerFound', H && near(H.width, EXPECT.header[0]) && near(H.height, EXPECT.header[1]) && sg(H, 'layoutSizingVertical') !== 'HUG', 'Header 가 1024×64 고정이 아니다');
await figma.loadAllPagesAsync();

/* 파일 전체 Chip 인스턴스 · Header 안 sync 인스턴스 */
async function chipInstances() {
  const res = {};
  for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await mainCompOf(inst);
    if (mc && mc.parent && mc.parent.id === IDS.chipSet) res[inst.id] = { variant: mc.name, parent: inst.parent ? inst.parent.id : null, snap: snapshot(inst) };
  }
  return res;
}
const instBefore = await chipInstances();
const syncInHeader = Object.keys(instBefore).filter(id => instBefore[id].variant === 'tone=sync');
gate('noExistingSyncChipInstance', syncInHeader.length === 0, '이미 tone=sync 인스턴스가 있다: ' + syncInHeader.join(','));

/* ======== 1. 예측 ======== */
const chain = [];
{ let x = P; while (x && x.id !== IDS.header) { chain.push(x); x = x.parent; } if (x) chain.push(x); }
gate('chainReachesHeader', chain.length >= 2 && chain[chain.length - 1].id === IDS.header && chain.every(c => sg(c, 'layoutMode') === 'HORIZONTAL' || sg(c, 'layoutMode') === 'VERTICAL'),
  '부모 사슬이 Header 까지 auto layout 으로 이어지지 않는다: ' + chain.map(c => c.id + ':' + sg(c, 'layoutMode')).join(' › '));

let pred = null;
if (blockers.length === 0) {
  /* 새 Chip 폭 — 마스터 규칙 + 원본 라벨 폭 */
  const sameFont = !!svLabel && !!legacyText && JSON.stringify(svLabel.fontName) === JSON.stringify(legacyText.fontName) && svLabel.fontSize === legacyText.fontSize &&
    JSON.stringify(sg(svLabel, 'letterSpacing')) === JSON.stringify(sg(legacyText, 'letterSpacing'));
  const chipW = r2(SV.paddingLeft + SV.paddingRight + svLead.width + SV.itemSpacing + legacyText.width);
  const chipH = SV.height;
  const CH = { w: chipW, h: chipH };
  const levels = [];
  let childNode = null, childAfter = null;
  for (let k = 0; k < chain.length; k++) {
    const node = chain[k], f = flow(node);
    const sizesNow = f.map(c => ({ w: c.width, h: c.height }));
    const target = k === 0 ? IDS.legacy : childNode.id;
    const sizesAfter = f.map(c => (c.id === target ? (k === 0 ? CH : childAfter) : { w: c.width, h: c.height }));
    const idx = f.findIndex(c => c.id === target);
    const hs = hugSize(node, sizesAfter);
    const after = k === chain.length - 1 ? { w: node.width, h: node.height, neededW: hs.neededW, neededH: hs.neededH } : hs;
    levels.push({ node, sizesNow, sizesAfter, idx, after });
    childNode = node; childAfter = { w: after.w, h: after.h };
  }
  const selfCheck = [];
  for (let k = 0; k < levels.length; k++) {
    const lv = levels[k], cnode = k === 0 ? L : levels[k - 1].node;
    const q = childPos(lv.node, lv.node.width, lv.node.height, lv.sizesNow, lv.idx);
    selfCheck.push({ parent: lv.node.id, child: cnode.id, predicted: q, actual: r2(cnode.x) + ',' + r2(cnode.y), ok: !!q && near(q.x, cnode.x, 0.01) && near(q.y, cnode.y, 0.01) });
  }
  const bellQ = childPos(P, P.width, P.height, levels[0].sizesNow, 0);
  selfCheck.push({ parent: P.id, child: IDS.bell, predicted: bellQ, actual: r2(BELL.x) + ',' + r2(BELL.y), ok: !!bellQ && near(bellQ.x, BELL.x, 0.01) && near(bellQ.y, BELL.y, 0.01) });
  const selfOk = selfCheck.every(s => s.ok);
  let offY = 0; const overflow = [];
  for (let k = levels.length - 1; k >= 1; k--) {
    const par = levels[k], cl = levels[k - 1];
    const q = childPos(par.node, par.after.w, par.after.h, par.sizesAfter, par.idx);
    if (!q) { overflow.push('정렬 해석 불가 ' + par.node.id); continue; }
    offY += q.y;
    if (q.x < -0.01 || q.y < -0.01 || q.x + cl.after.w > par.after.w + 0.01 || q.y + cl.after.h > par.after.h + 0.01) overflow.push(cl.node.id + ' 가 ' + par.node.id + ' 밖으로 나감');
  }
  const L0 = levels[0];
  const cq = childPos(P, L0.after.w, L0.after.h, L0.sizesAfter, L0.idx);
  const bq = childPos(P, L0.after.w, L0.after.h, L0.sizesAfter, 0);
  const hn = levels[levels.length - 1].after;
  if (hn.neededW > H.width + 0.01 || hn.neededH > H.height + 0.01) overflow.push('Header 내용이 Header 보다 크다 ' + hn.neededW + '×' + hn.neededH);
  const centerAfter = cq ? r2(offY + cq.y + chipH / 2) : null;
  const gapAfter = cq && bq ? r2(cq.x - (bq.x + BELL.width)) : null;
  pred = {
    chip: { size: chipW + '×' + chipH, widthIsExact: sameFont, widthFormula: SV.paddingLeft + ' + ' + r2(svLead.width) + ' + ' + SV.itemSpacing + ' + 라벨 ' + r2(legacyText.width) + ' + ' + SV.paddingRight,
      localPos: cq, childIndex: legacyIndex, flowIndex: L0.idx },
    chain: levels.map(l => ({ id: l.node.id, name: l.node.name, before: size(l.node), after: r2(l.after.w) + '×' + r2(l.after.h) })),
    modelSelfCheck: { ok: selfOk, rows: selfCheck },
    parentAfter: r2(L0.after.w) + '×' + r2(L0.after.h),
    bell: { posBefore: r2(BELL.x) + ',' + r2(BELL.y), posAfter: bq, gapToChip: gapAfter },
    header: { size: size(H), syncCenterBefore: r2(absY(L) - absY(H) + L.height / 2), chipCenterAfter: centerAfter, headerCenter: r2(H.height / 2) },
    overflow
  };
  gate('predictionModelMatchesCurrent', selfOk, '배치 함수로 지금 구조를 계산한 값이 실제와 다르다: ' + JSON.stringify(selfCheck.filter(s => !s.ok)));
  gate('predictedChipWidthExact', sameFont, '라벨 글꼴/크기/자간이 원본과 다르다 — 폭 예측이 근사다 (' + JSON.stringify(legacyText.fontName) + ' ' + legacyText.fontSize + ' vs ' + JSON.stringify(svLabel.fontName) + ' ' + svLabel.fontSize + ')');
  gate('predictedChip137x24', near(chipW, EXPECT.chip[0], 0.05) && near(chipH, EXPECT.chip[1]), '예상 Chip 크기 ' + pred.chip.size);
  gate('predictedParent165x24', near(L0.after.w, EXPECT.parentAfter[0], 0.05) && near(L0.after.h, EXPECT.parentAfter[1], 0.05), '예상 부모 크기 ' + pred.parentAfter);
  gate('bellPositionUnchanged', !!bq && near(bq.x, BELL.x, 0.01) && near(bq.y, BELL.y, 0.01), 'Bell 예상 위치가 바뀐다: ' + JSON.stringify(bq));
  gate('bellToChipGap4', near(gapAfter, EXPECT.gap, 0.01), 'Bell→Chip 예상 간격 ' + gapAfter);
  gate('headerStays1024x64', near(H.width, 1024) && near(H.height, 64), '');
  gate('centerY32', near(centerAfter, EXPECT.center, 0.01) && near(H.height / 2, EXPECT.center, 0.01), '예상 Chip 중심 ' + centerAfter);
  gate('noOverflow', overflow.length === 0, overflow.join(' / '));
}

/* ======== 2. 보호 대상 ======== */
const MASK = {}, SKIP = [IDS.parent];
for (const c of chain.slice(0, -1)) MASK[c.id] = ['width', 'height', 'x', 'y'];
for (const c of chain) for (const k of kids(c)) if (!MASK[k.id]) MASK[k.id] = ['x', 'y'];
/* 다른 동기화 배지 복제본 — 모양으로 찾는다 */
const sig = n => size(n) + '/' + kids(n).map(c => c.type + size(c)).join(',');
const legacySig = L ? sig(L) : null;
const syncCopies = L ? figma.root.findAllWithCriteria({ types: ['FRAME', 'GROUP', 'INSTANCE'] }).filter(f => f.id !== L.id && near(f.width, L.width) && near(f.height, L.height) && sig(f) === legacySig).map(f => f.id) : [];
async function takeProtected() {
  const res = {
    'mainFrame(masked)': snapshot(N.mainFrame, MASK, SKIP),
    'legacy(visible/x/y masked)': snapshot(L, { [IDS.legacy]: ['visible', 'x', 'y'] }),
    'bell 1110:672': snapshot(BELL), 'legacyBell 1002:487': snapshot(N.legacyBell),
    'chipSet 1029:1984': snapshot(N.chipSet), 'iconDot 1048:816': snapshot(N.iconDot)
  };
  for (const id of syncCopies) res['syncCopy ' + id] = snapshot(await figma.getNodeByIdAsync(id));
  for (const id of BACKUP_COPY_IDS) res['backup ' + id] = snapshot(await figma.getNodeByIdAsync(id));
  return res;
}
const protectedBefore = await takeProtected();
const headerBefore = headerProps(H);
pf.protectedNodesCaptured = Object.keys(protectedBefore).every(k => protectedBefore[k].exists !== undefined);
pf.mutationCountIsZero = mutationCount === 0;
pf.everyTargetReady = blockers.length === 0;
const preflightPassed = blockers.length === 0 && Object.keys(pf).every(k => pf[k] === true || k === 'legacyChildIndex');

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers, preflight: pf, prediction: pred, fontLoad,
    parentChildren: P ? kids(P).map((c, i) => ({ i, id: c.id, name: c.name, type: c.type, visible: c.visible !== false, size: size(c) })) : null,
    plan: preflightPassed ? [
      'tone=sync(1114:684) 인스턴스를 만든다',
      '라벨 문구만 "' + LABEL + '" 로 바꾼다 (색 · leading 은 건드리지 않는다)',
      '1003:1744 의 index ' + legacyIndex + ' (1002:478 자리) 에 넣는다 → 보이는 흐름 [Bell, 새 Chip]',
      '원본 1002:478 visible = false (삭제는 G5)',
      '되읽기: variant · 라벨 · 137×24 · leading · 상속 색 · 색 override 0 · Bell · 부모 165×24 · Header · 보호 대상 · stray'
    ] : null,
    protectedBaseline: { keys: Object.keys(protectedBefore), syncCopies, chipInstances: Object.keys(instBefore).length },
    headerBaseline: JSON.parse(headerBefore),
    mutationCount, notes, errorCount: errors.length + blockers.length
  });
}

/* ======== 3. APPLY ======== */
let inst = null, instId = null, legacyHidden = false, failure = null;
try {
  inst = SV.createInstance(); instId = inst.id; mutationCount++;
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  assert(!!lbl, '새 인스턴스에서 라벨을 찾지 못했다');
  lbl.characters = LABEL; mutationCount++;
  P.insertChild(legacyIndex, inst); mutationCount++;
  L.visible = false; legacyHidden = true; mutationCount++;
  if (inst.visible === false) { inst.visible = true; mutationCount++; }
  assert(inst.parent && inst.parent.id === IDS.parent && kids(P).indexOf(inst) === legacyIndex, '인스턴스가 1003:1744 의 index ' + legacyIndex + ' 에 있지 않다');
} catch (e) { failure = e && e.message ? e.message : String(e); }

async function rollback(reason, readBack) {
  const steps = [];
  const node = instId ? await figma.getNodeByIdAsync(instId) : null;
  if (node) { try { node.remove(); steps.push('instance ' + instId + ' removed'); } catch (e) { steps.push('instance remove failed: ' + e.message); } }
  if (L.visible === false) { try { L.visible = true; steps.push('legacy visible restored'); } catch (e) { steps.push('legacy restore failed: ' + e.message); } }
  const after = await takeProtected();
  const diff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(after[k]));
  const instNow = await chipInstances();
  const cleanup = {
    instanceGone: instId ? (await figma.getNodeByIdAsync(instId)) === null : true,
    legacyVisible: L.visible !== false,
    parentSizeBack: near(P.width, EXPECT.parentBefore[0], 0.05) && near(P.height, EXPECT.parentBefore[1], 0.05),
    headerUnchanged: headerProps(H) === headerBefore,
    protectedUnchanged: diff.length === 0,
    chipInstanceCountBack: Object.keys(instNow).length === Object.keys(instBefore).length
  };
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackSteps: steps,
    rollbackClean: Object.keys(cleanup).every(k => cleanup[k] === true), cleanup, readBack: readBack || null, protectedDiff: diff, parentSize: size(P), errorCount: 1 });
}
if (failure) return await rollback(failure, null);

/* ======== 4. 되읽기 — 항목별 ======== */
const c = {};
const imc = await mainCompOf(inst);
const lbl = kids(inst).find(x => x.type === 'TEXT');
const lead = kids(inst).find(x => x.name === 'leading');
const lmc = lead ? await mainCompOf(lead) : null;
const glyph = lead ? (kids(lead).find(x => x.name === 'glyph') || kids(lead)[0]) : null;
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const isBound = (n, name) => { const ps = visiblePaints(n && n.fills); return ps.length === 1 && !!V[name] && boundColorId(ps[0]) === V[name].id; };
let ov = [];
try { ov = (inst.overrides || []).map(o => ({ id: o.id, fields: o.overriddenFields || [] })); } catch (e) { notes.push('overrides 읽기 실패: ' + e.message); ov = null; }
const colorOverrides = ov ? ov.filter(o => o.fields.some(f => COLOR_OVERRIDE_FIELDS.indexOf(f) >= 0)) : null;
c.newChipInstanceCreated = !!inst && inst.type === 'INSTANCE';
c.variantIsSync = !!imc && imc.id === IDS.syncVariant;
c.labelCorrect = !!lbl && lbl.characters === LABEL;
c.size137x24 = near(inst.width, EXPECT.chip[0], 0.05) && near(inst.height, EXPECT.chip[1]);
c.instanceVisible = inst.visible !== false;
c.leadingVisible = !!lead && lead.visible === true;
c.leadingIconDot = !!lmc && lmc.id === IDS.iconDot;
c.leadingPropertyRef = !!lead && !!lead.componentPropertyReferences && lead.componentPropertyReferences.mainComponent === LEADING_KEY;
c.bgInheritedSurfaceSubtle = isBound(inst, COLORS.bg);
c.labelInheritedSuccessStrong = isBound(lbl, COLORS.label);
c.dotInheritedSuccessStrong = isBound(glyph, COLORS.dot);
c.noColorOverrides = Array.isArray(colorOverrides) && colorOverrides.length === 0;
c.atLegacyIndex = kids(P).indexOf(inst) === legacyIndex && flow(P).length === 2 && flow(P)[0].id === IDS.bell && flow(P)[1].id === inst.id;
c.instancePosMatchesPrediction = !!pred.chip.localPos && near(inst.x, pred.chip.localPos.x, 0.01) && near(inst.y, pred.chip.localPos.y, 0.01);
c.legacyHidden = L.visible === false && L.parent && L.parent.id === IDS.parent;
c.bellUnchanged = JSON.stringify(protectedBefore['bell 1110:672']) === JSON.stringify(snapshot(BELL));
c.parent165x24 = near(P.width, EXPECT.parentAfter[0], 0.05) && near(P.height, EXPECT.parentAfter[1], 0.05);
c.bellToChipGap4 = near(r2(inst.x - (BELL.x + BELL.width)), EXPECT.gap, 0.01);
c.header1024x64 = near(H.width, 1024) && near(H.height, 64);
const centerNow = r2(absY(inst) - absY(H) + inst.height / 2);
c.centerY32 = near(centerNow, EXPECT.center, 0.01);
c.headerPropsUnchanged = headerProps(H) === headerBefore;
c.chainSizesMatchPrediction = pred.chain.slice(0, -1).every(row => { const n = chain.find(x => x.id === row.id); return n && size(n) === row.after; });
const protectedAfter = await takeProtected();
const protectedDiff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(protectedAfter[k]));
c.chipMastersUnchanged = JSON.stringify(protectedBefore['chipSet 1029:1984']) === JSON.stringify(protectedAfter['chipSet 1029:1984']) &&
  JSON.stringify(protectedBefore['iconDot 1048:816']) === JSON.stringify(protectedAfter['iconDot 1048:816']);
c.otherSyncCopiesUnchanged = syncCopies.every(id => JSON.stringify(protectedBefore['syncCopy ' + id]) === JSON.stringify(protectedAfter['syncCopy ' + id]));
c.protectedNodesUnchanged = protectedDiff.length === 0;
const instAfter = await chipInstances();
const added = Object.keys(instAfter).filter(id => !instBefore[id]);
const changed = Object.keys(instBefore).filter(id => !instAfter[id] || JSON.stringify(instAfter[id]) !== JSON.stringify(instBefore[id]));
c.existingChipInstancesUnchanged = changed.length === 0;
c.noStrayInstances = added.length === 1 && added[0] === inst.id && instAfter[inst.id].parent === IDS.parent;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const detail = {
  instance: { id: inst.id, master: imc ? imc.name + ' (' + imc.id + ')' : null, size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: kids(P).indexOf(inst), visible: inst.visible },
  label: lbl ? { characters: lbl.characters, width: r2(lbl.width) } : null,
  leading: lead ? { visible: lead.visible, main: lmc ? lmc.name : null, refs: lead.componentPropertyReferences, size: size(lead) } : null,
  overrides: ov, colorOverrides, parent: size(P), centerY: centerNow, gap: r2(inst.x - (BELL.x + BELL.width))
};
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '), { checks: c, detail, protectedDiff });

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(), instanceId: inst.id, legacyIndex, syncCopies,
    protectedAfter, headerProps: headerBefore, chipInstances: instAfter,
    expect: { parent: size(P), instance: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), center: centerNow, chain: chain.map(n => ({ id: n.id, size: size(n) })) }
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: true, failedCriteria: [], checks: c, result: detail,
  chain: chain.map(n => ({ id: n.id, size: size(n), pos: r2(n.x) + ',' + r2(n.y) })),
  prediction: pred, protectedDiff, chipInstances: { before: Object.keys(instBefore).length, after: Object.keys(instAfter).length },
  mutationCount, notes, errorCount: errors.length, errors
});
