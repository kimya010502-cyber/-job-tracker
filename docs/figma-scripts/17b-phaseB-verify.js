/* ============================================================================
 * 줍줍 — 스크립트 17b
 * Phase B 검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing = 를 한 줄도 포함하지 않는다.
 *
 * 확인하는 것
 *   새 인스턴스 6개가 각각 정확히 1개
 *   기존 본체 6개는 **존재하되 숨김** (삭제 금지 확인)
 *   기존 accessory 5개도 **존재하되 숨김**
 *   Input   state=default · 라벨 · Icon / Search 노출 · 240×36
 *   Select  state=default · 라벨 · 내부 chevron 존재 · 실측 크기 기록
 *   Reset   variant=ghost · 라벨 "초기화" · Icon / Reset 노출 · wrapper 1003:1728 유지
 *   Input wrapper 1003:1696  가로 sizing = HUG · 폭 ≈ 240
 *   툴바 폭 976 유지 · overflow 없음 · 실제 점유폭/여유폭/높이 기록
 *   중복 없음 · 되살아난 accessory 없음 · 페이지 미아 없음
 * ========================================================================== */

const SCRIPT_VERSION = '17b-v2-phaseB-verify';

/* 참고용 예상치 — **통과 조건이 아니다.** 실측을 기록하고 이 값과 얼마나 다른지만 보여준다.
 * 폭을 특정 숫자로 고정하면 마스터가 조금만 바뀌어도 멀쩡한 결과가 실패로 나온다. */
const REFERENCE_WIDTHS = {
  input: 240,        // Input 마스터 고정 폭이라 이것만 통과 조건이다
  reset: 66,         // ghost 62 − 마스터 라벨 54 + 라벨 38 + (아이콘 16 + gap 4)
  resetWrapper: 70   // 위 + wrapper 좌측 padding 4
};
const CONTROL_HEIGHT = 36;

const TOOLBAR_ID = '1003:1695';
const TOOLBAR_EXPECTED_WIDTH = 976;
const INPUT_WRAPPER_ID = '1003:1696';
const RESET_WRAPPER_ID = '1003:1728';

const TARGETS = [
  { key: 'input', role: 'Input', srcId: '1003:1697', setId: '1030:2017',
    variant: 'state=default', label: '기업명, 직무 검색',
    textNodeNames: ['placeholder', 'label'],
    leadingIcon: 'Icon / Search', leadingVisible: true,
    expectedSize: '240×36', accessories: ['1003:1700'] },

  { key: 'select1', role: 'Select', srcId: '1003:1705', setId: '1030:2007',
    variant: 'state=default', label: '지원 상태: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    expectedSize: null, accessories: ['1003:1708'] },

  { key: 'select2', role: 'Select', srcId: '1003:1711', setId: '1030:2007',
    variant: 'state=default', label: '전형 상태: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    expectedSize: null, accessories: ['1003:1714'] },

  { key: 'select3', role: 'Select', srcId: '1003:1717', setId: '1030:2007',
    variant: 'state=default', label: '현재 단계: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    expectedSize: null, accessories: ['1003:1720'] },

  { key: 'select4', role: 'Select', srcId: '1003:1723', setId: '1030:2007',
    variant: 'state=default', label: '포지션: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    expectedSize: null, accessories: ['1003:1726'] },

  { key: 'reset', role: 'Button', srcId: '1003:1729', setId: '1029:1997',
    variant: 'variant=ghost', label: '초기화',
    textNodeNames: ['label'],
    leadingIcon: 'Icon / Reset', leadingVisible: true,
    expectedSize: null, accessories: [] }
];

const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];

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
async function isInstanceOfSet(n, setId) {
  if (!n || n.type !== 'INSTANCE') return false;
  const mc = await mainCompOf(n);
  return !!(mc && mc.parent && mc.parent.id === setId);
}

/* ---------- 대상별 ---------- */
const rows = [];
for (const t of TARGETS) {
  const row = { key: t.key, role: t.role, srcId: t.srcId, checks: {} };
  const src = await figma.getNodeByIdAsync(t.srcId);

  row.checks.originalStillExists = !!src;
  if (!src) { errors.push(t.key + ' 원본이 사라졌다 (삭제 금지 위반)'); rows.push(row); continue; }
  row.originalVisible = src.visible;
  row.checks.originalHidden = src.visible === false;

  const parent = src.parent;
  row.parentId = parent ? parent.id : null;
  row.parentName = parent ? parent.name : null;
  if (!parent) { errors.push(t.key + ' 부모를 찾지 못했다'); rows.push(row); continue; }

  const cs = kids(parent) || [];
  const srcIdx = cs.indexOf(src);
  row.originalIndex = srcIdx;
  const cand = srcIdx > 0 ? cs[srcIdx - 1] : null;
  const isNew = await isInstanceOfSet(cand, t.setId);
  row.checks.newInstanceExists = isNew;
  row.checks.newInstanceImmediatelyBeforeOriginal = isNew;

  if (isNew) {
    const inst = cand;
    row.newInstanceId = inst.id;
    row.newInstanceIndex = srcIdx - 1;
    row.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
    row.newInstanceWidth = r2(inst.width);
    row.newInstanceHeight = r2(inst.height);
    row.checks.newInstanceVisible = inst.visible === true;

    const mc = await mainCompOf(inst);
    row.variantName = mc ? mc.name : null;
    row.checks.variantCorrect = !!mc && mc.name === t.variant;

    const lt = findTextNode(inst, t.textNodeNames);
    row.labelText = lt ? lt.characters : null;
    row.checks.labelCorrect = !!lt && lt.characters === t.label;

    if (t.leadingIcon) {
      const lead = findByName(inst, 'leading');
      row.leadingType = lead ? lead.type : null;
      row.leadingVisible = lead ? lead.visible : null;
      row.checks.leadingVisible = !!lead && lead.visible === t.leadingVisible;
      let lm = null;
      if (lead && lead.type === 'INSTANCE') { const m = await mainCompOf(lead); lm = m ? m.name : null; }
      row.leadingIcon = lm;
      row.checks.leadingIconCorrect = lm === t.leadingIcon;
    } else {
      /* Select 는 chevron 이 마스터 안에 직접 그려져 있다 — swap 이 아니라 존재만 확인한다 */
      const byName = collectDeep(inst, c => /chevron/i.test(c.name), 5);
      const shapes = collectDeep(inst, c => SHAPE_TYPES.indexOf(c.type) >= 0, 5);
      row.chevronByName = byName.map(c => c.id);
      row.shapeDescendants = shapes.map(c => ({ id: c.id, type: c.type,
                                                size: r2(c.width) + '×' + r2(c.height) }));
      row.checks.chevronPresent = byName.length > 0 || shapes.length > 0;
      row.chevronFoundBy = byName.length ? 'name' : (shapes.length ? 'shape descendant' : null);
    }

    if (t.expectedSize) {
      row.expectedSize = t.expectedSize;
      row.checks.sizeAsExpected = row.newInstanceSize === t.expectedSize;
    }
    row.checks.heightIs36 = near(inst.height, CONTROL_HEIGHT);

    /* 부모 크기 — 세로 HUG 인 부모는 새 컨트롤 높이를 따라와야 한다 */
    let psH = null, psV = null;
    try { psH = parent.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
    try { psV = parent.layoutSizingVertical; } catch (e) { /* 무시 */ }
    row.parentSize = r2(parent.width) + '×' + r2(parent.height);
    row.parentWidth = r2(parent.width);
    row.parentHeight = r2(parent.height);
    row.parentSizingHorizontal = psH;
    row.parentSizingVertical = psV;
    if (psV === 'HUG') {
      row.checks.parentHeightFollowsControl = near(parent.height, inst.height);
      row.parentHeightNote = '세로 HUG 이므로 부모 높이는 새 컨트롤 높이와 같아야 한다';
    } else {
      row.parentHeightNote = '세로가 고정이라 부모 높이는 기록만 한다';
    }
    if (REFERENCE_WIDTHS[t.key] !== undefined) {
      row.referenceWidth = REFERENCE_WIDTHS[t.key];
      row.widthVsReference = r2(inst.width - REFERENCE_WIDTHS[t.key]);
      row.referenceNote = t.key === 'input'
        ? '마스터 고정 폭이라 이 값은 통과 조건이다'
        : '참고값이다. 다르면 notes 에 남길 뿐 실패로 보지 않는다';
      if (t.key !== 'input' && Math.abs(row.widthVsReference) > 1) {
        notes.push(t.key + ' 실측 폭 ' + r2(inst.width) + ' 이 참고값 ' +
          REFERENCE_WIDTHS[t.key] + ' 과 ' + row.widthVsReference + ' 만큼 다르다 (실패 아님)');
      }
    }
  } else {
    errors.push(t.key + ' 숨긴 원본 바로 앞에 새 인스턴스가 없다');
  }

  /* 중복: 같은 부모 직계에 이 세트의 인스턴스가 정확히 1개 */
  let cnt = 0;
  for (const c of cs) if (await isInstanceOfSet(c, t.setId)) cnt++;
  row.instancesUnderParent = cnt;
  row.checks.exactlyOneInstanceUnderParent = cnt === 1;
  row.checks.noDuplicateUnderParent = cnt <= 1;

  /* accessory */
  row.accessories = [];
  for (const aid of t.accessories) {
    const a = await figma.getNodeByIdAsync(aid);
    row.accessories.push({ id: aid, exists: !!a, visible: a ? a.visible : null,
                           size: a ? r2(a.width) + '×' + r2(a.height) : null });
    if (!a) errors.push(t.key + ' accessory ' + aid + ' 가 사라졌다 (삭제 금지 위반)');
  }
  row.checks.accessoriesStillExist = row.accessories.every(a => a.exists);
  row.checks.accessoriesHidden = row.accessories.every(a => a.visible === false);

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(t.key + ' 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;
  rows.push(row);
}

/* ---------- Input wrapper ---------- */
const iw = await figma.getNodeByIdAsync(INPUT_WRAPPER_ID);
const inputWrapperCheck = { id: INPUT_WRAPPER_ID, exists: !!iw, checks: {} };
if (iw) {
  let sz = null;
  try { sz = iw.layoutSizingHorizontal; } catch (e) { sz = '(읽기 실패)'; }
  inputWrapperCheck.layoutSizingHorizontal = sz;
  inputWrapperCheck.width = r2(iw.width);
  inputWrapperCheck.height = r2(iw.height);
  inputWrapperCheck.checks.sizingIsHug = sz === 'HUG';
  const inputRow = rows.filter(r => r.key === 'input')[0];
  const expect = inputRow && inputRow.newInstanceWidth !== undefined ? inputRow.newInstanceWidth : 240;
  inputWrapperCheck.expectedWidth = expect;
  inputWrapperCheck.checks.widthMatchesNewInput = near(iw.width, expect);
  inputWrapperCheck.note = 'wrapper 폭은 새 Input 실측 폭과 같아야 한다 (HUG 이고 in-flow 자식이 그것 하나뿐)';
  const failed = Object.keys(inputWrapperCheck.checks).filter(k => !inputWrapperCheck.checks[k]);
  if (failed.length) errors.push('Input wrapper 실패 항목: ' + failed.join(', '));
  inputWrapperCheck.failedChecks = failed;
} else {
  errors.push('Input wrapper ' + INPUT_WRAPPER_ID + ' 를 찾지 못했다');
}

/* ---------- Reset wrapper 는 유지 ---------- */
const rw = await figma.getNodeByIdAsync(RESET_WRAPPER_ID);
const resetWrapperCheck = { id: RESET_WRAPPER_ID, exists: !!rw, checks: {} };
if (rw) {
  resetWrapperCheck.visible = rw.visible;
  resetWrapperCheck.size = r2(rw.width) + '×' + r2(rw.height);
  resetWrapperCheck.padding = 'paddingTop' in rw
    ? [rw.paddingTop, rw.paddingRight, rw.paddingBottom, rw.paddingLeft].map(r2).join('/') : null;
  resetWrapperCheck.width = r2(rw.width);
  resetWrapperCheck.height = r2(rw.height);
  resetWrapperCheck.referenceWidth = REFERENCE_WIDTHS.resetWrapper;
  resetWrapperCheck.widthVsReference = r2(rw.width - REFERENCE_WIDTHS.resetWrapper);
  resetWrapperCheck.referenceNote = '참고값이다. 통과 조건은 wrapper 가 남아 있고 보이는가 하나뿐이다';
  resetWrapperCheck.checks.stillVisible = rw.visible === true;
  if (Math.abs(resetWrapperCheck.widthVsReference) > 1) {
    notes.push('Reset wrapper 실측 폭 ' + r2(rw.width) + ' 이 참고값 ' +
      REFERENCE_WIDTHS.resetWrapper + ' 과 ' + resetWrapperCheck.widthVsReference + ' 만큼 다르다 (실패 아님)');
  }
  const failed = Object.keys(resetWrapperCheck.checks).filter(k => !resetWrapperCheck.checks[k]);
  if (failed.length) errors.push('Reset wrapper 실패 항목: ' + failed.join(', '));
  resetWrapperCheck.failedChecks = failed;
} else {
  errors.push('Reset wrapper ' + RESET_WRAPPER_ID + ' 를 찾지 못했다');
}

/* ---------- 툴바 ---------- */
const tb = await figma.getNodeByIdAsync(TOOLBAR_ID);
const toolbarCheck = { id: TOOLBAR_ID, exists: !!tb, checks: {} };
if (tb) {
  const tk = kids(tb) || [];
  const vis = tk.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const padH = r2((tb.paddingLeft || 0) + (tb.paddingRight || 0));
  const gap = r2(tb.itemSpacing || 0);
  const occupied = r2(vis.reduce((a, c) => a + c.width, 0) + gap * Math.max(0, vis.length - 1) + padH);
  toolbarCheck.width = r2(tb.width);
  toolbarCheck.height = r2(tb.height);
  toolbarCheck.paddingH = padH;
  toolbarCheck.gap = gap;
  toolbarCheck.visibleChildren = vis.map(c => ({ id: c.id, name: c.name, width: r2(c.width),
                                                 height: r2(c.height) }));
  toolbarCheck.occupiedWidth = occupied;
  toolbarCheck.freeSpace = r2(tb.width - occupied);
  toolbarCheck.expectedWidth = TOOLBAR_EXPECTED_WIDTH;
  toolbarCheck.checks.widthUnchanged = near(tb.width, TOOLBAR_EXPECTED_WIDTH);
  if (!toolbarCheck.checks.widthUnchanged) {
    notes.push('툴바 폭이 ' + r2(tb.width) + ' 다. 기대값 ' + TOOLBAR_EXPECTED_WIDTH +
      ' 과 다르다 — 누가 바꿨거나 기대값 자체가 틀렸다. 둘 중 무엇인지 확인이 필요하다.');
  }
  toolbarCheck.checks.noOverflow = r2(tb.width - occupied) >= 0;
  toolbarCheck.tallestVisibleChild = vis.length ? r2(Math.max.apply(null, vis.map(c => c.height))) : 0;
  toolbarCheck.paddingV = r2((tb.paddingTop || 0) + (tb.paddingBottom || 0));
  toolbarCheck.heightNote = '높이는 기록만 한다. 툴바 높이를 고치는 것은 이번 단계의 일이 아니다. ' +
    '가장 높은 자식 ' + toolbarCheck.tallestVisibleChild + ' + 세로 padding ' +
    toolbarCheck.paddingV + ' 와 맞는지 눈으로 확인할 것.';
  const failed = Object.keys(toolbarCheck.checks).filter(k => !toolbarCheck.checks[k]);
  if (failed.length) errors.push('툴바 실패 항목: ' + failed.join(', '));
  toolbarCheck.failedChecks = failed;
} else {
  errors.push('툴바 ' + TOOLBAR_ID + ' 를 찾지 못했다');
}

/* ---------- 페이지 미아 ---------- */
const SET_IDS = ['1030:2017', '1030:2007', '1029:1997'];
const pageStrays = [];
for (const c of figma.currentPage.children) {
  for (const sid of SET_IDS) {
    if (await isInstanceOfSet(c, sid)) {
      pageStrays.push({ id: c.id, name: c.name, size: r2(c.width) + '×' + r2(c.height) });
      break;
    }
  }
}
if (pageStrays.length) errors.push('페이지 최상위에 떠도는 인스턴스 ' + pageStrays.length + '개');

/* ---------- 집계 ---------- */
const allChecksOf = r => r && Object.keys(r.checks).every(k => r.checks[k] !== false);
const successCriteria = {
  sixNewInstances: rows.filter(r => r.checks.newInstanceExists === true).length === 6,
  allVariantsCorrect: rows.every(r => r.checks.variantCorrect === true),
  allLabelsCorrect: rows.every(r => r.checks.labelCorrect === true),
  inputLeadingIsSearchAndVisible: (function () {
    const r = rows.filter(x => x.key === 'input')[0];
    return !!r && r.checks.leadingIconCorrect === true && r.checks.leadingVisible === true;
  })(),
  inputSizeIs240x36: (function () {
    const r = rows.filter(x => x.key === 'input')[0];
    return !!r && r.checks.sizeAsExpected === true;
  })(),
  allSelectsHaveChevron: rows.filter(r => r.role === 'Select')
    .every(r => r.checks.chevronPresent === true),
  resetIsGhostWithResetIcon: (function () {
    const r = rows.filter(x => x.key === 'reset')[0];
    return !!r && r.checks.variantCorrect === true &&
           r.checks.leadingIconCorrect === true && r.checks.leadingVisible === true;
  })(),
  allOriginalsExistAndHidden: rows.every(r =>
    r.checks.originalStillExists === true && r.checks.originalHidden === true),
  allAccessoriesExistAndHidden: rows.every(r =>
    r.checks.accessoriesStillExist !== false && r.checks.accessoriesHidden !== false),
  allControlsAre36High: rows.every(r => r.checks.heightIs36 === true),
  hugParentsFollowControlHeight: rows.every(r => r.checks.parentHeightFollowsControl !== false),
  siblingOrderAsPlanned: rows.every(r => r.checks.newInstanceImmediatelyBeforeOriginal === true),
  noDuplicates: rows.every(r => r.checks.noDuplicateUnderParent === true),
  exactlyOnePerParent: rows.every(r => r.checks.exactlyOneInstanceUnderParent === true),
  inputWrapperHugAtNewWidth: allChecksOf(inputWrapperCheck),
  resetWrapperKept: allChecksOf(resetWrapperCheck),
  toolbarWidthUnchangedNoOverflow: allChecksOf(toolbarCheck),
  noPageStrays: pageStrays.length === 0,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  targetCount: TARGETS.length,
  accessoryCount: TARGETS.reduce((a, t) => a + t.accessories.length, 0),
  targets: rows,
  inputWrapper: inputWrapperCheck,
  resetWrapper: resetWrapperCheck,
  toolbar: toolbarCheck,
  measured: rows.map(r => ({ key: r.key,
    newInstanceSize: r.newInstanceSize, newInstanceWidth: r.newInstanceWidth,
    newInstanceHeight: r.newInstanceHeight,
    parentSize: r.parentSize, parentSizingHorizontal: r.parentSizingHorizontal,
    parentSizingVertical: r.parentSizingVertical,
    referenceWidth: r.referenceWidth, widthVsReference: r.widthVsReference })),
  measurementNote: '폭은 실측이 기준이다. referenceWidth 는 DRY_RUN 예측을 대조하기 위한 참고값이며 ' +
                   'Input(마스터 고정 폭) 을 빼면 통과 조건이 아니다.',
  pageStrays,
  successCriteria,
  successCriteriaMet,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 12)
});
