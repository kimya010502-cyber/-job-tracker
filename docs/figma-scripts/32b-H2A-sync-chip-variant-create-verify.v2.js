/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 32b
 * Phase H2-A 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 비교 기준은 32 APPLY 가 성공 직후 남긴 joob.H2A.baseline. snapshot 규칙은 32 와 같다.
 * 새 variant 의 구조 · 색 · 크기는 기준값에 기대지 않고 지금 다시 잰다.
 * v2: leading 조건을 9개로 나눠 따로 내고(묶지 않음), 속성 참조가 정확히 leading#1052:0 인지 본다.
 * ========================================================================== */

const SCRIPT_VERSION = '32b-H2A-v2-sync-chip-variant-create-verify';

const IDS = { chipSet: '1029:1984', iconDot: '1048:816', mainFrame: '1002:2' };
const EXPECTED_TONES = ['neutral', 'brand', 'success', 'danger', 'waiting', 'sync'];
const NEW_VARIANT = 'tone=sync';
const COLORS = { bg: 'surface/subtle', label: 'success/strong', dot: 'success/strong' };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const BASELINE_KEY = 'joob.H2A.baseline';
const LEADING_KEY_EXPECTED = 'leading#1052:0';

/* ======== 공통 (32 와 동일) ======== */
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
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function snapshot(root) {
  if (!root) return { exists: false };
  const lines = [];
  (function w(n) {
    let fill = '';
    try { fill = visiblePaints(n.fills).map(p => (p.type === 'SOLID' ? hex(p.color) : p.type) + (boundColorId(p) || '')).join(','); } catch (e) { fill = '?'; }
    const pd = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') ? String((pathDataOf(n) || '').length) : '';
    let extra = '';
    try { if (n.type === 'TEXT') extra = n.characters + '/' + JSON.stringify(n.fontName) + '/' + n.textStyleId; } catch (e) { extra = '?'; }
    let bv = ''; try { bv = JSON.stringify(n.boundVariables || {}); } catch (e) { bv = '?'; }
    let refs = ''; try { refs = JSON.stringify(n.componentPropertyReferences || null); } catch (e) { refs = '?'; }
    lines.push([n.id, n.type, n.name, r2(n.width), r2(n.height), r2(n.x), r2(n.y), n.visible !== false, kids(n).length, pd, fill, extra, bv, refs].join('|'));
    for (const c of kids(n)) w(c);
  })(root);
  return { exists: true, nodeCount: lines.length, hash: hash(lines.join('\n')) };
}
function layoutBindings(n) {
  const bv = n && n.boundVariables ? n.boundVariables : {};
  const o = {};
  for (const k of Object.keys(bv).sort()) if (k !== 'fills' && k !== 'strokes') o[k] = Array.isArray(bv[k]) ? bv[k].map(x => x && x.id) : (bv[k] && bv[k].id);
  return JSON.stringify(o);
}

/* ======== 기준값 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { baseline = null; }
if (!baseline) errors.push('32 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 32 를 실행한 것과 같은 Scripter 에서 실행했는지 확인');
else if (baseline.scriptVersion !== '32-H2A-v2-sync-chip-variant-create') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const set = await figma.getNodeByIdAsync(IDS.chipSet);
const c = {};

/* ======== 1. 세트 ======== */
const variants = kids(set).filter(x => x.type === 'COMPONENT');
const defs = set ? (set.componentPropertyDefinitions || {}) : {};
const toneKey = Object.keys(defs).find(k => defs[k].type === 'VARIANT' && /^tone/.test(k));
const leadingKey = Object.keys(defs).find(k => defs[k].type === 'INSTANCE_SWAP' && /^leading/.test(k));
const opts = toneKey ? (defs[toneKey].variantOptions || []) : [];
c.chipSetFound = !!set && set.type === 'COMPONENT_SET' && set.name === 'Chip';
c.variantCount6 = variants.length === 6 && kids(set).length === 6;
c.toneOptionsSix = opts.length === 6 && EXPECTED_TONES.every(t => opts.indexOf(t) >= 0);
c.onlyToneAndLeadingProperties = Object.keys(defs).length === 2 && !!toneKey && leadingKey === LEADING_KEY_EXPECTED;

/* ======== 2. 새 variant ======== */
const nv = baseline ? await figma.getNodeByIdAsync(baseline.newVariantId) : null;
const src = baseline ? await figma.getNodeByIdAsync(baseline.sourceVariantId) : null;
const lead = nv ? kids(nv).find(x => x.name === 'leading') : null;
const lbl = nv ? kids(nv).find(x => x.type === 'TEXT') : null;
const glyph = lead ? (kids(lead).find(x => x.name === 'glyph') || kids(lead)[0]) : null;
const lmc = lead ? await mainCompOf(lead) : null;
const srcLead = src ? kids(src).find(x => x.name === 'leading') : null;
const srcLbl = src ? kids(src).find(x => x.type === 'TEXT') : null;
const isBound = (n, name) => { const ps = visiblePaints(n && n.fills); return ps.length === 1 && !!V[name] && boundColorId(ps[0]) === V[name].id; };
c.syncVariantFound = !!nv && nv.type === 'COMPONENT' && nv.name === NEW_VARIANT && nv.parent && nv.parent.id === IDS.chipSet;
c.syncHeight24 = !!nv && near(nv.height, 24);
c.syncLayoutMatchesChipRule = !!nv && !!src && nv.layoutMode === src.layoutMode && nv.itemSpacing === src.itemSpacing && nv.itemSpacing === 4 &&
  nv.paddingTop === 4 && nv.paddingBottom === 4 && nv.paddingLeft === 8 && nv.paddingRight === 8 && layoutBindings(nv) === layoutBindings(src);
c.syncWidthIsHug = !!nv && !!lead && !!lbl && near(nv.width, nv.paddingLeft + nv.paddingRight + lead.width + nv.itemSpacing + lbl.width, 0.05);
c.syncBgSurfaceSubtle = isBound(nv, COLORS.bg);
c.syncLabelSuccessStrong = isBound(lbl, COLORS.label) && !!srcLbl && lbl.textStyleId === srcLbl.textStyleId;
const refs = lead ? lead.componentPropertyReferences : null;
const L = {};
L.leadingIsInstance = !!lead && lead.type === 'INSTANCE';
L.leadingVisible = !!lead && lead.visible === true;
L.leadingMainIconDot = !!lmc && lmc.id === IDS.iconDot;
L.leadingSize16 = !!lead && near(lead.width, 16) && near(lead.height, 16);
L.leadingPropertyRefCorrect = !!refs && typeof refs === 'object' && refs.mainComponent === LEADING_KEY_EXPECTED;
L.leadingIndex0 = !!lead && kids(nv).indexOf(lead) === 0;
L.glyphVisible = !!glyph && glyph.visible !== false;
L.glyphSize8 = !!glyph && near(glyph.width, 8) && near(glyph.height, 8);
L.glyphColorSuccessStrong = isBound(glyph, COLORS.dot);
Object.assign(c, L);
c.allLeadingChecks = Object.keys(L).every(k => L[k] === true);
/* 기존 5개의 leading 참조가 그대로인지 (다시 쓰지 않았는지) */
c.existingLeadingRefsIntact = !!baseline && (await Promise.all(baseline.variantIds.map(async row => {
  const x = await figma.getNodeByIdAsync(row.id); const l = x ? kids(x).find(k => k.name === 'leading') : null;
  return !!l && !!l.componentPropertyReferences && l.componentPropertyReferences.mainComponent === LEADING_KEY_EXPECTED;
}))).every(Boolean);
c.syncUnchangedSinceApply = !!baseline && JSON.stringify(snapshot(nv)) === JSON.stringify(baseline.newVariantSnapshot);

/* ======== 3. 보호 대상 ======== */
const bp = baseline ? baseline.protectedAfter : null;
const diffs = [];
if (bp) {
  for (const row of baseline.variantIds) {
    const v = await figma.getNodeByIdAsync(row.id);
    if (!v || JSON.stringify(snapshot(v)) !== JSON.stringify(bp.variants[row.name])) diffs.push('variant ' + row.name);
  }
}
c.existingFiveVariantsUnchanged = !!bp && diffs.length === 0 && baseline.variantIds.length === 5;
c.otherVariantsLeadingStillHidden = !!baseline && (await Promise.all(baseline.variantIds.map(async row => {
  const v = await figma.getNodeByIdAsync(row.id); const l = v ? kids(v).find(x => x.name === 'leading') : null; return !!l && l.visible === false;
}))).every(Boolean);
const leadDefNow = leadingKey && defs[leadingKey] ? JSON.stringify({ type: defs[leadingKey].type, def: defs[leadingKey].defaultValue, pref: (defs[leadingKey].preferredValues || []).map(p => p.key || p) }) : null;
c.leadingDefinitionUnchanged = !!bp && leadDefNow === bp.leadingDef;
c.iconDotUnchanged = !!bp && JSON.stringify(snapshot(await figma.getNodeByIdAsync(IDS.iconDot))) === JSON.stringify(bp.iconDot);
c.mainFrameUnchanged = !!bp && JSON.stringify(snapshot(await figma.getNodeByIdAsync(IDS.mainFrame))) === JSON.stringify(bp.mainFrame);
c.backupsUnchanged = !!bp && (await Promise.all(BACKUP_COPY_IDS.map(async id => JSON.stringify(snapshot(await figma.getNodeByIdAsync(id))) === JSON.stringify(bp.backups[id])))).every(Boolean);

await figma.loadAllPagesAsync();
const instNow = {};
for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
  const mc = await mainCompOf(inst);
  if (mc && mc.parent && mc.parent.id === IDS.chipSet) instNow[inst.id] = { variant: mc.name, snap: snapshot(inst) };
}
const instBase = baseline ? baseline.chipInstances : {};
const instDiff = Object.keys(instBase).filter(id => !instNow[id] || JSON.stringify(instNow[id]) !== JSON.stringify(instBase[id]));
const instAdded = Object.keys(instNow).filter(id => !instBase[id]);
c.existingChipInstancesUnchanged = !!baseline && instDiff.length === 0 && instAdded.length === 0;
c.noSyncInstancesYet = !Object.keys(instNow).some(id => instNow[id].variant === NEW_VARIANT);

/* ======== 4. stray ======== */
c.noStrayComponents = figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(x => x.name === NEW_VARIANT).length === 1 &&
  !!baseline && (set && set.parent ? kids(set.parent).length === baseline.pageTop : false);

c.noErrors = errors.length === 0;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase H2-A CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  syncVariant: nv ? { id: nv.id, size: size(nv), padding: [nv.paddingTop, nv.paddingRight, nv.paddingBottom, nv.paddingLeft], gap: nv.itemSpacing,
    label: lbl ? lbl.characters + ' ' + r2(lbl.width) : null, leading: lead ? { main: lmc ? lmc.name : null, size: size(lead), visible: lead.visible, index: kids(nv).indexOf(lead), componentPropertyReferences: refs } : null,
    glyph: glyph ? { visible: glyph.visible, size: size(glyph) } : null } : null,
  propertyKeys: Object.keys(defs),
  toneOptions: opts, variantDiff: diffs, chipInstances: { checked: Object.keys(instBase).length, changed: instDiff.slice(0, 20), added: instAdded.slice(0, 20) },
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at } : null,
  notes, errorCount: errors.length, errors
});
