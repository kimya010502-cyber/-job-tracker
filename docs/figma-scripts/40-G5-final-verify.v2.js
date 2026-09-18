/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 40 v2
 * Phase G5 최종 검증 (읽기 전용)
 *
 * v1 대비 변경점 (v1 은 보존, 이 파일은 별도) — NavItem 판정만 고쳤다
 *   v1 실행 결과 다른 항목은 전부 통과했는데 `navItemCount6` 만 false 였다. 원인은 진짜 실패가 아니라
 *   verifier 탐지 방식의 false negative: v1 은 Aside 의 **direct flow children** 만 훑어서 이름이
 *   "NavItem" 패턴인 INSTANCE 를 셌는데, 실제로는 Aside 의 direct children 이 Container 2개
 *   (`1002:493`, `1002:532`) 뿐이고 NavItem 인스턴스는 그 Container 내부에 중첩돼 있어서 direct-child
 *   방식으로는 0개가 나오는 게 정상이었다.
 *
 *   v2 는 이름 패턴 best-effort 를 버리고, 알려진 **exact NavItem instance id 6개**
 *   (`1093:614`/`619`/`624`/`629`/`634`/`639`) 각각에 대해 exists · type===INSTANCE · visible===true ·
 *   Aside(`1002:492`) 서브트리 안(직속 자식이 아니라 서브트리 전체 — `inside()` 로 확인, 중첩 깊이 무관)인지를
 *   직접 확인한다. 6개 전부 만족해야 `navItemCount6 = true`.
 *
 *   나머지(삭제 대상 24개 부재, 보호 대상, refs, KPI 4/Grid 12, Toolbar 목록, Main scroll 구조, backup 4개
 *   전부 손 안 댐)는 v1 과 완전히 동일 — mutation 없음, DRY_RUN 플래그 없이 그대로 실행.
 * ========================================================================== */

const SCRIPT_VERSION = '40-G5-v2-final-verify';

const IDS = { mainFrame: '1002:2' };

/* 36-v4 가 삭제한 24개(네 번째 세대 id) — 전부 없어야 한다 */
const DELETED_TARGETS = [
  '1137:3190', '1137:3204', '1137:3218', '1137:3232',
  '1137:3243', '1137:3246', '1137:3248', '1137:3251', '1137:3253', '1137:3256',
  '1137:3258', '1137:3261', '1137:3263', '1137:3266', '1137:3268',
  '1137:3273',
  '1137:3280', '1137:3283',
  '1137:3287', '1137:3292', '1137:3297', '1137:3302', '1137:3307', '1137:3312'
];
const REVIEW_REQUIRED_IDS = ['1009:703', '1009:709', '1002:506'];
const KEEP_WRAPPER_IDS = ['1003:1734', '1003:1728'];
const TRACKED_REFS = { viewToggle: '1108:665', bell: '1110:672', syncChip: '1115:688' };
const TRACKED_LAYOUT = { main: '1002:3', toolbar: '1003:1695', searchInput: '1070:71', header: '1002:469', aside: '1002:492', kpiSection: '1002:23', grid: '1002:140' };
const FRESH_BACKUPS = ['1133:644', '1135:1535', '1137:2426', '1138:3317'];
/* 화면 교체 단계(F1 NavItem6)에서 생성된 정확한 NavItem instance id 6개 — 이름 패턴 추측 대신 이걸로 직접 확인한다 */
const NAV_ITEM_IDS = ['1093:614', '1093:619', '1093:624', '1093:629', '1093:634', '1093:639'];

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }
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
  return { id, name: node.name, size: size(node), sizingH, sizingV, freeW, freeH, flowChildCount: f.length,
    flowChildren: f.map(c => ({ id: c.id, name: c.name, type: c.type, size: size(c) })) };
}

/* ======== 0. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

const c = {};

/* ======== 1. 삭제 대상 24개 부재 확인 ======== */
const stillExists = [];
for (const id of DELETED_TARGETS) { const n = await figma.getNodeByIdAsync(id); if (n) stillExists.push(id); }
c.allDeletedTargetsAbsent = stillExists.length === 0;

/* ======== 2. 보호 대상 존재 확인 ======== */
const neverTouchRows = [];
for (const id of REVIEW_REQUIRED_IDS.concat(KEEP_WRAPPER_IDS)) {
  const n = await figma.getNodeByIdAsync(id);
  neverTouchRows.push({ id, exists: !!n, visible: n ? n.visible !== false : null, insideMainFrame: n ? inside(n, IDS.mainFrame) : null });
}
c.reviewRequiredPresent = neverTouchRows.filter(r => REVIEW_REQUIRED_IDS.indexOf(r.id) >= 0).every(r => r.exists);
c.keepWrappersPresent = neverTouchRows.filter(r => KEEP_WRAPPER_IDS.indexOf(r.id) >= 0).every(r => r.exists);

/* wrapper 들이 Toolbar 서브트리 안에 있는지 별도로 정확히 확인 */
let keepWrappersInsideToolbar = true;
for (const id of KEEP_WRAPPER_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n || !inside(n, TRACKED_LAYOUT.toolbar)) keepWrappersInsideToolbar = false;
}
c.keepWrappersInsideToolbar = keepWrappersInsideToolbar;

/* ======== 3. refs ======== */
const refsNow = {};
for (const k of Object.keys(TRACKED_REFS)) {
  const n = await figma.getNodeByIdAsync(TRACKED_REFS[k]);
  refsNow[k] = n ? { id: n.id, name: n.name, visible: n.visible !== false, size: size(n) } : { id: TRACKED_REFS[k], missing: true };
}
c.refsAllPresentAndVisible = Object.keys(refsNow).every(k => !refsNow[k].missing && refsNow[k].visible);

/* ======== 4. KPI 4 / Grid 12 ======== */
const kpiLayout = await layoutOf(TRACKED_LAYOUT.kpiSection);
const gridLayout = await layoutOf(TRACKED_LAYOUT.grid);
c.kpiCardCount4 = !kpiLayout.missing && kpiLayout.flowChildCount === 4;
c.gridAppCardCount12 = !gridLayout.missing && gridLayout.flowChildCount === 12;

/* ======== 5. NavItem 6 — exact id 6개를 직접 확인(이름 패턴 추측 안 함) ======== */
const asideNode = await figma.getNodeByIdAsync(TRACKED_LAYOUT.aside);
const asideFlow = asideNode ? flow(asideNode) : [];
const navItemRows = [];
for (const id of NAV_ITEM_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  const row = { id, exists: !!n };
  if (n) {
    row.type = n.type; row.name = n.name; row.visible = n.visible !== false;
    row.insideAside = inside(n, TRACKED_LAYOUT.aside);
  }
  row.ok = !!n && n.type === 'INSTANCE' && n.visible !== false && row.insideAside === true;
  navItemRows.push(row);
}
c.navItemCount6 = navItemRows.every(r => r.ok);
if (!c.navItemCount6) notes.push('NavItem exact id 6개 중 조건(exists · type=INSTANCE · visible=true · Aside 서브트리 안)을 만족 못한 게 있다: ' + navItemRows.filter(r => !r.ok).map(r => r.id).join(','));

/* ======== 6. Toolbar 현재 구성 ======== */
const toolbarLayout = await layoutOf(TRACKED_LAYOUT.toolbar);

/* ======== 7. Main scroll 구조 ======== */
const mainNode = await figma.getNodeByIdAsync(TRACKED_LAYOUT.main);
const mainLayout = await layoutOf(TRACKED_LAYOUT.main);
c.mainIsScrollContainer = !!mainNode && sg(mainNode, 'clipsContent') === true && sg(mainNode, 'overflowDirection') === 'VERTICAL' && mainLayout.sizingV === 'FIXED';

/* ======== 8. fresh backup 전부 mainFrame 밖에 그대로 ======== */
const backupRows = [];
for (const id of FRESH_BACKUPS) {
  const n = await figma.getNodeByIdAsync(id);
  backupRows.push({ id, exists: !!n, name: n ? n.name : null, insideMainFrame: n ? inside(n, IDS.mainFrame) : null });
}
c.allBackupsPresentOutsideMainFrame = backupRows.every(r => r.exists && !r.insideMainFrame);

c.noErrors = errors.length === 0;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase G5 CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: {
    stillExists,
    neverTouchRows,
    refsNow,
    kpiSection: { flowChildCount: kpiLayout.flowChildCount, children: kpiLayout.flowChildren },
    grid: { flowChildCount: gridLayout.flowChildCount, children: gridLayout.flowChildren },
    aside: { flowChildCount: asideFlow.length, navItemRows, directFlowChildren: asideFlow.map(c => ({ id: c.id, name: c.name, type: c.type })) },
    toolbar: { flowChildCount: toolbarLayout.flowChildCount, freeW: toolbarLayout.freeW, freeH: toolbarLayout.freeH, children: toolbarLayout.flowChildren },
    main: { size: mainLayout.size, sizingV: mainLayout.sizingV, clipsContent: mainNode ? sg(mainNode, 'clipsContent') : null, overflowDirection: mainNode ? sg(mainNode, 'overflowDirection') : null, freeH: mainLayout.freeH, freeW: mainLayout.freeW, flowChildCount: mainLayout.flowChildCount },
    backups: backupRows
  },
  notes, errorCount: errors.length, errors
});
