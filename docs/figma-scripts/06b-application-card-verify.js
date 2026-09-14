/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 06b
 * Application Card 세트 재검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API 를 포함하지 않으며, 모든 대입은 로컬 보고 객체에만 이뤄진다.
 *
 * 대상: Application Card 컴포넌트 세트 1037:2163
 *
 * 06 의 nestedHug = false 는 컴포넌트 결함이 아니라 검사 코드의 오류였다.
 *   info 는 VERTICAL auto layout 이다. 세로 프레임에서 counterAxisSizingMode 는
 *   '높이'가 아니라 '폭'을 제어한다. info 를 가로 FILL 로 만들었으니 폭이 부모에
 *   묶이고 Figma 는 이를 counterAxisSizingMode = FIXED 로 표현한다. 정상이다.
 *   header / footer 는 HORIZONTAL 이라 같은 속성이 높이축이어서 AUTO 로 읽혔을 뿐이다.
 *
 * 그래서 이 스크립트는 방향에 의존하지 않는 layoutSizingHorizontal / layoutSizingVertical
 * 을 읽는다. 기대값은 다음과 같다.
 *   card                 H = FIXED(235)   V = HUG
 *   header / info / footer H = FILL       V = HUG
 *   info 의 행 4개         H = FILL       V = HUG
 *
 * 높이는 216 같은 특정 숫자에 맞추지 않는다. content hug 실측값이 정상값이며,
 * 이 스크립트는 그 값이 어디서 나오는지 분해해서 보여준다.
 * ========================================================================== */

// 실행 중인 코드가 최신인지 구분하기 위한 고정 식별자.
// 출력 첫 줄의 scriptVersion 이 아래 값이 아니면 캐시된 구버전을 실행한 것이다.
const SCRIPT_VERSION = '06b-v4-direct-vs-nested-instances';

const SET_ID = '1037:2163';
const SET_NAME = 'Application Card';

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.5;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 ---------- */
const set = await figma.getNodeByIdAsync(SET_ID);
if (!set) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true, reason: SET_ID + ' 없음' });
if (set.type !== 'COMPONENT_SET') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true, reason: SET_ID + ' 는 ' + set.type });
}
if (set.name !== SET_NAME) notes.push("세트 이름이 '" + SET_NAME + "' 가 아니라 '" + set.name + "'");

/* ---------- 헬퍼 ---------- */
function sizing(n) {
  let h = null, v = null;
  try { h = n.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { v = n.layoutSizingVertical; } catch (e) { /* 무시 */ }
  return {
    H: h, V: v,
    layoutMode: n.layoutMode || null,
    primaryAxisSizingMode: n.primaryAxisSizingMode || null,
    counterAxisSizingMode: n.counterAxisSizingMode || null
  };
}
async function varOfFill(n) {
  try {
    if (!('fills' in n) || !Array.isArray(n.fills) || n.fills.length !== 1) return null;
    const p = n.fills[0];
    if (p.type !== 'SOLID' || !p.boundVariables || !p.boundVariables.color) return null;
    const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}
async function varOfStroke(n) {
  try {
    if (!Array.isArray(n.strokes) || n.strokes.length !== 1) return null;
    const p = n.strokes[0];
    if (!p.boundVariables || !p.boundVariables.color) return null;
    const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}
async function styleName(id) {
  try { const s = id ? await figma.getStyleByIdAsync(id) : null; return s ? s.name : null; }
  catch (e) { return null; }
}

/* ---------- variant 별 ---------- */
const rows = [];

for (const card of set.children) {
  const row = { variant: card.name, id: card.id, width: r2(card.width), height: r2(card.height), checks: {} };

  const header = card.findOne(n => n.name === 'header');
  const info = card.findOne(n => n.name === 'info');
  const footer = card.findOne(n => n.name === 'footer');
  const infoRows = info ? info.children.filter(c => c.name.indexOf('row / ') === 0) : [];

  row.childNames = card.children.map(c => c.name);
  row.checks.threeDirectChildren = card.children.length === 3;

  // 방향 무관 sizing
  row.sizing = {
    card: sizing(card),
    header: header ? sizing(header) : null,
    info: info ? sizing(info) : null,
    footer: footer ? sizing(footer) : null,
    rows: infoRows.map(r => ({ name: r.name, ...sizing(r) }))
  };

  row.checks.cardHeightHugs = row.sizing.card.V === 'HUG';
  row.checks.cardWidthFixed = row.sizing.card.H === 'FIXED';
  row.checks.headerHugsHeight = !!header && row.sizing.header.V === 'HUG';
  row.checks.infoHugsHeight = !!info && row.sizing.info.V === 'HUG';
  row.checks.footerHugsHeight = !!footer && row.sizing.footer.V === 'HUG';
  row.checks.headerFillsWidth = !!header && row.sizing.header.H === 'FILL';
  row.checks.infoFillsWidth = !!info && row.sizing.info.H === 'FILL';
  row.checks.footerFillsWidth = !!footer && row.sizing.footer.H === 'FILL';
  row.checks.infoRowCount4 = infoRows.length === 4;
  row.checks.infoRowsFillWidth = infoRows.length > 0 && infoRows.every(r => {
    try { return r.layoutSizingHorizontal === 'FILL'; } catch (e) { return false; }
  });
  row.checks.infoRowsHugHeight = infoRows.length > 0 && infoRows.every(r => {
    try { return r.layoutSizingVertical === 'HUG'; } catch (e) { return false; }
  });

  // 간격 규칙
  row.spacing = {
    cardPadding: [card.paddingTop, card.paddingRight, card.paddingBottom, card.paddingLeft].map(r2).join('/'),
    cardAlign: card.primaryAxisAlignItems,
    infoPaddingTop: info ? r2(info.paddingTop) : null,
    infoPaddingBottom: info ? r2(info.paddingBottom) : null,
    infoItemSpacing: info ? r2(info.itemSpacing) : null,
    footerPaddingTop: footer ? r2(footer.paddingTop) : null
  };
  row.checks.cardPadding16 = near(card.paddingTop, 16) && near(card.paddingBottom, 16) &&
                             near(card.paddingLeft, 16) && near(card.paddingRight, 16);
  row.checks.cardSpaceBetween = card.primaryAxisAlignItems === 'SPACE_BETWEEN';
  row.checks.infoPadding12 = !!info && near(info.paddingTop, 12) && near(info.paddingBottom, 12);
  row.checks.infoGap8 = !!info && near(info.itemSpacing, 8);
  row.checks.footerPaddingTop8 = !!footer && near(footer.paddingTop, 8);

  // 표면 토큰
  row.tokens = {
    cardFill: await varOfFill(card),
    cardStroke: await varOfStroke(card),
    cardEffect: await styleName(card.effectStyleId),
    cardRadius: typeof card.cornerRadius === 'number' ? r2(card.cornerRadius) : 'mixed'
  };
  row.checks.fillSurfaceDefault = row.tokens.cardFill === 'surface/default';
  row.checks.strokeBorderSubtle = row.tokens.cardStroke === 'border/subtle';
  row.checks.effectElevationCard = row.tokens.cardEffect === 'elevation/card';
  row.checks.radius8 = near(typeof card.cornerRadius === 'number' ? card.cornerRadius : NaN, 8);

  // footer 상단 구분선
  let topW = null, otherW = null;
  try {
    topW = footer.strokeTopWeight;
    otherW = [footer.strokeRightWeight, footer.strokeBottomWeight, footer.strokeLeftWeight];
  } catch (e) { notes.push('개별 stroke weight 읽기 불가: ' + e.message); }
  row.footerStroke = { top: topW, others: otherW, token: footer ? await varOfStroke(footer) : null };
  row.checks.footerTopBorderOnly = near(topW, 1) && Array.isArray(otherW) && otherW.every(w => near(w, 0));

  // 인스턴스 — findAll 은 재귀라 인스턴스 내부까지 센다.
  // Chip 마스터가 Icon 인스턴스를 품게 되면 총계가 7 에서 11 로 늘어나는데 이는 정상이다.
  // 따라서 카드가 직접 배치한 인스턴스와 컴포넌트에 딸려 온 중첩 인스턴스를 분리해서 본다.
  function nestedInsideAnotherInstance(n) {
    let p = n.parent;
    while (p && p.id !== card.id) {
      if (p.type === 'INSTANCE') return true;
      p = p.parent;
    }
    return false;
  }
  const allInsts = card.findAll(n => n.type === 'INSTANCE');
  const insts = allInsts.filter(n => !nestedInsideAnotherInstance(n));
  const nestedInsts = allInsts.filter(n => nestedInsideAnotherInstance(n));
  row.instanceCountRecursive = allInsts.length;
  row.instanceCountDirect = insts.length;
  row.instanceCountNested = nestedInsts.length;
  row.checks.sevenDirectInstances = insts.length === 7;
  const instInfo = [];
  for (const i of insts) {
    let mc = null;
    try { mc = await i.getMainComponentAsync(); }
    catch (e) { try { mc = i.mainComponent; } catch (e2) { /* 무시 */ } }
    instInfo.push({
      name: i.name,
      main: mc ? mc.name : null,
      set: mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : (mc ? '(단일 컴포넌트)' : null),
      height: r2(i.height)
    });
  }
  row.instances = instInfo;
  const setsUsed = instInfo.map(i => i.set);
  row.checks.usesChip = setsUsed.filter(s => s === 'Chip').length === 4;
  row.checks.usesStatusIndicator = setsUsed.indexOf('Status Indicator') !== -1;
  row.checks.usesIconButton = instInfo.filter(i => i.main === 'Icon Button').length === 2;

  // 중첩 인스턴스는 개수를 고정 조건으로 두지 않는다 — 컴포넌트 구조가 바뀌면 함께 변한다.
  const nestedInfo = [];
  for (const i of nestedInsts) {
    let mc = null;
    try { mc = await i.getMainComponentAsync(); }
    catch (e) { try { mc = i.mainComponent; } catch (e2) { /* 무시 */ } }
    let ownerName = null;
    let p = i.parent;
    while (p && p.id !== card.id) { if (p.type === 'INSTANCE') { ownerName = p.name; break; } p = p.parent; }
    nestedInfo.push({ name: i.name, main: mc ? mc.name : null, insideInstance: ownerName, visible: i.visible });
  }
  row.nestedInstances = nestedInfo;

  // 높이 분해 — 자식 좌표에서 직접 구한다.
  // 손으로 쓴 공식 대신 실제 y 좌표를 쓰므로, 남는 값(residual)이 곧 설명되지 않은 픽셀이다.
  const kids = card.children.map(c => ({ name: c.name, y: r2(c.y), height: r2(c.height), bottom: r2(c.y + c.height) }));
  const firstTop = kids.length ? kids[0].y : 0;
  const lastBottom = kids.length ? kids[kids.length - 1].bottom : 0;
  const gaps = [];
  for (let i = 1; i < kids.length; i++) gaps.push(r2(kids[i].y - kids[i - 1].bottom));

  // auto layout 프레임에서 stroke 가 레이아웃 크기에 포함되는지 여부
  let strokesInLayout = null, strokeAlign = null, strokeWeight = null;
  try { strokesInLayout = card.strokesIncludedInLayout; } catch (e) { notes.push('strokesIncludedInLayout 읽기 불가: ' + e.message); }
  try { strokeAlign = card.strokeAlign; } catch (e) { /* 무시 */ }
  try { strokeWeight = card.strokeWeight; } catch (e) { /* 무시 */ }

  const sumFromChildren = r2(card.paddingTop + (lastBottom - firstTop) + card.paddingBottom);
  const residual = r2(card.height - sumFromChildren);
  const strokeContribution = (strokesInLayout === true && typeof strokeWeight === 'number')
    ? r2(strokeWeight * 2) : 0;

  let residualExplainedBy;
  if (near(residual, 0)) residualExplainedBy = '없음 (자식 좌표 합과 정확히 일치)';
  else if (near(residual, strokeContribution)) residualExplainedBy =
    '루트 stroke ' + strokeWeight + 'px 상하 (strokesIncludedInLayout = true)';
  else if (near(residual, 2) && strokesInLayout !== true) residualExplainedBy =
    '2px 남지만 strokesIncludedInLayout 이 ' + strokesInLayout + ' 이라 stroke 로 설명되지 않음 — gaps / firstTop 을 볼 것';
  else residualExplainedBy = '미상 ' + residual + 'px — gaps / kids 좌표 확인 필요';

  row.heightBreakdown = {
    cardHeight: r2(card.height),
    cardPaddingTop: r2(card.paddingTop),
    cardPaddingBottom: r2(card.paddingBottom),
    children: kids,
    gapsBetweenChildren: gaps,
    itemSpacing: r2(card.itemSpacing),
    primaryAxisAlignItems: card.primaryAxisAlignItems,
    infoRows: infoRows.map(r => ({ name: r.name, h: r2(r.height) })),
    firstChildTop: firstTop,
    lastChildBottom: lastBottom,
    sumFromChildren,
    residual,
    residualExplainedBy,
    stroke: { align: strokeAlign, weight: strokeWeight, includedInLayout: strokesInLayout, contribution: strokeContribution },
    formula: '1? + padding ' + r2(card.paddingTop) + ' + ' +
             kids.map(k => k.name + ' ' + k.height).join(' + ') +
             ' + padding ' + r2(card.paddingBottom) + ' + 1? = ' + r2(card.height)
  };

  // 자식 좌표 합 + stroke 기여분이 실제 높이와 맞는지
  row.checks.breakdownMatchesHeight = near(sumFromChildren + strokeContribution, card.height);

  // absolute 배치가 남아 있는지
  const absolutes = card.findAll(n => {
    try { return n.layoutPositioning === 'ABSOLUTE'; } catch (e) { return false; }
  });
  row.absoluteCount = absolutes.length;
  row.checks.noAbsolute = absolutes.length === 0;

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  row.failedChecks = failed;
  if (failed.length) errors.push(card.name + ' 실패: ' + failed.join(', '));

  rows.push(row);
}

/* ---------- 집계 ---------- */
const nestedHug = rows.every(r => r.checks.headerHugsHeight && r.checks.infoHugsHeight && r.checks.footerHugsHeight);
const cardHugs = rows.every(r => r.checks.cardHeightHugs);
const allInstancesPresent = rows.every(r => r.checks.sevenDirectInstances);
const directCompositionOk = rows.every(r => r.checks.usesChip && r.checks.usesStatusIndicator && r.checks.usesIconButton);
const nestedInstanceSummary = rows.map(r => ({
  variant: r.variant,
  direct: r.instanceCountDirect,
  nested: r.instanceCountNested,
  recursiveTotal: r.instanceCountRecursive,
  nestedBreakdown: r.nestedInstances.map(n => (n.main || '?') + ' in ' + (n.insideInstance || '?'))
}));
const spacingOk = rows.every(r => r.checks.cardPadding16 && r.checks.infoPadding12 && r.checks.infoGap8 && r.checks.footerPaddingTop8);
const tokensOk = rows.every(r => r.checks.fillSurfaceDefault && r.checks.strokeBorderSubtle && r.checks.effectElevationCard && r.checks.radius8);
const reuseOk = rows.every(r => r.checks.usesChip && r.checks.usesStatusIndicator && r.checks.usesIconButton);
const noAbsolute = rows.every(r => r.checks.noAbsolute);
const heights = rows.map(r => r.height);
const heightsEqual = heights.length < 2 || Math.abs(heights[0] - heights[1]) < 0.5;

return out({
  scriptVersion: SCRIPT_VERSION,
  hasResidualFields: true,   // 이 키가 없으면 구버전이다
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,
  componentSetId: SET_ID,
  componentSetName: set.name,
  variantCount: set.children.length,
  axisNote: 'info 는 VERTICAL 이라 counterAxisSizingMode 가 폭을 뜻한다. 높이 판정은 layoutSizingVertical 로 한다.',
  nestedHug,
  cardHugs,
  allInstancesPresent,
  directCompositionOk,
  nestedInstanceSummary,
  instanceCountNote: "findAll 은 재귀라 Chip 내부 Icon 인스턴스까지 센다. 성공 조건은 카드가 직접 배치한 7개이고, 중첩분은 개수를 고정하지 않고 내역만 본다.",
  spacingOk,
  tokensOk,
  reuseOk,
  noAbsolute,
  heightsEqual,
  measuredHeights: heights,
  heightPolicy: 'content hug 실측값이 정상값이다. 216 같은 숫자에 맞추지 않는다.',
  breakdownMatchesHeight: rows.every(r => r.checks.breakdownMatchesHeight),
  residuals: rows.map(r => ({
    variant: r.variant,
    residual: r.heightBreakdown.residual,
    explainedBy: r.heightBreakdown.residualExplainedBy,
    stroke: r.heightBreakdown.stroke
  })),
  variants: rows,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
