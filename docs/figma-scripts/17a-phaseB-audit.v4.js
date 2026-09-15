/* ============================================================================
 * 줍줍 — 스크립트 17a
 * Phase B 사전 감사: 툴바 컨트롤 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= 를 한 줄도 포함하지 않는다.
 *
 * 대상 6개 — 다만 **id 를 추측으로 확정하지 않는다**
 *   Input   1        1003:1697  (이전 감사에서 확인)
 *   Select  4        1003:1705 / 1711 / 1717 / 1723  (이전 감사에서 확인)
 *   Reset Button 1   **미확정** — 1003:1729 계열로 보였을 뿐이다.
 *                    이 스크립트가 툴바를 훑어 텍스트로 찾고, 후보를 전부 보고한다.
 *
 * Phase A 에서 배운 것을 그대로 적용한다
 *   - 개수를 억지로 맞추지 않는다. known / explained extra / unexplained extra 로 나눈다.
 *   - 예측 공식은 **현재 측정값을 재현하는지 먼저 확인**하고, 못 하면 믿지 말라고 표시한다.
 *   - 읽지 못한 것과 값이 다른 것을 같은 상태로 뭉치지 않는다.
 *
 * 폭 예측에 대한 정직한 한계
 *   새 Input 은 240 고정이라 **확정**이다.
 *   Select · Button 은 hug 라 라벨 너비가 폭을 정하는데, 텍스트 실제 렌더 폭은
 *   노드를 만들어보기 전에는 알 수 없다. 이 스크립트는 쓰기를 하지 않으므로
 *   **추정치**를 내고 그렇게 표시한다. 확정은 교체 후 검증기에서 실측한다.
 *   추정 방법: 현재 텍스트 노드 폭 × (새 라벨 글자크기 / 현재 글자크기).
 *   두 글자크기는 모두 실측값이다. 비례 가정만 추정이다.
 * ========================================================================== */

const SCRIPT_VERSION = '17a-v4-reset-by-structure';

const TOOLBAR_ID = '1003:1695';

const MASTERS = {
  input:  { setId: '1030:2017', name: 'Input' },
  select: { setId: '1030:2007', name: 'Select' },
  button: { setId: '1029:1997', name: 'Button' }
};

/* 이전 감사에서 확인된 id. found 여부를 실측으로 다시 확인한다. */
const KNOWN = [
  { key: 'input',   role: 'Input',  id: '1003:1697', master: 'input'  },
  { key: 'select1', role: 'Select', id: '1003:1705', master: 'select' },
  { key: 'select2', role: 'Select', id: '1003:1711', master: 'select' },
  { key: 'select3', role: 'Select', id: '1003:1717', master: 'select' },
  { key: 'select4', role: 'Select', id: '1003:1723', master: 'select' }
];

/* Reset 버튼은 id 를 모른다. 텍스트로 찾는다. */
const RESET_TEXT_RE = /초기화|리셋|reset|필터\s*해제|전체\s*해제|모두\s*해제/i;

/* 이전 감사에서 툴바 끝쪽에 보였던 노드들. **Reset 이라고 확정하지 않는다.**
 * 존재 여부부터 확인하고, 안에 든 텍스트를 깊이 제한 없이 읽어서 판정한다. */
const RESET_PROBE_IDS = ['1003:1728', '1003:1729', '1003:1732'];

/* accessory 로 의심되는 sibling 들 — 역할을 **추정하되 확정은 근거가 충분할 때만** 한다 */
const ACCESSORY_PROBES = {
  '1003:1697': { host: 'input',   siblingId: '1003:1700', expectedRole: 'searchIcon' },
  '1003:1705': { host: 'select1', siblingId: '1003:1708', expectedRole: 'chevron' },
  '1003:1711': { host: 'select2', siblingId: '1003:1714', expectedRole: 'chevron' },
  '1003:1717': { host: 'select3', siblingId: '1003:1720', expectedRole: 'chevron' },
  '1003:1723': { host: 'select4', siblingId: '1003:1726', expectedRole: 'chevron' }
};

const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const kids = n => Array.isArray(n.children) ? n.children : null;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

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

/* 깊이 탐색 헬퍼 — 직계만 보다가 놓치는 실수를 반복하지 않는다 */
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs || depth <= 0) return acc;
  for (const c of cs) {
    if (pred(c)) acc.push(c);
    collectDeep(c, pred, depth - 1, acc);
  }
  return acc;
}
function firstTextDeep(n, depth) {
  const ts = collectDeep(n, c => c.type === 'TEXT' && c.visible !== false, depth);
  return ts.length ? ts[0] : null;
}
function allTextsDeep(n, depth) {
  return collectDeep(n, c => c.type === 'TEXT', depth === undefined ? 12 : depth).map(t => ({
    id: t.id, name: t.name, characters: t.characters, visible: t.visible,
    width: r2(t.width), fontSize: r2(t.fontSize)
  }));
}
function iconLikeDeep(n, depth) {
  return collectDeep(n, c => c.type === 'VECTOR' || c.type === 'BOOLEAN_OPERATION' ||
                             c.type === 'ELLIPSE' || c.type === 'INSTANCE' ||
                             /icon|chevron|search|reset/i.test(c.name), depth)
    .map(c => ({ id: c.id, name: c.name, type: c.type,
                 size: r2(c.width) + '×' + r2(c.height), visible: c.visible }));
}

/* ---------- 노드 상세 ---------- */
async function describeControl(n) {
  const d = { id: n.id, name: n.name, type: n.type,
              size: r2(n.width) + '×' + r2(n.height),
              width: r2(n.width), height: r2(n.height), visible: n.visible };
  if ('layoutMode' in n) {
    d.layoutMode = n.layoutMode;
    d.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/');
    d.paddingH = r2((n.paddingLeft || 0) + (n.paddingRight || 0));
    d.gap = r2(n.itemSpacing);
    d.primaryAxisSizingMode = n.primaryAxisSizingMode;
    d.counterAxisSizingMode = n.counterAxisSizingMode;
    d.counterAxisAlignItems = n.counterAxisAlignItems;
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
  d.childNames = (kids(n) || []).map(c => c.name + ':' + c.type);
  d.texts = allTextsDeep(n, 3);
  d.iconLike = iconLikeDeep(n, 3);

  const t = firstTextDeep(n, 3);
  if (t) {
    d.primaryText = t.characters;
    d.primaryTextId = t.id;
    d.primaryTextWidth = r2(t.width);
    d.primaryTextFontSize = r2(t.fontSize);
    d.primaryTextStyle = await styleNameOf(t.textStyleId);
    try {
      d.primaryTextFont = typeof t.fontName === 'object' ? t.fontName.family + ' ' + t.fontName.style : 'mixed';
    } catch (e) { /* 무시 */ }
  }
  return d;
}

/* ---------- 부모 정보 + 가로 배치 산술 ---------- */
function parentInfo(p) {
  const cs = kids(p) || [];
  const vis = cs.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const hidden = cs.filter(c => c.visible === false);
  const gap = r2(p.itemSpacing || 0);
  const padH = r2((p.paddingLeft || 0) + (p.paddingRight || 0));
  const padV = r2((p.paddingTop || 0) + (p.paddingBottom || 0));
  const sumVisible = r2(vis.reduce((a, c) => a + c.width, 0));
  const sumAll = r2(cs.filter(c => c.layoutPositioning !== 'ABSOLUTE').reduce((a, c) => a + c.width, 0));
  const contentVisible = r2(sumVisible + gap * Math.max(0, vis.length - 1) + padH);
  const contentAll = r2(sumAll + gap * Math.max(0, cs.length - 1) + padH);
  return {
    id: p.id, name: p.name, type: p.type,
    layoutMode: 'layoutMode' in p ? p.layoutMode : null,
    size: r2(p.width) + '×' + r2(p.height),
    width: r2(p.width), height: r2(p.height),
    padding: 'paddingTop' in p
      ? [p.paddingTop, p.paddingRight, p.paddingBottom, p.paddingLeft].map(r2).join('/') : null,
    paddingH: padH, paddingV: padV, gap,
    primaryAxisAlignItems: 'primaryAxisAlignItems' in p ? p.primaryAxisAlignItems : null,
    counterAxisAlignItems: 'counterAxisAlignItems' in p ? p.counterAxisAlignItems : null,
    primaryAxisSizingMode: 'primaryAxisSizingMode' in p ? p.primaryAxisSizingMode : null,
    counterAxisSizingMode: 'counterAxisSizingMode' in p ? p.counterAxisSizingMode : null,
    childCount: cs.length, visibleChildCount: vis.length, hiddenChildCount: hidden.length,
    hiddenChildren: hidden.map(c => ({ id: c.id, name: c.name, size: r2(c.width) + '×' + r2(c.height) })),
    childOrder: cs.map((c, i) => ({ index: i, id: c.id, name: c.name, type: c.type,
                                    width: r2(c.width), height: r2(c.height), visible: c.visible })),
    tallestVisibleChild: vis.length ? r2(Math.max.apply(null, vis.map(c => c.height))) : 0,
    sumVisibleChildWidths: sumVisible,
    contentWidthIfHiddenExcluded: contentVisible,
    contentWidthIfHiddenIncluded: contentAll,
    freeSpaceNow: r2(p.width - contentVisible)
  };
}

/* ---------- 대상 ---------- */
const toolbar = await figma.getNodeByIdAsync(TOOLBAR_ID);
if (!toolbar) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                           reason: '툴바 ' + TOOLBAR_ID + ' 을 찾을 수 없음' });

/* 툴바 안에서 "컨트롤처럼 생긴" 노드를 전부 모은다 (직계가 아니어도 된다) */
function looksLikeControl(n) {
  if (n.type !== 'FRAME' && n.type !== 'GROUP' && n.type !== 'INSTANCE') return false;
  if (typeof n.height !== 'number' || n.height < 24 || n.height > 48) return false;
  const hasText = collectDeep(n, c => c.type === 'TEXT', 3).length > 0;
  if (!hasText) return false;
  const hasPaintOrStroke = (Array.isArray(n.fills) && n.fills.some(f => f.visible !== false)) ||
                           (Array.isArray(n.strokes) && n.strokes.length > 0);
  /* ghost 버튼은 배경도 테두리도 없다. 배경을 필수로 두면 Reset 이 스캔에서 통째로 빠진다.
   * padding 을 가진 Auto Layout 도 컨트롤로 본다. */
  const paddedAutoLayout = 'layoutMode' in n && n.layoutMode !== 'NONE' &&
                           ((n.paddingLeft || 0) + (n.paddingRight || 0)) > 0;
  return hasPaintOrStroke || paddedAutoLayout;
}
const controlNodes = collectDeep(toolbar, looksLikeControl, 4);

/* 중첩 제거 — 컨트롤 안의 컨트롤은 바깥쪽만 센다 */
const controls = controlNodes.filter(n => {
  let p = n.parent;
  while (p && p.id !== toolbar.id) { if (controlNodes.indexOf(p) >= 0) return false; p = p.parent; }
  return true;
});

/* ---------- 새 마스터 읽기 ---------- */
const masterInfo = {};
for (const k of Object.keys(MASTERS)) {
  const m = MASTERS[k];
  const set = await figma.getNodeByIdAsync(m.setId);
  if (!set || set.type !== 'COMPONENT_SET') {
    masterInfo[k] = { setId: m.setId, name: m.name, found: false };
    notes.push(m.name + ' 마스터 ' + m.setId + ' 를 못 찾았거나 COMPONENT_SET 이 아님');
    continue;
  }
  let leadingProp = null;
  try {
    leadingProp = Object.keys(set.componentPropertyDefinitions)
      .find(x => x.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }

  const v0 = set.children[0];
  const labelText = v0 ? firstTextDeep(v0, 2) : null;
  masterInfo[k] = {
    setId: set.id, name: set.name, found: true,
    leadingPropertyKey: leadingProp,
    variants: set.children.map(v => ({
      name: v.name, size: r2(v.width) + '×' + r2(v.height),
      padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
      paddingH: r2((v.paddingLeft || 0) + (v.paddingRight || 0)),
      gap: r2(v.itemSpacing),
      radius: typeof v.cornerRadius === 'number' ? r2(v.cornerRadius) : 'mixed',
      widthMode: (function () { try { return v.layoutSizingHorizontal; } catch (e) { return null; } })(),
      children: v.children.map(c => c.name + ':' + c.type + ':' + (c.visible ? 'visible' : 'hidden'))
    })),
    labelFontSize: labelText ? r2(labelText.fontSize) : null,
    labelStyle: labelText ? await styleNameOf(labelText.textStyleId) : null
  };
}

/* ---------- 대상 확정 ---------- */
const targets = [];
const seenIds = {};

for (const k of KNOWN) {
  const n = await figma.getNodeByIdAsync(k.id);
  const rec = { key: k.key, role: k.role, expectedId: k.id, found: !!n, master: k.master };
  if (n) {
    seenIds[n.id] = true;
    rec.insideToolbar = (function () { let p = n.parent;
      while (p) { if (p.id === TOOLBAR_ID) return true; p = p.parent; } return false; })();
    rec.scannedAsControl = controls.some(c => c.id === n.id);
    rec.self = await describeControl(n);
    rec.ancestorIds = ancestorIds(n);
    const p = n.parent;
    rec.parent = p ? parentInfo(p) : null;
    rec.indexAtAuditTime = p && kids(p) ? p.children.indexOf(n) : -1;
  }
  targets.push(rec);
}

/* ---------- Reset 버튼: 구조에서 다시 찾는다 ----------
 * 이름만 보고 확정하지 않는다. 직계 텍스트만 보지도 않는다.
 * (1) 이전에 보였던 id 들이 지금도 있는지 확인하고 그 안을 전부 읽는다
 * (2) 툴바 전체에서 **자손 텍스트**가 Reset 의미와 맞는 노드를 모은다
 * (3) 그중 배경(fill/stroke)을 가진 **가장 바깥쪽** 노드를 클릭 가능한 버튼으로 본다
 * (4) 텍스트로 하나로 좁혀지지 않으면 candidate 로만 보고하고 확정하지 않는다 */

async function probeDetail(id) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) return { id, exists: false };
  const texts = allTextsDeep(n, 12);
  const d = {
    id, exists: true, name: n.name, type: n.type,
    size: r2(n.width) + '×' + r2(n.height),
    x: r2(n.x), y: r2(n.y), visible: n.visible,
    layoutPositioning: 'layoutPositioning' in n ? n.layoutPositioning : null,
    layoutMode: 'layoutMode' in n ? n.layoutMode : null,
    primaryAxisSizingMode: 'primaryAxisSizingMode' in n ? n.primaryAxisSizingMode : null,
    counterAxisSizingMode: 'counterAxisSizingMode' in n ? n.counterAxisSizingMode : null,
    layoutSizingHorizontal: (function () { try { return n.layoutSizingHorizontal; } catch (e) { return null; } })(),
    layoutSizingVertical: (function () { try { return n.layoutSizingVertical; } catch (e) { return null; } })(),
    padding: 'paddingTop' in n
      ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/') : null,
    paddingH: 'paddingLeft' in n ? r2((n.paddingLeft || 0) + (n.paddingRight || 0)) : null,
    gap: 'itemSpacing' in n ? r2(n.itemSpacing) : null,
    cornerRadius: 'cornerRadius' in n
      ? (typeof n.cornerRadius === 'number' ? r2(n.cornerRadius) : 'mixed') : null,
    childCount: (kids(n) || []).length,
    childIds: (kids(n) || []).map(c => c.id),
    parentId: n.parent ? n.parent.id : null,
    parentName: n.parent ? n.parent.name : null,
    indexInParent: n.parent && kids(n.parent) ? n.parent.children.indexOf(n) : -1,
    insideToolbar: (function () { let q = n.parent;
      while (q) { if (q.id === TOOLBAR_ID) return true; q = q.parent; } return false; })(),
    ancestry: ancestorIds(n),
    fills: 'fills' in n ? await paintInfo(n.fills) : null,
    strokes: 'strokes' in n && Array.isArray(n.strokes) && n.strokes.length
      ? await paintInfo(n.strokes) : null,
    childNames: (kids(n) || []).map(c => c.name + ':' + c.type),
    descendantTexts: texts,
    descendantTextJoined: texts.map(t => t.characters).join(' | '),
    iconLike: iconLikeDeep(n, 6)
  };
  d.textMatchesReset = RESET_TEXT_RE.test(d.descendantTextJoined);
  d.nameMatchesReset = RESET_TEXT_RE.test(n.name);
  return d;
}

const resetProbes = [];
for (const id of RESET_PROBE_IDS) resetProbes.push(await probeDetail(id));

/* ---------- Reset 확정: 배경 유무가 아니라 구조로 ----------
 * v3 는 "배경(fill/stroke)을 가진 노드" 를 필수 조건으로 걸었다. 잘못이다.
 * 기존 Reset 은 ghost 스타일이라 fill 도 stroke 도 없다. 그래서 텍스트가 분명히 잡혔는데도
 * 후보가 0개가 됐다. 탐색 실패가 아니라 **선정 조건이 자기모순** 이었다.
 *
 * 새 규칙: 버튼 몸통은 **아이콘과 라벨을 둘 다 품은 가장 안쪽 노드** 다.
 *   1003:1728 (margin)  아이콘+텍스트 포함 → 후보이지만 바깥쪽
 *   1003:1729 (body)    아이콘+텍스트 포함 → **가장 안쪽 → 몸통**
 *   1003:1732 (label)   텍스트만          → 아이콘이 없어 몸통이 아니다
 * 배경은 조건이 아니라 **기록**이다. */

function descTextJoined(n) {
  return collectDeep(n, x => x.type === 'TEXT', 12).map(x => x.characters).join(' ');
}
function iconDescendants(n) {
  return collectDeep(n, c => SHAPE_TYPES_EARLY.indexOf(c.type) >= 0 ||
                             (c.type === 'INSTANCE' && /icon/i.test(c.name)), 8);
}
const SHAPE_TYPES_EARLY = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];

const textMatchNodes = collectDeep(toolbar, function (c) {
  if (c.type === 'TEXT') return false;
  return RESET_TEXT_RE.test(descTextJoined(c));
}, 8).filter(c => !seenIds[c.id]);

/* 아이콘 + 라벨을 둘 다 품은 노드 */
const withIconAndText = textMatchNodes.filter(c => iconDescendants(c).length > 0);
/* 그중 가장 안쪽 (자기 자손이 같은 집합에 없는 것) */
function innermostOf(set) {
  return set.filter(function (n) {
    return !set.some(function (m) {
      if (m.id === n.id) return false;
      let q = m.parent;
      while (q) { if (q.id === n.id) return true; q = q.parent; }
      return false;
    });
  });
}
const bodyByIconAndText = innermostOf(withIconAndText);
/* 아이콘이 아예 없는 버튼(텍스트 전용)을 위한 대비책 */
const autoLayoutTextNodes = textMatchNodes.filter(c =>
  'layoutMode' in c && c.layoutMode !== 'NONE' &&
  ((c.paddingLeft || 0) + (c.paddingRight || 0) > 0 || hasPaint(c)));
const bodyByLayout = innermostOf(autoLayoutTextNodes);

function hasPaint(n) {
  return (Array.isArray(n.fills) && n.fills.some(f => f.visible !== false)) ||
         (Array.isArray(n.strokes) && n.strokes.length > 0);
}

const resetCandidates = [];
for (const c of textMatchNodes) {
  const t = collectDeep(c, x => x.type === 'TEXT', 12).map(x => x.characters);
  resetCandidates.push({
    id: c.id, name: c.name, type: c.type,
    size: r2(c.width) + '×' + r2(c.height),
    matchedText: t.filter(x => RESET_TEXT_RE.test(x))[0] || t.join(' | '),
    allTexts: t,
    iconDescendantCount: iconDescendants(c).length,
    iconDescendantIds: iconDescendants(c).map(x => x.id),
    hasPaint: hasPaint(c),
    hasAutoLayout: 'layoutMode' in c && c.layoutMode !== 'NONE',
    isInnermostWithIconAndText: bodyByIconAndText.some(b => b.id === c.id),
    childCount: (kids(c) || []).length
  });
}

const resetRec = { key: 'reset', role: 'Button', expectedId: null, master: 'button',
                   probes: resetProbes,
                   candidateCount: resetCandidates.length, candidates: resetCandidates,
                   selectionRule: '아이콘과 라벨을 둘 다 품은 가장 안쪽 노드. 배경 유무는 조건이 아니다.' };

let bodyNode = null;
let how = null;
if (bodyByIconAndText.length === 1) { bodyNode = bodyByIconAndText[0]; how = 'descendant text + structure (icon+label, innermost)'; }
else if (bodyByIconAndText.length === 0 && bodyByLayout.length === 1) {
  bodyNode = bodyByLayout[0]; how = 'descendant text + structure (auto layout, innermost) — 아이콘 자손이 없어 대비책 사용';
}

if (bodyNode) {
  seenIds[bodyNode.id] = true;
  resetRec.found = true;
  resetRec.resolvedId = bodyNode.id;
  resetRec.matchedOn = how;
  resetRec.matchedText = (collectDeep(bodyNode, x => x.type === 'TEXT', 12)
    .map(x => x.characters).filter(x => RESET_TEXT_RE.test(x))[0]) || null;
  resetRec.evidence = '텍스트 ' + JSON.stringify(resetRec.matchedText) + ' 와 아이콘 자손 ' +
    JSON.stringify(iconDescendants(bodyNode).map(x => x.id)) + ' 를 둘 다 품은 가장 안쪽 노드. ' +
    '배경 ' + (hasPaint(bodyNode) ? '있음' : '없음(ghost 로 보임)') + ' — 배경은 판정 조건이 아니라 기록이다.';
  resetRec.insideToolbar = true;
  resetRec.scannedAsControl = controls.some(c => c.id === bodyNode.id);
  resetRec.self = await describeControl(bodyNode);
  resetRec.ancestorIds = ancestorIds(bodyNode);
  const rp = bodyNode.parent;
  resetRec.parent = rp ? parentInfo(rp) : null;
  resetRec.indexAtAuditTime = rp && kids(rp) ? rp.children.indexOf(bodyNode) : -1;
} else {
  resetRec.found = false;
  resetRec.resolvedId = null;
  resetRec.matchedOn = null;
  resetRec.matchedText = null;
  resetRec.evidence = bodyByIconAndText.length > 1
    ? '아이콘+라벨을 품은 가장 안쪽 노드가 ' + bodyByIconAndText.length + '개다. 추측으로 고르지 않는다.'
    : '조건을 만족하는 노드가 없다. candidates 의 구조를 보고 규칙을 고쳐야 한다.';
  notes.push('Reset 버튼 미확정 — ' + resetRec.evidence);
}
targets.push(resetRec);

/* ---------- Reset 주변 노드의 역할 판정 (A/B/C) ----------
 * 예상(1728 margin / 1729 body / 1732 label)에 맞추지 않고 구조로 판정한다. */
const resetChainIds = RESET_PROBE_IDS.slice();
if (resetRec.resolvedId && resetChainIds.indexOf(resetRec.resolvedId) < 0) {
  resetChainIds.push(resetRec.resolvedId);
}
const resetRoles = [];
for (const id of resetChainIds) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { resetRoles.push({ id, exists: false }); continue; }
  const icons = iconDescendants(n);
  const texts = collectDeep(n, x => x.type === 'TEXT', 12);
  const ch = kids(n) || [];
  const r = {
    id, name: n.name, exists: true,
    size: r2(n.width) + '×' + r2(n.height),
    childCount: ch.length,
    iconDescendantCount: icons.length,
    textDescendantCount: texts.length,
    hasPaint: hasPaint(n),
    paddingH: 'paddingLeft' in n ? r2((n.paddingLeft || 0) + (n.paddingRight || 0)) : null,
    isResolvedBody: id === resetRec.resolvedId
  };
  if (r.isResolvedBody) {
    r.roleVerdict = 'B. actual clickable button body';
    r.roleEvidence = '아이콘과 라벨을 둘 다 품은 가장 안쪽 노드';
  } else if (icons.length > 0 && texts.length > 0 && ch.length === 1) {
    r.roleVerdict = 'A. wrapper / margin';
    r.roleEvidence = '자식이 하나뿐이고 그 안에 몸통이 들어 있다 — 감싸는 역할';
  } else if (icons.length === 0 && texts.length > 0) {
    r.roleVerdict = 'C. label container';
    r.roleEvidence = '텍스트만 있고 아이콘이 없다';
  } else if (icons.length > 0 && texts.length > 0) {
    r.roleVerdict = 'A. wrapper / margin (자식 ' + ch.length + '개)';
    r.roleEvidence = '몸통을 포함하지만 몸통 자신은 아니다';
  } else {
    r.roleVerdict = 'unknown';
    r.roleEvidence = '아이콘 ' + icons.length + '개 · 텍스트 ' + texts.length + '개 — 판정 근거 부족';
  }
  resetRoles.push(r);
}

/* ---------- wrapper 유지 전략 A vs B ---------- */
let resetWrapperStrategy = null;
if (resetRec.resolvedId) {
  const body = await figma.getNodeByIdAsync(resetRec.resolvedId);
  const wrap = body && body.parent ? body.parent : null;
  if (wrap) {
    const wch = kids(wrap) || [];
    const wrapPadH = 'paddingLeft' in wrap ? r2((wrap.paddingLeft || 0) + (wrap.paddingRight || 0)) : 0;
    const wrapPad = 'paddingTop' in wrap
      ? [wrap.paddingTop, wrap.paddingRight, wrap.paddingBottom, wrap.paddingLeft].map(r2).join('/') : null;
    const isPureMargin = wch.length === 1 && !hasPaint(wrap);
    resetWrapperStrategy = {
      wrapperId: wrap.id, wrapperName: wrap.name,
      wrapperSize: r2(wrap.width) + '×' + r2(wrap.height),
      wrapperPadding: wrapPad, wrapperPaddingH: wrapPadH,
      wrapperChildCount: wch.length, wrapperHasPaint: hasPaint(wrap),
      wrapperIsPureMargin: isPureMargin,
      bodyIndexInWrapper: wch.indexOf(body),
      optionA: {
        what: 'wrapper ' + wrap.id + ' 유지 · 몸통 ' + body.id + ' 숨김 · 새 Button 을 몸통의 기존 index 에 삽입',
        spacingPreserved: isPureMargin ? '그대로 — wrapper 의 padding ' + wrapPad + ' 가 간격을 유지한다'
                                       : 'wrapper 가 단순 margin 이 아니라 확인 필요',
        widthChange: '몸통 폭 변화만 wrapper 로 전달된다',
        indexStability: '삽입 지점이 wrapper 안이라 툴바 직계 자식 순서가 전혀 바뀌지 않는다',
        risk: isPureMargin ? '낮음' : 'wrapper 역할이 확정되지 않으면 보류'
      },
      optionB: {
        what: 'wrapper ' + wrap.id + ' 까지 통째로 숨기고 새 Button 을 상위 그룹에 직접 삽입',
        spacingPreserved: 'wrapper 의 padding ' + wrapPad + ' 가 사라져 간격이 바뀐다',
        widthChange: 'wrapper padding ' + wrapPadH + 'px 만큼 추가로 줄어든다',
        indexStability: '툴바/상위 그룹의 직계 자식이 바뀌어 다른 대상의 index 에도 영향',
        risk: '높음 — 레이아웃을 더 많이 바꾼다'
      },
      recommended: isPureMargin ? 'A' : null,
      recommendationBasis: isPureMargin
        ? 'wrapper 가 자식 1개 · 배경 없음 = 순수 margin 이다. 기존 간격을 가장 적게 건드리는 쪽은 A 다.'
        : 'wrapper 가 순수 margin 이라는 근거가 부족하다 — 사람이 결정해야 한다'
    };
  }
}


/* ---------- 여분 분류 ---------- */
const extras = [];
for (const c of controls) {
  if (seenIds[c.id]) continue;
  const texts = collectDeep(c, x => x.type === 'TEXT', 3).map(x => x.characters);
  let cls = null;
  if (/view|toggle|보기/i.test(c.name + ' ' + texts.join(' '))) {
    cls = { rule: 'viewToggle', label: 'View Toggle — 별도 컴포넌트로 보류하기로 한 요소' };
  } else if (typeof c.height === 'number' && c.height < 28) {
    cls = { rule: 'chipHeight', label: '높이 ' + r2(c.height) + ' — 컨트롤이 아니라 칩/배지 계열' };
  }
  extras.push({ id: c.id, name: c.name, size: r2(c.width) + '×' + r2(c.height), texts,
                explained: !!cls, classifiedBy: cls ? cls.rule : null,
                classifiedAs: cls ? cls.label : null });
}
const unexplainedExtras = extras.filter(e => !e.explained);

/* ---------- 본체 옆 accessory sibling ----------
 * 각 컨트롤 wrapper 안에 본체 말고 다른 자식이 있다. 새 마스터가 이미 아이콘을 품고 있으므로
 * 이것들을 그대로 두면 아이콘이 겹칠 수 있다.
 * **역할이 확정되지 않은 것은 숨기지 않는다.** 여기서는 읽고 분류만 한다. */
const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];

async function accessoryDetail(sib, host, hostNode) {
  const texts = allTextsDeep(sib, 12);
  const shapes = collectDeep(sib, c => SHAPE_TYPES.indexOf(c.type) >= 0, 8);
  const d = {
    id: sib.id, name: sib.name, type: sib.type, visible: sib.visible,
    layoutPositioning: 'layoutPositioning' in sib ? sib.layoutPositioning : null,
    x: r2(sib.x), y: r2(sib.y),
    size: r2(sib.width) + '×' + r2(sib.height),
    width: r2(sib.width), height: r2(sib.height),
    fills: 'fills' in sib ? await paintInfo(sib.fills) : null,
    strokes: 'strokes' in sib && Array.isArray(sib.strokes) && sib.strokes.length
      ? await paintInfo(sib.strokes) : null,
    hasDescendantText: texts.length > 0,
    descendantTexts: texts.map(t => t.characters),
    hasDescendantShape: shapes.length > 0,
    descendantShapes: shapes.map(c => ({ id: c.id, type: c.type,
                                         size: r2(c.width) + '×' + r2(c.height) })),
    childNames: (kids(sib) || []).map(c => c.name + ':' + c.type)
  };

  const sibCenter = sib.x + sib.width / 2;
  const hostCenter = hostNode.x + hostNode.width / 2;
  d.sideRelativeToBody = Math.abs(sibCenter - hostCenter) < 1 ? 'overlap'
    : (sibCenter < hostCenter ? 'left' : 'right');
  d.isSmallSquarish = sib.width <= 28 && sib.height <= 28;
  d.excludedFromLayout = d.layoutPositioning === 'ABSOLUTE' || sib.visible === false;

  /* 역할 추정 — 근거가 충분할 때만 confident = true */
  let role = 'unknown', confident = false, why;
  if (d.hasDescendantText) {
    why = '자손에 텍스트가 있다 — 단순 아이콘이 아니다';
  } else if (!d.hasDescendantShape) {
    why = '자손에 도형이 없다 — 아이콘이라 볼 근거가 없다';
  } else if (!d.isSmallSquarish) {
    role = 'decoration';
    why = '도형은 있으나 ' + d.size + ' 로 아이콘 크기(≤28)가 아니다';
  } else if (host === 'input') {
    if (d.sideRelativeToBody === 'left') { role = 'searchIcon'; confident = true;
      why = '텍스트 없음 + 도형 있음 + ' + d.size + ' + 본체 왼쪽 → 검색 아이콘'; }
    else { role = 'inputTrailingIcon';
      why = '텍스트 없음 + 도형 있음이지만 본체 ' + d.sideRelativeToBody + ' 쪽이다 — 검색 아이콘으로 단정 못 함'; }
  } else if (host.indexOf('select') === 0) {
    if (d.sideRelativeToBody === 'right') { role = 'chevron'; confident = true;
      why = '텍스트 없음 + 도형 있음 + ' + d.size + ' + 본체 오른쪽 → chevron'; }
    else { role = 'selectLeadingIcon';
      why = '텍스트 없음 + 도형 있음이지만 본체 ' + d.sideRelativeToBody + ' 쪽이다 — chevron 으로 단정 못 함'; }
  } else {
    why = 'host 역할을 몰라 판정하지 않는다';
  }
  d.roleGuess = role;
  d.roleConfident = confident;
  d.roleEvidence = why;

  /* 새 마스터가 같은 아이콘을 이미 품고 있는가 */
  d.newMasterAlreadyProvides = role === 'searchIcon' ? 'Input 마스터의 leading = Icon / Search'
    : (role === 'chevron' ? 'Select 마스터 안에 chevron 이 직접 그려져 있음' : null);
  d.duplicateRiskIfKept = !!d.newMasterAlreadyProvides;
  d.recommendedAction = (confident && d.duplicateRiskIfKept)
    ? '본체와 함께 visible = false (아이콘 중복 방지)'
    : '보류 — 역할이 확정되지 않았다. 숨기지 않는다';
  return d;
}

const accessories = [];
for (const t of targets) {
  if (!t.self) continue;
  const node = await figma.getNodeByIdAsync(t.resolvedId || t.expectedId);
  if (!node || !node.parent) continue;
  const sibs = (kids(node.parent) || []).filter(c => c.id !== node.id);
  const probe = ACCESSORY_PROBES[node.id];
  for (const sib of sibs) {
    const d = await accessoryDetail(sib, t.key, node);
    d.hostKey = t.key;
    d.hostId = node.id;
    d.parentId = node.parent.id;
    d.expectedFromPriorAudit = !!(probe && probe.siblingId === sib.id);
    d.expectedRoleFromPriorAudit = probe && probe.siblingId === sib.id ? probe.expectedRole : null;
    d.matchesPriorExpectation = d.expectedRoleFromPriorAudit
      ? d.roleGuess === d.expectedRoleFromPriorAudit : null;
    accessories.push(d);
  }
}
const accessoriesUnresolved = accessories.filter(a => !a.roleConfident);
const accessoryRolesResolved = accessories.length > 0 && accessoriesUnresolved.length === 0;
if (!accessoryRolesResolved) {
  notes.push('accessory ' + accessoriesUnresolved.length + '개의 역할을 확정하지 못했다. ' +
             '확정 전에는 숨기지 않는다 — roleEvidence 를 보고 알려주면 반영한다.');
}

/* ---------- 마스터 라벨 폭 (추정의 기준) ---------- */
for (const k of Object.keys(masterInfo)) {
  const mi = masterInfo[k];
  if (!mi.found) continue;
  const set = await figma.getNodeByIdAsync(mi.setId);
  const v0 = set.children[0];
  const lt = firstTextDeep(v0, 2);
  mi.labelWidth = lt ? r2(lt.width) : null;
  mi.variantWidth = r2(v0.width);
  mi.variantGap = r2(v0.itemSpacing || 0);
  mi.fillsByVariant = [];
  for (const v of set.children) {
    mi.fillsByVariant.push({ variant: v.name, fills: await paintInfo(v.fills),
                             strokes: Array.isArray(v.strokes) && v.strokes.length
                               ? await paintInfo(v.strokes) : null });
  }
}

/* ---------- 폭 예측 ---------- */
const LEADING_SLOT = 16;
const widthPlan = [];
for (const t of targets) {
  if (!t.self) { widthPlan.push({ key: t.key, role: t.role, resolved: false }); continue; }
  const mi = masterInfo[t.master];
  const cur = t.self.width;
  const rec = { key: t.key, role: t.role, id: t.resolvedId || t.expectedId,
                currentWidth: cur, text: t.self.primaryText };

  if (t.role === 'Input') {
    /* 새 Input 은 240 고정 — 추정이 아니라 확정 */
    const v = mi.found ? mi.variants[0] : null;
    rec.predictedWidth = v ? parseFloat(v.size.split('×')[0]) : 240;
    rec.predictionKind = 'exact';
    rec.basis = '새 Input 마스터가 240 고정 폭이다';
    rec.predictedLow = rec.predictedWidth;
    rec.predictedHigh = rec.predictedWidth;
  } else if (mi.found && mi.labelWidth !== null && t.self.primaryTextWidth !== null &&
             t.self.primaryTextFontSize && mi.labelFontSize) {
    /* hug — 마스터의 실측 폭에서 마스터 라벨 폭만 우리 라벨 추정 폭으로 갈아끼운다.
     * padding · gap · chevron 은 전부 마스터 실측값이 그대로 반영된다. 추정은 라벨 폭 하나뿐이다. */
    const scale = mi.labelFontSize / t.self.primaryTextFontSize;
    const sameSize = Math.abs(mi.labelFontSize - t.self.primaryTextFontSize) < 0.01;
    const estLabel = r2(t.self.primaryTextWidth * scale);
    rec.labelFontSizeUnchanged = sameSize;
    const addLeading = (t.role === 'Button') ? r2(mi.variantGap + LEADING_SLOT) : 0;
    rec.estimatedLabelWidth = estLabel;
    rec.labelScale = r2(scale);
    rec.leadingAddition = addLeading;
    rec.predictedWidth = r2(mi.variantWidth - mi.labelWidth + estLabel + addLeading);
    /* 글자크기가 그대로면 라벨 폭도 그대로다 — 비례 가정이 필요 없으니 추정이 아니다 */
    rec.predictionKind = sameSize ? 'measuredLabel' : 'estimate';
    rec.basis = '마스터 실측 폭 ' + mi.variantWidth + ' − 마스터 라벨 ' + mi.labelWidth +
                ' + 추정 라벨 ' + estLabel + (addLeading ? ' + leading ' + addLeading : '') +
                '. 라벨 폭만 글자크기 비례로 추정했다 (' + t.self.primaryTextFontSize +
                ' → ' + mi.labelFontSize + ').';
    const band = sameSize ? 0 : 0.15;
    rec.predictedLow = r2(mi.variantWidth - mi.labelWidth + estLabel * (1 - band) + addLeading);
    rec.predictedHigh = r2(mi.variantWidth - mi.labelWidth + estLabel * (1 + band) + addLeading);
    /* 직접식(= padding + icon + gap + label)은 **Button 에만** 성립한다.
     * Select 는 마스터 안에 chevron 과 그 gap 이 더 있어서 이 식으로는 모자란다.
     * 같은 것을 모델링하지 않는 두 식을 비교하면 없는 불일치를 만들어낸다. */
    rec.directFormulaApplicable = t.role === 'Button';
    rec.directFormula = t.role !== 'Button' ? null : {
      paddingH: mi.variants[0] ? mi.variants[0].paddingH : null,
      leadingIcon: addLeading ? LEADING_SLOT : 0,
      gap: addLeading ? mi.variantGap : 0,
      labelWidth: estLabel,
      total: r2((mi.variants[0] ? mi.variants[0].paddingH : 0) + estLabel + addLeading)
    };
    rec.formulasAgree = !rec.directFormulaApplicable ? null
      : Math.abs(rec.directFormula.total -
          r2(mi.variantWidth - mi.labelWidth + estLabel + addLeading)) < 1.5;
    if (rec.formulasAgree === false) {
      notes.push(t.key + ' 폭 계산 두 식이 어긋난다 (마스터차감식 ' +
        r2(mi.variantWidth - mi.labelWidth + estLabel + addLeading) + ' vs 직접식 ' +
        rec.directFormula.total + ') — 마스터 안에 계산에 안 잡힌 요소가 있다는 뜻이다. ' +
        '보수적으로 큰 쪽을 쓰는 것이 안전하다.');
    }
  } else {
    rec.predictedWidth = null;
    rec.predictionKind = 'unknown';
    rec.basis = '마스터 라벨 폭이나 현재 글자크기를 읽지 못해 추정할 수 없다';
    notes.push(t.key + ' 폭을 추정하지 못했다 — 값이 다르다는 뜻이 아니라 읽지 못했다는 뜻이다');
  }
  rec.widthDelta = rec.predictedWidth === null ? null : r2(rec.predictedWidth - cur);
  rec.parentId = t.parent ? t.parent.id : null;
  widthPlan.push(rec);
}

/* ---------- 툴바 가로 배치 ---------- */
const tb = parentInfo(toolbar);
const deltaByParent = {};
for (const w of widthPlan) {
  if (w.widthDelta === null || !w.parentId) continue;
  deltaByParent[w.parentId] = r2((deltaByParent[w.parentId] || 0) + w.widthDelta);
}
/* 각 툴바 직계 자식이 품은 델타를 위로 올린다 */
function ancestorIds(n) {
  const ids = [];
  let p = n.parent;
  while (p) { ids.push(p.id); if (p.id === TOOLBAR_ID) break; p = p.parent; }
  return ids;
}
const toolbarChildren = (kids(toolbar) || []).map(g => {
  let delta = 0, deltaLow = 0, deltaHigh = 0, unresolvedInside = 0;
  for (const t of targets) {
    const inside = (t.self && (t.self.id === g.id || (t.ancestorIds || []).indexOf(g.id) >= 0));
    if (!t.self) { unresolvedInside++; continue; }   // 미확정 대상은 어느 그룹인지도 모른다
    if (!inside) continue;
    const w = widthPlan.filter(x => x.key === t.key)[0];
    if (!w || w.widthDelta === null) { unresolvedInside++; continue; }
    delta += w.widthDelta;
    deltaLow += r2((w.predictedLow === undefined ? w.predictedWidth : w.predictedLow) - w.currentWidth);
    deltaHigh += r2((w.predictedHigh === undefined ? w.predictedWidth : w.predictedHigh) - w.currentWidth);
  }
  const hugs = (function () { try { return g.layoutSizingHorizontal === 'HUG'; } catch (e) { return null; } })();
  const w0 = r2(g.width);
  return { id: g.id, name: g.name, type: g.type, width: w0, height: r2(g.height),
           visible: g.visible, hugsHorizontally: hugs,
           containedDelta: r2(delta), containedDeltaLow: r2(deltaLow), containedDeltaHigh: r2(deltaHigh),
           unresolvedTargetsInside: unresolvedInside,
           predictedWidth: hugs === false ? w0 : r2(w0 + delta),
           predictedWidthLow: hugs === false ? w0 : r2(w0 + deltaLow),
           predictedWidthHigh: hugs === false ? w0 : r2(w0 + deltaHigh),
           note: hugs === false
             ? '이 그룹은 폭이 고정이라 바깥으로 커지지 않는다 — 대신 안에서 넘칠 수 있다'
             : '이 그룹은 hug 라 내용 폭만큼 같이 변한다' };
});

function occupancy(widthKey) {
  const groups = toolbarChildren.filter(g => g.visible !== false);
  return r2(groups.reduce((a, g) => a + g[widthKey], 0) +
            tb.gap * Math.max(0, tb.visibleChildCount - 1) + tb.paddingH);
}
const contentAfter = occupancy('predictedWidth');
const contentAfterLow = occupancy('predictedWidthLow');
const contentAfterHigh = occupancy('predictedWidthHigh');

const unresolvedTargets = targets.filter(t => !t.self).map(t => t.key);
const widthImpactIncludesAllSix = unresolvedTargets.length === 0 &&
  widthPlan.filter(w => w.predictionKind && w.predictionKind !== 'unknown').length === 6;

const toolbarWidthImpact = {
  includesAllSixTargets: widthImpactIncludesAllSix,
  unresolvedTargets,
  usableAsSafetyVerdict: widthImpactIncludesAllSix,
  usabilityNote: widthImpactIncludesAllSix
    ? '6개 대상이 모두 반영되어 있어 안전 판정에 쓸 수 있다'
    : '미확정 대상(' + (unresolvedTargets.join(', ') || '없음') + ')이 빠져 있어 ' +
      '이 값은 Phase B 전체의 안전 판정으로 쓸 수 없다',
  toolbarWidth: tb.width,
  toolbarHeight: tb.height,
  layoutMode: tb.layoutMode,
  primaryAxisAlignItems: tb.primaryAxisAlignItems,
  padding: tb.padding, gap: tb.gap,
  directChildren: toolbarChildren,
  currentOccupiedWidth: tb.contentWidthIfHiddenExcluded,
  predictedOccupiedWidth: contentAfter,
  predictedOccupiedWidthLow: contentAfterLow,
  predictedOccupiedWidthHigh: contentAfterHigh,
  freeSpaceNow: tb.freeSpaceNow,
  freeSpaceAfter: r2(tb.width - contentAfter),
  /* 이름 주의: freeSpaceAfterLow 는 **남는 공간이 가장 적은** 경우다 (폭 추정 상한). 보수적 판정용. */
  freeSpaceAfterLow: r2(tb.width - contentAfterHigh),
  freeSpaceAfterHigh: r2(tb.width - contentAfterLow),
  overflowNow: tb.freeSpaceNow < 0,
  overflowRiskAfterMedian: r2(tb.width - contentAfter) < 0,
  overflowRiskAfterConservative: r2(tb.width - contentAfterHigh) < 0,
  collisionRisk: tb.primaryAxisAlignItems === 'SPACE_BETWEEN' && r2(tb.width - contentAfterHigh) < 0,
  note: 'SPACE_BETWEEN 은 남는 공간을 좌우로 벌린다. 0 밑으로 내려가면 좌우 그룹이 붙거나 겹친다. ' +
        '중앙값(freeSpaceAfter)만 보고 안전하다고 하지 말 것 — Select·Button 은 추정치다. ' +
        'collisionRisk 는 **보수적 상한(freeSpaceAfterLow)** 기준이다.'
};

/* ---------- 툴바 세로 ---------- */
const CONTROL_H = 36;
const tallestAfter = Math.max(CONTROL_H, tb.tallestVisibleChild);
/* ---------- Reset 폭 상세 ---------- */
let resetWidthDetail = null;
if (resetRec.resolvedId && resetRec.self) {
  const w = widthPlan.filter(x => x.key === 'reset')[0];
  const wrapId = resetWrapperStrategy ? resetWrapperStrategy.wrapperId : null;
  const wrapNode = wrapId ? await figma.getNodeByIdAsync(wrapId) : null;
  const bodyCur = resetRec.self.width;
  const bodyNew = w && w.predictedWidth !== null ? w.predictedWidth : null;
  resetWidthDetail = {
    resetBodyId: resetRec.resolvedId,
    resetCurrentBodyWidth: bodyCur,
    resetCurrentWrapperWidth: wrapNode ? r2(wrapNode.width) : null,
    resetPredictedButtonWidth: bodyNew,
    resetPredictedWrapperWidth: (wrapNode && bodyNew !== null)
      ? r2(wrapNode.width - bodyCur + bodyNew) : null,
    resetWidthDelta: bodyNew === null ? null : r2(bodyNew - bodyCur),
    predictionKind: w ? w.predictionKind : null,
    labelFontSizeUnchanged: w ? w.labelFontSizeUnchanged : null,
    directFormula: w ? w.directFormula : null,
    formulasAgree: w ? w.formulasAgree : null,
    note: 'wrapper 폭은 몸통 폭 변화만큼만 따라간다 (wrapper 가 hug 일 때). ' +
          'wrapper padding 은 그대로 유지된다.'
  };
}

/* ---------- 폭 증가 원인 분해 ---------- */
const widthDeltaBreakdown = widthPlan
  .filter(w => w.widthDelta !== null)
  .map(w => ({ key: w.key, role: w.role, currentWidth: w.currentWidth,
               predictedWidth: w.predictedWidth, delta: w.widthDelta,
               leadingAddition: w.leadingAddition || 0,
               predictionKind: w.predictionKind }))
  .sort((a, b) => b.delta - a.delta);

const toolbarHeightImpact = {
  parentIsHug: tb.layoutMode === 'HORIZONTAL' ? tb.counterAxisSizingMode === 'AUTO'
                                              : tb.primaryAxisSizingMode === 'AUTO',
  tallestVisibleChildNow: tb.tallestVisibleChild,
  newControlHeight: CONTROL_H,
  tallestAfter: r2(tallestAfter),
  predictedHeightBefore: r2(tb.tallestVisibleChild + tb.paddingV),
  predictedHeightAfter: r2(tallestAfter + tb.paddingV),
  measuredHeightNow: tb.height
};
toolbarHeightImpact.formulaMatchesMeasured =
  Math.abs(toolbarHeightImpact.predictedHeightBefore - tb.height) < 0.5;
/* v2 는 0.5px 허용오차를 boolean 안에 숨겨서 "0.5 증가인데 안 커진다" 처럼 보였다.
 * 허용오차를 값으로 꺼내 raw 와 effective 를 분리한다. */
toolbarHeightImpact.tolerancePx = 0.5;
toolbarHeightImpact.rawGrowthPx = toolbarHeightImpact.parentIsHug
  ? r2(toolbarHeightImpact.predictedHeightAfter - tb.height) : 0;
toolbarHeightImpact.effectiveGrowthPx =
  Math.abs(toolbarHeightImpact.rawGrowthPx) <= toolbarHeightImpact.tolerancePx
    ? 0 : toolbarHeightImpact.rawGrowthPx;
toolbarHeightImpact.toolbarActuallyGrows = toolbarHeightImpact.effectiveGrowthPx > 0;
toolbarHeightImpact.toleranceNote =
  '허용오차 ' + toolbarHeightImpact.tolerancePx + 'px 이내의 차이는 반올림·line-height 오차로 보고 0 으로 친다. ' +
  'rawGrowthPx 가 실제 계산값이고 toolbarActuallyGrows 는 effectiveGrowthPx 기준이다.';
/* 남아 있던 옛 키를 제거하지 않고 별칭으로 유지하면 혼동되므로 쓰지 않는다 */
delete toolbarHeightImpact.heightGrowthPx;
if (!toolbarHeightImpact.formulaMatchesMeasured) {
  notes.push('툴바 높이 공식이 현재 값을 재현하지 못한다 (' +
             toolbarHeightImpact.predictedHeightBefore + ' vs 실측 ' + tb.height +
             ') — 높이 예측을 확정값으로 쓰지 말 것');
}

/* ---------- 숨긴 자식이 가로 자리를 차지하는가: Phase A 실측 증거 ----------
 * 기준점은 **Phase A 가 실제로 숨긴 원본 노드** 다. 부모 id 는 추측하지 않고
 * 그 노드에서 거슬러 올라가 잡는다. (예상 부모 id 는 대조용으로만 쓴다)
 *
 *   v2.4  숨긴 원본 1002:506  새 인스턴스 1062:63
 *   시즌  숨긴 원본 1009:703  새 인스턴스 1062:67
 *
 * 결과가 indeterminate 이거나 어긋나도 **어느 쪽으로도 단정하지 않는다.**
 * 이 검사는 gate 조건이 아니다. */
const PHASE_A_HIDDEN = [
  { key: 'version', hiddenNodeId: '1002:506', newInstanceId: '1062:63', expectedParentId: '1002:495' },
  { key: 'season',  hiddenNodeId: '1009:703', newInstanceId: '1062:67', expectedParentId: '1009:700' }
];

const hiddenChildEvidence = [];
for (const h of PHASE_A_HIDDEN) {
  const e = { key: h.key, hiddenNodeId: h.hiddenNodeId, newInstanceId: h.newInstanceId,
              expectedParentId: h.expectedParentId };
  const hn = await figma.getNodeByIdAsync(h.hiddenNodeId);
  if (!hn) {
    e.hiddenNodeFound = false;
    e.verdict = 'indeterminate';
    e.reason = '숨긴 원본 ' + h.hiddenNodeId + ' 을 찾지 못했다';
    hiddenChildEvidence.push(e);
    continue;
  }
  e.hiddenNodeFound = true;
  e.hiddenNodeName = hn.name;
  e.hiddenNodeVisible = hn.visible;
  e.hiddenNodeIsHidden = hn.visible === false;
  e.hiddenNodeWidth = r2(hn.width);

  const p = hn.parent;
  if (!p) {
    e.verdict = 'indeterminate';
    e.reason = '숨긴 원본의 부모를 찾지 못했다';
    hiddenChildEvidence.push(e);
    continue;
  }
  e.parentId = p.id;
  e.parentName = p.name;
  e.parentMatchesExpected = p.id === h.expectedParentId;
  if (!e.parentMatchesExpected) {
    notes.push(h.key + ' 숨긴 원본의 실제 부모는 ' + p.id + ' 다 (예상 ' + h.expectedParentId + '). ' +
               '예상 id 가 아니라 실제 부모로 계산한다.');
  }

  const cs = kids(p) || [];
  const inLayout = cs.filter(c => c.layoutPositioning !== 'ABSOLUTE');
  const vis = inLayout.filter(c => c.visible !== false);
  e.visibleChildren = vis.map(c => ({ id: c.id, name: c.name, width: r2(c.width), height: r2(c.height) }));
  e.hiddenChildren = inLayout.filter(c => c.visible === false)
    .map(c => ({ id: c.id, name: c.name, width: r2(c.width) }));
  e.newInstancePresentAndVisible = vis.some(c => c.id === h.newInstanceId);
  if (!e.newInstancePresentAndVisible) {
    notes.push(h.key + ' 새 인스턴스 ' + h.newInstanceId + ' 가 이 부모의 보이는 자식에 없다 — 부모를 다시 확인할 것');
  }

  e.parentLayoutMode = 'layoutMode' in p ? p.layoutMode : null;
  const padH = r2((p.paddingLeft || 0) + (p.paddingRight || 0));
  const gap = r2(p.itemSpacing || 0);
  e.parentPaddingH = padH;
  e.parentGap = gap;
  e.measuredParentWidth = r2(p.width);
  let hugsH = null;
  try { hugsH = p.layoutSizingHorizontal === 'HUG'; } catch (err) { /* 지원 안 함 */ }
  e.parentHugsHorizontally = hugsH;

  const sum = arr => arr.reduce((a, c) => a + c.width, 0);
  if (e.parentLayoutMode === 'HORIZONTAL') {
    e.predictedWidthExcludingHidden = r2(sum(vis) + gap * Math.max(0, vis.length - 1) + padH);
    e.predictedWidthIncludingHidden = r2(sum(inLayout) + gap * Math.max(0, inLayout.length - 1) + padH);
    e.formula = '가로: 자식 폭 합 + gap × (개수−1) + 좌우 padding';
  } else if (e.parentLayoutMode === 'VERTICAL') {
    e.predictedWidthExcludingHidden = vis.length ? r2(Math.max.apply(null, vis.map(c => c.width)) + padH) : null;
    e.predictedWidthIncludingHidden = inLayout.length
      ? r2(Math.max.apply(null, inLayout.map(c => c.width)) + padH) : null;
    e.formula = '세로: 가장 넓은 자식 + 좌우 padding';
  } else {
    e.predictedWidthExcludingHidden = null;
    e.predictedWidthIncludingHidden = null;
    e.formula = 'Auto Layout 이 아니라 내용 폭 공식이 성립하지 않는다';
  }

  const exOk = e.predictedWidthExcludingHidden !== null &&
               Math.abs(e.predictedWidthExcludingHidden - p.width) < 0.5;
  const inOk = e.predictedWidthIncludingHidden !== null &&
               Math.abs(e.predictedWidthIncludingHidden - p.width) < 0.5;
  e.excludingMatches = exOk;
  e.includingMatches = inOk;

  if (e.hiddenChildren.length === 0) {
    e.verdict = 'indeterminate';
    e.reason = '이 부모에 숨긴 자식이 없어 두 가설이 같은 값을 낸다';
  } else if (hugsH !== true) {
    e.verdict = 'indeterminate';
    e.reason = '부모 폭이 hug 가 아니라(' + hugsH + ') 내용 폭으로 판별할 수 없다';
  } else if (exOk && !inOk) {
    e.verdict = 'hiddenExcluded';
    e.reason = '측정 폭 ' + e.measuredParentWidth + ' 가 숨김 제외 값과만 맞는다';
  } else if (inOk && !exOk) {
    e.verdict = 'hiddenIncluded';
    e.reason = '측정 폭 ' + e.measuredParentWidth + ' 가 숨김 포함 값과만 맞는다';
  } else {
    e.verdict = 'indeterminate';
    e.reason = exOk && inOk ? '두 가설이 모두 맞아 구분되지 않는다'
      : '두 가설 모두 측정 폭을 재현하지 못한다 (제외 ' + e.predictedWidthExcludingHidden +
        ' / 포함 ' + e.predictedWidthIncludingHidden + ' vs 측정 ' + e.measuredParentWidth + ')';
  }
  hiddenChildEvidence.push(e);
}

const evidenceVerdicts = hiddenChildEvidence.map(e => e.verdict);
const decisive = evidenceVerdicts.filter(v => v !== 'indeterminate');
const hiddenChildConclusion = {
  verdicts: evidenceVerdicts,
  parentsChecked: hiddenChildEvidence.length,
  decisiveCount: decisive.length,
  indeterminateCount: evidenceVerdicts.length - decisive.length,
  agreed: evidenceVerdicts.filter(v => v !== 'indeterminate').length > 0 &&
          evidenceVerdicts.filter(v => v !== 'indeterminate')
            .every((v, i, a) => v === a[0]),
  conclusion: null,
  note: '이 검사는 gate 조건이 아니다. indeterminate 이거나 두 부모가 엇갈리면 ' +
        '"공간을 차지한다/안 한다" 어느 쪽으로도 단정하지 않고, Phase B DRY_RUN 에서 ' +
        '툴바 폭 여유가 충분한지로 안전을 확보한다.'
};
if (hiddenChildConclusion.agreed) {
  hiddenChildConclusion.conclusion = decisive[0];
  hiddenChildConclusion.support = decisive.length === hiddenChildEvidence.length
    ? '부모 ' + decisive.length + '곳 모두에서 같은 결과'
    : '부모 ' + decisive.length + '곳에서만 판별됨 (나머지는 판별 불가) — 근거가 하나뿐이면 그만큼만 믿을 것';
  if (decisive.length < hiddenChildEvidence.length) {
    notes.push('숨긴 자식 검사가 부모 ' + decisive.length + '/' + hiddenChildEvidence.length +
               ' 곳에서만 판별됐다. 결론은 그 범위 안에서만 유효하다.');
  }
} else {
  notes.push('숨긴 자식의 가로 점유 여부를 이번 데이터로 단정하지 못했다 (' +
             evidenceVerdicts.join(', ') + '). 어느 쪽으로도 결론내지 않는다.');
}

/* ---------- 매핑 제안 (측정 기반, 결정은 사람이) ---------- */
const mapping = [];
for (const t of targets) {
  const mi = masterInfo[t.master];
  const rec = { key: t.key, role: t.role,
                id: t.resolvedId || t.expectedId, found: !!t.self,
                masterSet: mi ? mi.setId : null, masterName: mi ? mi.name : null };
  if (t.self && mi && mi.found) {
    rec.label = t.self.primaryText;
    rec.variantOptions = mi.variants.map(v => v.name);
    if (t.role === 'Button') {
      /* 색을 임의로 정하지 않는다. 배경·테두리·radius 를 각 variant 와 대조해 보고만 한다. */
      const curHex = (t.self.fills || []).filter(f => f.hex)[0];
      const curStroke = (t.self.strokes || []).filter(f => f.hex)[0];
      rec.currentFill = curHex ? curHex.hex : null;
      rec.currentFillVariable = curHex ? curHex.variable : null;
      rec.currentStroke = curStroke ? curStroke.hex : null;
      rec.currentHasBackground = !!curHex;
      rec.currentHasBorder = !!curStroke;
      rec.currentRadius = t.self.cornerRadius;
      rec.currentTextColor = null;
      try {
        const lt = firstTextDeep(await figma.getNodeByIdAsync(t.resolvedId || t.expectedId), 6);
        if (lt && Array.isArray(lt.fills)) {
          const pi = await paintInfo(lt.fills);
          const h = (pi || []).filter(f => f.hex)[0];
          rec.currentTextColor = h ? h.hex : null;
          rec.currentTextVariable = h ? h.variable : null;
        }
      } catch (e) { /* 무시 */ }

      rec.variantComparison = (mi.fillsByVariant || []).map(function (v) {
        const h = (v.fills || []).filter(f => f.hex)[0];
        const sk = (v.strokes || []).filter(f => f.hex)[0];
        return { variant: v.variant, fill: h ? h.hex : null, stroke: sk ? sk.hex : null,
                 hasBackground: !!h, hasBorder: !!sk,
                 backgroundMatches: (!!h) === (!!curHex) &&
                   (!h || !curHex || h.hex.toLowerCase() === curHex.hex.toLowerCase()),
                 borderMatches: (!!sk) === (!!curStroke) &&
                   (!sk || !curStroke || sk.hex.toLowerCase() === curStroke.hex.toLowerCase()) };
      });
      const full = rec.variantComparison.filter(v => v.backgroundMatches && v.borderMatches);
      rec.variantFillMatches = full.map(v => v.variant);
      rec.suggestedVariant = full.length === 1 ? full[0].variant : null;
      rec.variantDecision = full.length === 1
        ? '배경·테두리 유무와 색이 모두 일치하는 variant 가 ' + full[0].variant + ' 하나뿐이다'
        : (full.length === 0
            ? '일치하는 variant 가 없다 — 사람이 정해야 한다'
            : '일치하는 variant 가 ' + full.length + '개다 (' + rec.variantFillMatches.join(', ') +
              ') — 사람이 정해야 한다');
      rec.leading = 'Icon / Reset, visible = true';
    } else if (t.role === 'Input') {
      rec.suggestedVariant = rec.variantOptions.filter(v => /default/i.test(v))[0] || null;
      rec.variantDecision = 'default 상태로 교체한다 (focus/disabled 는 상호작용 상태)';
      rec.leading = 'Icon / Search, visible = true';
    } else {
      rec.suggestedVariant = rec.variantOptions.filter(v => /default/i.test(v))[0] || null;
      rec.variantDecision = 'default 상태로 교체한다';
      rec.leading = '없음 — chevron 은 Select 마스터 안에 직접 그려져 있어 swap 대상이 아니다';
    }
    rec.resolved = !!rec.suggestedVariant && typeof rec.label === 'string' && rec.label.length > 0;
  } else {
    rec.resolved = false;
  }
  mapping.push(rec);
}

/* ---------- 삽입 순서 안전성 ---------- */
const byParent = {};
for (const t of targets) {
  if (!t.parent) continue;
  (byParent[t.parent.id] = byParent[t.parent.id] || []).push({
    key: t.key, id: t.resolvedId || t.expectedId, indexAtAuditTime: t.indexAtAuditTime
  });
}
const insertionSafety = Object.keys(byParent).map(pid => {
  const list = byParent[pid].slice().sort((a, b) => b.indexAtAuditTime - a.indexAtAuditTime);
  return {
    parentId: pid, targetCount: list.length,
    targetsDescendingByIndex: list,
    indexShiftRisk: list.length > 1,
    note: list.length > 1
      ? '같은 부모에 대상이 ' + list.length + '개다. 앞에서 삽입하면 뒤 대상의 index 가 밀린다.'
      : '이 부모에는 대상이 하나뿐이라 index 간섭이 없다'
  };
});
const anyParentHasMultipleTargets = insertionSafety.some(x => x.indexShiftRisk);

/* ---------- gate ---------- */
const targetCount = targets.filter(t => t.found).length;
const inputCount = targets.filter(t => t.found && t.role === 'Input').length;
const selectCount = targets.filter(t => t.found && t.role === 'Select').length;
const resetCount = targets.filter(t => t.found && t.key === 'reset').length;

const gate = {
  inputFound: inputCount === 1,
  selectCountIs4: selectCount === 4,
  resetResolved: resetCount === 1 && !!resetRec.resolvedId,
  targetCountIs6: targetCount === 6,
  allKnownTargetsScanned: targets.every(t => !t.found || t.scannedAsControl === true),
  accessoryRolesResolved: accessoryRolesResolved,
  mappingResolved: mapping.every(m => m.resolved === true),
  unexplainedExtraCountZero: unexplainedExtras.length === 0,
  widthImpactIncludesAllSix: widthImpactIncludesAllSix,
  layoutImpactMeasurable: widthPlan.length > 0 &&
                          widthPlan.every(w => w.predictionKind && w.predictionKind !== 'unknown') &&
                          toolbarHeightImpact.formulaMatchesMeasured === true
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,

  gate, gatePassed,
  targetCount, inputCount, selectCount, resetCount,

  toolbar: tb,
  targets,
  resetRoles,
  resetWrapperStrategy,
  resetWidthDetail,
  widthDeltaBreakdown,
  resetResolution: { probes: resetRec.probes, selectionRule: resetRec.selectionRule,
                     candidateCount: resetRec.candidateCount, candidates: resetRec.candidates,
                     resolvedId: resetRec.resolvedId, matchedOn: resetRec.matchedOn,
                     matchedText: resetRec.matchedText, evidence: resetRec.evidence },

  replacementPlan: targets.filter(t => t.self).map(function (t) {
    const accs = accessories.filter(a => a.hostKey === t.key);
    return {
      key: t.key, role: t.role,
      oldBodyToHide: t.resolvedId || t.expectedId,
      oldAccessoriesToHide: accs.filter(a => a.roleConfident && a.duplicateRiskIfKept).map(a => a.id),
      accessoriesLeftAlone: accs.filter(a => !(a.roleConfident && a.duplicateRiskIfKept))
        .map(a => ({ id: a.id, reason: a.roleEvidence })),
      newInstance: t.role + ' 마스터의 default variant',
      deletePolicy: '삭제하지 않는다. 본체와 accessory 모두 visible = false 로 보존한다'
    };
  }),

  accessories,
  accessoriesUnresolved,
  accessoryRolesResolved,
  accessoryNote: '역할이 확정되지 않은 accessory 는 숨기지 않는다. ' +
                 'roleConfident 가 true 이고 duplicateRiskIfKept 가 true 인 것만 본체와 함께 숨길 후보다.',

  extras, unexplainedExtras, unexplainedExtraCount: unexplainedExtras.length,
  extraNote: '여분은 없어야 하는 것이 아니라 설명되어야 하는 것이다. classifiedBy 가 근거이고 근거도 검토 대상이다.',

  masters: masterInfo,
  mapping,

  widthPlan,
  widthNote: 'Input 만 exact 다 (240 고정). Select·Button 은 hug 라 estimate 이며 ' +
             'predictedLow~predictedHigh 는 라벨 폭 ±15% 범위다. 확정은 교체 후 검증기에서 실측한다.',
  toolbarWidthImpact,
  toolbarHeightImpact,
  hiddenChildEvidence,
  hiddenChildConclusion,

  insertionSafety,
  anyParentHasMultipleTargets,
  insertionStrategy: {
    recommended: 'APPLY 직전에 src.parent.children.indexOf(src) 를 매번 다시 계산한다',
    why: '감사 시점 index 를 저장해 쓰면 앞선 삽입 때문에 뒤 대상이 밀린다. ' +
         'descending 순서도 같은 부모·같은 배열 가정에 기대는데, 재계산은 그 가정 자체가 필요 없다.',
    alsoDo: '삽입 직후 indexOf(새 인스턴스) === 재계산한 index 이고 indexOf(원본) === index+1 인지 확인하고, ' +
            '아니면 거기서 멈춘다',
    doNot: '감사 결과의 indexAtAuditTime 을 APPLY 에 그대로 쓰지 말 것 — 보고용이다'
  },

  notes,
  nextStep: 'gatePassed = true 이고 매핑이 맞으면 Phase B DRY_RUN(17)과 검증기(17b)를 씁니다.'
});
