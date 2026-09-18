/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 40
 * Phase G5 최종 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 * 36-G5-v4 APPLY 가 성공(`successCriteriaMet` true, `rolledBack` false, 24개 삭제, backup `1138:3317`)한
 * 직후 상태를 처음부터 다시(기준값에 기대지 않고) 잰다.
 *
 * 확인하는 것
 *   1) 삭제 대상 24개(v4 allowlist) 가 실제로 전부 없는지
 *   2) REVIEW_REQUIRED 3개 · KEEP wrapper 2개 존재
 *   3) View Toggle · Bell · Sync Chip 존재 · visible
 *   4) KPI section 이 KPI Card 4개, Grid 가 App Card 12개만 남았는지(flow 기준 — legacy 는 이미 삭제됐으니
 *      hidden 으로 숨어서 안 잡힐 걱정도 없다)
 *   5) Aside 안 NavItem 인스턴스 개수(컴포넌트 마스터 이름이 "NavItem" 패턴인 것만 세서 best-effort 로 6 확인 —
 *      정확한 마스터 id 를 갖고 있지 않아 이름 매칭이라 결과를 그대로 보여주고 사람이 확인하게 한다)
 *   6) Toolbar 안 알려진 두 wrapper(View Toggle wrapper 1003:1734, reset wrapper 1003:1728) 가 여전히 그
 *      서브트리 안에 있는지, Toolbar 의 지금 flow 구성 전체를 목록으로 낸다
 *   7) Main 이 여전히 의도된 vertical scroll 컨테이너인지(FIXED height · clipsContent · overflowDirection
 *      VERTICAL) 구조로 확인 — 절대값 비교가 아니라 구조 자체를 본다
 *   8) 지금까지 생긴 fresh backup 전부(`1133:644` · `1135:1535` · `1137:2426` · `1138:3317`)가 mainFrame 밖에
 *      그대로 있는지 — 전부 손대지 않는다
 * ========================================================================== */

const SCRIPT_VERSION = '40-G5-v1-final-verify';

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
const NAV_ITEM_NAME_RE = /nav\s*item/i;

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

/* ======== 5. NavItem 6 (best-effort — 이름 패턴 매칭, 마스터 id 를 정확히 모름) ======== */
const asideNode = await figma.getNodeByIdAsync(TRACKED_LAYOUT.aside);
const asideFlow = asideNode ? flow(asideNode) : [];
const navItemCandidates = [];
for (const child of asideFlow) {
  if (child.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(child);
  const nameMatches = NAV_ITEM_NAME_RE.test(child.name) || (mc && NAV_ITEM_NAME_RE.test(mc.name));
  if (nameMatches) navItemCandidates.push({ id: child.id, name: child.name, mainComponent: mc ? mc.name : null });
}
c.navItemCount6 = navItemCandidates.length === 6;
if (!c.navItemCount6) notes.push('NavItem 인스턴스를 이름 패턴("nav item")으로 찾은 결과가 6개가 아니다(' + navItemCandidates.length + '개) — 마스터 id 를 정확히 몰라 이름 매칭이라 놓쳤을 수 있다. asideFlowChildren 목록을 직접 확인해달라.');

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
    aside: { flowChildCount: asideFlow.length, navItemCandidates, allFlowChildren: asideFlow.map(c => ({ id: c.id, name: c.name, type: c.type })) },
    toolbar: { flowChildCount: toolbarLayout.flowChildCount, freeW: toolbarLayout.freeW, freeH: toolbarLayout.freeH, children: toolbarLayout.flowChildren },
    main: { size: mainLayout.size, sizingV: mainLayout.sizingV, clipsContent: mainNode ? sg(mainNode, 'clipsContent') : null, overflowDirection: mainNode ? sg(mainNode, 'overflowDirection') : null, freeH: mainLayout.freeH, freeW: mainLayout.freeW, flowChildCount: mainLayout.flowChildCount },
    backups: backupRows
  },
  notes, errorCount: errors.length, errors
});
