/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 36
 * Phase G5 — exact allowlist 24개 legacy hidden 노드 삭제 (DRY_RUN 기본)
 *
 * 대상      35-G5-v2 audit 에서 SAFE_TO_DELETE 로 확인된 24개 **exact allowlist** 만.
 *           동적 hidden scan 결과를 추가 삭제 대상으로 절대 쓰지 않는다 — 이 파일 안의 ALLOWLIST 상수가 유일한 소스.
 *
 * 절대 삭제 금지  REVIEW_REQUIRED(1009:703 · 1009:709 · 1002:506) · KEEP wrapper(1003:1734 · 1003:1728) ·
 *               INSTANCE 내부 descendant 전부 · id 가 `I...;...` 인 nested node · Component/Component Set ·
 *               현재 visible replacement instance · backup(1044:47 · 1019:2). 이 파일은 이들의 id 를 전혀 참조하지
 *               않고, ALLOWLIST 와 겹치는지 정적으로 자체 점검한다(겹치면 preflight 에서 즉시 에러).
 *
 * preflight  24개 각각: exists · visible=false · mainFrame 서브트리 안 · insideInstance=false ·
 *            COMPONENT/COMPONENT_SET 아님 · 부모가 여전히 mainFrame 안에 있음 · (있다면) replacement instance 재확인.
 *            하나라도 어긋나면 blockers 에 쌓이고 APPLY 전체를 막는다(부분 삭제 없음).
 *
 * 안전장치   APPLY 직전에 mainFrame 전체를 clone 해 같은 페이지 안, 메인 프레임 밖(오른쪽으로 멀리)에
 *            "fresh backup"을 만든다(DRY_RUN 에서는 만들지 않음). 24개는 전부 hidden 이라 flow(시각적 auto-layout
 *            흐름)에 애초에 안 잡히므로, 삭제 전후 **flow 만 훑은 스냅샷 해시가 완전히 같아야** 한다 — 조금이라도
 *            다르면 hidden 이 아닌 다른 무언가가 바뀐 것이라 즉시 실패 처리. 추가로 사용자가 지정한 이름 있는
 *            참조(Main·Toolbar·Search Input·Header·Aside·KPI section·Grid·View Toggle·Bell·Sync Chip)도 따로 재측정.
 *
 * rollback   remove() 는 복원이 안 되므로, 삭제 전에 각 대상의 "mainFrame 루트부터의 자식 index 경로"를 기록해
 *            둔다. 검증 실패 시 fresh backup 안에서 같은 경로를 따라가 같은 위치의 노드를 clone 해 원래 부모의
 *            같은 index 에 다시 끼워 넣는다(새 id 로 재생성 — 완전한 원상복구는 아니지만 구조·시각은 복원됨).
 *            fresh backup 은 성공하든 실패하든 지우지 않고 남겨 사람이 나중에 대조할 수 있게 한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + 예측 + 레이아웃 기준값만. mutation 0, backup 생성 안 함.
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '36-G5-v1-legacy-cleanup-apply';

const IDS = { mainFrame: '1002:2' };

/* exact allowlist — 24개. 이 배열 밖의 어떤 id 도 삭제하지 않는다. */
const ALLOWLIST = [
  '1002:24', '1002:42', '1002:60', '1002:78',                                              // KPI legacy
  '1003:1697', '1003:1700', '1003:1705', '1003:1708', '1003:1711', '1003:1714',             // Toolbar legacy
  '1003:1717', '1003:1720', '1003:1723', '1003:1726', '1003:1729',
  '1003:1735',                                                                               // View Toggle legacy
  '1002:487', '1002:478',                                                                    // Header legacy (Bell, sync)
  '1002:512', '1002:517', '1002:522', '1002:527', '1002:537', '1002:542'                    // Nav legacy
];
const NEVER_TOUCH = ['1009:703', '1009:709', '1002:506', '1003:1734', '1003:1728'];

/* 이름 있는 보호 대상 — 삭제 전후 재측정 */
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };

const BASELINE_KEY = 'joob.36.G5.baseline';

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.01);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function walk(n, fn) { fn(n); for (const c of kids(n)) walk(c, fn); }
function countDescendants(n) { let c = 0; walk(n, (x) => { if (x !== n) c++; }); return c; }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }

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
  return { id, name: node.name, size: size(node), sizingH, sizingV, freeW, freeH, flowChildCount: f.length };
}
async function layoutBaselineAll() { const rows = {}; for (const k of Object.keys(TRACKED_LAYOUT)) rows[k] = await layoutOf(TRACKED_LAYOUT[k]); return rows; }
async function refsBaselineAll() {
  const rows = {};
  for (const k of Object.keys(TRACKED_REFS)) {
    const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
    rows[k] = n ? { id: n.id, name: n.name, visible: n.visible !== false, size: size(n), x: r2(n.x), y: r2(n.y) } : { id: TRACKED_REFS[k], missing: true };
  }
  return rows;
}

/* flow 만(=hidden 노드는 애초에 안 잡히는 시각적 흐름) 훑는 스냅샷 — 24개는 전부 hidden 이라 삭제 전후 완전히 같아야 한다 */
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

/* 인스턴스 내부 판정 (35-G5-v2 와 동일 로직) */
function nearestInstanceAncestor(n) {
  let x = n.parent;
  while (x && x.id !== IDS.mainFrame) { if (x.type === 'INSTANCE') return x; x = x.parent; }
  return null;
}
function idLooksNested(id) { return typeof id === 'string' && id.indexOf(';') >= 0; }

/* mainFrame 루트부터의 자식 index 경로 (rollback 시 backup 안에서 같은 경로를 다시 찾기 위함) */
function pathFromMainFrame(n) {
  const path = []; let x = n;
  while (x && x.id !== IDS.mainFrame) {
    const p = x.parent; if (!p) return null;
    const idx = p.children.indexOf(x); if (idx < 0) return null;
    path.unshift(idx); x = p;
  }
  return path;
}
function nodeAtPath(root, path) {
  let x = root;
  for (const idx of path) { if (!x || !x.children || !x.children[idx]) return null; x = x.children[idx]; }
  return x;
}

/* ======== 0. 정적 자체 점검 — allowlist 가 절대 건드리면 안 되는 목록과 겹치지 않는지 ======== */
const overlap = ALLOWLIST.filter(id => NEVER_TOUCH.indexOf(id) >= 0);
if (overlap.length) errors.push('ALLOWLIST 가 NEVER_TOUCH 와 겹친다 — 스크립트 버그: ' + overlap.join(','));
const dup = ALLOWLIST.filter((id, i) => ALLOWLIST.indexOf(id) !== i);
if (dup.length) errors.push('ALLOWLIST 에 중복 id 가 있다: ' + dup.join(','));

/* ======== 1. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

/* ======== 2. preflight — 24개 각각 ======== */
const blockers = [];
function gate(key, cond, why) { if (!cond) blockers.push(key + ' — ' + why); return !!cond; }

const preflightRows = [];
for (const id of ALLOWLIST) {
  const n = await figma.getNodeByIdAsync(id);
  const row = { id, exists: !!n };
  if (!n) { row.ok = false; blockers.push(id + ' — 문서에서 찾지 못했다(이미 삭제됐거나 id 가 바뀌었을 수 있다)'); preflightRows.push(row); continue; }
  const anc = nearestInstanceAncestor(n);
  row.visible = n.visible !== false;
  row.insideMainFrame = inside(n, IDS.mainFrame);
  row.insideInstance = !!anc || idLooksNested(n.id);
  row.isComponentDef = n.type === 'COMPONENT' || n.type === 'COMPONENT_SET';
  row.parent = n.parent ? { id: n.parent.id, name: n.parent.name } : null;
  row.parentInsideMainFrame = n.parent ? inside(n.parent, IDS.mainFrame) : false;
  const sibs = n.parent ? kids(n.parent).filter(c => c.id !== n.id && c.visible !== false && c.type === 'INSTANCE') : [];
  const replacement = sibs.find(c => Math.abs(c.height - n.height) < 4 && Math.abs(c.width - n.width) < Math.max(20, n.width * 0.3));
  row.replacementCheck = replacement ? { found: true, id: replacement.id, name: replacement.name } : { found: false };
  row.name = n.name; row.type = n.type; row.size = size(n);
  row.deletionScopeDescendantCount = countDescendants(n);

  gate(id + ':exists', true, '');
  gate(id + ':visible=false', row.visible === false, '지금 visible=true 다 — 삭제 대상이 아닐 수 있다');
  gate(id + ':insideMainFrame', row.insideMainFrame, IDS.mainFrame + ' 서브트리 밖이다');
  gate(id + ':notInsideInstance', !row.insideInstance, '인스턴스 내부 descendant 로 보인다(parent chain 에 INSTANCE 또는 id 에 ";" 포함) — allowlist 에 잘못 들어간 것일 수 있다');
  gate(id + ':notComponentDef', !row.isComponentDef, 'COMPONENT/COMPONENT_SET 자신이다');
  gate(id + ':parentInsideMainFrame', row.parentInsideMainFrame, '부모가 ' + IDS.mainFrame + ' 밖에 있다(구조가 예상과 다름)');
  row.ok = row.visible === false && row.insideMainFrame && !row.insideInstance && !row.isComponentDef && row.parentInsideMainFrame;
  preflightRows.push(row);
}

/* ======== 3. 보호 대상(NEVER_TOUCH) 재확인 — allowlist 에 없고, 지금도 존재하는지만 ======== */
const neverTouchRows = [];
for (const id of NEVER_TOUCH) {
  const n = await figma.getNodeByIdAsync(id);
  const inAllowlist = ALLOWLIST.indexOf(id) >= 0;
  neverTouchRows.push({ id, exists: !!n, inAllowlist, ok: !!n && !inAllowlist });
  if (inAllowlist) errors.push('심각: 보호 대상 ' + id + ' 가 ALLOWLIST 에도 들어있다');
  if (!n) notes.push('보호 대상 ' + id + ' 를 지금 문서에서 찾지 못했다 — 참고만');
}
const reviewRequiredIds = ['1009:703', '1009:709', '1002:506'];
const keepWrapperIds = ['1003:1734', '1003:1728'];
const reviewRequiredUntouched = neverTouchRows.filter(r => reviewRequiredIds.indexOf(r.id) >= 0).every(r => r.ok);
const keepWrappersUntouched = neverTouchRows.filter(r => keepWrapperIds.indexOf(r.id) >= 0).every(r => r.ok);

/* ======== 4. 레이아웃 기준값 ======== */
const layoutBefore = await layoutBaselineAll();
const refsBefore = await refsBaselineAll();
const flowBefore = flowSnapshot(mainFrame);

const preflightPassed = blockers.length === 0 && errors.length === 0;
const foundCount = preflightRows.filter(r => r.exists).length;
const missingCount = ALLOWLIST.length - foundCount;
const wrongVisibility = preflightRows.filter(r => r.exists && r.visible !== false).length;
const insideInstanceBlocked = preflightRows.filter(r => r.exists && r.insideInstance).length;
const predictedDescendantCount = preflightRows.reduce((a, r) => a + (r.deletionScopeDescendantCount || 0), 0);

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers,
    exactAllowlistCount: ALLOWLIST.length, foundCount, missingCount, wrongVisibility, insideInstanceBlocked,
    protectedNodesConfirmed: neverTouchRows.filter(r => r.ok).length,
    reviewRequiredUntouched, keepWrappersUntouched,
    predictedDeletionRoots: preflightPassed ? ALLOWLIST.length : 0, predictedDescendantCount,
    preflightRows, neverTouchRows,
    layoutBaseline: { tracked: layoutBefore, refs: refsBefore, flowSnapshot: flowBefore },
    mutationCount, notes, errorCount: errors.length, errors
  });
}

/* ======== 5. APPLY ======== */
/* 5-0. 삭제 전 경로 기록 (rollback 용) */
const records = [];
for (const id of ALLOWLIST) {
  const n = await figma.getNodeByIdAsync(id);
  const path = pathFromMainFrame(n);
  records.push({ id, parentId: n.parent.id, path, indexInParent: path ? path[path.length - 1] : null });
}
const pathFailures = records.filter(r => !r.path);
if (pathFailures.length) return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: '경로 기록 실패: ' + pathFailures.map(r => r.id).join(','), mutationCount, errorCount: 1 });

/* 5-1. fresh backup — mainFrame 전체 clone, 페이지 안 mainFrame 오른쪽 멀리 */
let freshBackup = null, freshBackupId = null;
try {
  freshBackup = mainFrame.clone(); mutationCount++;
  freshBackup.name = '[G5 fresh backup] ' + SCRIPT_VERSION + ' ' + new Date().toISOString();
  freshBackup.x = mainFrame.x + mainFrame.width + 400; freshBackup.y = mainFrame.y;
  freshBackupId = freshBackup.id;
} catch (e) { return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: 'fresh backup 생성 실패: ' + e.message, mutationCount, errorCount: 1 }); }

/* 5-2. 삭제 */
const deletedRoots = []; let deleteFailure = null;
try {
  for (const rec of records) {
    const n = await figma.getNodeByIdAsync(rec.id);
    if (!n) { deleteFailure = rec.id + ' 를 삭제 직전에 다시 찾지 못했다'; break; }
    n.remove(); mutationCount++;
    deletedRoots.push(rec.id);
  }
} catch (e) { deleteFailure = e && e.message ? e.message : String(e); }

async function rollback(reason) {
  const restored = [];
  for (const rec of records) {
    if (deletedRoots.indexOf(rec.id) < 0) continue; // 실제로 삭제된 것만 복원 대상
    const backupEquivalent = nodeAtPath(freshBackup, rec.path);
    if (!backupEquivalent) { restored.push({ originalId: rec.id, ok: false, reason: 'backup 에서 같은 경로를 찾지 못함' }); continue; }
    try {
      const clone = backupEquivalent.clone(); mutationCount++;
      const parent = await figma.getNodeByIdAsync(rec.parentId);
      if (!parent) { restored.push({ originalId: rec.id, ok: false, reason: '원래 부모(' + rec.parentId + ')를 못 찾음' }); continue; }
      const insertIdx = Math.min(rec.indexInParent, parent.children.length);
      parent.insertChild(insertIdx, clone); mutationCount++;
      restored.push({ originalId: rec.id, restoredAsId: clone.id, parentId: rec.parentId, index: insertIdx, ok: true });
    } catch (e) { restored.push({ originalId: rec.id, ok: false, reason: e.message }); }
  }
  const rollbackClean = restored.every(r => r.ok) && restored.length === deletedRoots.length;
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackClean,
    restored, deletedRoots, freshBackupId, manualRecoveryNote: rollbackClean ? null : 'rollback 이 일부만 성공했다 — fresh backup(' + freshBackupId + ')에서 수동으로 대조/복구 필요. fresh backup 은 지우지 않았다.',
    mutationCount, errorCount: 1
  });
}
if (deleteFailure) return await rollback(deleteFailure);

/* ======== 6. 되읽기 ======== */
const c = {};
c.allTargetsDeleted = true;
for (const id of ALLOWLIST) { const n = await figma.getNodeByIdAsync(id); if (n) { c.allTargetsDeleted = false; break; } }

const flowAfter = flowSnapshot(mainFrame);
c.flowSnapshotUnchanged = flowBefore.hash === flowAfter.hash;

const layoutAfter = await layoutBaselineAll();
c.layoutUnchanged = Object.keys(TRACKED_LAYOUT).every(k => {
  const b = layoutBefore[k], a = layoutAfter[k];
  if (!b || !a || b.missing || a.missing) return false;
  return near(b.freeW, a.freeW, 0.02) && near(b.freeH, a.freeH, 0.02) && b.size === a.size;
});

const refsAfter = await refsBaselineAll();
c.trackedRefsUnchanged = Object.keys(TRACKED_REFS).every(k => JSON.stringify(refsBefore[k]) === JSON.stringify(refsAfter[k]));

const neverTouchAfter = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchAfter.push({ id, exists: !!n, visible: n ? n.visible !== false : null, size: n ? size(n) : null }); }
c.protectedNodesUntouched = NEVER_TOUCH.every((id, i) => {
  const before = neverTouchRows.find(r => r.id === id), after = neverTouchAfter[i];
  return before.exists === after.exists && (!before.exists || after.exists);
});
c.noErrors = errors.length === 0;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '));

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
    deletedRoots, freshBackupId, layoutBefore, layoutAfter, refsBefore, refsAfter,
    flowBefore, flowAfter
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: true, failedCriteria: [], checks: c, rolledBack: false,
  deletedRoots, deletedDescendantCount: predictedDescendantCount,
  backupCreated: true, freshBackupId,
  layoutBefore, layoutAfter, refsBefore, refsAfter,
  visibleReplacementChecks: preflightRows.map(r => ({ id: r.id, replacementCheck: r.replacementCheck })),
  protectedDiff: NEVER_TOUCH.filter((id, i) => neverTouchRows.find(r => r.id === id).exists !== neverTouchAfter[i].exists),
  mutationCount, notes, errorCount: errors.length, errors
});
