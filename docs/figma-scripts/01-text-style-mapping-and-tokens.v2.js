/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 01 v2
 *
 *   단계 1) 기존 텍스트 노드 → 등록된 Text Style 매핑 (Abel / Inter 혼용 제거)
 *   단계 2) 외부 Accents/Indigo 의존 제거 + 로컬 color 변수 / 이펙트 스타일 바인딩
 *
 * v1 대비 변경점
 *   - DRY_RUN 모드 추가 (기본 true). true면 문서를 단 한 글자도 바꾸지 않는다.
 *   - stroke는 현재 색이 border 색(#c7c4d8 @30%)일 때만 바인딩. vector/아이콘은 보호.
 *   - effects가 2개 이상인 노드는 건너뛴다 (상단바의 backdrop blur 보호).
 *   - 파일/프레임 가드 추가. 대상이 아니면 아무것도 하지 않고 중단.
 *   - NODE_OVERRIDE에 name/구조 기반 fallback 추가 → 복제본에서도 검증 가능.
 *
 * 실행법
 *   Figma에서 Scripter 등 스크립팅 플러그인에 붙여넣고 Run.
 *   출력되는 JSON 전체를 복사해서 전달할 것.
 *
 * 순서
 *   1) DRY_RUN = true 로 실행 → JSON 검토
 *   2) 이상 없으면 DRY_RUN = false 로 바꿔 재실행
 *
 * 멱등성: DRY_RUN은 몇 번을 돌려도 변화 없음. APPLY도 중복 생성/추가 손상 없음.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 적용할 때만 false 로 변경

const TARGET_ID = '1002:2';    // 메인 화면 프레임. 복제본 테스트 시 복제본 ID로 교체
const EXPECTED_FILE_KEY = 'hILvufkI04JInvPtCCf1L1';
const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const ALLOW_NAME_MISMATCH = false;  // 복제본(이름이 다름)에서 테스트할 때만 true

const BORDER_HEX = '#c7c4d8';
const BORDER_OPACITY = 0.3;
const STROKE_ALLOWED_TYPES = ['FRAME', 'RECTANGLE', 'COMPONENT', 'INSTANCE'];  // vector/아이콘 제외

const errors = [];
const guard = { fileKeyChecked: false, fileKeyMatched: null, frameFound: false, nameMatched: null };

/* ========================================================================
 * 0. 가드 — 대상이 아니면 아무것도 하지 않는다
 * ====================================================================== */
try {
  if (typeof figma.fileKey === 'string' && figma.fileKey.length > 0) {
    guard.fileKeyChecked = true;
    guard.fileKeyMatched = (figma.fileKey === EXPECTED_FILE_KEY);
  }
} catch (e) {
  // 플러그인 권한에 따라 fileKey 접근이 막힐 수 있다 → 프레임 가드로 대체
  guard.fileKeyNote = 'figma.fileKey 접근 불가: ' + e.message;
}

if (guard.fileKeyChecked && guard.fileKeyMatched === false) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '다른 Figma 파일에서 실행됨. 기대 fileKey=' + EXPECTED_FILE_KEY + ', 실제=' + figma.fileKey,
    guard
  };
}

const main = await figma.getNodeByIdAsync(TARGET_ID);

if (!main) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '대상 프레임 ' + TARGET_ID + ' 을 찾을 수 없음',
    guard
  };
}
guard.frameFound = true;

if (main.type !== 'FRAME') {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: TARGET_ID + ' 는 FRAME이 아니라 ' + main.type,
    guard
  };
}

guard.nameMatched = (main.name === EXPECTED_FRAME_NAME);
if (!guard.nameMatched && !ALLOW_NAME_MISMATCH) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '프레임 이름 불일치. 기대="' + EXPECTED_FRAME_NAME + '", 실제="' + main.name +
            '". 복제본에서 테스트하려면 ALLOW_NAME_MISMATCH = true 로 변경',
    guard
  };
}

/* ========================================================================
 * 공통 유틸
 * ====================================================================== */
function hexOf(paint) {
  const c = paint.color;
  return '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function opacityOf(paint) {
  return paint.opacity === undefined ? 1 : paint.opacity;
}
function bump(obj, key) { obj[key] = (obj[key] || 0) + 1; }

/* ========================================================================
 * 1. 토큰 준비 (DRY_RUN이면 계획만)
 * ====================================================================== */
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colorCol = collections.find(c => c.name === 'Color');
const localVars = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of localVars) V[v.name] = v;

const variablesWouldCreate = [];
const variablesCreated = [];
const scopeWouldChange = [];
const scopeChanged = [];

if (!colorCol) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: "'Color' 변수 컬렉션이 없음. 토큰 등록 단계가 되돌려진 것으로 보임",
    guard
  };
}

// text/on-brand (버튼 위 흰 텍스트)
if (!V['text/on-brand']) {
  variablesWouldCreate.push('text/on-brand');
  if (!DRY_RUN) {
    const v = figma.variables.createVariable('text/on-brand', colorCol, 'COLOR');
    v.setValueForMode(colorCol.modes[0].modeId, { r: 1, g: 1, b: 1, a: 1 });
    v.scopes = ['TEXT_FILL'];
    V['text/on-brand'] = v;
    variablesCreated.push('text/on-brand');
  }
}

// 바인딩에 필요한 변수가 전부 있는지 먼저 확인 (없으면 노드마다 오류가 쏟아진다)
const REQUIRED_VARS = [
  'brand/primary', 'brand/strong', 'brand/surface',
  'success/soft', 'success/strong', 'danger/soft', 'danger/strong',
  'text/primary', 'text/secondary', 'text/muted',
  'surface/default', 'surface/subtle', 'surface/header',
  'border/subtle', 'neutral/300'
];
const missingVars = REQUIRED_VARS.filter(n => !V[n]);
if (missingVars.length) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: 'color 변수 누락: ' + missingVars.join(', '),
    guard
  };
}

// neutral/300 은 구분자 "|" 텍스트에도 쓰이므로 TEXT_FILL scope 추가
const NEUTRAL_SCOPES = ['SHAPE_FILL', 'STROKE_COLOR', 'TEXT_FILL'];
if (V['neutral/300']) {
  const cur = V['neutral/300'].scopes || [];
  const same = cur.length === NEUTRAL_SCOPES.length && NEUTRAL_SCOPES.every(s => cur.includes(s));
  if (!same) {
    scopeWouldChange.push({ variable: 'neutral/300', from: cur, to: NEUTRAL_SCOPES });
    if (!DRY_RUN) {
      V['neutral/300'].scopes = NEUTRAL_SCOPES;
      scopeChanged.push('neutral/300');
    }
  }
} else {
  errors.push("variable 'neutral/300' 없음");
}

/* ========================================================================
 * 2. 텍스트 스타일 매핑
 * ====================================================================== */
const texts = main.findAllWithCriteria({ types: ['TEXT'] });

const S = {};
for (const s of await figma.getLocalTextStylesAsync()) S[s.name] = s;

const REQUIRED_STYLES = ['Page title', 'Section title', 'Card title', 'Body', 'Label', 'Caption', 'Chip', 'KPI number'];
const missingStyles = REQUIRED_STYLES.filter(n => !S[n]);
if (missingStyles.length) {
  return {
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '텍스트 스타일 누락: ' + missingStyles.join(', '),
    guard
  };
}

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
    return (lh && lh >= 23.5) ? 'Label' : 'Card title';   // 16/24 사이드바 활성 → Label
  }
  if (size >= 14) return 'Body';
  if (size >= 12.5) return 'Label';
  return isChipText(t) ? 'Chip' : 'Caption';
}

// 실제 적용 시에만 폰트 로드 (DRY_RUN은 문서를 건드리지 않으므로 불필요)
if (!DRY_RUN) {
  const toLoad = new Map();
  for (const t of texts) {
    for (const seg of t.getStyledTextSegments(['fontName'])) {
      toLoad.set(seg.fontName.family + '|' + seg.fontName.style, seg.fontName);
    }
  }
  for (const f of toLoad.values()) {
    try { await figma.loadFontAsync(f); } catch (e) { errors.push('font ' + f.family + ' ' + f.style + ': ' + e.message); }
  }
  for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    try { await figma.loadFontAsync({ family: 'Gothic A1', style: st }); }
    catch (e) { errors.push('font Gothic A1 ' + st + ': ' + e.message); }
  }
}

const textStyleWouldApply = {};
const textStyleApplied = {};

for (const t of texts) {
  try {
    const name = pickStyle(t);
    bump(textStyleWouldApply, name);
    if (!DRY_RUN) {
      await t.setTextStyleIdAsync(S[name].id);
      bump(textStyleApplied, name);
    }
  } catch (e) { errors.push('text ' + t.id + ': ' + e.message); }
}

/* ========================================================================
 * 3. fill → color 변수 바인딩
 * ====================================================================== */
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

// 같은 hex가 역할별로 갈리는 노드 (원본 프레임 ID 기준)
const NODE_OVERRIDE = {
  '1002:462': 'brand/primary',   // 페이지네이션 현재 페이지 (#4f46e5 폐기)
  '1009:704': 'brand/strong',    // 시즌 배지 dot            (#4f46e5 폐기)
  '1002:506': 'surface/subtle',  // v2.4 배지                (#dce9ff 폐기)
  '1002:512': 'brand/surface',   // 사이드바 활성            (#dce9ff 폐기)
  '1002:36':  'brand/surface'    // KPI1 델타 배지           (#dce9ff 폐기)
};

// ID가 달라지는 복제본에서도 동작하는 구조 기반 fallback.
// 확정된 설계 규칙("배경 톤은 그 위 텍스트 색이 결정한다")을 그대로 구현한 것이라 임의 추정이 아니다.
function firstTextDescendant(n) {
  if (!('findAllWithCriteria' in n)) return null;
  const t = n.findAllWithCriteria({ types: ['TEXT'] });
  return t.length ? t[0] : null;
}
function textHexOf(t) {
  if (!t || !Array.isArray(t.fills) || t.fills.length !== 1 || t.fills[0].type !== 'SOLID') return null;
  return hexOf(t.fills[0]);
}
function fallbackToken(node, hexValue) {
  if (hexValue === '#4f46e5') {
    // 텍스트를 품고 있으면 채워진 액션(페이지네이션), 아니면 dot
    return firstTextDescendant(node) ? 'brand/primary' : 'brand/strong';
  }
  if (hexValue === '#dce9ff') {
    // 위에 얹힌 텍스트가 브랜드색이면 브랜드 틴트, 중립색이면 중립 틴트
    const th = textHexOf(firstTextDescendant(node));
    return th === '#3525cd' ? 'brand/surface' : 'surface/subtle';
  }
  return null;
}

// 루트 프레임 자신도 포함 (findAll은 루트를 제외한다)
const all = [main].concat(main.findAll(() => true));

const fillsWouldBind = {};
const fillsBound = {};
const overrideResolution = [];
let externalWouldReplace = 0;
let externalReplaced = 0;

for (const n of all) {
  try {
    if (!('fills' in n) || n.fills === figma.mixed || !Array.isArray(n.fills) || n.fills.length !== 1) continue;
    const p = n.fills[0];
    if (p.type !== 'SOLID') continue;

    const h = hexOf(p);
    let token = null;
    let via = null;

    // ID override와 구조 fallback을 항상 둘 다 계산해서 서로 일치하는지 확인한다.
    // 원본 프레임에서 둘이 일치하면, ID가 달라지는 복제본에서도 fallback을 믿을 수 있다.
    const fb = fallbackToken(n, h);

    if (NODE_OVERRIDE[n.id]) {
      token = NODE_OVERRIDE[n.id]; via = 'id-override';
    } else if (fb) {
      token = fb; via = 'structure-fallback';
    } else if (h === '#ffffff') {
      token = (n.type === 'TEXT') ? 'text/on-brand' : 'surface/default'; via = 'white-rule';
    } else if (FILL_MAP[h]) {
      token = FILL_MAP[h]; via = 'hex-map';
    }
    if (!token) continue;

    // 반투명 오버레이(dot ring 등)는 건드리지 않는다
    if (opacityOf(p) < 0.5 && token !== 'surface/header') continue;

    if (via === 'id-override' || via === 'structure-fallback') {
      overrideResolution.push({
        id: n.id, name: n.name, hex: h, token, via,
        fallbackToken: fb,
        fallbackAgrees: fb === token   // false면 복제본에서 fallback을 믿으면 안 된다
      });
    }

    const hadExternal = !!(p.boundVariables && p.boundVariables.color);
    if (hadExternal) externalWouldReplace++;
    bump(fillsWouldBind, token);

    if (!DRY_RUN) {
      n.fills = [bound(token)];
      bump(fillsBound, token);
      if (hadExternal) externalReplaced++;
    }
  } catch (e) { errors.push('fill ' + n.id + ': ' + e.message); }
}

/* ========================================================================
 * 4. stroke → border/subtle  (색 확인 + vector 보호)
 * ====================================================================== */
let strokesWouldBind = 0;
let strokesBound = 0;
const skippedStroke = [];
let skippedStrokeCount = 0;

function noteSkippedStroke(n, reason, extra) {
  skippedStrokeCount++;
  if (skippedStroke.length < 40) {
    skippedStroke.push(Object.assign({ id: n.id, name: n.name, type: n.type, reason }, extra || {}));
  }
}

for (const n of all) {
  try {
    if (!('strokes' in n) || !Array.isArray(n.strokes) || n.strokes.length === 0) continue;

    if (n.strokes.length !== 1) { noteSkippedStroke(n, 'multi-stroke', { strokeCount: n.strokes.length }); continue; }
    const p = n.strokes[0];
    if (p.type !== 'SOLID') { noteSkippedStroke(n, 'non-solid-stroke', { paintType: p.type }); continue; }

    // 아이콘/vector 보호
    if (!STROKE_ALLOWED_TYPES.includes(n.type)) {
      noteSkippedStroke(n, 'vector-protected', { hex: hexOf(p), opacity: opacityOf(p) });
      continue;
    }

    // 기존 border 색일 때만 바인딩
    const h = hexOf(p);
    const o = opacityOf(p);
    if (h !== BORDER_HEX || Math.abs(o - BORDER_OPACITY) > 0.02) {
      noteSkippedStroke(n, 'color-mismatch', { hex: h, opacity: Math.round(o * 1000) / 1000 });
      continue;
    }

    strokesWouldBind++;
    if (!DRY_RUN) {
      n.strokes = [figma.variables.setBoundVariableForPaint(
        { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V['border/subtle'])];
      strokesBound++;
    }
  } catch (e) { errors.push('stroke ' + n.id + ': ' + e.message); }
}

/* ========================================================================
 * 5. effect → elevation 스타일  (다중 효과 보호)
 * ====================================================================== */
const ES = {};
for (const s of await figma.getLocalEffectStylesAsync()) ES[s.name] = s;

const REQUIRED_EFFECTS = ['elevation/card', 'elevation/floating', 'elevation/focus-ring'];
const missingEffects = REQUIRED_EFFECTS.filter(n => !ES[n]);
if (missingEffects.length) errors.push('이펙트 스타일 누락: ' + missingEffects.join(', '));

const effectsWouldApply = {};
const effectStylesApplied = {};
const skippedMultiEffect = [];

for (const n of all) {
  try {
    if (!('effects' in n) || !Array.isArray(n.effects) || n.effects.length === 0) continue;

    // 효과가 2개 이상이면 손대지 않는다 (backdrop blur + drop shadow 조합 보호)
    if (n.effects.length > 1) {
      skippedMultiEffect.push({
        id: n.id, name: n.name,
        effectCount: n.effects.length,
        types: n.effects.map(e => e.type)
      });
      continue;
    }

    const e0 = n.effects[0];
    if (e0.type !== 'DROP_SHADOW') continue;
    if (missingEffects.length) continue;

    let name;
    if (e0.spread >= 3) name = 'elevation/focus-ring';
    else if (e0.radius >= 3) name = 'elevation/floating';
    else name = 'elevation/card';

    bump(effectsWouldApply, name);
    if (!DRY_RUN) {
      await n.setEffectStyleIdAsync(ES[name].id);
      bump(effectStylesApplied, name);
    }
  } catch (e) { errors.push('effect ' + n.id + ': ' + e.message); }
}

/* ========================================================================
 * 6. 폰트 현황
 *    DRY_RUN  → 지금 남아 있는 비 Gothic A1 폰트 (= 앞으로 교체될 대상)
 *    APPLY    → 적용 후에도 남아 있는 것 (0이어야 정상)
 * ====================================================================== */
const remainingNonGothicA1 = {};
for (const t of texts) {
  try {
    for (const seg of t.getStyledTextSegments(['fontName'])) {
      if (seg.fontName.family !== 'Gothic A1') bump(remainingNonGothicA1, seg.fontName.family);
    }
  } catch (e) { errors.push('fontscan ' + t.id + ': ' + e.message); }
}

/* ========================================================================
 * 7. 결과
 * ====================================================================== */
const RESULT = {
  mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
  targetFrameId: TARGET_ID,
  targetFrameName: main.name,
  guard,

  textNodes: texts.length,
  textStyleWouldApply,
  textStyleApplied,
  remainingNonGothicA1,

  fillsWouldBind,
  fillsBound,

  strokesWouldBind,
  strokesBound,
  skippedStrokeCount,
  skippedStroke,

  effectsWouldApply,
  effectStylesApplied,
  skippedMultiEffect,

  externalVariableBindingsWouldReplace: externalWouldReplace,
  externalVariableBindingsReplaced: externalReplaced,

  variablesWouldCreate,
  variablesCreated,
  scopeWouldChange,
  scopeChanged,

  overrideResolution,
  totalNodesScanned: all.length,

  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
};

// Scripter는 print(), 그 외 환경은 return 으로 결과를 본다
try { print(JSON.stringify(RESULT, null, 2)); } catch (e) { /* Scripter가 아니면 무시 */ }
return RESULT;
