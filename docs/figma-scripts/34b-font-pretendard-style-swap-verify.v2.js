/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 34b v2
 * Phase I 검증 (읽기 전용)
 *
 * v1 대비 변경점 (v1 은 보존, 이 파일은 별도)
 *   - 기준값 키를 `joob.34.baseline.v2` 먼저 찾고, 없으면 v1 키(`joob.34.baseline`)로 대체 조회한다
 *     (34 v1 로 이미 APPLY 했었더라도 이 verifier 로 검증할 수 있게).
 *   - 레이아웃 overflow 판정을 34 v2 와 같은 기준으로 바꿨다: clipsContent + overflowDirection +
 *     해당 축 FIXED 조합인 "의도된 scroll 컨테이너"는 음수 free space 를 오류로 보지 않는다
 *     (v1 판정 그대로 쓰면 Main 의 의도된 vertical scroll 을 overflow 오판한다).
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. DRY_RUN 플래그 없이 그대로 실행한다.
 * 34 APPLY 가 성공 직후 남긴 기준값과 비교하되, 스타일 값 · 상속 · 레이아웃은 기준값에 기대지 않고
 * 지금 다시 잰다. 조건은 항목별로 따로 낸다.
 * ========================================================================== */

const SCRIPT_VERSION = '34b-v2-font-pretendard-style-swap-verify';

const IDS = { mainFrame: '1002:2', backups: ['1044:47', '1019:2'] };
const WEIGHT_TO_STYLE = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
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

/* ======== 공통 (34 v2 와 동일) ======== */
const notes = [];
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

/* ======== 기준값 ======== */
let baseline = null, baselineKeyUsed = null;
for (const key of BASELINE_KEYS) {
  try { const raw = figma.root.getPluginData(key); if (raw) { baseline = JSON.parse(raw); baselineKeyUsed = key; break; } } catch (e) { /* 다음 키 시도 */ }
}
if (!baseline) errors.push('34 APPLY 기준값(' + BASELINE_KEYS.join(' 또는 ') + ')을 찾지 못했다 — 34 를 실행한 것과 같은 Scripter 에서 실행했는지 확인');
else if (baseline.scriptVersion !== '34-v2-font-pretendard-style-swap' && baseline.scriptVersion !== '34-v1-font-pretendard-style-swap') notes.push('기준값 scriptVersion 이 예상과 다르다: ' + baseline.scriptVersion);
const chosenFamily = baseline ? baseline.chosenFamily : null;
const c = {};

/* ======== 1. 텍스트 스타일 8개 — 지금 다시 잰다 ======== */
const allStyles = await figma.getLocalTextStylesAsync();
const styleByRole = {}; for (const s of allStyles) if (ROLES.some(r => r.role === s.name)) styleByRole[s.name] = s;
c.eightStylesFound = ROLES.every(r => !!styleByRole[r.role]);
c.allEightArePretendard = c.eightStylesFound && !!chosenFamily && ROLES.every(r => styleByRole[r.role].fontName.family === chosenFamily);
c.weightsMatchRoles = c.eightStylesFound && ROLES.every(r => {
  const s = styleByRole[r.role], want = WEIGHT_TO_STYLE[r.weight];
  return s.fontName.style === want || (baseline && (baseline.applied || []).some(a => a.role === r.role && a.to.indexOf(s.fontName.style) >= 0));
});
c.sizeLineUnchanged = c.eightStylesFound && ROLES.every(r => { const s = styleByRole[r.role]; return s.fontSize === r.size && lineOf(s.lineHeight) === r.line; });

/* ======== 2. 메인 화면 텍스트 상속 ======== */
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
    if (fn && fn !== figma.mixed && chosenFamily && fn.family === chosenFamily) inherited++;
    else mismatched.push({ id: t.id, role, font: fn && fn !== figma.mixed ? fn.family + ' ' + fn.style : String(fn) });
  } else if (!sid || sid === figma.mixed) mainWithoutStyle++;
}
c.mainFrameTextCount209 = mainTexts.length === MAIN_FRAME_TEXT_EXPECT;
c.mainFrameWithoutStyleZero = mainWithoutStyle === 0;
c.mainFrameInheritsPretendard = mainWithTarget > 0 && inherited === mainWithTarget;

/* ======== 3. 레이아웃 — 컨테이너 다시 계산, scroll 이 아닌 곳만 overflow 로 본다 ======== */
const containerIds = new Set((baseline && baseline.layoutAfter ? baseline.layoutAfter.map(r => r.id) : []));
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

/* scroll 컨테이너의 free space 가 baseline(34 APPLY 직후) 대비 나빠졌는지는 정보로만 보고 — 실패 아님 */
const scrollRegressionsNow = [];
if (baseline && baseline.layoutAfter) {
  for (const row of layoutNow) {
    if (!row.scrollH && !row.scrollV) continue;
    const base = baseline.layoutAfter.find(b => b.id === row.id);
    if (!base) continue;
    if (row.scrollH && typeof base.freeW === 'number' && typeof row.freeW === 'number' && row.freeW < base.freeW - 0.5) scrollRegressionsNow.push({ id: row.id, name: row.name, axis: 'W', baselineAfterApply: base.freeW, now: row.freeW });
    if (row.scrollV && typeof base.freeH === 'number' && typeof row.freeH === 'number' && row.freeH < base.freeH - 0.5) scrollRegressionsNow.push({ id: row.id, name: row.name, axis: 'H', baselineAfterApply: base.freeH, now: row.freeH });
  }
}

/* ======== 4. 보호 대상 — backup/legacy 는 건드리지 않았는지 (개별 override 없이 상속만 됐는지) ======== */
const backupImpact = {};
for (const id of IDS.backups) {
  const b = await figma.getNodeByIdAsync(id);
  let total = 0, pretendard = 0;
  if (b) { for (const t of b.findAllWithCriteria({ types: ['TEXT'] })) { const sid = t.textStyleId; if (sid && sid !== figma.mixed && targetStyleIds.has(sid)) { total++; if (t.fontName !== figma.mixed && t.fontName.family === chosenFamily) pretendard++; } } }
  backupImpact[id] = { exists: !!b, textUsingTargetStyles: total, nowPretendard: pretendard };
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
    styles: ROLES.map(r => { const s = styleByRole[r.role]; return s ? { role: r.role, font: s.fontName.family + ' ' + s.fontName.style, size: s.fontSize, line: lineOf(s.lineHeight) } : { role: r.role, found: false }; }),
    mainFrame: { total: mainTexts.length, withTargetStyle: mainWithTarget, withoutStyle: mainWithoutStyle, inherited, mismatched: mismatched.slice(0, 30) },
    layoutNow, overflowNow, scrollRegressionsNow
  },
  backupImpact,
  baselineFrom: baseline ? { key: baselineKeyUsed, scriptVersion: baseline.scriptVersion, at: baseline.at, chosenFamily: baseline.chosenFamily, scopeImpact: baseline.scopeImpact } : null,
  notes, errorCount: errors.length, errors
});
