/* ============================================================================
 * 줍줍 — 스크립트 19
 * Phase D) KPI Card 4장을 컴포넌트 인스턴스로 교체
 *
 * 대상 (19a-v3 감사로 확정) — 부모 strip 1002:23
 *   1002:24 이번 달 지원   delta=positive  caption hide
 *   1002:42 진행 중        delta=positive  caption set "파이프라인 70.0%"
 *   1002:60 이번 달 불합격 delta=negative  caption set "탈락률 30.0%"
 *   1002:78 최종 합격      delta=neutral   caption hide
 *
 * caption
 *   마스터 caption 은 노드가 있고 **기본이 숨김** 이다.
 *   hide → visible=false 확인 / set → characters + visible=true, **둘 다 되읽는다.**
 *   Chip 작업 때 visible 오버라이드가 초기화된 전례가 있다.
 *
 * FILL
 *   마스터는 고정 폭 235 지만 기존 카드 4장은 모두 FILL + layoutGrow 1 이다.
 *   235×4 + gap 12×3 = 976 이라 지금 폭에서는 고정이어도 우연히 맞지만,
 *   반응형 의미를 보존하려면 새 인스턴스에도 FILL 을 명시해야 한다.
 *
 * 1002:24 안의 기존 vector
 *   별도 accessory 가 아니라 old body 안의 요소다. 새 마스터에는 대응하는 것이 없어
 *   old body 를 숨기면 같이 사라진다. **누락이 아니라 DS 구조로의 의도된 정규화다.**
 *
 * 실행법
 *   1) DRY_RUN = true  2) 이상 없으면 false  3) 직후 19b 검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '19-v2-phaseD-kpi-replace';

const STRIP_ID = '1002:23';
const KPI_SET_ID = '1033:2085';
const CONTROL_FILL = 'FILL';

const TARGETS = [
  { key: 'c1', srcId: '1002:24', variant: 'delta=positive',
    title: '이번 달 지원', value: '20', unit: '건',
    captionAction: 'hide', captionValue: null, badgeText: '+12 전월 대비' },
  { key: 'c2', srcId: '1002:42', variant: 'delta=positive',
    title: '진행 중', value: '14', unit: '건',
    captionAction: 'set', captionValue: '파이프라인 70.0%', badgeText: '+8' },
  { key: 'c3', srcId: '1002:60', variant: 'delta=negative',
    title: '이번 달 불합격', value: '6', unit: '건',
    captionAction: 'set', captionValue: '탈락률 30.0%', badgeText: '+4' },
  { key: 'c4', srcId: '1002:78', variant: 'delta=neutral',
    title: '최종 합격', value: '0', unit: '건',
    captionAction: 'hide', captionValue: null, badgeText: '시즌 목표 1개사' }
];

/* 마스터 노드 이름 → 역할. 이름을 우선 쓰고 없으면 위치로 넘어간다. */
const ROLE_NAMES = { title: ['label'], value: ['number', 'value'],
                     unit: ['unit'], caption: ['caption', 'support'] };

const errors = [];
const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1;
const kids = n => Array.isArray(n.children) ? n.children : null;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
function badgeOf(root) {
  return collectDeep(root, x => x.name === 'badge', 4)[0] ||
         collectDeep(root, x => x.type === 'INSTANCE', 4)[0] || null;
}
/* 배지 안 텍스트를 뺀 나머지에서 역할 노드를 찾는다 */
function roleNodes(root) {
  const badge = badgeOf(root);
  const badgeTextIds = badge ? collectDeep(badge, x => x.type === 'TEXT', 4).map(x => x.id) : [];
  const outside = collectDeep(root, x => x.type === 'TEXT', 6)
    .filter(t => badgeTextIds.indexOf(t.id) < 0);
  const res = { badge, badgeText: badge ? collectDeep(badge, x => x.type === 'TEXT', 4)[0] || null : null,
                source: {} };
  for (const role of Object.keys(ROLE_NAMES)) {
    const hit = outside.filter(t => ROLE_NAMES[role].indexOf((t.name || '').toLowerCase()) >= 0)[0];
    if (hit) { res[role] = hit; res.source[role] = "이름 '" + hit.name + "'"; }
    else res[role] = null;
  }
  /* 이름으로 못 찾은 것만 위치·크기로 메운다 */
  const used = () => Object.keys(ROLE_NAMES).map(k => res[k]).filter(Boolean).map(t => t.id);
  if (!res.value) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0)
      .sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    if (rest.length) { res.value = rest[0]; res.source.value = 'fallback: 가장 큰 글자'; }
  }
  if (!res.title) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0).sort((a, b) => a.y - b.y);
    if (rest.length) { res.title = rest[0]; res.source.title = 'fallback: 가장 위'; }
  }
  if (!res.caption) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0).sort((a, b) => a.y - b.y);
    if (rest.length) { res.caption = rest[rest.length - 1]; res.source.caption = 'fallback: 가장 아래'; }
  }
  return res;
}
async function setText(node, value) {
  try { await figma.loadFontAsync(node.fontName); }
  catch (e) { throw new Error('폰트 로드 실패: ' + e.message); }
  node.characters = value;
  return node.characters;
}

/* ========================================================================
 * 1. 재료 + baseline
 * ====================================================================== */
const strip = await figma.getNodeByIdAsync(STRIP_ID);
const set = await figma.getNodeByIdAsync(KPI_SET_ID);
const variantByName = {};
if (set && set.type === 'COMPONENT_SET') for (const v of set.children) variantByName[v.name] = v;

const masterInfo = {};
for (const name of Object.keys(variantByName)) {
  const v = variantByName[name];
  const rn = roleNodes(v);
  let capVisible = null;
  if (rn.caption) capVisible = rn.caption.visible !== false;
  masterInfo[name] = {
    id: v.id, size: r2(v.width) + '×' + r2(v.height),
    width: r2(v.width), height: r2(v.height),
    widthMode: (function () { try { return v.layoutSizingHorizontal; } catch (e) { return null; } })(),
    heightMode: (function () { try { return v.layoutSizingVertical; } catch (e) { return null; } })(),
    roleSource: rn.source,
    hasTitle: !!rn.title, hasValue: !!rn.value, hasUnit: !!rn.unit,
    hasCaption: !!rn.caption, captionVisibleByDefault: capVisible,
    hasBadge: !!rn.badge, hasBadgeText: !!rn.badgeText,
    badgeMain: null
  };
  if (rn.badge && rn.badge.type === 'INSTANCE') {
    const m = await mainCompOf(rn.badge);
    masterInfo[name].badgeMain = m ? m.name : null;
  }
}

const plan = [];
for (const t of TARGETS) {
  const src = await figma.getNodeByIdAsync(t.srcId);
  const rec = { key: t.key, srcId: t.srcId, found: !!src, variant: t.variant,
                variantExists: !!variantByName[t.variant] };
  if (src) {
    const parent = src.parent;
    rec.parentId = parent ? parent.id : null;
    rec.parentIsStrip = !!parent && parent.id === STRIP_ID;
    rec.currentIndex = parent && kids(parent) ? parent.children.indexOf(src) : -1;
    rec.indexNote = '보고용이다. APPLY 는 삽입 직전에 다시 계산한다';
    rec.currentVisible = src.visible;
    rec.currentSize = r2(src.width) + '×' + r2(src.height);
    rec.currentWidth = r2(src.width);
    rec.currentHeight = r2(src.height);
    rec.currentSizingH = (function () { try { return src.layoutSizingHorizontal; } catch (e) { return null; } })();
    rec.currentLayoutGrow = 'layoutGrow' in src ? src.layoutGrow : null;
    const shapes = collectDeep(src, x => ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE',
      'STAR', 'LINE', 'POLYGON'].indexOf(x.type) >= 0, 6);
    rec.vectorsInsideOldBody = shapes.map(x => ({ id: x.id, type: x.type,
      size: r2(x.width) + '×' + r2(x.height) }));
    if (shapes.length) {
      notes.push(t.title + ' (' + t.srcId + ') 안에 기존 vector ' + shapes.length +
        '개가 있다. 별도 accessory 가 아니라 old body 내부 요소이고, 새 마스터에 대응하는 것이 없어 ' +
        'old body 를 숨기면 같이 사라진다 — 누락이 아니라 DS 구조로의 의도된 정규화다.');
    }
  }
  const mi = masterInfo[t.variant];
  rec.master = mi || null;
  rec.plannedTitle = t.title;
  rec.plannedValue = t.value;
  rec.plannedUnit = t.unit;
  rec.captionAction = t.captionAction;
  rec.captionValue = t.captionValue;
  rec.captionMustBecomeVisible = t.captionAction === 'set' &&
    !!mi && mi.captionVisibleByDefault === false;
  rec.plannedBadgeText = t.badgeText;
  rec.plannedSizingHorizontal = CONTROL_FILL;
  rec.plannedLayoutGrow = 1;
  rec.predictedHeightAfterContentOverrides = mi ? mi.height : null;
  plan.push(rec);
}

/* ---- strip 예측 ---- */
let stripPlan = null;
if (strip) {
  const cs = kids(strip) || [];
  const vis = cs.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const gap = r2(strip.itemSpacing || 0);
  const padH = r2((strip.paddingLeft || 0) + (strip.paddingRight || 0));
  const padV = r2((strip.paddingTop || 0) + (strip.paddingBottom || 0));
  const n = plan.length;
  const innerWidth = r2(strip.width - padH);
  const fillEach = n > 0 ? r2((innerWidth - gap * (n - 1)) / n) : null;
  const heights = plan.map(p => p.predictedHeightAfterContentOverrides).filter(h => h !== null);
  const allSameH = heights.length > 0 && heights.every(h => Math.abs(h - heights[0]) < 0.5);
  stripPlan = {
    id: strip.id, width: r2(strip.width), currentHeight: r2(strip.height),
    gap, paddingH: padH, paddingV: padV,
    counterAxisAlignItems: strip.counterAxisAlignItems,
    childCount: cs.length, visibleInFlowCount: vis.length,
    currentCardSizing: plan.map(p => ({ key: p.key, sizingH: p.currentSizingH, grow: p.currentLayoutGrow })),
    plannedCardSizing: plan.map(p => ({ key: p.key, sizingH: p.plannedSizingHorizontal, grow: p.plannedLayoutGrow })),
    fillMustBeSetExplicitly: plan.every(p => p.currentSizingH === 'FILL') &&
      plan.every(p => !p.master || p.master.widthMode !== 'FILL'),
    predictedCardWidth: fillEach,
    masterWidth: plan[0] && plan[0].master ? plan[0].master.width : null,
    widthIfMasterKept: plan[0] && plan[0].master
      ? r2(plan[0].master.width * n + gap * (n - 1) + padH) : null,
    predictedCardHeights: plan.map(p => ({ key: p.key, height: p.predictedHeightAfterContentOverrides })),
    allCardsSameHeightAfterOverrides: allSameH,
    predictedStripHeight: heights.length ? r2(Math.max.apply(null, heights) + padV) : null,
    overflowRisk: false
  };
  stripPlan.stripHeightDelta = stripPlan.predictedStripHeight === null ? null
    : r2(stripPlan.predictedStripHeight - strip.height);

  /* strip 높이가 마스터에서 유도되는 값인지.
   * 86 같은 숫자를 박아 넣지 않는다 — 마스터가 바뀌면 멀쩡한 결과가 실패로 나온다.
   * 대신 '카드 높이 + strip 세로 padding' 으로 설명되는지를 본다. 같은 보장을 숫자 없이 얻는다. */
  const mh = stripPlan.masterWidth !== null && plan[0] && plan[0].master ? plan[0].master.height : null;
  stripPlan.masterCardHeight = mh;
  stripPlan.predictedStripHeightDerivesFromMaster = (mh !== null &&
    stripPlan.predictedStripHeight !== null)
    ? Math.abs(stripPlan.predictedStripHeight - (mh + padV)) < 0.5 : false;
  stripPlan.heightDerivationBasis = mh === null
    ? '마스터 높이를 읽지 못했다'
    : '예상 strip 높이 ' + stripPlan.predictedStripHeight + ' = 마스터 카드 높이 ' + mh +
      ' + strip 세로 padding ' + padV + ' 인지 확인한다';
  /* 설계 기준 86 은 **참고값** 으로만 남긴다 */
  stripPlan.designReferenceHeight = 86;
  stripPlan.predictedVsDesignReference = stripPlan.predictedStripHeight === null ? null
    : r2(stripPlan.predictedStripHeight - 86);
  stripPlan.designReferenceNote = '86 은 설계 기준 참고값이다. 통과 조건은 ' +
    'predictedStripHeightDerivesFromMaster 이고, 마스터가 바뀌면 이 값도 따라 바뀌어야 맞다.';
  stripPlan.overflowRisk = stripPlan.widthIfMasterKept !== null &&
    !plan.every(p => p.currentSizingH === 'FILL') &&
    stripPlan.widthIfMasterKept > strip.width + 0.5;
  stripPlan.bottomAlignmentIssue = !allSameH && strip.counterAxisAlignItems !== 'STRETCH';
  if (!allSameH) notes.push('카드 예상 높이가 서로 다르다 — strip 아래쪽 정렬이 어긋난다');
}

/* ========================================================================
 * 2. preflight
 * ====================================================================== */
const preflight = {
  stripFound: !!strip,
  kpiSetFound: !!(set && set.type === 'COMPONENT_SET'),
  allTargetsFound: plan.every(p => p.found),
  allTargetsVisible: plan.every(p => p.currentVisible === true),
  allTargetsInStrip: plan.every(p => p.parentIsStrip === true),
  allVariantsExist: plan.every(p => p.variantExists),
  everyVariantHasTitleNode: plan.every(p => !!p.master && p.master.hasTitle),
  everyVariantHasValueNode: plan.every(p => !!p.master && p.master.hasValue),
  everyVariantHasUnitNode: plan.every(p => !!p.master && p.master.hasUnit),
  everyVariantHasCaptionNode: plan.every(p => !!p.master && p.master.hasCaption),
  everyVariantHasBadgeLabelNode: plan.every(p => !!p.master && p.master.hasBadgeText),
  mappingComplete: plan.every(p => typeof p.plannedTitle === 'string' &&
    typeof p.plannedValue === 'string' && typeof p.plannedUnit === 'string' &&
    typeof p.plannedBadgeText === 'string'),
  captionActionsComplete: plan.every(p =>
    (p.captionAction === 'hide' && p.captionValue === null) ||
    (p.captionAction === 'set' && typeof p.captionValue === 'string')),
  fillApplicable: plan.every(p => p.plannedSizingHorizontal === CONTROL_FILL),
  indexesResolvable: plan.every(p => p.currentIndex >= 0),
  layoutMeasurable: !!(stripPlan && stripPlan.predictedCardWidth !== null &&
                       stripPlan.predictedStripHeight !== null),
  /* 예상 높이가 갈리면 mutation 을 시작하지 않는다.
   * v1 은 이 값을 계산해놓고 preflight 에 넣지 않아, 갈린 채로 APPLY 가 시작될 수 있었다. */
  allPredictedCardHeightsSame: !!(stripPlan && stripPlan.allCardsSameHeightAfterOverrides === true),
  predictedStripHeightDerivesFromMaster:
    !!(stripPlan && stripPlan.predictedStripHeightDerivesFromMaster === true),
  noOverflow: !!(stripPlan && stripPlan.overflowRisk === false)
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '사전 조건 누락: ' + missing.join(', '),
               preflight, plan, stripPlan, masterInfo, notes });
}

/* ========================================================================
 * 3. DRY_RUN
 * ====================================================================== */
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    targetCount: plan.length,
    preflight,
    masterInfo,

    cards: plan.map(p => ({
      원본노드: p.srcId,
      현재index: p.currentIndex,
      indexNote: p.indexNote,
      변형: p.variant,
      제목: p.plannedTitle,
      숫자: p.plannedValue,
      단위: p.plannedUnit,
      caption처리: p.captionAction,
      caption값: p.captionValue,
      caption켜야함: p.captionMustBecomeVisible,
      배지문구: p.plannedBadgeText,
      현재크기: p.currentSize,
      현재sizing: p.currentSizingH + ' / grow ' + p.currentLayoutGrow,
      적용할sizing: p.plannedSizingHorizontal + ' / grow ' + p.plannedLayoutGrow,
      sizing요구: 'layoutSizingHorizontal = ' + p.plannedSizingHorizontal +
                  ' AND layoutGrow = ' + p.plannedLayoutGrow + ' — 둘 다 되읽어 확인하고 하나라도 다르면 중단',
      예상높이: p.predictedHeightAfterContentOverrides,
      기존vector: p.vectorsInsideOldBody
    })),
    planRaw: plan,

    strip: stripPlan,
    fillNote: '마스터는 고정 폭 ' + (stripPlan ? stripPlan.masterWidth : '?') +
      ' 이고 현재 폭에서는 ' + (stripPlan ? stripPlan.widthIfMasterKept : '?') +
      ' 로 strip ' + (stripPlan ? stripPlan.width : '?') + ' 과 맞아떨어진다. ' +
      '그래도 기존 카드가 FILL 이므로 반응형 의미를 보존하려면 새 인스턴스에도 FILL 을 명시한다.',

    mutationPlan: {
      originalsToHide: TARGETS.map(t => t.srcId),
      accessoryIdsToHide: [],
      deletePolicy: '삭제하지 않는다. 원본은 visible = false 로 보존한다',
      insertion: '원본의 현재 index 에 삽입. index 는 삽입 직전에 다시 계산하고 삽입 직후 검증한다',
      stripUntouched: 'strip ' + STRIP_ID + ' 의 폭·gap·정렬·padding 은 건드리지 않는다'
    },
    applyOrder: [
      '1 indexOf 재계산', '2 인스턴스 생성', '3 그 index 에 insert', '4 index 검증',
      '5 title', '6 value', '7 unit', '8 caption(hide 면 visible=false / set 이면 characters+visible=true)',
      '9 badgeText', '10 layoutSizingHorizontal=FILL', '11 layoutGrow=1',
      '12 값·visible·sizing 전부 되읽기', '13 원본 visible=false'
    ],
    stopPolicy: '한 카드라도 실패하면 다음 카드로 넘어가지 않는다.',
    partialSafety: { completedTargets: [], targetsNotStarted: TARGETS.map(t => t.key),
      stoppedAt: null, failedAt: null, strayInstanceIds: [],
      partialMutationKind: [], partialMutationDetected: false,
      note: 'DRY_RUN 이라 아직 아무것도 바꾸지 않았다' },
    notes,
    nextStep: 'DRY_RUN 이 맞으면 DRY_RUN = false 로 재실행하고 직후 19b 를 돌립니다.'
  });
}

/* ========================================================================
 * 4. APPLY — 카드 단위 순차, 첫 실패에서 중단
 * ====================================================================== */
const results = {};
const strayInstanceIds = [];
const partialMutationKind = [];
let stoppedAt = null;
let failedAt = null;

for (const t of TARGETS) {
  const p0 = plan.filter(x => x.key === t.key)[0];
  const rec = { key: t.key, srcId: t.srcId, instanceCreated: false, inserted: false,
                indexVerified: false, titleSet: false, valueSet: false, unitSet: false,
                captionHandled: false, badgeSet: false, sizingSet: false,
                originalHidden: false, complete: false, newInstanceId: null };
  results[t.key] = rec;

  const src = await figma.getNodeByIdAsync(t.srcId);
  const parent = src.parent;
  const variant = variantByName[t.variant];
  let step = 'start';
  let pendingInstanceId = null;

  try {
    step = 'recomputeIndex';
    const idx = parent.children.indexOf(src);
    rec.recomputedIndex = idx;
    rec.indexAtPlanTime = p0.currentIndex;
    rec.indexShiftedSincePlan = idx !== p0.currentIndex;
    if (idx < 0) throw new Error('부모에서 원본을 찾지 못했다');

    step = 'createInstance';
    const inst = variant.createInstance();
    pendingInstanceId = inst.id;
    rec.instanceCreated = true;
    rec.newInstanceId = inst.id;
    inst.name = src.name;

    step = 'insertChild';
    parent.insertChild(idx, inst);
    pendingInstanceId = null;
    rec.inserted = true;

    step = 'verifyIndex';
    const newIdx = parent.children.indexOf(inst);
    const oldIdx = parent.children.indexOf(src);
    rec.newInstanceIndex = newIdx;
    rec.originalIndexAfterInsert = oldIdx;
    rec.indexVerified = newIdx === idx && oldIdx === idx + 1;
    if (!rec.indexVerified) {
      throw new Error('index 가 계획과 다르다 — 새 인스턴스 ' + newIdx + ' (기대 ' + idx +
                      '), 원본 ' + oldIdx + ' (기대 ' + (idx + 1) + ')');
    }

    step = 'roleNodes';
    const rn = roleNodes(inst);
    rec.roleSource = rn.source;
    if (!rn.title) throw new Error('인스턴스에서 title 노드를 찾지 못함');
    if (!rn.value) throw new Error('인스턴스에서 value 노드를 찾지 못함');
    if (!rn.unit) throw new Error('인스턴스에서 unit 노드를 찾지 못함');
    if (!rn.caption) throw new Error('인스턴스에서 caption 노드를 찾지 못함');
    if (!rn.badgeText) throw new Error('인스턴스에서 배지 라벨 노드를 찾지 못함');

    step = 'setTitle';
    rec.titleReadBack = await setText(rn.title, t.title);
    rec.titleSet = rec.titleReadBack === t.title;
    if (!rec.titleSet) throw new Error('title 을 썼는데 되읽으면 다르다: ' + rec.titleReadBack);

    step = 'setValue';
    rec.valueReadBack = await setText(rn.value, t.value);
    rec.valueSet = rec.valueReadBack === t.value;
    if (!rec.valueSet) throw new Error('value 를 썼는데 되읽으면 다르다: ' + rec.valueReadBack);

    step = 'setUnit';
    rec.unitReadBack = await setText(rn.unit, t.unit);
    rec.unitSet = rec.unitReadBack === t.unit;
    if (!rec.unitSet) throw new Error('unit 을 썼는데 되읽으면 다르다: ' + rec.unitReadBack);

    step = 'caption';
    rec.captionAction = t.captionAction;
    rec.captionVisibleBefore = rn.caption.visible;
    if (t.captionAction === 'set') {
      rec.captionTextReadBack = await setText(rn.caption, t.captionValue);
      rn.caption.visible = true;
      rec.captionVisibleReadBack = rn.caption.visible;
      rec.captionHandled = rec.captionTextReadBack === t.captionValue &&
                           rec.captionVisibleReadBack === true;
      if (rec.captionTextReadBack !== t.captionValue) {
        throw new Error('caption 텍스트가 되읽으면 다르다: ' + rec.captionTextReadBack);
      }
      if (rec.captionVisibleReadBack !== true) {
        throw new Error('caption 을 켰는데 되읽으면 숨김이다 — 오버라이드가 먹지 않았다');
      }
    } else {
      rn.caption.visible = false;
      rec.captionVisibleReadBack = rn.caption.visible;
      rec.captionHandled = rec.captionVisibleReadBack === false;
      if (rec.captionVisibleReadBack !== false) {
        throw new Error('caption 을 껐는데 되읽으면 보인다');
      }
    }

    step = 'setBadgeText';
    rec.badgeReadBack = await setText(rn.badgeText, t.badgeText);
    rec.badgeSet = rec.badgeReadBack === t.badgeText;
    if (!rec.badgeSet) throw new Error('배지 문구가 되읽으면 다르다: ' + rec.badgeReadBack);

    step = 'sizing';
    /* Phase D 의 sizing 요구는 FILL **그리고** layoutGrow 1 이다.
     * v1 은 layoutGrow 실패를 note 로만 남겨서, FILL 만 맞으면 sizingSet 이 참이 됐다 —
     * 실제 상태가 FILL / grow 0 인데 "전부 성공" 이라고 말할 수 있었다. */
    try { inst.layoutSizingHorizontal = CONTROL_FILL; }
    catch (e) { throw new Error('layoutSizingHorizontal 설정 실패: ' + e.message); }
    try { inst.layoutGrow = 1; }
    catch (e) { throw new Error('layoutGrow 설정 실패: ' + e.message); }

    rec.sizingReadBack = (function () { try { return inst.layoutSizingHorizontal; } catch (e) { return null; } })();
    rec.layoutGrowReadBack = 'layoutGrow' in inst ? inst.layoutGrow : null;
    rec.sizingRequirement = 'layoutSizingHorizontal = ' + CONTROL_FILL + ' AND layoutGrow = 1';
    rec.sizingFillOk = rec.sizingReadBack === CONTROL_FILL;
    rec.layoutGrowOk = rec.layoutGrowReadBack === 1;
    rec.sizingSet = rec.sizingFillOk && rec.layoutGrowOk;
    if (!rec.sizingFillOk) {
      throw new Error('sizing 을 FILL 로 썼는데 되읽으면 ' + rec.sizingReadBack);
    }
    if (!rec.layoutGrowOk) {
      throw new Error('layoutGrow 를 1 로 썼는데 되읽으면 ' + rec.layoutGrowReadBack);
    }

    step = 'hideOriginal';
    src.visible = false;
    rec.originalHidden = src.visible === false;
    if (!rec.originalHidden) throw new Error('원본을 숨겼는데 되읽으면 visible 이다');

    step = 'measure';
    rec.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
    rec.newInstanceWidth = r2(inst.width);
    rec.newInstanceHeight = r2(inst.height);
    rec.predictedHeight = p0.predictedHeightAfterContentOverrides;
    rec.heightMatchesPrediction = p0.predictedHeightAfterContentOverrides === null ? null
      : near(inst.height, p0.predictedHeightAfterContentOverrides);
    rec.complete = true;
  } catch (e) {
    if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
    failedAt = { target: t.key, srcId: t.srcId, step, message: e.message };
    errors.push(t.key + ' [' + step + '] ' + e.message);
    stoppedAt = t.key;
    break;
  }
}

/* ========================================================================
 * 5. 판정
 * ====================================================================== */
for (const t of TARGETS) {
  const r = results[t.key];
  if (!r || r.complete) continue;
  if (r.instanceCreated && !r.inserted) partialMutationKind.push(t.key + 'InstanceCreatedNotInserted');
  else if (r.inserted && !r.originalHidden) partialMutationKind.push(t.key + 'InsertedButOriginalVisible');
  else if (r.inserted && !r.captionHandled) partialMutationKind.push(t.key + 'InsertedButCaptionUnset');
  else if (r.inserted && !r.sizingSet) partialMutationKind.push(t.key + 'InsertedButSizingUnset');
  else partialMutationKind.push(t.key + 'Incomplete');
}
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');
const partialMutationDetected = partialMutationKind.length > 0;

const completedTargets = TARGETS.filter(t => results[t.key] && results[t.key].complete).map(t => t.key);
const targetsNotStarted = TARGETS.filter(t => !results[t.key]).map(t => t.key);
if (stoppedAt) {
  errors.push('중단됨 — ' + stoppedAt + ' 에서 실패하여 이후 카드는 진행하지 않았다. 시작도 못 한 카드: ' +
              (targetsNotStarted.length ? targetsNotStarted.join(', ') : '없음'));
}

/* strip 실측 */
let stripAfter = null;
if (strip) {
  const cs = kids(strip) || [];
  const vis = cs.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const gap = r2(strip.itemSpacing || 0);
  const padH = r2((strip.paddingLeft || 0) + (strip.paddingRight || 0));
  const occ = r2(vis.reduce((a, c) => a + c.width, 0) + gap * Math.max(0, vis.length - 1) + padH);
  const heights = vis.map(c => r2(c.height));
  stripAfter = {
    width: r2(strip.width), height: r2(strip.height), gap,
    visibleChildren: vis.map(c => ({ id: c.id, name: c.name,
      size: r2(c.width) + '×' + r2(c.height),
      sizingH: (function () { try { return c.layoutSizingHorizontal; } catch (e) { return null; } })(),
      grow: 'layoutGrow' in c ? c.layoutGrow : null })),
    occupiedWidth: occ, freeSpace: r2(strip.width - occ),
    overflow: r2(strip.width - occ) < -0.5,
    cardHeights: heights,
    allCardsSameHeight: heights.length > 0 && heights.every(h => Math.abs(h - heights[0]) < 0.5),
    widthUnchanged: stripPlan ? near(strip.width, stripPlan.width) : null,
    gapUnchanged: stripPlan ? near(gap, stripPlan.gap) : null,
    predictedHeight: stripPlan ? stripPlan.predictedStripHeight : null
  };
  if (stripAfter.overflow) errors.push('strip 이 넘친다 — freeSpace ' + stripAfter.freeSpace);
  if (!stripAfter.allCardsSameHeight) {
    errors.push('교체 후 카드 높이가 서로 다르다: ' + JSON.stringify(heights) +
      ' — strip counterAxisAlignItems 가 ' + strip.counterAxisAlignItems +
      ' 라 아래쪽 정렬이 어긋난다');
  }
}

const successCriteria = {
  allCardsComplete: completedTargets.length === TARGETS.length,
  allIndexesVerified: TARGETS.every(t => !results[t.key] || results[t.key].indexVerified !== false),
  allCaptionsHandled: TARGETS.every(t => !results[t.key] || results[t.key].captionHandled !== false),
  allSizingSetToFill: TARGETS.every(t => !results[t.key] || results[t.key].sizingFillOk !== false),
  allLayoutGrowOne: TARGETS.every(t => !results[t.key] || results[t.key].layoutGrowOk !== false),
  allSizingRequirementsMet: TARGETS.every(t => !results[t.key] || results[t.key].sizingSet !== false),
  allOriginalsHidden: TARGETS.every(t => !results[t.key] || results[t.key].originalHidden !== false),
  /* 높이를 조건에 넣지 않으면 카드가 들쭉날쭉해도 "전부 성공" 이라고 말한다 — 실제로 그랬다 */
  allCardHeightsMatchPrediction: TARGETS.every(t => !results[t.key] ||
    results[t.key].heightMatchesPrediction !== false),
  allCardsSameHeight: stripAfter ? stripAfter.allCardsSameHeight === true : false,
  stripWidthUnchanged: stripAfter ? stripAfter.widthUnchanged !== false : false,
  stripGapUnchanged: stripAfter ? stripAfter.gapUnchanged !== false : false,
  stripNoOverflow: stripAfter ? stripAfter.overflow === false : false,
  noStrayInstances: strayInstanceIds.length === 0,
  noPartialMutation: !partialMutationDetected,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  targetCount: TARGETS.length,
  completedTargets, targetsNotStarted,
  stoppedAt, failedAt,
  results,
  sizingReadBack: TARGETS.map(t => {
    const r = results[t.key];
    return { key: t.key,
      sizingReadBack: r ? r.sizingReadBack : null,
      layoutGrowReadBack: r ? r.layoutGrowReadBack : null,
      sizingFillOk: r ? r.sizingFillOk : null,
      layoutGrowOk: r ? r.layoutGrowOk : null,
      sizingSet: r ? r.sizingSet : null,
      requirement: r ? r.sizingRequirement : 'layoutSizingHorizontal = FILL AND layoutGrow = 1' };
  }),
  stripAfter,
  strayInstanceIds,
  partialMutationKind,
  partialMutationDetected,
  successCriteria,
  successCriteriaMet,
  nextVerification: '19b-phaseD-verify',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 12)
});
