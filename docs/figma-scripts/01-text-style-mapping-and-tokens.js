/*
 * 줍줍 디자인 시스템 정리 — 스크립트 01
 * 단계 1) 기존 텍스트 노드 → 등록된 Text Style 매핑 (Abel / Inter 혼용 제거)
 * 단계 2) 외부 Accents/Indigo 의존 제거 + 로컬 color 변수 / 이펙트 스타일 바인딩
 *
 * 대상: 메인 화면 프레임 1002:2
 * 실행법: Figma 데스크톱/웹에서 Scripter 같은 플러그인 콘솔에 붙여넣고 실행.
 *        마지막 return 값(JSON)을 복사해서 전달하면 다음 스크립트를 이어서 작성한다.
 * 주의: 재실행해도 안전하다(멱등). 실패 시 그대로 다시 돌리면 된다.
 */

const main = await figma.getNodeByIdAsync('1002:2');
const errors = [];

/* ---------- 0. 부족한 토큰 보완 ---------- */
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colorCol = collections.find(c => c.name === 'Color');
const vars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of vars) V[v.name] = v;

if (!V['text/on-brand']) {
  const v = figma.variables.createVariable('text/on-brand', colorCol, 'COLOR');
  v.setValueForMode(colorCol.modes[0].modeId, { r: 1, g: 1, b: 1, a: 1 });
  v.scopes = ['TEXT_FILL'];
  V['text/on-brand'] = v;
}
V['neutral/300'].scopes = ['SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL'];

/* ---------- 1. 텍스트 스타일 매핑 ---------- */
const texts = main.findAllWithCriteria({ types: ['TEXT'] });

const toLoad = new Map();
for (const t of texts) {
  for (const s of t.getStyledTextSegments(['fontName'])) {
    toLoad.set(s.fontName.family + '|' + s.fontName.style, s.fontName);
  }
}
for (const f of toLoad.values()) {
  try { await figma.loadFontAsync(f); } catch (e) { errors.push('font ' + f.family + ': ' + e.message); }
}
for (const s of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
  await figma.loadFontAsync({ family: 'Gothic A1', style: s });
}

const S = {};
for (const s of await figma.getLocalTextStylesAsync()) S[s.name] = s;

// 칩 판별: 조상 3단계 이내에 fill이 있고 높이 28 이하인 프레임이 있으면 칩
function isChipText(t) {
  let p = t.parent, d = 0;
  while (p && d < 3) {
    if (p.type === 'FRAME' && Array.isArray(p.fills) && p.fills.length > 0 &&
        p.fills.some(f => f.visible !== false) && p.height <= 28) return true;
    p = p.parent; d++;
  }
  return false;
}

function pickStyle(t) {
  const size = t.fontSize === figma.mixed ? 11 : t.fontSize;
  const fam = t.fontName === figma.mixed ? 'Abel' : t.fontName.family;
  if (size >= 26) return fam === 'Inter' ? 'KPI number' : 'Page title';
  if (size >= 18) return 'Section title';
  if (size >= 15.5) {
    const lh = t.lineHeight && t.lineHeight.value;
    return (lh && lh >= 23.5) ? 'Label' : 'Card title';  // 16/24 사이드바 활성 → Label
  }
  if (size >= 14) return 'Body';
  if (size >= 12.5) return 'Label';
  return isChipText(t) ? 'Chip' : 'Caption';
}

const styleReport = {};
for (const t of texts) {
  try {
    const n = pickStyle(t);
    await t.setTextStyleIdAsync(S[n].id);
    styleReport[n] = (styleReport[n] || 0) + 1;
  } catch (e) { errors.push('text ' + t.id + ': ' + e.message); }
}

/* ---------- 2. 색상 변수 바인딩 ---------- */
function hexOf(p) {
  const c = p.color;
  return '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function bound(name) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V[name]);
}

const FILL_MAP = {
  '#6155f5': 'brand/primary',  '#3525cd': 'brand/strong',   '#e2dfff': 'brand/surface',
  '#e5eeff': 'surface/subtle', '#eff4ff': 'surface/subtle',
  '#6cf8bb': 'success/soft',   '#00714d': 'success/strong', '#006c49': 'success/strong',
  '#ffdad6': 'danger/soft',    '#ffdad7': 'danger/soft',
  '#ba1a1a': 'danger/strong',  '#930013': 'danger/strong',
  '#0b1c30': 'text/primary',   '#464555': 'text/secondary', '#777587': 'text/muted',
  '#c7c4d8': 'neutral/300',    '#f8f9ff': 'surface/header'
};

// 같은 hex가 역할별로 갈리는 노드
const NODE_OVERRIDE = {
  '1002:462': 'brand/primary',   // 페이지네이션 현재 페이지 (#4f46e5 폐기)
  '1009:704': 'brand/strong',    // 시즌 배지 dot        (#4f46e5 폐기)
  '1002:506': 'surface/subtle',  // v2.4 배지            (#dce9ff 폐기, 텍스트가 중립색)
  '1002:512': 'brand/surface',   // 사이드바 활성        (#dce9ff 폐기)
  '1002:36':  'brand/surface'    // KPI1 델타 배지       (#dce9ff 폐기)
};

const all = main.findAll(() => true);
const fillReport = {};
let externalCleared = 0;

for (const n of all) {
  try {
    if (!('fills' in n) || n.fills === figma.mixed || !Array.isArray(n.fills) || n.fills.length !== 1) continue;
    const p = n.fills[0];
    if (p.type !== 'SOLID') continue;

    let token = NODE_OVERRIDE[n.id];
    if (!token) {
      const h = hexOf(p);
      if (h === '#ffffff') token = (n.type === 'TEXT') ? 'text/on-brand' : 'surface/default';
      else token = FILL_MAP[h];
    }
    if (!token) continue;
    // 반투명 오버레이(dot ring 등)는 건드리지 않는다
    if (p.opacity !== undefined && p.opacity < 0.5 && token !== 'surface/header') continue;

    const hadExternal = !!(p.boundVariables && p.boundVariables.color);
    n.fills = [bound(token)];
    if (hadExternal) externalCleared++;
    fillReport[token] = (fillReport[token] || 0) + 1;
  } catch (e) { errors.push('fill ' + n.id + ': ' + e.message); }
}

/* ---------- 3. 보더 ---------- */
let strokeCount = 0;
for (const n of all) {
  try {
    if (!('strokes' in n) || !Array.isArray(n.strokes) || n.strokes.length !== 1) continue;
    if (n.strokes[0].type !== 'SOLID') continue;
    n.strokes = [figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V['border/subtle'])];
    strokeCount++;
  } catch (e) { errors.push('stroke ' + n.id + ': ' + e.message); }
}

/* ---------- 4. 이펙트 스타일 ---------- */
const ES = {};
for (const s of await figma.getLocalEffectStylesAsync()) ES[s.name] = s;

const effReport = {};
for (const n of all) {
  try {
    if (!('effects' in n) || !Array.isArray(n.effects) || n.effects.length === 0) continue;
    const e0 = n.effects[0];
    if (e0.type !== 'DROP_SHADOW') continue;
    let name;
    if (e0.spread >= 3) name = 'elevation/focus-ring';
    else if (e0.radius >= 3) name = 'elevation/floating';
    else name = 'elevation/card';
    await n.setEffectStyleIdAsync(ES[name].id);
    effReport[name] = (effReport[name] || 0) + 1;
  } catch (e) { errors.push('effect ' + n.id + ': ' + e.message); }
}

/* ---------- 검증 ---------- */
const leftoverFonts = {};
for (const t of texts) {
  for (const s of t.getStyledTextSegments(['fontName'])) {
    if (s.fontName.family !== 'Gothic A1') {
      leftoverFonts[s.fontName.family] = (leftoverFonts[s.fontName.family] || 0) + 1;
    }
  }
}

return {
  textNodes: texts.length,
  textStyleApplied: styleReport,
  remainingNonGothicA1: leftoverFonts,
  fillsBound: fillReport,
  externalVariableBindingsReplaced: externalCleared,
  strokesBound: strokeCount,
  effectStylesApplied: effReport,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
};
