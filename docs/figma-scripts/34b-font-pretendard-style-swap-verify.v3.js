/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 34b v3
 * Phase I 검증 (읽기 전용)
 *
 * v2 대비 변경점 (v1 · v2 는 보존, 이 파일은 별도)
 *   v2 는 `chosenFamily` 를 **baseline(pluginData) 에서만** 가져왔다. baseline 을 못 찾으면
 *   `chosenFamily = null` 이 되고, 그 값에 의존하던 `allEightArePretendard` ·
 *   `mainFrameInheritsPretendard` · `backupImpact.nowPretendard` 가 실제 측정값과 무관하게
 *   전부 false/0 으로 나왔다 — 8개 스타일이 실제로 Pretendard 인데도 "실패"로 오판한 원인.
 *   v3 는 baseline 을 **typography 판정에 아예 쓰지 않는다.** 지금 읽은 fontName.family 를
 *   직접 정규식(`/pretendard/i`)으로 판정한다. baseline 은 있으면 레이아웃 regression 대조에만
 *   보조로 쓰고, 없으면 `warnings` 로만 보고하고 typography/레이아웃 판정에는 영향을 주지 않는다.
 *   `weightsMatchRoles` 도 baseline.applied 대신 34 APPLY 와 같은 STYLE_ALIASES 로 직접 판정한다.
 *   backupImpact 에는 실제 fontName 샘플(최대 8개)을 같이 낸다.
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * baseline 없이도 현재 Figma 상태만으로 전부 검증 가능해야 한다는 게 이 버전의 원칙이다.
 * ========================================================================== */

const SCRIPT_VERSION = '34b-v3-font-pretendard-style-swap-verify';

const IDS = { mainFrame: '1002:2', backups: ['1044:47', '1019:2'] };
const WEIGHT_TO_STYLE = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
const STYLE_ALIASES = { SemiBold: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold'], Regular: ['Regular', 'Normal', 'Book'], Medium: ['Medium'], Bold: ['Bold'] };
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
const BASELINE_KEYS = ['joob.34.baseline.v2', 'joob.34.baseline'];
const PRETENDARD_RE = /pretendard/i;

/* ======== 공통 ======== */
const notes = [];
const warnings = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
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
function scrollAxes(node, sizingH, sizingV) {
  const clips = sg(node, 'clipsContent') === true;
  const dir = sg(node, 'overflowDirection');
  const scrollH = clips && sizingH === 'FIXED' && (dir === 'HORIZONTAL' || dir === 'BOTH');
  const scrollV = clips && sizingV === 'FIXED' && (dir === 'VERTICAL' || dir === 'BOTH');
  return { clipsContent: clips, overflowDirection: dir || null, scrollH, scrollV };
}
function fontOf(fn) { return fn && fn !== figma.mixed ? fn.family + ' ' + fn.style : String(fn); }

/* ======== baseline — best-effort, 아무 typography/레이아웃 판정도 이것에 기대지 않는다 ======== */
let baseline = null, baselineKeyUsed = null;
for (const key of BASELINE_KEYS) {
  try {
    const raw = figma.root.getPluginData(key);
    if (raw) { baseline = JSON.parse(raw); baselineKeyUsed = key; break; }
  } catch (e) { errors.push('기준값 키 ' + key + ' 파싱 실패: ' + e.message); }
}
if (!baseline) warnings.push('34 APPLY 기준값(' + BASELINE_KEYS.join(' 또는 ') + ')을 찾지 못했다 — 34 를 실행한 것과 같은 Scripter/같은 Figma 파일 세션인지 확인. ' +
  '기준값이 없어도 아래 typography·레이아웃 판정은 지금 상태를 직접 재서 그대로 낸다 (기준값 대비 regression 비교만 건너뛴다).');
else if (baseline.scriptVersion !== '34-v2-font-pretendard-style-swap' && baseline.scriptVersion !== '34-v1-font-pretendard-style-swap') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);

const c = {};

/* ======== 1. 텍스트 스타일 8개 — 지금 읽은 값만으로 직접 판정 (baseline 의존 없음) ======== */
const allStyles = await figma.getLocalTextStylesAsync();
const styleByRole = {}; for (const s of allStyles) if (ROLES.some(r => r.role === s.name)) styleByRole[s.name] = s;
c.eightStylesFound = ROLES.every(r => !!styleByRole[r.role]);
c.allEightArePretendard = c.eightStylesFound && ROLES.every(r => PRETENDARD_RE.test(styleByRole[r.role].fontName.family));
c.weightsMatchRoles = c.eightStylesFound && ROLES.every(r => {
  const s = styleByRole[r.role], want = WEIGHT_TO_STYLE[r.weight], aliases = STYLE_ALIASES[want] || [want];
  return aliases.indexOf(s.fontName.style) >= 0;
});
c.sizeLineUnchanged = c.eightStylesFound && ROLES.every(r => { const s = styleByRole[r.role]; return s.fontSize === r.size && lineOf(s.lineHeight) === r.line; });

const measuredStyles = ROLES.map(r => { const s = styleByRole[r.role]; return s ? { role: r.role, font: fontOf(s.fontName), size: s.fontSize, line: lineOf(s.lineHeight), letter: JSON.stringify(s.letterSpacing), styleId: s.id } : { role: r.role, found: false }; });
const measuredFamilies = c.eightStylesFound ? Array.from(new Set(ROLES.map(r => styleByRole[r.role].fontName.family))) : [];
if (measuredFamilies.length > 1) warnings.push('8개 스타일의 family 가 서로 다르다 (일부만 교체됐을 수 있다): ' + measuredFamilies.join(', '));

/* ======== 2. 메인 화면 텍스트 상속 — fn.family 를 직접 정규식으로 판정 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
await figma.loadAllPagesAsync();
const targetStyleIds = new Set(Object.values(styleByRole).map(s => s.id));
const styleIdToRole = {}; for (const r of ROLES) if (styleByRole[r.role]) styleIdToRole[styleByRole[r.role].id] = r.role;
const mainTexts = mainFrame ? mainFrame.findAllWithCriteria({ types: ['TEXT'] }) : [];
let mainWithTarget = 0, mainWithoutStyle = 0, inherited = 0, mismatched = [];
const eligibleIds = [];
for (const t of mainTexts) {
  const sid = t.textStyleId;
  if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) {
    mainWithTarget++; eligibleIds.push(t.id);
    const role = styleIdToRole[sid], fn = t.fontName;
    if (fn && fn !== figma.mixed && PRETENDARD_RE.test(fn.family)) inherited++;
    else mismatched.push({ id: t.id, role, font: fontOf(fn) });
  } else if (!sid || sid === figma.mixed) mainWithoutStyle++;
}
c.mainFrameTextCount209 = mainTexts.length === MAIN_FRAME_TEXT_EXPECT;
c.mainFrameWithoutStyleZero = mainWithoutStyle === 0;
c.mainFrameInheritsPretendard = mainWithTarget > 0 && inherited === mainWithTarget;

/* ======== 3. 레이아웃 — 컨테이너를 직접 다시 찾는다 (baseline 없이도 동작) ======== */
const containerIds = new Set();
for (const nid of eligibleIds) {
  const node = await figma.getNodeByIdAsync(nid);
  let x = node ? node.parent : null;
  while (x && x.id !== IDS.mainFrame) { if (sg(x, 'layoutMode') === 'HORIZONTAL' || sg(x, 'layoutMode') === 'VERTICAL') containerIds.add(x.id); x = x.parent; }
}
const layoutNow = [];
for (const id of containerIds) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) { layoutNow.push({ id, missing: true }); continue; }
  const sizingH = sg(node, 'layoutSizingHorizontal'), sizingV = sg(node, 'layoutSizingVertical');
  const f = flow(node), sizes = f.map(x => ({ w: x.width, h: x.height }));
  const hs = hugSize(node, sizes);
  const freeW = sizingH === 'FIXED' ? r2(node.width - hs.neededW) : null;
  const freeH = sizingV === 'FIXED' ? r2(node.height - hs.neededH) : null;
  const sc = scrollAxes(node, sizingH, sizingV);
  layoutNow.push({ id, name: node.name, size: size(node), freeW, freeH, scrollH: sc.scrollH, scrollV: sc.scrollV });
}
const overflowNow = layoutNow.filter(r => (typeof r.freeW === 'number' && !r.scrollH && r.freeW < -0.5) || (typeof r.freeH === 'number' && !r.scrollV && r.freeH < -0.5));
c.noOverflowNow = overflowNow.length === 0 && layoutNow.every(r => !r.missing);

/* scroll 컨테이너가 baseline(APPLY 직후) 대비 나빠졌는지는 baseline 있을 때만 정보로 보고 — 실패 아님 */
const scrollRegressionsNow = [];
if (baseline && baseline.layoutAfter) {
  for (const row of layoutNow) {
    if (!row.scrollH && !row.scrollV) continue;
    const base = baseline.layoutAfter.find(b => b.id === row.id);
    if (!base) continue;
    if (row.scrollH && typeof base.freeW === 'number' && typeof row.freeW === 'number' && row.freeW < base.freeW - 0.5) scrollRegressionsNow.push({ id: row.id, name: row.name, axis: 'W', baselineAfterApply: base.freeW, now: row.freeW });
    if (row.scrollV && typeof base.freeH === 'number' && typeof row.freeH === 'number' && row.freeH < base.freeH - 0.5) scrollRegressionsNow.push({ id: row.id, name: row.name, axis: 'H', baselineAfterApply: base.freeH, now: row.freeH });
  }
} else if (baseline) { notes.push('기준값에 layoutAfter 가 없어 scroll regression 대조를 건너뛴다'); }

/* ======== 4. backup 영향 — 실제 fontName 을 정규식으로 판정 + 샘플 ======== */
const backupImpact = {};
for (const id of IDS.backups) {
  const b = await figma.getNodeByIdAsync(id);
  let total = 0, pretendard = 0; const samples = [];
  if (b) {
    for (const t of b.findAllWithCriteria({ types: ['TEXT'] })) {
      const sid = t.textStyleId;
      if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) {
        total++;
        const fn = t.fontName, isP = fn && fn !== figma.mixed && PRETENDARD_RE.test(fn.family);
        if (isP) pretendard++;
        if (samples.length < 8) samples.push({ id: t.id, role: styleIdToRole[sid], font: fontOf(fn) });
      }
    }
  }
  backupImpact[id] = { exists: !!b, textUsingTargetStyles: total, nowPretendard: pretendard, samples };
}

c.noErrors = errors.length === 0;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_VERIFY',
  successCriteriaMet, failedCriteria,
  phaseVerdict: successCriteriaMet ? 'Phase I (Pretendard) CLOSED 가능' : 'CLOSED 불가 — failedCriteria 확인',
  checks: c,
  measured: {
    styles: measuredStyles, measuredFamilies,
    mainFrame: { total: mainTexts.length, withTargetStyle: mainWithTarget, withoutStyle: mainWithoutStyle, inherited, mismatched: mismatched.slice(0, 30) },
    layoutNow, overflowNow, scrollRegressionsNow
  },
  backupImpact,
  baselineFrom: baseline ? { key: baselineKeyUsed, scriptVersion: baseline.scriptVersion, at: baseline.at, chosenFamily: baseline.chosenFamily, scopeImpact: baseline.scopeImpact } : null,
  warnings, notes, errorCount: errors.length, errors
});
