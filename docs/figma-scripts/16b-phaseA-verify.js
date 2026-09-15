/* ============================================================================
 * 줍줍 — 스크립트 16b
 * Phase A 검증 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= 를 한 줄도 포함하지 않는다.
 *
 * 확인하는 것
 *   A-1 v2.4   새 Chip 인스턴스 존재 · tone=neutral · label "v2.4" · leading 숨김 · 원본 1002:506 숨김
 *   A-2 시즌   새 Chip 인스턴스 존재 · tone=brand   · label "2026 하반기 시즌" ·
 *              leading 노출 · leading = Icon / Dot · 원본 1009:703 숨김
 *   보류 동기화 1002:478 은 손대지 않았고 visible = true
 *   부모 높이 세 곳 모두 교체 전 값 유지
 *   형제 순서: 새 인스턴스 바로 다음이 숨긴 원본
 *   중복 인스턴스 없음
 *
 * 부모 높이 기대값은 Phase A 이전 실측치다 (16a v2 결과).
 *   v2.4 부모 34 · 동기화 부모 34.67 · 시즌 부모 36
 * 값이 다르면 실패로 보고 원인을 찾는다. 기대값 쪽을 고치지 않는다.
 * ========================================================================== */

const SCRIPT_VERSION = '16b-v2-phaseA-verify-season-dot';

const CHIP_SET_ID = '1029:1984';
const DOT_ICON_NAME = 'Icon / Dot';

const TARGETS = [
  { key: 'version', label: 'v2.4 버전 배지', srcId: '1002:506',
    tone: 'tone=neutral', text: 'v2.4',
    leadingVisible: false, leadingIcon: null, parentHeightBefore: 34 },

  { key: 'season', label: '시즌 배지', srcId: '1009:703',
    tone: 'tone=brand', text: '2026 하반기 시즌',
    leadingVisible: true, leadingIcon: DOT_ICON_NAME, parentHeightBefore: 36 }
];

const DEFERRED = [
  { key: 'sync', label: '실시간 동기화 완료 배지', srcId: '1002:478', parentHeightBefore: 34.67,
    /* Phase A 이전 실측 (16a v2). "손대지 않았다" 를 선언이 아니라 수치로 확인한다. */
    expectedSize: '131×24', expectedFill: '#eff4ff' }
];

const errors = [];
const notes = [];
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.5;
const kids = n => Array.isArray(n.children) ? n.children : null;

function deepFill(n, depth) {
  if (!n || depth <= 0) return null;
  const cs = kids(n);
  if (!cs) return null;
  for (const c of cs) { const h = firstSolidHex(c) || deepFill(c, depth - 1); if (h) return h; }
  return null;
}
function firstSolidHex(n) {
  if (!n || !Array.isArray(n.fills)) return null;
  const f = n.fills.filter(x => x.visible !== false && x.type === 'SOLID')[0];
  if (!f) return null;
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(f.color.r) + h(f.color.g) + h(f.color.b);
}

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
function findByName(n, name) {
  const cs = kids(n);
  if (!cs) return null;
  for (const c of cs) if (c.name === name) return c;
  return null;
}
async function isChipInstance(n) {
  if (!n || n.type !== 'INSTANCE') return false;
  const mc = await mainCompOf(n);
  return !!(mc && mc.parent && mc.parent.id === CHIP_SET_ID);
}

/* ---------- Chip 세트 ---------- */
const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
if (!chipSet || chipSet.type !== 'COMPONENT_SET') {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true, aborted: true,
               reason: 'Chip 세트 ' + CHIP_SET_ID + ' 를 찾지 못함' });
}

/* ---------- 대상별 검증 ---------- */
const rows = [];
for (const t of TARGETS) {
  const row = { key: t.key, label: t.label, srcId: t.srcId, checks: {} };
  const src = await figma.getNodeByIdAsync(t.srcId);

  row.originalFound = !!src;
  row.checks.originalStillExists = !!src;
  if (!src) { errors.push(t.label + ' 원본 노드가 사라졌다 (삭제 금지 위반)'); rows.push(row); continue; }

  row.originalVisible = src.visible;
  row.checks.originalHidden = src.visible === false;

  const parent = src.parent;
  row.parentId = parent ? parent.id : null;
  row.parentName = parent ? parent.name : null;
  if (!parent) { errors.push(t.label + ' 부모를 찾지 못함'); rows.push(row); continue; }

  const cs = kids(parent) || [];
  const srcIdx = cs.indexOf(src);
  row.originalIndex = srcIdx;

  /* 계획상 새 인스턴스는 숨긴 원본 **바로 앞** 에 있다 */
  const cand = srcIdx > 0 ? cs[srcIdx - 1] : null;
  row.candidateId = cand ? cand.id : null;
  row.candidateType = cand ? cand.type : null;
  const isChip = await isChipInstance(cand);
  row.checks.newInstanceExists = isChip;
  row.checks.newInstanceIsAdjacentBeforeOriginal = isChip && srcIdx - 1 >= 0;

  if (isChip) {
    const inst = cand;
    row.newInstanceId = inst.id;
    row.newInstanceSize = r2(inst.width) + '×' + r2(inst.height);
    row.newInstanceIndex = srcIdx - 1;
    row.newInstanceVisible = inst.visible;
    row.checks.newInstanceVisible = inst.visible === true;

    const mc = await mainCompOf(inst);
    row.variantName = mc ? mc.name : null;
    row.checks.variantCorrect = !!mc && mc.name === t.tone;

    const label = findByName(inst, 'label');
    row.labelText = label ? label.characters : null;
    row.checks.labelCorrect = !!label && label.characters === t.text;

    const lead = findByName(inst, 'leading');
    row.leadingType = lead ? lead.type : null;
    row.leadingVisible = lead ? lead.visible : null;
    row.checks.leadingVisibleAsSpec = !!lead && lead.visible === t.leadingVisible;

    let leadMain = null;
    if (lead && lead.type === 'INSTANCE') { const m = await mainCompOf(lead); leadMain = m ? m.name : null; }
    row.leadingIcon = leadMain;
    row.checks.leadingIconCorrect = t.leadingIcon === null ? true : leadMain === t.leadingIcon;
    row.leadingFill = lead ? firstSolidHex(lead) || deepFill(lead, 3) : null;

    row.checks.heightIs24 = near(inst.height, 24);
  } else {
    errors.push(t.label + ' 숨긴 원본 바로 앞에 Chip 인스턴스가 없다');
  }

  /* 부모 높이 */
  row.parentHeightBefore = t.parentHeightBefore;
  row.parentHeightNow = r2(parent.height);
  row.checks.parentHeightUnchanged = near(parent.height, t.parentHeightBefore);

  /* 중복: 이 부모의 직계 자식 중 Chip 인스턴스는 정확히 1개여야 한다 */
  let chipCount = 0;
  for (const c of cs) if (await isChipInstance(c)) chipCount++;
  row.chipInstancesUnderParent = chipCount;
  /* 0개는 "교체가 안 됐다" 이고 2개 이상이 "중복" 이다. 둘은 다른 문제라 따로 본다. */
  row.checks.exactlyOneChipUnderParent = chipCount === 1;
  row.checks.noDuplicateChipUnderParent = chipCount <= 1;

  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(t.label + ' 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;
  rows.push(row);
}

/* ---------- 보류 대상: 손대지 않았는지 ---------- */
const deferredRows = [];
for (const d of DEFERRED) {
  const n = await figma.getNodeByIdAsync(d.srcId);
  const row = { key: d.key, label: d.label, srcId: d.srcId,
                status: 'Phase A skipped target — deferred sync badge', checks: {} };
  row.found = !!n;
  row.checks.stillExists = !!n;
  if (n) {
    row.visible = n.visible;
    row.size = r2(n.width) + '×' + r2(n.height);
    row.checks.stillVisible = n.visible === true;
    row.checks.notReplacedByChip = !(await isChipInstance(n));

    row.fill = firstSolidHex(n);
    row.expectedSize = d.expectedSize;
    row.expectedFill = d.expectedFill;
    row.checks.sizeUnchanged = row.size === d.expectedSize;
    row.checks.fillUnchanged = String(row.fill).toLowerCase() === String(d.expectedFill).toLowerCase();

    const p = n.parent;
    row.parentId = p ? p.id : null;
    row.parentName = p ? p.name : null;
    row.parentHeightBefore = d.parentHeightBefore;
    row.parentHeightNow = p ? r2(p.height) : null;
    row.checks.parentHeightUnchanged = !!p && near(p.height, d.parentHeightBefore);

    /* 동기화 배지 옆에 Chip 인스턴스가 새로 생기지 않았는지 */
    const cs = p ? (kids(p) || []) : [];
    let chipCount = 0;
    for (const c of cs) if (await isChipInstance(c)) chipCount++;
    row.chipInstancesUnderParent = chipCount;
    row.checks.noChipAddedBeside = chipCount === 0;
  }
  const failed = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (failed.length) errors.push(d.label + '(보류 대상) 실패 항목: ' + failed.join(', '));
  row.failedChecks = failed;
  deferredRows.push(row);
}

/* ---------- 페이지에 떠도는 Chip 인스턴스 (createInstance 미아) ---------- */
const pageStrays = [];
for (const c of figma.currentPage.children) {
  if (await isChipInstance(c)) pageStrays.push({ id: c.id, name: c.name,
                                                 size: r2(c.width) + '×' + r2(c.height) });
}
if (pageStrays.length) errors.push('페이지 최상위에 떠도는 Chip 인스턴스 ' + pageStrays.length + '개');

/* ---------- 집계 ---------- */
const versionRow = rows.filter(r => r.key === 'version')[0] || null;
const seasonRow = rows.filter(r => r.key === 'season')[0] || null;
const allChecksOf = r => r && Object.keys(r.checks).every(k => r.checks[k] !== false);

const seasonLeadingIsIconDot = !!seasonRow && seasonRow.leadingIcon === DOT_ICON_NAME;
const seasonLeadingVisible = !!seasonRow && seasonRow.leadingVisible === true;

const successCriteria = {
  versionReplaced: allChecksOf(versionRow),
  seasonLeadingIsIconDot,
  seasonLeadingVisible,
  seasonReplaced: allChecksOf(seasonRow),
  originalsHidden: rows.every(r => r.checks.originalHidden === true),
  originalsNotDeleted: rows.every(r => r.checks.originalStillExists === true),
  variantsCorrect: rows.every(r => r.checks.variantCorrect === true),
  labelsCorrect: rows.every(r => r.checks.labelCorrect === true),
  leadingStatesCorrect: rows.every(r => r.checks.leadingVisibleAsSpec === true &&
                                        r.checks.leadingIconCorrect === true),
  siblingOrderAsPlanned: rows.every(r => r.checks.newInstanceIsAdjacentBeforeOriginal === true),
  noDuplicates: rows.every(r => r.checks.noDuplicateChipUnderParent === true),
  exactlyOneChipPerParent: rows.every(r => r.checks.exactlyOneChipUnderParent === true),
  parentHeightsUnchanged: rows.every(r => r.checks.parentHeightUnchanged === true) &&
                          deferredRows.every(r => r.checks.parentHeightUnchanged !== false),
  deferredSyncUntouched: deferredRows.every(r => allChecksOf(r)),
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
  deferredCount: DEFERRED.length,
  targets: rows,
  deferred: deferredRows,
  deferredNote: '동기화 배지는 누락이 아니라 Phase A 에서 의도적으로 제외한 대상이다. ' +
                'tone 결정이 끝나면 별도 단계로 교체한다.',
  pageStrays,
  seasonLeading: seasonRow ? {
    icon: seasonRow.leadingIcon, visible: seasonRow.leadingVisible,
    type: seasonRow.leadingType, fill: seasonRow.leadingFill,
    note: 'fill 은 기록용이다. Icon / Dot 컴포넌트의 색을 그대로 따른다.'
  } : null,
  parentHeightSummary: rows.concat(deferredRows).map(r => ({
    label: r.label, parent: r.parentName + ' (' + r.parentId + ')',
    before: r.parentHeightBefore, now: r.parentHeightNow,
    unchanged: r.checks.parentHeightUnchanged
  })),
  successCriteria,
  successCriteriaMet,
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 10)
});
