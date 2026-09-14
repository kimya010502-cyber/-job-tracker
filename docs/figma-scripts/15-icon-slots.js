/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 15
 * 아이콘 시스템 마지막 단계) Button / Input / NavItem / Pagination Item 의 아이콘 슬롯 정리
 *
 * 대상 (전부 **기존 마스터를 수정한다. 삭제·재생성하지 않는다**)
 *   Button           1029:1997  variant 4  leading  기본 Icon / Plus              hidden
 *   Input            1030:2017  variant 3  leading  기본 Icon / Search            hidden
 *   NavItem          1042:36    variant 2  icon     기본 Icon / Nav / Applications visible
 *   Pagination Item  1042:46    variant 3  icon     기본 Icon / Chevron Left       hidden
 *
 * 식별자 규칙 (Chip·Icon Button 에서 겪은 혼동을 반복하지 않는다)
 *   addComponentProperty 의 defaultValue = **컴포넌트 노드 id**
 *   preferredValues 항목                = **컴포넌트 key** ({ type, key })
 *   같은 호출에서 두 인자가 서로 다른 식별자를 쓴다.
 *
 * 기하 구조에 위험이 없는 이유
 *   Button 과 Pagination 은 슬롯이 12 → 16 으로 커지지만 둘 다 숨김 상태이고,
 *   Button 은 높이 36 고정 · 가로 hug, Pagination 은 32×32 고정이라 외곽이 변하지 않는다.
 *   Input·NavItem 은 이미 16 이라 크기 변화 자체가 없다.
 *   (Icon Button 때는 슬롯이 보이는 상태라 padding 을 6→4 로 함께 줄여야 했다. 여기는 해당 없음)
 *
 * 실패 처리
 *   마스터 단위로 순차 처리하고, **한 마스터가 실패하면 그 뒤 마스터는 진행하지 않는다.**
 *   어디까지 끝났는지 buttonComplete / inputComplete / navItemComplete / paginationComplete 로 남긴다.
 *   부분 상태는 <key>Only (속성만) / <key>Partial (일부 variant) 로 구분한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 현재 구조(baseline)와 계획만 출력
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *   3) 직후 15b(Button) · 15c(Input) · 15d(NavItem) · 15e(Pagination) 읽기 전용 검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '15-v1-icon-slots';

const SLOT = 16;

const TARGETS = [
  { key: 'button', name: 'Button', id: '1029:1997', prop: 'leading',
    defaultIcon: 'Icon / Plus', slotVisible: false, variantCount: 4,
    expect: { width: null, height: 36, padding: '0/12/0/12', gap: 4, radius: 8 },
    oldSlot: { w: 12, h: 12 } },

  { key: 'input', name: 'Input', id: '1030:2017', prop: 'leading',
    defaultIcon: 'Icon / Search', slotVisible: false, variantCount: 3,
    expect: { width: 240, height: 36, padding: '0/12/0/12', gap: 8, radius: 8 },
    oldSlot: { w: 16, h: 16 } },

  { key: 'navItem', name: 'NavItem', id: '1042:36', prop: 'icon',
    defaultIcon: 'Icon / Nav / Applications', slotVisible: true, variantCount: 2,
    expect: { width: 232, height: 32, padding: '0/12/0/12', gap: 8, radius: 8 },
    oldSlot: { w: 16, h: 16 } },

  { key: 'pagination', name: 'Pagination Item', id: '1042:46', prop: 'icon',
    defaultIcon: 'Icon / Chevron Left', slotVisible: false, variantCount: 3,
    expect: { width: 32, height: 32, padding: '0/0/0/0', gap: 0, radius: 4 },
    oldSlot: { w: 12, h: 12 } }
];

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ========================================================================
 * 1. 아이콘 라이브러리
 * ====================================================================== */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const iconByName = {};
for (const c of iconComps) iconByName[c.name] = c;
const iconsWithKey = iconComps.filter(c => !!c.key);

/* ========================================================================
 * 2. 대상별 현재 구조 읽기 (baseline)
 * ====================================================================== */
const baseline = [];
for (const t of TARGETS) {
  const node = await figma.getNodeByIdAsync(t.id);
  const rec = { key: t.key, name: t.name, id: t.id, found: !!node };
  if (!node) { baseline.push(rec); continue; }

  rec.type = node.type;
  rec.isSet = node.type === 'COMPONENT_SET';
  rec.nameMatches = node.name === t.name;
  rec.variantCount = 'children' in node ? node.children.length : 0;

  let props = null;
  try { props = node.componentPropertyDefinitions; } catch (e) { notes.push(t.name + ' 속성 정의 읽기 실패: ' + e.message); }
  rec.existingPropKey = props ? (Object.keys(props).find(k => k.split('#')[0] === t.prop) || null) : null;

  rec.variants = [];
  if (rec.isSet) {
    for (const v of node.children) {
      const slots = v.children.filter(c => c.name === t.prop);
      const s = slots[0] || null;
      rec.variants.push({
        variant: v.name,
        size: r2(v.width) + '×' + r2(v.height),
        padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
        gap: r2(v.itemSpacing),
        radius: typeof v.cornerRadius === 'number' ? r2(v.cornerRadius) : 'mixed',
        childNames: v.children.map(c => c.name),
        slotCount: slots.length,
        slotType: s ? s.type : null,
        slotSize: s ? r2(s.width) + '×' + r2(s.height) : null,
        slotVisible: s ? s.visible : null
      });
    }
  }
  rec.defaultIconFound = !!iconByName[t.defaultIcon];
  rec.defaultIconNodeId = iconByName[t.defaultIcon] ? iconByName[t.defaultIcon].id : null;
  baseline.push(rec);
}

/* ========================================================================
 * 3. 사전 조건
 * ====================================================================== */
/* blocking — 이 중 하나라도 false 면 아무것도 건드리지 않고 중단한다 */
const preflight = { iconLibraryCount17: iconComps.length === 17,
                    allIconsHaveKey: iconsWithKey.length === iconComps.length };

/* informational — 부분 적용 후 재실행을 막지 않기 위해 차단 조건에서 제외한다.
 * 이미 속성이 있거나 슬롯이 이미 인스턴스인 상태는 "이어서 하면 되는 상태"이지 오류가 아니다. */
const preflightInfo = {};
const resumeState = {};

for (let i = 0; i < TARGETS.length; i++) {
  const t = TARGETS[i], b = baseline[i];
  const hasVariants = !!b.variants && b.variants.length > 0;

  preflight[t.key + '_found'] = b.found === true;
  preflight[t.key + '_isComponentSet'] = b.isSet === true;
  preflight[t.key + '_variantCount'] = b.variantCount === t.variantCount;
  preflight[t.key + '_defaultIconFound'] = b.defaultIconFound === true;
  preflight[t.key + '_everyVariantHasOneSlot'] = hasVariants && b.variants.every(v => v.slotCount === 1);
  preflight[t.key + '_heightAsExpected'] = hasVariants &&
    b.variants.every(v => near(parseFloat(v.size.split('×')[1]), t.expect.height));

  preflightInfo[t.key + '_propertyNotYetAdded'] = !b.existingPropKey;
  preflightInfo[t.key + '_slotsAreFrames'] = hasVariants && b.variants.every(v => v.slotType === 'FRAME');
  preflightInfo[t.key + '_slotsAreInstances'] = hasVariants && b.variants.every(v => v.slotType === 'INSTANCE');
  preflightInfo[t.key + '_slotSizeAsExpected'] = hasVariants &&
    b.variants.every(v => v.slotSize === t.oldSlot.w + '×' + t.oldSlot.h);

  const done = hasVariants ? b.variants.filter(v => v.slotType === 'INSTANCE').length : 0;
  resumeState[t.key] =
    (!b.existingPropKey && done === 0) ? 'untouched'
    : ((b.existingPropKey && done === 0) ? 'propertyOnly'
    : ((b.existingPropKey && hasVariants && done === b.variants.length) ? 'alreadyDone'
    : 'partial (' + done + '/' + (hasVariants ? b.variants.length : 0) + ')'));
  if (resumeState[t.key] !== 'untouched') {
    notes.push(t.name + ' 는 이미 손댄 상태: ' + resumeState[t.key] + ' — APPLY 는 남은 부분만 처리한다.');
  }
}
const missing = Object.keys(preflight).filter(k => !preflight[k]);

if (missing.length) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight, preflightInfo, resumeState, baseline, iconLibraryCount: iconComps.length, notes
  });
}

/* ========================================================================
 * 4. DRY_RUN
 * ====================================================================== */
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    preflightInfo,
    resumeState,
    baseline,
    iconLibraryCount: iconComps.length,
    iconsWithKeyCount: iconsWithKey.length,
    plan: TARGETS.map(t => ({
      master: t.name, id: t.id,
      property: t.prop + ' (INSTANCE_SWAP)',
      defaultValue: (iconByName[t.defaultIcon] ? iconByName[t.defaultIcon].id : '?') + ' ← 노드 id',
      defaultIcon: t.defaultIcon,
      preferredValues: iconsWithKey.length + '종 ← 컴포넌트 key',
      slotChange: t.oldSlot.w + '×' + t.oldSlot.h + ' FRAME → ' + SLOT + '×' + SLOT + ' Icon 인스턴스',
      slotVisible: t.slotVisible,
      variantsToTouch: t.variantCount,
      mustNotChange: '외곽 ' + (t.expect.width ? t.expect.width + '×' : '') + t.expect.height +
                     ' · padding ' + t.expect.padding + ' · gap ' + t.expect.gap + ' · radius ' + t.expect.radius
    })),
    geometryNote: 'Button·Pagination 은 슬롯이 12→16 으로 커지지만 숨김 상태이고 외곽이 고정이라 크기 변화가 없다. ' +
                  'Input·NavItem 은 이미 16 이라 변화 자체가 없다. Icon Button 때와 달리 padding 조정이 필요 없다.',
    executionOrder: TARGETS.map((t, i) => (i + 1) + '. ' + t.name + ' (속성 추가 → variant 슬롯 교체)'),
    stopPolicy: '한 마스터가 실패하면 그 뒤 마스터는 진행하지 않는다.',
    partialStates: [
      '<key>Only    — 속성만 추가되고 variant 슬롯을 하나도 못 바꿈',
      '<key>Partial — 일부 variant 만 교체됨',
      'strayInstances — variant 에 넣지 못한 미아 인스턴스 존재'
    ],
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 5. APPLY — 마스터 단위 순차, 실패 시 중단
 * ====================================================================== */
const preferred = iconsWithKey.map(c => ({ type: 'COMPONENT', key: c.key }));
const results = {};
const strayInstanceIds = [];
const partialMutationKind = [];
let stoppedAt = null;
let failedAt = null;

for (const t of TARGETS) {
  const rec = { master: t.name, id: t.id, propertyCreated: false, propertyKey: null,
                propertyStrategy: null, variantsAttempted: 0, variantsCompleted: 0,
                modifiedVariants: [], variants: [], complete: false,
                geometryIntact: null };   // null = 측정 못 함(손대기 전에 중단)
  results[t.key] = rec;

  const setNode = await figma.getNodeByIdAsync(t.id);
  const icon = iconByName[t.defaultIcon];

  /* 5-1. 속성 추가 (실패 확률이 가장 높은 단계 → 가장 먼저) */
  let propKey = null;
  try { propKey = Object.keys(setNode.componentPropertyDefinitions).find(k => k.split('#')[0] === t.prop) || null; }
  catch (e) { /* 무시 */ }

  if (!propKey) {
    try {
      try {
        propKey = setNode.addComponentProperty(t.prop, 'INSTANCE_SWAP', icon.id, { preferredValues: preferred });
        rec.propertyStrategy = 'nodeId + preferredValues';
      } catch (eA) {
        propKey = setNode.addComponentProperty(t.prop, 'INSTANCE_SWAP', icon.id);
        rec.propertyStrategy = 'nodeId only (preferredValues 거부: ' + eA.message + ')';
        notes.push(t.name + ' preferredValues 거부: ' + eA.message);
      }
      rec.propertyCreated = true;
    } catch (e) {
      failedAt = { master: t.name, step: 'addComponentProperty', message: e.message };
      stoppedAt = t.name;
      errors.push(t.name + ' [addComponentProperty] ' + e.message);
      break;
    }
  } else {
    rec.propertyStrategy = '기존 속성 재사용';
  }
  rec.propertyKey = propKey;

  /* 5-2. variant 별 슬롯 교체 */
  let hardFail = false;
  for (const v of setNode.children) {
    rec.variantsAttempted++;
    let step = 'start';
    let pendingInstanceId = null;
    try {
      step = 'findSlot';
      const oldSlot = v.children.find(c => c.name === t.prop);
      if (!oldSlot) throw new Error(t.prop + ' 슬롯을 찾지 못함');
      if (oldSlot.type === 'INSTANCE') {
        notes.push(t.name + '/' + v.name + ': 이미 인스턴스 — 건너뜀');
        rec.variantsCompleted++;
        continue;
      }

      step = 'createInstance';
      const idx = v.children.indexOf(oldSlot);
      const inst = icon.createInstance();
      pendingInstanceId = inst.id;
      inst.name = t.prop;

      step = 'insertChild';
      v.insertChild(idx, inst);
      pendingInstanceId = null;
      rec.modifiedVariants.push(v.name);

      step = 'resize';
      inst.resize(SLOT, SLOT);
      try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; }
      catch (e) { notes.push(t.name + '/' + v.name + ' sizing 실패: ' + e.message); }

      step = 'setVisible';
      inst.visible = t.slotVisible;

      step = 'propertyReference';
      try { inst.componentPropertyReferences = { mainComponent: propKey }; }
      catch (e) { throw new Error('속성 참조 연결 실패: ' + e.message); }

      step = 'removeOldFrame';
      oldSlot.remove();

      rec.variantsCompleted++;
      rec.variants.push({
        variant: v.name,
        size: r2(v.width) + '×' + r2(v.height),
        padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
        gap: r2(v.itemSpacing),
        slotType: inst.type, slotSize: r2(inst.width) + '×' + r2(inst.height),
        slotVisible: inst.visible
      });
    } catch (e) {
      if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
      failedAt = { master: t.name, variant: v.name, step, message: e.message };
      errors.push(t.name + '/' + v.name + ' [' + step + '] ' + e.message);
      hardFail = true;
      break;
    }
  }

  rec.complete = !hardFail && rec.variantsCompleted === setNode.children.length;

  /* 5-3. 기하 불변 확인 — 실제로 손댄 마스터에 대해서만 측정된다.
   * 속성 생성 단계에서 중단하면 여기까지 오지 않고 null 로 남는다. 그건 '깨졌다'가 아니라 '안 건드렸다'이다. */
  rec.geometryIntact = setNode.children.every(v => {
    const hOk = near(v.height, t.expect.height);
    const wOk = t.expect.width === null ? true : near(v.width, t.expect.width);
    const pOk = [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/') === t.expect.padding;
    const gOk = near(v.itemSpacing, t.expect.gap);
    return hOk && wOk && pOk && gOk;
  });
  if (!rec.geometryIntact) errors.push(t.name + ' 외곽/padding/gap 이 baseline 과 달라짐');

  if (hardFail) { stoppedAt = t.name; break; }
}

/* ========================================================================
 * 6. 판정
 * ====================================================================== */
for (const t of TARGETS) {
  const r = results[t.key];
  if (!r) continue;                                   // 앞 마스터 실패로 시작도 못 함
  if (r.complete) continue;
  if (r.propertyKey && r.variantsCompleted === 0) partialMutationKind.push(t.key + 'Only');
  else if (r.variantsCompleted > 0) partialMutationKind.push(t.key + 'Partial');
}
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');

const notStarted = TARGETS.filter(t => !results[t.key]).map(t => t.name);
const partialMutationDetected = partialMutationKind.length > 0;

const buttonComplete = !!(results.button && results.button.complete);
const inputComplete = !!(results.input && results.input.complete);
const navItemComplete = !!(results.navItem && results.navItem.complete);
const paginationComplete = !!(results.pagination && results.pagination.complete);
const allComplete = buttonComplete && inputComplete && navItemComplete && paginationComplete;

if (stoppedAt) errors.push('중단됨 — ' + stoppedAt + ' 에서 실패하여 이후 마스터는 진행하지 않았다. 시작도 못 한 마스터: ' +
                           (notStarted.length ? notStarted.join(', ') : '없음'));

const successCriteria = {
  buttonComplete, inputComplete, navItemComplete, paginationComplete,
  geometryNotBroken: TARGETS.every(t => !results[t.key] || results[t.key].geometryIntact !== false),
  noStrayInstances: strayInstanceIds.length === 0,
  noPartialMutation: !partialMutationDetected,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  buttonComplete, inputComplete, navItemComplete, paginationComplete, allComplete,
  results,
  mastersNotStarted: notStarted,
  stoppedAt,
  failedAt,
  strayInstanceIds,
  partialMutationKind,
  partialMutationDetected,
  successCriteria,
  successCriteriaMet,
  nextVerification: ['15b Button', '15c Input', '15d NavItem', '15e Pagination Item'],
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
