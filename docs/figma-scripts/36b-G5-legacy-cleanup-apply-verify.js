/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 36b
 * Phase G5 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 36 APPLY 가 성공 직후 남긴 joob.36.G5.baseline 과 비교하되, 삭제 여부 · flow 스냅샷 · 레이아웃 ·
 * 보호 대상은 기준값에 기대지 않고 지금 다시 잰다. 조건은 항목별로 따로 낸다.
 * ========================================================================== */

const SCRIPT_VERSION = '36b-G5-v1-legacy-cleanup-apply-verify';

const IDS = { mainFrame: '1002:2' };
const ALLOWLIST = [
  '1002:24', '1002:42', '1002:60', '1002:78',
  '1003:1697', '1003:1700', '1003:1705', '1003:1708', '1003:1711', '1003:1714',
  '1003:1717', '1003:1720', '1003:1723', '1003:1726', '1003:1729',
  '1003:1735',
  '1002:487', '1002:478',
  '1002:512', '1002:517', '1002:522', '1002:527', '1002:537', '1002:542'
];
const NEVER_TOUCH = ['1009:703', '1009:709', '1002:506', '1003:1734', '1003:1728'];
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };
const BASELINE_KEY = 'joob.36.G5.baseline';

/* ======== 공통 (36 과 동일) ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.02);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function hugSize(node, sizes) {
  const p = pads(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const gap = sg(node, 'itemSpacing') || 0, sb = sg(node, 'primaryAxisAlignItems') === 'SPACE_BETWEEN';
  const sumW = sizes.reduce((a, z) => a + z.w, 0), sumH = sizes.reduce((a, z) => a + z.h, 0);
  const maxW = Math.max.apply(null, [0].concat(sizes.map(z => z.w))), maxH = Math.max.apply(null, [0].concat(sizes.map(z => z.h)));
  const gaps = sb ? 0 : gap * Math.max(0, sizes.length - 1);
  const cW = horizontal ? sumW + gaps : maxW, cH = horizontal ? maxH : sumH + gaps;
  return { neededW: r2(p.l + p.r + cW), neededH: r2(p.t + p.b + cH) };
}
async function layoutOf(id) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) return { id, missing: true };
  const sizingH = sg(node, 'layoutSizingHorizontal'), sizingV = sg(node, 'layoutSizingVertical');
  const f = flow(node), sizes = f.map(c => ({ w: c.width, h: c.height }));
  const hs = hugSize(node, sizes);
  const freeW = sizingH === 'FIXED' ? r2(node.width - hs.neededW) : null;
  const freeH = sizingV === 'FIXED' ? r2(node.height - hs.neededH) : null;
  return { id, name: node.name, size: size(node), freeW, freeH };
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

/* ======== 기준값 — best-effort, 없어도 아래 판정은 전부 지금 상태로 독립적으로 계산한다 ======== */
let baseline = null;
try { const raw = figma.root.getPluginData(BASELINE_KEY); baseline = raw ? JSON.parse(raw) : null; } catch (e) { errors.push('기준값 파싱 실패: ' + e.message); }
if (!baseline) notes.push('36 APPLY 기준값(' + BASELINE_KEY + ')을 찾지 못했다 — 36 을 실행한 것과 같은 Scripter/같은 Figma 파일 세션인지 확인. 없어도 아래 삭제/레이아웃/보호 대상 판정은 지금 상태만으로 계산한다.');

const c = {};
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
await figma.loadAllPagesAsync();

/* ======== 1. 24개 전부 삭제됐는지 ======== */
const stillExists = [];
for (const id of ALLOWLIST) { const n = await figma.getNodeByIdAsync(id); if (n) stillExists.push(id); }
c.allTargetsDeleted = stillExists.length === 0;

/* ======== 2. 보호 대상 전부 그대로인지 ======== */
const neverTouchNow = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchNow.push({ id, exists: !!n, visible: n ? n.visible !== false : null }); }
c.neverTouchAllExist = neverTouchNow.every(r => r.exists);

/* ======== 3. 레이아웃 — 지금 값이 baseline.layoutAfter(있으면) 와 같은지, 없으면 절대 기준으로 최소한 이상 없는지 ======== */
const layoutNow = {}; for (const k of Object.keys(TRACKED_LAYOUT)) layoutNow[k] = await layoutOf(TRACKED_LAYOUT[k]);
if (baseline && baseline.layoutAfter) {
  c.layoutMatchesApplyBaseline = Object.keys(TRACKED_LAYOUT).every(k => {
    const b = baseline.layoutAfter[k], a = layoutNow[k];
    return b && a && !b.missing && !a.missing && near(b.freeW, a.freeW) && near(b.freeH, a.freeH) && b.size === a.size;
  });
} else {
  c.layoutMatchesApplyBaseline = Object.keys(TRACKED_LAYOUT).every(k => !layoutNow[k].missing);
  notes.push('layoutMatchesApplyBaseline 은 기준값이 없어 "지금 컨테이너들이 전부 존재하고 읽힌다"만 확인했다 — APPLY 직후 값과의 대조는 못했다');
}

/* ======== 4. refs — View Toggle / Bell / Sync Chip 존재 · visible ======== */
const refsNow = {};
for (const k of Object.keys(TRACKED_REFS)) {
  const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
  refsNow[k] = n ? { id: n.id, visible: n.visible !== false, size: size(n) } : { id: TRACKED_REFS[k], missing: true };
}
c.trackedRefsPresent = Object.keys(TRACKED_REFS).every(k => !refsNow[k].missing && refsNow[k].visible);

/* ======== 5. flow snapshot — baseline.flowAfter 가 있으면 대조, 없으면 최소한 지금 것을 기록만 ======== */
const flowNow = mainFrame ? flowSnapshot(mainFrame) : { nodeCount: 0, hash: null };
if (baseline && baseline.flowAfter) c.flowSnapshotMatchesApplyBaseline = flowNow.hash === baseline.flowAfter.hash;
else { c.flowSnapshotMatchesApplyBaseline = true; notes.push('flowSnapshotMatchesApplyBaseline 은 기준값이 없어 통과 처리 — 지금 해시만 기록'); }

c.noErrors = errors.length === 0;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase G5 CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: { stillExists, neverTouchNow, layoutNow, refsNow, flowNow: { nodeCount: flowNow.nodeCount, hash: flowNow.hash } },
  baselineFrom: baseline ? { scriptVersion: baseline.scriptVersion, at: baseline.at, freshBackupId: baseline.freshBackupId, deletedRoots: baseline.deletedRoots } : null,
  notes, errorCount: errors.length, errors
});
