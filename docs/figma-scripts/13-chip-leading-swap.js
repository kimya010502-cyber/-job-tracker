/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 13
 * 아이콘 시스템 3단계) Chip 의 leading 을 Icon 인스턴스 + INSTANCE_SWAP 으로 교체
 *
 * 대상: Chip 컴포넌트 세트 1029:1984 (**기존 마스터를 수정한다. 삭제·재생성하지 않는다**)
 *
 * 하는 일
 *   1) Chip 세트에 INSTANCE_SWAP 속성 `leading` 을 추가한다 (기본값 = Icon / Dot)
 *      preferredValues 를 Icon 라이브러리 17종으로 제한한다
 *   2) variant 5개 각각에서 **빈 leading FRAME 을 Icon / Dot 인스턴스로 교체**한다
 *      - 같은 인덱스에 삽입 → 16×16 고정 → visible = false → 속성 참조 연결
 *      - 그 뒤 빈 프레임을 제거한다 (내용이 없으므로 잃는 데이터가 없다)
 *
 * 실행 순서를 이렇게 잡은 이유
 *   속성 추가는 **실패 확률이 가장 높은 단계**라 가장 먼저 실행한다.
 *   여기서 실패하면 아직 variant 를 건드리지 않은 상태로 중단된다.
 *   프레임 교체를 먼저 하면 속성 추가 실패 시 절반만 바뀐 상태가 남는다.
 *
 *   다만 **이 작업은 원자적이지 않다.** 속성 추가 이후의 createInstance / insertChild /
 *   resize / 속성 참조 연결 / remove 도 런타임 실패할 수 있다.
 *   그래서 중간에 실패하면 **어느 variant 까지 어떤 단계에서 바뀌었는지** 결과에 남긴다.
 *   (propertyCreated / variantsAttempted / variantsCompleted / modifiedVariantIds /
 *    failedAt / partialMutationDetected)
 *
 * 바뀌지 않아야 하는 것
 *   variant 5종 · 높이 24 · padding 4/8 · gap 4 · radius/full · label · tone 토큰
 *
 * 간접 영향 (이 단계에서 직접 수정하지 않는다)
 *   KPI Card · Application Card 가 Chip 을 중첩 인스턴스로 품고 있다.
 *   leading 이 기본 숨김이라 시각 변화는 없어야 하지만, **노드가 교체되므로
 *   기존 visible 오버라이드가 초기화될 수 있다.** 특히 Application Card 의
 *   stage count 칩은 leading 을 켜 둔 상태였다 → 06b 에서 반드시 확인한다.
 *
 * 롤백
 *   마스터 수정이라 화면 백업 1044:47 로는 되돌릴 수 없다. Ctrl+Z 또는 버전 기록을 쓴다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 현재 구조와 계획만 출력, 아무것도 바꾸지 않음
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *   3) 직후 13b(Chip 검증) → 05b(KPI Card) → 06b(Application Card) 순으로 읽기 전용 재검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '13-v3-chip-leading-swap-stray-tracking';

const CHIP_SET_ID = '1029:1984';
const CHIP_SET_NAME = 'Chip';
const PROP_NAME = 'leading';
const DEFAULT_ICON = 'Icon / Dot';
const SLOT = 16;
const EXPECTED_VARIANTS = ['tone=neutral', 'tone=brand', 'tone=success', 'tone=danger', 'tone=waiting'];

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ========================================================================
 * 0. 대상 확인
 * ====================================================================== */
const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
if (!chipSet) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: CHIP_SET_ID + ' 을 찾을 수 없음' });
}
if (chipSet.type !== 'COMPONENT_SET' || chipSet.name !== CHIP_SET_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: CHIP_SET_ID + ' 이 Chip 세트가 아님: type=' + chipSet.type + ', name=' + chipSet.name });
}

/* ========================================================================
 * 1. 아이콘 라이브러리 확인
 * ====================================================================== */
const allComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => !c.parent || c.parent.type !== 'COMPONENT_SET');
const iconComps = allComps.filter(c => c.name.indexOf('Icon / ') === 0);
const iconDot = iconComps.find(c => c.name === DEFAULT_ICON) || null;

const iconLibrary = iconComps.map(c => ({ name: c.name, id: c.id, hasKey: !!c.key,
                                          size: r2(c.width) + '×' + r2(c.height) }));

/* ========================================================================
 * 2. 현재 Chip 구조 읽기
 * ====================================================================== */
const variantReport = [];
for (const v of chipSet.children) {
  const leading = v.findOne(n => n.name === 'leading');
  const label = v.findOne(n => n.name === 'label');
  variantReport.push({
    variant: v.name,
    id: v.id,
    size: r2(v.width) + '×' + r2(v.height),
    height: r2(v.height),
    padding: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
    itemSpacing: r2(v.itemSpacing),
    cornerRadius: typeof v.cornerRadius === 'number' ? r2(v.cornerRadius) : 'mixed',
    childNames: v.children.map(c => c.name),
    leading: leading ? {
      exists: true, type: leading.type, size: r2(leading.width) + '×' + r2(leading.height),
      visible: leading.visible, index: v.children.indexOf(leading),
      isInstance: leading.type === 'INSTANCE'
    } : { exists: false },
    labelChars: label && 'characters' in label ? label.characters : null
  });
}

// 이미 적용되어 있는지
let existingProps = null;
try { existingProps = chipSet.componentPropertyDefinitions; } catch (e) { notes.push('componentPropertyDefinitions 읽기 실패: ' + e.message); }
const existingPropKey = existingProps ? Object.keys(existingProps).find(k => k.split('#')[0] === PROP_NAME) : null;
const alreadyInstance = variantReport.every(v => v.leading.exists && v.leading.isInstance);

/* ========================================================================
 * 3. 사전 조건
 * ====================================================================== */
const preflight = {
  chipSetFound: true,
  variantCount5: chipSet.children.length === 5,
  variantNamesMatch: EXPECTED_VARIANTS.every(n => chipSet.children.some(c => c.name === n)),
  iconLibraryFound: iconComps.length > 0,
  iconLibraryCount17: iconComps.length === 17,
  defaultIconFound: !!iconDot,
  defaultIconHasKey: !!(iconDot && iconDot.key),
  everyVariantHasLeading: variantReport.every(v => v.leading.exists),
  leadingsAreFrames: variantReport.every(v => v.leading.exists && v.leading.type === 'FRAME'),
  propertyNotYetAdded: !existingPropKey
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);

if (alreadyInstance && existingPropKey) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: '이미 적용된 상태 — leading 이 전부 인스턴스이고 속성도 존재한다. 중복 실행하지 않는다.',
    existingPropKey, variants: variantReport
  });
}
if (missing.length) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight, variants: variantReport, iconLibraryCount: iconComps.length
  });
}

/* ========================================================================
 * 4. DRY_RUN 보고
 * ====================================================================== */
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    preflight,
    target: { id: chipSet.id, name: chipSet.name, variantCount: chipSet.children.length },
    currentStructure: variantReport,
    iconLibraryCount: iconComps.length,
    iconLibrary,
    plan: {
      step1: "Chip 세트에 INSTANCE_SWAP 속성 '" + PROP_NAME + "' 추가 (기본값 " + DEFAULT_ICON + ")",
      step2: 'preferredValues 를 Icon 라이브러리 ' + iconComps.length + '종으로 제한',
      step3: 'variant 5개의 빈 leading FRAME 을 ' + DEFAULT_ICON + ' 인스턴스로 교체 (' + SLOT + '×' + SLOT + ', visible=false)',
      step4: '각 인스턴스에 componentPropertyReferences.mainComponent 연결',
      step5: '빈 FRAME 제거 (내용 없음)',
      order: '속성 추가를 가장 먼저 한다 — 실패 확률이 가장 높은 단계라 그 앞에서 멈추면 variant 가 안 바뀐다',
      atomicity: '원자적 작업이 아니다. 속성 추가 이후 단계도 실패할 수 있으므로 중간 실패 시 어디까지 바뀌었는지 결과에 남긴다.'
    },
    willNotChange: {
      variants: EXPECTED_VARIANTS,
      height: 24, padding: '4/8', gap: 4, radius: 'radius/full',
      labelAndTone: 'label 문자열과 tone 토큰은 건드리지 않는다'
    },
    slotSizeChange: '12×12 → ' + SLOT + '×' + SLOT + ' (숨김 상태라 외곽 크기에 영향 없음. 표시해도 label 16 과 같아 높이 24 유지)',
    indirectImpact: {
      masters: ['KPI Card', 'Application Card'],
      note: 'leading 이 기본 숨김이라 시각 변화는 없어야 한다. 다만 노드가 교체되므로 ' +
            '기존 visible 오버라이드가 초기화될 수 있다. Application Card 의 stage count 칩은 ' +
            'leading 을 켜 둔 상태였으므로 06b 에서 반드시 확인할 것.',
      verifyAfter: ['13b (Chip)', '05b (KPI Card, 높이 86)', '06b (Application Card, 높이 219)']
    },
    partialMutationPlan: {
      atomic: false,
      firstMutatingStep: 'createInstance — Figma 는 createInstance() 결과를 현재 페이지에 붙인다. 이 시점부터 문서가 바뀐다.',
      stepsInOrder: [
        '1. addComponentProperty (세트에 1회) — 여기서 실패하면 variant 는 그대로다',
        '2. findLeading (variant 별, 읽기)',
        '3. createInstance ← 페이지에 인스턴스가 생긴다 (실패 시 미아 노드 가능)',
        '4. insertChild ← variant 가 바뀐다',
        '5. resize / 6. setVisible / 7. propertyReference',
        '8. removeOldFrame ← 빈 FRAME 제거'
      ],
      trackedInApply: ['propertyCreated', 'variantsAttempted', 'variantsCompleted',
                       'modifiedVariantIds', 'strayInstanceIds', 'failedAt', 'failures', 'partialMutationDetected'],
      strayHandling: '3 과 4 사이에서 실패하면 variant 에 들어가지 못한 인스턴스가 페이지에 남는다. strayInstanceIds 로 보고하니 그 id 를 지우면 된다.',
      onFailure: 'Ctrl+Z 로 되돌린 뒤 failedAt.step 을 보고 원인을 확인한다. 화면 백업 1044:47 로는 마스터 수정을 되돌릴 수 없다.'
    },
    deletions: '각 variant 의 빈 leading FRAME 5개만 제거한다. 그 외 삭제 없음.',
    rollback: '마스터 수정이라 화면 백업 1044:47 로는 못 되돌린다. Ctrl+Z 또는 버전 기록 사용.',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 5. 수정 (APPLY)
 * ====================================================================== */

/* 5-1. 속성 추가 — 실패 가능 지점이므로 가장 먼저 */
let propKey = existingPropKey;
if (!propKey) {
  try {
    const preferred = iconComps
      .filter(c => !!c.key)
      .map(c => ({ type: 'COMPONENT', key: c.key }));
    propKey = chipSet.addComponentProperty(PROP_NAME, 'INSTANCE_SWAP', iconDot.key,
                                           { preferredValues: preferred });
    notes.push('INSTANCE_SWAP 속성 생성: ' + propKey + ' (preferredValues ' + preferred.length + '종)');
  } catch (e) {
    return out({
      scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
      reason: 'INSTANCE_SWAP 속성 추가 실패 — variant 는 아직 건드리지 않은 상태로 중단: ' + e.message,
      propertyCreated: false,
      variantsAttempted: 0,
      variantsCompleted: 0,
      modifiedVariantIds: [],
      failedAt: { step: 'addComponentProperty', variant: null, message: e.message },
      partialMutationDetected: false,
      hint: 'preferredValues 옵션이 지원되지 않으면 옵션 없이 재시도하도록 수정이 필요하다.',
      preflight
    });
  }
}

/* 5-2. variant 별 leading 교체 — 단계별로 어디까지 갔는지 기록한다 */
const applied = [];
const failures = [];
const modifiedVariantIds = [];   // variant 가 실제로 바뀐 것
const strayInstanceIds = [];     // 만들었지만 variant 에 넣지 못한 미아 인스턴스
let attempted = 0;

for (const v of chipSet.children) {
  attempted++;
  let step = 'start';
  let pendingInstanceId = null;
  try {
    step = 'findLeading';
    const oldLeading = v.findOne(n => n.name === 'leading');
    if (!oldLeading) { failures.push({ variant: v.name, id: v.id, step, message: 'leading 을 찾지 못함' }); continue; }
    if (oldLeading.type === 'INSTANCE') { notes.push(v.name + ': 이미 인스턴스 — 건너뜀'); continue; }

    step = 'createInstance';
    const idx = v.children.indexOf(oldLeading);
    const inst = iconDot.createInstance();   // Figma 는 이 인스턴스를 현재 페이지에 붙인다
    pendingInstanceId = inst.id;             // 아직 variant 안에 없다 → 실패 시 미아
    inst.name = 'leading';

    step = 'insertChild';
    v.insertChild(idx, inst);
    pendingInstanceId = null;                // variant 안으로 들어갔다
    modifiedVariantIds.push(v.id);

    step = 'resize';
    inst.resize(SLOT, SLOT);
    try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; }
    catch (e) { notes.push(v.name + ' 인스턴스 sizing 설정 실패: ' + e.message); }

    step = 'setVisible';
    inst.visible = false;

    step = 'propertyReference';
    try { inst.componentPropertyReferences = { mainComponent: propKey }; }
    catch (e) { failures.push({ variant: v.name, id: v.id, step, message: e.message }); }

    step = 'removeOldFrame';
    oldLeading.remove();          // 내용 없는 빈 프레임

    applied.push({
      variant: v.name,
      leadingType: inst.type,
      leadingSize: r2(inst.width) + '×' + r2(inst.height),
      leadingVisible: inst.visible,
      leadingIndex: v.children.indexOf(inst),
      propRef: inst.componentPropertyReferences ? inst.componentPropertyReferences.mainComponent : null,
      heightAfter: r2(v.height),
      paddingAfter: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft].map(r2).join('/'),
      itemSpacingAfter: r2(v.itemSpacing)
    });
  } catch (e) {
    if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
    failures.push({ variant: v.name, id: v.id, step, message: e.message });
  }
}
if (strayInstanceIds.length) {
  errors.push('variant 에 넣지 못한 미아 인스턴스 ' + strayInstanceIds.length + '개가 페이지에 남았다: ' + strayInstanceIds.join(', '));
}
for (const f2 of failures) errors.push(f2.variant + ' [' + f2.step + '] ' + f2.message);

/* 5-3. 검증 */
const heightsOk = applied.every(a => Math.abs(a.heightAfter - 24) < 0.5);
const slotsOk = applied.every(a => a.leadingSize === SLOT + '×' + SLOT);
const hiddenOk = applied.every(a => a.leadingVisible === false);
const instancesOk = applied.every(a => a.leadingType === 'INSTANCE');
const refsOk = applied.every(a => !!a.propRef);
const paddingOk = applied.every(a => a.paddingAfter === '4/8/4/8');
const gapOk = applied.every(a => Math.abs(a.itemSpacingAfter - 4) < 0.01);
const allFive = applied.length === chipSet.children.length;
const partialMutationDetected = (modifiedVariantIds.length > 0 && applied.length < attempted) || strayInstanceIds.length > 0;
if (partialMutationDetected) {
  errors.push('중간 실패 — ' + modifiedVariantIds.length + '개 variant 가 바뀐 상태로 멈췄다. Ctrl+Z 로 되돌린 뒤 원인을 확인할 것.');
}

if (!heightsOk) errors.push('높이 24 가 아닌 variant 있음');
if (!slotsOk) errors.push('leading 이 ' + SLOT + '×' + SLOT + ' 이 아닌 variant 있음');
if (!hiddenOk) errors.push('leading 이 기본 표시로 남은 variant 있음');
if (!instancesOk) errors.push('leading 이 인스턴스가 아닌 variant 있음');
if (!refsOk) errors.push('INSTANCE_SWAP 속성이 연결되지 않은 variant 있음');
if (!paddingOk) errors.push('padding 4/8 이 바뀐 variant 있음');
if (!gapOk) errors.push('gap 4 가 바뀐 variant 있음');
if (!allFive) errors.push('처리된 variant 가 ' + applied.length + '개로 5개가 아님');

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  chipSetId: chipSet.id,
  propertyKey: propKey,
  propertyCreated: !existingPropKey,
  variantsAttempted: attempted,
  variantsCompleted: applied.length,
  modifiedVariantIds,
  strayInstanceIds,
  failedAt: failures.length ? failures[0] : null,
  failures,
  partialMutationDetected,
  applied,
  heightsOk, slotsOk, hiddenOk, instancesOk, refsOk, paddingOk, gapOk, allFive,
  nextVerification: ['13b (Chip 자체)', '05b (KPI Card 높이 86)', '06b (Application Card 높이 219)'],
  watchFor: 'Application Card 의 stage count 칩 leading visible 오버라이드가 초기화됐을 수 있다 — 06b 에서 확인',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
