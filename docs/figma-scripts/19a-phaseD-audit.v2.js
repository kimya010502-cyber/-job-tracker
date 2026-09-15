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

const SCRIPT_VERSION = '19a-v2-phaseD-audit';

const STRIP_ID = '1002:23';
const KPI_SET_ID = '1033:2085';

/* 사람이 확정한 variant 매핑 (2026-09-15).
 * Phase D 의 목적은 기존 예외를 복제하는 게 아니라 KPI 규칙대로 정규화하는 것이다.
 * '이번 달 지원' 의 현재 brand-purple 배지는 기존 화면의 예외로 보고 success 로 정규화한다. */
const HUMAN_VARIANT_DECISION = {
  '이번 달 지원': 'delta=positive',
  '진행 중': 'delta=positive',
  '이번 달 불합격': 'delta=negative',
  '최종 합격': 'delta=neutral'
};

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

  /* ---- 배지를 먼저 찾는다. 배지 안 텍스트는 badgeText 이고 나머지 역할에서 빼야 한다. ---- */
  const badgeFrames = collectDeep(c, x => (x.type === 'FRAME' || x.type === 'GROUP' || x.type === 'INSTANCE') &&
    Array.isArray(x.fills) && x.fills.some(f => f.visible !== false) &&
    collectDeep(x, y => y.type === 'TEXT', 4).length > 0 &&
    x.width < c.width, 5);
  const badgeNode = badgeFrames.length ? badgeFrames[badgeFrames.length - 1] : null;
  const badgeTextIds = badgeNode
    ? collectDeep(badgeNode, x => x.type === 'TEXT', 4).map(x => x.id) : [];

  rec.badge = null;
  if (badgeNode) {
    const bt = collectDeep(badgeNode, x => x.type === 'TEXT', 4)[0];
    const bp = await firstPaint(badgeNode);
    const btp = bt ? await firstPaint(bt) : null;
    rec.badge = { id: badgeNode.id, name: badgeNode.name, type: badgeNode.type,
                  size: r2(badgeNode.width) + '×' + r2(badgeNode.height),
                  fill: bp ? bp.hex : null, fillVariable: bp ? bp.variable : null,
                  text: bt ? bt.characters : null, textNodeId: bt ? bt.id : null,
                  textColor: btp ? btp.hex : null, textColorVariable: btp ? btp.variable : null,
                  cornerRadius: 'cornerRadius' in badgeNode ? r2(badgeNode.cornerRadius) : null };
  }

  /* ---- 배지 밖 텍스트만으로 title / value / unit / caption 을 나눈다 ----
   * v1 은 unit 과 caption 을 같은 노드로 잡아 support 가 전부 "건" 이 됐다.
   * 값 옆 짧은 단위와 아래쪽 설명 문구는 다른 역할이다. */
  const outside = rec.textNodes.filter(t => badgeTextIds.indexOf(t.id) < 0);
  const byY = outside.slice().sort((a, b) => a.y - b.y);
  const value = outside.slice().sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0] || null;

  /* 단위 = 값과 같은 줄에 있는 짧은 텍스트 (값 자신은 제외) */
  const unit = value ? (outside.filter(t => t.id !== value.id &&
    (t.characters || '').trim().length <= 3 &&
    Math.abs((t.y + t.height / 2) - (value.y + value.height / 2)) <= Math.max(12, value.height / 2))
    .sort((a, b) => a.x - b.x)[0] || null) : null;

  const usedIds = [value, unit].filter(Boolean).map(t => t.id);
  const remaining = byY.filter(t => usedIds.indexOf(t.id) < 0);
  const title = remaining.length ? remaining[0] : null;
  const caption = remaining.length > 1 ? remaining[remaining.length - 1] : null;

  rec.title = title;
  rec.value = value;
  rec.unit = unit;
  rec.caption = (caption && title && caption.id === title.id) ? null : caption;
  rec.badgeText = rec.badge ? rec.badge.text : null;
  rec.hasCaption = !!rec.caption;
  rec.roleBasis = '배지 안 텍스트를 먼저 빼고, 나머지에서 값 = 가장 큰 글자 / ' +
                  '단위 = 값과 같은 줄의 3자 이하 짧은 텍스트 / 제목 = 남은 것 중 가장 위 / ' +
                  '설명 = 남은 것 중 가장 아래. 설명이 없는 카드도 있다.';
  rec.roleAssignments = {
    title: title ? title.characters : null,
    value: value ? value.characters : null,
    unit: unit ? unit.characters : null,
    caption: rec.caption ? rec.caption.characters : null,
    badgeText: rec.badgeText
  };

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
    /* 마스터는 노드 이름이 명확하다 (05-kpi-card-component 가 label / number / unit / caption 으로 만들었다).
     * 이름을 먼저 쓰고, 이름이 없을 때만 위치 추론으로 넘어간다.
     * v1 은 위치 추론만 써서 titleNode 에 number 가, supportNode 에 label 이 들어갔다. */
    const NAME_ROLE = { label: 'title', number: 'value', value: 'value', unit: 'unit',
                        caption: 'caption', support: 'caption' };
    const badgeNode = collectDeep(v, x => x.name === 'badge', 4)[0] ||
                      collectDeep(v, x => x.type === 'INSTANCE', 4)[0] || null;
    const badgeTextIds = badgeNode
      ? collectDeep(badgeNode, x => x.type === 'TEXT', 4).map(x => x.id) : [];
    const outside = vrec.textNodes.filter(t => badgeTextIds.indexOf(t.id) < 0);

    const byName = { title: [], value: [], unit: [], caption: [] };
    const unnamed = [];
    for (const t of outside) {
      const role = NAME_ROLE[(t.name || '').toLowerCase()];
      if (role) byName[role].push(t); else unnamed.push(t);
    }
    vrec.roleSource = {};
    function pick(role) {
      if (byName[role].length) { vrec.roleSource[role] = 'node name'; return byName[role][0]; }
      return null;
    }
    vrec.titleNode = pick('title');
    vrec.valueNode = pick('value');
    vrec.unitNode = pick('unit');
    vrec.captionNode = pick('caption');

    /* 이름으로 못 찾은 것만 위치·크기로 메운다 */
    if (!vrec.valueNode && unnamed.length) {
      vrec.valueNode = unnamed.slice().sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0))[0];
      vrec.roleSource.value = 'fallback: 가장 큰 글자';
    }
    if (!vrec.titleNode) {
      const rest = unnamed.filter(t => !vrec.valueNode || t.id !== vrec.valueNode.id)
        .sort((a, b) => a.y - b.y);
      if (rest.length) { vrec.titleNode = rest[0]; vrec.roleSource.title = 'fallback: 가장 위'; }
    }
    if (!vrec.captionNode) {
      const used = [vrec.titleNode, vrec.valueNode, vrec.unitNode].filter(Boolean).map(t => t.id);
      const rest = unnamed.filter(t => used.indexOf(t.id) < 0).sort((a, b) => a.y - b.y);
      if (rest.length) { vrec.captionNode = rest[rest.length - 1]; vrec.roleSource.caption = 'fallback: 가장 아래'; }
    }

    vrec.roleCounts = { title: byName.title.length, value: byName.value.length,
                        unit: byName.unit.length, caption: byName.caption.length,
                        badge: badgeNode ? 1 : 0, unnamed: unnamed.length };
    vrec.roleUniqueness = {
      exactlyOneTitle: byName.title.length === 1 || (!!vrec.titleNode && byName.title.length === 0),
      exactlyOneValue: byName.value.length === 1 || (!!vrec.valueNode && byName.value.length === 0),
      exactlyOneUnit: byName.unit.length <= 1,
      exactlyOneCaption: byName.caption.length <= 1,
      exactlyOneBadge: !!badgeNode
    };
    vrec.captionIsOptional = byName.caption.length === 0;
    vrec.unnamedTextNodes = unnamed.map(t => ({ id: t.id, name: t.name, characters: t.characters }));

    if (badgeNode) {
      const bp = await firstPaint(badgeNode);
      const bt = collectDeep(badgeNode, x => x.type === 'TEXT', 4)[0];
      const btp = bt ? await firstPaint(bt) : null;
      let bmain = null;
      if (badgeNode.type === 'INSTANCE') {
        try { const m = await badgeNode.getMainComponentAsync(); bmain = m ? m.name : null; }
        catch (e) { /* 무시 */ }
      }
      vrec.badgeNode = { id: badgeNode.id, name: badgeNode.name, type: badgeNode.type,
                         mainComponent: bmain, size: r2(badgeNode.width) + '×' + r2(badgeNode.height),
                         fill: bp ? bp.hex : null, fillVariable: bp ? bp.variable : null };
      vrec.badgeLabelNode = bt ? { id: bt.id, name: bt.name, characters: bt.characters,
                                   color: btp ? btp.hex : null,
                                   colorVariable: btp ? btp.variable : null } : null;
      vrec.badge = { id: badgeNode.id, name: badgeNode.name, type: badgeNode.type,
                     mainComponent: bmain, size: vrec.badgeNode.size,
                     fill: vrec.badgeNode.fill, fillVariable: vrec.badgeNode.fillVariable,
                     text: bt ? bt.characters : null,
                     textColor: vrec.badgeLabelNode ? vrec.badgeLabelNode.color : null,
                     textColorVariable: vrec.badgeLabelNode ? vrec.badgeLabelNode.colorVariable : null };
    } else {
      vrec.badgeNode = null; vrec.badgeLabelNode = null; vrec.badge = null;
    }

    /* 마스터 높이가 내부 구성에서 나오는 값인지 */
    const vkids = (kids(v) || []).filter(x => x.visible !== false && x.layoutPositioning !== 'ABSOLUTE');
    const vPadV = r2((v.paddingTop || 0) + (v.paddingBottom || 0));
    const vGap = r2(v.itemSpacing || 0);
    vrec.heightFromContent = v.layoutMode === 'VERTICAL'
      ? r2(vkids.reduce((a, x) => a + x.height, 0) + vGap * Math.max(0, vkids.length - 1) + vPadV)
      : (vkids.length ? r2(Math.max.apply(null, vkids.map(x => x.height)) + vPadV) : null);
    vrec.heightMatchesContent = vrec.heightFromContent !== null &&
      Math.abs(vrec.heightFromContent - v.height) < 0.5;

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

    /* 사람이 확정한 결정. 신호 판정은 그대로 남겨 둔다 — 무엇이 달라지는지 보여야 하기 때문이다. */
    const decided = m.title ? HUMAN_VARIANT_DECISION[m.title.trim()] : null;
    m.finalVariantDecision = decided || null;
    m.decisionSource = decided ? 'human-confirmed' : null;
    m.decisionExistsInMaster = !!(decided &&
      master.variants.some(v => v.name === decided));
    m.decisionDiffersFromSignals = !!(decided && m.suggestedVariant && decided !== m.suggestedVariant);
    m.decisionNote = !decided
      ? '이 제목에 대한 사람 결정이 없다 — HUMAN_VARIANT_DECISION 에 추가해야 한다'
      : (m.decisionDiffersFromSignals
          ? '사람 결정 ' + decided + ' 가 신호 판정 ' + m.suggestedVariant + ' 와 다르다. ' +
            'Phase D 는 기존 예외를 복제하지 않고 KPI 규칙대로 정규화하는 것이므로 사람 결정을 따른다'
          : (m.colorSignal === null
              ? '사람 결정 ' + decided + '. 현재 배지 색이 어느 variant 와도 안 맞아 ' +
                '교체하면 배지 색이 바뀐다 — 의도된 정규화다'
              : '사람 결정 ' + decided + ' 가 신호 판정과 일치한다'));
    if (decided && m.colorSignal === null && c.badge) {
      notes.push((m.title || c.id) + ': 배지 색 ' + c.badge.fill + ' → ' + decided +
                 ' 의 색으로 바뀐다 (의도된 정규화)');
    }
    m.resolved = !!m.finalVariantDecision && m.decisionExistsInMaster;
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
    fillSemantics: allFill && masterWidthMode === 'FIXED'
      ? '현재 폭에서는 마스터 ' + masterWidth + '×' + n + ' + gap ' + gap + '×' + (n - 1) +
        ' = ' + fixedTotal + ' 가 strip ' + r2(strip.width) + ' 과 ' +
        (Math.abs(fixedTotal - strip.width) < 0.5 ? '우연히 정확히 맞는다' :
         (fixedTotal > strip.width ? '맞지 않고 넘친다' : Math.abs(r2(strip.width - fixedTotal)) + 'px 남는다')) +
        '. 그래서 지금 당장 빈 공간이 생기지는 않을 수 있다. ' +
        '다만 기존 카드가 FILL 이므로 반응형 sizing 의미를 보존하려면 ' +
        '새 인스턴스에도 layoutSizingHorizontal = FILL / layoutGrow = 1 을 명시해야 한다. ' +
        '그렇게 하지 않으면 strip 폭이 바뀌는 순간 카드가 따라오지 않는다.'
      : null,
    fillWidthCoincidence: (allFill && fixedTotal !== null)
      ? Math.abs(fixedTotal - strip.width) < 0.5 : null,
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

  /* ---- 카드 높이 변화 ---- */
  const curHeights = cards.map(c => c.box.height);
  const sameCurHeight = curHeights.every(h => Math.abs(h - curHeights[0]) < 0.5);
  const v0rec = master.variants[0] || null;
  layoutImpact.heightImpact = {
    currentHeights: curHeights,
    currentHeight: sameCurHeight ? curHeights[0] : null,
    allCardsSameHeightNow: sameCurHeight,
    masterHeight: masterHeight,
    masterHeightMode: v0rec ? v0rec.heightMode : null,
    masterHeightFromContent: v0rec ? v0rec.heightFromContent : null,
    masterHeightMatchesContent: v0rec ? v0rec.heightMatchesContent : null,
    predictedFinalHeight: masterHeight,
    heightDelta: (sameCurHeight && masterHeight !== null) ? r2(masterHeight - curHeights[0]) : null,
    /* "의도된 값인가" 를 선언하지 않고 잰다 — 마스터 높이가 자기 내부 구성으로 설명되면 의도된 것이다 */
    intentionalFromMaster: !!(v0rec && v0rec.heightMatchesContent === true &&
                              (v0rec.heightMode === 'HUG' || v0rec.heightMode === null)),
    intentionalBasis: v0rec
      ? '마스터 높이 ' + masterHeight + ' 가 세로 ' + v0rec.heightMode +
        ' 이고 내부 구성 합 ' + v0rec.heightFromContent + ' 와 ' +
        (v0rec.heightMatchesContent ? '일치한다 — 마스터 구조에서 나온 값이다'
                                    : '일치하지 않는다 — 어디서 나온 높이인지 확인이 필요하다')
      : '마스터 variant 를 읽지 못했다',
    allVariantsSameHeight: master.variants.length > 0 &&
      master.variants.every(v => Math.abs(v.box.height - master.variants[0].box.height) < 0.5),
    variantHeights: master.variants.map(v => ({ variant: v.name, height: v.box.height }))
  };

  /* ---- 높이 변화가 주변에 미치는 영향 ---- */
  const stripParent = strip.parent;
  let spSizingV = null;
  if (stripParent) { try { spSizingV = stripParent.layoutSizingVertical; } catch (e) { /* 무시 */ } }
  layoutImpact.surroundingImpact = stripParent ? {
    stripParentId: stripParent.id, stripParentName: stripParent.name,
    stripParentSize: r2(stripParent.width) + '×' + r2(stripParent.height),
    stripParentLayoutMode: 'layoutMode' in stripParent ? stripParent.layoutMode : null,
    stripParentSizingVertical: spSizingV,
    stripParentGap: 'itemSpacing' in stripParent ? r2(stripParent.itemSpacing) : null,
    stripParentChildCount: (kids(stripParent) || []).length,
    parentHeightFollowsStrip: spSizingV === 'HUG',
    predictedParentHeightChange: (spSizingV === 'HUG' && layoutImpact.stripHeightGrowthPx !== null)
      ? layoutImpact.stripHeightGrowthPx : 0,
    note: spSizingV === 'HUG'
      ? 'strip 부모가 세로 HUG 라 strip 높이 변화가 그대로 전달된다'
      : 'strip 부모 높이가 고정이라 strip 이 줄어도 부모는 그대로다 — 아래 요소가 올라오지 않는다'
  } : null;
  if (layoutImpact.heightImpact.heightDelta !== null &&
      Math.abs(layoutImpact.heightImpact.heightDelta) > 0.5) {
    notes.push('KPI 카드 높이가 ' + layoutImpact.heightImpact.currentHeight + ' → ' +
      masterHeight + ' 로 ' + layoutImpact.heightImpact.heightDelta + 'px 바뀐다. ' +
      layoutImpact.heightImpact.intentionalBasis);
  }
  layoutImpact.overflowRisk = allFill ? false
    : (layoutImpact.overflowIfMasterWidth === true);
  layoutImpact.measurable = masterWidth !== null && (allFill || noneFill);
  layoutImpact.mixedSizingWarning = (!allFill && !noneFill)
    ? '카드마다 sizing 이 달라 한 가지로 예측할 수 없다 — 카드별로 따로 봐야 한다' : null;
  if (layoutImpact.fillSemantics) notes.push(layoutImpact.fillSemantics);
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
const masterRolesOk = !!master && master.variants.length > 0 &&
  master.variants.every(v => v.roleUniqueness &&
    v.roleUniqueness.exactlyOneTitle && v.roleUniqueness.exactlyOneValue &&
    v.roleUniqueness.exactlyOneUnit && v.roleUniqueness.exactlyOneCaption &&
    v.roleUniqueness.exactlyOneBadge);
const captionOptionalInMaster = !!master && master.variants.length > 0 &&
  master.variants.every(v => v.captionIsOptional === true);

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
  masterRolesResolved: masterRolesOk,
  everyCardHasTitle: cards.length > 0 && cards.every(c => !!c.title),
  everyCardHasValue: cards.length > 0 && cards.every(c => !!c.value),
  everyCardHasUnit: cards.length > 0 && cards.every(c => !!c.unit),
  /* caption 은 마스터에서 optional 이면 없어도 된다. 있는 카드만 제대로 잡혔는지 본다. */
  captionHandlingValid: cards.length > 0 &&
    (captionOptionalInMaster || cards.every(c => !!c.caption)),
  everyCardHasBadgeText: cards.length > 0 && cards.every(c => typeof c.badgeText === 'string'),
  finalVariantDecisionsComplete: mapping.length === cards.length && cards.length > 0 &&
    mapping.every(m => !!m.finalVariantDecision && m.decisionExistsInMaster === true),
  variantMappingResolved: mapping.length === cards.length && cards.length > 0 &&
    mapping.every(m => m.resolved === true),
  parentStripResolved: !!layoutImpact,
  fillSemanticsUnderstood: !!(layoutImpact &&
    (layoutImpact.currentCardsAreFill || layoutImpact.currentCardsAreFixed) &&
    layoutImpact.newInstanceDefaultWidthMode !== null),
  heightImpactMeasurable: !!(layoutImpact && layoutImpact.heightImpact &&
    layoutImpact.heightImpact.heightDelta !== null &&
    layoutImpact.heightImpact.intentionalFromMaster === true),
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
    단위구분: c.roleAssignments,
    설명문구: c.caption ? c.caption.characters : null,
    배지문구: c.badgeText,
    설명있음: c.hasCaption,
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
