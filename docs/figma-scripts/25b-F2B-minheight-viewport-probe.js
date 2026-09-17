/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 25b
 * Phase F2-B v2 · minHeight 원인 확인 + 뷰포트 재검증 PROBE
 *
 * 25a 에서 Main 을 FIXED 로 바꾸는 것은 됐지만 높이 resize 가 실제로 적용되지 않았다
 * (gate 의 viewportResizeAccepted 가 잡았다). 이 probe 는 그 원인이 Main 의 minHeight 인지
 * 먼저 확인하고, 제약을 푼 상태에서 828 / 838 / 848 을 다시 잰다.
 *
 * 실제 노드에는 쓰지 않는다. 최상위 1002:2 를 복제한 복제본에서만 실험하고 지운다.
 * 모든 쓰기는 W() 가 복제본 안인지 확인한 뒤에만 한다.
 *
 * 보이는 px 는 공식이 아니라 좌표로 잰다: 카드의 absoluteBoundingBox 와
 * clip 이 켜진 Main 의 absoluteBoundingBox 의 교집합 높이.
 * ========================================================================== */

const SCRIPT_VERSION = '25b-F2B-v2-minheight-viewport-probe';

const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', listSection: '1002:139',
  listContainer: '1009:2', grid: '1002:140', footer: '1002:451', header: '1002:469', aside: '1002:492'
};
const PROTECTED = Object.keys(IDS).map(k => IDS[k]);
const VIEWPORTS = [828, 838, 848];
const CAUSE_TEST_HEIGHT = 838;
const SLICE_MIN = 20, SLICE_MAX = 40;
const SHELL_HEIGHT = 1024;
const PROBE_TAG = 'JOOB F2B v2 PROBE TEMP — 삭제해도 됨';
const FAR_X = 38000;

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function safeGet(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return 'ERR:' + e.message; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function pathOf(node, root) {
  const path = []; let cur = node;
  while (cur && cur.id !== root.id) { const p = cur.parent; if (!p || !Array.isArray(p.children)) return null; path.unshift(p.children.indexOf(cur)); cur = p; }
  return cur && cur.id === root.id ? path : null;
}
function atPath(root, path) { let cur = root; for (const i of path) { const cs = kids(cur); if (i < 0 || i >= cs.length) return null; cur = cs[i]; } return cur; }
function isInside(n, a) { let c = n; while (c) { if (c.id === a.id) return true; c = c.parent; } return false; }
function flow(n) { return kids(n).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function geo(n) { return { x: r2(n.x), y: r2(n.y), w: r2(n.width), h: r2(n.height) }; }
function abs(n) { const b = safeGet(n, 'absoluteBoundingBox'); return b && typeof b.y === 'number' ? { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) } : null; }
function pads(n) { return { t: r2(safeGet(n, 'paddingTop') || 0), b: r2(safeGet(n, 'paddingBottom') || 0) }; }
function constraintsOf(n) {
  return { width: r2(n.width), height: r2(n.height), layoutSizingVertical: safeGet(n, 'layoutSizingVertical'),
    minHeight: safeGet(n, 'minHeight'), maxHeight: safeGet(n, 'maxHeight'), minWidth: safeGet(n, 'minWidth'), maxWidth: safeGet(n, 'maxWidth'),
    primaryAxisSizingMode: safeGet(n, 'primaryAxisSizingMode'), counterAxisSizingMode: safeGet(n, 'counterAxisSizingMode'),
    clipsContent: safeGet(n, 'clipsContent'), overflowDirection: safeGet(n, 'overflowDirection'), layoutMode: safeGet(n, 'layoutMode') };
}

/* ---------- 실제 노드 스냅샷 ---------- */
async function realSnapshot() {
  const snap = {};
  for (const id of PROTECTED) {
    const n = await figma.getNodeByIdAsync(id);
    snap[id] = n ? Object.assign(geo(n), constraintsOf(n), { visible: n.visible, pos: safeGet(n, 'layoutPositioning'), parent: n.parent ? n.parent.id : null, childCount: kids(n).length }) : 'missing';
  }
  return JSON.stringify(snap);
}
const realBefore = await realSnapshot();
const real = {};
for (const k of Object.keys(IDS)) real[k] = await figma.getNodeByIdAsync(IDS[k]);
const missing = Object.keys(IDS).filter(k => !real[k]);
if (missing.length) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '노드를 찾지 못했다: ' + missing.join(', '), realMutationCount: 0 });
if (!real.main.parent || real.main.parent.type !== 'PAGE') return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '1002:2 가 최상위 프레임이 아니다', realMutationCount: 0 });
const paths = {};
for (const k of Object.keys(IDS)) paths[k] = k === 'main' ? [] : pathOf(real[k], real.main);

/* ---------- 쓰기 관문 ---------- */
let clone = null;
let tempMutationCount = 0;
const log = [];
function W(node, what, fn) {
  if (!clone || !node || !isInside(node, clone)) throw new Error('복제본 밖 노드에는 쓰지 않는다: ' + what);
  if (PROTECTED.indexOf(node.id) >= 0) throw new Error('실제 노드 id 다: ' + what);
  tempMutationCount++; log.push(what);
  return fn();
}
function tryW(node, what, fn) { try { W(node, what, fn); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }

/* ---------- 실제 clip 기준 보이는 px ---------- */
function visibility(c) {
  const clip = abs(c.mainContent);
  const frame = abs(c.main);
  const cards = flow(c.grid);
  const rowsByY = {};
  for (const card of cards) { const k = String(r2(card.y)); (rowsByY[k] = rowsByY[k] || []).push(card); }
  const rowKeys = Object.keys(rowsByY).map(Number).sort((a, b) => a - b);
  const rows = rowKeys.map((ky, i) => {
    const b = abs(rowsByY[String(ky)][0]);
    const visible = clip && b ? r2(Math.max(0, Math.min(b.y + b.h, clip.y + clip.h) - Math.max(b.y, clip.y))) : null;
    return { row: i + 1, topInMain: clip && b ? r2(b.y - clip.y) : null, bottomInMain: clip && b ? r2(b.y + b.h - clip.y) : null,
      height: b ? b.h : null, visiblePx: visible, fullyVisible: !!b && near(visible, b.h) };
  });
  const fb = abs(c.footer);
  const footerVisible = clip && fb ? r2(Math.max(0, Math.min(fb.y + fb.h, clip.y + clip.h) - Math.max(fb.y, clip.y))) : null;
  const containerAbs = abs(c.contentContainer);
  const p = pads(c.mainContent);
  const contentBottomInMain = clip && containerAbs ? r2(containerAbs.y + containerAbs.h - clip.y) : null;
  const scrollContentHeight = contentBottomInMain === null ? null : r2(contentBottomInMain + p.b);
  return { method: 'absoluteBoundingBox ∩ Main(clip) absoluteBoundingBox', clipRect: clip, frameRect: frame, rows,
    footerVisiblePx: footerVisible, footerVisible: footerVisible > 0,
    scrollContentHeight, maxScrollDistance: clip && scrollContentHeight !== null ? r2(Math.max(0, scrollContentHeight - clip.h)) : null,
    bottomPaddingAtEnd: scrollContentHeight !== null ? r2(scrollContentHeight - contentBottomInMain) : null,
    footerBottomToEnd: clip && fb && scrollContentHeight !== null ? r2(scrollContentHeight - (fb.y + fb.h - clip.y)) : null,
    contentWiderThanViewport: clip && containerAbs ? containerAbs.x + containerAbs.w > clip.x + clip.w + 0.5 : null };
}

const R = {};
let aborted = false, abortReason = null;
try {
  clone = real.main.clone();
  if (!clone.parent || clone.parent.type !== 'PAGE') throw new Error('복제본이 페이지에 놓이지 않았다');
  W(clone, '이름', () => { clone.name = PROBE_TAG; });
  W(clone, '위치', () => { clone.x = real.main.x + FAR_X; });
  const c = {};
  for (const k of Object.keys(IDS)) { c[k] = k === 'main' ? clone : atPath(clone, paths[k]); if (!c[k]) throw new Error('복제본에서 ' + k + ' 를 찾지 못했다'); }

  /* ---------- STEP 1: 제약 다시 읽기 ---------- */
  R.step1 = {
    mainContent: constraintsOf(c.mainContent), mainFrame: constraintsOf(c.main),
    realMainContent: constraintsOf(real.mainContent), realMainFrame: constraintsOf(real.main),
    aside: Object.assign(geo(c.aside), { minHeight: safeGet(c.aside, 'minHeight'), sizingV: safeGet(c.aside, 'layoutSizingVertical'), pos: safeGet(c.aside, 'layoutPositioning') }),
    header: geo(c.header)
  };
  R.cloneMatchesOriginal = near(c.mainContent.height, real.mainContent.height) && near(c.main.height, real.main.height) &&
    near(c.contentContainer.height, real.contentContainer.height) &&
    JSON.stringify(constraintsOf(c.mainContent)) === JSON.stringify(constraintsOf(real.mainContent));

  /* ---------- 원인 확인: minHeight 가 그대로인 채 resize ---------- */
  const minBefore = safeGet(c.mainContent, 'minHeight');
  const cause = { minHeightBefore: minBefore, target: CAUSE_TEST_HEIGHT };
  cause.fixedWrite = tryW(c.mainContent, 'Main FIXED', () => { c.mainContent.layoutSizingVertical = 'FIXED'; });
  cause.clipWrite = tryW(c.mainContent, 'Main clip', () => { c.mainContent.clipsContent = true; });
  cause.overflowWrite = tryW(c.mainContent, 'Main overflow', () => { c.mainContent.overflowDirection = 'VERTICAL'; });
  cause.resizeWithMinWrite = tryW(c.mainContent, 'Main resize (min 유지)', () => { c.mainContent.resize(c.mainContent.width, CAUSE_TEST_HEIGHT); });
  cause.heightWithMinIntact = r2(c.mainContent.height);
  cause.clampedToMinHeight = typeof minBefore === 'number' && near(cause.heightWithMinIntact, minBefore) && !near(cause.heightWithMinIntact, CAUSE_TEST_HEIGHT);

  /* minHeight 해제 — null 먼저, 안 되면 0 */
  let override = { tried: [] };
  for (const val of [null, 0]) {
    const w = tryW(c.mainContent, 'Main minHeight = ' + val, () => { c.mainContent.minHeight = val; });
    const back = safeGet(c.mainContent, 'minHeight');
    override.tried.push({ value: val, write: w, readBack: back });
    if (w.ok && (back === val || (val === 0 && back === 0) || (val === null && back === null))) { override.usedValue = val; override.readBack = back; break; }
  }
  override.accepted = override.hasOwnProperty('usedValue');
  cause.resizeAfterOverrideWrite = tryW(c.mainContent, 'Main resize (min 해제)', () => { c.mainContent.resize(c.mainContent.width, CAUSE_TEST_HEIGHT); });
  cause.heightAfterOverride = r2(c.mainContent.height);
  cause.minHeightWasCause = cause.clampedToMinHeight && override.accepted && near(cause.heightAfterOverride, CAUSE_TEST_HEIGHT);
  if (cause.minHeightWasCause) {
    cause.explanation = 'Main 에 minHeight ' + minBefore + ' 이 걸려 있어 ' + CAUSE_TEST_HEIGHT + ' 로 resize 해도 ' + cause.heightWithMinIntact +
      ' 에서 멈췄다. minHeight 를 ' + override.usedValue + ' 로 풀자 ' + cause.heightAfterOverride + ' 가 됐다';
  } else if (typeof minBefore !== 'number') {
    cause.explanation = 'Main 에 숫자 minHeight 가 없다 (' + JSON.stringify(minBefore) + ') — 원인은 다른 곳이다';
  } else if (!override.accepted) {
    cause.explanation = 'minHeight ' + minBefore + ' 에서 멈춘 것은 확인했지만 minHeight 해제 쓰기가 거부됐다: ' +
      JSON.stringify(override.tried.map(t => t.write.error || t.readBack));
  } else {
    cause.explanation = 'minHeight 를 풀어도 높이가 ' + cause.heightAfterOverride + ' 이다 — 다른 제약이 더 있다';
  }
  R.minHeightProbe = { cause, override };

  /* ---------- 뷰포트 828 / 838 / 848 ---------- */
  const headerBefore = abs(c.header), asideBefore = abs(c.aside);
  R.viewports = [];
  for (const H of VIEWPORTS) {
    const w = tryW(c.mainContent, 'Main resize ' + H, () => { c.mainContent.resize(c.mainContent.width, H); });
    const v = visibility(c);
    const frameH = r2(c.main.height);
    const asideAbs = abs(c.aside), frameAbs = abs(c.main);
    const row = {
      requested: H, resizeWrite: w, actualMainHeight: r2(c.mainContent.height),
      resizeAccepted: w.ok && near(c.mainContent.height, H),
      sizingV: safeGet(c.mainContent, 'layoutSizingVertical'), clipsContent: safeGet(c.mainContent, 'clipsContent'),
      overflowDirection: safeGet(c.mainContent, 'overflowDirection'),
      contentContainerSizing: safeGet(c.contentContainer, 'layoutSizingVertical'), contentContainerHeight: r2(c.contentContainer.height),
      rows: v.rows,
      row1VisibleActual: v.rows[0] ? v.rows[0].visiblePx : null, row2VisibleActual: v.rows[1] ? v.rows[1].visiblePx : null,
      row3VisibleActual: v.rows[2] ? v.rows[2].visiblePx : null,
      footerVisibleActual: v.footerVisible, footerVisiblePx: v.footerVisiblePx,
      maxScrollDistance: v.maxScrollDistance, scrollContentHeight: v.scrollContentHeight,
      bottomPaddingAtEnd: v.bottomPaddingAtEnd, footerBottomToEnd: v.footerBottomToEnd,
      clippingIssue: v.contentWiderThanViewport === true,
      mainFrameHeight: frameH, mainFrameShrankBelowShell: frameH < SHELL_HEIGHT - 0.5,
      asideSticksOutOfFrame: !!asideAbs && !!frameAbs && asideAbs.y + asideAbs.h > frameAbs.y + frameAbs.h + 0.5,
      headerBoundsUnchanged: JSON.stringify(abs(c.header)) === JSON.stringify(headerBefore),
      asideBoundsUnchanged: JSON.stringify(abs(c.aside)) === JSON.stringify(asideBefore),
      measurementMethod: v.method
    };
    row.meetsVisibilityGoal = row.resizeAccepted && v.rows[0] && v.rows[0].fullyVisible && v.rows[1] && v.rows[1].fullyVisible &&
      row.row3VisibleActual >= SLICE_MIN - 0.5 && row.row3VisibleActual <= SLICE_MAX + 0.5 && !row.footerVisibleActual;
    R.viewports.push(row);
  }

  /* ---------- 최상위 프레임 1024 유지안 ---------- */
  const shell = { note: 'Main 은 마지막 뷰포트 높이 그대로 두고, 1002:2 를 FIXED 1024 로 둔다' };
  shell.frameConstraintsBefore = constraintsOf(c.main);
  const lastVp = VIEWPORTS[VIEWPORTS.length - 1];
  const target = R.viewports.filter(x => x.requested === CAUSE_TEST_HEIGHT)[0] ? CAUSE_TEST_HEIGHT : lastVp;
  shell.mainViewport = target;
  shell.resizeMainWrite = tryW(c.mainContent, 'Main resize ' + target + ' (shell 실험)', () => { c.mainContent.resize(c.mainContent.width, target); });
  shell.frameFixedWrite = tryW(c.main, '1002:2 FIXED', () => { c.main.layoutSizingVertical = 'FIXED'; });
  shell.frameResizeWrite = tryW(c.main, '1002:2 resize 1024', () => { c.main.resize(c.main.width, SHELL_HEIGHT); });
  shell.frameHeight = r2(c.main.height);
  shell.frameSizingV = safeGet(c.main, 'layoutSizingVertical');
  shell.mainHeight = r2(c.mainContent.height);
  const fAbs = abs(c.main), aAbs = abs(c.aside), mAbs = abs(c.mainContent);
  shell.asideInsideFrame = !!fAbs && !!aAbs && aAbs.y + aAbs.h <= fAbs.y + fAbs.h + 0.5;
  shell.headerBoundsUnchanged = JSON.stringify(abs(c.header)) === JSON.stringify(headerBefore);
  shell.blankBelowMainPx = fAbs && mAbs ? r2((fAbs.y + fAbs.h) - (mAbs.y + mAbs.h)) : null;
  shell.visibilityInShell = visibility(c).rows.map(r => r.visiblePx);
  shell.shell1024Possible = shell.frameFixedWrite.ok && shell.frameResizeWrite.ok && near(shell.frameHeight, SHELL_HEIGHT) &&
    near(shell.mainHeight, target) && shell.asideInsideFrame && shell.headerBoundsUnchanged;
  shell.designConflict = shell.blankBelowMainPx > 0.5
    ? ('1002:2 를 1024 로 두고 Main 을 ' + target + ' 로 두면 Main 아래 ' + shell.blankBelowMainPx +
       'px 가 빈 영역으로 남는다. 스크롤 영역이 화면 바닥까지 닿지 않는다 — 화면 높이 1024 에서 "2줄 + 조각" 목표와 "화면 끝까지 스크롤" 은 동시에 성립하지 않는다')
    : null;
  /* 참고: Main 을 화면 끝까지(1024) 채우면 보이는 양 */
  shell.fillToShellWrite = tryW(c.mainContent, 'Main resize 1024 (참고)', () => { c.mainContent.resize(c.mainContent.width, SHELL_HEIGHT); });
  shell.visibilityIfMainFillsShell = visibility(c).rows.map(r => r.visiblePx);
  shell.requiredProperties = shell.shell1024Possible ? {
    mainContent: { layoutSizingVertical: 'FIXED', minHeight: override.usedValue, height: target, clipsContent: true, overflowDirection: 'VERTICAL' },
    mainFrame: { layoutSizingVertical: 'FIXED', height: SHELL_HEIGHT },
    aside: '변경 없음 (1024)', header: '변경 없음'
  } : null;
  R.shell = shell;

  /* ---------- Header 불투명도 ---------- */
  const fills = (safeGet(c.header, 'fills') || []).filter(f => f && f.visible !== false);
  const fillOpacities = fills.map(f => (typeof f.opacity === 'number' ? f.opacity : 1) * (f.color && typeof f.color.a === 'number' ? f.color.a : 1));
  const nodeOpacity = typeof safeGet(c.header, 'opacity') === 'number' ? safeGet(c.header, 'opacity') : 1;
  const effects = (safeGet(c.header, 'effects') || []).filter(e => e && e.visible !== false).map(e => ({ type: e.type, radius: e.radius }));
  const frameKids = kids(c.main);
  const hAbs = abs(c.header), mcAbs = abs(c.mainContent);
  const maxFill = fillOpacities.length ? Math.max.apply(null, fillOpacities) : 0;
  R.headerOpacity = {
    headerFills: fills.map(f => ({ type: f.type, opacity: f.opacity, colorAlpha: f.color ? f.color.a : undefined })),
    headerFillOpacity: r2(maxFill), headerNodeOpacity: r2(nodeOpacity), effectiveOpacity: r2(maxFill * nodeOpacity),
    effects, hasBackgroundBlur: effects.some(e => e.type === 'BACKGROUND_BLUR'),
    headerAboveMain: frameKids.indexOf(c.header) > frameKids.indexOf(c.mainContent),
    contentPassesUnderHeader: !!hAbs && !!mcAbs && hAbs.y < mcAbs.y + mcAbs.h && hAbs.y + hAbs.h > mcAbs.y &&
      hAbs.x < mcAbs.x + mcAbs.w && hAbs.x + hAbs.w > mcAbs.x && safeGet(c.mainContent, 'overflowDirection') === 'VERTICAL',
    contentVisibleThroughHeader: maxFill * nodeOpacity < 0.99
  };
  const ho = R.headerOpacity;
  ho.visualRisk = !ho.contentPassesUnderHeader ? '콘텐츠가 Header 아래를 지나지 않는다'
    : (ho.contentVisibleThroughHeader
        ? ('Header 배경 실효 불투명도 ' + ho.effectiveOpacity + (ho.hasBackgroundBlur ? ' + 배경 블러' : ', 블러 없음') +
           ' — 스크롤하면 카드·KPI 가 Header 뒤로 비쳐 보인다' + (ho.hasBackgroundBlur ? ' (블러로 흐려져 의도된 반투명 헤더일 수 있다)' : ' (글자가 겹쳐 읽기 어려울 수 있다)'))
        : 'Header 배경이 불투명해 지나가는 콘텐츠를 가린다');
} catch (e) {
  aborted = true; abortReason = e.message; errors.push('실험 중단: ' + e.message);
}

/* ---------- 정리 ---------- */
const cleanup = { tempNodesCreated: clone ? [clone.id] : [], tempNodesRemoved: [], failed: [] };
if (clone) { try { if (!clone.removed) clone.remove(); cleanup.tempNodesRemoved.push(clone.id); } catch (e) { cleanup.failed.push({ id: clone.id, error: e.message }); } }
cleanup.strayTempNodes = kids(figma.currentPage).filter(n => typeof n.name === 'string' && n.name.indexOf(PROBE_TAG) === 0).map(n => n.id);
const realAfter = await realSnapshot();
cleanup.realNodesMutated = realAfter !== realBefore;
if (cleanup.realNodesMutated) errors.push('실제 노드 스냅샷이 달라졌다 — 결과를 신뢰하지 말 것');
if (cleanup.failed.length || cleanup.strayTempNodes.length) errors.push("임시 노드가 남았다 — '" + PROBE_TAG + "' 를 지워주세요");

/* ---------- 추천 — 사용자 조건을 전부 만족할 때만 ---------- */
const VP = R.viewports || [];
const S = R.shell || {};
const candidates = VP.filter(v => v.meetsVisibilityGoal && !v.clippingIssue && near(v.bottomPaddingAtEnd, R.step1 ? pads(real.mainContent).b : NaN));
const rec = S.shell1024Possible ? candidates.filter(v => v.requested === S.mainViewport)[0] || null : null;
const recommendedViewport = rec ? {
  height: rec.requested, row3VisibleActual: rec.row3VisibleActual,
  conditions: { resizeAccepted: rec.resizeAccepted, actualEqualsRequested: near(rec.actualMainHeight, rec.requested),
    row1Full: rec.rows[0].fullyVisible, row2Full: rec.rows[1].fullyVisible, row3InRange: true, shell1024: S.shell1024Possible,
    asideInsideFrame: S.asideInsideFrame, bottomPaddingOk: true, noClipping: !rec.clippingIssue },
  caveat: S.designConflict
} : null;
const whyNoRecommendation = rec ? null : (
  !S.shell1024Possible ? '1002:2 를 1024 로 유지하는 구성이 실측으로 확인되지 않았다'
    : (candidates.length === 0 ? '조건(1·2줄 전부, 3줄 20~40px, footer 안 보임, 아래 padding 정상, 잘림 없음)을 모두 만족하는 높이가 없다'
      : '조건을 만족한 높이(' + candidates.map(v => v.requested).join(', ') + ')가 shell 실험 높이(' + S.mainViewport + ')와 다르다'));

const MH = R.minHeightProbe || {};
const HO = R.headerOpacity || {};
const gate = {
  notAborted: !aborted,
  cloneMatchesOriginal: R.cloneMatchesOriginal === true,
  minHeightCauseResolved: !!MH.cause && typeof MH.cause.explanation === 'string' && (MH.cause.minHeightWasCause === true || MH.cause.clampedToMinHeight === false),
  minHeightOverrideAccepted: !!MH.override && MH.override.accepted === true,
  viewport828ActuallyApplied: VP.some(v => v.requested === 828 && v.resizeAccepted),
  viewport838ActuallyApplied: VP.some(v => v.requested === 838 && v.resizeAccepted),
  viewport848ActuallyApplied: VP.some(v => v.requested === 848 && v.resizeAccepted),
  actualVisibilityMeasured: VP.length === VIEWPORTS.length && VP.every(v => v.rows && v.rows.length >= 3 && v.rows.every(r => typeof r.visiblePx === 'number')),
  shellHeightBehaviorResolved: VP.length > 0 && VP.every(v => typeof v.mainFrameHeight === 'number' && typeof v.asideSticksOutOfFrame === 'boolean'),
  shell1024OptionResolved: typeof S.shell1024Possible === 'boolean',
  asideContainmentResolved: typeof S.asideInsideFrame === 'boolean',
  headerOpacityRiskResolved: typeof HO.contentVisibleThroughHeader === 'boolean' && typeof HO.visualRisk === 'string',
  tempNodesRemoved: cleanup.tempNodesCreated.length === 1 && cleanup.failed.length === 0 && cleanup.strayTempNodes.length === 0,
  realNodesNotMutated: cleanup.realNodesMutated === false,
  noErrors: errors.length === 0
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'PROBE',
  realMutationCount: cleanup.realNodesMutated ? 'SNAPSHOT_CHANGED' : 0, tempMutationCount,
  aborted, abortReason,
  gate, gatePassed, gateFailures: Object.keys(gate).filter(k => !gate[k]),
  step1Constraints: R.step1, cloneMatchesOriginal: R.cloneMatchesOriginal,
  minHeightProbe: R.minHeightProbe,
  viewportComparisons: VP,
  shell1024Probe: R.shell,
  headerOpacityProbe: R.headerOpacity,
  recommendedViewport, whyNoRecommendation,
  cleanup,
  notes, errorCount: errors.length, errors: errors.slice(0, 10), writeLogSample: log.slice(0, 40),
  nextStep: gatePassed ? 'probe 통과. shell 1024 와 뷰포트 높이의 충돌(빈 영역) 여부를 보고 F2-B 구조를 결정합니다.' : '실패한 gate 항목을 확인해주세요.'
});
