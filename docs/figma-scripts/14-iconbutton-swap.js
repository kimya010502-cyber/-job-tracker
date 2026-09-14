/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 14
 * 아이콘 시스템 5단계) Icon Button 구조 수정 + Application Card 의 link/more 아이콘 지정
 *
 * 대상 (둘 다 **기존 마스터를 수정한다. 삭제·재생성하지 않는다**)
 *   Icon Button      1037:2091  (단일 COMPONENT)
 *   Application Card 1037:2163  (COMPONENT_SET, variant 2)
 *
 * 하는 일
 *   1) Icon Button 에 INSTANCE_SWAP 속성 `icon` 추가 (기본값 = Icon / More)
 *   2) padding 6 → 4
 *   3) 빈 icon FRAME 12×12 → Icon / More 인스턴스 16×16, visible = true
 *   4) Application Card 의 중첩 Icon Button 인스턴스 4개(variant 2 × 버튼 2)에 아이콘 지정
 *        link → Icon / External Link      more → Icon / More
 *
 * 실행 순서를 이렇게 잡은 이유
 *   - 속성 추가가 실패 확률이 가장 높아 **가장 먼저** 한다 (여기서 멈추면 나머지는 그대로)
 *   - padding 을 슬롯 교체보다 **먼저** 바꾼다. 순서를 뒤집으면 padding 6 + 아이콘 16 = 28 이 되어
 *     24 고정 프레임을 잠시 넘긴다. 먼저 4 로 줄이면 12→16 어느 시점에도 24 를 넘지 않는다.
 *   - 카드 지정은 속성이 존재해야 가능하므로 마지막
 *
 *   다만 **원자적 작업이 아니다.** 각 단계가 개별적으로 실패할 수 있으므로
 *   어디까지 바뀌었는지 결과에 남긴다.
 *
 * INSTANCE_SWAP 값 형식에 대하여
 *   속성 **정의**의 defaultValue 가 노드 id 라는 것은 공식 문서 예시로 확인했다.
 *   그러나 인스턴스에 값을 **넣을 때**(setProperties) 노드 id 인지 컴포넌트 key 인지는
 *   문서에 나와 있지 않다. 그래서 단정하지 않고:
 *     노드 id 로 시도 → 실제로 바뀌었는지 **읽어서 확인** → 아니면 key 로 재시도 → 다시 확인
 *   어느 형식이 통했는지 iconSwapValueForm 에 기록한다.
 *   setProperties 는 조용히 무시될 수 있으므로 예외 유무가 아니라 **결과를 읽어** 판정한다.
 *
 * 바뀌지 않아야 하는 것
 *   Icon Button 외곽 24×24 · radius 4 · ghost(fill·stroke 없음) · 기타 토큰
 *   Application Card 높이 219 · spacing · direct 인스턴스 구성 7개
 *
 * 건드리지 않는 것
 *   Chip · KPI Card · Button · Input · Select · NavItem · Pagination Item
 *
 * 실행법
 *   1) DRY_RUN = true  → 현재 구조와 계획만 출력
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *   3) 직후 14b(Icon Button) → 06b-v4(Application Card) 순으로 읽기 전용 재검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '14-v1-iconbutton-swap';

const IB_ID = '1037:2091';
const IB_NAME = 'Icon Button';
const AC_SET_ID = '1037:2163';
const AC_SET_NAME = 'Application Card';

const PROP_NAME = 'icon';
const DEFAULT_ICON = 'Icon / More';
const LINK_ICON = 'Icon / External Link';
const SLOT = 16;
const NEW_PADDING = 4;
const OLD_PADDING = 6;
const OUTER = 24;

// 카드 안 버튼 이름 → 지정할 아이콘
const BUTTON_ICON = { link: LINK_ICON, more: DEFAULT_ICON };

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
const ib = await figma.getNodeByIdAsync(IB_ID);
if (!ib) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
                      reason: IB_ID + ' 을 찾을 수 없음' });
if (ib.type !== 'COMPONENT' || ib.name !== IB_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: IB_ID + ' 이 Icon Button 이 아님: type=' + ib.type + ', name=' + ib.name });
}
const acSet = await figma.getNodeByIdAsync(AC_SET_ID);
if (!acSet || acSet.type !== 'COMPONENT_SET' || acSet.name !== AC_SET_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: AC_SET_ID + ' 이 Application Card 세트가 아님' });
}

/* ========================================================================
 * 1. 아이콘 라이브러리
 * ====================================================================== */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const iconByName = {};
for (const c of iconComps) iconByName[c.name] = c;
const iconMore = iconByName[DEFAULT_ICON] || null;
const iconLink = iconByName[LINK_ICON] || null;

/* ========================================================================
 * 2. 현재 구조 읽기
 * ====================================================================== */
const ibSlot = ib.children.filter(c => c.name === PROP_NAME);
const ibCurrent = {
  id: ib.id, name: ib.name,
  size: r2(ib.width) + '×' + r2(ib.height),
  padding: [ib.paddingTop, ib.paddingRight, ib.paddingBottom, ib.paddingLeft].map(r2).join('/'),
  cornerRadius: typeof ib.cornerRadius === 'number' ? r2(ib.cornerRadius) : 'mixed',
  fillCount: Array.isArray(ib.fills) ? ib.fills.length : null,
  strokeCount: Array.isArray(ib.strokes) ? ib.strokes.length : null,
  childNames: ib.children.map(c => c.name),
  slotCount: ibSlot.length,
  slot: ibSlot.length ? {
    type: ibSlot[0].type, size: r2(ibSlot[0].width) + '×' + r2(ibSlot[0].height),
    visible: ibSlot[0].visible, index: ib.children.indexOf(ibSlot[0])
  } : null
};

let ibProps = null;
try { ibProps = ib.componentPropertyDefinitions; } catch (e) { notes.push('Icon Button 속성 정의 읽기 실패: ' + e.message); }
const existingPropKey = ibProps ? Object.keys(ibProps).find(k => k.split('#')[0] === PROP_NAME) : null;

// Application Card 안의 Icon Button 인스턴스
const cardReport = [];
for (const v of acSet.children) {
  const found = {};
  for (const nm of Object.keys(BUTTON_ICON)) {
    const nodes = v.findAll(n => n.type === 'INSTANCE' && n.name === nm);
    let mainName = null;
    if (nodes.length === 1) {
      let mc = null;
      try { mc = await nodes[0].getMainComponentAsync(); }
      catch (e) { try { mc = nodes[0].mainComponent; } catch (e2) { /* 무시 */ } }
      mainName = mc ? mc.name : null;
    }
    found[nm] = { count: nodes.length, id: nodes[0] ? nodes[0].id : null, mainComponent: mainName,
                  targetIcon: BUTTON_ICON[nm] };
  }
  cardReport.push({ variant: v.name, id: v.id, height: r2(v.height), buttons: found });
}

/* ========================================================================
 * 3. 사전 조건
 * ====================================================================== */
const preflight = {
  iconButtonFound: true,
  iconButtonIsComponent: ib.type === 'COMPONENT',
  outerIs24: Math.abs(ib.width - OUTER) < 0.5 && Math.abs(ib.height - OUTER) < 0.5,
  paddingIs6: ibCurrent.padding === [OLD_PADDING, OLD_PADDING, OLD_PADDING, OLD_PADDING].join('/'),
  exactlyOneIconSlot: ibSlot.length === 1,
  slotIsFrame12: !!ibSlot[0] && ibSlot[0].type === 'FRAME' &&
                 Math.abs(ibSlot[0].width - 12) < 0.5 && Math.abs(ibSlot[0].height - 12) < 0.5,
  iconMoreFound: !!iconMore,
  iconExternalLinkFound: !!iconLink,
  iconMoreIs16: !!iconMore && Math.abs(iconMore.width - SLOT) < 0.5 && Math.abs(iconMore.height - SLOT) < 0.5,
  iconLinkIs16: !!iconLink && Math.abs(iconLink.width - SLOT) < 0.5 && Math.abs(iconLink.height - SLOT) < 0.5,
  iconLibraryCount17: iconComps.length === 17,
  appCardSetFound: true,
  appCardTwoVariants: acSet.children.length === 2,
  everyVariantHasLinkAndMore: cardReport.every(c => c.buttons.link.count === 1 && c.buttons.more.count === 1),
  iconPropertyNotYetAdded: !existingPropKey
};
const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: '사전 조건 누락: ' + missing.join(', '),
    preflight, iconButton: ibCurrent, applicationCard: cardReport,
    iconLibraryCount: iconComps.length
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
    iconButtonCurrent: ibCurrent,
    applicationCardCurrent: cardReport,
    iconLibraryCount: iconComps.length,
    iconsWithKeyCount: iconComps.filter(c => !!c.key).length,
    defaultIconNodeId: iconMore.id,
    linkIconNodeId: iconLink.id,
    plan: {
      step1: 'Icon Button 에 INSTANCE_SWAP 속성 ' + PROP_NAME + ' 추가 (defaultValue = ' + iconMore.id +
             ' [노드 id], preferredValues = Icon ' + iconComps.length + '종 [key])',
      step2: 'padding ' + OLD_PADDING + ' → ' + NEW_PADDING + ' (슬롯 교체보다 먼저 — 6 + 16 = 28 로 24 를 넘기는 순간을 피한다)',
      step3: '빈 icon FRAME 12×12 → ' + DEFAULT_ICON + ' 인스턴스 ' + SLOT + '×' + SLOT + ', visible = true',
      step4: 'Application Card variant 2개의 link / more 버튼에 아이콘 지정 (link → ' + LINK_ICON + ', more → ' + DEFAULT_ICON + ')',
      valueFormat: 'setProperties 의 INSTANCE_SWAP 값 형식은 문서에 없다. 노드 id 로 시도 후 결과를 읽어 확인하고, ' +
                   '아니면 key 로 재시도한다. 통한 형식은 iconSwapValueForm 에 남긴다.'
    },
    geometry: {
      before: 'padding ' + OLD_PADDING + ' + 슬롯 12 + ' + OLD_PADDING + ' = 24',
      after: 'padding ' + NEW_PADDING + ' + 아이콘 ' + SLOT + ' + ' + NEW_PADDING + ' = ' + OUTER,
      outerUnchanged: true,
      note: '외곽 24×24 와 글리프 시각 크기는 그대로다. padding 변경은 의도된 변경으로 검증에 기록한다.'
    },
    partialMutationPlan: {
      atomic: false,
      firstMutatingStep: 'addComponentProperty — Icon Button 에 속성이 추가되는 시점부터 문서가 변경된다',
      stepsInOrder: [
        '1. addComponentProperty (Icon Button) ← 첫 mutation',
        '2. padding 4 로 변경 (Icon Button)',
        '3. createInstance ← 페이지에 인스턴스가 생긴다 (실패 시 미아 가능) → insertChild → 빈 FRAME 제거',
        '4. Application Card 의 버튼 4개에 setProperties (variant 2 × 버튼 2)'
      ],
      partialStates: [
        'propertyCreated=true / iconSlotReplaced=false → 속성만 추가됨 (propertyOnly)',
        'iconSlotReplaced=true / cardAssignmentsCompleted<4 → 마스터는 바뀌고 카드 지정이 덜 됨 (someCards)',
        'strayInstanceIds.length>0 → 미아 인스턴스 존재 (strayInstances)'
      ],
      onFailure: 'Ctrl+Z 로 되돌린 뒤 failedAt.step 을 확인한다. 화면 백업 1044:47 로는 마스터 수정을 되돌릴 수 없다.'
    },
    willNotChange: {
      iconButton: ['외곽 ' + OUTER + '×' + OUTER, 'radius 4', 'ghost(fill·stroke 없음)'],
      applicationCard: ['높이 219', 'spacing', 'direct 인스턴스 7개'],
      untouchedMasters: ['Chip', 'KPI Card', 'Button', 'Input', 'Select', 'NavItem', 'Pagination Item']
    },
    successCriteria: 'link 와 more 가 서로 다른 아이콘이어야 한다. 둘 다 ' + DEFAULT_ICON + ' 이면 실패다.',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 5. 수정 (APPLY)
 * ====================================================================== */
let propKey = existingPropKey;
let propertyCreationStrategy = existingPropKey ? '기존 속성 재사용' : null;
let attemptA = null;
let iconSlotReplaced = false;
let paddingUpdated = false;
const strayInstanceIds = [];
let failedAt = null;
const failures = [];

/* 5-1. 속성 추가 — 실패 확률이 가장 높은 단계 */
if (!propKey) {
  const preferred = iconComps.filter(c => !!c.key).map(c => ({ type: 'COMPONENT', key: c.key }));
  try {
    try {
      propKey = ib.addComponentProperty(PROP_NAME, 'INSTANCE_SWAP', iconMore.id, { preferredValues: preferred });
      propertyCreationStrategy = 'nodeId + preferredValues';
    } catch (eA) {
      attemptA = eA.message;
      propKey = ib.addComponentProperty(PROP_NAME, 'INSTANCE_SWAP', iconMore.id);
      propertyCreationStrategy = 'nodeId only (preferredValues 거부됨)';
      notes.push('preferredValues 거부: ' + eA.message);
    }
  } catch (e) {
    return out({
      scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
      reason: 'INSTANCE_SWAP 속성 추가 실패 — 아직 아무 구조도 바꾸지 않은 상태로 중단',
      diagnosis: { withPreferredValues: attemptA, withoutPreferredValues: e.message,
                   defaultValuePassed: iconMore.id, defaultValueKind: '노드 id' },
      propertyCreated: false, iconSlotReplaced: false, paddingUpdated: false,
      cardAssignmentsAttempted: 0, cardAssignmentsCompleted: 0,
      strayInstanceIds: [], failedAt: { step: 'addComponentProperty', message: e.message },
      partialMutationKind: [], partialMutationDetected: false
    });
  }
}

/* 5-2. padding 먼저 (6 + 16 = 28 로 24 를 넘기는 순간을 피한다) */
try {
  ib.paddingTop = NEW_PADDING; ib.paddingBottom = NEW_PADDING;
  ib.paddingLeft = NEW_PADDING; ib.paddingRight = NEW_PADDING;
  const V = {};
  for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
  if (V['space/4']) {
    for (const f of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) {
      try { ib.setBoundVariable(f, V['space/4']); } catch (e) { notes.push('padding 변수 바인딩 실패(' + f + '): ' + e.message); }
    }
  }
  paddingUpdated = true;
} catch (e) {
  failures.push({ step: 'padding', message: e.message });
}

/* 5-3. 슬롯 교체 */
let pendingInstanceId = null;
try {
  const oldSlot = ib.children.find(c => c.name === PROP_NAME);
  if (!oldSlot) throw new Error('icon 슬롯을 찾지 못함');
  if (oldSlot.type === 'INSTANCE') {
    notes.push('icon 슬롯이 이미 인스턴스 — 건너뜀');
    iconSlotReplaced = true;
  } else {
    const idx = ib.children.indexOf(oldSlot);
    const inst = iconMore.createInstance();
    pendingInstanceId = inst.id;
    inst.name = PROP_NAME;
    ib.insertChild(idx, inst);
    pendingInstanceId = null;
    inst.resize(SLOT, SLOT);
    try { inst.layoutSizingHorizontal = 'FIXED'; inst.layoutSizingVertical = 'FIXED'; }
    catch (e) { notes.push('아이콘 인스턴스 sizing 설정 실패: ' + e.message); }
    inst.visible = true;
    try { inst.componentPropertyReferences = { mainComponent: propKey }; }
    catch (e) { failures.push({ step: 'propertyReference', message: e.message }); }
    oldSlot.remove();
    iconSlotReplaced = true;
  }
} catch (e) {
  if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
  failures.push({ step: 'iconSlot', message: e.message });
}

/* 5-4. Application Card 의 link / more 지정 */
async function nestedIconName(btn) {
  try {
    const inner = btn.findAll(n => n.type === 'INSTANCE');
    if (!inner.length) return null;
    let mc = null;
    try { mc = await inner[0].getMainComponentAsync(); }
    catch (e) { try { mc = inner[0].mainComponent; } catch (e2) { /* 무시 */ } }
    return mc ? mc.name : null;
  } catch (e) { return null; }
}

const assignments = [];
let assignAttempted = 0, assignCompleted = 0;
let iconSwapValueForm = null;

if (iconSlotReplaced && propKey) {
  for (const v of acSet.children) {
    for (const nm of Object.keys(BUTTON_ICON)) {
      assignAttempted++;
      const targetName = BUTTON_ICON[nm];
      const target = iconByName[targetName];
      const rec = { variant: v.name, button: nm, target: targetName, before: null, after: null, form: null, ok: false };
      try {
        const btn = v.findAll(n => n.type === 'INSTANCE' && n.name === nm)[0];
        if (!btn) throw new Error(nm + ' 버튼을 찾지 못함');
        rec.before = await nestedIconName(btn);

        // 노드 id 로 먼저 시도하고, 결과를 읽어서 판정한다 (setProperties 는 조용히 무시될 수 있다)
        let ok = false;
        try { btn.setProperties({ [propKey]: target.id }); } catch (e) { rec.idError = e.message; }
        rec.after = await nestedIconName(btn);
        if (rec.after === targetName) { ok = true; rec.form = 'node id'; }

        if (!ok && target.key) {
          try { btn.setProperties({ [propKey]: target.key }); } catch (e) { rec.keyError = e.message; }
          rec.after = await nestedIconName(btn);
          if (rec.after === targetName) { ok = true; rec.form = 'component key'; }
        }

        rec.ok = ok;
        if (ok) { assignCompleted++; if (!iconSwapValueForm) iconSwapValueForm = rec.form; }
        else failures.push({ step: 'assign:' + v.name + '/' + nm, message: '지정 후에도 아이콘이 ' + rec.after + ' 로 남음' });
      } catch (e) {
        failures.push({ step: 'assign:' + v.name + '/' + nm, message: e.message });
      }
      assignments.push(rec);
    }
  }
} else {
  notes.push('슬롯 교체 또는 속성 생성이 끝나지 않아 카드 지정을 건너뛰었다');
}

/* 5-5. 판정 */
for (const f of failures) errors.push('[' + f.step + '] ' + f.message);
if (failures.length) failedAt = failures[0];

const propertyCreatedThisRun = !existingPropKey;
const partialMutationKind = [];
if (propertyCreatedThisRun && !iconSlotReplaced) partialMutationKind.push('propertyOnly');
if (iconSlotReplaced && assignCompleted < assignAttempted) partialMutationKind.push('someCards');
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');
if (paddingUpdated && !iconSlotReplaced) partialMutationKind.push('paddingOnly');
const partialMutationDetected = partialMutationKind.length > 0;

const slotNow = ib.children.find(c => c.name === PROP_NAME) || null;
const ibAfter = {
  size: r2(ib.width) + '×' + r2(ib.height),
  padding: [ib.paddingTop, ib.paddingRight, ib.paddingBottom, ib.paddingLeft].map(r2).join('/'),
  cornerRadius: typeof ib.cornerRadius === 'number' ? r2(ib.cornerRadius) : 'mixed',
  fillCount: Array.isArray(ib.fills) ? ib.fills.length : null,
  strokeCount: Array.isArray(ib.strokes) ? ib.strokes.length : null,
  slotType: slotNow ? slotNow.type : null,
  slotSize: slotNow ? r2(slotNow.width) + '×' + r2(slotNow.height) : null,
  slotVisible: slotNow ? slotNow.visible : null
};

const outerUnchanged = Math.abs(ib.width - OUTER) < 0.5 && Math.abs(ib.height - OUTER) < 0.5;
const linkAndMoreDiffer = acSet.children.every(v => {
  const a = assignments.filter(x => x.variant === v.name);
  const link = a.find(x => x.button === 'link');
  const more = a.find(x => x.button === 'more');
  return link && more && link.after && more.after && link.after !== more.after;
});

if (!outerUnchanged) errors.push('Icon Button 외곽이 ' + OUTER + '×' + OUTER + ' 에서 벗어남: ' + ibAfter.size);
if (!linkAndMoreDiffer) errors.push('link 와 more 가 같은 아이콘이다 — 이번 단계의 핵심 목표 실패');
if (assignCompleted !== assignAttempted) errors.push('카드 아이콘 지정 ' + assignCompleted + '/' + assignAttempted + ' 만 완료');

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  propertyCreated: propertyCreatedThisRun,
  propertyKey: propKey,
  propertyCreationStrategy,
  propertyAttemptAError: attemptA,
  paddingUpdated,
  iconSlotReplaced,
  iconButtonBefore: ibCurrent,
  iconButtonAfter: ibAfter,
  outerUnchanged,
  cardAssignmentsAttempted: assignAttempted,
  cardAssignmentsCompleted: assignCompleted,
  assignments,
  iconSwapValueForm,
  linkAndMoreDiffer,
  strayInstanceIds,
  failedAt,
  failures,
  partialMutationKind,
  partialMutationDetected,
  nextVerification: ['14b (Icon Button)', '06b-v4 (Application Card, 높이 219)'],
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
