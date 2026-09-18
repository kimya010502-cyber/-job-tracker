/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 36 v4
 * Phase G5 — exact allowlist 24개 legacy hidden 노드 삭제 (DRY_RUN 기본)
 *
 * v3 대비 변경점 (v1·v2·v3 는 보존, 이 파일은 별도)
 *   v3 의 `failureDiagnostics` 로 드디어 실제 실패 원인을 봤다 — 그런데 **실제 레이아웃 변화는 전혀 없었다**:
 *   `allTargetsDeleted` · `flowSnapshotUnchanged` · `trackedRefsUnchanged` · `protectedNodesUntouched` ·
 *   `noErrors` 전부 true, `layoutBefore`/`layoutAfter` 의 모든 실제 숫자도 동일. `layoutUnchanged=false` 의
 *   유일한 원인은 **비교 버그**였다: `main.freeW` · `toolbar.freeH` · `kpiSection.freeW/freeH` ·
 *   `grid.freeW/freeH` 6개가 전부 `null → null`(그 컨테이너가 해당 축에서 `FIXED` 가 아니라 애초에 freeW/H 가
 *   "해당 없음"인 경우)인데, `near(null, null)` 이 `typeof` 체크에서 걸려 무조건 false 를 반환해 "달라졌다"로
 *   오판했다. **tolerance 도 settle() 도 원인이 아니었다** — 그래서 둘 다 이번에 손대지 않는다.
 *
 *   v4 변경은 비교 로직 하나만:
 *     - `before === null && after === null` → `pass = true` (둘 다 "해당 없음"이면 같은 것)
 *     - 둘 중 하나만 `null` → `pass = false` (진짜 의미 있는 차이)
 *     - 둘 다 숫자 → 기존 `near(a, b, 0.5)` 그대로
 *     - `flowChildCount` 는 원래부터 정수 exact compare, 그대로 유지
 *   그리고 `c.layoutUnchanged` 와 `failureDiagnostics.fieldDiagnostics` 가 **같은 함수 결과에서 나오도록**
 *   구조를 바꿨다 — 되읽기 판정과 진단표가 서로 다른 비교 로직을 따로 구현하다가 하나만 고치고 하나는 안
 *   고치는 식으로 다시 어긋나는 걸 원천적으로 막는다(이번 버그도 정확히 그런 종류의 불일치였다).
 *
 *   그 외(ALLOWLIST 는 36-v3 rollback 이후 실제 id(네 번째 세대, `1137:xxxx`)로 교체, EXPECTED_GROUP 갱신,
 *   preflight 구조, fresh backup + path 기반 rollback, flow snapshot, `settle()`, 0.5px tolerance)는 v3 와
 *   전부 동일. **기존 fresh backup(`1133:644`, `1135:1535`, `1137:2426`)은 이 스크립트가 전혀 참조하지 않는다.**
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + 예측 + 레이아웃 기준값만. mutation 0, backup 생성 안 함.
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '36-G5-v4-legacy-cleanup-apply';

const IDS = { mainFrame: '1002:2' };

/* exact allowlist — 36-v3 rollback 이후 실제 id(네 번째 세대). 이 배열 밖의 어떤 id 도 삭제하지 않는다. */
const ALLOWLIST = [
  '1137:3190', '1137:3204', '1137:3218', '1137:3232',                                           // KPI legacy
  '1137:3243', '1137:3246', '1137:3248', '1137:3251', '1137:3253', '1137:3256',                  // Toolbar legacy
  '1137:3258', '1137:3261', '1137:3263', '1137:3266', '1137:3268',
  '1137:3273',                                                                                   // View Toggle legacy
  '1137:3280', '1137:3283',                                                                      // Header legacy (Bell, sync)
  '1137:3287', '1137:3292', '1137:3297', '1137:3302', '1137:3307', '1137:3312'                   // Nav legacy
];
const NEVER_TOUCH = ['1009:703', '1009:709', '1002:506', '1003:1734', '1003:1728'];
/* 각 대상이 원래 속했던 그룹 컨테이너 — 정확한 직속 부모가 아니라 그 서브트리 안인지만 확인 */
const EXPECTED_GROUP = {
  '1137:3190': '1002:23', '1137:3204': '1002:23', '1137:3218': '1002:23', '1137:3232': '1002:23',
  '1137:3243': '1003:1695', '1137:3246': '1003:1695', '1137:3248': '1003:1695', '1137:3251': '1003:1695',
  '1137:3253': '1003:1695', '1137:3256': '1003:1695', '1137:3258': '1003:1695', '1137:3261': '1003:1695',
  '1137:3263': '1003:1695', '1137:3266': '1003:1695', '1137:3268': '1003:1695',
  '1137:3273': '1003:1695',
  '1137:3280': '1002:469', '1137:3283': '1002:469',
  '1137:3287': '1002:492', '1137:3292': '1002:492', '1137:3297': '1002:492', '1137:3302': '1002:492',
  '1137:3307': '1002:492', '1137:3312': '1002:492'
};

/* 이름 있는 보호 대상 — 삭제 전후 재측정 */
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };

const BASELINE_KEY = 'joob.36.G5.baseline.v4';
const TOL = 0.5; // v1(0.02) 폐기 후 v2 에서 이미 프로젝트 표준으로 맞춤 — 이번에도 더 늘리지 않는다

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : TOL);
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

/* 삭제 루프 직후 한 번만 — 이벤트 루프를 한 tick 흘려보내 Figma 쪽에 남아있을 수 있는 pending 레이아웃
   재계산이 있다면 흘려보낼 기회를 준다. 임의로 긴 delay 를 넣지 않는다(0ms — 매크로태스크 경계만 넘김). */
async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)); }

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
  return { id, name: node.name, size: size(node), w: r2(node.width), h: r2(node.height), freeW, freeH, flowChildCount: f.length };
}
async function layoutBaselineAll() { const rows = {}; for (const k of Object.keys(TRACKED_LAYOUT)) rows[k] = await layoutOf(TRACKED_LAYOUT[k]); return rows; }
async function refsBaselineAll() {
  const rows = {};
  for (const k of Object.keys(TRACKED_REFS)) {
    const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
    rows[k] = n ? { id: n.id, name: n.name, visible: n.visible !== false, w: r2(n.width), h: r2(n.height), x: r2(n.x), y: r2(n.y) } : { id: TRACKED_REFS[k], missing: true };
  }
  return rows;
}
function refsMatch(before, after) {
  if (!before || !after) return false;
  if (!!before.missing || !!after.missing) return before.missing === after.missing;
  return before.visible === after.visible && near(before.w, after.w) && near(before.h, after.h) && near(before.x, after.x) && near(before.y, after.y);
}

/* 필드 하나 평가 — null 을 "값 없음"이 아니라 "다르다"로 잘못 판정하던 v1~v3 의 버그를 여기서 고친다.
   null/null(둘 다 해당 축이 FIXED 가 아니라서 freeW/H 가 원래 "해당 없음") 은 같은 것으로 본다. */
function evalField(field, bv, av) {
  if (field === 'flowChildCount') {
    const pass = bv === av;
    return { delta: (typeof bv === 'number' && typeof av === 'number') ? r2(av - bv) : null, absDelta: pass ? 0 : null, tolerance: null, pass };
  }
  const bothNull = bv === null && av === null;
  const oneNull = (bv === null) !== (av === null);
  if (bothNull) return { delta: 0, absDelta: 0, tolerance: TOL, pass: true };
  if (oneNull) return { delta: null, absDelta: null, tolerance: TOL, pass: false };
  const isNum = typeof bv === 'number' && typeof av === 'number';
  const delta = isNum ? r2(av - bv) : null;
  const absDelta = isNum ? Math.abs(delta) : null;
  return { delta, absDelta, tolerance: TOL, pass: isNum ? absDelta < TOL : false };
}

/* 필드 단위 진단표 — 매번(성공이든 실패든) 계산하고, layoutUnchanged 판정도 이 표에서 그대로 뽑는다.
   판정 로직과 진단표 로직이 따로 놀다가 하나만 고쳐지는 걸 막기 위함(이번 버그가 정확히 그런 종류였다). */
function fieldDiagnostics(beforeAll, afterAll) {
  const rows = [];
  for (const k of Object.keys(TRACKED_LAYOUT)) {
    const b = beforeAll[k], a = afterAll[k];
    if (!b || !a || b.missing || a.missing) { rows.push({ nodeKey: k, nodeId: TRACKED_LAYOUT[k], nodeName: null, field: '(전체)', before: null, after: null, delta: null, absDelta: null, tolerance: TOL, pass: false, note: '지금 못 찾음' }); continue; }
    for (const field of ['w', 'h', 'freeW', 'freeH', 'flowChildCount']) {
      const bv = b[field], av = a[field];
      const ev = evalField(field, bv, av);
      rows.push({ nodeKey: k, nodeId: b.id, nodeName: b.name, field, before: bv, after: av, delta: ev.delta, absDelta: ev.absDelta, tolerance: ev.tolerance, pass: ev.pass });
    }
  }
  rows.sort((x, y) => (y.absDelta || 0) - (x.absDelta || 0));
  return rows;
}

/* flow 만(=hidden 노드는 애초에 안 잡히는 시각적 흐름) 훑는 스냅샷 */
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

/* 인스턴스 내부 판정 */
function nearestInstanceAncestor(n) {
  let x = n.parent;
  while (x && x.id !== IDS.mainFrame) { if (x.type === 'INSTANCE') return x; x = x.parent; }
  return null;
}
function idLooksNested(id) { return typeof id === 'string' && id.indexOf(';') >= 0; }

/* mainFrame 루트부터의 자식 index 경로 */
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

/* ======== 0. 정적 자체 점검 ======== */
const overlap = ALLOWLIST.filter(id => NEVER_TOUCH.indexOf(id) >= 0);
if (overlap.length) errors.push('ALLOWLIST 가 NEVER_TOUCH 와 겹친다 — 스크립트 버그: ' + overlap.join(','));
const dup = ALLOWLIST.filter((id, i) => ALLOWLIST.indexOf(id) !== i);
if (dup.length) errors.push('ALLOWLIST 에 중복 id 가 있다: ' + dup.join(','));
const missingGroup = ALLOWLIST.filter(id => !EXPECTED_GROUP[id]);
if (missingGroup.length) errors.push('EXPECTED_GROUP 매핑이 없는 allowlist id 가 있다: ' + missingGroup.join(','));

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
  row.insideExpectedGroup = inside(n, EXPECTED_GROUP[id]);
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
  gate(id + ':insideExpectedGroup', row.insideExpectedGroup, '원래 그룹(' + EXPECTED_GROUP[id] + ') 서브트리 밖으로 옮겨진 것으로 보인다');
  row.ok = row.visible === false && row.insideMainFrame && !row.insideInstance && !row.isComponentDef && row.parentInsideMainFrame && row.insideExpectedGroup;
  preflightRows.push(row);
}

/* ======== 3. 보호 대상(NEVER_TOUCH) 재확인 ======== */
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
const outsideExpectedGroup = preflightRows.filter(r => r.exists && !r.insideExpectedGroup).length;
const predictedDescendantCount = preflightRows.reduce((a, r) => a + (r.deletionScopeDescendantCount || 0), 0);

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers,
    exactAllowlistCount: ALLOWLIST.length, foundCount, missingCount, wrongVisibility, insideInstanceBlocked, outsideExpectedGroup,
    protectedNodesConfirmed: neverTouchRows.filter(r => r.ok).length,
    reviewRequiredUntouched, keepWrappersUntouched,
    predictedDeletionRoots: preflightPassed ? ALLOWLIST.length : 0, predictedDescendantCount,
    preflightRows, neverTouchRows,
    layoutBaseline: { tracked: layoutBefore, refs: refsBefore, flowSnapshot: flowBefore },
    mutationCount, notes, errorCount: errors.length, errors
  });
}

/* ======== 5. APPLY ======== */
const records = [];
for (const id of ALLOWLIST) {
  const n = await figma.getNodeByIdAsync(id);
  const path = pathFromMainFrame(n);
  records.push({ id, parentId: n.parent.id, path, indexInParent: path ? path[path.length - 1] : null });
}
const pathFailures = records.filter(r => !r.path);
if (pathFailures.length) return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: '경로 기록 실패: ' + pathFailures.map(r => r.id).join(','), mutationCount, errorCount: 1 });

let freshBackup = null, freshBackupId = null;
try {
  freshBackup = mainFrame.clone(); mutationCount++;
  freshBackup.name = '[G5 fresh backup] ' + SCRIPT_VERSION + ' ' + new Date().toISOString();
  freshBackup.x = mainFrame.x + mainFrame.width + 400; freshBackup.y = mainFrame.y;
  freshBackupId = freshBackup.id;
} catch (e) { return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: 'fresh backup 생성 실패: ' + e.message, mutationCount, errorCount: 1 }); }

const deletedRoots = []; let deleteFailure = null;
try {
  for (const rec of records) {
    const n = await figma.getNodeByIdAsync(rec.id);
    if (!n) { deleteFailure = rec.id + ' 를 삭제 직전에 다시 찾지 못했다'; break; }
    n.remove(); mutationCount++;
    deletedRoots.push(rec.id);
  }
} catch (e) { deleteFailure = e && e.message ? e.message : String(e); }

async function rollback(reason, diagnostics) {
  const restored = [];
  for (const rec of records) {
    if (deletedRoots.indexOf(rec.id) < 0) continue;
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
    restored, deletedRoots, freshBackupId,
    manualRecoveryNote: rollbackClean ? null : 'rollback 이 일부만 성공했다 — fresh backup(' + freshBackupId + ')에서 수동으로 대조/복구 필요. fresh backup 은 지우지 않았다.',
    failureDiagnostics: diagnostics || null, // rollback 전에 캡처됐다면 여기 그대로 남는다 — rollback 성공 여부와 무관하게 절대 사라지지 않는다
    mutationCount, errorCount: 1
  });
}
if (deleteFailure) return await rollback(deleteFailure, null);

/* ======== 6. 삭제 직후 한 번의 최소 yield, 그 다음 되읽기 ======== */
await settle();

const c = {};
c.allTargetsDeleted = true;
for (const id of ALLOWLIST) { const n = await figma.getNodeByIdAsync(id); if (n) { c.allTargetsDeleted = false; break; } }

const flowAfter = flowSnapshot(mainFrame);
c.flowSnapshotUnchanged = flowBefore.hash === flowAfter.hash;

const layoutAfter = await layoutBaselineAll();
/* 판정과 진단표를 같은 계산에서 뽑는다 — evalField() 하나만 고치면 둘 다 같이 맞는다 */
const layoutDiagRows = fieldDiagnostics(layoutBefore, layoutAfter);
c.layoutUnchanged = layoutDiagRows.every(r => r.pass === true);

const refsAfter = await refsBaselineAll();
c.trackedRefsUnchanged = Object.keys(TRACKED_REFS).every(k => refsMatch(refsBefore[k], refsAfter[k]));

const neverTouchAfter = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchAfter.push({ id, exists: !!n, visible: n ? n.visible !== false : null, size: n ? size(n) : null }); }
c.protectedNodesUntouched = NEVER_TOUCH.every((id, i) => {
  const before = neverTouchRows.find(r => r.id === id), after = neverTouchAfter[i];
  return before.exists === after.exists && (!before.exists || after.exists);
});
c.noErrors = errors.length === 0;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) {
  /* rollback 을 부르기 전에, 사라지면 안 되는 진단 정보를 전부 먼저 만든다 (판정에 쓴 것과 같은 표) */
  const diagnostics = {
    settleApplied: true, settleMethod: 'setTimeout(resolve, 0) 한 번, 삭제 루프 직후 · 되읽기 직전',
    fieldDiagnostics: layoutDiagRows, failingFields: layoutDiagRows.filter(r => !r.pass),
    layoutBefore, layoutAfter, refsBefore, refsAfter,
    flowBefore, flowAfter: { nodeCount: flowAfter.nodeCount, hash: flowAfter.hash },
    checks: c
  };
  return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '), diagnostics);
}

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
