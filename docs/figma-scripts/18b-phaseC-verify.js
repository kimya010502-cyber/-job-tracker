/* ============================================================================
 * 줍줍 — 스크립트 18b
 * Phase C 검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing= 를 한 줄도 포함하지 않는다.
 *
 * 확인하는 것
 *   원본 1009:709 가 **존재하되 숨김** (삭제 금지 확인)
 *   새 Button 인스턴스가 정확히 1개, 숨긴 원본 **바로 앞**
 *   variant=primary · 라벨 "기록 추가" · leading = Icon / Plus · leading 노출 · 높이 36
 *   실제 폭·x·오른쪽 끝·간격을 **실측해서 기록**
 *   부모 1009:715 폭 976 유지 · 높이 실측 · overlap/overflow 없음
 *   중복 없음 · 페이지 미아 없음
 *
 * 폭은 숫자로 고정하지 않는다. 기록하고, 참고값과의 차이만 남긴다.
 * (Phase B 에서 예측이 16px 빗나갔지만 실측이 기준이고 레이아웃은 멀쩡했다)
 * ========================================================================== */

const SCRIPT_VERSION = '18b-v1-phaseC-verify';

const SRC_ID = '1009:709';
const PARENT_ID = '1009:715';
const PARENT_EXPECTED_WIDTH = 976;
const BUTTON_SET_ID = '1029:1997';
const EXPECTED_VARIANT = 'variant=primary';
const EXPECTED_LABEL = '기록 추가';
const EXPECTED_LEADING = 'Icon / Plus';
const CONTROL_HEIGHT = 36;
const TEXT_NODE_NAMES = ['label', 'placeholder', 'text'];

/* 참고값 — 통과 조건이 아니다 */
const REFERENCE = { width: 98, x: 878, spaceBetween: 385 };

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
    if (hit) return hit;
  }
  return collectDeep(root, c => c.type === 'TEXT', 6)[0] || null;
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
async function isButtonInstance(n) {
  if (!n || n.type !== 'INSTANCE') return false;
  const mc = await mainCompOf(n);
  return !!(mc && mc.parent && mc.parent.id === BUTTON_SET_ID);
}

/* ---------- 원본 ---------- */
const checks = {};
const src = await figma.getNodeByIdAsync(SRC_ID);
checks.originalStillExists = !!src;
if (!src) {
  errors.push('원본 ' + SRC_ID + ' 이 사라졌다 (삭제 금지 위반)');
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
               reason: '원본이 없어 검증을 진행할 수 없다', checks, errorCount: errors.length });
}
const original = { id: src.id, name: src.name, visible: src.visible,
                   size: r2(src.width) + '×' + r2(src.height), x: r2(src.x) };
checks.originalHidden = src.visible === false;

const parent = src.parent;
checks.parentFound = !!parent;
checks.parentIsExpected = !!parent && parent.id === PARENT_ID;
if (!parent) {
  errors.push('부모를 찾지 못했다');
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
               reason: '부모가 없어 검증을 진행할 수 없다', checks, original, errorCount: errors.length });
}

/* ---------- 새 인스턴스 ---------- */
const cs = kids(parent) || [];
const srcIdx = cs.indexOf(src);
const cand = srcIdx > 0 ? cs[srcIdx - 1] : null;
const isBtn = await isButtonInstance(cand);
checks.newInstanceExists = isBtn;
checks.newInstanceImmediatelyBeforeOriginal = isBtn;

const instance = {};
if (isBtn) {
  const inst = cand;
  instance.id = inst.id;
  instance.index = srcIdx - 1;
  instance.size = r2(inst.width) + '×' + r2(inst.height);
  instance.width = r2(inst.width);
  instance.height = r2(inst.height);
  instance.x = r2(inst.x);
  instance.rightEdge = r2(inst.x + inst.width);
  instance.visible = inst.visible;
  checks.newInstanceVisible = inst.visible === true;

  const mc = await mainCompOf(inst);
  instance.variant = mc ? mc.name : null;
  checks.variantIsPrimary = !!mc && mc.name === EXPECTED_VARIANT;

  const lt = findTextNode(inst, TEXT_NODE_NAMES);
  instance.label = lt ? lt.characters : null;
  checks.labelCorrect = !!lt && lt.characters === EXPECTED_LABEL;

  const lead = findByName(inst, 'leading');
  instance.leadingType = lead ? lead.type : null;
  instance.leadingVisible = lead ? lead.visible : null;
  checks.leadingVisible = !!lead && lead.visible === true;
  let lm = null;
  if (lead && lead.type === 'INSTANCE') { const m = await mainCompOf(lead); lm = m ? m.name : null; }
  instance.leadingIcon = lm;
  checks.leadingIconIsPlus = lm === EXPECTED_LEADING;

  checks.heightIsControlHeight = near(inst.height, CONTROL_HEIGHT);

  instance.referenceWidth = REFERENCE.width;
  instance.widthVsReference = r2(inst.width - REFERENCE.width);
  instance.referenceNote = '참고값이다. 폭은 실측이 기준이며 이 차이는 실패 조건이 아니다';
  if (Math.abs(instance.widthVsReference) > 1) {
    notes.push('실측 폭 ' + instance.width + ' 이 참고값 ' + REFERENCE.width + ' 과 ' +
               instance.widthVsReference + ' 만큼 다르다 (실패 아님)');
  }

  /* 중복 */
  let cnt = 0;
  for (const c of cs) if (await isButtonInstance(c)) cnt++;
  instance.buttonInstancesUnderParent = cnt;
  checks.exactlyOneButtonUnderParent = cnt === 1;
  checks.noDuplicate = cnt <= 1;
} else {
  errors.push('숨긴 원본 바로 앞에 Button 인스턴스가 없다');
}

/* ---------- 부모 배치 ---------- */
const inFlow = cs.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
const order = inFlow.slice().sort((a, b) => a.x - b.x);
const padL = r2(parent.paddingLeft || 0);
const padR = r2(parent.paddingRight || 0);
const tIdx = instance.id ? order.findIndex(c => c.id === instance.id) : -1;

const parentInfo = {
  id: parent.id, name: parent.name,
  width: r2(parent.width), height: r2(parent.height),
  layoutMode: 'layoutMode' in parent ? parent.layoutMode : null,
  primaryAxisAlignItems: parent.primaryAxisAlignItems,
  itemSpacing: r2(parent.itemSpacing || 0),
  paddingLeft: padL, paddingRight: padR,
  rightEdge: r2(parent.width - padR),
  expectedWidth: PARENT_EXPECTED_WIDTH,
  inFlowChildren: order.map(c => ({ id: c.id, name: c.name, x: r2(c.x), width: r2(c.width),
                                    rightEdge: r2(c.x + c.width) })),
  targetIndexInFlow: tIdx,
  leftSiblingId: tIdx > 0 ? order[tIdx - 1].id : null,
  leftSiblingRightEdge: tIdx > 0 ? r2(order[tIdx - 1].x + order[tIdx - 1].width) : null,
  actualSpaceBetween: tIdx > 0
    ? r2(order[tIdx].x - (order[tIdx - 1].x + order[tIdx - 1].width)) : null,
  spaceAfterTarget: (tIdx >= 0 && tIdx + 1 < order.length)
    ? r2(order[tIdx + 1].x - (order[tIdx].x + order[tIdx].width)) : null
};
parentInfo.referenceX = REFERENCE.x;
parentInfo.referenceSpaceBetween = REFERENCE.spaceBetween;
parentInfo.xVsReference = instance.x !== undefined ? r2(instance.x - REFERENCE.x) : null;
parentInfo.spaceBetweenVsReference = parentInfo.actualSpaceBetween !== null
  ? r2(parentInfo.actualSpaceBetween - REFERENCE.spaceBetween) : null;
parentInfo.referenceNote = 'x 와 간격도 참고값이다. 통과 조건은 겹침·넘침이 없는가 하나뿐이다';

checks.parentWidthUnchanged = near(parent.width, PARENT_EXPECTED_WIDTH);
checks.noOverflow = instance.rightEdge === undefined ? false
  : instance.rightEdge <= parentInfo.rightEdge + 0.5;
checks.noOverlapWithLeftSibling = parentInfo.actualSpaceBetween === null
  ? true : parentInfo.actualSpaceBetween >= 0;
checks.noOverlapWithRightSibling = parentInfo.spaceAfterTarget === null
  ? true : parentInfo.spaceAfterTarget >= 0;

if (!checks.parentWidthUnchanged) {
  notes.push('부모 폭이 ' + r2(parent.width) + ' 다. 기대값 ' + PARENT_EXPECTED_WIDTH +
             ' 과 다르다 — 누가 바꿨거나 기대값이 틀렸다. 확인이 필요하다.');
}

/* ---------- 페이지 미아 ---------- */
const pageStrays = [];
for (const c of figma.currentPage.children) {
  if (await isButtonInstance(c)) pageStrays.push({ id: c.id, name: c.name,
    size: r2(c.width) + '×' + r2(c.height) });
}
if (pageStrays.length) errors.push('페이지 최상위에 떠도는 Button 인스턴스 ' + pageStrays.length + '개');

/* ---------- 집계 ---------- */
const failed = Object.keys(checks).filter(k => checks[k] === false);
if (failed.length) errors.push('실패 항목: ' + failed.join(', '));

const successCriteria = {
  originalExistsAndHidden: checks.originalStillExists === true && checks.originalHidden === true,
  newInstanceExists: checks.newInstanceExists === true,
  newInstanceImmediatelyBeforeOriginal: checks.newInstanceImmediatelyBeforeOriginal === true,
  variantIsPrimary: checks.variantIsPrimary === true,
  labelCorrect: checks.labelCorrect === true,
  leadingIsPlusAndVisible: checks.leadingIconIsPlus === true && checks.leadingVisible === true,
  heightIsControlHeight: checks.heightIsControlHeight === true,
  exactlyOneButtonUnderParent: checks.exactlyOneButtonUnderParent === true,
  noDuplicate: checks.noDuplicate === true,
  parentWidthUnchanged: checks.parentWidthUnchanged === true,
  noOverflow: checks.noOverflow === true,
  noOverlap: checks.noOverlapWithLeftSibling === true && checks.noOverlapWithRightSibling === true,
  noPageStrays: pageStrays.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  original,
  instance,
  parent: parentInfo,
  measured: {
    newInstanceSize: instance.size, newInstanceWidth: instance.width,
    newInstanceHeight: instance.height, newInstanceX: instance.x,
    newInstanceRightEdge: instance.rightEdge,
    parentWidth: parentInfo.width, parentHeight: parentInfo.height,
    actualSpaceBetween: parentInfo.actualSpaceBetween
  },
  measurementNote: '폭·x·간격은 실측이 기준이다. REFERENCE 는 DRY_RUN 예측을 대조하기 위한 참고값이며 ' +
                   '통과 조건이 아니다.',
  checks,
  failedChecks: failed,
  pageStrays,
  successCriteria,
  successCriteriaMet,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
