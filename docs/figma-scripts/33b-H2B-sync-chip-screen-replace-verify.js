/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 33b
 * Phase H2-B 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 보호 대상은 33 APPLY 가 성공 직후 남긴 joob.H2B.baseline 과 비교한다. snapshot · mask 규칙은 33 과 같다.
 * 인스턴스 구조 · 색 · 크기 · 중심은 기준값에 기대지 않고 지금 다시 잰다. 조건은 항목별로 따로 낸다.
 * ========================================================================== */

const SCRIPT_VERSION = '33b-H2B-v1-sync-chip-screen-replace-verify';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', legacy: '1002:478', parent: '1003:1744', bell: '1110:672', legacyBell: '1002:487',
  chipSet: '1029:1984', syncVariant: '1114:684', iconDot: '1048:816'
};
const LABEL = '실시간 동기화 완료';
const LEADING_KEY = 'leading#1052:0';
const COLORS = { bg: 'surface/subtle', label: 'success/strong', dot: 'success/strong' };
const EXPECT = { parent: [165, 24], chip: [137, 24], header: [1024, 64], center: 32, gap: 4 };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const COLOR_OVERRIDE_FIELDS = ['fills', 'strokes', 'effects', 'fillStyleId', 'strokeStyleId', 'effectStyleId', 'opacity', 'boundVariables'];
const BASELINE_KEY = 'joob.H2B.baseline';

/* ======== 공통 (33 과 동일) ======== */
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

/* ======== 기준값 · 노드 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { baseline = null; }
if (!baseline) errors.push('33 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 33 을 실행한 것과 같은 Scripter 에서 실행했는지 확인');
else if (baseline.scriptVersion !== '33-H2B-v1-sync-chip-screen-replace') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
const P = N.parent, L = N.legacy, H = N.header, BELL = N.bell;
const inst = baseline ? await figma.getNodeByIdAsync(baseline.instanceId) : null;
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const isBound = (n, name) => { const ps = visiblePaints(n && n.fills); return ps.length === 1 && !!V[name] && boundColorId(ps[0]) === V[name].id; };
const c = {};

/* ======== 1. 새 인스턴스 ======== */
const imc = inst ? await mainCompOf(inst) : null;
const lbl = inst ? kids(inst).find(x => x.type === 'TEXT') : null;
const lead = inst ? kids(inst).find(x => x.name === 'leading') : null;
const lmc = lead ? await mainCompOf(lead) : null;
const glyph = lead ? (kids(lead).find(x => x.name === 'glyph') || kids(lead)[0]) : null;
let ov = null; try { ov = inst ? (inst.overrides || []).map(o => ({ id: o.id, fields: o.overriddenFields || [] })) : null; } catch (e) { notes.push('overrides 읽기 실패: ' + e.message); }
const colorOverrides = ov ? ov.filter(o => o.fields.some(f => COLOR_OVERRIDE_FIELDS.indexOf(f) >= 0)) : null;
c.newSyncChipFound = !!inst && inst.type === 'INSTANCE' && !!P && inst.parent && inst.parent.id === IDS.parent;
c.variantIsSync = !!imc && imc.id === IDS.syncVariant && imc.name === 'tone=sync';
c.labelCorrect = !!lbl && lbl.characters === LABEL;
c.size137x24 = !!inst && near(inst.width, EXPECT.chip[0], 0.05) && near(inst.height, EXPECT.chip[1]);
c.instanceVisible = !!inst && inst.visible !== false;
c.leadingVisible = !!lead && lead.visible === true;
c.leadingIconDot = !!lmc && lmc.id === IDS.iconDot;
c.leadingPropertyRef = !!lead && !!lead.componentPropertyReferences && lead.componentPropertyReferences.mainComponent === LEADING_KEY;
c.bgInheritedSurfaceSubtle = isBound(inst, COLORS.bg);
c.labelInheritedSuccessStrong = isBound(lbl, COLORS.label);
c.dotInheritedSuccessStrong = isBound(glyph, COLORS.dot);
c.noColorOverrides = Array.isArray(colorOverrides) && colorOverrides.length === 0;
c.flowOrderBellThenChip = !!P && flow(P).length === 2 && flow(P)[0].id === IDS.bell && !!inst && flow(P)[1].id === inst.id;
c.atLegacyIndex = !!baseline && !!inst && kids(P).indexOf(inst) === baseline.legacyIndex;

/* ======== 2. 원본 · layout ======== */
c.legacyStillExists = !!L && L.parent && L.parent.id === IDS.parent;
c.legacyHidden = !!L && L.visible === false;
c.parent165x24 = !!P && near(P.width, EXPECT.parent[0], 0.05) && near(P.height, EXPECT.parent[1], 0.05);
const gap = inst && BELL ? r2(inst.x - (BELL.x + BELL.width)) : null;
c.bellToChipGap4 = near(gap, EXPECT.gap, 0.01);
c.header1024x64 = !!H && near(H.width, EXPECT.header[0]) && near(H.height, EXPECT.header[1]);
const center = inst && H ? r2(absY(inst) - absY(H) + inst.height / 2) : null;
c.centerY32 = near(center, EXPECT.center, 0.01);
c.headerEffectsUnchanged = !!baseline && headerProps(H) === baseline.headerProps;

/* ======== 3. 보호 대상 ======== */
const chain = [];
{ let x = P; while (x && x.id !== IDS.header) { chain.push(x); x = x.parent; } if (x) chain.push(x); }
const MASK = {}, SKIP = [IDS.parent];
for (const n of chain.slice(0, -1)) MASK[n.id] = ['width', 'height', 'x', 'y'];
for (const n of chain) for (const k of kids(n)) if (!MASK[k.id]) MASK[k.id] = ['x', 'y'];
const now = {
  'mainFrame(masked)': snapshot(N.mainFrame, MASK, SKIP),
  'legacy(visible/x/y masked)': snapshot(L, { [IDS.legacy]: ['visible', 'x', 'y'] }),
  'bell 1110:672': snapshot(BELL), 'legacyBell 1002:487': snapshot(N.legacyBell),
  'chipSet 1029:1984': snapshot(N.chipSet), 'iconDot 1048:816': snapshot(N.iconDot)
};
const syncCopies = baseline ? baseline.syncCopies || [] : [];
for (const id of syncCopies) now['syncCopy ' + id] = snapshot(await figma.getNodeByIdAsync(id));
for (const id of BACKUP_COPY_IDS) now['backup ' + id] = snapshot(await figma.getNodeByIdAsync(id));
const bp = baseline ? baseline.protectedAfter : null;
const same = k => !!bp && !!bp[k] && JSON.stringify(bp[k]) === JSON.stringify(now[k]);
const protectedDiff = bp ? Object.keys(now).filter(k => !same(k)) : ['(기준값 없음)'];
c.bellUnchanged = same('bell 1110:672');
c.chipMastersUnchanged = same('chipSet 1029:1984') && same('iconDot 1048:816');
c.otherSyncCopiesUnchanged = syncCopies.every(id => same('syncCopy ' + id));
c.backupsUnchanged = BACKUP_COPY_IDS.every(id => same('backup ' + id));
c.protectedNodesUnchanged = protectedDiff.length === 0;
c.chainSizesUnchangedSinceApply = !!baseline && baseline.expect.chain.every(row => { const n = chain.find(x => x.id === row.id); return n && size(n) === row.size; });

/* ======== 4. 인스턴스 전체 · stray ======== */
await figma.loadAllPagesAsync();
const instNow = {};
for (const x of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
  const mc = await mainCompOf(x);
  if (mc && mc.parent && mc.parent.id === IDS.chipSet) instNow[x.id] = { variant: mc.name, parent: x.parent ? x.parent.id : null, snap: snapshot(x) };
}
const instBase = baseline ? baseline.chipInstances : {};
const changed = Object.keys(instBase).filter(id => !instNow[id] || JSON.stringify(instNow[id]) !== JSON.stringify(instBase[id]));
const added = Object.keys(instNow).filter(id => !instBase[id]);
c.chipInstancesUnchangedSinceApply = !!baseline && changed.length === 0 && added.length === 0;
const syncInstances = Object.keys(instNow).filter(id => instNow[id].variant === 'tone=sync');
c.noStrayInstances = syncInstances.length === 1 && !!inst && syncInstances[0] === inst.id;

c.noErrors = errors.length === 0;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase H2-B CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: {
    instance: inst ? { id: inst.id, master: imc ? imc.name : null, size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: P ? kids(P).indexOf(inst) : null } : null,
    label: lbl ? lbl.characters : null, leading: lead ? { visible: lead.visible, main: lmc ? lmc.name : null, refs: lead.componentPropertyReferences } : null,
    overrides: ov, colorOverrides, legacy: L ? { visible: L.visible, index: P ? kids(P).indexOf(L) : null } : null,
    parent: P ? size(P) : null, gap, header: H ? size(H) : null, centerY: center, chain: chain.map(n => ({ id: n.id, size: size(n) }))
  },
  applyExpect: baseline ? baseline.expect : null, protectedDiff,
  chipInstances: { now: Object.keys(instNow).length, changed: changed.slice(0, 20), added: added.slice(0, 20), syncInstances },
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at } : null,
  notes, errorCount: errors.length, errors
});
