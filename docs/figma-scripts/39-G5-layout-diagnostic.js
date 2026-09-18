/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 39
 * Phase G5 — layoutUnchanged 실패 원인 진단 (읽기 전용, full-precision)
 *
 * 중요한 한계(먼저 밝힌다)
 *   36-v2 APPLY 가 실패했을 때의 정확한 "삭제 직후, rollback 직전" 레이아웃 값은 **어디에도 저장돼 있지
 *   않다** — rollback() 이 실패 시 layoutBefore/layoutAfter 를 pluginData 에 안 남기기 때문에(성공했을 때만
 *   저장하도록 짜여 있었다), 이 스크립트가 그 순간을 되짚어 볼 수는 없다. 대신 이 스크립트가 하는 일:
 *     1) 지금(2차 rollback 이후, 정지 상태) 값을 **반올림 없이 최대 정밀도로** 낸다
 *     2) 사용자가 알려준 36-v1 DRY_RUN 최초 실측값(가장 오래되고 신뢰할 수 있는 기준점)과 필드 단위로 대조해
 *        지금도 벗어나 있는지 본다 — "그 순간의 오차"는 못 보지만 "지금도 어긋나 있는지"는 확실히 볼 수 있다
 *     3) 각 컨테이너의 freeW/freeH 를 만드는 재료(padding·gap·자식 폭/높이 전부)를 그대로 낸다 — 다음 APPLY
 *        시도에서 실패가 재현되면, 이 스크립트를 삭제 직전/rollback 직후 두 번 돌려서 진짜 delta 를 잡을 수 있다
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 * ========================================================================== */

const SCRIPT_VERSION = '39-G5-v1-layout-diagnostic';

const IDS = { mainFrame: '1002:2' };
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };
const NEVER_TOUCH = ['1009:703', '1009:709', '1002:506', '1003:1734', '1003:1728'];
/* 36-v1 DRY_RUN 최초 실측값 — 지금까지 유일하게 남아있는, 두 번의 rollback 이전 "원래" 기준점 */
const DRY_RUN_BASELINE = {
  main: { w: 1024, h: 1024, freeH: -67 },
  toolbar: { w: 976, h: 60, freeW: 53 },
  searchInput: { w: 240, h: 36, freeW: 2 },
  header: { w: 1024, h: 64 },
  aside: { w: 256, h: 1024 },
  kpiSection: { flowChildCount: 4 },
  grid: { flowChildCount: 12 }
};
const TOL = 0.5;

/* ======== 공통 ======== */
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function padsRaw(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }

/* hugSize 를 반올림 없이(raw) 계산 — r2() 를 어디서도 안 거친다 */
function hugSizeRaw(node, sizes) {
  const p = padsRaw(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const gap = sg(node, 'itemSpacing') || 0, sb = sg(node, 'primaryAxisAlignItems') === 'SPACE_BETWEEN';
  const sumW = sizes.reduce((a, z) => a + z.w, 0), sumH = sizes.reduce((a, z) => a + z.h, 0);
  const maxW = Math.max.apply(null, [0].concat(sizes.map(z => z.w))), maxH = Math.max.apply(null, [0].concat(sizes.map(z => z.h)));
  const gaps = sb ? 0 : gap * Math.max(0, sizes.length - 1);
  const cW = horizontal ? sumW + gaps : maxW, cH = horizontal ? maxH : sumH + gaps;
  return { neededW: p.l + p.r + cW, neededH: p.t + p.b + cH };
}

async function fullLayoutOf(id) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) return { id, missing: true };
  const sizingH = sg(node, 'layoutSizingHorizontal'), sizingV = sg(node, 'layoutSizingVertical');
  const f = flow(node);
  const children = f.map(c => ({ id: c.id, name: c.name, width: c.width, height: c.height }));
  const sizes = children.map(c => ({ w: c.width, h: c.height }));
  const p = padsRaw(node);
  const raw = hugSizeRaw(node, sizes);
  const freeWRaw = sizingH === 'FIXED' ? node.width - raw.neededW : null;
  const freeHRaw = sizingV === 'FIXED' ? node.height - raw.neededH : null;
  return {
    id, name: node.name,
    widthRaw: node.width, heightRaw: node.height, w: r2(node.width), h: r2(node.height),
    sizingH, sizingV,
    padding: p, itemSpacing: sg(node, 'itemSpacing') || 0, primaryAxisAlignItems: sg(node, 'primaryAxisAlignItems'),
    flowChildCount: f.length, children,
    neededWRaw: raw.neededW, neededHRaw: raw.neededH,
    freeWRaw, freeHRaw, freeW: r2(freeWRaw), freeH: r2(freeHRaw)
  };
}
function flowSnapshot(root) {
  const lines = [];
  (function w(n) {
    let fill = ''; try { fill = visiblePaints(n.fills).map(p => (p.type === 'SOLID' ? hex(p.color) : p.type)).join(','); } catch (e) { fill = '?'; }
    let extra = ''; try { if (n.type === 'TEXT') extra = n.characters; } catch (e) { extra = '?'; }
    lines.push([n.id, n.type, n.name, r2(n.width), r2(n.height), r2(n.x), r2(n.y), flow(n).length, fill, extra].join('|'));
    for (const c of flow(n)) w(c);
  })(root);
  return { nodeCount: lines.length, hash: hash(lines.join('\n')) };
}

/* ======== 0. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_DIAGNOSTIC', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

/* ======== 1. 컨테이너별 full-precision 진단 ======== */
const layoutFull = {};
for (const k of Object.keys(TRACKED_LAYOUT)) layoutFull[k] = await fullLayoutOf(TRACKED_LAYOUT[k]);

/* ======== 2. 요청하신 표 형식 — node/field/before/after/delta/tolerance/pass ======== */
const diagnosticRows = [];
for (const k of Object.keys(DRY_RUN_BASELINE)) {
  const exp = DRY_RUN_BASELINE[k], now = layoutFull[k];
  if (!now || now.missing) { diagnosticRows.push({ nodeKey: k, nodeId: TRACKED_LAYOUT[k], nodeName: null, field: '(전체)', before: null, after: null, delta: null, absDelta: null, tolerance: TOL, pass: false, note: '지금 못 찾음' }); continue; }
  const fieldMap = { w: now.w, h: now.h, freeW: now.freeW, freeH: now.freeH, flowChildCount: now.flowChildCount };
  for (const field of Object.keys(exp)) {
    const before = exp[field], after = fieldMap[field];
    const isNumeric = typeof before === 'number' && typeof after === 'number';
    const delta = isNumeric ? r2(after - before) : null;
    const absDelta = isNumeric ? Math.abs(delta) : (before === after ? 0 : null);
    const pass = field === 'flowChildCount' ? before === after : (isNumeric ? absDelta < TOL : false);
    diagnosticRows.push({ nodeKey: k, nodeId: now.id, nodeName: now.name, field, before, after, delta, absDelta, tolerance: field === 'flowChildCount' ? null : TOL, pass });
  }
}
diagnosticRows.sort((a, b) => (b.absDelta || 0) - (a.absDelta || 0));

/* ======== 3. refs — 현재 값 그대로(원래 DRY_RUN 보고에 refs 의 정확한 수치는 없었음 — visible 만 확인됨) ======== */
const refsNow = {};
for (const k of Object.keys(TRACKED_REFS)) {
  const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
  refsNow[k] = n ? { id: n.id, name: n.name, visible: n.visible !== false, widthRaw: n.width, heightRaw: n.height, xRaw: n.x, yRaw: n.y } : { id: TRACKED_REFS[k], missing: true };
}
const refsUnchangedNow = Object.keys(refsNow).every(k => !refsNow[k].missing && refsNow[k].visible);

/* ======== 4. flow snapshot — 지금 값(비교 대상인 "그 순간"은 저장 안 돼서 없음, 참고용) ======== */
const flowSnapshotNow = flowSnapshot(mainFrame);

/* ======== 5. 보호 대상 ======== */
const neverTouchNow = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchNow.push({ id, exists: !!n, visible: n ? n.visible !== false : null }); }
const protectedNodesOk = neverTouchNow.every(r => r.exists);

/* ======== 요약 ======== */
const failingRows = diagnosticRows.filter(r => !r.pass);
const summary = {
  totalFields: diagnosticRows.length, failingFields: failingRows.length,
  worstAbsDelta: diagnosticRows.length ? diagnosticRows[0].absDelta : null,
  worstField: diagnosticRows.length ? diagnosticRows[0].nodeKey + '.' + diagnosticRows[0].field : null,
  refsUnchangedNow, protectedNodesOk,
  flowSnapshotNow: { nodeCount: flowSnapshotNow.nodeCount, hash: flowSnapshotNow.hash, note: '비교 대상인 실패 시점 해시가 저장돼 있지 않아 지금 값만 참고용으로 낸다' },
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_DIAGNOSTIC',
  limitation: '36-v2 실패 시점의 정확한 before/after 는 저장되지 않았다 — 아래 표의 "before" 는 그 시점이 아니라 36-v1 DRY_RUN 최초 실측값이다. "지금도 어긋나 있는지"를 보는 진단이다.',
  summary,
  diagnosticRows,
  layoutFull,
  refsNow, neverTouchNow,
  errors
});
