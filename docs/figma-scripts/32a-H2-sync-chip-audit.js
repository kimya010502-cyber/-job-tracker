/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 32a
 * Phase H2 사전 감사 — Header 동기화 배지 1002:478 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 *
 * 배경 — Phase A(16) 에서 보류한 대상이다.
 *   당시 판단: bg = surface/subtle, 글자·dot = success/strong 의 혼합이라 Chip tone 5종에 정확히 맞는 variant 가 없다.
 *   이번 감사는 그 판단을 실제 값으로 다시 확인하고, 선택지별로 무엇이 바뀌는지 숫자로 낸다. 결정은 하지 않는다.
 *
 * 확인하는 것
 *   1) 배지 전체 구조 — 크기 · padding · gap · radius · fill · 자식(점/아이콘/글자) · 글자 내용과 글꼴
 *   2) 각 부분의 색이 어느 변수에 연결돼 있는지 (혼합의 정확한 원인)
 *   3) Chip 세트 1029:1984 — variant 5종의 bg/글자 변수 · padding · gap · radius · leading 슬롯 · 속성
 *   4) tone 별 일치도 — bg · 글자 · 점 색이 각각 같은지, 다르면 얼마나 다른지 (hex)
 *   5) 화면에서 Chip 인스턴스에 색 override 를 쓴 전례 (시즌 배지 Icon / Dot 등)
 *   6) 교체 시 크기 예측 — 부모 1003:1744 · Header 영향 (글꼴이 같을 때만 정확, 다르면 근사라고 표시)
 *   7) 다른 동기화 배지 복제본 — 모양(크기+자식 구성) · 글자 내용 두 가지로 파일 전체 탐색
 * ========================================================================== */

const SCRIPT_VERSION = '32a-H2-v1-sync-chip-audit';

const IDS = {
  mainFrame: '1002:2', header: '1002:469', sync: '1002:478', syncDot: '1002:479', parent: '1003:1744', bellInstance: '1110:672',
  chipSet: '1029:1984', iconDot: '1048:816'
};
const SYNC_TEXT_RE = /동기화|sync/i;

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
function walk(n, fn, d) { d = d || 0; fn(n, d); for (const c of kids(n)) walk(c, fn, d + 1); }
function absX(n) { return n.absoluteTransform[0][2]; }
function absY(n) { return n.absoluteTransform[1][2]; }
function inside(n, id) { let x = n; while (x) { if (x.id === id) return true; x = x.parent; } return false; }
function pageOf(n) { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }

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
/* 보이는 첫 SOLID 의 "변수 이름 또는 hex" — 색 비교용 */
async function colorKey(n, ch) {
  const ps = visiblePaints(sg(n, ch));
  if (!ps.length) return null;
  const p = ps[0];
  const v = p.boundVariables && p.boundVariables.color ? await varName(p.boundVariables.color.id) : null;
  return { variable: v, hex: p.type === 'SOLID' ? hex(p.color) : p.type, opacity: r2(typeof p.opacity === 'number' ? p.opacity : 1), count: ps.length };
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
    layoutMode: lm, sizingH: sg(n, 'layoutSizingHorizontal'), sizingV: sg(n, 'layoutSizingVertical'), layoutPositioning: sg(n, 'layoutPositioning'),
    padding: lm && lm !== 'NONE' ? pads(n) : null, itemSpacing: lm && lm !== 'NONE' ? r2(sg(n, 'itemSpacing')) : null,
    primaryAlign: lm && lm !== 'NONE' ? sg(n, 'primaryAxisAlignItems') : null, counterAlign: lm && lm !== 'NONE' ? sg(n, 'counterAxisAlignItems') : null,
    cornerRadius: sg(n, 'cornerRadius') === 'MIXED' ? [sg(n, 'topLeftRadius'), sg(n, 'topRightRadius'), sg(n, 'bottomRightRadius'), sg(n, 'bottomLeftRadius')].map(r2) : r2(sg(n, 'cornerRadius')),
    fills: await paints(sg(n, 'fills')), fillStyle: await styleName(sg(n, 'fillStyleId')),
    strokes: await paints(sg(n, 'strokes')), strokeWeight: sg(n, 'strokeWeight'),
    effects: (sg(n, 'effects') || []).filter(e => e.visible !== false).map(e => e.type), effectStyle: await styleName(sg(n, 'effectStyleId')),
    boundVariables: await bound(n), childCount: kids(n).length
  };
  if (n.type === 'INSTANCE') { const mc = await mainCompOf(n); d.mainComponent = mc ? mc.name + ' (' + mc.id + ')' + (mc.parent && mc.parent.type === 'COMPONENT_SET' ? ' in ' + mc.parent.name : '') : null; }
  if (n.type === 'TEXT') {
    const fn = sg(n, 'fontName');
    d.text = {
      characters: n.characters, font: fn && fn !== 'MIXED' ? fn.family + ' ' + fn.style : fn, fontSize: sg(n, 'fontSize'),
      lineHeight: sg(n, 'lineHeight'), letterSpacing: sg(n, 'letterSpacing'), textStyle: await styleName(sg(n, 'textStyleId')),
      autoResize: sg(n, 'textAutoResize'), width: r2(n.width)
    };
  }
  return d;
}
async function tree(n, depth, maxDepth) {
  const d = await describe(n); if (!d) return null;
  if (depth < maxDepth && kids(n).length) { d.children = []; for (const c of kids(n)) d.children.push(await tree(c, depth + 1, maxDepth)); }
  return d;
}
/* 역할 판정 — 글자 / 점 / 아이콘 */
function roles(root) {
  const r = { texts: [], dots: [], icons: [], others: [] };
  walk(root, (x, d) => {
    if (d === 0 || x.visible === false) return;
    if (x.type === 'TEXT') r.texts.push(x);
    else if (x.type === 'ELLIPSE' || ((x.type === 'FRAME' || x.type === 'RECTANGLE') && x.width <= 10 && x.height <= 10 && near(x.width, x.height, 0.5) && visiblePaints(x.fills).length && !kids(x).length)) r.dots.push(x);
    else if (x.type === 'VECTOR' || x.type === 'BOOLEAN_OPERATION' || x.type === 'INSTANCE') r.icons.push(x);
  });
  return r;
}

/* ======== 0. 가드 ======== */
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!N.mainFrame || !N.sync) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '메인 화면 1002:2 또는 동기화 배지 1002:478 을 찾지 못했다' });
if (!inside(N.sync, IDS.header)) errors.push('1002:478 이 Header 1002:469 안에 있지 않다');

/* ======== 1. 배지 구조 ======== */
const syncTree = await tree(N.sync, 0, 4);
const R = roles(N.sync);
const syncBg = await colorKey(N.sync, 'fills');
const syncStroke = await colorKey(N.sync, 'strokes');
const textInfo = [];
for (const t of R.texts) textInfo.push({ id: t.id, characters: t.characters, color: await colorKey(t, 'fills'), ...(await describe(t)).text });
const dotInfo = [];
for (const d of R.dots) dotInfo.push({ id: d.id, type: d.type, size: size(d), color: await colorKey(d, 'fills'), cornerRadius: r2(sg(d, 'cornerRadius')), parent: d.parent ? d.parent.id + ' ' + size(d.parent) : null });
const iconInfo = [];
for (const i of R.icons) iconInfo.push(await describe(i));

/* ======== 2. 혼합 색 원인 ======== */
const partColors = {
  background: syncBg, border: syncStroke,
  text: textInfo.map(t => t.color), dot: dotInfo.map(d => d.color)
};
const bgVar = syncBg ? syncBg.variable : null;
const fgVars = textInfo.map(t => t.color && t.color.variable).concat(dotInfo.map(d => d.color && d.color.variable)).filter(Boolean);
const family = v => (v ? v.split('/')[0] : null);
const mixedCause = {
  backgroundVariable: bgVar, foregroundVariables: fgVars.filter((v, i, a) => a.indexOf(v) === i),
  backgroundFamily: family(bgVar), foregroundFamilies: fgVars.map(family).filter((v, i, a) => a.indexOf(v) === i),
  isMixed: !!bgVar && fgVars.some(v => family(v) !== family(bgVar) && family(v) !== 'text'),
  unboundParts: [].concat(syncBg && !syncBg.variable ? ['background ' + syncBg.hex] : [], textInfo.filter(t => t.color && !t.color.variable).map(t => 'text ' + t.color.hex),
    dotInfo.filter(d => d.color && !d.color.variable).map(d => 'dot ' + d.color.hex))
};

/* ======== 3. Chip 세트 ======== */
let chip = null;
const toneTable = [];
if (N.chipSet && N.chipSet.type === 'COMPONENT_SET') {
  const defs = N.chipSet.componentPropertyDefinitions || {};
  const props = [];
  for (const k of Object.keys(defs)) {
    let defName = null;
    if (defs[k].type === 'INSTANCE_SWAP') { const dn = await figma.getNodeByIdAsync(defs[k].defaultValue); defName = dn ? dn.name : null; }
    props.push({ key: k, type: defs[k].type, default: defs[k].defaultValue, defaultName: defName, options: defs[k].variantOptions || null,
      preferredValues: defs[k].preferredValues ? defs[k].preferredValues.length : null });
  }
  chip = { id: N.chipSet.id, name: N.chipSet.name, properties: props, variants: [] };
  for (const v of kids(N.chipSet)) {
    const vr = roles(v);
    const leading = kids(v).find(c => c.name === 'leading');
    const label = vr.texts[0] || kids(v).find(c => c.type === 'TEXT');
    const leadGlyph = leading ? (function () { let g = null; walk(leading, x => { if (!g && x !== leading && (x.name === 'glyph' || x.type === 'ELLIPSE' || x.type === 'VECTOR')) g = x; }); return g; })() : null;
    const row = {
      variant: v.name, id: v.id, size: size(v), padding: pads(v), gap: r2(sg(v, 'itemSpacing')), radius: r2(sg(v, 'cornerRadius')), bound: await bound(v),
      bg: await colorKey(v, 'fills'),
      label: label ? { id: label.id, color: await colorKey(label, 'fills'), ...(await describe(label)).text } : null,
      leading: leading ? { id: leading.id, type: leading.type, size: size(leading), visible: leading.visible !== false,
        main: leading.type === 'INSTANCE' ? ((await mainCompOf(leading)) || {}).name || null : null,
        refs: sg(leading, 'componentPropertyReferences'), glyphColor: leadGlyph ? await colorKey(leadGlyph, 'fills') : null } : null
    };
    chip.variants.push(row);
    /* tone 별 일치도 */
    const syncText = textInfo[0] ? textInfo[0].color : null, syncDot = dotInfo[0] ? dotInfo[0].color : null;
    const same = (a, b) => !!a && !!b && ((a.variable && a.variable === b.variable) || (!a.variable && !b.variable && a.hex === b.hex));
    toneTable.push({
      variant: v.name,
      bg: { chip: row.bg ? (row.bg.variable || row.bg.hex) + ' ' + (row.bg ? row.bg.hex : '') : null, sync: syncBg ? (syncBg.variable || syncBg.hex) + ' ' + syncBg.hex : null, same: same(row.bg, syncBg) },
      text: { chip: row.label && row.label.color ? (row.label.color.variable || row.label.color.hex) + ' ' + row.label.color.hex : null, sync: syncText ? (syncText.variable || syncText.hex) + ' ' + syncText.hex : null, same: same(row.label && row.label.color, syncText) },
      dotVsLabel: syncDot && row.label ? same(row.label.color, syncDot) : null,
      matches: [same(row.bg, syncBg), same(row.label && row.label.color, syncText)].filter(Boolean).length
    });
  }
}
const exactTone = toneTable.filter(t => t.bg.same && t.text.same).map(t => t.variant);
const bgOnlyTone = toneTable.filter(t => t.bg.same && !t.text.same).map(t => t.variant);
const fgOnlyTone = toneTable.filter(t => !t.bg.same && t.text.same).map(t => t.variant);

/* ======== 4. 화면의 Chip 인스턴스 · override 전례 ======== */
const chipInstances = [];
for (const inst of N.mainFrame.findAllWithCriteria({ types: ['INSTANCE'] })) {
  const mc = await mainCompOf(inst);
  if (!mc || !mc.parent || mc.parent.id !== IDS.chipSet) continue;
  const lead = kids(inst).find(c => c.name === 'leading');
  const leadVisible = lead ? lead.visible !== false : null;
  let leadGlyph = null; if (lead) walk(lead, x => { if (!leadGlyph && x !== lead && (x.name === 'glyph' || x.type === 'ELLIPSE')) leadGlyph = x; });
  const lbl = kids(inst).find(c => c.type === 'TEXT');
  let overrides = null; try { overrides = (inst.overrides || []).map(o => ({ id: o.id, fields: o.overriddenFields })); } catch (e) { overrides = null; }
  chipInstances.push({ id: inst.id, variant: mc.name, parent: inst.parent ? inst.parent.name + ' (' + inst.parent.id + ')' : null, visible: inst.visible !== false,
    label: lbl ? lbl.characters : null, leadingVisible: leadVisible, leadingMain: lead && lead.type === 'INSTANCE' ? ((await mainCompOf(lead)) || {}).name || null : null,
    leadingGlyphColor: leadGlyph ? await colorKey(leadGlyph, 'fills') : null, bgColor: await colorKey(inst, 'fills'), labelColor: lbl ? await colorKey(lbl, 'fills') : null,
    overrideFields: overrides });
}
const chipsByVariant = {};
for (const c of chipInstances) chipsByVariant[c.variant] = (chipsByVariant[c.variant] || 0) + 1;
const colorOverridePrecedent = chipInstances.filter(c => (c.overrideFields || []).some(o => (o.fields || []).some(f => f === 'fills')));

/* ======== 5. 교체 시 크기 예측 ======== */
let fit = null;
const P = N.parent;
if (chip && chip.variants.length && P) {
  const base = chip.variants[0];
  const lblStyle = base.label ? (base.label.textStyle || base.label.font) : null;
  const syncStyle = textInfo[0] ? (textInfo[0].textStyle || textInfo[0].font) : null;
  const sameTextStyle = !!lblStyle && lblStyle === syncStyle && textInfo[0] && base.label && textInfo[0].fontSize === base.label.fontSize;
  const syncLabelW = textInfo[0] ? textInfo[0].width : null;
  const leadW = base.leading ? parseFloat(base.leading.size) : 12;
  const p = base.padding, gap = base.gap || 0;
  const predictedW = syncLabelW !== null ? r2(p[1] + p[3] + leadW + gap + syncLabelW) : null;
  const predictedH = parseFloat(base.size.split('×')[1]);
  const dW = predictedW !== null ? r2(predictedW - N.sync.width) : null;
  fit = {
    currentSize: size(N.sync), chipHeight: predictedH, predictedWidthWithLeading: predictedW,
    widthIsExact: sameTextStyle, widthNote: sameTextStyle ? '글꼴·크기가 Chip 라벨과 같아 라벨 폭을 그대로 쓸 수 있다'
      : '글꼴/크기가 다르다 (' + syncStyle + ' ' + (textInfo[0] ? textInfo[0].fontSize : '') + ' → ' + lblStyle + ' ' + (base.label ? base.label.fontSize : '') + ') — 폭은 근사. 정확한 값은 교체 DRY_RUN 에서 복제본으로 잰다',
    heightChange: r2(predictedH - N.sync.height),
    parent: { id: P.id, size: size(P), layout: sg(P, 'layoutMode'), sizingH: sg(P, 'layoutSizingHorizontal'), sizingV: sg(P, 'layoutSizingVertical'), gap: r2(sg(P, 'itemSpacing')),
      children: kids(P).map(c => ({ id: c.id, name: c.name, type: c.type, size: size(c), visible: c.visible !== false, x: r2(c.x) })),
      predictedWidthAfter: dW !== null && sg(P, 'layoutSizingHorizontal') === 'HUG' ? r2(P.width + dW) : null },
    syncIndexInParent: kids(P).indexOf(N.sync), syncFlowIndex: flow(P).indexOf(N.sync),
    syncCenterYInHeader: N.header ? r2(absY(N.sync) - absY(N.header) + N.sync.height / 2) : null, headerCenterY: N.header ? r2(N.header.height / 2) : null,
    headerImpact: near(predictedH, N.sync.height, 0.01) ? '높이 같음 — Header 세로 영향 없음. 가로는 부모 HUG 폭만 바뀐다' : '높이 변화 ' + r2(predictedH - N.sync.height) + ' — 부모/Header 세로 재계산 필요'
  };
}
/* 부모 사슬 — 가로 변화가 어디까지 전달되는지 */
const chain = [];
{ let x = P; while (x && x.type !== 'PAGE') { chain.push({ id: x.id, name: x.name, size: size(x), layout: sg(x, 'layoutMode'), sizingH: sg(x, 'layoutSizingHorizontal'), primaryAlign: sg(x, 'primaryAxisAlignItems') }); if (x.id === IDS.header) break; x = x.parent; } }

/* ======== 6. 복제본 ======== */
await figma.loadAllPagesAsync();
const shapeCopies = [], textCopies = [];
{
  const sig = n => size(n) + '/' + kids(n).map(c => c.type + size(c)).join(',');
  const mySig = sig(N.sync);
  for (const f of figma.root.findAllWithCriteria({ types: ['FRAME', 'INSTANCE', 'GROUP'] })) {
    if (f.id === N.sync.id || !near(f.width, N.sync.width) || !near(f.height, N.sync.height) || sig(f) !== mySig) continue;
    const pg = pageOf(f);
    shapeCopies.push({ id: f.id, name: f.name, page: pg ? pg.name : null, insideMainFrame: inside(f, IDS.mainFrame), visible: f.visible !== false });
  }
  const myText = textInfo[0] ? textInfo[0].characters : null;
  for (const t of figma.root.findAllWithCriteria({ types: ['TEXT'] })) {
    if (inside(t, IDS.sync)) continue;
    if (!(myText && t.characters === myText) && !SYNC_TEXT_RE.test(t.characters)) continue;
    const pg = pageOf(t);
    textCopies.push({ id: t.id, characters: t.characters.slice(0, 40), parent: t.parent ? t.parent.id + ' ' + t.parent.name : null, page: pg ? pg.name : null,
      insideMainFrame: inside(t, IDS.mainFrame), exactSameText: t.characters === myText });
  }
}

/* ======== 요약 ======== */
const summary = {
  syncFound: !!N.sync, syncId: IDS.sync, syncType: N.sync.type, syncSize: size(N.sync), syncVisible: N.sync.visible !== false,
  parent: N.sync.parent ? N.sync.parent.id + ' ' + N.sync.parent.name : null, parentIsExpected: !!N.sync.parent && N.sync.parent.id === IDS.parent,
  text: textInfo.map(t => t.characters).join(' | '), textStyle: textInfo.map(t => (t.textStyle || t.font) + ' ' + t.fontSize).join(' | '),
  hasDot: dotInfo.length, hasIcon: iconInfo.length,
  background: syncBg ? (syncBg.variable || '(변수 없음)') + ' ' + syncBg.hex : null,
  textColor: textInfo.map(t => t.color ? (t.color.variable || '(변수 없음)') + ' ' + t.color.hex : null).join(' | '),
  dotColor: dotInfo.map(d => d.color ? (d.color.variable || '(변수 없음)') + ' ' + d.color.hex : null).join(' | '),
  isMixed: mixedCause.isMixed, unboundColorParts: mixedCause.unboundParts.length,
  exactToneMatch: exactTone, bgOnlyMatch: bgOnlyTone, fgOnlyMatch: fgOnlyTone,
  chipInstancesOnScreen: chipInstances.length, chipColorOverridePrecedents: colorOverridePrecedent.length,
  predictedWidth: fit ? fit.predictedWidthWithLeading : null, widthIsExact: fit ? fit.widthIsExact : null, heightChange: fit ? fit.heightChange : null,
  shapeCopies: shapeCopies.length, textCopies: textCopies.length,
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary,
  sync: syncTree, parts: { texts: textInfo, dots: dotInfo, icons: iconInfo },
  mixedCause, partColors,
  chip, toneTable,
  chipInstancesOnScreen: { byVariant: chipsByVariant, list: chipInstances, colorOverridePrecedent },
  fitIfReplacedWithChip: fit, parentChain: chain,
  copies: { byShape: shapeCopies, byText: textCopies },
  notes, errors
});
