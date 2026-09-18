/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 34
 * Phase I — Local Text Style 8개(Gothic A1 → Pretendard) fontName 만 교체
 *
 * 대상      Local Text Style 8개(역할 이름으로 매칭: Page title / Section title / Card title / Body /
 *           Label / Caption / Chip / KPI number). 스타일 객체의 fontName 만 바꾼다.
 * 바꾸지    size · lineHeight · letterSpacing · style name · style id · fill · 변수 연결 · 정렬 ·
 * 않는 것   autoResize · 텍스트 내용 · component property · instance override — 전부 그대로.
 * 직접 수정 individual TEXT node · component master · instance · backup frame · legacy text ·
 * 금지      old screens · 파일 전체 unstyled text 730개. 이 스크립트는 스타일 8개 객체만 만진다.
 *
 * 중요      Local Text Style 은 파일 전체에서 공유되는 객체다. 메인 화면 209개 노드 외에도 같은
 *           스타일을 참조하는 다른 화면 · legacy · backup 의 텍스트도 스타일을 통해 자동으로
 *           Pretendard 를 상속한다 (개별 노드를 직접 만지지는 않는다). DRY_RUN 결과의
 *           `scopeImpact` 에 영향 범위를 그대로 보고한다 — 숨기지 않는다.
 *
 * 레이아웃  메인 화면 안에서 이 8개 스타일을 쓰는 텍스트를 포함한 모든 auto-layout 컨테이너를 찾아
 *           (부모 체인을 타고 올라가며 표시) FIXED 축의 free space(= 크기 − 필요한 크기)를 잰다.
 *           APPLY 뒤 같은 컨테이너의 free space 가 음수로 넘어가면(overflow) 실패 처리한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + Pretendard 로드 가능 여부 + 레이아웃 기준값만. mutation 0.
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 *   3) 실패 시 스타일 8개를 원래 Gothic A1 로 되돌리고 재확인한다.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '34-v1-font-pretendard-style-swap';

const IDS = {
  mainFrame: '1002:2',
  backups: ['1044:47', '1019:2']
};
const TARGET_STYLES = ['Regular', 'Medium', 'SemiBold', 'Bold'];
const STYLE_ALIASES = { SemiBold: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold'], Regular: ['Regular', 'Normal', 'Book'], Medium: ['Medium'], Bold: ['Bold'] };
const WEIGHT_TO_STYLE = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
const GOTHIC_STYLE_WEIGHT = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };
const ROLES = [
  { role: 'Page title', size: 28, line: 36, weight: 700 },
  { role: 'Section title', size: 20, line: 28, weight: 700 },
  { role: 'Card title', size: 16, line: 24, weight: 600 },
  { role: 'Body', size: 14, line: 20, weight: 400 },
  { role: 'Label', size: 13, line: 18, weight: 500 },
  { role: 'Caption', size: 12, line: 16, weight: 400 },
  { role: 'Chip', size: 12, line: 16, weight: 600 },
  { role: 'KPI number', size: 28, line: 34, weight: 700 }
];
const MAIN_FRAME_TEXT_EXPECT = 209;
const BASELINE_KEY = 'joob.34.baseline';
const TIGHT_THRESHOLD = 20; // free space 이 이 미만이면 "주의 필요"로 따로 낸다

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function walk(n, fn) { fn(n); for (const c of kids(n)) walk(c, fn); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const lineOf = lh => (lh && typeof lh === 'object' ? (lh.unit === 'PIXELS' ? lh.value : lh.unit === 'PERCENT' ? lh.value + '%' : lh.unit) : lh);

function hugSize(node, sizes) {
  const p = pads(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const gap = sg(node, 'itemSpacing') || 0, sb = sg(node, 'primaryAxisAlignItems') === 'SPACE_BETWEEN';
  const sumW = sizes.reduce((a, z) => a + z.w, 0), sumH = sizes.reduce((a, z) => a + z.h, 0);
  const maxW = Math.max.apply(null, [0].concat(sizes.map(z => z.w))), maxH = Math.max.apply(null, [0].concat(sizes.map(z => z.h)));
  const gaps = sb ? 0 : gap * Math.max(0, sizes.length - 1);
  const cW = horizontal ? sumW + gaps : maxW, cH = horizontal ? maxH : sumH + gaps;
  return { neededW: r2(p.l + p.r + cW), neededH: r2(p.t + p.b + cH) };
}

function styleSnap(s) { return { id: s.id, name: s.name, family: s.fontName.family, style: s.fontName.style, size: s.fontSize, line: lineOf(s.lineHeight), letter: JSON.stringify(s.letterSpacing) }; }

/* ======== 0. 대상 텍스트 스타일 8개 ======== */
const allStyles = await figma.getLocalTextStylesAsync();
const styleByRole = {};
for (const s of allStyles) if (ROLES.some(r => r.role === s.name)) styleByRole[s.name] = s;
const stylesBefore = ROLES.map(r => {
  const s = styleByRole[r.role];
  return s ? Object.assign({ role: r.role, spec: r.size + '/' + r.line + '/' + r.weight }, styleSnap(s)) : { role: r.role, found: false };
});
const blockers = [], pf = {};
function gate(key, cond, why) { pf[key] = !!cond; if (!cond) blockers.push(key + ' — ' + why); }

gate('eightStylesFound', ROLES.every(r => !!styleByRole[r.role]), '역할 이름으로 찾은 스타일이 8개가 아니다: ' + Object.keys(styleByRole).join(','));
if (pf.eightStylesFound) {
  gate('allCurrentlyGothicA1', stylesBefore.every(s => s.family === 'Gothic A1'), '이미 Gothic A1 이 아닌 스타일이 있다: ' + stylesBefore.filter(s => s.family !== 'Gothic A1').map(s => s.role + '=' + s.family).join(','));
  gate('allRoleSpecMatchesCurrent', ROLES.every((r, i) => {
    const s = stylesBefore[i]; const w = GOTHIC_STYLE_WEIGHT[s.style] || null;
    return s.size === r.size && s.line === r.line && w === r.weight;
  }), '현재 스타일 값이 스펙(size/line/weight)과 다르다');
}

/* ======== 1. Pretendard 사용 가능 여부 ======== */
let fonts = [], listError = null;
try { fonts = await figma.listAvailableFontsAsync(); } catch (e) { listError = e.message; errors.push('listAvailableFontsAsync 실패: ' + e.message); }
const families = {};
for (const f of fonts) { const fam = f.fontName.family; (families[fam] = families[fam] || []).push(f.fontName.style); }
const pretendardFamilies = Object.keys(families).filter(n => /pretendard/i.test(n)).sort();
const chosenFamily = pretendardFamilies.indexOf('Pretendard') >= 0 ? 'Pretendard'
  : pretendardFamilies.indexOf('Pretendard Variable') >= 0 ? 'Pretendard Variable' : (pretendardFamilies[0] || null);

async function tryLoad(family, style) { try { await figma.loadFontAsync({ family, style }); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }
const loadResults = {};
if (chosenFamily) {
  for (const t of TARGET_STYLES) {
    const available = families[chosenFamily] || [];
    const exact = available.indexOf(t) >= 0 ? t : null;
    const alias = exact ? null : (STYLE_ALIASES[t] || []).find(a => available.indexOf(a) >= 0) || null;
    const styleToLoad = exact || alias || t;
    const r = await tryLoad(chosenFamily, styleToLoad);
    loadResults[t] = { family: chosenFamily, styleName: styleToLoad, loaded: r.ok, error: r.error || null };
  }
}
gate('pretendardFamilyFound', pretendardFamilies.length > 0, 'Pretendard 계열 family 를 찾지 못했다');
gate('allFourWeightsLoadable', !!chosenFamily && TARGET_STYLES.every(t => loadResults[t] && loadResults[t].loaded), '4개 굵기 중 로드 안 되는 것이 있다: ' + JSON.stringify(loadResults));

/* Gothic A1 도 계속 로드 가능한지 (rollback 대비) */
const gothicLoad = {};
for (const t of TARGET_STYLES) gothicLoad[t] = (await tryLoad('Gothic A1', t)).ok;
gate('gothicA1StillLoadable', TARGET_STYLES.every(t => gothicLoad[t]), 'rollback 에 필요한 Gothic A1 굵기를 로드할 수 없다');

/* ======== 2. 역할 → Pretendard 매핑 ======== */
const mapping = ROLES.map(r => {
  const target = WEIGHT_TO_STYLE[r.weight];
  const lr = loadResults[target];
  return { role: r.role, weight: r.weight, targetStyleKey: target, targetStyleName: lr ? lr.styleName : null, mappable: !!lr && lr.loaded };
});
gate('allRolesMappable', mapping.every(m => m.mappable), '매핑 불가한 역할이 있다: ' + mapping.filter(m => !m.mappable).map(m => m.role).join(','));

/* ======== 3. 메인 화면 텍스트 노드 스캔 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
gate('mainFrameFound', !!mainFrame, IDS.mainFrame + ' 를 찾지 못했다');
await figma.loadAllPagesAsync();

const targetStyleIds = new Set(Object.values(styleByRole).map(s => s.id));
const styleIdToRole = {}; for (const r of ROLES) if (styleByRole[r.role]) styleIdToRole[styleByRole[r.role].id] = r.role;

const mainTexts = mainFrame ? mainFrame.findAllWithCriteria({ types: ['TEXT'] }) : [];
let mainWithTarget = 0, mainWithoutStyle = 0, mainOtherStyle = 0;
const eligibleNodeIds = [];
const preexisting = [];
for (const t of mainTexts) {
  const sid = t.textStyleId;
  if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) {
    mainWithTarget++;
    eligibleNodeIds.push(t.id);
    const role = styleIdToRole[sid];
    const expectedStyle = styleByRole[role];
    const fn = t.fontName;
    if (fn && fn !== figma.mixed && expectedStyle && (fn.family !== expectedStyle.fontName.family || fn.style !== expectedStyle.fontName.style)) {
      preexisting.push({ id: t.id, role, nodeFont: fn.family + ' ' + fn.style, styleFont: expectedStyle.fontName.family + ' ' + expectedStyle.fontName.style });
    }
  } else if (!sid || sid === figma.mixed) mainWithoutStyle++;
  else mainOtherStyle++;
}
gate('mainFrameTextCount209', mainTexts.length === MAIN_FRAME_TEXT_EXPECT, '메인 화면 텍스트 노드 수가 209 가 아니다: ' + mainTexts.length);
gate('mainFrameWithoutStyleZero', mainWithoutStyle === 0, '스타일 미연결 텍스트가 있다: ' + mainWithoutStyle);
if (preexisting.length) notes.push('기존에 이미 스타일과 다른 fontName override 를 가진 노드 ' + preexisting.length + '개 — 이 노드들은 상속 확인에서 제외한다: ' + preexisting.map(p => p.id).join(','));

/* 파일 전체 영향 범위 (정보용 — 막지 않는다) */
const allTexts = figma.root.findAllWithCriteria({ types: ['TEXT'] });
let fileWithTarget = 0;
for (const t of allTexts) { const sid = t.textStyleId; if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) fileWithTarget++; }
const backupCounts = {};
for (const id of IDS.backups) {
  const b = await figma.getNodeByIdAsync(id);
  let n = 0;
  if (b) { const bt = b.findAllWithCriteria ? b.findAllWithCriteria({ types: ['TEXT'] }) : []; for (const t of bt) { const sid = t.textStyleId; if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) n++; } }
  backupCounts[id] = b ? n : null;
}
const scopeImpact = {
  mainFrameEligible: mainWithTarget,
  fileWideEligible: fileWithTarget,
  otherScreensAffected: fileWithTarget - mainWithTarget,
  backupFramesAffected: backupCounts,
  note: 'Local Text Style 은 공유 객체라 위 다른 화면/backup 의 텍스트도 스타일을 통해 자동으로 Pretendard 를 상속한다 (직접 수정 아님).'
};

/* ======== 4. 레이아웃 기준값 (FIXED 축 free space) ======== */
const containerIds = new Set();
for (const nid of eligibleNodeIds) {
  const node = await figma.getNodeByIdAsync(nid);
  let x = node ? node.parent : null;
  while (x && x.id !== IDS.mainFrame) {
    if (sg(x, 'layoutMode') === 'HORIZONTAL' || sg(x, 'layoutMode') === 'VERTICAL') containerIds.add(x.id);
    x = x.parent;
  }
  if (mainFrame && (sg(mainFrame, 'layoutMode') === 'HORIZONTAL' || sg(mainFrame, 'layoutMode') === 'VERTICAL')) containerIds.add(IDS.mainFrame);
}
async function layoutBaseline() {
  const rows = [];
  for (const id of containerIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node) { rows.push({ id, missing: true }); continue; }
    const sizingH = sg(node, 'layoutSizingHorizontal'), sizingV = sg(node, 'layoutSizingVertical');
    const f = flow(node), sizes = f.map(c => ({ w: c.width, h: c.height }));
    const hs = hugSize(node, sizes);
    const freeW = sizingH === 'FIXED' ? r2(node.width - hs.neededW) : null;
    const freeH = sizingV === 'FIXED' ? r2(node.height - hs.neededH) : null;
    rows.push({ id, name: node.name, layoutMode: sg(node, 'layoutMode'), sizingH, sizingV, size: size(node), childCount: f.length, freeW, freeH });
  }
  return rows;
}
const layoutBefore = await layoutBaseline();
const freeValues = layoutBefore.reduce((arr, r) => { if (typeof r.freeW === 'number') arr.push(r.freeW); if (typeof r.freeH === 'number') arr.push(r.freeH); return arr; }, []);
const minFreeSpace = freeValues.length ? Math.min.apply(null, freeValues) : null;
const tightContainers = layoutBefore.filter(r => (typeof r.freeW === 'number' && r.freeW < TIGHT_THRESHOLD) || (typeof r.freeH === 'number' && r.freeH < TIGHT_THRESHOLD));
gate('layoutBaselineCaptured', layoutBefore.every(r => !r.missing), '레이아웃 기준값 수집 중 못 찾은 노드가 있다');
gate('noExistingNegativeFreeSpace', freeValues.every(v => v >= -0.5), '지금 이미 overflow 인 컨테이너가 있다 (교체와 무관한 기존 문제)');

/* ======== 5. 비파괴 확인 (DRY_RUN) ======== */
const stylesAfterCheck = await figma.getLocalTextStylesAsync();
const unchanged = ROLES.every(r => {
  const before = stylesBefore.find(s => s.role === r.role), now = stylesAfterCheck.find(s => s.name === r.role);
  return before && now && before.family === now.fontName.family && before.style === now.fontName.style && before.size === now.fontSize;
});
if (!unchanged) errors.push('DRY_RUN 인데 텍스트 스타일이 실행 전과 다르다');

const preflightPassed = blockers.length === 0;

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers, preflight: pf,
    summary: {
      eightStylesFound: pf.eightStylesFound, targetStyleCount: Object.keys(styleByRole).length,
      pretendard: { familiesFound: pretendardFamilies, chosenFamily, allFourWeightsLoadable: pf.allFourWeightsLoadable },
      textNodes: { mainFrameTotal: mainTexts.length, mainFrameEligible: mainWithTarget, mainFrameWithoutStyle: mainWithoutStyle, mainFrameOtherStyle: mainOtherStyle, preexistingOverrideCount: preexisting.length },
      layoutBaseline: { containerCount: layoutBefore.length, minFreeSpace, tightContainerCount: tightContainers.length },
      mutationCount, blockerCount: blockers.length
    },
    currentTextStyles: stylesBefore,
    loadResults, mapping,
    scopeImpact,
    layoutContainers: layoutBefore, tightContainers,
    preexistingOverrides: preexisting,
    mutationCount, notes, errorCount: errors.length, errors
  });
}

/* ======== 6. APPLY ======== */
const applied = [];
let failure = null;
try {
  for (const r of ROLES) {
    const s = styleByRole[r.role];
    const m = mapping.find(mm => mm.role === r.role);
    await figma.loadFontAsync({ family: chosenFamily, style: m.targetStyleName });
    s.fontName = { family: chosenFamily, style: m.targetStyleName };
    mutationCount++;
    applied.push({ role: r.role, id: s.id, to: chosenFamily + ' ' + m.targetStyleName });
  }
} catch (e) { failure = e && e.message ? e.message : String(e); }

async function rollback(reason, extra) {
  const steps = [];
  for (const before of stylesBefore) {
    if (!before.id) continue;
    const s = styleByRole[before.role];
    if (!s) { steps.push(before.role + ': 스타일을 다시 못 찾음'); continue; }
    try {
      await figma.loadFontAsync({ family: before.family, style: before.style });
      s.fontName = { family: before.family, style: before.style };
      steps.push(before.role + ' → ' + before.family + ' ' + before.style + ' 복원');
    } catch (e) { steps.push(before.role + ' 복원 실패: ' + e.message); }
  }
  const after = await figma.getLocalTextStylesAsync();
  const restored = stylesBefore.every(b => {
    const now = after.find(x => x.name === b.role);
    return now && now.fontName.family === b.family && now.fontName.style === b.style && now.fontSize === b.size;
  });
  return out({
    scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackSteps: steps,
    rollbackClean: restored, extra: extra || null, mutationCount, errorCount: 1
  });
}
if (failure) return await rollback(failure, null);

/* ======== 7. 되읽기 ======== */
const c = {};
const stylesAfter = await figma.getLocalTextStylesAsync();
c.allEightUpdatedToPretendard = ROLES.every(r => {
  const m = mapping.find(mm => mm.role === r.role), now = stylesAfter.find(x => x.name === r.role);
  return now && now.fontName.family === chosenFamily && now.fontName.style === m.targetStyleName;
});
c.allNonFontFieldsUnchanged = ROLES.every((r, i) => {
  const before = stylesBefore[i], now = stylesAfter.find(x => x.name === r.role);
  return now && now.id === before.id && now.name === before.name && now.fontSize === before.size && lineOf(now.lineHeight) === before.line && JSON.stringify(now.letterSpacing) === before.letter;
});

let inheritedCount = 0;
const inheritFail = [];
for (const nid of eligibleNodeIds) {
  if (preexisting.some(p => p.id === nid)) continue;
  const node = await figma.getNodeByIdAsync(nid);
  const sid = node ? node.textStyleId : null;
  const role = sid ? styleIdToRole[sid] : null;
  const m = role ? mapping.find(mm => mm.role === role) : null;
  const fn = node ? node.fontName : null;
  if (m && fn && fn !== figma.mixed && fn.family === chosenFamily && fn.style === m.targetStyleName) inheritedCount++;
  else inheritFail.push(nid);
}
const eligibleTotal = eligibleNodeIds.length - preexisting.length;
c.allEligibleTextInheritsPretendard = eligibleTotal > 0 && inheritedCount === eligibleTotal;
c.noDirectNodeOverridesCreated = true; // 이 스크립트는 스타일 객체만 set 했다 — node.fontName 을 만진 적이 없다

const layoutAfter = await layoutBaseline();
const newOverflow = [];
for (const before of layoutBefore) {
  const after = layoutAfter.find(a => a.id === before.id);
  if (!after) continue;
  if (typeof before.freeW === 'number' && before.freeW >= 0 && typeof after.freeW === 'number' && after.freeW < 0) newOverflow.push({ id: before.id, name: before.name, axis: 'W', before: before.freeW, after: after.freeW });
  if (typeof before.freeH === 'number' && before.freeH >= 0 && typeof after.freeH === 'number' && after.freeH < 0) newOverflow.push({ id: before.id, name: before.name, axis: 'H', before: before.freeH, after: after.freeH });
}
c.noNewOverflow = newOverflow.length === 0;
c.noErrors = errors.length === 0;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
if (failedCriteria.length) return await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '), { checks: c, newOverflow, inheritFail: inheritFail.slice(0, 30) });

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
    styleIds: stylesBefore.map(s => s.id), applied, chosenFamily,
    layoutBefore, layoutAfter, scopeImpact
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: true, failedCriteria: [], checks: c,
  applied, chosenFamily, mapping,
  textNodes: { eligibleTotal, inheritedCount, preexistingSkipped: preexisting.length },
  layoutBefore, layoutAfter, newOverflow, scopeImpact,
  mutationCount, notes, errorCount: errors.length, errors
});
