/* ============================================================================
 * 줍줍 — 스크립트 16
 * Phase A) 메인 화면의 단독 배지를 Chip 인스턴스로 교체
 *
 * 이번 Phase 의 실제 교체 대상은 **2개**다. 3개가 아니다.
 *
 *   A-1  v2.4     1002:506  → tone=neutral  label "v2.4"            leading 숨김
 *   A-2  시즌     1009:703  → tone=brand    label "2026 하반기 시즌"  leading 노출 (Icon / Dot)
 *
 *   보류  동기화  1002:478  → **건드리지 않는다**
 *
 * 동기화 배지를 보류하는 이유 (누락이 아니라 결정이다)
 *   현재 구조가 bg = surface/subtle + text·dot = success/strong 이라
 *   Chip tone 5종 중 정확히 맞는 variant 가 없다.
 *   tone=success 로 바꾸면 배경이 #EFF4FF → #A7FAD4 로 눈에 띄게 달라져서
 *   "구조를 인스턴스로 교체" 라는 이번 목적에 시각 디자인 변경이 섞인다.
 *   tone=neutral + fill 오버라이드는 유지보수가 나쁘다 —
 *   Chip 교체 때 leading.visible 오버라이드가 초기화된 전례가 있다.
 *   그래서 원본 그대로 두고 별도 디자인 결정 대상으로 남긴다.
 *
 * 원본 처리
 *   삭제하지 않는다. `visible = false` 로 남겨 롤백 경로를 유지한다.
 *   새 인스턴스는 **같은 부모의 같은 자리**에 넣는다.
 *
 * 인덱스가 어떻게 되는지 (요청에 따라 명시)
 *   원본이 index i 에 있을 때
 *     1) insertChild(i, 새 인스턴스)  → 새 인스턴스 i, 원본은 i+1 로 밀린다
 *     2) 원본.visible = false          → 순서는 바뀌지 않는다. 원본은 i+1 그대로
 *   최종:  새 인스턴스 = i (원본이 있던 자리),  원본 = i+1,  형제 수 +1
 *   i 앞의 형제는 그대로, i 뒤의 형제는 전부 한 칸씩 밀린다.
 *   원본이 숨김이므로 **화면상 순서는 교체 전과 같다.**
 *
 * 실행법
 *   1) DRY_RUN = true  → 계획과 예측만 출력
 *   2) 이상 없으면 DRY_RUN = false
 *   3) 직후 16b 읽기 전용 검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '16-v1-phaseA-chip-replace';

const CHIP_SET_ID = '1029:1984';
const DOT_ICON_NAME = 'Icon / Dot';

const TARGETS = [
  { key: 'version', label: 'v2.4 버전 배지', srcId: '1002:506',
    tone: 'tone=neutral', text: 'v2.4',
    leadingVisible: false, leadingIcon: null },

  { key: 'season', label: '시즌 배지', srcId: '1009:703',
    tone: 'tone=brand', text: '2026 하반기 시즌',
    leadingVisible: true, leadingIcon: DOT_ICON_NAME }
];

const DEFERRED = [
  { key: 'sync', label: '실시간 동기화 완료 배지', srcId: '1002:478',
    reason: 'bg=surface/subtle + fg/dot=success/strong 혼합 구조. Chip tone 5종에 정확히 맞는 variant 없음. ' +
            '구조 교체와 시각 디자인 변경을 섞지 않기 위해 Phase A 에서 제외.',
    status: 'Phase A skipped target — deferred sync badge',
    mustRemain: '원본 유지 + visible = true' }
];

const errors = [];
const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;
const kids = n => Array.isArray(n.children) ? n.children : null;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

function hex(c) {
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(c.r) + h(c.g) + h(c.b);
}
function firstSolidHex(n) {
  if (!n || !Array.isArray(n.fills)) return null;
  const f = n.fills.filter(x => x.visible !== false && x.type === 'SOLID')[0];
  return f ? hex(f.color) : null;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
function findByName(n, name) {
  const cs = kids(n);
  if (!cs) return null;
  for (const c of cs) if (c.name === name) return c;
  return null;
}

/* 부모 높이 예측 — 16a v2/v3 과 같은 공식. 가로 Auto Layout 은 가장 높은 자식이 높이를 정한다. */
function predictParent(target, p, newH) {
  const isAuto = 'layoutMode' in p && p.layoutMode !== 'NONE';
  const hug = isAuto
    ? (p.layoutMode === 'HORIZONTAL' ? p.counterAxisSizingMode === 'AUTO' : p.primaryAxisSizingMode === 'AUTO')
    : false;
  const cs = kids(p) || [];
  const sibs = cs.filter(s => s.id !== target.id && s.visible !== false && s.layoutPositioning !== 'ABSOLUTE');
  const tallest = sibs.length ? r2(Math.max.apply(null, sibs.map(s => s.height))) : 0;
  const vpad = r2((p.paddingTop || 0) + (p.paddingBottom || 0));

  const res = { parentId: p.id, parentName: p.name, parentLayoutMode: isAuto ? p.layoutMode : null,
                parentIsHugOrAuto: hug, tallestSiblingHeight: tallest, parentVerticalPadding: vpad,
                effectiveParentHeightBefore: r2(p.height),
                currentChildHeight: r2(target.height), predictedChildHeightAfter: newH };

  if (!isAuto || !hug) {
    res.predictedParentHeightBefore = null;
    res.predictedParentHeightAfter = r2(p.height);
    res.basis = isAuto ? '부모 높이가 고정 — 자식이 커져도 부모는 그대로' : '부모가 Auto Layout 이 아님';
  } else if (p.layoutMode === 'HORIZONTAL') {
    res.predictedParentHeightBefore = r2(Math.max(target.height, tallest) + vpad);
    res.predictedParentHeightAfter = r2(Math.max(newH, tallest) + vpad);
    res.basis = '가로 Auto Layout — 가장 높은 자식이 부모 높이를 정한다';
  } else {
    res.predictedParentHeightBefore = r2(p.height);
    res.predictedParentHeightAfter = r2(p.height - target.height + newH);
    res.basis = '세로 Auto Layout — 자식 높이가 합계에 더해진다';
  }

  res.formulaMatchesMeasured = res.predictedParentHeightBefore === null ? null
    : Math.abs(res.predictedParentHeightBefore - p.height) < 0.5;
  res.parentGrowthPx = r2(res.predictedParentHeightAfter - res.effectiveParentHeightBefore);
  res.parentActuallyExpectedToGrow = res.parentGrowthPx > 0.5;
  if (res.formulaMatchesMeasured === false) {
    notes.push(p.name + '(' + p.id + ') 공식이 현재 높이를 재현하지 못함 — 예측을 확정값으로 쓰지 말 것');
  }
  return res;
}

/* ========================================================================
 * 1. 재료 확인 — Chip 세트 / variant / leading 속성 / Icon / Dot
 * ====================================================================== */
const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
if (!chipSet || chipSet.type !== 'COMPONENT_SET') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: 'Chip 세트 ' + CHIP_SET_ID + ' 를 찾지 못했거나 COMPONENT_SET 이 아님' });
}
let leadingPropKey = null;
try {
  leadingPropKey = Object.keys(chipSet.componentPropertyDefinitions)
    .find(k => k.split('#')[0] === 'leading') || null;
} catch (e) { notes.push('Chip 속성 정의 읽기 실패: ' + e.message); }

const variantByName = {};
for (const v of chipSet.children) variantByName[v.name] = v;

const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const dotIcon = iconComps.filter(c => c.name === DOT_ICON_NAME)[0] || null;

/* ========================================================================
 * 2. baseline — 대상 2개 + 보류 1개
 * ====================================================================== */
const plan = [];
for (const t of TARGETS) {
  const src = await figma.getNodeByIdAsync(t.srcId);
  const rec = { key: t.key, label: t.label, srcId: t.srcId, found: !!src };
  if (!src) { plan.push(rec); continue; }

  const p = src.parent;
  const variant = variantByName[t.tone] || null;

  rec.currentSize = r2(src.width) + '×' + r2(src.height);
  rec.currentHeight = r2(src.height);
  rec.currentVisible = src.visible;
  rec.currentTexts = (kids(src) || []).filter(c => c.type === 'TEXT').map(c => c.characters);
  rec.currentFill = firstSolidHex(src);
  rec.currentDotFill = (function () {
    const cs = kids(src) || [];
    const dot = cs.filter(c => c.type === 'ELLIPSE' || /dot/i.test(c.name))[0];
    return dot ? { name: dot.name, type: dot.type, size: r2(dot.width) + '×' + r2(dot.height),
                   hex: firstSolidHex(dot) } : null;
  })();

  rec.parentId = p ? p.id : null;
  rec.parentName = p ? p.name : null;
  rec.originalIndex = p && kids(p) ? p.children.indexOf(src) : -1;
  rec.siblingCountBefore = p && kids(p) ? p.children.length : 0;
  rec.siblingOrderBefore = p && kids(p) ? p.children.map(c => c.id) : [];

  /* 요청대로 최종 인덱스를 명시한다 */
  rec.insertAtIndex = rec.originalIndex;
  rec.finalNewInstanceIndex = rec.originalIndex;
  rec.finalOriginalIndex = rec.originalIndex + 1;
  rec.siblingCountAfter = rec.siblingCountBefore + 1;
  rec.siblingOrderPreserved = true;
  rec.indexExplanation = 'index ' + rec.originalIndex + ' 에 삽입 → 새 인스턴스 ' + rec.originalIndex +
    ', 원본은 ' + (rec.originalIndex + 1) + ' 로 밀림. 숨김은 순서를 바꾸지 않는다. ' +
    '원본이 숨김이라 화면상 순서는 교체 전과 동일하다.';

  rec.targetVariant = t.tone;
  rec.variantExists = !!variant;
  rec.variantId = variant ? variant.id : null;
  rec.newLabel = t.text;
  rec.leadingVisible = t.leadingVisible;
  rec.leadingIcon = t.leadingIcon;
  rec.newInstanceHeight = variant ? r2(variant.height) : null;
  rec.newInstanceWidth = 'hug — 라벨 너비에 따라 결정된다. DRY_RUN 에서는 계산하지 않고 16b 에서 실측한다';

  if (p) rec.parentImpact = predictParent(src, p, variant ? variant.height : 24);
  plan.push(rec);
}

/* 보류 대상은 현재 상태만 기록한다 */
const deferred = [];
for (const d of DEFERRED) {
  const n = await figma.getNodeByIdAsync(d.srcId);
  deferred.push({
    key: d.key, label: d.label, srcId: d.srcId, found: !!n,
    status: d.status, reason: d.reason, mustRemain: d.mustRemain,
    currentSize: n ? r2(n.width) + '×' + r2(n.height) : null,
    currentVisible: n ? n.visible : null,
    currentFill: n ? firstSolidHex(n) : null,
    willBeTouchedByThisScript: false
  });
}

/* ========================================================================
 * 3. 사전 조건
 * ====================================================================== */
const preflight = {
  chipSetFound: true,
  leadingPropertyExists: !!leadingPropKey,
  dotIconFound: !!dotIcon,
  allTargetsFound: plan.every(p => p.found),
  allVariantsExist: plan.every(p => p.variantExists),
  allTargetsHaveParent: plan.every(p => p.parentId !== null),
  allIndexesResolved: plan.every(p => p.originalIndex >= 0),
  deferredSyncFound: deferred.every(d => d.found),
  deferredSyncVisible: deferred.every(d => d.currentVisible === true)
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '사전 조건 누락: ' + missing.join(', '),
               preflight, plan, deferred, notes });
}

/* dot 색이 원본과 같은지 — 다르면 보고만 한다. 임의로 고치지 않는다. */
const dotIconFill = dotIcon ? (function () {
  const cs = kids(dotIcon) || [];
  for (const c of cs) { const h = firstSolidHex(c); if (h) return h; }
  return firstSolidHex(dotIcon);
})() : null;
const seasonPlan = plan.filter(p => p.key === 'season')[0];
const dotColorCheck = {
  iconDotFill: dotIconFill,
  originalSeasonDotFill: seasonPlan && seasonPlan.currentDotFill ? seasonPlan.currentDotFill.hex : null,
  matches: !!(dotIconFill && seasonPlan && seasonPlan.currentDotFill &&
              dotIconFill.toLowerCase() === String(seasonPlan.currentDotFill.hex).toLowerCase()),
  note: '다르면 시즌 배지의 점 색이 교체 후 달라진다. 이 스크립트는 색을 임의로 바꾸지 않고 보고만 한다.'
};
if (!dotColorCheck.matches) {
  notes.push('시즌 dot 색 불일치 — Icon / Dot ' + dotIconFill +
             ' vs 원본 ' + (dotColorCheck.originalSeasonDotFill || '(못 읽음)') + '. 교체 후 점 색이 달라진다.');
}

/* ========================================================================
 * 4. DRY_RUN
 * ====================================================================== */
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,

    targetCount: plan.length,
    deferredCount: deferred.length,
    deferred,

    preflight,
    chipSet: { id: chipSet.id, name: chipSet.name, leadingPropertyKey: leadingPropKey,
               variants: chipSet.children.map(v => v.name) },
    dotIcon: dotIcon ? { id: dotIcon.id, name: dotIcon.name, key: dotIcon.key } : null,
    dotColorCheck,

    plan: plan.map(p => ({
      대상: p.label,
      원본노드: p.srcId,
      부모: p.parentName + ' (' + p.parentId + ')',
      기존index: p.originalIndex,
      새Chip변형: p.targetVariant,
      라벨: p.newLabel,
      leading노출: p.leadingVisible,
      leading아이콘: p.leadingIcon || '(변경 안 함 — 숨김이므로 기본값 유지)',
      현재크기: p.currentSize,
      새인스턴스높이: p.newInstanceHeight,
      새인스턴스너비: p.newInstanceWidth,
      부모높이_before: p.parentImpact.effectiveParentHeightBefore,
      부모높이_after예측: p.parentImpact.predictedParentHeightAfter,
      부모높이_증가px: p.parentImpact.parentGrowthPx,
      부모높이_실제로커지나: p.parentImpact.parentActuallyExpectedToGrow,
      공식이현재값재현: p.parentImpact.formulaMatchesMeasured,
      가장높은형제: p.parentImpact.tallestSiblingHeight,
      삽입위치: p.insertAtIndex,
      최종_새인스턴스index: p.finalNewInstanceIndex,
      최종_원본index: p.finalOriginalIndex,
      형제수: p.siblingCountBefore + ' → ' + p.siblingCountAfter,
      형제순서유지: p.siblingOrderPreserved,
      인덱스설명: p.indexExplanation
    })),

    planRaw: plan,

    originalHandling: '원본은 삭제하지 않는다. visible = false 로 남긴다. 롤백은 원본을 다시 켜고 인스턴스를 숨기면 끝난다.',
    applyOrder: [
      '1. Chip variant 인스턴스 생성 (createInstance 는 페이지에 붙으므로 미아 추적)',
      '2. 부모의 원래 index 에 insertChild',
      '3. label 텍스트 덮어쓰기 (폰트 로드 필요)',
      '4. leading 아이콘 확인 후 필요할 때만 swap, 그다음 visible 설정',
      '5. 원본 visible = false',
      '6. 쓰고 나서 되읽어 확인'
    ],
    stopPolicy: '한 대상이 실패하면 다음 대상으로 넘어가지 않는다. 어디까지 됐는지 결과에 남긴다.',
    notes,
    nextStep: 'DRY_RUN 결과가 맞으면 DRY_RUN = false 로 재실행하고, 직후 16b 검증기를 돌립니다.'
  });
}

/* ========================================================================
 * 5. APPLY — 대상 단위 순차, 첫 실패에서 중단
 * ====================================================================== */
const results = {};
const strayInstanceIds = [];
const partialMutationKind = [];
let stoppedAt = null;
let failedAt = null;

for (const t of TARGETS) {
  const p0 = plan.filter(x => x.key === t.key)[0];
  const rec = { label: t.label, srcId: t.srcId, instanceCreated: false, inserted: false,
                labelSet: false, leadingHandled: false, originalHidden: false, complete: false,
                newInstanceId: null, steps: [] };
  results[t.key] = rec;

  const src = await figma.getNodeByIdAsync(t.srcId);
  const parent = src.parent;
  const variant = variantByName[t.tone];
  let step = 'start';
  let pendingInstanceId = null;

  try {
    step = 'createInstance';
    const inst = variant.createInstance();
    pendingInstanceId = inst.id;
    rec.instanceCreated = true;
    rec.newInstanceId = inst.id;
    inst.name = src.name;

    step = 'insertChild';
    parent.insertChild(p0.originalIndex, inst);
    pendingInstanceId = null;
    rec.inserted = true;
    rec.steps.push('insertChild(' + p0.originalIndex + ')');

    step = 'setLabel';
    const label = findByName(inst, 'label');
    if (!label) throw new Error("인스턴스 안에서 'label' 텍스트를 찾지 못함");
    try { await figma.loadFontAsync(label.fontName); }
    catch (e) { throw new Error('폰트 로드 실패: ' + e.message); }
    label.characters = t.text;
    rec.labelSet = label.characters === t.text;
    rec.labelReadBack = label.characters;
    if (!rec.labelSet) throw new Error('label 을 썼는데 되읽으면 다르다: ' + label.characters);

    step = 'leading';
    const lead = findByName(inst, 'leading');
    if (!lead) throw new Error("인스턴스 안에서 'leading' 을 찾지 못함");
    rec.leadingTypeBefore = lead.type;

    if (t.leadingIcon) {
      const mc = lead.type === 'INSTANCE' ? await mainCompOf(lead) : null;
      rec.leadingIconBefore = mc ? mc.name : null;
      if (mc && mc.name === t.leadingIcon) {
        rec.leadingSwapNeeded = false;
        rec.steps.push('leading 이 이미 ' + t.leadingIcon + ' — swap 생략');
      } else {
        rec.leadingSwapNeeded = true;
        let ok = false;
        try { inst.setProperties({ [leadingPropKey]: dotIcon.id }); } catch (e) { rec.swapIdError = e.message; }
        let after = await mainCompOf(findByName(inst, 'leading'));
        if (after && after.name === t.leadingIcon) { ok = true; rec.swapForm = 'node id'; }
        if (!ok && dotIcon.key) {
          try { inst.setProperties({ [leadingPropKey]: dotIcon.key }); } catch (e) { rec.swapKeyError = e.message; }
          after = await mainCompOf(findByName(inst, 'leading'));
          if (after && after.name === t.leadingIcon) { ok = true; rec.swapForm = 'component key'; }
        }
        if (!ok) throw new Error('leading 아이콘 swap 이 적용되지 않음 (id·key 둘 다 실패)');
      }
    }

    /* swap 이 노드를 교체할 수 있으므로 visible 은 반드시 swap 다음에 설정한다 */
    const lead2 = findByName(inst, 'leading');
    lead2.visible = t.leadingVisible;
    rec.leadingVisibleReadBack = lead2.visible;
    if (lead2.visible !== t.leadingVisible) throw new Error('leading visible 이 되읽으면 다르다');
    const mc2 = lead2.type === 'INSTANCE' ? await mainCompOf(lead2) : null;
    rec.leadingIconAfter = mc2 ? mc2.name : null;
    rec.leadingHandled = true;

    step = 'hideOriginal';
    src.visible = false;
    rec.originalHidden = src.visible === false;
    if (!rec.originalHidden) throw new Error('원본을 숨겼는데 되읽으면 visible 이다');

    step = 'measure';
    rec.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
    rec.newInstanceHeight = r2(inst.height);
    rec.finalNewInstanceIndex = parent.children.indexOf(inst);
    rec.finalOriginalIndex = parent.children.indexOf(src);
    rec.indexAsPlanned = rec.finalNewInstanceIndex === p0.finalNewInstanceIndex &&
                         rec.finalOriginalIndex === p0.finalOriginalIndex;
    rec.parentHeightAfter = r2(parent.height);
    rec.parentHeightBefore = p0.parentImpact.effectiveParentHeightBefore;
    rec.parentHeightUnchanged = near(parent.height, p0.parentImpact.effectiveParentHeightBefore);
    if (!rec.parentHeightUnchanged) {
      notes.push(t.label + ' 부모 높이가 ' + rec.parentHeightBefore + ' → ' + rec.parentHeightAfter +
                 ' 로 바뀌었다 (예측: ' + p0.parentImpact.predictedParentHeightAfter + ')');
    }
    rec.complete = true;
  } catch (e) {
    if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
    failedAt = { target: t.label, step, message: e.message };
    errors.push(t.label + ' [' + step + '] ' + e.message);
    stoppedAt = t.label;
    break;
  }
}

/* ========================================================================
 * 6. 보류 대상이 손대지지 않았는지 확인
 * ====================================================================== */
const deferredAfter = [];
for (const d of DEFERRED) {
  const n = await figma.getNodeByIdAsync(d.srcId);
  const before = deferred.filter(x => x.srcId === d.srcId)[0];
  deferredAfter.push({
    key: d.key, label: d.label, srcId: d.srcId, status: d.status,
    stillVisible: n ? n.visible === true : false,
    sizeUnchanged: !!n && before && (r2(n.width) + '×' + r2(n.height)) === before.currentSize,
    fillUnchanged: !!n && before && firstSolidHex(n) === before.currentFill,
    untouched: !!n && n.visible === true && before &&
               (r2(n.width) + '×' + r2(n.height)) === before.currentSize &&
               firstSolidHex(n) === before.currentFill
  });
}
if (!deferredAfter.every(d => d.untouched)) errors.push('보류 대상(동기화 배지)이 변경되었다');

/* ========================================================================
 * 7. 판정
 * ====================================================================== */
for (const t of TARGETS) {
  const r = results[t.key];
  if (!r || r.complete) continue;
  if (r.inserted && !r.originalHidden) partialMutationKind.push(t.key + 'InsertedButOriginalStillVisible');
  else if (r.instanceCreated && !r.inserted) partialMutationKind.push(t.key + 'InstanceCreatedNotInserted');
  else partialMutationKind.push(t.key + 'Incomplete');
}
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');

const notStarted = TARGETS.filter(t => !results[t.key]).map(t => t.label);
const partialMutationDetected = partialMutationKind.length > 0;

const versionComplete = !!(results.version && results.version.complete);
const seasonComplete = !!(results.season && results.season.complete);
const allComplete = versionComplete && seasonComplete;

if (stoppedAt) {
  errors.push('중단됨 — ' + stoppedAt + ' 에서 실패하여 이후 대상은 진행하지 않았다. 시작도 못 한 대상: ' +
              (notStarted.length ? notStarted.join(', ') : '없음'));
}

const successCriteria = {
  versionComplete, seasonComplete,
  indexesAsPlanned: TARGETS.every(t => !results[t.key] || results[t.key].indexAsPlanned !== false),
  parentHeightsUnchanged: TARGETS.every(t => !results[t.key] || results[t.key].parentHeightUnchanged !== false),
  deferredSyncUntouched: deferredAfter.every(d => d.untouched),
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
  deferredCount: DEFERRED.length,
  versionComplete, seasonComplete, allComplete,
  results,
  targetsNotStarted: notStarted,
  stoppedAt, failedAt,
  strayInstanceIds,
  partialMutationKind,
  partialMutationDetected,
  deferredAfter,
  dotColorCheck,
  successCriteria,
  successCriteriaMet,
  nextVerification: '16b-phaseA-verify',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
