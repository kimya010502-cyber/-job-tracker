/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 32p
 * Phase H2-A PROBE — clone 한 variant 안의 leading(Icon / Dot) visible 이 실제로 어떻게 동작하는지
 *
 * 왜
 *   32-v1 APPLY 가 `newVariantLeadingIconDotVisible` 에서 실패하고 rollback 됐다.
 *   이 조건은 다섯 가지(visible · main=Icon/Dot · 16×16 · 속성 참조 · index)를 한 줄로 묶어서
 *   **어느 것이 틀렸는지 알 수 없었다.** 이 probe 는 v1 과 같은 순서로 같은 변경을 재현하면서
 *   단계마다 다섯 가지를 따로 기록한다.
 *
 * self-cleaning
 *   임시 clone 하나만 만들고, 성공이든 실패든 finally 에서 반드시 지운다.
 *   기존 variant · 인스턴스 · Icon / Dot 마스터는 수정하지 않는다. property 를 추가하지 않는다.
 *   끝에서 variant 5개 · tone 옵션 · 세트 크기 · 기존 variant · 파일 전체 Chip 인스턴스 · stray 를 다시 확인한다.
 *   DRY_RUN 플래그 없음 — 실행하면 위 과정을 한 번 하고 원래대로 돌려놓는다.
 * ========================================================================== */

const SCRIPT_VERSION = '32p-H2A-v1-sync-leading-visibility-probe';

const IDS = { chipSet: '1029:1984', source: '1029:1975', iconDot: '1048:816' };
const PROBE_NAME = 'tone=sync';          // v1 과 같은 이름으로 재현 (끝에서 지운다)
const EXPECTED_TONES = ['neutral', 'brand', 'success', 'danger', 'waiting'];

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return '(읽기 오류: ' + e.message + ')'; } }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function boundColorId(p) { return p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
async function varName(id) { if (!id) return null; try { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : id; } catch (e) { return id; } }
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

/* leading 상태를 v1 조건 다섯 가지로 쪼개서 기록 */
async function leadingState(variant, leadingKey, expectIndex) {
  const all = kids(variant).map((c, i) => ({ i, id: c.id, name: c.name, type: c.type, visible: c.visible, size: size(c) }));
  const leads = kids(variant).filter(c => c.name === 'leading');
  const lead = leads[0] || null;
  if (!lead) return { found: false, children: all };
  const mc = await mainCompOf(lead);
  const glyphs = kids(lead);
  const glyph = glyphs.find(c => c.name === 'glyph') || glyphs[0] || null;
  const gp = glyph ? visiblePaints(glyph.fills) : [];
  let exposed = null, isExposed = null, compProps = null, overrides = null;
  try { exposed = (lead.exposedInstances || []).map(x => x.id); } catch (e) { exposed = '(오류 ' + e.message + ')'; }
  try { isExposed = lead.isExposedInstance; } catch (e) { isExposed = '(오류 ' + e.message + ')'; }
  try { compProps = lead.componentProperties ? JSON.stringify(lead.componentProperties) : null; } catch (e) { compProps = '(오류 ' + e.message + ')'; }
  try { overrides = (lead.overrides || []).map(o => ({ id: o.id, fields: o.overriddenFields })); } catch (e) { overrides = '(오류 ' + e.message + ')'; }
  const refs = sg(lead, 'componentPropertyReferences');
  const s = {
    found: true, leadingCount: leads.length, id: lead.id, type: lead.type,
    visible: lead.visible, visibleType: typeof lead.visible,
    mainComponent: mc ? mc.name + ' (' + mc.id + ')' : null, size: size(lead), index: kids(variant).indexOf(lead),
    componentPropertyReferences: refs, exposedInstances: exposed, isExposedInstance: isExposed, componentProperties: compProps, overrides,
    glyph: glyph ? { id: glyph.id, name: glyph.name, type: glyph.type, visible: glyph.visible, size: size(glyph), fill: gp.length ? (await varName(boundColorId(gp[0]))) || hex(gp[0].color) : null, fillCount: gp.length } : null,
    absoluteRenderBounds: (function () { try { const b = lead.absoluteRenderBounds; return b ? r2(b.width) + '×' + r2(b.height) : null; } catch (e) { return '(오류)'; } })(),
    variantWidth: r2(variant.width), children: all
  };
  /* v1 이 한 줄로 묶었던 다섯 조건을 따로 */
  s.v1Conditions = {
    c1_visibleTrue: lead.visible === true,
    c2_mainIsIconDot: !!mc && mc.id === IDS.iconDot,
    c3_size16: near(lead.width, 16) && near(lead.height, 16),
    c4_propertyRef: !!refs && typeof refs === 'object' && refs.mainComponent === leadingKey,
    c5_indexSameAsSource: kids(variant).indexOf(lead) === expectIndex,
    typeIsInstance: lead.type === 'INSTANCE'
  };
  s.v1Pass = Object.keys(s.v1Conditions).every(k => s.v1Conditions[k] === true);
  return s;
}

/* ======== 0. 기준값 ======== */
const set = await figma.getNodeByIdAsync(IDS.chipSet);
const src = await figma.getNodeByIdAsync(IDS.source);
if (!set || set.type !== 'COMPONENT_SET' || !src || src.parent.id !== set.id || src.name !== 'tone=success') {
  return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: 'Chip 세트 1029:1984 또는 tone=success 1029:1975 가 예상과 다르다', set: set ? set.name : null, src: src ? src.name : null });
}
const defs0 = set.componentPropertyDefinitions || {};
const toneKey = Object.keys(defs0).find(k => defs0[k].type === 'VARIANT' && /^tone/.test(k));
const leadingKey = Object.keys(defs0).find(k => defs0[k].type === 'INSTANCE_SWAP' && /^leading/.test(k));
const optsBefore = toneKey ? (defs0[toneKey].variantOptions || []).slice() : [];
const variantsBefore = kids(set).map(v => ({ id: v.id, name: v.name, snap: snapshot(v) }));
const setSizeBefore = size(set), setLayout = sg(set, 'layoutMode');
const srcLead = kids(src).find(c => c.name === 'leading');
const srcIndex = kids(src).indexOf(srcLead);
const sourceState = await leadingState(src, leadingKey, srcIndex);
if (variantsBefore.length !== 5 || optsBefore.slice().sort().join(',') !== EXPECTED_TONES.slice().sort().join(',') || kids(set).some(v => v.name === PROBE_NAME)) {
  return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '시작 상태가 variant 5개 · tone 5종이 아니다 — probe 를 시작하지 않는다', variants: variantsBefore.map(v => v.name), optsBefore });
}
await figma.loadAllPagesAsync();
async function chipInstances() {
  const res = {};
  for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await mainCompOf(inst);
    if (mc && mc.parent && mc.parent.id === IDS.chipSet) res[inst.id] = snapshot(inst);
  }
  return res;
}
const instBefore = await chipInstances();
const iconDotBefore = snapshot(await figma.getNodeByIdAsync(IDS.iconDot));
const pageTopBefore = set.parent ? kids(set.parent).length : null;

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
function boundPaint(name) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[name]); }

/* ======== 1. probe — v1 과 같은 순서 ======== */
const steps = [];
let clone = null, probeError = null;
try {
  clone = src.clone();
  steps.push({ step: '1 clone', parent: clone.parent ? clone.parent.id : null, inSet: !!clone.parent && clone.parent.id === set.id, index: kids(set).indexOf(clone),
    state: await leadingState(clone, leadingKey, srcIndex) });
  if (!clone.parent || clone.parent.id !== set.id) set.appendChild(clone);
  clone.name = PROBE_NAME;
  steps.push({ step: '2 rename', state: await leadingState(clone, leadingKey, srcIndex) });
  clone.fills = [boundPaint('surface/subtle')];
  const lbl = kids(clone).find(c => c.type === 'TEXT');
  if (lbl) { lbl.fills = [boundPaint('success/strong')]; await figma.loadFontAsync(lbl.fontName); lbl.characters = '동기화'; }
  steps.push({ step: '3 bg + label', state: await leadingState(clone, leadingKey, srcIndex) });

  /* A. 직접 visible = true */
  const lead = kids(clone).find(c => c.name === 'leading');
  let setError = null;
  try { lead.visible = true; } catch (e) { setError = e.message; }
  const leadAgain = kids(clone).find(c => c.name === 'leading');
  steps.push({ step: '4A leading.visible = true', setError, sameNodeAfterSet: !!leadAgain && leadAgain.id === lead.id,
    readBackSameRef: lead.visible, readBackFreshLookup: leadAgain ? leadAgain.visible : null, state: await leadingState(clone, leadingKey, srcIndex) });

  /* glyph fill (v1 마지막 단계) */
  const g = leadAgain ? (kids(leadAgain).find(c => c.name === 'glyph') || kids(leadAgain)[0]) : null;
  let glyphError = null;
  try { if (g) g.fills = [boundPaint('success/strong')]; } catch (e) { glyphError = e.message; }
  steps.push({ step: '5 glyph fill', glyphError, state: await leadingState(clone, leadingKey, srcIndex) });

  /* B. property 로 제어하는 구조인지 — 추가하지 않고 읽기만 */
  const defsNow = set.componentPropertyDefinitions || {};
  steps.push({ step: '6B property 구조 확인 (읽기만)',
    setProperties: Object.keys(defsNow).map(k => ({ key: k, type: defsNow[k].type, options: defsNow[k].variantOptions || null })),
    booleanPropertyExists: Object.keys(defsNow).some(k => defsNow[k].type === 'BOOLEAN'),
    leadingVisibleBoundToProperty: !!(leadAgain && leadAgain.componentPropertyReferences && leadAgain.componentPropertyReferences.visible),
    note: 'BOOLEAN 속성이 없고 visible 이 속성에 묶여 있지 않으면 레이어 visible 이 유일한 제어 수단이다' });
} catch (e) {
  probeError = e && e.message ? e.message : String(e);
} finally {
  /* 반드시 정리 */
  if (clone && !clone.removed) { try { clone.remove(); } catch (e) { errors.push('clone 삭제 실패: ' + e.message); } }
}

/* ======== 2. 정리 확인 ======== */
const defs1 = set.componentPropertyDefinitions || {};
const optsAfter = toneKey && defs1[toneKey] ? (defs1[toneKey].variantOptions || []).slice() : [];
const variantDiff = [];
for (const v of variantsBefore) { const n = await figma.getNodeByIdAsync(v.id); if (!n || JSON.stringify(snapshot(n)) !== JSON.stringify(v.snap)) variantDiff.push(v.name); }
const instAfter = await chipInstances();
const instDiff = Object.keys(instBefore).filter(id => JSON.stringify(instBefore[id]) !== JSON.stringify(instAfter[id])).concat(Object.keys(instAfter).filter(id => !instBefore[id]));
const cleanup = {
  cloneRemoved: !clone || !!clone.removed,
  variantCount5: kids(set).length === 5,
  toneOptionsRestored: optsAfter.slice().sort().join(',') === optsBefore.slice().sort().join(','),
  existingVariantsUnchanged: variantDiff.length === 0,
  chipInstancesUnchanged: instDiff.length === 0,
  iconDotUnchanged: JSON.stringify(snapshot(await figma.getNodeByIdAsync(IDS.iconDot))) === JSON.stringify(iconDotBefore),
  setSizeRestored: size(set) === setSizeBefore,
  noStrayClone: figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => c.name === PROBE_NAME).length === 0 && (set.parent ? kids(set.parent).length === pageTopBefore : true)
};
cleanup.allClean = Object.keys(cleanup).every(k => cleanup[k] === true);

/* ======== 3. 판정 보조 ======== */
const after4 = steps.find(s => s.step.indexOf('4A') === 0);
const after5 = steps.find(s => s.step.indexOf('5') === 0);
const failedConds = st => (st && st.state && st.state.v1Conditions ? Object.keys(st.state.v1Conditions).filter(k => st.state.v1Conditions[k] !== true) : null);
const diagnosis = {
  q1_canSetNestedVisible: after4 ? !after4.setError : null,
  q2_readBackTrueImmediately: after4 ? after4.readBackFreshLookup === true : null,
  q3_whichV1ConditionFailedAfterVisible: failedConds(after4),
  q3_whichV1ConditionFailedAtEnd: failedConds(after5),
  q4_visibilityControlledByProperty: steps.find(s => s.step.indexOf('6B') === 0) ? steps.find(s => s.step.indexOf('6B') === 0).leadingVisibleBoundToProperty : null,
  q5_glyphVisibleWhileLeadingHidden: sourceState.glyph ? { sourceLeadingVisible: sourceState.visible, sourceGlyphVisible: sourceState.glyph.visible } : null,
  cloneChangedLeading: steps[0] && steps[0].state ? { idChanged: steps[0].state.id !== sourceState.id, sourceLeadingId: sourceState.id, cloneLeadingId: steps[0].state.id } : null
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'SELF_CLEANING_PROBE',
  cleanupOk: cleanup.allClean, cleanup, probeError,
  diagnosis,
  context: { setSize: setSizeBefore, setLayout, toneKey, leadingKey, optsBefore, sourceLeadingIndex: srcIndex },
  sourceLeading: sourceState,
  steps,
  variantDiff, chipInstanceDiff: instDiff.slice(0, 20), chipInstancesChecked: Object.keys(instBefore).length,
  notes, errorCount: errors.length, errors
});
