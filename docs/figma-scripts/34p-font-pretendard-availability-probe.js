/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 34p
 * PROBE — 이 PC 의 Figma/Scripter 에서 Pretendard 를 실제로 쓸 수 있는지 (읽기 전용 · 비파괴)
 *
 * 하는 일
 *   1) figma.listAvailableFontsAsync() 로 이 환경에 보이는 글꼴 목록에서 Pretendard 계열 family 를 찾는다
 *      ("Pretendard" · "Pretendard Variable" · "Pretendard JP" 등 이름이 다른 변형도 모두 보고)
 *   2) Regular / Medium / SemiBold / Bold 를 figma.loadFontAsync() 로 실제 로드해 본다
 *      (로드는 글꼴을 메모리에 올릴 뿐 문서를 바꾸지 않는다)
 *   3) 현재 텍스트 스타일 8개(Gothic A1)의 굵기 → Pretendard style 매핑이 가능한지 표로 낸다
 *   4) 교체 범위 참고: 텍스트 노드 수 · 스타일이 연결되지 않은 노드 수 · 글꼴별 분포 (읽기만)
 *
 * 하지 않는 것
 *   텍스트 스타일 · 텍스트 노드 · 컴포넌트 · 인스턴스 · pluginData 어느 것도 바꾸지 않는다. mutationCount 는 0 으로 고정.
 *   끝에서 텍스트 스타일 8개의 글꼴/크기/행간을 처음 값과 다시 비교해 정말 안 바뀌었는지 확인한다.
 *
 * 참고: 예전 MCP 에서 Pretendard 가 안 보였던 이유는 MCP 가 Figma 서버 글꼴만 보기 때문이다.
 *       Scripter 는 이 PC 의 Figma 에서 돌므로 PC 에 설치된 글꼴(데스크톱 앱 / font helper)이 보일 수 있다.
 * ========================================================================== */

const SCRIPT_VERSION = '34p-font-pretendard-v1-availability-probe';

const TARGET_STYLES = ['Regular', 'Medium', 'SemiBold', 'Bold'];
const STYLE_ALIASES = { SemiBold: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold'], Regular: ['Regular', 'Normal', 'Book'], Medium: ['Medium'], Bold: ['Bold'] };
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
const GOTHIC_STYLE_WEIGHT = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };

const notes = [];
const errors = [];
const mutationCount = 0;
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
const lineOf = lh => (lh && typeof lh === 'object' ? (lh.unit === 'PIXELS' ? lh.value : lh.unit === 'PERCENT' ? lh.value + '%' : lh.unit) : lh);

/* ======== 0. 텍스트 스타일 기준값 (끝에서 다시 비교) ======== */
const stylesBefore = (await figma.getLocalTextStylesAsync()).map(s => ({ id: s.id, name: s.name, font: s.fontName.family + ' ' + s.fontName.style, size: s.fontSize, line: lineOf(s.lineHeight), letter: JSON.stringify(s.letterSpacing) }));

/* ======== 1. 글꼴 목록 ======== */
let fonts = [], listError = null;
try { fonts = await figma.listAvailableFontsAsync(); } catch (e) { listError = e.message; errors.push('listAvailableFontsAsync 실패: ' + e.message); }
const families = {};
for (const f of fonts) { const fam = f.fontName.family; (families[fam] = families[fam] || []).push(f.fontName.style); }
const pretendardFamilies = Object.keys(families).filter(n => /pretendard/i.test(n)).sort();
const familyReport = pretendardFamilies.map(n => ({ family: n, styles: families[n].slice().sort() }));
/* 우선순위: 정확히 "Pretendard" → "Pretendard Variable" → 그 밖의 첫 번째 */
const chosenFamily = pretendardFamilies.indexOf('Pretendard') >= 0 ? 'Pretendard'
  : pretendardFamilies.indexOf('Pretendard Variable') >= 0 ? 'Pretendard Variable' : (pretendardFamilies[0] || null);
const gothicStyles = families['Gothic A1'] ? families['Gothic A1'].slice().sort() : null;

/* ======== 2. 실제 로드 ======== */
const loadResults = {};
async function tryLoad(family, style) {
  try { await figma.loadFontAsync({ family, style }); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
}
if (chosenFamily) {
  for (const t of TARGET_STYLES) {
    const available = families[chosenFamily] || [];
    const exact = available.indexOf(t) >= 0 ? t : null;
    const alias = exact ? null : (STYLE_ALIASES[t] || []).find(a => available.indexOf(a) >= 0) || null;
    const styleToLoad = exact || alias || t;       // 목록에 없어도 한 번은 시도해서 결과를 남긴다
    const r = await tryLoad(chosenFamily, styleToLoad);
    loadResults[t] = { family: chosenFamily, styleName: styleToLoad, inList: !!(exact || alias), exactName: !!exact, aliasUsed: alias, loaded: r.ok, error: r.error || null };
  }
  /* 다른 Pretendard family 에서도 같은 4개가 되는지 (참고) */
  for (const fam of pretendardFamilies) {
    if (fam === chosenFamily) continue;
    const row = {};
    for (const t of TARGET_STYLES) row[t] = (families[fam] || []).indexOf(t) >= 0;
    notes.push('다른 Pretendard family "' + fam + '" 의 style 보유: ' + JSON.stringify(row));
  }
}
/* 비교용: Gothic A1 도 지금 로드되는지 */
const gothicLoad = {};
for (const t of TARGET_STYLES) gothicLoad[t] = (await tryLoad('Gothic A1', t)).ok;

/* ======== 3. 역할 매핑 ======== */
const styleByName = {};
for (const s of await figma.getLocalTextStylesAsync()) styleByName[s.name] = s;
const mapping = ROLES.map(r => {
  const s = styleByName[r.role];
  const target = WEIGHT_TO_STYLE[r.weight];
  const lr = loadResults[target];
  const currentWeight = s ? GOTHIC_STYLE_WEIGHT[s.fontName.style] || null : null;
  return {
    role: r.role, spec: r.size + '/' + r.line + '/' + r.weight,
    currentStyleFound: !!s, current: s ? s.fontName.family + ' ' + s.fontName.style + ' ' + s.fontSize + '/' + lineOf(s.lineHeight) : null,
    currentMatchesSpec: !!s && s.fontSize === r.size && lineOf(s.lineHeight) === r.line && currentWeight === r.weight,
    target: chosenFamily ? chosenFamily + ' ' + (lr ? lr.styleName : target) : null,
    mappable: !!lr && lr.loaded
  };
});
const missingStyles = TARGET_STYLES.filter(t => !loadResults[t] || !loadResults[t].loaded);

/* ======== 4. 교체 범위 참고 (읽기만) ======== */
await figma.loadAllPagesAsync();
const texts = figma.root.findAllWithCriteria({ types: ['TEXT'] });
const byFont = {};
let withStyle = 0, withoutStyle = 0, mixedFont = 0, mixedStyle = 0;
const styleIds = new Set(stylesBefore.map(s => s.id));
for (const t of texts) {
  const fn = t.fontName;
  if (fn === figma.mixed) mixedFont++; else { const k = fn.family + ' ' + fn.style; byFont[k] = (byFont[k] || 0) + 1; }
  const sid = t.textStyleId;
  if (sid === figma.mixed) mixedStyle++; else if (sid && styleIds.has(sid)) withStyle++; else withoutStyle++;
}
const mainFrame = await figma.getNodeByIdAsync('1002:2');
const mainTexts = mainFrame ? mainFrame.findAllWithCriteria({ types: ['TEXT'] }) : [];
let mainWithout = 0;
for (const t of mainTexts) { const sid = t.textStyleId; if (!(sid && sid !== figma.mixed && styleIds.has(sid))) mainWithout++; }

/* ======== 5. 비파괴 확인 ======== */
const stylesAfter = (await figma.getLocalTextStylesAsync()).map(s => ({ id: s.id, name: s.name, font: s.fontName.family + ' ' + s.fontName.style, size: s.fontSize, line: lineOf(s.lineHeight), letter: JSON.stringify(s.letterSpacing) }));
const textStylesUnchanged = JSON.stringify(stylesBefore) === JSON.stringify(stylesAfter);
if (!textStylesUnchanged) errors.push('텍스트 스타일이 실행 전과 다르다 — 이 probe 는 아무것도 바꾸지 않아야 한다');

const summary = {
  pretendardFamilyFound: pretendardFamilies.length > 0,
  pretendardFamilies, chosenFamily,
  loaded: TARGET_STYLES.reduce((o, t) => { o[t] = !!loadResults[t] && loadResults[t].loaded; return o; }, {}),
  allFourLoadable: missingStyles.length === 0 && !!chosenFamily,
  missingStyles,
  rolesMappable: mapping.filter(m => m.mappable).length + '/' + mapping.length,
  allRolesMappable: mapping.every(m => m.mappable),
  currentStylesMatchSpec: mapping.filter(m => m.currentMatchesSpec).length + '/' + mapping.length,
  gothicA1StillLoadable: gothicLoad,
  totalFontsVisible: fonts.length,
  textNodes: { total: texts.length, withLocalStyle: withStyle, withoutLocalStyle: withoutStyle, mixedStyle, mixedFont, inMainFrame: mainTexts.length, mainFrameWithoutStyle: mainWithout },
  textStylesUnchanged, mutationCount, errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_PROBE',
  summary,
  families: familyReport, listError,
  loadResults, mapping,
  currentTextStyles: stylesBefore,
  fontDistribution: byFont, gothicA1StylesInList: gothicStyles,
  notes, errors
});
