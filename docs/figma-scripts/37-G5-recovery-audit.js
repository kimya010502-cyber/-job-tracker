/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 37
 * Phase G5 — 36-v1 APPLY 실패 → rollback 이후 현재 상태 확인 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 *
 * 배경      36-v1 APPLY 가 되읽기에서 `layoutUnchanged` 하나만 실패해 rollback 됐고(`rollbackClean` true),
 *           rollback 과정에서 24개 전부 **새 id 로 재생성**됐다(remove() 는 되돌릴 수 없어 clone 재삽입 방식이라
 *           원래 있던 자리에서 원래 상태(hidden)로 복원은 되지만 id 자체는 바뀐다 — 사용자가 알려준 24개
 *           원본→복원 id 매핑을 그대로 하드코딩해서 확인한다).
 *
 * 확인하는 것
 *   1) 복원된 24개 각각 — 존재 · visible=false · mainFrame 서브트리 안 · 인스턴스 내부 아님 ·
 *      원래 있던 그룹 컨테이너(KPI section/Toolbar/Header/Aside) 서브트리 안에 있는지(정확한 직속 부모까지는
 *      모르므로 "그 그룹 안"인지로 확인 — 과도하게 단정하지 않는다)
 *   2) 원본 24개 id 는 전부 사라졌는지(getNodeByIdAsync 가 null 을 돌려주는지 — 중복 존재 아닌지)
 *   3) fresh backup(`1133:644`) 이 그대로 있는지, mainFrame 밖에 있는지 — 손대지 않는다
 *   4) Main·Toolbar·Search Input·Header·Aside·KPI section·Grid 레이아웃이 36-v1 DRY_RUN 때 잰 값과
 *      **0.5px 허용치**로 같은지(36 의 `near` 임계값 0.02 는 지나치게 빡빡해서 실제 Figma 의 미세한 재계산
 *      오차만으로도 실패할 수 있었다는 게 이번 조사의 핵심 — 이 값 자체가 그 가설을 검증하는 재측정이다)
 *   5) View Toggle · Bell · Sync Chip 인스턴스 그대로인지
 *   6) REVIEW_REQUIRED 3개 · KEEP wrapper 2개 그대로인지
 * ========================================================================== */

const SCRIPT_VERSION = '37-G5-v1-recovery-audit';

const IDS = { mainFrame: '1002:2', freshBackup: '1133:644' };

/* 36-v1 rollback 결과로 사용자가 알려준 원본 → 복원 id 매핑 */
const RESTORED = {
  '1002:24': '1133:1408', '1002:42': '1133:1422', '1002:60': '1133:1436', '1002:78': '1133:1450',
  '1003:1697': '1133:1461', '1003:1700': '1133:1464', '1003:1705': '1133:1466', '1003:1708': '1133:1469',
  '1003:1711': '1133:1471', '1003:1714': '1133:1474', '1003:1717': '1133:1476', '1003:1720': '1133:1479',
  '1003:1723': '1133:1481', '1003:1726': '1133:1484', '1003:1729': '1133:1486',
  '1003:1735': '1133:1491',
  '1002:487': '1133:1498', '1002:478': '1133:1501',
  '1002:512': '1133:1505', '1002:517': '1133:1510', '1002:522': '1133:1515', '1002:527': '1133:1520',
  '1002:537': '1133:1525', '1002:542': '1133:1530'
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
/* 36-v1 DRY_RUN 때 사용자가 알려준 실측값 — 지금 값과 재대조(전부 0.5px 허용, size 문자열이 아니라 w/h 숫자로) */
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
  /* w/h 는 숫자로도 따로 낸다 — size 문자열 그대로 비교하면 36-v1 이 걸렸던 것과 같은 함정(부동소수점
     미세 오차가 문자열 경계를 넘으면 "달라 보이는" 문제)에 그대로 걸린다. 전부 near() 로 대조한다. */
  return { id, name: node.name, size: size(node), w: r2(node.width), h: r2(node.height), freeW, freeH, flowChildCount: f.length };
}

/* ======== 0. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

/* ======== 1. 복원된 24개 재확인 ======== */
const restoredRows = [];
for (const originalId of Object.keys(RESTORED)) {
  const newId = RESTORED[originalId];
  const n = await figma.getNodeByIdAsync(newId);
  const group = EXPECTED_GROUP[originalId];
  const row = { originalId, restoredAsId: newId, exists: !!n };
  if (!n) { row.ok = false; row.problem = '복원된 노드를 찾지 못했다'; restoredRows.push(row); continue; }
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

/* ======== 2. 원본 24개는 전부 사라졌는지(중복 존재 방지) ======== */
const originalStillExists = [];
for (const originalId of Object.keys(RESTORED)) { const n = await figma.getNodeByIdAsync(originalId); if (n) originalStillExists.push(originalId); }

/* ======== 3. fresh backup ======== */
const freshBackup = await figma.getNodeByIdAsync(IDS.freshBackup);
const freshBackupInfo = freshBackup ? { exists: true, name: freshBackup.name, size: size(freshBackup), insideMainFrame: inside(freshBackup, IDS.mainFrame) } : { exists: false };

/* ======== 4. 레이아웃 재측정 — DRY_RUN 기준값과 0.5px 허용 대조 ======== */
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

/* ======== 5. refs ======== */
const refsNow = {};
for (const k of Object.keys(TRACKED_REFS)) {
  const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
  refsNow[k] = n ? { id: n.id, visible: n.visible !== false, size: size(n) } : { id: TRACKED_REFS[k], missing: true };
}

/* ======== 6. 보호 대상 ======== */
const neverTouchNow = [];
for (const id of NEVER_TOUCH) { const n = await figma.getNodeByIdAsync(id); neverTouchNow.push({ id, exists: !!n, visible: n ? n.visible !== false : null }); }

/* ======== 요약 ======== */
const restoredOk = restoredRows.filter(r => r.ok);
const restoredProblem = restoredRows.filter(r => !r.ok);
const layoutMismatches = Object.keys(layoutCompare).filter(k => !layoutCompare[k].match);
const summary = {
  restoredCount: restoredRows.length, restoredOk: restoredOk.length, restoredProblem: restoredProblem.length,
  originalIdsStillExistCount: originalStillExists.length,
  freshBackupExists: freshBackupInfo.exists, freshBackupOutsideMainFrame: freshBackupInfo.exists ? !freshBackupInfo.insideMainFrame : null,
  layoutMismatchCount: layoutMismatches.length,
  refsAllVisible: Object.keys(refsNow).every(k => !refsNow[k].missing && refsNow[k].visible),
  neverTouchAllOk: neverTouchNow.every(r => r.exists),
  errorCount: errors.length
};
const currentStateHealthy = summary.restoredProblem === 0 && summary.originalIdsStillExistCount === 0 &&
  summary.freshBackupExists && summary.freshBackupOutsideMainFrame && summary.layoutMismatchCount === 0 &&
  summary.refsAllVisible && summary.neverTouchAllOk;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary, currentStateHealthy,
  restoredRows, restoredProblemRows: restoredProblem,
  originalStillExists,
  freshBackup: freshBackupInfo,
  layoutNow, layoutCompare, layoutMismatches,
  refsNow, neverTouchNow,
  notes, errorCount: errors.length, errors
});
