/* ============================================================================
 * 줍줍 — 스크립트 19b
 * Phase D 검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing= / .layoutGrow= 를
 * 한 줄도 포함하지 않는다.
 *
 * 확인하는 것
 *   원본 4장이 **존재하되 숨김** (삭제 금지 확인)
 *   새 인스턴스 4장이 각각 정확히 1개, 숨긴 원본 **바로 앞**
 *   variant · title · value · unit · badgeText 정확
 *   caption 의 hide/set 상태와 visible 상태 정확 (**둘 다 되읽는다**)
 *   layoutSizingHorizontal = FILL · layoutGrow = 1 · 높이 ≈ 마스터 높이
 *   strip 폭 976 유지 · gap 12 유지 · 높이 실측 · overflow 없음
 *   중복 없음 · 페이지 미아 없음
 *
 * 폭은 실측을 기록한다. FILL 이므로 strip 폭에서 계산된 값이 나와야 한다.
 * ========================================================================== */

const SCRIPT_VERSION = '19b-v1-phaseD-verify';

const STRIP_ID = '1002:23';
const KPI_SET_ID = '1033:2085';
const STRIP_EXPECTED_WIDTH = 976;
const STRIP_EXPECTED_GAP = 12;

const TARGETS = [
  { key: 'c1', srcId: '1002:24', variant: 'delta=positive',
    title: '이번 달 지원', value: '20', unit: '건',
    captionAction: 'hide', captionValue: null, badgeText: '+12 전월 대비' },
  { key: 'c2', srcId: '1002:42', variant: 'delta=positive',
    title: '진행 중', value: '14', unit: '건',
    captionAction: 'set', captionValue: '파이프라인 70.0%', badgeText: '+8' },
  { key: 'c3', srcId: '1002:60', variant: 'delta=negative',
    title: '이번 달 불합격', value: '6', unit: '건',
    captionAction: 'set', captionValue: '탈락률 30.0%', badgeText: '+4' },
  { key: 'c4', srcId: '1002:78', variant: 'delta=neutral',
    title: '최종 합격', value: '0', unit: '건',
    captionAction: 'hide', captionValue: null, badgeText: '시즌 목표 1개사' }
];

const ROLE_NAMES = { title: ['label'], value: ['number', 'value'],
                     unit: ['unit'], caption: ['caption', 'support'] };

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
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
async function isKpiInstance(n) {
  if (!n || n.type !== 'INSTANCE') return false;
  const mc = await mainCompOf(n);
  return !!(mc && mc.parent && mc.parent.id === KPI_SET_ID);
}
function badgeOf(root) {
  return collectDeep(root, x => x.name === 'badge', 4)[0] ||
         collectDeep(root, x => x.type === 'INSTANCE', 4)[0] || null;
}
function roleNodes(root) {
  const badge = badgeOf(root);
  const badgeTextIds = badge ? collectDeep(badge, x => x.type === 'TEXT', 4).map(x => x.id) : [];
  const outside = collectDeep(root, x => x.type === 'TEXT', 6)
    .filter(t => badgeTextIds.indexOf(t.id) < 0);
  const res = { badge, badgeText: badge ? collectDeep(badge, x => x.type === 'TEXT', 4)[0] || null : null };
  for (const role of Object.keys(ROLE_NAMES)) {
    res[role] = outside.filter(t => ROLE_NAMES[role].indexOf((t.name || '').toLowerCase()) >= 0)[0] || null;
  }
  const used = () => Object.keys(ROLE_NAMES).map(k => res[k]).filter(Boolean).map(t => t.id);
  if (!res.value) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0)
      .sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    if (rest.length) res.value = rest[0];
  }
  if (!res.title) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0).sort((a, b) => a.y - b.y);
    if (rest.length) res.title = rest[0];
  }
  if (!res.caption) {
    const rest = outside.filter(t => used().indexOf(t.id) < 0).sort((a, b) => a.y - b.y);
    if (rest.length) res.caption = rest[rest.length - 1];
  }
  return res;
}

/* ---------- strip ---------- */
const strip = await figma.getNodeByIdAsync(STRIP_ID);
if (!strip) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
                         reason: 'strip ' + STRIP_ID + ' 을 찾을 수 없음' });
const stripChildren = kids(strip) || [];

/* ---------- 카드별 ---------- */
const rows = [];
for (const t of TARGETS) {
  const row = { key: t.key, srcId: t.srcId, checks: {} };
  const src = await figma.getNodeByIdAsync(t.srcId);
  row.checks.originalStillExists = !!src;
  if (!src) { errors.push(t.key + ' 원본 ' + t.srcId + ' 이 사라졌다 (삭제 금지 위반)'); rows.push(row); continue; }
  row.originalVisible = src.visible;
  row.checks.originalHidden = src.visible === false;

  const parent = src.parent;
  row.parentId = parent ? parent.id : null;
  row.checks.parentIsStrip = !!parent && parent.id === STRIP_ID;
  if (!parent) { errors.push(t.key + ' 부모를 찾지 못했다'); rows.push(row); continue; }

  const cs = kids(parent) || [];
  const srcIdx = cs.indexOf(src);
  row.originalIndex = srcIdx;
  const cand = srcIdx > 0 ? cs[srcIdx - 1] : null;
  const isKpi = await isKpiInstance(cand);
  row.checks.newInstanceExists = isKpi;
  row.checks.newInstanceImmediatelyBeforeOriginal = isKpi;

  if (isKpi) {
    const inst = cand;
    row.newInstanceId = inst.id;
    row.newInstanceIndex = srcIdx - 1;
    row.size = r2(inst.width) + '×' + r2(inst.height);
    row.width = r2(inst.width);
    row.height = r2(inst.height);
    row.checks.newInstanceVisible = inst.visible === true;

    const mc = await mainCompOf(inst);
    row.variant = mc ? mc.name : null;
    row.checks.variantCorrect = !!mc && mc.name === t.variant;

    const rn = roleNodes(inst);
    row.title = rn.title ? rn.title.characters : null;
    row.value = rn.value ? rn.value.characters : null;
    row.unit = rn.unit ? rn.unit.characters : null;
    row.badgeText = rn.badgeText ? rn.badgeText.characters : null;
    row.captionText = rn.caption ? rn.caption.characters : null;
    row.captionVisible = rn.caption ? rn.caption.visible : null;

    row.checks.titleCorrect = row.title === t.title;
    row.checks.valueCorrect = row.value === t.value;
    row.checks.unitCorrect = row.unit === t.unit;
    row.checks.badgeTextCorrect = row.badgeText === t.badgeText;

    /* caption — 텍스트와 visible 을 **둘 다** 본다 */
    row.captionAction = t.captionAction;
    if (t.captionAction === 'set') {
      row.checks.captionTextCorrect = row.captionText === t.captionValue;
      row.checks.captionVisibleCorrect = row.captionVisible === true;
    } else {
      row.checks.captionHidden = row.captionVisible === false;
      row.captionTextNote = 'hide 이므로 텍스트 내용은 조건이 아니다. 현재 값: ' +
                            JSON.stringify(row.captionText);
    }

    /* sizing */
    row.sizingH = (function () { try { return inst.layoutSizingHorizontal; } catch (e) { return null; } })();
    row.layoutGrow = 'layoutGrow' in inst ? inst.layoutGrow : null;
    row.checks.sizingIsFill = row.sizingH === 'FILL';
    row.checks.layoutGrowIsOne = row.layoutGrow === 1;

    /* 높이 — 마스터 높이와 비교.
     * caption 을 켠 카드가 마스터보다 높아지면 caption 이 카드 높이에 영향을 준다는 뜻이다.
     * 감사에서는 caption 이 가로 footer row 안이라 높이에 영향이 없다고 읽혔다 —
     * 그 전제가 깨졌는지 여기서 드러나야 한다. */
    let masterH = null;
    if (mc) masterH = r2(mc.height);
    row.masterHeight = masterH;
    row.heightVsMaster = masterH === null ? null : r2(inst.height - masterH);
    row.checks.heightMatchesMaster = masterH === null ? true : near(inst.height, masterH);
    if (row.checks.heightMatchesMaster === false) {
      notes.push(t.key + ' 높이 ' + r2(inst.height) + ' 가 마스터 ' + masterH + ' 와 ' +
        row.heightVsMaster + ' 만큼 다르다 (caption ' + t.captionAction + '). ' +
        'caption 이 카드 높이에 영향을 준다면 감사의 전제가 깨진 것이다.');
    }
  } else {
    errors.push(t.key + ' 숨긴 원본 바로 앞에 KPI 인스턴스가 없다');
  }

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(t.key + ' 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;
  rows.push(row);
}

/* ---------- strip 실측 ---------- */
const vis = stripChildren.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
const gap = r2(strip.itemSpacing || 0);
const padH = r2((strip.paddingLeft || 0) + (strip.paddingRight || 0));
const padV = r2((strip.paddingTop || 0) + (strip.paddingBottom || 0));
const occupied = r2(vis.reduce((a, c) => a + c.width, 0) + gap * Math.max(0, vis.length - 1) + padH);
const cardHeights = vis.map(c => r2(c.height));

let kpiCount = 0;
for (const c of stripChildren) if (await isKpiInstance(c)) kpiCount++;

const stripInfo = {
  id: strip.id, width: r2(strip.width), height: r2(strip.height),
  expectedWidth: STRIP_EXPECTED_WIDTH, expectedGap: STRIP_EXPECTED_GAP,
  gap, paddingH: padH, paddingV: padV,
  counterAxisAlignItems: strip.counterAxisAlignItems,
  childCount: stripChildren.length,
  visibleInFlowCount: vis.length,
  visibleChildren: vis.map(c => ({ id: c.id, name: c.name,
    size: r2(c.width) + '×' + r2(c.height),
    sizingH: (function () { try { return c.layoutSizingHorizontal; } catch (e) { return null; } })(),
    grow: 'layoutGrow' in c ? c.layoutGrow : null })),
  occupiedWidth: occupied, freeSpace: r2(strip.width - occupied),
  cardHeights, allCardsSameHeight: cardHeights.length > 0 &&
    cardHeights.every(h => Math.abs(h - cardHeights[0]) < 0.5),
  kpiInstanceCount: kpiCount,
  checks: {}
};
stripInfo.checks.widthUnchanged = near(strip.width, STRIP_EXPECTED_WIDTH);
stripInfo.checks.gapUnchanged = near(gap, STRIP_EXPECTED_GAP);
stripInfo.checks.noOverflow = r2(strip.width - occupied) >= -0.5;
stripInfo.checks.exactlyFourKpiInstances = kpiCount === TARGETS.length;
stripInfo.checks.allVisibleCardsFill = vis.length > 0 && vis.every(c => {
  let sh = null;
  try { sh = c.layoutSizingHorizontal; } catch (e) { /* 무시 */ }
  return sh === 'FILL';
});
stripInfo.checks.allCardsSameHeight = stripInfo.allCardsSameHeight;
const stripFailed = Object.keys(stripInfo.checks).filter(k => !stripInfo.checks[k]);
if (stripFailed.length) errors.push('strip 실패 항목: ' + stripFailed.join(', '));
stripInfo.failedChecks = stripFailed;
if (!stripInfo.checks.widthUnchanged) {
  notes.push('strip 폭이 ' + r2(strip.width) + ' 다. 기대값 ' + STRIP_EXPECTED_WIDTH +
             ' 과 다르다 — 누가 바꿨거나 기대값이 틀렸다.');
}

/* ---------- 페이지 미아 ---------- */
const pageStrays = [];
for (const c of figma.currentPage.children) {
  if (await isKpiInstance(c)) pageStrays.push({ id: c.id, name: c.name,
    size: r2(c.width) + '×' + r2(c.height) });
}
if (pageStrays.length) errors.push('페이지 최상위에 떠도는 KPI 인스턴스 ' + pageStrays.length + '개');

/* ---------- 집계 ---------- */
const allOf = k => rows.length === TARGETS.length && rows.every(r => r.checks[k] !== false);
const successCriteria = {
  fourOriginalsExistAndHidden: rows.length === TARGETS.length &&
    rows.every(r => r.checks.originalStillExists === true && r.checks.originalHidden === true),
  fourNewInstances: rows.filter(r => r.checks.newInstanceExists === true).length === TARGETS.length,
  siblingOrderAsPlanned: allOf('newInstanceImmediatelyBeforeOriginal'),
  variantsCorrect: allOf('variantCorrect'),
  titlesCorrect: allOf('titleCorrect'),
  valuesCorrect: allOf('valueCorrect'),
  unitsCorrect: allOf('unitCorrect'),
  badgeTextsCorrect: allOf('badgeTextCorrect'),
  captionsCorrect: rows.length === TARGETS.length && rows.every(r =>
    r.checks.captionTextCorrect !== false && r.checks.captionVisibleCorrect !== false &&
    r.checks.captionHidden !== false),
  allSizingFill: allOf('sizingIsFill'),
  allLayoutGrowOne: allOf('layoutGrowIsOne'),
  heightsMatchMaster: allOf('heightMatchesMaster'),
  stripWidthUnchanged: stripInfo.checks.widthUnchanged === true,
  stripGapUnchanged: stripInfo.checks.gapUnchanged === true,
  stripNoOverflow: stripInfo.checks.noOverflow === true,
  exactlyFourKpiInstances: stripInfo.checks.exactlyFourKpiInstances === true,
  allCardsSameHeight: stripInfo.checks.allCardsSameHeight === true,
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
  cards: rows,
  strip: stripInfo,
  measured: {
    cardSizes: rows.map(r => ({ key: r.key, size: r.size, sizingH: r.sizingH, grow: r.layoutGrow })),
    stripSize: stripInfo.width + '×' + stripInfo.height,
    stripOccupiedWidth: stripInfo.occupiedWidth,
    stripFreeSpace: stripInfo.freeSpace,
    cardHeights: stripInfo.cardHeights
  },
  heightAnalysis: {
    perCard: rows.map(r => ({ key: r.key, captionAction: r.captionAction,
      height: r.height, masterHeight: r.masterHeight, diff: r.heightVsMaster })),
    captionAffectsHeight: (function () {
      const hide = rows.filter(r => r.captionAction === 'hide' && typeof r.height === 'number');
      const set = rows.filter(r => r.captionAction === 'set' && typeof r.height === 'number');
      if (!hide.length || !set.length) return null;
      return !near(hide[0].height, set[0].height);
    })(),
    note: 'captionAffectsHeight 가 true 면 caption 이 세로 배치에 들어 있다는 뜻이고, ' +
          '감사에서 읽은 "가로 footer row 안이라 높이에 영향 없음" 전제가 틀린 것이다.'
  },
  measurementNote: '폭은 FILL 이라 strip 폭에서 계산된 값이 나온다. 실측을 기록하고 기대 숫자로 고정하지 않는다. ' +
                   'strip 폭과 gap 만 유지 여부를 조건으로 둔다.',
  pageStrays,
  successCriteria,
  successCriteriaMet,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 12)
});
