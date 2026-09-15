/* ============================================================================
 * 줍줍 — 스크립트 17
 * Phase B) 툴바 컨트롤 6개를 컴포넌트 인스턴스로 교체
 *
 * 대상 (17a-v5 감사로 확정)
 *   Input    1003:1697  + accessory 1003:1700 (검색 아이콘, ABSOLUTE)
 *   Select1  1003:1705  + accessory 1003:1708 (chevron)
 *   Select2  1003:1711  + accessory 1003:1714
 *   Select3  1003:1717  + accessory 1003:1720
 *   Select4  1003:1723  + accessory 1003:1726
 *   Reset    1003:1729  (wrapper 1003:1728 은 유지)
 *
 * accessory 를 같이 숨기는 이유
 *   새 마스터가 이미 Icon / Search 와 chevron 을 품고 있다. 기존 것을 남기면 아이콘이 겹친다.
 *   삭제하지 않고 visible = false 로 보존한다.
 *
 * Input wrapper 1003:1696
 *   FIXED 249 인데 교체 후 in-flow 내용은 240짜리 새 Input 하나뿐이다.
 *   sizing 을 HUG 로 바꿔 wrapper 가 내용을 따라가게 한다.
 *   폭을 깎는 게 목적이 아니라 wrapper sizing 을 내용과 맞추는 것이다.
 *   **컴포넌트 교체가 전부 끝난 뒤에 마지막으로** 바꾸고, 별도 mutation 으로 기록한다.
 *
 * 텍스트 노드 이름
 *   Input 은 'placeholder', Select·Button 은 'label' 이다. 하나로 가정하지 않는다.
 *   이름으로 못 찾으면 첫 TEXT 자손으로 넘어가고, 어느 쪽으로 찾았는지 보고한다.
 *
 * index
 *   감사 시점 index 를 쓰지 않는다. 삽입 직전에 indexOf 를 다시 계산하고,
 *   삽입 직후 새 인스턴스 = 그 index, 원본 = index + 1 인지 확인한다. 아니면 즉시 중단한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 계획과 예측만
 *   2) 이상 없으면 DRY_RUN = false
 *   3) 직후 17b 읽기 전용 검증
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 수정할 때만 false 로 변경
const SCRIPT_VERSION = '17-v3-phaseB-toolbar-replace';

const TOOLBAR_ID = '1003:1695';
const INPUT_WRAPPER_ID = '1003:1696';
const INPUT_WRAPPER_TARGET_SIZING = 'HUG';

const TARGETS = [
  { key: 'input', role: 'Input', srcId: '1003:1697', setId: '1030:2017',
    variant: 'state=default', label: '기업명, 직무 검색',
    textNodeNames: ['placeholder', 'label'],
    leadingIcon: 'Icon / Search', leadingVisible: true,
    accessories: ['1003:1700'] },

  { key: 'select1', role: 'Select', srcId: '1003:1705', setId: '1030:2007',
    variant: 'state=default', label: '지원 상태: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    accessories: ['1003:1708'] },

  { key: 'select2', role: 'Select', srcId: '1003:1711', setId: '1030:2007',
    variant: 'state=default', label: '전형 상태: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    accessories: ['1003:1714'] },

  { key: 'select3', role: 'Select', srcId: '1003:1717', setId: '1030:2007',
    variant: 'state=default', label: '현재 단계: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    accessories: ['1003:1720'] },

  { key: 'select4', role: 'Select', srcId: '1003:1723', setId: '1030:2007',
    variant: 'state=default', label: '포지션: 전체',
    textNodeNames: ['label', 'placeholder'],
    leadingIcon: null, leadingVisible: null,
    accessories: ['1003:1726'] },

  { key: 'reset', role: 'Button', srcId: '1003:1729', setId: '1029:1997',
    variant: 'variant=ghost', label: '초기화',
    textNodeNames: ['label'],
    leadingIcon: 'Icon / Reset', leadingVisible: true,
    accessories: [], keepWrapperId: '1003:1728' }
];

const LEADING_SLOT = 16;
const errors = [];
const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.5;
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
  if (!cs) return null;
  for (const c of cs) if (c.name === name) return c;
  return collectDeep(n, c => c.name === name, 4)[0] || null;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}

/* ========================================================================
 * 1. 재료 수집
 * ====================================================================== */
const toolbar = await figma.getNodeByIdAsync(TOOLBAR_ID);
const inputWrapper = await figma.getNodeByIdAsync(INPUT_WRAPPER_ID);

const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const iconByName = {};
for (const c of iconComps) iconByName[c.name] = c;

const setCache = {};
async function loadSet(setId) {
  if (setCache[setId] !== undefined) return setCache[setId];
  const set = await figma.getNodeByIdAsync(setId);
  if (!set || set.type !== 'COMPONENT_SET') { setCache[setId] = null; return null; }
  let leadingProp = null;
  try {
    leadingProp = Object.keys(set.componentPropertyDefinitions)
      .find(k => k.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }
  const variants = {};
  for (const v of set.children) variants[v.name] = v;
  const v0 = set.children[0];
  const lt = v0 ? findTextNode(v0, ['placeholder', 'label']) : { node: null };
  setCache[setId] = { set, leadingProp, variants,
                      refWidth: v0 ? r2(v0.width) : null,
                      refHeight: v0 ? r2(v0.height) : null,
                      refGap: v0 ? r2(v0.itemSpacing || 0) : 0,
                      refPaddingH: v0 ? r2((v0.paddingLeft || 0) + (v0.paddingRight || 0)) : 0,
                      labelWidth: lt.node ? r2(lt.node.width) : null,
                      labelFontSize: lt.node ? r2(lt.node.fontSize) : null,
                      labelFontName: (function () {
                        try {
                          return lt.node && typeof lt.node.fontName === 'object'
                            ? lt.node.fontName.family + ' ' + lt.node.fontName.style : null;
                        } catch (e) { return null; }
                      })() };
  return setCache[setId];
}

/* 부모의 교체 후 크기를 가로·세로 **둘 다** 계산한다.
 * 숨길 자식은 레이아웃에서 빠지고, 새 인스턴스가 그 자리를 대신한다. */
function predictParentBox(parent, hiddenIds, newW, newH) {
  const pk = kids(parent) || [];
  const inFlow = pk.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
  const remain = inFlow.filter(c => hiddenIds.indexOf(c.id) < 0);
  const padH = r2((parent.paddingLeft || 0) + (parent.paddingRight || 0));
  const padV = r2((parent.paddingTop || 0) + (parent.paddingBottom || 0));
  const gap = r2(parent.itemSpacing || 0);
  const mode = 'layoutMode' in parent ? parent.layoutMode : 'NONE';

  let sizingH = null, sizingV = null;
  try { sizingH = parent.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { sizingV = parent.layoutSizingVertical; } catch (e) { /* 무시 */ }

  const widths = remain.map(c => c.width).concat(newW === null ? [] : [newW]);
  const heights = remain.map(c => c.height).concat(newH === null ? [] : [newH]);
  const n = widths.length;
  const mx = a => a.length ? Math.max.apply(null, a) : 0;
  const sum = a => a.reduce((x, y) => x + y, 0);

  let contentW = null, contentH = null, basis;
  if (mode === 'HORIZONTAL') {
    contentW = r2(sum(widths) + gap * Math.max(0, n - 1) + padH);
    contentH = r2(mx(heights) + padV);
    basis = '가로 Auto Layout — 폭은 합계, 높이는 가장 높은 자식';
  } else if (mode === 'VERTICAL') {
    contentW = r2(mx(widths) + padH);
    contentH = r2(sum(heights) + gap * Math.max(0, n - 1) + padV);
    basis = '세로 Auto Layout — 폭은 가장 넓은 자식, 높이는 합계';
  } else {
    basis = 'Auto Layout 이 아니다 — 자식 크기가 부모를 바꾸지 않는다';
  }

  const pw = (sizingH === 'HUG' && contentW !== null) ? contentW : r2(parent.width);
  const ph = (sizingV === 'HUG' && contentH !== null) ? contentH : r2(parent.height);
  return {
    layoutMode: mode, sizingH, sizingV,
    currentSize: r2(parent.width) + '×' + r2(parent.height),
    contentWidth: contentW, contentHeight: contentH,
    predictedWidth: pw, predictedHeight: ph,
    predictedSize: pw + '×' + ph +
      (sizingH === 'HUG' ? '' : ' (가로 고정)') + (sizingV === 'HUG' ? '' : ' (세로 고정)'),
    basis
  };
}

/* ========================================================================
 * 2. baseline + 폭 예측
 * ====================================================================== */
const plan = [];
for (const t of TARGETS) {
  const src = await figma.getNodeByIdAsync(t.srcId);
  const si = await loadSet(t.setId);
  const rec = { key: t.key, role: t.role, srcId: t.srcId, found: !!src, setFound: !!si };
  if (!src || !si) { plan.push(rec); continue; }

  const parent = src.parent;
  rec.parentId = parent ? parent.id : null;
  rec.parentName = parent ? parent.name : null;
  rec.currentIndex = parent && kids(parent) ? parent.children.indexOf(src) : -1;
  rec.currentVisible = src.visible;
  rec.currentSize = r2(src.width) + '×' + r2(src.height);
  rec.currentWidth = r2(src.width);
  rec.currentHeight = r2(src.height);

  const st = findTextNode(src, t.textNodeNames);
  rec.currentTextId = st.node ? st.node.id : null;
  rec.currentText = st.node ? st.node.characters : null;
  rec.currentTextWidth = st.node ? r2(st.node.width) : null;
  rec.currentTextFontSize = st.node ? r2(st.node.fontSize) : null;
  rec.currentTextFontName = (function () {
    try {
      return st.node && typeof st.node.fontName === 'object'
        ? st.node.fontName.family + ' ' + st.node.fontName.style : null;
    } catch (e) { return null; }
  })();
  rec.currentTextFoundBy = st.foundBy;

  rec.targetVariant = t.variant;
  rec.variantExists = !!si.variants[t.variant];
  rec.newLabel = t.label;
  rec.leadingIcon = t.leadingIcon;
  rec.leadingVisible = t.leadingVisible;
  rec.leadingPropertyKey = si.leadingProp;
  rec.leadingIconFound = t.leadingIcon ? !!iconByName[t.leadingIcon] : null;

  rec.accessories = [];
  for (const aid of t.accessories) {
    const a = await figma.getNodeByIdAsync(aid);
    rec.accessories.push({ id: aid, found: !!a, visible: a ? a.visible : null,
                           layoutPositioning: a && 'layoutPositioning' in a ? a.layoutPositioning : null,
                           size: a ? r2(a.width) + '×' + r2(a.height) : null });
  }
  rec.accessoryIdsToHide = t.accessories.slice();

  /* 폭 예측 — 마스터 실측 폭에서 마스터 라벨 폭만 우리 라벨 폭으로 갈아끼운다 */
  const v = si.variants[t.variant];
  rec.predictedHeight = v ? r2(v.height) : si.refHeight;
  let sizingH = null;
  try { sizingH = v ? v.layoutSizingHorizontal : null; } catch (e) { /* 무시 */ }
  rec.masterWidthMode = sizingH;

  if (sizingH === 'FIXED') {
    rec.predictedWidth = r2(v.width);
    rec.predictionKind = 'exact';
    rec.widthBasis = '마스터가 고정 폭 ' + r2(v.width) + ' 이라 라벨 폭과 무관하게 확정이다';
    rec.predictedLow = rec.predictedWidth;
    rec.predictedHigh = rec.predictedWidth;
    /* 폭 판정에는 안 쓰지만 비교표가 비지 않게 채운다 */
    rec.currentString = rec.currentText;
    rec.newString = t.label;
    rec.stringIdentical = rec.currentText === t.label;
    rec.currentLabelFontSize = rec.currentTextFontSize;
    rec.masterLabelFontSize = si.labelFontSize;
    rec.currentLabelFont = rec.currentTextFontName;
    rec.masterLabelFont = si.labelFontName;
    rec.fontSizeSame = si.labelFontSize !== null &&
      Math.abs(si.labelFontSize - rec.currentTextFontSize) < 0.01;
    rec.fontNameSame = !!(si.labelFontName && rec.currentTextFontName &&
      si.labelFontName === rec.currentTextFontName);
    rec.labelWidthUsed = null;
    rec.estimateReasons = [];
    rec.labelWidthIrrelevant = '마스터가 고정 폭이라 라벨 폭이 전체 폭을 바꾸지 않는다';
  } else if (si.labelWidth !== null && si.labelFontSize && rec.currentTextWidth !== null &&
             rec.currentTextFontSize) {
    /* 새 인스턴스의 라벨은 **마스터의 typography** 로 그려진다.
     * 그래서 "문구가 같다" 만으로는 폭이 같다고 할 수 없다 — 글자크기·폰트도 같아야 한다.
     * 세 조건을 따로 판정하고, 무엇이 어긋났는지 남긴다. */
    const stringIdentical = rec.currentText === t.label;
    const fontSizeSame = Math.abs(si.labelFontSize - rec.currentTextFontSize) < 0.01;
    const fontNameSame = !!(si.labelFontName && rec.currentTextFontName &&
                            si.labelFontName === rec.currentTextFontName);
    const typographyCompatible = fontSizeSame && fontNameSame;

    rec.stringIdentical = stringIdentical;
    rec.currentString = rec.currentText;
    rec.newString = t.label;
    rec.currentLabelFontSize = rec.currentTextFontSize;
    rec.masterLabelFontSize = si.labelFontSize;
    rec.currentLabelFont = rec.currentTextFontName;
    rec.masterLabelFont = si.labelFontName;
    rec.fontSizeSame = fontSizeSame;
    rec.fontNameSame = fontNameSame;
    rec.typographyCompatible = typographyCompatible;

    const addLeading = (t.leadingVisible === true) ? r2(si.refGap + LEADING_SLOT) : 0;
    rec.leadingAddition = addLeading;
    const masterW = v ? v.width : si.refWidth;

    let labelWidthUsed, band;
    if (stringIdentical && typographyCompatible) {
      /* 문구도 typography 도 같다 — 현재 실측 폭을 그대로 쓴다. 추정이 끼어들 자리가 없다. */
      labelWidthUsed = rec.currentTextWidth;
      rec.predictionKind = 'measuredLabel';
      band = 0;
      rec.widthBasis = '문구와 typography 가 모두 같아 현재 라벨 실측 폭 ' + rec.currentTextWidth +
                       ' 을 그대로 사용 (' + JSON.stringify(t.label) + ', ' +
                       rec.currentTextFontSize + 'px, ' + rec.currentTextFontName + ')';
      rec.estimateReasons = [];
    } else {
      const reasons = [];
      if (!stringIdentical) reasons.push('문구가 다르다 (' + JSON.stringify(rec.currentText) +
                                         ' → ' + JSON.stringify(t.label) + ')');
      if (!fontSizeSame) reasons.push('글자크기가 다르다 (' + rec.currentTextFontSize +
                                      ' → ' + si.labelFontSize + ')');
      if (!fontNameSame) reasons.push('폰트가 다르다 (' + rec.currentTextFontName +
                                      ' → ' + si.labelFontName + ')');
      const scale = si.labelFontSize / rec.currentTextFontSize;
      /* 문구가 같으면 글자수비를 곱하지 않는다. 같은 문자열에 1을 곱하는 계산을 끼워넣지 않는다. */
      const charRatio = stringIdentical ? 1
        : (rec.currentText && rec.currentText.length ? t.label.length / rec.currentText.length : 1);
      rec.labelScale = r2(scale);
      rec.labelCharRatio = stringIdentical ? null : r2(charRatio);
      labelWidthUsed = r2(rec.currentTextWidth * scale * charRatio);
      rec.predictionKind = 'estimate';
      band = 0.15;
      rec.widthBasis = '현재 실측 폭 ' + rec.currentTextWidth + ' 에 보정을 적용해 ' + labelWidthUsed +
                       ' 로 추정 — ' + reasons.join(' / ');
      rec.estimateReasons = reasons;
    }
    rec.labelWidthUsed = labelWidthUsed;
    const base = r2(masterW - si.labelWidth + labelWidthUsed + addLeading);
    rec.predictedWidth = base;
    rec.predictedLow = r2(base - labelWidthUsed * band);
    rec.predictedHigh = r2(base + labelWidthUsed * band);
  } else {
    rec.predictedWidth = null;
    rec.predictionKind = 'unknown';
    rec.widthBasis = '마스터 라벨 폭이나 현재 글자크기를 읽지 못했다';
  }
  rec.widthDelta = rec.predictedWidth === null ? null : r2(rec.predictedWidth - rec.currentWidth);

  /* 부모 예상 크기 — **높이도 새 값(36)을 반영한다.**
   * v2 는 폭만 계산하고 높이는 기존 값을 그대로 붙여서, 새 컨트롤이 36인데 부모가 30으로 보고됐다. */
  if (parent) {
    const box = predictParentBox(parent, [t.srcId].concat(t.accessories),
                                 rec.predictedWidth, rec.predictedHeight);
    rec.parentSizingHorizontal = box.sizingH;
    rec.parentSizingVertical = box.sizingV;
    rec.parentLayoutMode = box.layoutMode;
    rec.parentCurrentSize = box.currentSize;
    rec.parentContentWidthAfter = box.contentWidth;
    rec.parentContentHeightAfter = box.contentHeight;
    rec.parentPredictedWidth = box.predictedWidth;
    rec.parentPredictedHeight = box.predictedHeight;
    rec.parentPredictedSize = box.predictedSize;
    rec.parentPredictionBasis = box.basis;
  }
  plan.push(rec);
}

/* ========================================================================
 * 3. Input wrapper + 툴바 폭 예측
 * ====================================================================== */
const inputPlan = plan.filter(p => p.key === 'input')[0];
let wrapperPlan = null;
if (inputWrapper && inputPlan && inputPlan.predictedWidth !== null) {
  const wk = kids(inputWrapper) || [];
  const inFlow = wk.filter(c => c.layoutPositioning !== 'ABSOLUTE');
  const hiddenAfter = ['1003:1697'].concat(inputPlan.accessoryIdsToHide);
  const remain = inFlow.filter(c => hiddenAfter.indexOf(c.id) < 0);
  const padH = r2((inputWrapper.paddingLeft || 0) + (inputWrapper.paddingRight || 0));
  const gap = r2(inputWrapper.itemSpacing || 0);
  let cur = null;
  try { cur = inputWrapper.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  wrapperPlan = {
    id: inputWrapper.id, name: inputWrapper.name,
    currentSizingHorizontal: cur,
    plannedSizingHorizontal: INPUT_WRAPPER_TARGET_SIZING,
    currentWidth: r2(inputWrapper.width),
    paddingH: padH, gap,
    inFlowChildrenAfter: remain.length + 1,
    predictedWidth: r2(inputPlan.predictedWidth + remain.reduce((a, c) => a + c.width, 0) +
                       gap * Math.max(0, remain.length) + padH),
    fillChildren: inFlow.filter(c => c.layoutGrow === 1).map(c => c.id),
    whenChanged: '컴포넌트 교체 6개가 모두 끝난 뒤 마지막 단계',
    why: 'wrapper 가 FIXED ' + r2(inputWrapper.width) + ' 인데 교체 후 in-flow 내용은 새 Input 하나뿐이다. ' +
         '폭을 깎는 게 목적이 아니라 wrapper sizing 을 내용과 맞추는 것이다.'
  };
  /* 두 단계다. 교체 직후에는 폭이 아직 FIXED 249 이고, 마지막 HUG 전환에서 240 이 된다. */
  const boxAfterReplace = predictParentBox(inputWrapper, ['1003:1697'].concat(inputPlan.accessoryIdsToHide),
                                           inputPlan.predictedWidth, inputPlan.predictedHeight);
  wrapperPlan.stageAfterReplacement = {
    what: '컴포넌트 교체 직후 (아직 FIXED)',
    size: r2(inputWrapper.width) + '×' + boxAfterReplace.predictedHeight,
    widthStillFixedAt: r2(inputWrapper.width),
    heightFollowsNewControl: boxAfterReplace.sizingV === 'HUG'
  };
  wrapperPlan.stageAfterHug = {
    what: 'HUG 전환 후',
    size: wrapperPlan.predictedWidth + '×' + boxAfterReplace.predictedHeight
  };
  wrapperPlan.predictedHeight = boxAfterReplace.predictedHeight;
  wrapperPlan.recoveredWidth = r2(inputWrapper.width - wrapperPlan.predictedWidth);
}

let toolbarPlan = null;
if (toolbar) {
  const tk = kids(toolbar) || [];
  const vis = tk.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const padH = r2((toolbar.paddingLeft || 0) + (toolbar.paddingRight || 0));
  const gap = r2(toolbar.itemSpacing || 0);
  const occupiedNow = r2(vis.reduce((a, c) => a + c.width, 0) +
                         gap * Math.max(0, vis.length - 1) + padH);

  function ancestorIds(n) { const ids = []; let p = n.parent;
    while (p) { ids.push(p.id); if (p.id === TOOLBAR_ID) break; p = p.parent; } return ids; }

  const groups = [];
  for (const g of vis) {
    let dMed = 0, dLow = 0, dHigh = 0, unresolved = 0;
    for (const pr of plan) {
      if (pr.predictedWidth === null || pr.predictedWidth === undefined) { unresolved++; continue; }
      const src = await figma.getNodeByIdAsync(pr.srcId);
      if (!src) { unresolved++; continue; }
      const inside = src.id === g.id || ancestorIds(src).indexOf(g.id) >= 0;
      if (!inside) continue;
      /* Input wrapper 는 HUG 로 바꾸므로 내용 폭을 그대로 따라간다 */
      dMed += pr.widthDelta;
      dLow += r2(pr.predictedLow - pr.currentWidth);
      dHigh += r2(pr.predictedHigh - pr.currentWidth);
    }
    let hugs = null;
    try { hugs = g.layoutSizingHorizontal === 'HUG'; } catch (e) { /* 무시 */ }
    const willHug = hugs || (wrapperPlan && g.id === wrapperPlan.id);
    groups.push({ id: g.id, name: g.name, currentWidth: r2(g.width), hugsAfter: !!willHug,
                  containedDelta: r2(dMed), unresolvedInside: unresolved,
                  predictedWidth: willHug ? r2(g.width + dMed) : r2(g.width),
                  predictedWidthLow: willHug ? r2(g.width + dLow) : r2(g.width),
                  predictedWidthHigh: willHug ? r2(g.width + dHigh) : r2(g.width) });
  }
  const occ = k => r2(groups.reduce((a, g) => a + g[k], 0) + gap * Math.max(0, vis.length - 1) + padH);
  const after = occ('predictedWidth'), afterLow = occ('predictedWidthLow'), afterHigh = occ('predictedWidthHigh');

  toolbarPlan = {
    toolbarId: toolbar.id, width: r2(toolbar.width), height: r2(toolbar.height),
    paddingH: padH, gap, primaryAxisAlignItems: toolbar.primaryAxisAlignItems,
    directChildren: groups,
    currentOccupiedWidth: occupiedNow,
    predictedOccupiedWidth: after,
    predictedOccupiedWidthLow: afterLow,
    predictedOccupiedWidthHigh: afterHigh,
    freeSpaceNow: r2(toolbar.width - occupiedNow),
    freeSpaceAfter: r2(toolbar.width - after),
    freeSpaceAfterConservative: r2(toolbar.width - afterHigh),
    collisionRisk: r2(toolbar.width - afterHigh) < 0,
    collisionRiskMedian: r2(toolbar.width - after) < 0,
    toolbarWidthUnchanged: true,
    note: 'collisionRisk 는 보수적 상한 기준이다. 툴바 폭은 바꾸지 않는다.'
  };

  /* 툴바 높이 — 새 컨트롤이 36 이면 가장 높은 자식이 바뀔 수 있다 */
  const padV = r2((toolbar.paddingTop || 0) + (toolbar.paddingBottom || 0));
  const newControlHeights = plan.map(p2 => p2.predictedHeight).filter(h => typeof h === 'number');
  const tallestNewControl = newControlHeights.length ? Math.max.apply(null, newControlHeights) : 0;
  /* 대상을 품지 않은 직계 자식은 높이가 그대로다 */
  const untouched = [];
  for (const g of vis) {
    let holds = false;
    for (const p2 of plan) {
      const src = await figma.getNodeByIdAsync(p2.srcId);
      if (src && (src.id === g.id || ancestorIds(src).indexOf(g.id) >= 0)) { holds = true; break; }
    }
    if (!holds) untouched.push(r2(g.height));
  }
  const tallestAfter = Math.max(tallestNewControl, untouched.length ? Math.max.apply(null, untouched) : 0);
  let tbSizingV = null;
  try { tbSizingV = toolbar.layoutSizingVertical; } catch (e) { /* 무시 */ }
  const predictedH = r2(tallestAfter + padV);
  const rawGrowth = r2(predictedH - toolbar.height);
  const tol = 0.5;
  toolbarPlan.height = {
    measuredNow: r2(toolbar.height),
    paddingV: padV,
    tallestVisibleChildNow: vis.length ? r2(Math.max.apply(null, vis.map(c => c.height))) : 0,
    tallestChildAfter: r2(tallestAfter),
    newControlHeight: tallestNewControl,
    heightHugs: tbSizingV === 'HUG' || toolbar.counterAxisSizingMode === 'AUTO',
    predictedHeightAfter: predictedH,
    tolerancePx: tol,
    rawGrowthPx: rawGrowth,
    effectiveGrowthPx: Math.abs(rawGrowth) <= tol ? 0 : rawGrowth,
    toolbarActuallyGrows: (Math.abs(rawGrowth) <= tol ? 0 : rawGrowth) > 0,
    note: '툴바 높이는 이번 단계에서 고치지 않는다. 계산해서 보고만 한다.'
  };
}

/* ========================================================================
 * 4. preflight
 * ====================================================================== */
const preflight = {};
preflight.toolbarFound = !!toolbar;
preflight.inputWrapperFound = !!inputWrapper;
preflight.allTargetsFound = plan.every(p => p.found);
preflight.allTargetsVisible = plan.every(p => p.currentVisible === true);
preflight.allComponentSetsFound = plan.every(p => p.setFound);
preflight.allVariantsExist = plan.every(p => p.variantExists === true);
preflight.allTargetsHaveParent = plan.every(p => p.parentId);
preflight.allTargetsHaveText = plan.every(p => typeof p.currentText === 'string');
preflight.allAccessoriesFound = plan.every(p => p.accessories.every(a => a.found));
preflight.allAccessoriesVisible = plan.every(p => p.accessories.every(a => a.visible === true));

const resetPlan = plan.filter(p => p.key === 'reset')[0];
const resetWrapper = await figma.getNodeByIdAsync('1003:1728');
preflight.resetWrapperFound = !!resetWrapper;

const inputSet = await loadSet('1030:2017');
const buttonSet = await loadSet('1029:1997');
preflight.inputLeadingPropertyExists = !!(inputSet && inputSet.leadingProp);
preflight.buttonLeadingPropertyExists = !!(buttonSet && buttonSet.leadingProp);
preflight.iconSearchFound = !!iconByName['Icon / Search'];
preflight.iconResetFound = !!iconByName['Icon / Reset'];

const missing = Object.keys(preflight).filter(k => !preflight[k]);
if (missing.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '사전 조건 누락: ' + missing.join(', '),
               preflight, plan, wrapperPlan, toolbarPlan, notes });
}

/* ========================================================================
 * 5. DRY_RUN
 * ====================================================================== */
const kinds = plan.map(p => p.predictionKind);
const kindCount = { exact: 0, measuredLabel: 0, estimate: 0, unknown: 0 };
for (const k of kinds) if (kindCount[k] !== undefined) kindCount[k]++;
const estimated = plan.filter(p => p.predictionKind === 'estimate');

const widthNote = estimated.length === 0
  ? 'exact ' + kindCount.exact + '개 · measuredLabel ' + kindCount.measuredLabel + '개. ' +
    '추정이 하나도 없다 — 문구와 typography 가 그대로인 대상은 현재 Figma 의 실측 라벨 폭을 그대로 썼고, ' +
    'predictedLow 와 predictedHigh 가 predictedWidth 와 같다. ' +
    '그래도 새 인스턴스의 최종 폭은 교체 후 17b 에서 반드시 다시 실측한다.'
  : 'exact ' + kindCount.exact + '개 · measuredLabel ' + kindCount.measuredLabel +
    '개 · estimate ' + kindCount.estimate + '개. ' +
    'estimate 인 대상: ' + estimated.map(p => p.key + '(' + (p.estimateReasons || []).join(', ') + ')').join(' · ') +
    '. estimate 만 predictedLow~High 가 ±15% 로 벌어진다. ' +
    '나머지는 실측 기반이다. 최종 폭은 교체 후 17b 실측으로 확정한다.';

const measuredLabelNote =
  'measuredLabel 조건: 문구가 완전히 같고, 글자크기와 폰트가 마스터와 같을 것. ' +
  '새 인스턴스의 라벨은 **마스터의 typography** 로 그려지므로 문구만 같아서는 폭이 같다고 할 수 없다. ' +
  '세 조건은 대상별 stringIdentical / fontSizeSame / fontNameSame 에 따로 찍혀 있다.';

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    targetCount: plan.length,
    accessoryCount: plan.reduce((a, p) => a + p.accessoryIdsToHide.length, 0),
    preflight,
    targets: plan.map(p => ({
      대상: p.key + ' (' + p.role + ')',
      원본노드: p.srcId,
      부모: p.parentName + ' (' + p.parentId + ')',
      현재index: p.currentIndex,
      indexNote: '보고용이다. APPLY 는 삽입 직전에 다시 계산한다',
      새변형: p.targetVariant,
      현재라벨: p.currentText,
      새라벨: p.newLabel,
      라벨노드찾은법: p.currentTextFoundBy,
      leading아이콘: p.leadingIcon || '(없음 — chevron 은 마스터 내부)',
      leading노출: p.leadingVisible,
      숨길accessory: p.accessoryIdsToHide,
      현재크기: p.currentSize,
      예상폭: p.predictedWidth,
      예상폭범위: p.predictedLow + '~' + p.predictedHigh,
      예상높이: p.predictedHeight,
      폭변화: p.widthDelta,
      폭근거: p.widthBasis,
      예측종류: p.predictionKind,
      부모현재크기: p.parentCurrentSize,
      부모예상크기: p.parentPredictedSize,
      부모예상높이: p.parentPredictedHeight,
      부모레이아웃: p.parentLayoutMode + ' / 가로 ' + p.parentSizingHorizontal +
                   ' / 세로 ' + p.parentSizingVertical,
      부모예측근거: p.parentPredictionBasis
    })),
    planRaw: plan,
    widthNote,
    widthPredictionKinds: kindCount,
    measuredLabelNote,
    labelComparison: plan.map(p => ({
      key: p.key,
      현재문구: p.currentString !== undefined ? p.currentString : p.currentText,
      새문구: p.newString !== undefined ? p.newString : p.newLabel,
      문구동일: p.stringIdentical,
      현재글자크기: p.currentLabelFontSize,
      마스터글자크기: p.masterLabelFontSize,
      글자크기동일: p.fontSizeSame,
      현재폰트: p.currentLabelFont,
      마스터폰트: p.masterLabelFont,
      폰트동일: p.fontNameSame,
      사용한라벨폭: p.labelWidthUsed,
      현재실측라벨폭: p.currentTextWidth,
      판정: p.predictionKind,
      추정이유: p.estimateReasons
    })),
    inputWrapper: wrapperPlan,
    toolbar: toolbarPlan,
    applyOrder: [
      '대상마다: 1 indexOf 재계산 / 2 인스턴스 생성 / 3 그 index 에 insert / ' +
      '4 index 검증(새=idx, 원본=idx+1) / 5 라벨 / 6 leading / 7 되읽기 / 8 원본 숨김 / 9 accessory 숨김',
      '6개가 전부 끝난 뒤에만: Input wrapper 1003:1696 sizing 을 HUG 로 바꾸고 폭을 되읽는다'
    ],
    originalHandling: '원본과 accessory 모두 삭제하지 않는다. visible = false 로 보존한다. ' +
                      'Reset wrapper 1003:1728 은 visible 을 유지한다.',
    stopPolicy: '한 대상이 실패하면 다음 대상으로 넘어가지 않는다. ' +
                'wrapper 변경은 6개가 모두 성공했을 때만 한다.',
    notes,
    nextStep: 'DRY_RUN 이 맞으면 DRY_RUN = false 로 재실행하고 직후 17b 를 돌립니다.'
  });
}

/* ========================================================================
 * 6. APPLY — 대상 단위 순차, 첫 실패에서 중단
 * ====================================================================== */
const results = {};
const strayInstanceIds = [];
const partialMutationKind = [];
let stoppedAt = null;
let failedAt = null;

for (const t of TARGETS) {
  const p0 = plan.filter(x => x.key === t.key)[0];
  const rec = { key: t.key, role: t.role, srcId: t.srcId,
                instanceCreated: false, inserted: false, indexVerified: false,
                labelSet: false, leadingHandled: false,
                originalHidden: false, accessoriesHidden: [], complete: false,
                newInstanceId: null };
  results[t.key] = rec;

  const src = await figma.getNodeByIdAsync(t.srcId);
  const parent = src.parent;
  const si = await loadSet(t.setId);
  const variant = si.variants[t.variant];
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

    step = 'setLabel';
    const lt = findTextNode(inst, t.textNodeNames);
    if (!lt.node) throw new Error('인스턴스 안에서 텍스트 노드를 찾지 못함');
    rec.labelNodeFoundBy = lt.foundBy;
    try { await figma.loadFontAsync(lt.node.fontName); }
    catch (e) { throw new Error('폰트 로드 실패: ' + e.message); }
    lt.node.characters = t.label;
    rec.labelReadBack = lt.node.characters;
    rec.labelSet = lt.node.characters === t.label;
    if (!rec.labelSet) throw new Error('라벨을 썼는데 되읽으면 다르다: ' + lt.node.characters);

    step = 'leading';
    if (t.leadingIcon) {
      const icon = iconByName[t.leadingIcon];
      const lead0 = findByName(inst, 'leading');
      if (!lead0) throw new Error('인스턴스 안에서 leading 을 찾지 못함');
      const mc = lead0.type === 'INSTANCE' ? await mainCompOf(lead0) : null;
      rec.leadingIconBefore = mc ? mc.name : null;
      if (!mc || mc.name !== t.leadingIcon) {
        rec.leadingSwapNeeded = true;
        let ok = false;
        try { inst.setProperties({ [si.leadingProp]: icon.id }); } catch (e) { rec.swapIdError = e.message; }
        let after = await mainCompOf(findByName(inst, 'leading'));
        if (after && after.name === t.leadingIcon) { ok = true; rec.swapForm = 'node id'; }
        if (!ok && icon.key) {
          try { inst.setProperties({ [si.leadingProp]: icon.key }); } catch (e) { rec.swapKeyError = e.message; }
          after = await mainCompOf(findByName(inst, 'leading'));
          if (after && after.name === t.leadingIcon) { ok = true; rec.swapForm = 'component key'; }
        }
        if (!ok) throw new Error('leading 아이콘 swap 이 적용되지 않음 (id·key 둘 다 실패)');
      } else {
        rec.leadingSwapNeeded = false;
      }
      const lead = findByName(inst, 'leading');
      lead.visible = t.leadingVisible;
      rec.leadingVisibleReadBack = lead.visible;
      if (lead.visible !== t.leadingVisible) throw new Error('leading visible 이 되읽으면 다르다');
      const mc2 = lead.type === 'INSTANCE' ? await mainCompOf(lead) : null;
      rec.leadingIconAfter = mc2 ? mc2.name : null;
    } else {
      rec.leadingSwapNeeded = false;
      rec.leadingNote = 'Select 는 chevron 이 마스터 안에 직접 그려져 있어 swap 대상이 아니다';
    }
    rec.leadingHandled = true;

    step = 'hideOriginal';
    src.visible = false;
    rec.originalHidden = src.visible === false;
    if (!rec.originalHidden) throw new Error('원본을 숨겼는데 되읽으면 visible 이다');

    step = 'hideAccessories';
    for (const aid of t.accessories) {
      const a = await figma.getNodeByIdAsync(aid);
      if (!a) throw new Error('accessory ' + aid + ' 를 찾지 못했다');
      a.visible = false;
      if (a.visible !== false) throw new Error('accessory ' + aid + ' 가 되읽으면 visible 이다');
      rec.accessoriesHidden.push(aid);
    }

    step = 'measure';
    rec.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
    rec.newInstanceWidth = r2(inst.width);
    rec.predictedWidth = p0.predictedWidth;
    rec.widthWithinPrediction = p0.predictedWidth === null ? null
      : (inst.width >= p0.predictedLow - 1 && inst.width <= p0.predictedHigh + 1);
    if (rec.widthWithinPrediction === false) {
      notes.push(t.key + ' 실측 폭 ' + r2(inst.width) + ' 이 예측 ' +
        p0.predictedLow + '~' + p0.predictedHigh + ' 을 벗어났다. ' +
        '툴바 여유는 아래 toolbarAfter 실측으로 판단할 것 — 예측값이 아니라.');
    }
    rec.parentSizeAfter = r2(parent.width) + '×' + r2(parent.height);
    rec.complete = true;
  } catch (e) {
    if (pendingInstanceId) strayInstanceIds.push(pendingInstanceId);
    failedAt = { target: t.key, step, message: e.message };
    errors.push(t.key + ' [' + step + '] ' + e.message);
    stoppedAt = t.key;
    break;
  }
}

/* ========================================================================
 * 7. Input wrapper sizing — 6개가 모두 성공했을 때만, 별도 mutation 으로
 * ====================================================================== */
const allTargetsComplete = TARGETS.every(t => results[t.key] && results[t.key].complete);
let wrapperMutation = {
  attempted: false, succeeded: false,
  wrapperSizingBefore: wrapperPlan ? wrapperPlan.currentSizingHorizontal : null,
  wrapperSizingAfter: null,
  wrapperWidthBefore: wrapperPlan ? wrapperPlan.currentWidth : null,
  wrapperWidthAfter: null,
  predictedWidth: wrapperPlan ? wrapperPlan.predictedWidth : null,
  skippedReason: null
};
if (!allTargetsComplete) {
  wrapperMutation.skippedReason = '컴포넌트 교체가 전부 끝나지 않아 wrapper 는 건드리지 않았다';
} else if (!inputWrapper) {
  wrapperMutation.skippedReason = 'Input wrapper 를 찾지 못했다';
} else {
  wrapperMutation.attempted = true;
  try {
    try { wrapperMutation.wrapperSizingBefore = inputWrapper.layoutSizingHorizontal; }
    catch (e) { /* 이미 plan 값 사용 */ }
    wrapperMutation.wrapperWidthBefore = r2(inputWrapper.width);
    inputWrapper.layoutSizingHorizontal = INPUT_WRAPPER_TARGET_SIZING;
    try { wrapperMutation.wrapperSizingAfter = inputWrapper.layoutSizingHorizontal; }
    catch (e) { wrapperMutation.wrapperSizingAfter = '(읽기 실패)'; }
    wrapperMutation.wrapperWidthAfter = r2(inputWrapper.width);
    wrapperMutation.sizingApplied = wrapperMutation.wrapperSizingAfter === INPUT_WRAPPER_TARGET_SIZING;
    wrapperMutation.widthConverged = wrapperPlan
      ? near(inputWrapper.width, wrapperPlan.predictedWidth) : null;
    wrapperMutation.succeeded = wrapperMutation.sizingApplied === true;
    if (!wrapperMutation.sizingApplied) errors.push('wrapper sizing 을 썼는데 되읽으면 다르다');
    if (wrapperMutation.widthConverged === false) {
      notes.push('wrapper 폭이 예상 ' + wrapperPlan.predictedWidth + ' 가 아니라 ' +
                 wrapperMutation.wrapperWidthAfter + ' 다 — 안에 예상 못 한 in-flow 자식이 있을 수 있다');
    }
  } catch (e) {
    errors.push('wrapper sizing 변경 실패: ' + e.message);
    wrapperMutation.error = e.message;
  }
}

/* ========================================================================
 * 8. 판정
 * ====================================================================== */
for (const t of TARGETS) {
  const r = results[t.key];
  if (!r || r.complete) continue;
  if (r.inserted && !r.originalHidden) partialMutationKind.push(t.key + 'InsertedButOriginalVisible');
  else if (r.originalHidden && r.accessoriesHidden.length < t.accessories.length)
    partialMutationKind.push(t.key + 'OriginalHiddenButAccessoryVisible');
  else if (r.instanceCreated && !r.inserted) partialMutationKind.push(t.key + 'InstanceCreatedNotInserted');
  else partialMutationKind.push(t.key + 'Incomplete');
}
if (strayInstanceIds.length) partialMutationKind.push('strayInstances');
if (wrapperMutation.attempted && !wrapperMutation.succeeded) partialMutationKind.push('wrapperSizingFailed');
if (!allTargetsComplete && wrapperMutation.attempted) partialMutationKind.push('wrapperChangedWhileTargetsIncomplete');

const completedTargets = TARGETS.filter(t => results[t.key] && results[t.key].complete).map(t => t.key);
const targetsNotStarted = TARGETS.filter(t => !results[t.key]).map(t => t.key);
const partialMutationDetected = partialMutationKind.length > 0;

if (stoppedAt) {
  errors.push('중단됨 — ' + stoppedAt + ' 에서 실패하여 이후 대상은 진행하지 않았다. 시작도 못 한 대상: ' +
              (targetsNotStarted.length ? targetsNotStarted.join(', ') : '없음'));
}

/* 툴바 실측 */
let toolbarAfter = null;
if (toolbar) {
  const tk = kids(toolbar) || [];
  const vis = tk.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  const padH = r2((toolbar.paddingLeft || 0) + (toolbar.paddingRight || 0));
  const gap = r2(toolbar.itemSpacing || 0);
  const occ = r2(vis.reduce((a, c) => a + c.width, 0) + gap * Math.max(0, vis.length - 1) + padH);
  toolbarAfter = {
    width: r2(toolbar.width), height: r2(toolbar.height),
    occupiedWidth: occ, freeSpace: r2(toolbar.width - occ),
    overflow: r2(toolbar.width - occ) < 0,
    predictedOccupiedWidth: toolbarPlan ? toolbarPlan.predictedOccupiedWidth : null,
    widthUnchanged: toolbarPlan ? near(toolbar.width, toolbarPlan.width) : null,
    children: vis.map(c => ({ id: c.id, name: c.name, width: r2(c.width) }))
  };
  if (toolbarAfter.overflow) errors.push('툴바가 넘친다 — freeSpace ' + toolbarAfter.freeSpace);
}

const successCriteria = {
  allTargetsComplete,
  allIndexesVerified: TARGETS.every(t => !results[t.key] || results[t.key].indexVerified !== false),
  allAccessoriesHidden: TARGETS.every(t => !results[t.key] ||
    results[t.key].accessoriesHidden.length === t.accessories.length),
  wrapperSizingApplied: wrapperMutation.attempted ? wrapperMutation.succeeded === true : false,
  toolbarNoOverflow: toolbarAfter ? toolbarAfter.overflow === false : false,
  toolbarWidthUnchanged: toolbarAfter ? toolbarAfter.widthUnchanged !== false : false,
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
  accessoryCount: TARGETS.reduce((a, t) => a + t.accessories.length, 0),
  completedTargets, targetsNotStarted,
  stoppedAt, failedAt,
  results,
  wrapperMutation,
  toolbarAfter,
  strayInstanceIds,
  partialMutationKind,
  partialMutationDetected,
  successCriteria,
  successCriteriaMet,
  nextVerification: '17b-phaseB-verify',
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 12)
});
