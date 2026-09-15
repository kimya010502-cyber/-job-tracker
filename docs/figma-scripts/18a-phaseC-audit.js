/* ============================================================================
 * 줍줍 — 스크립트 18a
 * Phase C 사전 감사: '지원 기록 추가' Primary Button (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing= 를 한 줄도 포함하지 않는다.
 *
 * 대상은 1개뿐이지만 **id 를 추측으로 확정하지 않는다.**
 * 이전 감사에서 1009:709 로 보였으나, 그때는 "여분" 으로 분류만 하고 지나갔다.
 * Reset 때처럼 구조로 다시 찾고 근거를 남긴다.
 *
 * Phase B 에서 배운 것을 반영한다
 *   폭 예측식(마스터 폭 − 마스터 라벨 + 우리 라벨 + leading)이 Reset 에서 **16px 빗나갔다.**
 *   원인을 모른 채 같은 식을 또 쓰지 않는다. 마스터 내부를 직접 재서
 *   `보이는 자식 폭 합 + gap + padding == 마스터 폭` 이 성립하는지 먼저 확인하고,
 *   성립하지 않으면 그 마스터의 폭 예측을 신뢰하지 말라고 표시한다.
 *   또 라벨 폭·gap·padding 을 **대상 variant 에서** 읽는다 (variants[0] 이 아니라).
 * ========================================================================== */

const SCRIPT_VERSION = '18a-v2-phaseC-audit';

const MAIN_ID = '1002:2';
const BUTTON_SET_ID = '1029:1997';
const TARGET_VARIANT = 'variant=primary';
const LEADING_ICON = 'Icon / Plus';

/* 이전 감사에서 보였던 id. 확정이 아니라 **대조용** 이다. */
const EXPECTED_ID = '1009:709';
const TARGET_TEXT_RE = /기록\s*추가|지원\s*기록|추가/;

/* 이미 교체가 끝난 구역은 제외한다 */
const EXCLUDE_CONTAINERS = [
  { id: '1003:1695', label: '툴바 (Phase B 완료)' },
  { id: '1002:140',  label: '카드 그리드 (Phase E)' },
  { id: '1002:23',   label: 'KPI Strip (Phase D)' },
  { id: '1002:458',  label: '페이지네이션 (Phase F)' },
  { id: '1002:511',  label: '사이드바 Nav (Phase F)' }
];

const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];
const LEADING_SLOT = 16;

const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const kids = n => Array.isArray(n.children) ? n.children : null;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function hex(c) {
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(c.r) + h(c.g) + h(c.b);
}
async function paintInfo(paints) {
  if (!Array.isArray(paints) || !paints.length) return null;
  const list = [];
  for (const p of paints) {
    const rec = { type: p.type, visible: p.visible !== false,
                  opacity: r2(p.opacity === undefined ? 1 : p.opacity) };
    if (p.type === 'SOLID') rec.hex = hex(p.color);
    if (p.boundVariables && p.boundVariables.color) {
      try {
        const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
        rec.variable = v ? v.name : '(이름 못 읽음)';
      } catch (e) { rec.variable = '(조회 실패)'; }
    } else rec.variable = null;
    list.push(rec);
  }
  return list;
}
async function styleNameOf(id) {
  try { if (!id) return null; const s = await figma.getStyleByIdAsync(id); return s ? s.name : null; }
  catch (e) { return null; }
}
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
function insideId(n, targetId) {
  let p = n.parent;
  while (p) { if (p.id === targetId) return true; p = p.parent; }
  return false;
}
function insideInstance(n) {
  let p = n.parent;
  while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; }
  return false;
}
function ancestry(n) {
  const chain = [];
  let p = n.parent;
  while (p) { chain.push(p.name + ' (' + p.id + ')'); if (p.id === MAIN_ID) break; p = p.parent; }
  return chain;
}
function hasPaint(n) {
  return (Array.isArray(n.fills) && n.fills.some(f => f.visible !== false)) ||
         (Array.isArray(n.strokes) && n.strokes.length > 0);
}

/* ---------- 노드 상세 ---------- */
async function describe(n) {
  const d = { id: n.id, name: n.name, type: n.type,
              size: r2(n.width) + '×' + r2(n.height),
              width: r2(n.width), height: r2(n.height),
              x: r2(n.x), y: r2(n.y), visible: n.visible };
  if ('layoutMode' in n) {
    d.layoutMode = n.layoutMode;
    d.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/');
    d.paddingH = r2((n.paddingLeft || 0) + (n.paddingRight || 0));
    d.paddingV = r2((n.paddingTop || 0) + (n.paddingBottom || 0));
    d.gap = r2(n.itemSpacing);
    d.primaryAxisAlignItems = n.primaryAxisAlignItems;
    d.counterAxisAlignItems = n.counterAxisAlignItems;
    d.primaryAxisSizingMode = n.primaryAxisSizingMode;
    d.counterAxisSizingMode = n.counterAxisSizingMode;
  }
  if ('cornerRadius' in n) d.cornerRadius = typeof n.cornerRadius === 'number' ? r2(n.cornerRadius) : 'mixed';
  if ('layoutPositioning' in n) d.layoutPositioning = n.layoutPositioning;
  if ('layoutGrow' in n) d.layoutGrow = n.layoutGrow;
  if ('layoutAlign' in n) d.layoutAlign = n.layoutAlign;
  if ('clipsContent' in n) d.clipsContent = n.clipsContent;
  if (n.constraints) d.constraints = n.constraints.horizontal + '/' + n.constraints.vertical;
  try { d.layoutSizingHorizontal = n.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { d.layoutSizingVertical = n.layoutSizingVertical; } catch (e) { /* 무시 */ }
  if ('fills' in n) d.fills = await paintInfo(n.fills);
  if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
    d.strokes = await paintInfo(n.strokes);
    d.strokeWeight = r2(n.strokeWeight);
  }
  if ('effectStyleId' in n) d.effectStyle = await styleNameOf(n.effectStyleId);
  d.children = (kids(n) || []).map(c => ({ id: c.id, name: c.name, type: c.type,
    size: r2(c.width) + '×' + r2(c.height), visible: c.visible,
    layoutPositioning: 'layoutPositioning' in c ? c.layoutPositioning : null }));
  return d;
}
async function textDetail(t) {
  if (!t) return null;
  const d = { id: t.id, name: t.name, characters: t.characters,
              width: r2(t.width), height: r2(t.height),
              textStyle: await styleNameOf(t.textStyleId) };
  try {
    d.fontName = typeof t.fontName === 'object' ? t.fontName.family + ' ' + t.fontName.style : 'mixed';
    d.fontSize = r2(t.fontSize);
    d.lineHeight = typeof t.lineHeight === 'object'
      ? (t.lineHeight.unit === 'AUTO' ? 'AUTO' : r2(t.lineHeight.value) + t.lineHeight.unit) : 'mixed';
  } catch (e) { /* 무시 */ }
  const pi = await paintInfo(t.fills);
  const h = (pi || []).filter(x => x.hex)[0];
  d.color = h ? h.hex : null;
  d.colorVariable = h ? h.variable : null;
  return d;
}

/* ---------- 대상 찾기 ---------- */
const main = await figma.getNodeByIdAsync(MAIN_ID);
if (!main) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                        reason: MAIN_ID + ' 을 찾을 수 없음' });

function excluded(n) {
  for (const c of EXCLUDE_CONTAINERS) if (insideId(n, c.id)) return c.label;
  if (insideInstance(n)) return '기존 component instance 내부';
  return null;
}

/* 텍스트가 맞는 노드를 모으고, 아이콘+라벨을 둘 다 품은 가장 안쪽을 몸통으로 본다
 * (Reset 에서 쓴 것과 같은 규칙. 배경 유무는 조건이 아니다) */
const textMatch = collectDeep(main, function (c) {
  if (c.type === 'TEXT') return false;
  if (excluded(c)) return false;
  const t = collectDeep(c, x => x.type === 'TEXT', 10).map(x => x.characters).join(' ');
  return TARGET_TEXT_RE.test(t);
}, 10);

function iconDesc(n) {
  return collectDeep(n, c => SHAPE_TYPES.indexOf(c.type) >= 0 ||
                             (c.type === 'INSTANCE' && /icon/i.test(c.name)), 8);
}
function innermost(set) {
  return set.filter(function (n) {
    return !set.some(function (m) {
      if (m.id === n.id) return false;
      let q = m.parent;
      while (q) { if (q.id === n.id) return true; q = q.parent; }
      return false;
    });
  });
}
/* 후보가 대상 밖 텍스트까지 품고 있으면 **너무 위로 올라간 것** 이다.
 * 아이콘이 몸통 밖 형제로 붙어 있는 구조(Phase B 의 accessory 와 같은 모양)에서는
 * "아이콘과 라벨을 둘 다 품은 노드" 가 상위 행이 되어버려 엉뚱한 노드를 몸통으로 잡는다.
 * 그래서 자손 텍스트가 **전부** 대상 문구여야 후보로 남긴다. */
function textsAllMatch(n) {
  const ts = collectDeep(n, x => x.type === 'TEXT', 10)
    .map(x => (x.characters || '').trim()).filter(x => x.length > 0);
  return ts.length > 0 && ts.every(x => TARGET_TEXT_RE.test(x));
}
const tightCands = textMatch.filter(textsAllMatch);

function inControlHeight(n) {
  return typeof n.height === 'number' && n.height >= 24 && n.height <= 48;
}

const withIcon = tightCands.filter(c => iconDesc(c).length > 0);
const bodyCands = innermost(withIcon).filter(inControlHeight);
const fallbackCands = innermost(tightCands.filter(c =>
  'layoutMode' in c && c.layoutMode !== 'NONE' &&
  ((c.paddingLeft || 0) + (c.paddingRight || 0) > 0 || hasPaint(c)))).filter(inControlHeight);

const candidates = [];
for (const c of textMatch) {
  const texts = collectDeep(c, x => x.type === 'TEXT', 10).map(x => x.characters);
  candidates.push({ id: c.id, name: c.name, type: c.type,
    size: r2(c.width) + '×' + r2(c.height), texts,
    textsAllMatchTarget: textsAllMatch(c),
    heightInControlRange: inControlHeight(c),
    excludedReason: !textsAllMatch(c) ? '대상 밖 텍스트를 품고 있다 — 너무 위로 올라간 노드'
      : (!inControlHeight(c) ? '높이 ' + r2(c.height) + ' 가 컨트롤 범위(24~48) 밖' : null),
    iconDescendantCount: iconDesc(c).length,
    iconDescendantIds: iconDesc(c).map(x => x.id),
    hasPaint: hasPaint(c), childCount: (kids(c) || []).length,
    isInnermostWithIconAndText: bodyCands.some(b => b.id === c.id),
    ancestry: ancestry(c) });
}

let body = null, how = null;
if (bodyCands.length === 1) { body = bodyCands[0]; how = 'descendant text + structure (icon+label, innermost)'; }
else if (bodyCands.length === 0 && fallbackCands.length === 1) {
  body = fallbackCands[0]; how = 'descendant text + structure (padded auto layout, innermost) — 아이콘 자손 없음';
}

/* ---------- 대상 상세 ---------- */
let target = null;
if (body) {
  const label = collectDeep(body, c => c.type === 'TEXT', 10)[0];
  const icons = iconDesc(body);
  const parent = body.parent;
  const pcs = parent ? (kids(parent) || []) : [];

  /* 아이콘이 몸통 안에 있는지, 밖에 형제로 붙어 있는지 (툴바에서 겪은 문제) */
  const iconsInside = icons.filter(i => { let q = i.parent;
    while (q) { if (q.id === body.id) return true; q = q.parent; } return false; });
  const siblingAccessories = pcs.filter(c => c.id !== body.id &&
    collectDeep(c, x => x.type === 'TEXT', 6).length === 0 &&
    collectDeep(c, x => SHAPE_TYPES.indexOf(x.type) >= 0, 6).length > 0);

  target = {
    id: body.id, resolvedBy: how,
    matchesExpectedId: body.id === EXPECTED_ID,
    expectedId: EXPECTED_ID,
    self: await describe(body),
    label: await textDetail(label),
    ancestry: ancestry(body),
    iconDescendants: [],
    iconInsideBody: iconsInside.length,
    iconOutsideBody: icons.length - iconsInside.length,
    siblingAccessories: [],
    parent: parent ? await describe(parent) : null,
    indexAtAuditTime: parent ? pcs.indexOf(body) : -1,
    siblings: pcs.map((c, i) => ({ index: i, id: c.id, name: c.name, type: c.type,
      size: r2(c.width) + '×' + r2(c.height), visible: c.visible,
      layoutPositioning: 'layoutPositioning' in c ? c.layoutPositioning : null,
      isTarget: c.id === body.id }))
  };
  for (const i of icons) {
    target.iconDescendants.push({ id: i.id, name: i.name, type: i.type,
      size: r2(i.width) + '×' + r2(i.height), visible: i.visible,
      insideBody: iconsInside.some(x => x.id === i.id),
      layoutPositioning: 'layoutPositioning' in i ? i.layoutPositioning : null,
      fills: await paintInfo(i.fills) });
  }
  for (const a of siblingAccessories) {
    target.siblingAccessories.push({ id: a.id, name: a.name, type: a.type,
      size: r2(a.width) + '×' + r2(a.height), visible: a.visible,
      layoutPositioning: 'layoutPositioning' in a ? a.layoutPositioning : null,
      note: '아이콘이 몸통 밖 형제로 붙어 있으면 툴바 때처럼 같이 숨겨야 한다' });
  }
  target.iconIsSeparateAccessory = siblingAccessories.length > 0;
  target.iconStructure = target.iconIsSeparateAccessory
    ? '몸통 밖 형제 (' + siblingAccessories.length + '개) — Phase B 의 accessory 와 같은 처리 필요'
    : (iconsInside.length > 0 ? '몸통 안 (' + iconsInside.length + '개) — 원본을 숨기면 같이 사라진다'
                              : '아이콘 없음');
}

/* ---------- 새 Button 마스터 ---------- */
const set = await figma.getNodeByIdAsync(BUTTON_SET_ID);
let master = null;
if (set && set.type === 'COMPONENT_SET') {
  let leadingProp = null;
  try {
    leadingProp = Object.keys(set.componentPropertyDefinitions)
      .find(k => k.split('#')[0] === 'leading') || null;
  } catch (e) { /* 무시 */ }
  const v = set.children.filter(c => c.name === TARGET_VARIANT)[0] || null;

  master = { setId: set.id, name: set.name, leadingPropertyKey: leadingProp,
             variantNames: set.children.map(c => c.name),
             targetVariant: TARGET_VARIANT, variantExists: !!v };

  if (v) {
    /* **대상 variant 에서** 읽는다. Phase B 는 variants[0](primary) 에서 라벨·gap 을 읽고
     * 폭은 ghost 에서 읽어, 두 값이 다른 variant 에서 온 상태로 계산했다. */
    const vLabel = collectDeep(v, c => c.type === 'TEXT', 4)[0];
    const vLead = (kids(v) || []).filter(c => c.name === 'leading')[0] || null;
    master.variant = await describe(v);
    master.variantLabel = await textDetail(vLabel);
    master.variantLeading = vLead ? { id: vLead.id, type: vLead.type, visible: vLead.visible,
      size: r2(vLead.width) + '×' + r2(vLead.height) } : null;
    let vLeadIcon = null;
    if (vLead && vLead.type === 'INSTANCE') {
      try { const m = await vLead.getMainComponentAsync(); vLeadIcon = m ? m.name : null; }
      catch (e) { try { vLeadIcon = vLead.mainComponent ? vLead.mainComponent.name : null; } catch (e2) { /* 무시 */ } }
    }
    master.variantLeadingIcon = vLeadIcon;
    master.leadingDefaultIsPlus = vLeadIcon === LEADING_ICON;

    /* ---- 마스터 자체 산술 검증 ----
     * Phase B 에서 Reset 폭이 16px 빗나갔는데 원인을 모른다.
     * 이 식이 그 마스터에서 성립하는지 **먼저 확인**하고, 안 되면 예측을 믿지 말라고 표시한다. */
    const vcs = kids(v) || [];
    const visible = vcs.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
    const hidden = vcs.filter(c => c.visible === false);
    const padH = r2((v.paddingLeft || 0) + (v.paddingRight || 0));
    const gap = r2(v.itemSpacing || 0);
    const sumVisible = r2(visible.reduce((a, c) => a + c.width, 0));
    const computed = r2(sumVisible + gap * Math.max(0, visible.length - 1) + padH);
    const computedIfLeadingVisible = r2(sumVisible + (hidden.length ? hidden[0].width : 0) +
      gap * Math.max(0, visible.length + (hidden.length ? 1 : 0) - 1) + padH);

    master.arithmeticCheck = {
      measuredWidth: r2(v.width),
      visibleChildren: visible.map(c => ({ id: c.id, name: c.name, width: r2(c.width) })),
      hiddenChildren: hidden.map(c => ({ id: c.id, name: c.name, width: r2(c.width) })),
      paddingH: padH, gap,
      computedFromVisibleChildren: computed,
      matchesMeasured: Math.abs(computed - v.width) < 0.5,
      computedIfLeadingWereVisible: computedIfLeadingVisible,
      note: 'matchesMeasured 가 false 면 마스터 폭이 보이는 자식 합으로 설명되지 않는다는 뜻이다. ' +
            '그 경우 폭 예측식의 전제가 깨지므로 예측을 신뢰하지 않는다.'
    };
    if (!master.arithmeticCheck.matchesMeasured) {
      notes.push('Button ' + TARGET_VARIANT + ' 마스터 폭 ' + r2(v.width) +
        ' 이 보이는 자식 합 ' + computed + ' 와 다르다 — 폭 예측을 확정값으로 쓰지 말 것');
    }
  }
}

/* ---------- 아이콘 ---------- */
const iconComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] })
  .filter(c => (!c.parent || c.parent.type !== 'COMPONENT_SET') && c.name.indexOf('Icon / ') === 0);
const plusIcon = iconComps.filter(c => c.name === LEADING_ICON)[0] || null;

/* ---------- variant 대조 (색을 임의로 정하지 않는다) ---------- */
let variantMatch = null;
if (target && set && set.type === 'COMPONENT_SET') {
  const curFill = (target.self.fills || []).filter(f => f.hex)[0];
  const curStroke = (target.self.strokes || []).filter(f => f.hex)[0];
  const rows = [];
  for (const v of set.children) {
    const vf = await paintInfo(v.fills);
    const vs = Array.isArray(v.strokes) && v.strokes.length ? await paintInfo(v.strokes) : null;
    const h = (vf || []).filter(f => f.hex)[0];
    const sk = (vs || []).filter(f => f.hex)[0];
    rows.push({ variant: v.name, fill: h ? h.hex : null, stroke: sk ? sk.hex : null,
      backgroundMatches: (!!h) === (!!curFill) &&
        (!h || !curFill || h.hex.toLowerCase() === curFill.hex.toLowerCase()),
      borderMatches: (!!sk) === (!!curStroke) &&
        (!sk || !curStroke || sk.hex.toLowerCase() === curStroke.hex.toLowerCase()) });
  }
  const full = rows.filter(v => v.backgroundMatches && v.borderMatches);
  variantMatch = {
    currentFill: curFill ? curFill.hex : null,
    currentFillVariable: curFill ? curFill.variable : null,
    currentStroke: curStroke ? curStroke.hex : null,
    currentRadius: target.self.cornerRadius,
    comparison: rows,
    fullMatches: full.map(v => v.variant),
    suggestedVariant: full.length === 1 ? full[0].variant : null,
    requestedVariant: TARGET_VARIANT,
    suggestionAgreesWithRequest: full.length === 1 && full[0].variant === TARGET_VARIANT,
    decision: full.length === 1
      ? '배경·테두리가 모두 일치하는 variant 가 ' + full[0].variant + ' 하나뿐이다'
      : (full.length === 0 ? '일치하는 variant 가 없다 — 사람이 정해야 한다'
                           : '일치하는 variant 가 ' + full.length + '개다 — 사람이 정해야 한다')
  };
  if (variantMatch.suggestedVariant && !variantMatch.suggestionAgreesWithRequest) {
    notes.push('색 대조로는 ' + variantMatch.suggestedVariant + ' 인데 요청은 ' + TARGET_VARIANT +
               ' 다 — 어느 쪽이 맞는지 확인이 필요하다');
  }
}

/* ---------- 폭·높이 예측 ---------- */
let prediction = null;
if (target && master && master.variantExists) {
  const mv = master.variant;
  const ml = master.variantLabel;
  const cl = target.label;
  const leadVisibleNow = master.variantLeading ? master.variantLeading.visible : false;
  const addLeading = leadVisibleNow ? 0 : r2(mv.gap + LEADING_SLOT);

  /* Phase C 는 라벨을 그대로 옮긴다 (현재 문구를 읽어서 그대로 쓴다) —
   * 문구 동일 여부는 구성상 항상 참이라 조건으로 두지 않는다. 대신 typography 만 본다. */
  const fontSizeSame = !!(cl && ml && Math.abs(ml.fontSize - cl.fontSize) < 0.01);
  const fontNameSame = !!(cl && ml && ml.fontName === cl.fontName);
  const labelWidthUsed = (fontSizeSame && fontNameSame && cl) ? cl.width
    : (cl && ml ? r2(cl.width * (ml.fontSize / cl.fontSize)) : null);

  let sizingH = mv.layoutSizingHorizontal;
  const base = sizingH === 'FIXED' ? r2(mv.width)
    : (labelWidthUsed === null || !ml ? null : r2(mv.width - ml.width + labelWidthUsed + addLeading));

  prediction = {
    masterWidthMode: sizingH,
    masterWidth: mv.width, masterLabelWidth: ml ? ml.width : null,
    currentLabelWidth: cl ? cl.width : null,
    currentLabelFontSize: cl ? cl.fontSize : null,
    masterLabelFontSize: ml ? ml.fontSize : null,
    currentLabelFont: cl ? cl.fontName : null,
    masterLabelFont: ml ? ml.fontName : null,
    labelCarriedOverUnchanged: true,
    fontSizeSame, fontNameSame,
    predictionKind: (fontSizeSame && fontNameSame) ? 'measuredLabel' : 'estimate',
    labelWidthUsed,
    leadingAddition: addLeading,
    leadingAlreadyVisibleInMaster: leadVisibleNow,
    predictedWidth: base,
    predictedHeight: r2(mv.height),
    currentWidth: target.self.width, currentHeight: target.self.height,
    widthDelta: base === null ? null : r2(base - target.self.width),
    heightDelta: r2(mv.height - target.self.height),
    /* Phase B 의 실패를 값으로 달고 다닌다 */
    formulaTrustworthy: master.arithmeticCheck ? master.arithmeticCheck.matchesMeasured : null,
    phaseBMiss: 'Phase B 에서 같은 식이 Reset 폭을 66 으로 예측했으나 실측은 82 였다 (16px, leading 슬롯 폭과 동일). ' +
                '원인 미확인. formulaTrustworthy 가 false 면 이 예측을 쓰지 말고 교체 후 실측으로 판단할 것.',
    caution: '이 값은 참고용이다. 최종 폭은 교체 후 검증기에서 실측한다.'
  };
}

/* ---------- 부모 레이아웃 영향 ---------- */
let layoutImpact = null;
if (target && prediction) {
  const parent = await figma.getNodeByIdAsync(target.parent.id);
  const pcs = kids(parent) || [];
  const inFlow = pcs.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
  const hiddenAfter = [target.id].concat(target.siblingAccessories.map(a => a.id));
  const remain = inFlow.filter(c => hiddenAfter.indexOf(c.id) < 0);
  const padH = r2((parent.paddingLeft || 0) + (parent.paddingRight || 0));
  const padV = r2((parent.paddingTop || 0) + (parent.paddingBottom || 0));
  const gap = r2(parent.itemSpacing || 0);
  const mode = 'layoutMode' in parent ? parent.layoutMode : 'NONE';
  const widths = remain.map(c => c.width).concat(prediction.predictedWidth === null ? [] : [prediction.predictedWidth]);
  const heights = remain.map(c => c.height).concat([prediction.predictedHeight]);
  const mx = a => a.length ? Math.max.apply(null, a) : 0;
  const sum = a => a.reduce((x, y) => x + y, 0);
  let sh = null, sv = null;
  try { sh = parent.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { sv = parent.layoutSizingVertical; } catch (e) { /* 무시 */ }

  const cW = mode === 'HORIZONTAL' ? r2(sum(widths) + gap * Math.max(0, widths.length - 1) + padH)
           : (mode === 'VERTICAL' ? r2(mx(widths) + padH) : null);
  const cH = mode === 'HORIZONTAL' ? r2(mx(heights) + padV)
           : (mode === 'VERTICAL' ? r2(sum(heights) + gap * Math.max(0, heights.length - 1) + padV) : null);

  layoutImpact = {
    parentId: parent.id, parentName: parent.name, layoutMode: mode,
    sizingHorizontal: sh, sizingVertical: sv,
    currentSize: r2(parent.width) + '×' + r2(parent.height),
    paddingH: padH, paddingV: padV, gap,
    contributingSiblings: remain.map(c => ({ id: c.id, name: c.name,
      size: r2(c.width) + '×' + r2(c.height) })),
    contentWidthAfter: cW, contentHeightAfter: cH,
    predictedWidth: (sh === 'HUG' && cW !== null) ? cW : r2(parent.width),
    predictedHeight: (sv === 'HUG' && cH !== null) ? cH : r2(parent.height),
    widthGrowthPx: (sh === 'HUG' && cW !== null) ? r2(cW - parent.width) : 0,
    heightGrowthPx: (sv === 'HUG' && cH !== null) ? r2(cH - parent.height) : 0,
    note: 'HUG 인 축만 예측값을 쓴다. 고정 축은 자식이 커져도 부모가 안 변한다.'
  };
  layoutImpact.parentActuallyGrows = layoutImpact.widthGrowthPx > 0.5 || layoutImpact.heightGrowthPx > 0.5;
}

/* ---------- gate ---------- */
const resolvedLabelMatches = !!(target && target.label &&
  TARGET_TEXT_RE.test(target.label.characters || ''));

const gate = {
  targetResolved: !!target,
  resolvedLabelIsTarget: resolvedLabelMatches,
  targetIsSingleCandidate: bodyCands.length === 1 || (bodyCands.length === 0 && fallbackCands.length === 1),
  buttonSetFound: !!(master && master.variantExists),
  primaryVariantExists: !!(master && master.variantExists),
  leadingPropertyExists: !!(master && master.leadingPropertyKey),
  plusIconFound: !!plusIcon,
  leadingDefaultIsPlus: !!(master && master.leadingDefaultIsPlus),
  iconStructureResolved: !!(target && target.iconStructure),
  variantChoiceResolved: !!(variantMatch && variantMatch.suggestedVariant),
  masterArithmeticValid: !!(master && master.arithmeticCheck && master.arithmeticCheck.matchesMeasured),
  layoutImpactMeasurable: !!(layoutImpact && prediction && prediction.predictedWidth !== null)
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,

  gate, gatePassed,

  candidateCount: candidates.length,
  candidates,
  resolvedId: target ? target.id : null,
  matchesExpectedId: target ? target.matchesExpectedId : null,
  expectedIdFromPriorAudit: EXPECTED_ID,
  resolvedBy: how,
  resolvedLabel: target && target.label ? target.label.characters : null,
  candidateFilterNote: '자손 텍스트가 전부 대상 문구인 노드만 후보로 둔다. ' +
                       '대상 밖 텍스트를 품고 있으면 상위 컨테이너를 몸통으로 오인한 것이다. ' +
                       'excludedReason 에 걸러진 이유가 남는다.',
  resolutionNote: 'Reset 때와 같은 규칙이다 — 아이콘과 라벨을 둘 다 품은 가장 안쪽 노드. ' +
                  '배경 유무는 조건이 아니다 (ghost 를 놓치지 않기 위해).',

  target,
  iconStructure: target ? target.iconStructure : null,
  iconIsSeparateAccessory: target ? target.iconIsSeparateAccessory : null,

  master,
  plusIcon: plusIcon ? { id: plusIcon.id, name: plusIcon.name, key: plusIcon.key } : null,
  variantMatch,

  prediction,
  layoutImpact,

  proposedMapping: target && master ? {
    oldBodyToHide: target.id,
    oldAccessoriesToHide: target.siblingAccessories.map(a => a.id),
    newComponentSet: BUTTON_SET_ID,
    newVariant: TARGET_VARIANT,
    label: target.label ? target.label.characters : null,
    leadingIcon: LEADING_ICON,
    leadingVisible: true,
    deletePolicy: '삭제하지 않는다. visible = false 로 보존한다',
    insertion: '원본의 현재 index 에 삽입하고, index 는 APPLY 직전에 다시 계산한다'
  } : null,

  notes,
  nextStep: 'gatePassed = true 이면 Phase C DRY_RUN(18)과 검증기(18b)를 씁니다. ' +
            'masterArithmeticValid 가 false 면 폭 예측을 신뢰하지 않고 실측 기준으로 진행합니다.'
});
