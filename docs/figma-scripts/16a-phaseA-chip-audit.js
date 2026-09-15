/* ============================================================================
 * 줍줍 — 스크립트 16a
 * Phase A 사전 감사: 메인 화면의 단독 Chip (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= 를 한 줄도 포함하지 않는다.
 *
 * 목적
 *   Phase A 에서 새 Chip 인스턴스로 바꿀 "단독 배지" 3개의 정확한 현재 값을 읽는다.
 *   교체 매핑(tone / leading / visible)과 크기 변화 예측을 추측이 아니라 실측에서 만든다.
 *
 * 두 갈래로 찾는다
 *   (1) 알려진 후보 — design-system-diff.md 에 기록된 id
 *         1002:506  v2.4 버전 배지     (dot 없음으로 기록됨)
 *         1002:478  동기화 배지        (dot 1002:479, 초록)
 *         1009:703  시즌 배지          (dot 1009:704, 보라)
 *   (2) 구조 스캔 — 메인 화면 전체를 훑어 "칩처럼 생긴 프레임" 을 모은다.
 *       카드 그리드(1002:140) · KPI Strip(1002:23) 안쪽과 인스턴스 내부는 제외한다.
 *
 *   (1)과 (2)가 어긋나면 그 자체가 보고 대상이다. id 를 믿고 넘어가지 않는다.
 * ========================================================================== */

const SCRIPT_VERSION = '16a-v1-phaseA-chip-audit';

const MAIN_ID = '1002:2';
const CARD_GRID_ID = '1002:140';
const KPI_STRIP_ID = '1002:23';

const CANDIDATES = [
  { label: 'v2.4 버전 배지', id: '1002:506' },
  { label: '동기화 배지',    id: '1002:478' },
  { label: '시즌 배지',      id: '1009:703' }
];

const CHIP_SET_ID = '1029:1984';

const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 색 / 변수 헬퍼 ---------- */
function hex(c) {
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(c.r) + h(c.g) + h(c.b);
}
async function paintInfo(paints) {
  if (!Array.isArray(paints) || !paints.length) return null;
  const list = [];
  for (const p of paints) {
    const rec = { type: p.type, visible: p.visible !== false,
                  opacity: r2(p.opacity === undefined ? 1 : p.opacity) };
    if (p.type === 'SOLID') rec.hex = hex(p.color);
    if (p.boundVariables && p.boundVariables.color) {
      try {
        const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
        rec.variable = v ? v.name : '(이름 못 읽음)';
      } catch (e) { rec.variable = '(조회 실패)'; }
    } else rec.variable = null;
    list.push(rec);
  }
  return list;
}
async function styleNameOf(id) {
  try { if (!id) return null; const s = await figma.getStyleByIdAsync(id); return s ? s.name : null; }
  catch (e) { return null; }
}

/* ---------- 노드 상세 ---------- */
async function describe(n, depth) {
  const d = { id: n.id, name: n.name, type: n.type,
              size: r2(n.width) + '×' + r2(n.height), visible: n.visible };
  if ('layoutMode' in n) {
    d.layoutMode = n.layoutMode;
    d.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/');
    d.gap = r2(n.itemSpacing);
    d.primaryAxisAlignItems = n.primaryAxisAlignItems;
    d.counterAxisAlignItems = n.counterAxisAlignItems;
    d.primaryAxisSizingMode = n.primaryAxisSizingMode;
    d.counterAxisSizingMode = n.counterAxisSizingMode;
  }
  if ('cornerRadius' in n) d.cornerRadius = typeof n.cornerRadius === 'number' ? r2(n.cornerRadius) : 'mixed';
  if ('layoutPositioning' in n) d.layoutPositioning = n.layoutPositioning;
  if ('layoutGrow' in n) d.layoutGrow = n.layoutGrow;
  if ('layoutAlign' in n) d.layoutAlign = n.layoutAlign;
  try { d.layoutSizingHorizontal = n.layoutSizingHorizontal; } catch (e) { /* 지원 안 함 */ }
  try { d.layoutSizingVertical = n.layoutSizingVertical; } catch (e) { /* 지원 안 함 */ }
  if ('fills' in n) d.fills = await paintInfo(n.fills);
  if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
    d.strokes = await paintInfo(n.strokes);
    d.strokeWeight = r2(n.strokeWeight);
  }
  if ('fillStyleId' in n) d.fillStyle = await styleNameOf(n.fillStyleId);
  if (n.type === 'TEXT') {
    d.characters = n.characters;
    d.textStyle = await styleNameOf(n.textStyleId);
    try {
      d.fontName = typeof n.fontName === 'object' ? n.fontName.family + ' ' + n.fontName.style : 'mixed';
      d.fontSize = r2(n.fontSize);
      d.lineHeight = typeof n.lineHeight === 'object'
        ? (n.lineHeight.unit === 'AUTO' ? 'AUTO' : r2(n.lineHeight.value) + n.lineHeight.unit) : 'mixed';
      d.letterSpacing = typeof n.letterSpacing === 'object'
        ? r2(n.letterSpacing.value) + n.letterSpacing.unit : 'mixed';
    } catch (e) { notes.push(n.id + ' 텍스트 속성 읽기 실패: ' + e.message); }
  }
  if (depth > 0 && Array.isArray(n.children)) {
    d.children = [];
    for (const c of n.children) d.children.push(await describe(c, depth - 1));
  } else if (Array.isArray(n.children)) {
    d.childCount = n.children.length;
  }
  return d;
}

/* ---------- 부모 사슬 ---------- */
function ancestry(n) {
  const chain = [];
  let p = n.parent;
  while (p) {
    chain.push({ id: p.id, name: p.name, type: p.type,
                 layoutMode: 'layoutMode' in p ? p.layoutMode : null });
    if (p.id === MAIN_ID) break;
    p = p.parent;
  }
  return chain;
}
function insideId(n, targetId) {
  let p = n.parent;
  while (p) { if (p.id === targetId) return true; p = p.parent; }
  return false;
}
function insideInstance(n) {
  let p = n.parent;
  while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; }
  return false;
}

/* ---------- 대상 ---------- */
const main = await figma.getNodeByIdAsync(MAIN_ID);
if (!main) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                        reason: MAIN_ID + ' 을 찾을 수 없음' });

/* ---------- (1) 알려진 후보 ---------- */
const candidates = [];
for (const c of CANDIDATES) {
  const n = await figma.getNodeByIdAsync(c.id);
  if (!n) { candidates.push({ label: c.label, id: c.id, found: false }); continue; }

  const rec = { label: c.label, id: c.id, found: true };
  rec.insideMain = n.id === MAIN_ID || insideId(n, MAIN_ID);
  rec.insideInstance = insideInstance(n);
  rec.self = await describe(n, 2);
  rec.ancestry = ancestry(n);

  const p = n.parent;
  if (p) {
    rec.parent = {
      id: p.id, name: p.name, type: p.type,
      layoutMode: 'layoutMode' in p ? p.layoutMode : null,
      size: r2(p.width) + '×' + r2(p.height),
      padding: 'paddingTop' in p
        ? [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft].map(r2).join('/') : null,
      gap: 'itemSpacing' in p ? r2(p.itemSpacing) : null,
      counterAxisAlignItems: 'counterAxisAlignItems' in p ? p.counterAxisAlignItems : null,
      primaryAxisSizingMode: 'primaryAxisSizingMode' in p ? p.primaryAxisSizingMode : null,
      counterAxisSizingMode: 'counterAxisSizingMode' in p ? p.counterAxisSizingMode : null,
      childCount: Array.isArray(p.children) ? p.children.length : 0
    };
    rec.indexInParent = Array.isArray(p.children) ? p.children.indexOf(n) : -1;
    rec.siblings = Array.isArray(p.children) ? p.children.map((s, i) => ({
      index: i, id: s.id, name: s.name, type: s.type,
      size: r2(s.width) + '×' + r2(s.height), visible: s.visible,
      isTarget: s.id === n.id
    })) : [];
    rec.parentGrowsWithChild = 'layoutMode' in p && p.layoutMode !== 'NONE'
      ? (p.layoutMode === 'HORIZONTAL' ? p.counterAxisSizingMode === 'AUTO' : p.primaryAxisSizingMode === 'AUTO')
      : false;
  }
  candidates.push(rec);
}

/* ---------- (2) 구조 스캔 ---------- */
const chipLike = [];
const skipped = { insideCardGrid: 0, insideKpiStrip: 0, insideInstance: 0 };

function looksLikeChip(n) {
  if (n.type !== 'FRAME' && n.type !== 'GROUP') return false;
  if (typeof n.height !== 'number' || n.height < 12 || n.height > 32) return false;
  if (!(Array.isArray(n.children)) || n.children.length === 0 || n.children.length > 3) return false;
  if (!n.children.some(c => c.type === 'TEXT')) return false;
  if (!('fills' in n) || !Array.isArray(n.fills) || !n.fills.filter(f => f.visible !== false).length) return false;
  if (!('cornerRadius' in n)) return false;
  const rad = typeof n.cornerRadius === 'number' ? n.cornerRadius : 99;
  return rad >= 2;
}

async function walk(n) {
  if (n.id !== MAIN_ID) {
    if (insideId(n, CARD_GRID_ID)) { skipped.insideCardGrid++; return; }
    if (insideId(n, KPI_STRIP_ID)) { skipped.insideKpiStrip++; return; }
    if (n.type === 'INSTANCE') { skipped.insideInstance++; return; }
    if (looksLikeChip(n)) {
      const d = await describe(n, 1);
      d.ancestry = ancestry(n).map(a => a.name + ' (' + a.id + ')');
      d.texts = n.children.filter(c => c.type === 'TEXT').map(c => c.characters);
      chipLike.push(d);
    }
  }
  if (Array.isArray(n.children)) for (const c of n.children) await walk(c);
}
await walk(main);

/* ---------- (3) 새 Chip 마스터 기준값 ---------- */
const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
let chipMaster = null;
if (chipSet && chipSet.type === 'COMPONENT_SET') {
  let propKey = null;
  try {
    propKey = Object.keys(chipSet.componentPropertyDefinitions)
      .find(k => k.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }
  chipMaster = {
    id: chipSet.id, name: chipSet.name,
    leadingPropertyKey: propKey,
    variants: chipSet.children.map(v => ({
      name: v.name, size: r2(v.width) + '×' + r2(v.height),
      padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
      gap: r2(v.itemSpacing),
      radius: typeof v.cornerRadius === 'number' ? r2(v.cornerRadius) : 'mixed',
      children: v.children.map(c => c.name + ':' + c.type + ':' + (c.visible ? 'visible' : 'hidden'))
    }))
  };
} else {
  notes.push('Chip 세트 ' + CHIP_SET_ID + ' 를 못 찾았거나 COMPONENT_SET 이 아님');
}

/* ---------- (4) 크기 변화 예측 ---------- */
const chipHeight = chipMaster && chipMaster.variants.length
  ? parseFloat(chipMaster.variants[0].size.split('×')[1]) : null;
const heightDelta = candidates.filter(c => c.found).map(c => {
  const cur = parseFloat(c.self.size.split('×')[1]);
  return {
    label: c.label, id: c.id,
    currentHeight: cur,
    newChipHeight: chipHeight,
    delta: chipHeight === null ? null : r2(chipHeight - cur),
    parentGrowsWithChild: c.parentGrowsWithChild === true,
    parentHeight: c.parent ? c.parent.size.split('×')[1] : null
  };
});

/* ---------- 결과 ---------- */
const scanCount = chipLike.length;
const candidateFoundCount = candidates.filter(c => c.found).length;

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,
  mainFrame: { id: main.id, name: main.name, size: r2(main.width) + '×' + r2(main.height) },

  candidateFoundCount,
  candidates,

  scanCount,
  scanMatchesCandidateCount: scanCount === CANDIDATES.length,
  chipLikeFound: chipLike,
  scanSkipped: skipped,
  scanNote: '카드 그리드 · KPI Strip · 인스턴스 내부는 스캔에서 제외했다. ' +
            '스캔 결과가 3개가 아니면 알려진 id 목록이 불완전하다는 뜻이므로 매핑 전에 확인해야 한다.',

  chipMaster,
  chipMasterHeight: chipHeight,
  heightDelta,
  heightNote: '새 Chip 은 높이 24 다. 현재 배지가 18 이면 각 배지가 6px 커진다. ' +
              'parentGrowsWithChild 가 true 인 부모는 그만큼 같이 커진다.',

  notes,
  nextStep: '이 결과를 붙여주시면 tone 매핑 · leading 사용 여부 · 예상 시각 변화를 확정하고 ' +
            'DRY_RUN 교체 스크립트(16)와 검증기(16b)를 씁니다.'
});
