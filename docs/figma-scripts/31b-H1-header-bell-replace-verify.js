/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 31b
 * Phase H1 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 보호 대상은 31 APPLY 가 성공 직후 남긴 기준값(joob.H1.baseline)과 비교한다. snapshot · mask 규칙은 31 과 같다.
 * 기하 값(크기 · 간격 · 중심)은 기준값에 기대지 않고 지금 다시 잰다.
 * ========================================================================== */

const SCRIPT_VERSION = '31b-H1-v1-header-bell-replace-verify';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', legacy: '1002:487', legacyVector: '1002:489', parent: '1003:1744', sibling: '1002:478',
  iconButton: '1037:2091', iconBell: '1048:814'
};
const OTHER_BELL_COPIES = ['1009:232', '1009:252', '1009:274', '1011:1852', '1010:1155', '1019:675', '1044:720'];
const BACKUP_COPIES = ['1019:675', '1044:720'];
const EXPECT = { parent: [159, 24], sibling: [131, 24], gap: 4, header: [1024, 64], center: 32 };
const BASELINE_KEY = 'joob.H1.baseline';

/* ======== 공통 (31 과 동일) ======== */
const notes = [];
const errors = [];
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
function absY(n) { return n.absoluteTransform[1][2]; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
async function varName(id) { if (!id) return null; try { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null; } catch (e) { return null; } }
async function colorVarsOf(n) {
  const res = [];
  for (const ch of ['fills', 'strokes']) for (const p of visiblePaints(sg(n, ch))) res.push(ch + ':' + ((await varName(boundColorId(p))) || hex(p.color)));
  return res.join(',');
}
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

/* ======== 기준값 · 노드 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { baseline = null; }
if (!baseline) errors.push('31 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 31 을 실행한 것과 같은 Scripter 에서 실행했는지 확인');
else if (baseline.scriptVersion !== '31-H1-v1-header-bell-replace') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);

const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
const P = N.parent, L = N.legacy, S = N.sibling, H = N.header;
const inst = baseline && baseline.instanceId ? await figma.getNodeByIdAsync(baseline.instanceId) : null;
const c = {};

/* ======== 1. 새 인스턴스 ======== */
c.newBellIconButtonFound = !!inst && inst.type === 'INSTANCE' && !!P && inst.parent && inst.parent.id === IDS.parent;
const imc = inst ? await mainCompOf(inst) : null;
c.usesIconButtonMaster = !!imc && imc.id === IDS.iconButton;
const slot = inst ? kids(inst).find(x => x.type === 'INSTANCE') : null;
const slotMc = slot ? await mainCompOf(slot) : null;
c.bellIconSwapCorrect = !!slotMc && slotMc.id === IDS.iconBell && slotMc.name === 'Icon / Bell';
const glyph = slot ? kids(slot).find(x => x.name === 'glyph') : null;
const iconColor = glyph ? await colorVarsOf(glyph) : null;
c.iconColorMatchesLegacy = !!baseline && !!iconColor && iconColor === baseline.legacyColor;
c.instance24x24 = !!inst && near(inst.width, 24) && near(inst.height, 24);
c.instanceVisible = !!inst && inst.visible !== false;
c.instanceAtFlowIndex0 = !!inst && !!P && flow(P)[0] && flow(P)[0].id === inst.id && kids(P).indexOf(inst) === 0;

/* ======== 2. 원본 ======== */
c.legacyStillExists = !!L && !L.removed && L.parent && L.parent.id === IDS.parent;
c.legacyHidden = !!L && L.visible === false;

/* ======== 3. layout ======== */
c.parent159x24 = !!P && near(P.width, EXPECT.parent[0], 0.05) && near(P.height, EXPECT.parent[1], 0.05) && flow(P).length === 2;
c.siblingSizeUnchanged = !!S && near(S.width, EXPECT.sibling[0]) && near(S.height, EXPECT.sibling[1]) && flow(P)[1] && flow(P)[1].id === IDS.sibling;
const gap = inst && S ? r2(S.x - (inst.x + inst.width)) : null;
c.siblingGap4 = near(gap, EXPECT.gap, 0.01);
c.header1024x64 = !!H && near(H.width, EXPECT.header[0]) && near(H.height, EXPECT.header[1]);
const center = inst && H ? r2(absY(inst) - absY(H) + inst.height / 2) : null;
c.headerCenterPreserved = near(center, EXPECT.center, 0.01) && near(H.height / 2, EXPECT.center, 0.01);
c.headerEffectsUnchanged = !!baseline && headerProps(H) === baseline.headerProps;

/* ======== 4. 보호 대상 ======== */
const chain = [];
{ let x = P; while (x && x.id !== IDS.header) { chain.push(x); x = x.parent; } if (x) chain.push(x); }
const MASK = {}, SKIP = [IDS.parent];
for (const n of chain.slice(0, -1)) MASK[n.id] = ['width', 'height', 'x', 'y'];
for (const n of chain) for (const k of kids(n)) if (!MASK[k.id]) MASK[k.id] = ['x', 'y'];
const now = {
  'mainFrame(masked)': snapshot(N.mainFrame, MASK, SKIP),
  'legacy(visible/x/y masked)': snapshot(L, { [IDS.legacy]: ['visible', 'x', 'y'] }),
  'sibling(x/y masked)': snapshot(S, { [IDS.sibling]: ['x', 'y'] }),
  'iconButton 1037:2091': snapshot(N.iconButton), 'iconBell 1048:814': snapshot(N.iconBell)
};
for (const id of OTHER_BELL_COPIES) now['bellCopy ' + id] = snapshot(await figma.getNodeByIdAsync(id));
const bp = baseline && baseline.protectedAfter ? baseline.protectedAfter : null;
const same = k => !!bp && !!bp[k] && JSON.stringify(bp[k]) === JSON.stringify(now[k]);
const protectedDiff = bp ? Object.keys(now).filter(k => !same(k)) : ['(기준값 없음)'];
c.otherBellCopiesUnchanged = OTHER_BELL_COPIES.every(id => same('bellCopy ' + id));
c.componentMastersUnchanged = same('iconButton 1037:2091') && same('iconBell 1048:814');
c.backupsUnchanged = BACKUP_COPIES.every(id => same('bellCopy ' + id));
c.protectedNodesUnchanged = protectedDiff.length === 0;
c.chainSizesUnchangedSinceApply = !!baseline && !!baseline.expect && baseline.expect.chain.every(row => { const n = chain.find(x => x.id === row.id); return n && size(n) === row.size; });

/* ======== 5. stray ======== */
await figma.loadAllPagesAsync();
const ibAll = [];
for (const x of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
  const mc = await mainCompOf(x);
  if (mc && mc.id === IDS.iconButton) ibAll.push({ id: x.id, parent: x.parent ? x.parent.id : null });
}
const ibInParent = ibAll.filter(x => x.parent === IDS.parent);
c.noStrayInstances = !!baseline && ibAll.length === baseline.iconButtonInstanceCount && ibInParent.length === 1 && !!inst && ibInParent[0].id === inst.id;

c.noErrors = errors.length === 0;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase H1 CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: {
    instance: inst ? { id: inst.id, master: imc ? imc.name : null, icon: slotMc ? slotMc.name : null, iconColor, size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: P ? kids(P).indexOf(inst) : null, visible: inst.visible } : null,
    legacy: L ? { id: L.id, visible: L.visible, index: P ? kids(P).indexOf(L) : null } : null,
    parent: P ? { size: size(P) } : null,
    sibling: S ? { size: size(S), pos: r2(S.x) + ',' + r2(S.y), gap } : null,
    header: H ? { size: size(H), bellCenterY: center, headerCenterY: r2(H.height / 2) } : null,
    chain: chain.map(n => ({ id: n.id, size: size(n) }))
  },
  applyExpect: baseline ? baseline.expect : null,
  protectedDiff, iconButtonInstances: { now: ibAll.length, atApply: baseline ? baseline.iconButtonInstanceCount : null },
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at } : null,
  notes, errorCount: errors.length, errors
});
