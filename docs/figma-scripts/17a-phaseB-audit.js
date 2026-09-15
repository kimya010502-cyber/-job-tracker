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

const SCRIPT_VERSION = '17a-v1-phaseB-audit';

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
const RESET_TEXT_RE = /초기화|리셋|reset/i;

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
  return collectDeep(n, c => c.type === 'TEXT', depth).map(t => ({
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
  const hasPaintOrStroke = (Array.isArray(n.fills) && n.fills.some(f => f.visible !== false)) ||
                           (Array.isArray(n.strokes) && n.strokes.length > 0);
  return hasText && hasPaintOrStroke;
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

/* Reset 버튼 — 텍스트로 찾는다. 후보를 전부 보고한다. */
const resetCandidates = [];
for (const c of controls) {
  if (seenIds[c.id]) continue;
  const texts = collectDeep(c, x => x.type === 'TEXT', 3).map(x => x.characters).join(' ');
  const byText = RESET_TEXT_RE.test(texts);
  const byName = RESET_TEXT_RE.test(c.name);
  if (byText || byName) {
    /* 무엇으로 맞았는지 기록한다. 근거를 잘못 적으면 검토가 안 된다. */
    resetCandidates.push({ id: c.id, name: c.name, size: r2(c.width) + '×' + r2(c.height), texts,
                           matchedOn: byText && byName ? 'text+name' : (byText ? 'text' : 'name') });
  }
}
const resetRec = { key: 'reset', role: 'Button', expectedId: null, master: 'button',
                   candidateCount: resetCandidates.length, candidates: resetCandidates };
if (resetCandidates.length === 1) {
  const n = await figma.getNodeByIdAsync(resetCandidates[0].id);
  seenIds[n.id] = true;
  resetRec.found = true;
  resetRec.resolvedId = n.id;
  resetRec.resolvedBy = '툴바 안에서 ' + resetCandidates[0].matchedOn + ' 가 ' +
    JSON.stringify(RESET_TEXT_RE.source) + ' 에 맞아 찾음 (후보 1개). ' +
    (resetCandidates[0].matchedOn === 'name'
      ? '⚠ 이름만 맞았다 — 실제 라벨은 ' + JSON.stringify(resetCandidates[0].texts) +
        ' 다. 이 노드가 맞는지 눈으로 확인할 것.'
      : '라벨 ' + JSON.stringify(resetCandidates[0].texts) + ' 로 확인됨');
  if (resetCandidates[0].matchedOn === 'name') {
    notes.push('Reset 버튼을 노드 이름으로만 찾았다. 라벨 텍스트는 ' +
               JSON.stringify(resetCandidates[0].texts) + ' 다 — 대상이 맞는지 확인이 필요하다.');
  }
  resetRec.insideToolbar = true;
  resetRec.scannedAsControl = true;
  resetRec.self = await describeControl(n);
  resetRec.ancestorIds = ancestorIds(n);
  const p = n.parent;
  resetRec.parent = p ? parentInfo(p) : null;
  resetRec.indexAtAuditTime = p && kids(p) ? p.children.indexOf(n) : -1;
} else {
  resetRec.found = false;
  resetRec.resolvedId = null;
  resetRec.resolvedBy = resetCandidates.length === 0
    ? '후보 0개 — 텍스트로 찾지 못했다. 정규식이나 탐색 범위를 고쳐야 한다'
    : '후보 ' + resetCandidates.length + '개 — 하나로 좁히지 못했다. 추측으로 고르지 않는다';
  notes.push('Reset 버튼 ' + resetRec.resolvedBy);
}
targets.push(resetRec);

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
    const estLabel = r2(t.self.primaryTextWidth * scale);
    const addLeading = (t.role === 'Button') ? r2(mi.variantGap + LEADING_SLOT) : 0;
    rec.estimatedLabelWidth = estLabel;
    rec.labelScale = r2(scale);
    rec.leadingAddition = addLeading;
    rec.predictedWidth = r2(mi.variantWidth - mi.labelWidth + estLabel + addLeading);
    rec.predictionKind = 'estimate';
    rec.basis = '마스터 실측 폭 ' + mi.variantWidth + ' − 마스터 라벨 ' + mi.labelWidth +
                ' + 추정 라벨 ' + estLabel + (addLeading ? ' + leading ' + addLeading : '') +
                '. 라벨 폭만 글자크기 비례로 추정했다 (' + t.self.primaryTextFontSize +
                ' → ' + mi.labelFontSize + ').';
    rec.predictedLow = r2(mi.variantWidth - mi.labelWidth + estLabel * 0.85 + addLeading);
    rec.predictedHigh = r2(mi.variantWidth - mi.labelWidth + estLabel * 1.15 + addLeading);
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
  let delta = 0;
  for (const t of targets) {
    if (!t.self) continue;
    const w = widthPlan.filter(x => x.key === t.key)[0];
    if (!w || w.widthDelta === null) continue;
    if (t.self.id === g.id || (t.ancestorIds || []).indexOf(g.id) >= 0) delta += w.widthDelta;
  }
  const hugs = (function () { try { return g.layoutSizingHorizontal === 'HUG'; } catch (e) { return null; } })();
  return { id: g.id, name: g.name, type: g.type, width: r2(g.width), height: r2(g.height),
           visible: g.visible, hugsHorizontally: hugs, containedDelta: r2(delta),
           predictedWidth: hugs === false ? r2(g.width) : r2(g.width + delta),
           note: hugs === false
             ? '이 그룹은 폭이 고정이라 바깥으로 커지지 않는다 — 대신 안에서 넘칠 수 있다'
             : '이 그룹은 hug 라 내용 폭만큼 같이 변한다' };
});

const contentAfter = r2(toolbarChildren.filter(g => g.visible !== false)
  .reduce((a, g) => a + g.predictedWidth, 0) +
  tb.gap * Math.max(0, tb.visibleChildCount - 1) + tb.paddingH);

const toolbarWidthImpact = {
  toolbarWidth: tb.width,
  toolbarHeight: tb.height,
  layoutMode: tb.layoutMode,
  primaryAxisAlignItems: tb.primaryAxisAlignItems,
  padding: tb.padding, gap: tb.gap,
  directChildren: toolbarChildren,
  currentOccupiedWidth: tb.contentWidthIfHiddenExcluded,
  predictedOccupiedWidth: contentAfter,
  freeSpaceNow: tb.freeSpaceNow,
  freeSpaceAfter: r2(tb.width - contentAfter),
  overflowNow: tb.freeSpaceNow < 0,
  overflowRiskAfter: r2(tb.width - contentAfter) < 0,
  spaceBetweenCollisionRisk: tb.primaryAxisAlignItems === 'SPACE_BETWEEN' &&
                             r2(tb.width - contentAfter) < 0,
  note: 'SPACE_BETWEEN 은 남는 공간을 좌우로 벌린다. freeSpaceAfter 가 0 밑으로 내려가면 ' +
        '좌우 그룹이 붙거나 겹친다. 0 이상이면 간격만 줄어든다.'
};

/* ---------- 툴바 세로 ---------- */
const CONTROL_H = 36;
const tallestAfter = Math.max(CONTROL_H, tb.tallestVisibleChild);
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
toolbarHeightImpact.heightGrowthPx = toolbarHeightImpact.parentIsHug
  ? r2(toolbarHeightImpact.predictedHeightAfter - tb.height) : 0;
toolbarHeightImpact.toolbarActuallyGrows = toolbarHeightImpact.heightGrowthPx > 0.5;
if (!toolbarHeightImpact.formulaMatchesMeasured) {
  notes.push('툴바 높이 공식이 현재 값을 재현하지 못한다 (' +
             toolbarHeightImpact.predictedHeightBefore + ' vs 실측 ' + tb.height +
             ') — 높이 예측을 확정값으로 쓰지 말 것');
}

/* ---------- 숨긴 자식이 자리를 차지하는가: Phase A 실측 증거 ---------- */
const PHASE_A_PARENTS = ['1002:500', '1009:700'];
const hiddenChildEvidence = [];
for (const pid of PHASE_A_PARENTS) {
  const p = await figma.getNodeByIdAsync(pid);
  if (!p) { hiddenChildEvidence.push({ parentId: pid, found: false }); continue; }
  const info = parentInfo(p);
  let hugsH = null;
  try { hugsH = p.layoutSizingHorizontal === 'HUG'; } catch (e) { /* 무시 */ }
  const e = { parentId: pid, parentName: p.name, found: true,
              hiddenChildCount: info.hiddenChildCount, hugsHorizontally: hugsH,
              measuredWidth: info.width,
              contentIfHiddenExcluded: info.contentWidthIfHiddenExcluded,
              contentIfHiddenIncluded: info.contentWidthIfHiddenIncluded };
  if (info.hiddenChildCount === 0) {
    e.verdict = 'indeterminate';
    e.reason = '이 부모에 숨긴 자식이 없어 판별할 수 없다';
  } else if (hugsH !== true) {
    e.verdict = 'indeterminate';
    e.reason = '부모 폭이 hug 가 아니라 내용 폭으로 판별할 수 없다';
  } else {
    const exOk = Math.abs(info.contentWidthIfHiddenExcluded - info.width) < 0.5;
    const inOk = Math.abs(info.contentWidthIfHiddenIncluded - info.width) < 0.5;
    e.verdict = exOk && !inOk ? 'hidden children take no space'
      : (inOk && !exOk ? 'hidden children DO take space' : 'ambiguous');
    e.reason = '측정 폭 ' + info.width + ' vs 숨김제외 ' + info.contentWidthIfHiddenExcluded +
               ' / 숨김포함 ' + info.contentWidthIfHiddenIncluded;
  }
  hiddenChildEvidence.push(e);
}
if (!hiddenChildEvidence.some(e => e.verdict === 'hidden children take no space')) {
  notes.push('숨긴 자식이 자리를 차지하는지 이번 데이터로 단정하지 못했다. ' +
             'Phase A 에서 부모 높이가 그대로였던 것은 세로축 증거일 뿐이다. ' +
             'DRY_RUN 에서 툴바 폭 여유를 넉넉히 확인하고 넘어간다.');
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
      /* 색을 임의로 정하지 않는다. 현재 fill 과 같은 variant 를 찾아 보고만 한다. */
      const curHex = (t.self.fills || []).filter(f => f.hex)[0];
      rec.currentFill = curHex ? curHex.hex : null;
      rec.currentFillVariable = curHex ? curHex.variable : null;
      rec.variantFillMatches = (mi.fillsByVariant || []).filter(function (v) {
        const h = (v.fills || []).filter(f => f.hex)[0];
        return !!(h && curHex && h.hex.toLowerCase() === curHex.hex.toLowerCase());
      }).map(v => v.variant);
      rec.suggestedVariant = rec.variantFillMatches.length === 1 ? rec.variantFillMatches[0] : null;
      rec.variantDecision = rec.suggestedVariant
        ? '현재 배경색과 같은 variant 가 하나뿐이라 그것으로 제안한다'
        : '배경색만으로는 variant 를 하나로 좁히지 못했다 — 사람이 정해야 한다';
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
  allKnownTargetsFound: targetCount === 6 && inputCount === 1 && selectCount === 4 && resetCount === 1,
  allKnownTargetsScanned: targets.every(t => !t.found || t.scannedAsControl === true),
  mappingResolved: mapping.every(m => m.resolved === true),
  unexplainedExtraCountZero: unexplainedExtras.length === 0,
  layoutImpactMeasurable: widthPlan.every(w => w.predictionKind && w.predictionKind !== 'unknown') &&
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
  resetResolution: { candidateCount: resetRec.candidateCount, candidates: resetRec.candidates,
                     resolvedId: resetRec.resolvedId, resolvedBy: resetRec.resolvedBy },

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
