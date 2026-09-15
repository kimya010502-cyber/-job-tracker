/* ============================================================================
 * 줍줍 — 스크립트 19a
 * Phase D 사전 감사: KPI Card 4개 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing= 를 한 줄도 포함하지 않는다.
 *
 * 이전 값을 하드코딩하지 않는다. KPI Strip 의 현재 상태를 다시 읽는다.
 *
 * variant 매핑을 감으로 정하지 않는다
 *   두 가지 **측정 가능한** 신호를 따로 읽고, 둘이 일치할 때만 확신한다.
 *     색 신호   현재 배지의 배경·글자색이 어느 variant 의 배지와 맞는가
 *     문구 신호 보조 문구에 +/− 나 증가·감소·탈락 같은 말이 있는가
 *   둘이 어긋나면 그대로 보고하고 confidence 를 낮춘다. 한쪽만 보고 정하지 않는다.
 *
 * FILL 여부가 이번 단계의 핵심이다
 *   마스터 폭만 보고 판단하면 안 된다. 현재 카드가 strip 안에서 FILL 로 늘어나 있으면
 *   새 인스턴스에도 같은 설정을 해줘야 하고, 안 하면 카드가 마스터 폭으로 쪼그라든다.
 * ========================================================================== */

const SCRIPT_VERSION = '19a-v1-phaseD-audit';

const STRIP_ID = '1002:23';
const KPI_SET_ID = '1033:2085';

const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];

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
async function firstPaint(n) {
  if (!n || !('fills' in n)) return null;
  const pi = await paintInfo(n.fills);
  return (pi || []).filter(x => x.hex)[0] || null;
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
async function textDetail(t) {
  if (!t) return null;
  const d = { id: t.id, name: t.name, characters: t.characters,
              width: r2(t.width), height: r2(t.height),
              x: r2(t.x), y: r2(t.y),
              textStyle: await styleNameOf(t.textStyleId) };
  try {
    d.fontName = typeof t.fontName === 'object' ? t.fontName.family + ' ' + t.fontName.style : 'mixed';
    d.fontSize = r2(t.fontSize);
  } catch (e) { /* 무시 */ }
  const p = await firstPaint(t);
  d.color = p ? p.hex : null;
  d.colorVariable = p ? p.variable : null;
  return d;
}
async function boxDetail(n) {
  const d = { id: n.id, name: n.name, type: n.type,
              size: r2(n.width) + '×' + r2(n.height),
              width: r2(n.width), height: r2(n.height), x: r2(n.x), visible: n.visible };
  if ('layoutMode' in n) {
    d.layoutMode = n.layoutMode;
    d.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r2).join('/');
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
  try { d.layoutSizingHorizontal = n.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  try { d.layoutSizingVertical = n.layoutSizingVertical; } catch (e) { /* 무시 */ }
  if ('fills' in n) d.fills = await paintInfo(n.fills);
  if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
    d.strokes = await paintInfo(n.strokes);
    d.strokeWeight = r2(n.strokeWeight);
  }
  if ('effectStyleId' in n) d.effectStyle = await styleNameOf(n.effectStyleId);
  if ('effects' in n && Array.isArray(n.effects) && n.effects.length) {
    d.effects = n.effects.map(e => e.type + (e.radius !== undefined ? ' r' + r2(e.radius) : ''));
  }
  return d;
}

/* ---------- KPI Strip ---------- */
const strip = await figma.getNodeByIdAsync(STRIP_ID);
if (!strip) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                         reason: 'KPI Strip ' + STRIP_ID + ' 을 찾을 수 없음' });

const stripInfo = await boxDetail(strip);
const stripChildren = kids(strip) || [];
const inFlow = stripChildren.filter(c => c.layoutPositioning !== 'ABSOLUTE' && c.visible !== false);
stripInfo.childCount = stripChildren.length;
stripInfo.inFlowVisibleCount = inFlow.length;
stripInfo.paddingH = r2((strip.paddingLeft || 0) + (strip.paddingRight || 0));
stripInfo.paddingV = r2((strip.paddingTop || 0) + (strip.paddingBottom || 0));
stripInfo.childSummary = [];
for (const c of stripChildren) {
  stripInfo.childSummary.push({
    index: stripChildren.indexOf(c), id: c.id, name: c.name, type: c.type,
    size: r2(c.width) + '×' + r2(c.height), visible: c.visible,
    layoutGrow: 'layoutGrow' in c ? c.layoutGrow : null,
    layoutAlign: 'layoutAlign' in c ? c.layoutAlign : null,
    sizingH: (function () { try { return c.layoutSizingHorizontal; } catch (e) { return null; } })(),
    sizingV: (function () { try { return c.layoutSizingVertical; } catch (e) { return null; } })()
  });
}

/* ---------- 카드 4개 찾기 ----------
 * 이미 교체된 인스턴스는 제외하고, 카드처럼 생긴 in-flow 자식을 모은다. */
async function isKpiInstance(n) {
  if (!n || n.type !== 'INSTANCE') return false;
  try {
    const mc = await n.getMainComponentAsync();
    return !!(mc && mc.parent && mc.parent.id === KPI_SET_ID);
  } catch (e) { return false; }
}
const cardNodes = [];
const alreadyReplaced = [];
for (const c of inFlow) {
  if (await isKpiInstance(c)) { alreadyReplaced.push(c.id); continue; }
  const texts = collectDeep(c, x => x.type === 'TEXT', 6);
  if (texts.length >= 2) cardNodes.push(c);
}
if (alreadyReplaced.length) {
  notes.push('이미 KPI 인스턴스인 자식이 ' + alreadyReplaced.length + '개 있다: ' +
             alreadyReplaced.join(', ') + ' — 교체 대상에서 제외한다');
}

/* ---------- 카드별 상세 ---------- */
const numRe = /^[0-9][0-9,.]*$/;
const cards = [];
for (const c of cardNodes) {
  const rec = { id: c.id, index: stripChildren.indexOf(c), parentId: strip.id };
  rec.box = await boxDetail(c);

  const texts = collectDeep(c, x => x.type === 'TEXT', 6);
  rec.textNodes = [];
  for (const t of texts) rec.textNodes.push(await textDetail(t));

  /* 역할 추정 — 위치(y)와 글자 크기로 나눈다. 이름에 기대지 않는다. */
  const byY = rec.textNodes.slice().sort((a, b) => a.y - b.y);
  const biggest = rec.textNodes.slice().sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0] || null;
  rec.title = byY.length ? byY[0] : null;
  rec.value = biggest;
  rec.unit = rec.textNodes.filter(t => /^[가-힣a-zA-Z%]{1,3}$/.test((t.characters || '').trim()) &&
                                       t.id !== (rec.value ? rec.value.id : null))[0] || null;
  rec.support = byY.length ? byY[byY.length - 1] : null;
  if (rec.support && rec.value && rec.support.id === rec.value.id) rec.support = null;
  rec.roleBasis = '제목 = 가장 위 텍스트 / 값 = 가장 큰 글자 / 보조 = 가장 아래 텍스트. ' +
                  '이름에 기대지 않고 위치와 크기로 나눈다.';

  /* 배지 — 보조 문구를 품은 배경 있는 프레임 */
  const badges = collectDeep(c, x => (x.type === 'FRAME' || x.type === 'GROUP') &&
    Array.isArray(x.fills) && x.fills.some(f => f.visible !== false) &&
    collectDeep(x, y => y.type === 'TEXT', 4).length > 0, 5);
  rec.badge = null;
  if (badges.length) {
    const b = badges[badges.length - 1];
    const bt = collectDeep(b, x => x.type === 'TEXT', 4)[0];
    const bp = await firstPaint(b);
    rec.badge = { id: b.id, name: b.name, size: r2(b.width) + '×' + r2(b.height),
                  fill: bp ? bp.hex : null, fillVariable: bp ? bp.variable : null,
                  text: bt ? bt.characters : null,
                  textColor: bt ? (await firstPaint(bt) || {}).hex || null : null,
                  textColorVariable: bt ? (await firstPaint(bt) || {}).variable || null : null,
                  cornerRadius: 'cornerRadius' in b ? r2(b.cornerRadius) : null };
  }

  /* 아이콘 / accessory */
  const shapes = collectDeep(c, x => SHAPE_TYPES.indexOf(x.type) >= 0, 6);
  rec.shapeDescendants = shapes.map(s => ({ id: s.id, type: s.type,
    size: r2(s.width) + '×' + r2(s.height), visible: s.visible }));
  rec.hasIconOrVector = shapes.length > 0;
  const directChildren = kids(c) || [];
  rec.separateAccessories = directChildren.filter(x =>
    collectDeep(x, y => y.type === 'TEXT', 4).length === 0 &&
    collectDeep(x, y => SHAPE_TYPES.indexOf(y.type) >= 0, 4).length > 0)
    .map(x => ({ id: x.id, name: x.name, size: r2(x.width) + '×' + r2(x.height) }));

  cards.push(rec);
}

/* ---------- 새 KPI 마스터 ---------- */
const set = await figma.getNodeByIdAsync(KPI_SET_ID);
let master = null;
if (set && set.type === 'COMPONENT_SET') {
  let props = null;
  try { props = set.componentPropertyDefinitions; } catch (e) { /* 무시 */ }
  master = { setId: set.id, name: set.name,
             variantNames: set.children.map(c => c.name),
             propertyKeys: props ? Object.keys(props) : [],
             properties: props ? Object.keys(props).map(k => ({ key: k, type: props[k].type })) : [],
             variants: [] };

  for (const v of set.children) {
    const vrec = { name: v.name, id: v.id, box: await boxDetail(v) };
    const vtexts = collectDeep(v, x => x.type === 'TEXT', 6);
    vrec.textNodes = [];
    for (const t of vtexts) vrec.textNodes.push(await textDetail(t));
    const byY = vrec.textNodes.slice().sort((a, b) => a.y - b.y);
    const biggest = vrec.textNodes.slice().sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0] || null;
    vrec.titleNode = byY.length ? byY[0] : null;
    vrec.valueNode = biggest;
    vrec.supportNode = byY.length ? byY[byY.length - 1] : null;
    if (vrec.supportNode && vrec.valueNode && vrec.supportNode.id === vrec.valueNode.id) vrec.supportNode = null;

    /* 배지 — 인스턴스(Chip)일 수도 있다 */
    const badge = collectDeep(v, x => x.name === 'badge', 4)[0] ||
                  collectDeep(v, x => x.type === 'INSTANCE', 4)[0] || null;
    if (badge) {
      const bp = await firstPaint(badge);
      const bt = collectDeep(badge, x => x.type === 'TEXT', 4)[0];
      let bmain = null;
      if (badge.type === 'INSTANCE') {
        try { const m = await badge.getMainComponentAsync(); bmain = m ? m.name : null; }
        catch (e) { /* 무시 */ }
      }
      vrec.badge = { id: badge.id, name: badge.name, type: badge.type,
                     mainComponent: bmain,
                     size: r2(badge.width) + '×' + r2(badge.height),
                     fill: bp ? bp.hex : null, fillVariable: bp ? bp.variable : null,
                     text: bt ? bt.characters : null,
                     textColor: bt ? (await firstPaint(bt) || {}).hex || null : null,
                     textColorVariable: bt ? (await firstPaint(bt) || {}).variable || null : null };
    } else vrec.badge = null;

    vrec.widthMode = vrec.box.layoutSizingHorizontal;
    vrec.heightMode = vrec.box.layoutSizingVertical;
    master.variants.push(vrec);
  }
}

/* ---------- variant 매핑 — 두 신호를 따로 읽는다 ---------- */
function toneFromVariantName(n) {
  const s = (n || '').toLowerCase();
  if (s.indexOf('positive') >= 0) return 'positive';
  if (s.indexOf('negative') >= 0) return 'negative';
  if (s.indexOf('neutral') >= 0) return 'neutral';
  return null;
}
function sameHex(a, b) {
  return !!(a && b && String(a).toLowerCase() === String(b).toLowerCase());
}
const POSITIVE_WORDS = /증가|상승|전월\s*대비|목표\s*달성|합격/;
const NEGATIVE_WORDS = /감소|하락|탈락|불합격|실패/;

const mapping = [];
if (master) {
  for (const c of cards) {
    const m = { cardId: c.id, title: c.title ? c.title.characters : null,
                value: c.value ? c.value.characters : null,
                unit: c.unit ? c.unit.characters : null,
                support: c.support ? c.support.characters : null,
                badgeText: c.badge ? c.badge.text : null };

    /* 신호 1 — 색 */
    const colorHits = master.variants.filter(v => v.badge && c.badge &&
      (sameHex(v.badge.fill, c.badge.fill) ||
       (v.badge.fillVariable && c.badge.fillVariable && v.badge.fillVariable === c.badge.fillVariable)));
    m.colorSignal = colorHits.length === 1 ? toneFromVariantName(colorHits[0].name) : null;
    m.colorSignalMatches = colorHits.map(v => v.name);
    m.colorSignalNote = !c.badge ? '현재 카드에 배지를 찾지 못했다'
      : (colorHits.length === 0 ? '현재 배지 색 ' + c.badge.fill + ' 이 어느 variant 배지와도 안 맞는다 — 교체하면 색이 바뀐다'
      : (colorHits.length > 1 ? '여러 variant 와 맞아 하나로 못 좁힌다' : '배지 색이 ' + colorHits[0].name + ' 과 일치'));
    if (c.badge && colorHits.length === 0) {
      notes.push((m.title || c.id) + ' 배지 색 ' + c.badge.fill +
                 ' 이 어느 variant 와도 일치하지 않는다 — 교체하면 배지 색이 달라진다');
    }

    /* 신호 2 — 문구 */
    const text = [(m.support || ''), (m.badgeText || '')].join(' ');
    const hasPlus = /(^|\s)\+\s*\d/.test(text);
    const hasMinus = /(^|\s)[-−]\s*\d/.test(text);
    const pos = POSITIVE_WORDS.test(text);
    const neg = NEGATIVE_WORDS.test(text);
    m.textSample = text.trim();
    m.textSignal = (hasMinus || neg) ? 'negative' : ((hasPlus || pos) ? 'positive' : 'neutral');
    m.textSignalNote = '부호 +' + hasPlus + ' / −' + hasMinus +
                       ' · 긍정어 ' + pos + ' / 부정어 ' + neg +
                       ' → ' + m.textSignal + ' (신호가 없으면 neutral 로 둔다)';

    /* 합의 */
    const agree = m.colorSignal !== null && m.colorSignal === m.textSignal;
    if (agree) {
      m.suggestedTone = m.colorSignal; m.confidence = 'high';
      m.reason = '색 신호와 문구 신호가 모두 ' + m.colorSignal + ' 를 가리킨다';
    } else if (m.colorSignal !== null) {
      m.suggestedTone = m.colorSignal; m.confidence = 'medium';
      m.reason = '색은 ' + m.colorSignal + ', 문구는 ' + m.textSignal + ' 다. 색을 따랐다 — 시각적으로 그대로 유지되는 쪽';
    } else if (c.badge) {
      m.suggestedTone = null; m.confidence = 'low';
      m.reason = '배지 색이 어느 variant 와도 안 맞고 문구만 ' + m.textSignal +
                 ' 를 가리킨다. 문구만으로 정하면 배지 색이 말없이 바뀐다 — 사람이 정해야 한다';
    } else {
      m.suggestedTone = null; m.confidence = 'low';
      m.reason = '배지를 찾지 못해 색 신호가 없다 — 사람이 정해야 한다';
    }
    m.suggestedVariant = m.suggestedTone
      ? (master.variants.filter(v => toneFromVariantName(v.name) === m.suggestedTone)[0] || {}).name || null
      : null;
    m.resolved = !!m.suggestedVariant && m.confidence !== 'low';
    mapping.push(m);
  }
}

/* ---------- 레이아웃 영향 ----------
 * 마스터 폭만 보고 판단하지 않는다. 지금 카드가 strip 안에서 FILL 인지 먼저 본다. */
let layoutImpact = null;
if (master && cards.length) {
  const gap = r2(strip.itemSpacing || 0);
  const padH = stripInfo.paddingH;
  let stripSizingH = null;
  try { stripSizingH = strip.layoutSizingHorizontal; } catch (e) { /* 무시 */ }

  const currentFill = cards.map(c => c.box.layoutGrow === 1 || c.box.layoutSizingHorizontal === 'FILL');
  const allFill = currentFill.length > 0 && currentFill.every(Boolean);
  const noneFill = currentFill.every(x => !x);

  const v0 = master.variants[0] || null;
  const masterWidth = v0 ? v0.box.width : null;
  const masterWidthMode = v0 ? v0.widthMode : null;
  const masterHeight = v0 ? v0.box.height : null;

  const innerWidth = r2(strip.width - padH);
  const n = cards.length;
  const fillWidthEach = n > 0 ? r2((innerWidth - gap * (n - 1)) / n) : null;
  const fixedTotal = masterWidth === null ? null : r2(masterWidth * n + gap * (n - 1) + padH);

  layoutImpact = {
    stripId: strip.id,
    stripSize: r2(strip.width) + '×' + r2(strip.height),
    stripWidth: r2(strip.width), stripHeight: r2(strip.height),
    stripSizingHorizontal: stripSizingH,
    stripSizingVertical: (function () { try { return strip.layoutSizingVertical; } catch (e) { return null; } })(),
    layoutMode: stripInfo.layoutMode, gap, paddingH: padH, paddingV: stripInfo.paddingV,
    counterAxisAlignItems: stripInfo.counterAxisAlignItems,
    cardCount: n,
    currentCardWidths: cards.map(c => c.box.width),
    currentCardHeights: cards.map(c => c.box.height),
    currentCardSizingH: cards.map(c => c.box.layoutSizingHorizontal),
    currentCardLayoutGrow: cards.map(c => c.box.layoutGrow),
    currentCardsAreFill: allFill,
    currentCardsAreFixed: noneFill,

    masterWidth, masterWidthMode, masterHeight,
    masterHeightMode: v0 ? v0.heightMode : null,

    innerWidth,
    widthIfCardsFill: fillWidthEach,
    totalIfCardsKeepMasterWidth: fixedTotal,
    overflowIfMasterWidth: fixedTotal === null ? null : fixedTotal > strip.width + 0.5,
    freeSpaceIfMasterWidth: fixedTotal === null ? null : r2(strip.width - fixedTotal),

    /* 새 인스턴스는 마스터 설정을 물려받는다. 마스터가 FIXED 면 FILL 이 아니다. */
    newInstanceDefaultWidthMode: masterWidthMode,
    fillMustBeSetExplicitly: allFill && masterWidthMode !== 'FILL',
    fillConflict: allFill && masterWidthMode === 'FIXED'
      ? '현재 카드는 FILL 인데 마스터는 고정 폭이다 — 삽입 후 layoutSizingHorizontal 을 FILL 로 바꿔주지 않으면 ' +
        '카드가 ' + masterWidth + ' 로 쪼그라들고 오른쪽에 빈 공간이 생긴다'
      : null,
    predictedCardWidth: allFill ? fillWidthEach : masterWidth,
    predictedStripHeight: (function () {
      const hs = cards.map(() => masterHeight).filter(h => typeof h === 'number');
      const others = inFlow.filter(c => !cards.some(k => k.id === c.id)).map(c => c.height);
      const all = hs.concat(others);
      return all.length ? r2(Math.max.apply(null, all) + stripInfo.paddingV) : null;
    })(),
    heightNote: 'strip 이 세로 HUG 면 가장 높은 카드가 높이를 정한다'
  };
  layoutImpact.stripHeightGrowthPx = layoutImpact.predictedStripHeight === null ? null
    : r2(layoutImpact.predictedStripHeight - strip.height);
  layoutImpact.overflowRisk = allFill ? false
    : (layoutImpact.overflowIfMasterWidth === true);
  layoutImpact.measurable = masterWidth !== null && (allFill || noneFill);
  layoutImpact.mixedSizingWarning = (!allFill && !noneFill)
    ? '카드마다 sizing 이 달라 한 가지로 예측할 수 없다 — 카드별로 따로 봐야 한다' : null;
  if (layoutImpact.fillConflict) notes.push(layoutImpact.fillConflict);
  if (layoutImpact.mixedSizingWarning) notes.push(layoutImpact.mixedSizingWarning);
}

/* ---------- 교체 순서 ---------- */
const replacementOrder = cards.map(c => ({
  cardId: c.id, indexAtAuditTime: c.index, parentId: strip.id,
  title: c.title ? c.title.characters : null
})).sort((a, b) => a.indexAtAuditTime - b.indexAtAuditTime);
const orderNote = '같은 부모에 4개가 있다. 감사 시점 index 를 저장해 쓰면 앞선 삽입 때문에 뒤 대상이 밀린다. ' +
                  'APPLY 는 대상마다 삽입 직전에 indexOf 를 다시 계산하고 삽입 직후 검증한다.';

/* ---------- gate ---------- */
const gate = {
  stripFound: !!strip,
  fourCardsResolved: cards.length === 4,
  noDuplicateCandidates: (function () {
    const seen = {};
    for (const c of cards) { if (seen[c.id]) return false; seen[c.id] = true; }
    return true;
  })(),
  kpiSetFound: !!master,
  requiredVariantsExist: !!master &&
    ['positive', 'negative', 'neutral'].every(t =>
      master.variants.some(v => toneFromVariantName(v.name) === t)),
  everyCardHasTitle: cards.length > 0 && cards.every(c => !!c.title),
  everyCardHasValue: cards.length > 0 && cards.every(c => !!c.value),
  everyCardHasSupport: cards.length > 0 && cards.every(c => !!c.support),
  variantMappingResolved: mapping.length === cards.length && cards.length > 0 &&
    mapping.every(m => m.resolved === true),
  parentStripResolved: !!layoutImpact,
  layoutImpactMeasurable: !!(layoutImpact && layoutImpact.measurable),
  overflowRiskFalse: !!(layoutImpact && layoutImpact.overflowRisk === false),
  replacementOrderMeasurable: replacementOrder.length === cards.length &&
    replacementOrder.every(o => o.indexAtAuditTime >= 0)
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,

  gate, gatePassed,

  strip: stripInfo,
  cardCount: cards.length,
  alreadyReplacedIds: alreadyReplaced,
  cards: cards.map(c => ({
    id: c.id, index: c.index,
    제목: c.title ? c.title.characters : null,
    숫자: c.value ? c.value.characters : null,
    단위: c.unit ? c.unit.characters : null,
    보조문구: c.support ? c.support.characters : null,
    배지: c.badge,
    크기: c.box.size,
    layout: c.box.layoutMode + ' / 가로 ' + c.box.layoutSizingHorizontal +
            ' / 세로 ' + c.box.layoutSizingVertical + ' / grow ' + c.box.layoutGrow,
    padding: c.box.padding, gap: c.box.gap, radius: c.box.cornerRadius,
    fill: c.box.fills, stroke: c.box.strokes || null,
    effectStyle: c.box.effectStyle, effects: c.box.effects || null,
    아이콘있음: c.hasIconOrVector,
    별도accessory: c.separateAccessories,
    역할판정근거: c.roleBasis
  })),
  cardsRaw: cards,

  master,
  masterNote: master ? 'variant 별 실제 구조·텍스트 노드·배지·크기·auto layout 을 그대로 실었다' : null,

  mapping,
  mappingNote: '색 신호와 문구 신호를 **따로** 읽고 둘이 일치할 때만 confidence = high 다. ' +
               '색이 어느 variant 와도 안 맞으면 문구만으로 정하지 않는다 — ' +
               '그렇게 정하면 배지 색이 말없이 바뀐다.',

  layoutImpact,
  layoutNote: 'FILL 여부가 핵심이다. 마스터가 고정 폭인데 현재 카드가 FILL 이면 ' +
              '삽입 후 layoutSizingHorizontal 을 FILL 로 바꿔줘야 한다. fillMustBeSetExplicitly 를 볼 것.',

  replacementOrder,
  orderNote,

  notes,
  nextStep: 'gatePassed = true 이면 Phase D DRY_RUN(19)과 검증기(19b)를 씁니다. ' +
            'variantMappingResolved 가 false 면 어느 카드가 왜 미확정인지 mapping 의 reason 을 보고 알려주세요.'
});
