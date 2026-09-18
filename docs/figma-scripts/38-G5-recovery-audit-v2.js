/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 38
 * Phase G5 — 36-v2 APPLY 실패 → 두 번째 rollback 이후 현재 상태 확인 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 *
 * 배경      36-v2 APPLY 도 되읽기에서 `layoutUnchanged` 하나만 실패해 다시 rollback 됐다(`rollbackClean` true).
 *           remove() 는 되돌릴 수 없어 이번에도 24개 전부 **또 새 id 를 받았다**(1133:xxxx → 1135:xxxx).
 *           지금까지 세 세대의 id 가 있다: 원본(1002:.../1003:...) → 1차 복원(1133:...) → 2차 복원(1135:...).
 *           이 스크립트는 **2차 복원 id(1135:...)** 를 기준으로 확인하고, 원본과 1차 복원 id 둘 다 안 남아있는지도 본다.
 *           fresh backup 도 두 개(1차 `1133:644`, 2차 `1135:1535`) 다 그대로 있는지 — 어느 쪽도 손대지 않는다.
 *
 * 확인하는 것
 *   1) 2차 복원 24개 각각 — 존재 · visible=false · mainFrame 서브트리 안 · 인스턴스 내부 아님 ·
 *      원래 그룹 컨테이너(KPI section/Toolbar/Header/Aside) 서브트리 안인지
 *   2) 원본 24개, 1차 복원 24개 — 전부 사라졌는지(어느 세대도 중복으로 안 남아있는지)
 *   3) fresh backup 1133:644 · 1135:1535 둘 다 있는지, mainFrame 밖인지 — 손대지 않는다
 *   4) Main·Toolbar·Search Input·Header·Aside·KPI section·Grid 레이아웃이 36-v1 DRY_RUN 실측값과 0.5px 허용으로
 *      같은지(참고용 — 이 자체가 실패했던 값이므로 "여전히 어긋나는지" 보는 목적)
 *   5) View Toggle · Bell · Sync Chip, REVIEW_REQUIRED 3개 · KEEP wrapper 2개 그대로인지
 * ========================================================================== */

const SCRIPT_VERSION = '38-G5-v2-recovery-audit';

const IDS = { mainFrame: '1002:2', freshBackupV1: '1133:644', freshBackupV2: '1135:1535' };

/* 원본 id → 1차 복원(36-v1 rollback) id → 2차 복원(36-v2 rollback) id */
const GENERATIONS = {
  '1002:24': ['1133:1408', '1135:2299'], '1002:42': ['1133:1422', '1135:2313'],
  '1002:60': ['1133:1436', '1135:2327'], '1002:78': ['1133:1450', '1135:2341'],
  '1003:1697': ['1133:1461', '1135:2352'], '1003:1700': ['1133:1464', '1135:2355'],
  '1003:1705': ['1133:1466', '1135:2357'], '1003:1708': ['1133:1469', '1135:2360'],
  '1003:1711': ['1133:1471', '1135:2362'], '1003:1714': ['1133:1474', '1135:2365'],
  '1003:1717': ['1133:1476', '1135:2367'], '1003:1720': ['1133:1479', '1135:2370'],
  '1003:1723': ['1133:1481', '1135:2372'], '1003:1726': ['1133:1484', '1135:2375'],
  '1003:1729': ['1133:1486', '1135:2377'],
  '1003:1735': ['1133:1491', '1135:2382'],
  '1002:487': ['1133:1498', '1135:2389'], '1002:478': ['1133:1501', '1135:2392'],
  '1002:512': ['1133:1505', '1135:2396'], '1002:517': ['1133:1510', '1135:2401'],
  '1002:522': ['1133:1515', '1135:2406'], '1002:527': ['1133:1520', '1135:2411'],
  '1002:537': ['1133:1525', '1135:2416'], '1002:542': ['1133:1530', '1135:2421']
};
/* 각 원본이 원래 속했던 "그룹" 컨테이너 — 정확한 직속 부모가 아니라 그 서브트리 안인지만 확인 */
const EXPECTED_GROUP = {
  '1002:24': { id: '1002:23', label: 'KPI section' }, '1002:42': { id: '1002:23', label: 'KPI section' },
  '1002:60': { id: '1002:23', label: 'KPI section' }, '1002:78': { id: '1002:23', label: 'KPI section' },
  '1003:1697': { id: '1003:1695', label: 'Toolbar' }, '1003:1700': { id: '1003:1695', label: 'Toolbar' },
  '1003:1705': { id: '1003:1695', label: 'Toolbar' }, '1003:1708': { id: '1003:1695', label: 'Toolbar' },
  '1003:1711': { id: '1003:1695', label: 'Toolbar' }, '1003:1714': { id: '1003:1695', label: 'Toolbar' },
  '1003:1717': { id: '1003:1695', label: 'Toolbar' }, '1003:1720': { id: '1003:1695', label: 'Toolbar' },
  '1003:1723': { id: '1003:1695', label: 'Toolbar' }, '1003:1726': { id: '1003:1695', label: 'Toolbar' },
  '1003:1729': { id: '1003:1695', label: 'Toolbar' },
  '1003:1735': { id: '1003:1695', label: 'Toolbar(View Toggle 영역)' },
  '1002:487': { id: '1002:469', label: 'Header' }, '1002:478': { id: '1002:469', label: 'Header' },
  '1002:512': { id: '1002:492', label: 'Aside' }, '1002:517': { id: '1002:492', label: 'Aside' },
  '1002:522': { id: '1002:492', label: 'Aside' }, '1002:527': { id: '1002:492', label: 'Aside' },
  '1002:537': { id: '1002:492', label: 'Aside' }, '1002:542': { id: '1002:492', label: 'Aside' }
};
const NEVER_TOUCH = ['1009:703', '1009:709', '1002:506', '1003:1734', '1003:1728'];
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };
/* 36-v1 DRY_RUN 때 실측값 — 참고 대조용(전부 0.5px 허용, w/h 숫자로) */
const DRY_RUN_BASELINE = {
  main: { w: 1024, h: 1024, freeH: -67 },
  toolbar: { w: 976, h: 60, freeW: 53 },
  searchInput: { w: 240, h: 36, freeW: 2 },
  header: { w: 1024, h: 64 },
  aside: { w: 256, h: 1024 },
  kpiSection: { flowChildCount: 4 },
  grid: { flowChildCount: 12 }
};

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }
function nearestInstanceAncestor(n, stopId) { let x = n.parent; while (x && x.id !== stopId) { if (x.type === 'INSTANCE') return x; x = x.parent; } return null; }
function idLooksNested(id) { return typeof id === 'string' && id.indexOf(';') >= 0; }
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

/* ======== 0. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

/* ======== 1. 2차 복원 24개 재확인 ======== */
const restoredRows = [];
for (const originalId of Object.keys(GENERATIONS)) {
  const [v1Id, v2Id] = GENERATIONS[originalId];
  const n = await figma.getNodeByIdAsync(v2Id);
  const group = EXPECTED_GROUP[originalId];
  const row = { originalId, v1RestoredId: v1Id, v2RestoredId: v2Id, exists: !!n };
  if (!n) { row.ok = false; row.problem = '2차 복원 노드를 찾지 못했다'; restoredRows.push(row); continue; }
  const anc = nearestInstanceAncestor(n, IDS.mainFrame);
  row.name = n.name; row.type = n.type; row.size = size(n);
  row.visible = n.visible !== false;
  row.insideMainFrame = inside(n, IDS.mainFrame);
  row.insideInstance = !!anc || idLooksNested(n.id);
  row.parent = n.parent ? { id: n.parent.id, name: n.parent.name } : null;
  row.insideExpectedGroup = inside(n, group.id);
  row.expectedGroup = group.label + ' (' + group.id + ')';
  row.ok = row.visible === false && row.insideMainFrame && !row.insideInstance && row.insideExpectedGroup;
  if (!row.ok) {
    const problems = [];
    if (row.visible !== false) problems.push('visible=true (hidden 이어야 함)');
    if (!row.insideMainFrame) problems.push('mainFrame 밖');
    if (row.insideInstance) problems.push('인스턴스 내부로 보임');
    if (!row.insideExpectedGroup) problems.push('예상 그룹(' + row.expectedGroup + ') 밖');
    row.problem = problems.join(', ');
  }
  restoredRows.push(row);
}

/* ======== 2. 원본·1차 복원 id 는 전부 사라졌는지(어느 세대도 중복 존재 방지) ======== */
const staleIds = [];
for (const originalId of Object.keys(GENERATIONS)) {
  const [v1Id] = GENERATIONS[originalId];
  const nOrig = await figma.getNodeByIdAsync(originalId); if (nOrig) staleIds.push({ id: originalId, generation: 'original' });
  const nV1 = await figma.getNodeByIdAsync(v1Id); if (nV1) staleIds.push({ id: v1Id, generation: 'v1-restored' });
}

/* ======== 3. fresh backup 두 개 ======== */
async function backupInfo(id) {
  const n = await figma.getNodeByIdAsync(id);
  return n ? { exists: true, name: n.name, size: size(n), insideMainFrame: inside(n, IDS.mainFrame) } : { exists: false };
}
const freshBackupV1Info = await backupInfo(IDS.freshBackupV1);
const freshBackupV2Info = await backupInfo(IDS.freshBackupV2);

/* ======== 4. 레이아웃 재측정 ======== */
const layoutNow = {}; for (const k of Object.keys(TRACKED_LAYOUT)) layoutNow[k] = await layoutOf(TRACKED_LAYOUT[k]);
const layoutCompare = {};
for (const k of Object.keys(DRY_RUN_BASELINE)) {
  const exp = DRY_RUN_BASELINE[k], now = layoutNow[k];
  const row = { expected: exp, now };
  if (!now || now.missing) { row.match = false; row.detail = '지금 못 찾음'; layoutCompare[k] = row; continue; }
  const checks = [];
  if ('w' in exp) checks.push(near(exp.w, now.w, 0.5) ? true : 'w ' + exp.w + ' → ' + now.w);
  if ('h' in exp) checks.push(near(exp.h, now.h, 0.5) ? true : 'h ' + exp.h + ' → ' + now.h);
  if ('freeW' in exp) checks.push(near(exp.freeW, now.freeW, 0.5) ? true : 'freeW ' + exp.freeW + ' → ' + now.freeW);
  if ('freeH' in exp) checks.push(near(exp.freeH, now.freeH, 0.5) ? true : 'freeH ' + exp.freeH + ' → ' + now.freeH);
  if ('flowChildCount' in exp) checks.push(exp.flowChildCount === now.flowChildCount ? true : 'flowChildCount ' + exp.flowChildCount + ' → ' + now.flowChildCount);
  row.match = checks.every(x => x === true);
  row.detail = checks.filter(x => x !== true);
  layoutCompare[k] = row;
}

/* ======== 5. refs · 보호 대상 ======== */
const refsNow = {};
for (const k of Object.keys(TRACKED_REFS)) {
  const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
  refsNow[k] = n ? { id: n.id, visible: n.visible !== false, size: size(n) } : { id: TRACKED_REFS[k], missing: true };
}
const neverTouchNow = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchNow.push({ id, exists: !!n, visible: n ? n.visible !== false : null }); }

/* ======== 요약 ======== */
const restoredOk = restoredRows.filter(r => r.ok);
const restoredProblem = restoredRows.filter(r => !r.ok);
const layoutMismatches = Object.keys(layoutCompare).filter(k => !layoutCompare[k].match);
const summary = {
  restoredCount: restoredRows.length, restoredOk: restoredOk.length, restoredProblem: restoredProblem.length,
  staleIdCount: staleIds.length,
  freshBackupV1Exists: freshBackupV1Info.exists, freshBackupV1OutsideMainFrame: freshBackupV1Info.exists ? !freshBackupV1Info.insideMainFrame : null,
  freshBackupV2Exists: freshBackupV2Info.exists, freshBackupV2OutsideMainFrame: freshBackupV2Info.exists ? !freshBackupV2Info.insideMainFrame : null,
  layoutMismatchCount: layoutMismatches.length,
  refsAllVisible: Object.keys(refsNow).every(k => !refsNow[k].missing && refsNow[k].visible),
  neverTouchAllOk: neverTouchNow.every(r => r.exists),
  errorCount: errors.length
};
const currentStateHealthy = summary.restoredProblem === 0 && summary.staleIdCount === 0 &&
  summary.freshBackupV1Exists && summary.freshBackupV1OutsideMainFrame &&
  summary.freshBackupV2Exists && summary.freshBackupV2OutsideMainFrame &&
  summary.refsAllVisible && summary.neverTouchAllOk;
/* layoutMismatchCount 는 currentStateHealthy 판정에서 일부러 뺐다 — 지금 조사 중인 바로 그 값이라
   여기서 "정상"으로 단정하면 순환 논리가 된다. summary.layoutMismatchCount 와 layoutCompare 는
   그대로 출력해 사람이 직접 판단하게 한다. */

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary, currentStateHealthy,
  restoredRows, restoredProblemRows: restoredProblem,
  staleIds,
  freshBackupV1: freshBackupV1Info, freshBackupV2: freshBackupV2Info,
  layoutNow, layoutCompare, layoutMismatches,
  refsNow, neverTouchNow,
  notes, errorCount: errors.length, errors
});
