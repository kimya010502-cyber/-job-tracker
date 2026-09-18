/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 32
 * Phase H2-A — Chip 세트 1029:1984 에 variant `tone=sync` 하나 추가 (화면 수정 없음)
 *
 * 만드는 방법
 *   기존 `tone=success` variant 를 세트 안에서 clone → 이름 `tone=sync`.
 *   clone 이므로 padding(4/8) · gap 4 · radius/full · HUG · 높이 24 · Chip 텍스트 스타일 · leading 슬롯
 *   (Icon / Dot 16×16 인스턴스 + INSTANCE_SWAP 참조) 변수 연결이 그대로 따라온다. 새로 그리는 것이 없다.
 *   그다음 바꾸는 것은 네 가지뿐이다:
 *     1) 배경 fill → surface/subtle          (success 는 success/soft)
 *     2) 라벨 fill → success/strong          (success 와 같은 값이지만 명시적으로 다시 연결)
 *     3) leading visible → true              (다른 5개는 false 그대로)
 *     4) leading 안 Dot glyph fill → success/strong
 *   라벨 문구는 "동기화" 로 둔다 (마스터 샘플일 뿐, 화면 문구는 H2-B 에서 인스턴스에 넣는다).
 *   새 component property 는 만들지 않는다. tone 옵션에 sync 가 붙는 것은 variant 이름으로 자동이다.
 *
 * 건드리지 않는 것 (전후 snapshot 대조)
 *   기존 variant 5개 · Chip 세트의 property 정의(tone 옵션 추가 제외) · 파일 전체 Chip 인스턴스 ·
 *   Icon / Dot 1048:816 · 메인 화면 1002:2 전체 · backup 1019:115 / 1044:160
 *
 * 실패 정책  clone 이후 어느 단계든 실패하거나 되읽기가 하나라도 틀리면 clone 을 지우고,
 *           세트 · 기존 variant · 인스턴스가 원래와 같은지 다시 확인해서 보고한다.
 *
 * v2 (v1 APPLY 실패 원인 — 32p probe 로 확정)
 *   variant 를 clone 하면 안쪽 leading 인스턴스는 복제되지만 **componentPropertyReferences 가 {} 로 비어 버린다.**
 *   (원본 tone=success 는 { mainComponent: "leading#1052:0" }). visible · Icon/Dot · 16×16 · index 는 전부 정상이었다.
 *   v2 는 clone 직후 leading 을 기존 속성 leading#1052:0 에 **다시 연결**한다 (13 과 같은 방식:
 *   inst.componentPropertyReferences = { mainComponent: propKey }). 새 속성은 만들지 않는다.
 *   되읽기 조건은 하나로 묶지 않고 leading 9개 항목을 따로 내고, allLeadingChecks 는 마지막 합산에만 쓴다.
 *   rollback 판정은 삭제한 노드 참조의 .removed 가 아니라 **id 로 다시 조회해 null 인지**로 한다
 *   (32p 에서 참조 기반 판정이 false negative 를 냈다).
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight · 계획 · 보호 대상 기준값만. mutation 0 (글꼴 load 가능 여부만 확인한다 — 문서 변경 없음)
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '32-H2A-v2-sync-chip-variant-create';

const IDS = { chipSet: '1029:1984', iconDot: '1048:816', mainFrame: '1002:2' };
const EXPECTED_TONES = ['neutral', 'brand', 'success', 'danger', 'waiting'];
const SOURCE_VARIANT = 'tone=success';
const NEW_VARIANT = 'tone=sync';
const NEW_LABEL = '동기화';
const COLORS = { bg: 'surface/subtle', label: 'success/strong', dot: 'success/strong' };
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const BASELINE_KEY = 'joob.H2A.baseline';
const LEADING_KEY_EXPECTED = 'leading#1052:0';

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
function walk(n, fn) { fn(n); for (const c of kids(n)) walk(c, fn); }
function pageOf(n) { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
/* padding · gap · radius 변수 연결 — fills/strokes 는 일부러 바꾸므로 제외 */
function layoutBindings(n) {
  const bv = n && n.boundVariables ? n.boundVariables : {};
  const o = {};
  for (const k of Object.keys(bv).sort()) if (k !== 'fills' && k !== 'strokes') o[k] = Array.isArray(bv[k]) ? bv[k].map(x => x && x.id) : (bv[k] && bv[k].id);
  return JSON.stringify(o);
}

/* snapshot — 29 와 같은 규칙 + 글자 내용 · 변수 연결 id 까지 (마스터 비교는 더 엄격하게) */
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

/* ======== 0. preflight ======== */
const pf = {};
const blockers = [];
function gate(key, cond, why) { pf[key] = !!cond; if (!cond) blockers.push(key + ' — ' + why); }

const set = await figma.getNodeByIdAsync(IDS.chipSet);
gate('chipSetFound', set && set.type === 'COMPONENT_SET' && set.name === 'Chip', 'Chip 세트 1029:1984 가 없다');
if (!set) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, blockers, preflight: pf });

const variants = kids(set).filter(c => c.type === 'COMPONENT');
const defs = set.componentPropertyDefinitions || {};
const toneKey = Object.keys(defs).find(k => defs[k].type === 'VARIANT' && /^tone/.test(k));
const toneOptions = toneKey ? (defs[toneKey].variantOptions || []) : [];
const leadingKey = Object.keys(defs).find(k => defs[k].type === 'INSTANCE_SWAP' && /^leading/.test(k));
gate('existingVariantCount5', variants.length === 5 && kids(set).length === 5, '세트 자식이 variant 5개가 아니다: ' + kids(set).map(c => c.name).join(', '));
gate('existingToneOptions', toneOptions.slice().sort().join(',') === EXPECTED_TONES.slice().sort().join(','), 'tone 옵션이 예상과 다르다: ' + toneOptions.join(','));
gate('noSyncCollision', !variants.some(v => v.name === NEW_VARIANT) && toneOptions.indexOf('sync') < 0, 'tone=sync 가 이미 있다');
gate('leadingPropertyFound', !!leadingKey, 'leading INSTANCE_SWAP 속성이 없다: ' + Object.keys(defs).join(','));
const propKeysBefore = Object.keys(defs).sort();
gate('leadingKeyIsExpected', leadingKey === LEADING_KEY_EXPECTED, 'leading 속성 key 가 ' + LEADING_KEY_EXPECTED + ' 가 아니다: ' + leadingKey);
gate('onlyToneAndLeadingProperties', propKeysBefore.length === 2 && !!toneKey && !!leadingKey, 'Chip 속성이 tone · leading 두 개가 아니다: ' + propKeysBefore.join(','));

const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const missingVars = [COLORS.bg, COLORS.label, COLORS.dot].filter(n => !V[n]);
gate('variablesFound', missingVars.length === 0, '변수 없음: ' + missingVars.join(','));

/* source variant 구조 */
const src = variants.find(v => v.name === SOURCE_VARIANT);
gate('sourceVariantFound', !!src, SOURCE_VARIANT + ' 가 없다');
let srcInfo = null, srcLeading = null, srcLabel = null, srcGlyph = null;
if (src) {
  srcLeading = kids(src).find(c => c.name === 'leading');
  srcLabel = kids(src).find(c => c.type === 'TEXT');
  const lmc = srcLeading ? await mainCompOf(srcLeading) : null;
  srcGlyph = srcLeading ? kids(srcLeading).find(c => c.name === 'glyph') || kids(srcLeading)[0] : null;
  const glyphFill = srcGlyph ? visiblePaints(srcGlyph.fills) : [];
  srcInfo = {
    id: src.id, size: size(src), layoutMode: sg(src, 'layoutMode'), sizingH: sg(src, 'layoutSizingHorizontal') || sg(src, 'primaryAxisSizingMode'),
    padding: [src.paddingTop, src.paddingRight, src.paddingBottom, src.paddingLeft], gap: src.itemSpacing,
    bound: Object.keys(src.boundVariables || {}), children: kids(src).map(c => c.name + ':' + c.type),
    leading: srcLeading ? { id: srcLeading.id, type: srcLeading.type, size: size(srcLeading), visible: srcLeading.visible, main: lmc ? lmc.name + ' (' + lmc.id + ')' : null,
      refs: sg(srcLeading, 'componentPropertyReferences'), index: kids(src).indexOf(srcLeading) } : null,
    label: srcLabel ? { id: srcLabel.id, characters: srcLabel.characters, font: srcLabel.fontName, textStyleId: srcLabel.textStyleId, width: r2(srcLabel.width) } : null,
    glyph: srcGlyph ? { id: srcGlyph.id, type: srcGlyph.type, size: size(srcGlyph), fills: glyphFill.length } : null
  };
  gate('sourceHeight24', near(src.height, 24), SOURCE_VARIANT + ' 높이가 24 가 아니다: ' + size(src));
  gate('sourceLeadingIsIconDot', !!srcLeading && srcLeading.type === 'INSTANCE' && !!lmc && lmc.id === IDS.iconDot && near(srcLeading.width, 16) && near(srcLeading.height, 16),
    'source leading 이 Icon / Dot 16×16 인스턴스가 아니다: ' + JSON.stringify(srcInfo.leading));
  gate('sourceLeadingBoundToProperty', !!srcLeading && sg(srcLeading, 'componentPropertyReferences') && srcLeading.componentPropertyReferences.mainComponent === leadingKey,
    'source leading 이 leading 속성에 연결돼 있지 않다');
  gate('sourceLeadingIndex0', !!srcLeading && kids(src).indexOf(srcLeading) === 0, 'source leading 이 index 0 이 아니다');
  gate('sourceLeadingHidden', !!srcLeading && srcLeading.visible === false, 'source leading 이 숨김이 아니다 (다른 variant 관례와 다름)');
  gate('sourceLabelFound', !!srcLabel && srcLabel.fontName && srcLabel.fontName !== figma.mixed, 'source 라벨 텍스트가 없거나 글꼴이 섞여 있다');
  gate('sourceGlyphFillable', !!srcGlyph && glyphFill.length === 1, 'Dot glyph 에 보이는 fill 이 하나가 아니다');
}
/* 글꼴 load — 문서를 바꾸지 않는다 */
let fontLoad = null;
if (srcLabel && srcLabel.fontName && srcLabel.fontName !== figma.mixed) {
  try { await figma.loadFontAsync(srcLabel.fontName); fontLoad = 'ok ' + srcLabel.fontName.family + ' ' + srcLabel.fontName.style; }
  catch (e) { fontLoad = 'failed: ' + e.message; }
}
gate('labelFontLoadable', !!fontLoad && fontLoad.indexOf('ok') === 0, '라벨 글꼴을 불러오지 못했다: ' + fontLoad);

/* 세트 배치 — 새 variant 를 둘 자리 */
const setLayout = sg(set, 'layoutMode');
const last = variants[variants.length - 1];
let placement = null;
if (setLayout && setLayout !== 'NONE') placement = { mode: 'autoLayout', note: '세트가 auto layout(' + setLayout + ') 이라 맨 뒤에 붙이면 자리가 정해진다' };
else if (last) {
  const xs = variants.map(v => v.x), ys = variants.map(v => v.y);
  const sameRow = ys.every(y => near(y, ys[0]));
  const sameCol = xs.every(x => near(x, xs[0]));
  const stepX = variants.length > 1 ? r2(variants[1].x - (variants[0].x + variants[0].width)) : 16;
  const stepY = variants.length > 1 ? r2(variants[1].y - (variants[0].y + variants[0].height)) : 16;
  placement = sameRow ? { mode: 'row', x: r2(last.x + last.width + stepX), y: r2(last.y), gap: stepX }
    : sameCol ? { mode: 'column', x: r2(last.x), y: r2(last.y + last.height + stepY), gap: stepY }
    : { mode: 'below', x: r2(Math.min.apply(null, xs)), y: r2(Math.max.apply(null, variants.map(v => v.y + v.height)) + 16), gap: 16 };
}
gate('placementFound', !!placement, '새 variant 위치를 정하지 못했다');

/* ======== 1. 보호 대상 기준값 ======== */
await figma.loadAllPagesAsync();
async function chipInstanceSnapshots() {
  const res = {};
  for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await mainCompOf(inst);
    if (mc && mc.parent && mc.parent.id === IDS.chipSet) res[inst.id] = { variant: mc.name, snap: snapshot(inst) };
  }
  return res;
}
async function takeProtected() {
  const res = { variants: {}, iconDot: snapshot(await figma.getNodeByIdAsync(IDS.iconDot)), mainFrame: snapshot(await figma.getNodeByIdAsync(IDS.mainFrame)), backups: {} };
  for (const v of variants) res.variants[v.name] = snapshot(v);
  for (const id of BACKUP_COPY_IDS) res.backups[id] = snapshot(await figma.getNodeByIdAsync(id));
  const d = set.componentPropertyDefinitions || {};
  res.leadingDef = leadingKey && d[leadingKey] ? JSON.stringify({ type: d[leadingKey].type, def: d[leadingKey].defaultValue, pref: (d[leadingKey].preferredValues || []).map(p => p.key || p) }) : null;
  res.setProps = { name: set.name, parent: set.parent ? set.parent.id : null, page: pageOf(set) ? pageOf(set).id : null };
  return res;
}
const protectedBefore = await takeProtected();
const instancesBefore = await chipInstanceSnapshots();
const pageTopBefore = set.parent ? kids(set.parent).length : null;
const setSizeBefore = size(set);
const setWBefore = set.width, setHBefore = set.height;
const syncNamedBefore = figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => c.name === NEW_VARIANT).length;

pf.mutationCountIsZero = mutationCount === 0;
pf.everyTargetReady = blockers.length === 0;
const preflightPassed = blockers.length === 0 && Object.keys(pf).every(k => pf[k] === true);

const byVariant = {};
for (const id of Object.keys(instancesBefore)) byVariant[instancesBefore[id].variant] = (byVariant[instancesBefore[id].variant] || 0) + 1;

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers, preflight: pf,
    chipSet: { id: set.id, size: size(set), layoutMode: setLayout, variants: variants.map(v => ({ name: v.name, id: v.id, size: size(v), pos: r2(v.x) + ',' + r2(v.y) })),
      properties: propKeysBefore, toneKey, toneOptions, leadingKey },
    source: srcInfo, fontLoad, placement,
    plan: preflightPassed ? [
      SOURCE_VARIANT + ' (' + src.id + ') 를 세트 안에서 clone',
      '이름 → ' + NEW_VARIANT + ', 세트 맨 뒤 / 위치 ' + JSON.stringify(placement),
      '배경 fill → ' + COLORS.bg + ' · 라벨 fill → ' + COLORS.label + ' · 라벨 문구 → "' + NEW_LABEL + '"',
      'clone 직후 leading 을 기존 속성 ' + LEADING_KEY_EXPECTED + ' 에 다시 연결 (clone 은 참조를 {} 로 비운다 — 32p)',
      'leading visible → true (Icon / Dot 유지) · Dot glyph fill → ' + COLORS.dot,
      '되읽기: tone 옵션 6개 · 새 variant 구조 · 기존 5개 · property 정의 · 인스턴스 ' + Object.keys(instancesBefore).length + '개 · Icon / Dot · 메인 화면 · stray'
    ] : null,
    expectedNewVariant: { height: 24, padding: srcInfo ? srcInfo.padding : null, gap: srcInfo ? srcInfo.gap : null, width: 'HUG = 8 + 16 + 4 + 라벨("' + NEW_LABEL + '") 폭 + 8' },
    protectedBaseline: { variantCount: Object.keys(protectedBefore.variants).length, chipInstances: Object.keys(instancesBefore).length, chipInstancesByVariant: byVariant,
      iconDot: protectedBefore.iconDot, mainFrame: protectedBefore.mainFrame, backups: protectedBefore.backups },
    syncNamedComponentsBefore: syncNamedBefore,
    mutationCount, notes, errorCount: errors.length + blockers.length
  });
}

/* ======== 2. APPLY ======== */
function boundPaint(name) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[name]); }
let clone = null, cloneId = null, failure = null, rebind = null;
const FAIL_AT = null;   // 테스트용 — 실제 실행에서는 null
try {
  clone = src.clone(); mutationCount++;
  cloneId = clone.id;
  if (!clone.parent || clone.parent.id !== set.id) { set.appendChild(clone); mutationCount++; }
  if (kids(set).indexOf(clone) !== kids(set).length - 1) { set.appendChild(clone); mutationCount++; }
  clone.name = NEW_VARIANT; mutationCount++;
  /* leading 속성 참조 재연결 — clone 이 비운 것을 원래 key 로 */
  const leadR = kids(clone).find(c => c.name === 'leading');
  assert(!!leadR && leadR.type === 'INSTANCE', 'clone 에서 leading 인스턴스를 찾지 못했다');
  const refsBeforeRebind = JSON.stringify(sg(leadR, 'componentPropertyReferences'));
  leadR.componentPropertyReferences = { mainComponent: leadingKey }; mutationCount++;
  const refsAfterRebind = sg(leadR, 'componentPropertyReferences');
  rebind = { refsBeforeRebind, refsAfterRebind: JSON.stringify(refsAfterRebind), ok: !!refsAfterRebind && refsAfterRebind.mainComponent === leadingKey };
  if (FAIL_AT === 'afterRebind') throw new Error('테스트용 중간 실패');
  if (placement.mode !== 'autoLayout') { clone.x = placement.x; clone.y = placement.y; mutationCount++; }
  clone.fills = [boundPaint(COLORS.bg)]; mutationCount++;
  const lbl = kids(clone).find(c => c.type === 'TEXT');
  assert(!!lbl, 'clone 에서 라벨을 찾지 못했다');
  lbl.fills = [boundPaint(COLORS.label)]; mutationCount++;
  lbl.characters = NEW_LABEL; mutationCount++;
  const lead = kids(clone).find(c => c.name === 'leading');
  assert(!!lead && lead.type === 'INSTANCE', 'clone 에서 leading 인스턴스를 찾지 못했다');
  lead.visible = true; mutationCount++;
  const g = kids(lead).find(c => c.name === 'glyph') || kids(lead)[0];
  assert(!!g, 'leading 안에서 Dot glyph 를 찾지 못했다');
  g.fills = [boundPaint(COLORS.dot)]; mutationCount++;
  /* 세트가 auto layout 이 아니면 새 variant 가 세트 밖으로 나가지 않게 넓힌다 */
  if (placement.mode !== 'autoLayout') {
    const needW = Math.max(set.width, clone.x + clone.width + 16), needH = Math.max(set.height, clone.y + clone.height + 16);
    if (needW > set.width + 0.01 || needH > set.height + 0.01) { set.resizeWithoutConstraints(needW, needH); mutationCount++; notes.push('세트 크기 ' + size(set) + ' 로 확장 (새 variant 자리)'); }
  }
} catch (e) { failure = e && e.message ? e.message : String(e); }

async function rollback(reason, readBack) {
  const steps = [];
  const node = cloneId ? await figma.getNodeByIdAsync(cloneId) : null;
  if (node) { try { node.remove(); steps.push('clone ' + cloneId + ' removed'); } catch (e) { steps.push('clone remove failed: ' + e.message); } }
  else steps.push(cloneId ? 'clone ' + cloneId + ' already gone' : 'clone 이 만들어지기 전에 실패');
  /* 새 variant 자리 때문에 세트를 넓혔다면 원래 크기로 (auto layout 세트는 스스로 맞춘다) */
  if (sg(set, 'layoutMode') === 'NONE' || !sg(set, 'layoutMode')) {
    if (!near(set.width, setWBefore, 0.01) || !near(set.height, setHBefore, 0.01)) {
      try { set.resizeWithoutConstraints(setWBefore, setHBefore); steps.push('set size restored ' + size(set)); } catch (e) { steps.push('set resize failed: ' + e.message); }
    }
  }
  /* 삭제 판정은 참조가 아니라 id 재조회로 */
  const cloneGone = cloneId ? (await figma.getNodeByIdAsync(cloneId)) === null : true;
  const after = await takeProtected();
  const instAfter = await chipInstanceSnapshots();
  const d = set.componentPropertyDefinitions || {};
  const optsNow = toneKey && d[toneKey] ? (d[toneKey].variantOptions || []) : [];
  const variantDiff = Object.keys(protectedBefore.variants).filter(k => JSON.stringify(protectedBefore.variants[k]) !== JSON.stringify(after.variants[k]));
  const instDiff = Object.keys(instancesBefore).filter(id => !instAfter[id] || JSON.stringify(instAfter[id]) !== JSON.stringify(instancesBefore[id]))
    .concat(Object.keys(instAfter).filter(id => !instancesBefore[id]));
  const cleanup = {
    cloneGone,
    noSyncVariant: !kids(set).some(c => c.name === NEW_VARIANT) && figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => c.name === NEW_VARIANT).length === 0,
    variantCount5: kids(set).length === 5 && kids(set).every(c => variants.some(v => v.id === c.id)),
    toneOptionsRestored: optsNow.slice().sort().join(',') === EXPECTED_TONES.slice().sort().join(','),
    existingVariantsUnchanged: variantDiff.length === 0,
    chipInstancesUnchanged: instDiff.length === 0,
    iconDotUnchanged: JSON.stringify(protectedBefore.iconDot) === JSON.stringify(after.iconDot),
    mainFrameUnchanged: JSON.stringify(protectedBefore.mainFrame) === JSON.stringify(after.mainFrame),
    leadingDefinitionUnchanged: protectedBefore.leadingDef === after.leadingDef,
    setSizeRestored: size(set) === setSizeBefore,
    noStrayOnPage: set.parent ? kids(set.parent).length === pageTopBefore : true
  };
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackSteps: steps,
    rollbackClean: Object.keys(cleanup).every(k => cleanup[k] === true), cleanup,
    readBack: readBack || null, rebind, variantDiff, chipInstanceDiff: instDiff.slice(0, 20), setSize: size(set), setSizeBefore, errorCount: 1 });
}
if (failure) return await rollback(failure, null);

/* ======== 3. 되읽기 ======== */
const c = {};
const d2 = set.componentPropertyDefinitions || {};
const toneKey2 = Object.keys(d2).find(k => d2[k].type === 'VARIANT' && /^tone/.test(k));
const opts2 = toneKey2 ? (d2[toneKey2].variantOptions || []) : [];
c.variantCount6 = kids(set).filter(x => x.type === 'COMPONENT').length === 6 && kids(set).length === 6;
c.toneOptionsIncludeSync = opts2.length === 6 && opts2.indexOf('sync') >= 0 && EXPECTED_TONES.every(t => opts2.indexOf(t) >= 0);
c.propertyKeysUnchanged = Object.keys(d2).sort().join(',') === propKeysBefore.join(',');
c.propertiesExactlyLeadingAndTone = Object.keys(d2).length === 2 && !!d2[LEADING_KEY_EXPECTED] && d2[LEADING_KEY_EXPECTED].type === 'INSTANCE_SWAP' && !!toneKey2;
const lead2 = kids(clone).find(x => x.name === 'leading');
const lbl2 = kids(clone).find(x => x.type === 'TEXT');
const g2 = lead2 ? (kids(lead2).find(x => x.name === 'glyph') || kids(lead2)[0]) : null;
const lmc2 = lead2 ? await mainCompOf(lead2) : null;
const isBound = (n, name) => { const ps = visiblePaints(n && n.fills); return ps.length === 1 && boundColorId(ps[0]) === V[name].id; };
c.newVariantNamed = clone.name === NEW_VARIANT && clone.parent && clone.parent.id === set.id && clone.type === 'COMPONENT';
c.newVariantHeight24 = near(clone.height, 24);
c.newVariantLayoutFromSource = clone.layoutMode === src.layoutMode && clone.itemSpacing === src.itemSpacing &&
  clone.paddingTop === src.paddingTop && clone.paddingRight === src.paddingRight && clone.paddingBottom === src.paddingBottom && clone.paddingLeft === src.paddingLeft &&
  layoutBindings(clone) === layoutBindings(src);
c.newVariantBgSurfaceSubtle = isBound(clone, COLORS.bg);
c.newVariantLabelSuccessStrong = isBound(lbl2, COLORS.label) && lbl2.characters === NEW_LABEL && lbl2.textStyleId === srcLabel.textStyleId;
/* leading — 하나로 묶지 않는다 */
const refs2 = lead2 ? sg(lead2, 'componentPropertyReferences') : null;
const L = {};
L.leadingIsInstance = !!lead2 && lead2.type === 'INSTANCE';
L.leadingVisible = !!lead2 && lead2.visible === true;
L.leadingMainIconDot = !!lmc2 && lmc2.id === IDS.iconDot;
L.leadingSize16 = !!lead2 && near(lead2.width, 16) && near(lead2.height, 16);
L.leadingPropertyRefCorrect = !!refs2 && typeof refs2 === 'object' && refs2.mainComponent === LEADING_KEY_EXPECTED;
L.leadingIndex0 = !!lead2 && kids(clone).indexOf(lead2) === 0;
L.glyphVisible = !!g2 && g2.visible !== false;
L.glyphSize8 = !!g2 && near(g2.width, 8) && near(g2.height, 8);
L.glyphColorSuccessStrong = isBound(g2, COLORS.dot);
Object.assign(c, L);
c.allLeadingChecks = Object.keys(L).every(k => L[k] === true);
const leadingDetail = lead2 ? { id: lead2.id, type: lead2.type, visible: lead2.visible, main: lmc2 ? lmc2.name + ' (' + lmc2.id + ')' : null, size: size(lead2),
  index: kids(clone).indexOf(lead2), componentPropertyReferences: refs2, glyph: g2 ? { id: g2.id, visible: g2.visible, size: size(g2) } : null } : null;
c.newVariantWidthIsHug = !!lead2 && !!lbl2 && near(clone.width, clone.paddingLeft + clone.paddingRight + lead2.width + clone.itemSpacing + lbl2.width, 0.05);
c.newVariantPadding4848Gap4 = clone.paddingTop === 4 && clone.paddingRight === 8 && clone.paddingBottom === 4 && clone.paddingLeft === 8 && clone.itemSpacing === 4;
const after = await takeProtected();
c.existingVariantsUnchanged = Object.keys(protectedBefore.variants).every(k => JSON.stringify(protectedBefore.variants[k]) === JSON.stringify(after.variants[k]));
c.leadingDefinitionUnchanged = protectedBefore.leadingDef === after.leadingDef;
c.iconDotUnchanged = JSON.stringify(protectedBefore.iconDot) === JSON.stringify(after.iconDot);
c.mainFrameUnchanged = JSON.stringify(protectedBefore.mainFrame) === JSON.stringify(after.mainFrame);
c.backupsUnchanged = BACKUP_COPY_IDS.every(id => JSON.stringify(protectedBefore.backups[id]) === JSON.stringify(after.backups[id]));
const instancesAfter = await chipInstanceSnapshots();
const instDiff = Object.keys(instancesBefore).filter(id => !instancesAfter[id] || JSON.stringify(instancesAfter[id]) !== JSON.stringify(instancesBefore[id]));
const instAdded = Object.keys(instancesAfter).filter(id => !instancesBefore[id]);
c.existingChipInstancesUnchanged = instDiff.length === 0 && instAdded.length === 0;
c.noStrayComponents = figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(x => x.name === NEW_VARIANT).length === 1 &&
  (set.parent ? kids(set.parent).length === pageTopBefore : true);

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '), { checks: c, leadingDetail });

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
    newVariantId: clone.id, sourceVariantId: src.id, toneKey: toneKey2, leadingKey,
    variantIds: variants.map(v => ({ name: v.name, id: v.id })),
    protectedAfter: { variants: after.variants, iconDot: after.iconDot, mainFrame: after.mainFrame, backups: after.backups, leadingDef: after.leadingDef },
    newVariantSnapshot: snapshot(clone), chipInstances: instancesAfter, pageTop: set.parent ? kids(set.parent).length : null
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: true, failedCriteria: [], checks: c,
  created: { id: clone.id, name: clone.name, size: size(clone), pos: r2(clone.x) + ',' + r2(clone.y),
    padding: [clone.paddingTop, clone.paddingRight, clone.paddingBottom, clone.paddingLeft], gap: clone.itemSpacing,
    label: lbl2.characters + ' ' + r2(lbl2.width), leading: (lmc2 ? lmc2.name : null) + ' ' + size(lead2) + ' visible ' + lead2.visible },
  leadingDetail, rebind,
  toneOptions: opts2, propertyKeys: Object.keys(d2), chipSetSize: size(set), chipInstancesChecked: Object.keys(instancesBefore).length,
  mutationCount, notes, errorCount: errors.length, errors
});
