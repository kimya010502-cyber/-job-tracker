/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 06a
 * 지원 카드 12장 전수 감사 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API(createXxx / appendChild / resize / remove / setXxx / 노드 속성 대입)를 포함하지 않는다.
 * 모든 대입은 로컬 보고 객체에만 이뤄진다.
 *
 * 목적
 *   Application Card 컴포넌트를 설계하기 전에, 12장이 정말 같은 구조인지 확인한다.
 *   지금까지 내부 구조까지 확인한 카드는 4장(1·10·11·18)뿐이고 나머지 8장은
 *   크기와 칩 라벨만 대조했다. 확인하지 않은 가정이 남으면 APPLY 후에 드러난다.
 *
 * 검사 항목
 *   자식 구조 / 정보 행 개수 / wrapper 깊이 / dot 상태·색 / Chip label·tone /
 *   footer action 개수 / 공고 링크 존재 여부 / 구조 예외
 * ========================================================================== */

const GRID_ID = '1002:140';        // 카드 그리드 컨테이너
const CARD_NAME_PREFIX = 'Article - Card';

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 대상 확보 ---------- */
let grid = await figma.getNodeByIdAsync(GRID_ID);
let cards = [];

if (grid && 'children' in grid) {
  cards = grid.children.filter(c => c.name.indexOf(CARD_NAME_PREFIX) === 0);
}
if (cards.length === 0) {
  // 그리드 id 가 달라졌을 경우 이름으로 다시 찾는다
  const main = await figma.getNodeByIdAsync('1002:2');
  if (main) {
    cards = main.findAll(n => n.name.indexOf(CARD_NAME_PREFIX) === 0);
    notes.push('그리드 ' + GRID_ID + ' 에서 못 찾아 메인 프레임 전체에서 이름으로 검색함');
  }
}
if (cards.length === 0) {
  return out({ mode: 'AUDIT', readOnly: true, aborted: true, reason: '지원 카드를 찾지 못함' });
}

/* ---------- 헬퍼 ---------- */
function hexOf(paint) {
  const c = paint.color;
  return '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
async function paintInfo(node) {
  try {
    if (!('fills' in node) || !Array.isArray(node.fills) || node.fills.length !== 1) return null;
    const p = node.fills[0];
    if (p.type !== 'SOLID') return { type: p.type };
    let varName = null;
    if (p.boundVariables && p.boundVariables.color) {
      const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
      varName = v ? v.name : null;
    }
    return { hex: hexOf(p), token: varName, opacity: p.opacity === undefined ? 1 : r2(p.opacity) };
  } catch (e) { return null; }
}
function firstText(node) {
  try {
    const t = node.findAll ? node.findAll(n => n.type === 'TEXT') : [];
    return t.length ? t[0].characters : null;
  } catch (e) { return null; }
}
// 칩 판별: fill 이 있고 높이 28 이하이며 텍스트를 품은 프레임
function isChip(n) {
  return n.type === 'FRAME' && Array.isArray(n.fills) && n.fills.length > 0 &&
         n.height <= 28 && n.findAll && n.findAll(x => x.type === 'TEXT').length > 0;
}
// wrapper 깊이: 자식이 1개뿐인 프레임이 몇 겹 이어지는지
function wrapperDepth(card) {
  let d = 0, cur = card;
  while (cur && 'children' in cur && cur.children.length === 1) { d++; cur = cur.children[0]; }
  return d;
}
function maxDepth(node, cur) {
  cur = cur || 0;
  if (!('children' in node) || node.children.length === 0) return cur;
  let m = cur;
  for (const c of node.children) m = Math.max(m, maxDepth(c, cur + 1));
  return m;
}

/* ---------- 카드별 감사 ---------- */
const rows = [];

for (const card of cards) {
  const row = { name: card.name, id: card.id, width: r2(card.width), height: r2(card.height) };

  // 루트 auto layout 설정
  row.root = {
    layoutMode: card.layoutMode || null,
    primaryAxisAlignItems: card.primaryAxisAlignItems || null,
    hasJustifyBetween: card.primaryAxisAlignItems === 'SPACE_BETWEEN',
    padding: card.layoutMode
      ? [card.paddingTop, card.paddingRight, card.paddingBottom, card.paddingLeft].map(r2).join('/')
      : null,
    itemSpacing: card.layoutMode ? r2(card.itemSpacing) : null,
    cornerRadius: typeof card.cornerRadius === 'number' ? r2(card.cornerRadius) : 'mixed',
    strokeCount: Array.isArray(card.strokes) ? card.strokes.length : null,
    effectCount: Array.isArray(card.effects) ? card.effects.length : null
  };
  row.rootFill = await paintInfo(card);

  // 구조
  row.childNames = card.children.map(c => c.name);
  row.wrapperDepth = wrapperDepth(card);
  row.maxDepth = maxDepth(card);

  // 정보 행: "현재 단계 / 전형 상태 / 지원일 / 일정" 처럼 라벨 텍스트로 시작하는 행 수를 센다
  const allTexts = card.findAll(n => n.type === 'TEXT').map(t => t.characters);
  row.texts = allTexts;
  const LABELS = ['현재 단계', '전형 상태', '지원일', '일정'];
  row.infoLabelsFound = LABELS.filter(l => allTexts.indexOf(l) !== -1);
  row.infoRowCount = row.infoLabelsFound.length;

  // dot: 12px 이하 정사각에 가까운 노드
  const dots = card.findAll(n => n.width <= 12 && n.height <= 12 && n.width >= 6 &&
                                 'fills' in n && Array.isArray(n.fills) && n.fills.length > 0);
  row.dotCount = dots.length;
  row.dot = dots.length ? await paintInfo(dots[0]) : null;
  row.dotEffects = dots.length && Array.isArray(dots[0].effects)
    ? dots[0].effects.map(e => e.type + (e.spread ? ' spread ' + e.spread : '')) : [];

  // 칩
  const chips = card.findAll(isChip);
  row.chips = [];
  for (const ch of chips) {
    row.chips.push({
      label: firstText(ch),
      size: r2(ch.width) + '×' + r2(ch.height),
      radius: typeof ch.cornerRadius === 'number' ? r2(ch.cornerRadius) : 'mixed',
      fill: await paintInfo(ch)
    });
  }
  row.chipCount = chips.length;

  // footer action
  const buttons = card.findAll(n => n.name.indexOf('Button') === 0);
  row.footerActions = buttons.map(b => ({ name: b.name, size: r2(b.width) + '×' + r2(b.height) }));
  row.footerActionCount = buttons.length;
  row.hasJobLink = buttons.some(b => b.name.indexOf('공고') !== -1);

  // 구분선
  const borders = card.findAll(n => n.name === 'HorizontalBorder');
  row.hasDivider = borders.length > 0;
  row.dividerPaddingTop = borders.length && borders[0].layoutMode ? r2(borders[0].paddingTop) : null;

  rows.push(row);
}

/* ---------- 집계 ---------- */
function tally(list) {
  const o = {};
  for (const v of list) { const k = String(v); o[k] = (o[k] || 0) + 1; }
  return o;
}
function group(list, keyFn, nameFn) {
  const o = {};
  for (const r of list) {
    const k = keyFn(r);
    (o[k] = o[k] || []).push(nameFn(r));
  }
  return o;
}

const summary = {
  cardCount: rows.length,
  sizes: tally(rows.map(r => r.width + '×' + r.height)),
  childSignatures: group(rows, r => r.childNames.join(' | '), r => r.name),
  wrapperDepths: tally(rows.map(r => r.wrapperDepth)),
  maxDepths: tally(rows.map(r => r.maxDepth)),
  infoRowCounts: tally(rows.map(r => r.infoRowCount)),
  justifyBetween: tally(rows.map(r => r.root.hasJustifyBetween)),
  paddings: tally(rows.map(r => r.root.padding)),
  itemSpacings: tally(rows.map(r => r.root.itemSpacing)),
  radii: tally(rows.map(r => r.root.cornerRadius)),
  strokeCounts: tally(rows.map(r => r.root.strokeCount)),
  effectCounts: tally(rows.map(r => r.root.effectCount)),
  dotCounts: tally(rows.map(r => r.dotCount)),
  dotTokens: tally(rows.map(r => r.dot ? (r.dot.token || r.dot.hex) : 'none')),
  dotEffects: tally(rows.map(r => r.dotEffects.join(','))),
  chipCounts: tally(rows.map(r => r.chipCount)),
  chipLabels: tally([].concat.apply([], rows.map(r => r.chips.map(c => c.label)))),
  chipTokens: tally([].concat.apply([], rows.map(r => r.chips.map(c => c.fill ? (c.fill.token || c.fill.hex) : 'none')))),
  chipRadii: tally([].concat.apply([], rows.map(r => r.chips.map(c => c.radius)))),
  footerActionCounts: tally(rows.map(r => r.footerActionCount)),
  hasJobLink: tally(rows.map(r => r.hasJobLink)),
  dividerPaddingTops: tally(rows.map(r => r.dividerPaddingTop))
};

/* ---------- 예외 판정: 최빈값과 다른 카드 ---------- */
function majority(obj) {
  let best = null, n = -1;
  for (const k of Object.keys(obj)) if (obj[k] > n) { n = obj[k]; best = k; }
  return best;
}
const exceptions = [];
const checks = [
  ['size', r => r.width + '×' + r.height, summary.sizes],
  ['childSignature', r => r.childNames.join(' | '), tally(rows.map(r => r.childNames.join(' | ')))],
  ['wrapperDepth', r => String(r.wrapperDepth), summary.wrapperDepths],
  ['infoRowCount', r => String(r.infoRowCount), summary.infoRowCounts],
  ['justifyBetween', r => String(r.root.hasJustifyBetween), summary.justifyBetween],
  ['padding', r => String(r.root.padding), summary.paddings],
  ['chipCount', r => String(r.chipCount), summary.chipCounts],
  ['footerActionCount', r => String(r.footerActionCount), summary.footerActionCounts],
  ['dotCount', r => String(r.dotCount), summary.dotCounts]
];
for (const [field, fn, dist] of checks) {
  const maj = majority(dist);
  for (const r of rows) {
    if (fn(r) !== maj) {
      exceptions.push({ card: r.name, id: r.id, field, value: fn(r), majority: maj });
    }
  }
}

return out({
  mode: 'AUDIT',
  readOnly: true,
  aborted: false,
  gridId: grid ? grid.id : null,
  cardCount: rows.length,
  summary,
  exceptions,
  exceptionCount: exceptions.length,
  cards: rows,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
