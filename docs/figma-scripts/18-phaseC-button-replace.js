/* ============================================================================
 * 줍줍 — 스크립트 18
 * Phase C) '기록 추가' Primary Button 1개를 컴포넌트 인스턴스로 교체
 *
 * 대상 (18a-v3 감사로 확정)
 *   old body   1009:709  "기록 추가"   부모 1009:715
 *   accessory  없음 (아이콘이 몸통 안에 있어 원본을 숨기면 같이 사라진다)
 *   new        Button 1029:1997 / variant=primary / leading = Icon / Plus (노출)
 *
 * 부모가 SPACE_BETWEEN + 고정 폭이다
 *   itemSpacing 은 쓰이지 않는다. 남는 공간이 자식 사이로 재분배된다.
 *   gap 을 고정 간격처럼 합계에 더하면 없는 overflow 를 만들어낸다 —
 *   18a-v2 에서 실제로 그렇게 틀렸다. 여기서도 **실제 x 좌표로 계산한다.**
 *
 * index
 *   감사 시점 index 를 쓰지 않는다. 삽입 직전에 indexOf 를 다시 계산하고,
 *   삽입 직후 새 인스턴스 = 그 index, 원본 = index + 1 인지 확인하고 아니면 중단한다.
 *
 * 원본
 *   삭제하지 않는다. visible = false 로 보존한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 계획과 예측만
 *   2) 이상 없으면 DRY_RUN = false
 *   3) 직후 18b 읽기 전용 검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '18-v1-phaseC-button-replace';

const SRC_ID = '1009:709';
const PARENT_ID = '1009:715';
const BUTTON_SET_ID = '1029:1997';
const TARGET_VARIANT = 'variant=primary';
const LABEL_TEXT = '기록 추가';
const LEADING_ICON = 'Icon / Plus';
const TEXT_NODE_NAMES = ['label', 'placeholder', 'text'];
const LEADING_SLOT = 16;

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
function findTextNode(root, names) {
  for (const nm of names) {
    const hit = collectDeep(root, c => c.type === 'TEXT' && c.name === nm, 6)[0];
    if (hit) return { node: hit, foundBy: "이름 '" + nm + "'" };
  }
  const any = collectDeep(root, c => c.type === 'TEXT', 6)[0];
  return any ? { node: any, foundBy: '첫 TEXT 자손 (이름 매칭 실패)' } : { node: null, foundBy: null };
}
function findByName(n, name) {
  const cs = kids(n);
  if (cs) for (const c of cs) if (c.name === name) return c;
  return collectDeep(n, c => c.name === name, 4)[0] || null;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}

/* SPACE_BETWEEN 배치 — 실제 x 좌표 기준. gap 을 고정 간격으로 더하지 않는다. */
function geometryOf(parent, targetId, newWidth) {
  const cs = kids(parent) || [];
  const inFlow = cs.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
  const order = inFlow.slice().sort((a, b) => a.x - b.x);
  const n = order.length;
  const tIdx = order.findIndex(c => c.id === targetId);
  const padL = r2(parent.paddingLeft || 0);
  const padR = r2(parent.paddingRight || 0);
  const innerRight = r2(parent.width - padR);
  const gap = r2(parent.itemSpacing || 0);

  let sh = null;
  try { sh = parent.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  const distributes = parent.primaryAxisAlignItems === 'SPACE_BETWEEN' &&
                      'layoutMode' in parent && parent.layoutMode === 'HORIZONTAL' && sh !== 'HUG';

  const curW = order.map(c => r2(c.width));
  const newW = curW.slice();
  if (tIdx >= 0 && newWidth !== null && newWidth !== undefined) newW[tIdx] = newWidth;

  function layout(ws) {
    const total = ws.reduce((a, w) => a + w, 0);
    const free = r2(parent.width - padL - padR - total);
    const spacing = distributes ? (n > 1 ? r2(free / (n - 1)) : 0) : gap;
    const xs = [];
    let x = padL;
    for (let i = 0; i < n; i++) { xs.push(r2(x)); x = x + ws[i] + spacing; }
    return { xs, spacing, free, total: r2(total) };
  }
  const cur = layout(curW);
  const nxt = layout(newW);
  const measured = order.map(c => r2(c.x));
  const modelOk = measured.every((m, i) => Math.abs(m - cur.xs[i]) < 1);

  const prev = tIdx - 1, after = tIdx + 1;
  const g = {
    parentId: parent.id, parentWidth: r2(parent.width), parentHeight: r2(parent.height),
    primaryAxisAlignItems: parent.primaryAxisAlignItems,
    layoutSizingHorizontal: sh, itemSpacing: gap,
    spacingIsDistributed: distributes,
    spacingNote: distributes
      ? 'SPACE_BETWEEN + 고정 폭 — itemSpacing(' + gap + ') 은 쓰이지 않는다'
      : 'itemSpacing 이 실제 간격이다',
    paddingLeft: padL, paddingRight: padR, parentRightEdge: innerRight,
    childOrder: order.map((c, i) => ({ id: c.id, name: c.name, width: curW[i],
      xMeasured: measured[i], xModel: cur.xs[i], isTarget: c.id === targetId })),
    leftSiblingId: prev >= 0 ? order[prev].id : null,
    leftSiblingRightEdge: prev >= 0 ? r2(measured[prev] + curW[prev]) : null,
    targetIndexInFlow: tIdx,
    targetXCurrent: tIdx >= 0 ? measured[tIdx] : null,
    targetWidthCurrent: tIdx >= 0 ? curW[tIdx] : null,
    targetRightEdgeCurrent: tIdx >= 0 ? r2(measured[tIdx] + curW[tIdx]) : null,
    targetWidthPredicted: newWidth,
    targetXPredicted: tIdx >= 0 ? nxt.xs[tIdx] : null,
    targetRightEdgePredicted: tIdx >= 0 ? r2(nxt.xs[tIdx] + newW[tIdx]) : null,
    currentActualSpaceBetween: prev >= 0 ? r2(measured[tIdx] - (measured[prev] + curW[prev])) : null,
    predictedSpaceBetween: prev >= 0 ? r2(nxt.xs[tIdx] - (nxt.xs[prev] + newW[prev])) : null,
    spaceAfterTargetPredicted: after < n ? r2(nxt.xs[after] - (nxt.xs[tIdx] + newW[tIdx])) : null,
    availableSpaceBetween: r2(parent.width - padL - padR - newW.reduce((a, w) => a + w, 0)),
    geometryModelMatchesMeasured: modelOk
  };
  g.shiftPx = (g.targetXPredicted !== null && g.targetXCurrent !== null)
    ? r2(g.targetXPredicted - g.targetXCurrent) : null;
  g.overlapRisk = (g.predictedSpaceBetween !== null && g.predictedSpaceBetween < 0) ||
                  (g.spaceAfterTargetPredicted !== null && g.spaceAfterTargetPredicted < 0) ||
                  g.availableSpaceBetween < 0;
  g.overflowRisk = g.targetRightEdgePredicted !== null &&
                   g.targetRightEdgePredicted > innerRight + 0.5;
  g.spaceBetweenReflowsSafely = !g.overlapRisk && !g.overflowRisk;
  return g;
}

/* ========================================================================
 * 1. 재료
 * ====================================================================== */
const src = await figma.getNodeByIdAsync(SRC_ID);
const parent = src ? src.parent : null;
const set = await figma.getNodeByIdAsync(BUTTON_SET_ID);

let leadingProp = null, variant = null, masterLabel = null, masterLead = null, masterLeadIcon = null;
if (set && set.type === 'COMPONENT_SET') {
  try {
    leadingProp = Object.keys(set.componentPropertyDefinitions)
      .find(k => k.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }
  variant = set.children.filter(c => c.name === TARGET_VARIANT)[0] || null;
  if (variant) {
    const lt = findTextNode(variant, TEXT_NODE_NAMES);
    masterLabel = lt.node;
    masterLead = findByName(variant, 'leading');
    if (masterLead && masterLead.type === 'INSTANCE') {
      const m = await mainCompOf(masterLead);
      masterLeadIcon = m ? m.name : null;
    }
  }
}

const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const plusIcon = iconComps.filter(c => c.name === LEADING_ICON)[0] || null;

/* ========================================================================
 * 2. baseline
 * ====================================================================== */
const plan = { srcId: SRC_ID, found: !!src };
if (src && parent) {
  const st = findTextNode(src, TEXT_NODE_NAMES);
  plan.parentId = parent.id;
  plan.parentName = parent.name;
  plan.parentMatchesExpected = parent.id === PARENT_ID;
  plan.currentIndex = (kids(parent) || []).indexOf(src);
  plan.indexNote = '보고용이다. APPLY 는 삽입 직전에 다시 계산한다';
  plan.currentVisible = src.visible;
  plan.currentSize = r2(src.width) + '×' + r2(src.height);
  plan.currentWidth = r2(src.width);
  plan.currentHeight = r2(src.height);
  plan.currentX = r2(src.x);
  plan.currentText = st.node ? st.node.characters : null;
  plan.currentTextWidth = st.node ? r2(st.node.width) : null;
  plan.currentTextFontSize = st.node ? r2(st.node.fontSize) : null;
  plan.currentTextFoundBy = st.foundBy;
  plan.labelMatchesPlanned = plan.currentText === LABEL_TEXT;

  /* 아이콘이 몸통 안인지 확인 — 밖 형제면 Phase B 처럼 따로 숨겨야 한다 */
  const SHAPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];
  const iconsInside = collectDeep(src, c => SHAPES.indexOf(c.type) >= 0 ||
    (c.type === 'INSTANCE' && /icon/i.test(c.name)), 8);
  const siblingAccessories = (kids(parent) || []).filter(c => c.id !== src.id &&
    collectDeep(c, x => x.type === 'TEXT', 6).length === 0 &&
    collectDeep(c, x => SHAPES.indexOf(x.type) >= 0, 6).length > 0);
  plan.iconsInsideBody = iconsInside.length;
  plan.siblingAccessoryIds = siblingAccessories.map(c => c.id);
  plan.accessoryIdsToHide = [];
  plan.iconStructure = siblingAccessories.length > 0
    ? '⚠ 몸통 밖 형제 ' + siblingAccessories.length + '개 — 감사 결과와 다르다. 확인 필요'
    : '몸통 안 ' + iconsInside.length + '개 — 원본을 숨기면 같이 사라진다';
  if (siblingAccessories.length > 0) {
    notes.push('감사에서는 accessory 가 없다고 했는데 지금은 ' + siblingAccessories.length +
               '개 보인다: ' + plan.siblingAccessoryIds.join(', ') + ' — 확인 전에는 숨기지 않는다');
  }

  /* 새 인스턴스 예상 크기 */
  if (variant) {
    let sizingH = null;
    try { sizingH = variant.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
    plan.masterWidthMode = sizingH;
    plan.predictedHeight = r2(variant.height);
    const leadVisible = masterLead ? masterLead.visible : false;
    const addLeading = leadVisible ? 0 : r2((variant.itemSpacing || 0) + LEADING_SLOT);
    plan.leadingAlreadyVisibleInMaster = leadVisible;
    plan.leadingAddition = addLeading;

    if (sizingH === 'FIXED') {
      plan.predictedWidth = r2(variant.width);
      plan.predictionKind = 'exact';
      plan.widthBasis = '마스터가 고정 폭이다';
    } else if (masterLabel && st.node) {
      const fsSame = Math.abs(r2(masterLabel.fontSize) - r2(st.node.fontSize)) < 0.01;
      let fnSame = false;
      try {
        fnSame = typeof masterLabel.fontName === 'object' && typeof st.node.fontName === 'object' &&
          masterLabel.fontName.family === st.node.fontName.family &&
          masterLabel.fontName.style === st.node.fontName.style;
      } catch (e) { /* 무시 */ }
      plan.masterLabelWidth = r2(masterLabel.width);
      plan.masterLabelFontSize = r2(masterLabel.fontSize);
      plan.fontSizeSame = fsSame;
      plan.fontNameSame = fnSame;
      const labelW = (fsSame && fnSame) ? r2(st.node.width)
        : r2(st.node.width * (masterLabel.fontSize / st.node.fontSize));
      plan.labelWidthUsed = labelW;
      plan.predictionKind = (fsSame && fnSame) ? 'measuredLabel' : 'estimate';
      plan.predictedWidth = r2(variant.width - masterLabel.width + labelW + addLeading);
      plan.widthBasis = '마스터 폭 ' + r2(variant.width) + ' − 마스터 라벨 ' + r2(masterLabel.width) +
        ' + 라벨 ' + labelW + ' + leading ' + addLeading;
    } else {
      plan.predictedWidth = null;
      plan.predictionKind = 'unknown';
      plan.widthBasis = '마스터 라벨이나 현재 텍스트를 읽지 못했다';
    }
    plan.predictedSize = plan.predictedWidth === null ? null
      : plan.predictedWidth + '×' + plan.predictedHeight;
    plan.widthDelta = plan.predictedWidth === null ? null : r2(plan.predictedWidth - src.width);
    plan.widthCaution = '예상값이다. 최종 폭은 교체 후 18b 에서 실측한다. ' +
      'Phase B 에서 같은 식이 Reset 폭을 16px 빗나간 적이 있다.';
  }
}

const geometry = (src && parent && plan.predictedWidth !== undefined)
  ? geometryOf(parent, SRC_ID, plan.predictedWidth) : null;

/* ========================================================================
 * 3. preflight
 * ====================================================================== */
const preflight = {
  targetFound: !!src,
  targetVisible: !!src && src.visible === true,
  parentFound: !!parent,
  parentMatchesExpected: !!parent && parent.id === PARENT_ID,
  buttonSetFound: !!(set && set.type === 'COMPONENT_SET'),
  primaryVariantExists: !!variant,
  leadingPropertyExists: !!leadingProp,
  plusIconFound: !!plusIcon,
  targetLabelMatchesPlanned: plan.labelMatchesPlanned === true,
  iconIsInsideBody: plan.iconsInsideBody > 0,
  noSiblingAccessories: !!plan.siblingAccessoryIds && plan.siblingAccessoryIds.length === 0,
  predictedWidthResolved: plan.predictedWidth !== null && plan.predictedWidth !== undefined,
  geometryModelValid: !!(geometry && geometry.geometryModelMatchesMeasured),
  spaceBetweenReflowsSafely: !!(geometry && geometry.spaceBetweenReflowsSafely)
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '사전 조건 누락: ' + missing.join(', '),
               preflight, plan, geometry, notes });
}

/* ========================================================================
 * 4. DRY_RUN
 * ====================================================================== */
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    targetCount: 1,
    accessoryCount: 0,
    preflight,

    target: {
      원본노드: plan.srcId,
      부모: plan.parentName + ' (' + plan.parentId + ')',
      현재index: plan.currentIndex,
      indexNote: plan.indexNote,
      새변형: TARGET_VARIANT,
      현재라벨: plan.currentText,
      새라벨: LABEL_TEXT,
      라벨노드찾은법: plan.currentTextFoundBy,
      leading아이콘: LEADING_ICON,
      leading노출: true,
      아이콘구조: plan.iconStructure,
      현재크기: plan.currentSize,
      예상크기: plan.predictedSize,
      폭변화: plan.widthDelta,
      폭근거: plan.widthBasis,
      예측종류: plan.predictionKind,
      주의: plan.widthCaution
    },
    planRaw: plan,

    geometry: {
      부모폭: geometry.parentWidth,
      부모오른쪽끝: geometry.parentRightEdge,
      간격재분배: geometry.spacingIsDistributed,
      간격설명: geometry.spacingNote,
      왼쪽형제: geometry.leftSiblingId,
      왼쪽형제오른쪽끝: geometry.leftSiblingRightEdge,
      현재x: geometry.targetXCurrent,
      예상x: geometry.targetXPredicted,
      예상오른쪽끝: geometry.targetRightEdgePredicted,
      현재간격: geometry.currentActualSpaceBetween,
      예상간격: geometry.predictedSpaceBetween,
      남는공간: geometry.availableSpaceBetween,
      이동량: geometry.shiftPx,
      모델이현재배치재현: geometry.geometryModelMatchesMeasured,
      overlapRisk: geometry.overlapRisk,
      overflowRisk: geometry.overflowRisk,
      spaceBetweenReflowsSafely: geometry.spaceBetweenReflowsSafely
    },
    geometryRaw: geometry,

    mutationPlan: {
      originalToHide: SRC_ID,
      accessoryIdsToHide: [],
      newInstance: BUTTON_SET_ID + ' / ' + TARGET_VARIANT,
      deletePolicy: '삭제하지 않는다. visible = false 로 보존한다',
      insertion: '원본의 현재 index 에 삽입. index 는 삽입 직전에 다시 계산하고 삽입 직후 검증한다',
      parentUntouched: '부모 ' + PARENT_ID + ' 의 폭·정렬·padding 은 건드리지 않는다'
    },

    applyOrder: [
      '1 indexOf 재계산', '2 인스턴스 생성', '3 그 index 에 insert',
      '4 index 검증 (새=idx, 원본=idx+1)', '5 라벨', '6 leading 아이콘',
      '7 leading visible=true', '8 되읽기', '9 원본 visible=false'
    ],
    stopPolicy: '한 단계라도 실패하면 중단한다.',
    partialSafety: {
      stoppedAt: null, failedAt: null, strayInstanceIds: [], partialMutationDetected: false,
      note: 'DRY_RUN 이라 아직 아무것도 바꾸지 않았다. APPLY 에서 실제 값이 채워진다.'
    },
    notes,
    nextStep: 'DRY_RUN 이 맞으면 DRY_RUN = false 로 재실행하고 직후 18b 를 돌립니다.'
  });
}

/* ========================================================================
 * 5. APPLY
 * ====================================================================== */
const result = { srcId: SRC_ID, instanceCreated: false, inserted: false, indexVerified: false,
                 labelSet: false, leadingHandled: false, originalHidden: false,
                 complete: false, newInstanceId: null };
const strayInstanceIds = [];
const partialMutationKind = [];
let stoppedAt = null;
let failedAt = null;
let step = 'start';
let pendingInstanceId = null;

try {
  step = 'recomputeIndex';
  const idx = parent.children.indexOf(src);
  result.recomputedIndex = idx;
  result.indexAtPlanTime = plan.currentIndex;
  result.indexShiftedSincePlan = idx !== plan.currentIndex;
  if (idx < 0) throw new Error('부모에서 원본을 찾지 못했다');

  step = 'createInstance';
  const inst = variant.createInstance();
  pendingInstanceId = inst.id;
  result.instanceCreated = true;
  result.newInstanceId = inst.id;
  inst.name = src.name;

  step = 'insertChild';
  parent.insertChild(idx, inst);
  pendingInstanceId = null;
  result.inserted = true;

  step = 'verifyIndex';
  const newIdx = parent.children.indexOf(inst);
  const oldIdx = parent.children.indexOf(src);
  result.newInstanceIndex = newIdx;
  result.originalIndexAfterInsert = oldIdx;
  result.indexVerified = newIdx === idx && oldIdx === idx + 1;
  if (!result.indexVerified) {
    throw new Error('index 가 계획과 다르다 — 새 인스턴스 ' + newIdx + ' (기대 ' + idx +
                    '), 원본 ' + oldIdx + ' (기대 ' + (idx + 1) + ')');
  }

  step = 'setLabel';
  const lt = findTextNode(inst, TEXT_NODE_NAMES);
  if (!lt.node) throw new Error('인스턴스 안에서 텍스트 노드를 찾지 못함');
  result.labelNodeFoundBy = lt.foundBy;
  try { await figma.loadFontAsync(lt.node.fontName); }
  catch (e) { throw new Error('폰트 로드 실패: ' + e.message); }
  lt.node.characters = LABEL_TEXT;
  result.labelReadBack = lt.node.characters;
  result.labelSet = lt.node.characters === LABEL_TEXT;
  if (!result.labelSet) throw new Error('라벨을 썼는데 되읽으면 다르다: ' + lt.node.characters);

  step = 'leadingIcon';
  const lead0 = findByName(inst, 'leading');
  if (!lead0) throw new Error('인스턴스 안에서 leading 을 찾지 못함');
  const mc = lead0.type === 'INSTANCE' ? await mainCompOf(lead0) : null;
  result.leadingIconBefore = mc ? mc.name : null;
  if (!mc || mc.name !== LEADING_ICON) {
    result.leadingSwapNeeded = true;
    let ok = false;
    try { inst.setProperties({ [leadingProp]: plusIcon.id }); } catch (e) { result.swapIdError = e.message; }
    let after = await mainCompOf(findByName(inst, 'leading'));
    if (after && after.name === LEADING_ICON) { ok = true; result.swapForm = 'node id'; }
    if (!ok && plusIcon.key) {
      try { inst.setProperties({ [leadingProp]: plusIcon.key }); } catch (e) { result.swapKeyError = e.message; }
      after = await mainCompOf(findByName(inst, 'leading'));
      if (after && after.name === LEADING_ICON) { ok = true; result.swapForm = 'component key'; }
    }
    if (!ok) throw new Error('leading 아이콘 swap 이 적용되지 않음 (id·key 둘 다 실패)');
  } else {
    result.leadingSwapNeeded = false;
  }

  step = 'leadingVisible';
  const lead = findByName(inst, 'leading');
  lead.visible = true;
  result.leadingVisibleReadBack = lead.visible;
  if (lead.visible !== true) throw new Error('leading visible 이 되읽으면 다르다');
  const mc2 = lead.type === 'INSTANCE' ? await mainCompOf(lead) : null;
  result.leadingIconAfter = mc2 ? mc2.name : null;
  if (result.leadingIconAfter !== LEADING_ICON) {
    throw new Error('leading 아이콘이 ' + result.leadingIconAfter + ' 다 (기대 ' + LEADING_ICON + ')');
  }
  result.leadingHandled = true;

  step = 'hideOriginal';
  src.visible = false;
  result.originalHidden = src.visible === false;
  if (!result.originalHidden) throw new Error('원본을 숨겼는데 되읽으면 visible 이다');

  step = 'measure';
  result.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
  result.newInstanceWidth = r2(inst.width);
  result.newInstanceHeight = r2(inst.height);
  result.newInstanceX = r2(inst.x);
  result.predictedWidth = plan.predictedWidth;
  result.widthVsPrediction = plan.predictedWidth === null ? null
    : r2(inst.width - plan.predictedWidth);
  if (result.widthVsPrediction !== null && Math.abs(result.widthVsPrediction) > 1) {
    notes.push('실측 폭 ' + result.newInstanceWidth + ' 이 예상 ' + plan.predictedWidth +
               ' 과 ' + result.widthVsPrediction + ' 만큼 다르다 — 실측이 기준이다 (실패 아님)');
  }
  result.complete = true;
} catch (e) {
  if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
  failedAt = { step, message: e.message };
  errors.push('[' + step + '] ' + e.message);
  stoppedAt = step;
}

/* ========================================================================
 * 6. 판정
 * ====================================================================== */
if (!result.complete) {
  if (result.inserted && !result.originalHidden) partialMutationKind.push('insertedButOriginalVisible');
  else if (result.instanceCreated && !result.inserted) partialMutationKind.push('instanceCreatedNotInserted');
  else if (result.inserted && !result.leadingHandled) partialMutationKind.push('insertedButLeadingUnset');
  else partialMutationKind.push('incomplete');
}
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');
const partialMutationDetected = partialMutationKind.length > 0;

/* 교체 후 실제 배치 */
let geometryAfter = null;
if (parent) {
  const cs = kids(parent) || [];
  const inFlow = cs.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
  const order = inFlow.slice().sort((a, b) => a.x - b.x);
  const inst = result.newInstanceId
    ? order.filter(c => c.id === result.newInstanceId)[0] : null;
  const tIdx = inst ? order.indexOf(inst) : -1;
  const padR = r2(parent.paddingRight || 0);
  geometryAfter = {
    parentWidth: r2(parent.width), parentHeight: r2(parent.height),
    parentRightEdge: r2(parent.width - padR),
    children: order.map(c => ({ id: c.id, name: c.name, x: r2(c.x), width: r2(c.width),
                                rightEdge: r2(c.x + c.width) })),
    targetX: inst ? r2(inst.x) : null,
    targetRightEdge: inst ? r2(inst.x + inst.width) : null,
    actualSpaceBetween: tIdx > 0
      ? r2(order[tIdx].x - (order[tIdx - 1].x + order[tIdx - 1].width)) : null,
    predictedX: geometry ? geometry.targetXPredicted : null,
    predictedSpaceBetween: geometry ? geometry.predictedSpaceBetween : null
  };
  geometryAfter.overflow = geometryAfter.targetRightEdge !== null &&
    geometryAfter.targetRightEdge > geometryAfter.parentRightEdge + 0.5;
  geometryAfter.overlap = geometryAfter.actualSpaceBetween !== null &&
    geometryAfter.actualSpaceBetween < 0;
  geometryAfter.parentWidthUnchanged = geometry ? near(parent.width, geometry.parentWidth) : null;
  if (geometryAfter.overflow) errors.push('교체 후 버튼이 부모 오른쪽 끝을 넘는다');
  if (geometryAfter.overlap) errors.push('교체 후 왼쪽 형제와 겹친다');
}

if (stoppedAt) errors.push('중단됨 — ' + stoppedAt + ' 단계에서 실패했다');

const successCriteria = {
  targetComplete: result.complete === true,
  indexVerified: result.indexVerified === true,
  labelCorrect: result.labelReadBack === LABEL_TEXT,
  leadingIsPlusAndVisible: result.leadingIconAfter === LEADING_ICON &&
                           result.leadingVisibleReadBack === true,
  originalHiddenNotDeleted: result.originalHidden === true,
  parentWidthUnchanged: geometryAfter ? geometryAfter.parentWidthUnchanged !== false : false,
  noOverflow: geometryAfter ? geometryAfter.overflow === false : false,
  noOverlap: geometryAfter ? geometryAfter.overlap === false : false,
  noStrayInstances: strayInstanceIds.length === 0,
  noPartialMutation: !partialMutationDetected,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  targetCount: 1,
  accessoryCount: 0,
  result,
  geometryBefore: geometry,
  geometryAfter,
  stoppedAt, failedAt,
  strayInstanceIds,
  partialMutationKind,
  partialMutationDetected,
  successCriteria,
  successCriteriaMet,
  nextVerification: '18b-phaseC-verify',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
