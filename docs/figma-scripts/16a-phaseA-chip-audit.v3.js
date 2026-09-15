/* ============================================================================
 * 줍줍 — 스크립트 16a v3
 * Phase A 사전 감사 (읽기 전용) — 통과 조건을 개수에서 분류로 바꿈
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= 를 한 줄도 포함하지 않는다.
 *
 * v3 에서 바꾼 것 — 통과 조건의 의미
 *
 *   v2 실행 결과: 알려진 후보 3개가 모두 잡혔고(missingFromScan = []),
 *   여분 6개는 전부 다른 UI 컨트롤이었다 —
 *     1009:709 기록 추가 Button / 1003:1697 검색 Input /
 *     1003:1705·1711·1717·1723 Filter Options
 *   즉 "새로 발견된 미확인 Chip" 이 아니라 스캐너가 넓게 잡은 것뿐이다.
 *
 *   그래서 scanCount = 3 을 통과 조건에서 뺐다. 개수를 3으로 맞추려고 임계값을 계속 더하면
 *   **언젠가 진짜 Chip 을 놓친다.** 스캐너는 넓게 두고, 남는 것을 설명하는 쪽으로 바꿨다.
 *   같은 이유로 v2 에서 넣었던 가로세로비 조건(wideEnough)도 모양 판정에서 뺐다. 기록만 한다.
 *
 *   새 통과 조건
 *     candidateFoundCountIs3      알려진 후보 3개가 존재
 *     allKnownCandidatesScanned   3개가 모두 스캐너 조건을 통과
 *     missingFromScanEmpty        스캔에서 빠진 후보 없음
 *     unexplainedExtraCountZero   설명되지 않는 여분 0개
 *
 *   분류 근거(classifiedBy)도 같이 찍는다. 분류 자체가 틀렸을 수 있으므로 그것도 검토 대상이다.
 *
 * v1 에서 고친 것
 *
 * 1) scanCount = 2 (기대 3), 페이지네이션 "1" 버튼(1002:462)이 섞여 들어옴
 *    - 왜 놓쳤는지 추측하지 않는다. 알려진 후보 3개에 대해 **조건을 하나씩 따로 찍어**
 *      `candidatePredicates` 로 보고한다. 어떤 조건이 걸렀는지 눈으로 확인된다.
 *    - 모양 조건 완화: TEXT 를 직계 자식이 아니라 **2단계 아래까지** 찾는다.
 *      (배지 안에 래퍼 프레임이 하나 끼면 v1 은 통째로 놓쳤다)
 *    - 숫자 버튼 제외는 heuristic 이 아니라 **구조**로 한다:
 *      페이지네이션·사이드바 Nav 컨테이너를 제외 목록에 넣고,
 *      추가로 '정사각형에 가깝다'(가로/세로 < 1.3)를 배제 조건으로 쓴다.
 *      임계값은 1.3 이다: 페이지 버튼은 28×28 = 1.0, 가장 좁은 배지 v2.4 는 33×20 = 1.65 라
 *      양쪽 모두에서 충분히 떨어져 있다. 1.6 은 v2.4 에 너무 가까워 위험했다.
 *      칩은 가로로 긴 알약이고 페이지 버튼은 정사각형이다.
 *    - 걸러진 것을 조용히 버리지 않는다. 한 조건만 어긋난 노드는 `nearMisses` 로 남긴다.
 *
 * 2) parentGrowsWithChild 가 "부모가 HUG 다" 만 보고 판정했다. 틀렸다.
 *    부모 높이가 **더 높은 형제**에 의해 이미 결정돼 있으면 칩이 20→24 가 되어도
 *    부모는 그대로다. 실측 부모 높이(34 / 34.67 / 36)가 칩 높이보다 훨씬 크다.
 *    - 형제 높이를 실제로 재서 가장 높은 것을 찾고, Auto Layout 방향별 공식으로 계산한다.
 *    - 공식이 **현재 측정값을 재현하는지 먼저 검증**하고(formulaMatchesMeasured),
 *      재현하지 못하면 예측을 믿지 말라고 표시한다.
 * ========================================================================== */

const SCRIPT_VERSION = '16a-v3-gate-by-classification';

const MAIN_ID = '1002:2';
const NEW_CHIP_HEIGHT_FALLBACK = 24;

/* 스캔에서 통째로 제외할 컨테이너 — 전부 다른 Phase 의 대상이다 */
const EXCLUDE_CONTAINERS = [
  { id: '1002:140',  label: '카드 그리드 (Phase E)' },
  { id: '1002:23',   label: 'KPI Strip (Phase D)' },
  { id: '1002:458',  label: '페이지네이션 (Phase F)' },
  { id: '1002:511',  label: '사이드바 Nav (Phase F)' }
];

const CANDIDATES = [
  { label: 'v2.4 버전 배지',        id: '1002:506' },
  { label: '실시간 동기화 완료 배지', id: '1002:478' },
  { label: '시즌 배지',             id: '1009:703' }
];

const CHIP_SET_ID = '1029:1984';

const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const kids = n => Array.isArray(n.children) ? n.children : null;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 색 / 변수 ---------- */
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
  if (depth > 0 && kids(n)) {
    d.children = [];
    for (const c of n.children) d.children.push(await describe(c, depth - 1));
  } else if (kids(n)) {
    d.childCount = n.children.length;
  }
  return d;
}

/* ---------- 사슬 헬퍼 ---------- */
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
function excludedBy(n) {
  for (const c of EXCLUDE_CONTAINERS) if (insideId(n, c.id)) return c.label;
  if (insideInstance(n)) return '기존 component instance 내부';
  return null;
}

/* ---------- 모양 조건: 하나씩 따로 판정한다 ---------- */
function hasTextWithin(n, depth) {
  const cs = kids(n);
  if (!cs) return false;
  for (const c of cs) {
    if (c.type === 'TEXT') return true;
    if (depth > 0 && hasTextWithin(c, depth - 1)) return true;
  }
  return false;
}
function hasVisiblePaint(n) {
  if ('fillStyleId' in n && n.fillStyleId) return true;
  return Array.isArray(n.fills) && n.fills.some(f => f.visible !== false);
}
function predicates(n) {
  const cs = kids(n);
  const ratio = (typeof n.width === 'number' && typeof n.height === 'number' && n.height > 0)
    ? r2(n.width / n.height) : null;
  return {
    isFrameOrGroup: n.type === 'FRAME' || n.type === 'GROUP',
    heightInRange: typeof n.height === 'number' && n.height >= 14 && n.height <= 32,
    childCountInRange: !!cs && cs.length >= 1 && cs.length <= 4,
    hasTextWithin2: hasTextWithin(n, 2),
    hasVisiblePaint: hasVisiblePaint(n),
    hasCornerRadius: 'cornerRadius' in n,
    wideEnough: ratio !== null && ratio >= 1.3,   // 기록만 한다. 통과 조건이 아니다.
    _ratio: ratio,
    _height: r2(n.height),
    _childCount: cs ? cs.length : 0
  };
}
function shapeOk(pr) {
  return pr.isFrameOrGroup && pr.heightInRange && pr.childCountInRange &&
         pr.hasTextWithin2 && pr.hasVisiblePaint && pr.hasCornerRadius;
  /* wideEnough 는 일부러 뺐다. 개수를 3으로 맞추려고 임계값을 더하면
   * 언젠가 진짜 Chip 을 놓친다. 스캐너는 넓게 잡고, 남는 것은 분류해서 설명한다. */
}
function failedNames(pr) {
  return Object.keys(pr).filter(k => k.charAt(0) !== '_' && pr[k] === false);
}

/* ---------- 부모 높이 영향: 실제 레이아웃 기준 ---------- */
function predictParent(target, p, newH) {
  const res = {
    parentId: p.id, parentName: p.name,
    parentLayoutMode: 'layoutMode' in p ? p.layoutMode : null,
    counterAxisAlignItems: 'counterAxisAlignItems' in p ? p.counterAxisAlignItems : null
  };

  const isAuto = 'layoutMode' in p && p.layoutMode !== 'NONE';
  res.parentIsHugOrAuto = isAuto
    ? (p.layoutMode === 'HORIZONTAL' ? p.counterAxisSizingMode === 'AUTO' : p.primaryAxisSizingMode === 'AUTO')
    : false;

  /* 형제 중 레이아웃에 실제로 기여하는 것만 — 숨김·absolute 는 높이를 정하지 않는다 */
  const cs = kids(p) || [];
  const sibs = cs.filter(s => s.id !== target.id && s.visible !== false && s.layoutPositioning !== 'ABSOLUTE');
  res.contributingSiblings = sibs.map(s => ({ id: s.id, name: s.name, height: r2(s.height) }));
  res.tallestSiblingHeight = sibs.length ? r2(Math.max.apply(null, sibs.map(s => s.height))) : 0;

  res.parentVerticalPadding = r2((p.paddingTop || 0) + (p.paddingBottom || 0));
  res.effectiveParentHeightBefore = r2(p.height);
  res.currentChildHeight = r2(target.height);
  res.predictedChildHeightAfter = newH;

  if (!isAuto) {
    res.predictedParentHeightBefore = null;
    res.predictedParentHeightAfter = r2(p.height);
    res.basis = '부모가 Auto Layout 이 아니다 — 자식 크기가 부모 높이를 바꾸지 않는다';
  } else if (!res.parentIsHugOrAuto) {
    res.predictedParentHeightBefore = null;
    res.predictedParentHeightAfter = r2(p.height);
    res.basis = '부모 높이가 고정(FIXED)이다 — 자식이 커져도 부모는 그대로다';
  } else if (p.layoutMode === 'HORIZONTAL') {
    res.predictedParentHeightBefore =
      r2(Math.max(target.height, res.tallestSiblingHeight) + res.parentVerticalPadding);
    res.predictedParentHeightAfter =
      r2(Math.max(newH, res.tallestSiblingHeight) + res.parentVerticalPadding);
    res.basis = '가로 Auto Layout — 부모 높이는 **가장 높은 자식**이 정한다. ' +
                '칩보다 높은 형제가 있으면 칩이 커져도 부모는 안 커진다';
  } else {
    res.predictedParentHeightBefore = r2(p.height);
    res.predictedParentHeightAfter = r2(p.height - target.height + newH);
    res.basis = '세로 Auto Layout — 자식 높이가 그대로 합계에 더해진다';
  }

  /* 공식이 지금 측정값을 재현하는지 먼저 확인한다. 못 하면 예측을 믿지 않는다. */
  res.formulaMatchesMeasured = res.predictedParentHeightBefore === null
    ? null
    : Math.abs(res.predictedParentHeightBefore - p.height) < 0.5;
  if (res.formulaMatchesMeasured === false) {
    res.formulaWarning = '공식이 현재 부모 높이를 재현하지 못한다(' +
      res.predictedParentHeightBefore + ' vs 실측 ' + r2(p.height) + '). ' +
      '보이지 않는 요소나 line-height 영향이 있을 수 있으므로 predictedParentHeightAfter 를 확정값으로 쓰지 말 것.';
    notes.push(p.name + '(' + p.id + ') ' + res.formulaWarning);
  }

  res.parentGrowthPx = r2(res.predictedParentHeightAfter - res.effectiveParentHeightBefore);
  res.parentActuallyExpectedToGrow = res.parentGrowthPx > 0.5;

  const stretch = res.counterAxisAlignItems === 'STRETCH' || target.layoutAlign === 'STRETCH';
  res.childStretchedByParent = stretch;
  if (stretch) {
    res.stretchNote = '부모가 STRETCH 다 — 자식 높이가 부모에 끌려간다. ' +
                      '새 인스턴스 높이가 24 로 유지되지 않을 수 있으므로 교체 후 실측 확인 필요.';
    notes.push(p.name + '(' + p.id + ') counterAxisAlignItems=STRETCH — 교체 후 높이 실측 필요');
  }
  return res;
}

/* ---------- 대상 ---------- */
const main = await figma.getNodeByIdAsync(MAIN_ID);
if (!main) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                        reason: MAIN_ID + ' 을 찾을 수 없음' });

/* ---------- 새 Chip 마스터 (예측의 기준 높이) ---------- */
const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
let chipMaster = null;
if (chipSet && chipSet.type === 'COMPONENT_SET') {
  let propKey = null;
  try {
    propKey = Object.keys(chipSet.componentPropertyDefinitions)
      .find(k => k.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }
  chipMaster = {
    id: chipSet.id, name: chipSet.name, leadingPropertyKey: propKey,
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
const NEW_H = chipMaster && chipMaster.variants.length
  ? parseFloat(chipMaster.variants[0].size.split('×')[1]) : NEW_CHIP_HEIGHT_FALLBACK;

/* ---------- (1) 알려진 후보 ---------- */
const candidates = [];
const candidatePredicates = [];
for (const c of CANDIDATES) {
  const n = await figma.getNodeByIdAsync(c.id);
  if (!n) {
    candidates.push({ label: c.label, id: c.id, found: false });
    candidatePredicates.push({ label: c.label, id: c.id, found: false });
    continue;
  }

  /* 왜 스캔에 잡히거나 안 잡히는지 — 조건별로 그대로 찍는다 */
  const pr = predicates(n);
  const exc = excludedBy(n);
  candidatePredicates.push({
    label: c.label, id: c.id, found: true,
    excludedByContainer: exc,
    predicates: pr,
    failedPredicates: failedNames(pr),
    wouldBeScanned: shapeOk(pr) && !exc
  });

  const rec = { label: c.label, id: c.id, found: true };
  rec.insideMain = n.id === MAIN_ID || insideId(n, MAIN_ID);
  rec.insideInstance = insideInstance(n);
  rec.self = await describe(n, 2);
  rec.ancestry = ancestry(n);
  const p = n.parent;
  if (p) {
    rec.indexInParent = kids(p) ? p.children.indexOf(n) : -1;
    rec.siblings = kids(p) ? p.children.map((s, i) => ({
      index: i, id: s.id, name: s.name, type: s.type,
      size: r2(s.width) + '×' + r2(s.height), visible: s.visible,
      layoutPositioning: 'layoutPositioning' in s ? s.layoutPositioning : null,
      isTarget: s.id === n.id
    })) : [];
    rec.parentImpact = predictParent(n, p, NEW_H);
  }
  candidates.push(rec);
}

/* ---------- (2) 구조 스캔 ---------- */
const chipLike = [];
const nearMisses = [];
const skipped = {};
for (const c of EXCLUDE_CONTAINERS) skipped[c.label] = 0;
skipped['기존 component instance 내부'] = 0;

async function walk(n) {
  if (n.id !== MAIN_ID) {
    const exc = excludedBy(n);
    if (exc) { skipped[exc] = (skipped[exc] || 0) + 1; return; }
    const pr = predicates(n);
    if (shapeOk(pr)) {
      const d = await describe(n, 1);
      d.ancestry = ancestry(n).map(a => a.name + ' (' + a.id + ')');
      d.texts = (kids(n) || []).filter(x => x.type === 'TEXT').map(x => x.characters);
      d.ratio = pr._ratio;
      chipLike.push(d);
    } else {
      /* 한 조건만 어긋난 것은 조용히 버리지 않는다 */
      const failed = failedNames(pr);
      if (failed.length === 1 && pr.isFrameOrGroup && pr.hasTextWithin2) {
        nearMisses.push({ id: n.id, name: n.name, type: n.type,
                          size: r2(n.width) + '×' + r2(n.height),
                          failedPredicate: failed[0], ratio: pr._ratio,
                          childCount: pr._childCount });
      }
    }
  }
  if (kids(n)) for (const c of n.children) await walk(c);
}
await walk(main);

/* ---------- (3) 여분 노드 분류 ----------
 * 스캔에 걸린 것 중 알려진 후보가 아닌 노드를 "다른 UI 컨트롤" 로 설명할 수 있는지 본다.
 * 설명되지 않는 것이 하나라도 있으면 그게 진짜 위험 신호다. 개수 자체는 조건이 아니다. */
const TOOLBAR_ID = '1003:1695';
const CONTROL_NAME_RE = /button|input|select|option|dropdown|toggle|search|field|버튼|입력|검색|필터/i;
const KNOWN_CONTROLS = {
  '1009:709': '기록 추가 Button (Phase C)'
};

function classifyExtra(node, d) {
  if (KNOWN_CONTROLS[node.id]) return { rule: 'knownControlId', label: KNOWN_CONTROLS[node.id] };
  if (insideId(node, TOOLBAR_ID)) return { rule: 'insideToolbar', label: '툴바 컨트롤 — Input / Select (Phase B)' };
  if (CONTROL_NAME_RE.test(node.name)) return { rule: 'controlName', label: '이름상 UI 컨트롤 — ' + node.name };
  if (typeof node.height === 'number' && node.height >= 32) {
    return { rule: 'controlHeight', label: '컨트롤 높이 ' + r2(node.height) + ' (칩은 24)' };
  }
  return null;
}

/* ---------- (4) 스캔 ↔ 후보 대조 ---------- */
const scanIds = chipLike.map(c => c.id);
const candIds = CANDIDATES.map(c => c.id);
const missingFromScan = candIds.filter(id => scanIds.indexOf(id) < 0);
const extraIds = scanIds.filter(id => candIds.indexOf(id) < 0);

const extraInScan = [];
for (const d of chipLike) {
  if (candIds.indexOf(d.id) >= 0) continue;
  const node = await figma.getNodeByIdAsync(d.id);
  const cls = node ? classifyExtra(node, d) : null;
  extraInScan.push({
    id: d.id, name: d.name, size: d.size, ratio: d.ratio,
    texts: d.texts, ancestry: d.ancestry,
    explained: !!cls,
    classifiedBy: cls ? cls.rule : null,
    classifiedAs: cls ? cls.label : null
  });
}
const unexplainedExtras = extraInScan.filter(e => !e.explained);
const unexplainedExtraCount = unexplainedExtras.length;

/* ---------- 결과 ---------- */
const candidateFoundCount = candidates.filter(c => c.found).length;
const scanCount = chipLike.length;
/* 새 안전조건 — 개수가 아니라 "설명되지 않는 것이 없는가" 로 판단한다.
 * scanCount 는 보고만 하고 통과 조건에서 뺐다. */
const gate = {
  candidateFoundCountIs3: candidateFoundCount === 3,
  allKnownCandidatesScanned: candidatePredicates.length === CANDIDATES.length &&
                             candidatePredicates.every(c => c.wouldBeScanned === true),
  missingFromScanEmpty: missingFromScan.length === 0,
  unexplainedExtraCountZero: unexplainedExtraCount === 0
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,
  mainFrame: { id: main.id, name: main.name, size: r2(main.width) + '×' + r2(main.height) },

  gate,
  gatePassed,
  candidateFoundCount,
  scanCount,
  missingFromScan,
  extraIds,
  extraInScan,
  unexplainedExtras,
  unexplainedExtraCount,
  extraNote: '여분 노드는 "없어야 하는 것" 이 아니라 "설명되어야 하는 것" 이다. ' +
             'classifiedBy 가 분류 근거이고, 그 근거 자체도 검토 대상이다. ' +
             'scanCount 는 통과 조건이 아니라 참고 수치다.',

  candidatePredicates,
  predicateNote: '스캔에서 빠진 후보가 있으면 failedPredicates 에 이유가 그대로 찍힌다. 추측하지 말고 이 값을 볼 것.',

  candidates,
  chipLikeFound: chipLike,
  nearMisses,
  nearMissNote: '조건 하나만 어긋나 제외된 노드들. 여기에 진짜 배지가 있으면 조건을 더 고쳐야 한다.',
  scanSkipped: skipped,

  chipMaster,
  newChipHeight: NEW_H,
  parentImpactSummary: candidates.filter(c => c.found && c.parentImpact).map(c => ({
    label: c.label,
    parent: c.parentImpact.parentName + ' (' + c.parentImpact.parentId + ')',
    parentLayoutMode: c.parentImpact.parentLayoutMode,
    parentIsHugOrAuto: c.parentImpact.parentIsHugOrAuto,
    tallestSiblingHeight: c.parentImpact.tallestSiblingHeight,
    currentChildHeight: c.parentImpact.currentChildHeight,
    predictedChildHeightAfter: c.parentImpact.predictedChildHeightAfter,
    effectiveParentHeightBefore: c.parentImpact.effectiveParentHeightBefore,
    predictedParentHeightAfter: c.parentImpact.predictedParentHeightAfter,
    parentGrowthPx: c.parentImpact.parentGrowthPx,
    parentActuallyExpectedToGrow: c.parentImpact.parentActuallyExpectedToGrow,
    formulaMatchesMeasured: c.parentImpact.formulaMatchesMeasured
  })),

  notes,
  scanCountNote: 'scanCount 는 참고 수치다. 3이 아니어도 gate 는 실패하지 않는다.',
  nextStep: 'gatePassed = true 이면 Phase A DRY_RUN(16) 을 실행합니다. ' +
            'Phase A 실제 교체 대상은 v2.4·시즌 2개이고 동기화 배지는 보류입니다.'
});
