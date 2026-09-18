/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 30b
 * Phase G1-B 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 보호 대상은 30 APPLY 가 성공 직후 남긴 기준값(joob.G1B.baseline)과 비교한다.
 * snapshot 함수 · mask 는 30 과 같은 것을 쓴다.
 * 기하 값(크기 · 여유 폭 · 중심 · 간격)은 기준값에 기대지 않고 지금 다시 잰다.
 * ========================================================================== */

const SCRIPT_VERSION = '30b-G1B-v1-viewtoggle-replace-verify';

const IDS = {
  mainFrame: '1002:2', toolbar: '1003:1695', filterGroup: '1003:1703', margin: '1003:1734', legacy: '1003:1735',
  set: '1105:664', variantTable: '1105:650', variantCard: '1105:657', iconTable: '1105:646', iconCard: '1105:648'
};
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const ICON_LIBRARY_IDS = ['1048:784', '1048:786', '1048:788', '1048:790', '1048:792', '1048:794', '1048:796', '1048:798', '1048:800',
  '1048:802', '1048:804', '1048:806', '1048:808', '1048:810', '1048:812', '1048:814', '1048:816'];
const EXPECT = { toolbar: [976, 60], margin: [56, 36], group: [698, 36], toggle: [52, 36], freeSpace: 14, gap: 12 };
const BASELINE_KEY = 'joob.G1B.baseline';

/* ======== 공통 (30 과 동일) ======== */
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
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
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

/* ======== 기준값 · 노드 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { baseline = null; }
if (!baseline) errors.push('30 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 30 을 실행한 것과 같은 Scripter 에서 실행했는지 확인');
else if (baseline.scriptVersion !== '30-G1B-v1-viewtoggle-replace') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);

const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
const inst = baseline && baseline.instanceId ? await figma.getNodeByIdAsync(baseline.instanceId) : null;
const mg = N.margin, fg = N.filterGroup, tb = N.toolbar;
const c = {};

/* ======== 1. 새 인스턴스 ======== */
c.newViewToggleInstanceFound = !!inst && inst.type === 'INSTANCE' && inst.parent && inst.parent.id === IDS.margin && inst.visible !== false;
const mc = inst ? await inst.getMainComponentAsync() : null;
c.instanceUsesViewCard = !!mc && mc.id === IDS.variantCard && mc.name === 'view=card' && mc.parent && mc.parent.id === IDS.set;
c.instanceSize52x36 = !!inst && near(inst.width, EXPECT.toggle[0]) && near(inst.height, EXPECT.toggle[1]);
c.instanceIsOnlyFlowChildOfMargin = !!mg && flow(mg).length === 1 && !!inst && flow(mg)[0].id === inst.id;

/* ======== 2. 원본 ======== */
c.legacyToggleStillExists = !!N.legacy && !N.legacy.removed && N.legacy.parent && N.legacy.parent.id === IDS.margin;
c.legacyToggleHidden = !!N.legacy && N.legacy.visible === false;

/* ======== 3. layout ======== */
c.marginPreserved = !!mg && mg.parent && mg.parent.id === IDS.filterGroup && mg.visible !== false &&
  near(mg.width, EXPECT.margin[0]) && near(mg.height, EXPECT.margin[1]) && kids(mg).length === 2;
let marginPropsSame = null;
if (baseline && baseline.marginPropsAfter && mg) {
  const p = pads(mg);
  const now = JSON.stringify({ name: mg.name, parent: mg.parent ? mg.parent.id : null, index: mg.parent ? kids(mg.parent).indexOf(mg) : null, visible: mg.visible,
    layoutMode: sg(mg, 'layoutMode'), sizingH: sg(mg, 'layoutSizingHorizontal'), sizingV: sg(mg, 'layoutSizingVertical'), p,
    gap: sg(mg, 'itemSpacing'), pa: sg(mg, 'primaryAxisAlignItems'), ca: sg(mg, 'counterAxisAlignItems'), x: r2(mg.x),
    fills: visiblePaints(mg.fills).length, effects: visiblePaints(mg.effects || []).length, clips: sg(mg, 'clipsContent') });
  marginPropsSame = now === baseline.marginPropsAfter;
}
c.marginPreserved = c.marginPreserved && marginPropsSame === true;

c.toolbarSizeUnchanged = !!tb && near(tb.width, EXPECT.toolbar[0]) && near(tb.height, EXPECT.toolbar[1]);
const tbPad = tb ? pads(tb) : { l: 0, r: 0 };
const fgPad = fg ? pads(fg) : { r: 0 };
c.filterGroupNoOverflow = !!fg && near(fg.width, EXPECT.group[0]) && near(fg.height, EXPECT.group[1]) &&
  fg.x >= tbPad.l - 0.01 && fg.x + fg.width <= tb.width - tbPad.r + 0.01 &&
  flow(fg).every(x => x.x >= -0.01 && x.x + x.width <= fg.width - fgPad.r + 0.01 && x.y >= -0.01 && x.y + x.height <= fg.height + 0.01);
const tbFlow = tb ? flow(tb) : [];
const freeSpace = tb ? r2(tb.width - tbPad.l - tbPad.r - tbFlow.reduce((a, x) => a + x.width, 0) -
  (sg(tb, 'primaryAxisAlignItems') === 'SPACE_BETWEEN' ? 0 : (sg(tb, 'itemSpacing') || 0) * Math.max(0, tbFlow.length - 1))) : null;
c.freeSpaceValid = near(freeSpace, EXPECT.freeSpace, 0.01) && freeSpace >= 0;
const centerY = inst && tb ? r2(inst.absoluteTransform[1][2] - tb.absoluteTransform[1][2] + inst.height / 2) : null;
c.verticalCenterCorrect = !!tb && near(centerY, tb.height / 2, 0.01);
const fgFlow = fg ? flow(fg) : [];
const mIdx = fgFlow.findIndex(x => x.id === IDS.margin);
const prev = mIdx > 0 ? fgFlow[mIdx - 1] : null;
const prevRight = prev ? prev.x + Math.max.apply(null, [0].concat(flow(prev).map(x => x.x + x.width))) : null;
const gap = prev && inst ? r2(mg.x + inst.x - prevRight) : null;
c.resetToggleGapPreserved = near(gap, EXPECT.gap, 0.01);

/* ======== 4. 보호 대상 ======== */
const MASK = { [IDS.margin]: ['width', 'height', 'y'], [IDS.filterGroup]: ['x', 'width'] };
const now = {
  'mainFrame(masked)': snapshot(N.mainFrame, MASK, [IDS.margin]),
  'legacyToggle(visible/x/y masked)': snapshot(N.legacy, { [IDS.legacy]: ['visible', 'x', 'y'] }),
  'set 1105:664': snapshot(N.set), 'icon 1105:646': snapshot(N.iconTable), 'icon 1105:648': snapshot(N.iconCard)
};
for (const id of BACKUP_COPY_IDS) now['backup ' + id] = snapshot(await figma.getNodeByIdAsync(id));
for (const id of ICON_LIBRARY_IDS) now['icon ' + id] = snapshot(await figma.getNodeByIdAsync(id));
const bp = baseline && baseline.protectedAfter ? baseline.protectedAfter : null;
const same = k => !!bp && !!bp[k] && JSON.stringify(bp[k]) === JSON.stringify(now[k]);
const protectedDiff = bp ? Object.keys(now).filter(k => !same(k)) : ['(기준값 없음)'];
c.componentMastersUnchanged = same('set 1105:664') && same('icon 1105:646') && same('icon 1105:648');
c.backupsUnchanged = BACKUP_COPY_IDS.every(id => same('backup ' + id));
c.protectedNodesUnchanged = protectedDiff.length === 0;

/* ======== 5. stray ======== */
await figma.loadAllPagesAsync();
const toggleInstances = [];
for (const x of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
  let m = null; try { m = await x.getMainComponentAsync(); } catch (e) { m = null; }
  if (m && (m.id === IDS.variantCard || m.id === IDS.variantTable)) toggleInstances.push({ id: x.id, variant: m.name, parent: x.parent ? x.parent.id : null, visible: x.visible !== false });
}
c.noStrayInstances = toggleInstances.length === 1 && !!inst && toggleInstances[0].id === inst.id && toggleInstances[0].parent === IDS.margin;

c.noErrors = errors.length === 0;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase G1-B CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: {
    instance: inst ? { id: inst.id, variant: mc ? mc.name : null, size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: kids(mg).indexOf(inst), visible: inst.visible } : null,
    legacy: N.legacy ? { id: N.legacy.id, visible: N.legacy.visible, index: kids(mg).indexOf(N.legacy) } : null,
    margin: mg ? { size: size(mg), pos: r2(mg.x) + ',' + r2(mg.y), propsSameAsApply: marginPropsSame } : null,
    filterGroup: fg ? { size: size(fg), pos: r2(fg.x) + ',' + r2(fg.y) } : null,
    toolbar: tb ? { size: size(tb), freeSpace } : null,
    toggleCenterY: centerY, toolbarCenterY: tb ? r2(tb.height / 2) : null, resetToToggleGap: gap
  },
  applyExpect: baseline ? baseline.expect : null,
  protectedDiff, toggleInstances,
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at } : null,
  notes, errorCount: errors.length, errors
});
