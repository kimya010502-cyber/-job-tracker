/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 21b
 * Phase E 최종 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * setPluginData / .characters= / .fills= / .visible= / .layoutSizing= 를
 * 한 줄도 포함하지 않는다.
 *
 * 이미 측정된 레이아웃 빚(내용 14px 넘침, 푸터 겹침)은 실패로 보지 않는다.
 * 다만 값이 예상과 달라지면 기록한다.
 * ========================================================================== */

const SCRIPT_VERSION = '21b-v1-phaseE-verify';

const GRID_ID = '1002:140';
const APPCARD_SET_ID = '1037:2163';
const FOOTER_ID = '1002:451';
const VARIANT_IDS = { inProgress: '1037:2093', ended: '1037:2128' };
const ARCHIVE_NAME = '[Archive] Phase E — Original Application Cards';
const STAGING_NAME = '[Temp] Phase E — Prepared App Cards';
const ARCHIVE_META_KEY = 'joob.phaseE.archive';

const OLD_CARD_IDS = [
  '1002:141', '1003:1749', '1003:1794', '1003:1839',
  '1003:1884', '1003:1929', '1003:1974', '1003:2019',
  '1009:3', '1009:48', '1009:93', '1009:138'
];
const ENDED_CARD_ID = '1003:1794';

const ICONS = { dot: 'Icon / Dot', link: 'Icon / External Link', more: 'Icon / More' };
const EXPECT = {
  gridSize: '976×687', rowTracks: [205, 205, 205], rowYs: [0, 241, 482],
  cardHeight: 219, cardWidth: 235, childCount: 12, rowCount: 3
};
/* 참고값 — 실패 조건이 아니다 */
const KNOWN_DEBT = { contentOverflowPx: 14, footerOverlapByContentAfter: 65.5 };

const RE_STAGE_COUNT = /\d+\s*단계|단계\s*\d+|\d+\s*\/\s*\d+/;
const RE_STATUS = /접수|완료|확인|검토|조율|협의|불합격|탈락|합격|대기|종료|마감|철회/;
const RE_STAGE = /서류|면접|과제|인적성|코딩|필기|최종|포트폴리오|지원/;
const STATUS_TONE_TABLE = [
  { match: /접수\s*완료|접수/, tone: 'brand' },
  { match: /서류\s*확인|서류\s*검토|서류\s*통과/, tone: 'success' },
  { match: /일정\s*조율|일정\s*협의/, tone: 'brand' },
  { match: /불합격|탈락/, tone: 'danger' }
];

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' &&
                          Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function safeGet(node, key) {
  try { const v = node[key]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; }
}
function kids(n) { return Array.isArray(n.children) ? n.children : null; }
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
function trackValue(t) {
  if (typeof t === 'number') return r2(t);
  if (t && typeof t === 'object') {
    for (const k of ['value', 'size', 'length', 'px', 'fixed']) if (typeof t[k] === 'number') return r2(t[k]);
  }
  return null;
}
function uniqSorted(list) {
  const acc = [];
  for (const v of list) if (!acc.some(x => Math.abs(x - v) < 1)) acc.push(v);
  return acc.sort((a, b) => a - b);
}
function chipLike(root) {
  return collectDeep(root, x =>
    (x.type === 'FRAME' || x.type === 'GROUP' || x.type === 'INSTANCE') &&
    x.height <= 32 && x.height >= 12 &&
    collectDeep(x, y => y.type === 'TEXT', 3).length > 0, 6);
}
function textOf(node) {
  const t = collectDeep(node, x => x.type === 'TEXT', 3)[0];
  return t ? t.characters : null;
}
function toneForStatus(text) {
  const t = text || '';
  for (const row of STATUS_TONE_TABLE) if (row.match.test(t)) return row.tone;
  return null;
}
/* 카드 하나에서 칩 4개의 역할과 본문 텍스트를 뽑는다 — 21 과 같은 방식 */
function readCardContent(node) {
  const chips = chipLike(node).map(ch => ({ id: ch.id, node: ch, text: textOf(ch),
    x: r2(ch.x), y: r2(ch.y) })).sort((a, b) => a.y - b.y || a.x - b.x);
  const roles = { position: null, stage: null, status: null, stageCount: null };
  const rest = [];
  for (const c of chips) {
    const t = c.text || '';
    if (RE_STAGE_COUNT.test(t)) { if (!roles.stageCount) roles.stageCount = c; continue; }
    if (RE_STATUS.test(t)) { if (!roles.status) roles.status = c; continue; }
    rest.push(c);
  }
  for (const c of rest) {
    if (!roles.stage && RE_STAGE.test(c.text || '')) { roles.stage = c; continue; }
    if (!roles.position) roles.position = c;
  }
  const chipTextIds = [];
  for (const c of chips) {
    const t = collectDeep(c.node, x => x.type === 'TEXT', 3)[0];
    if (t) chipTextIds.push(t.id);
  }
  const body = collectDeep(node, x => x.type === 'TEXT', 8)
    .filter(t => chipTextIds.indexOf(t.id) < 0)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(t => ({ name: t.name, characters: t.characters, y: r2(t.y) }));
  return {
    chips, roles, body,
    position: roles.position ? roles.position.text : null,
    stage: roles.stage ? roles.stage.text : null,
    status: roles.status ? roles.status.text : null,
    stageCount: roles.stageCount ? roles.stageCount.text : null,
    company: body.length ? body[0].characters : null,
    bodyTexts: body.map(b => b.characters)
  };
}

/* ---------- 대상 ---------- */
const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  aborted: true, reason: GRID_ID + ' 를 찾을 수 없다' });

const gridChildren = kids(grid) || [];
const rawTracks = safeGet(grid, 'gridRowSizes');
const gridState = {
  size: r2(grid.width) + '×' + r2(grid.height),
  width: r2(grid.width), height: r2(grid.height), y: r2(grid.y),
  childCount: gridChildren.length,
  rowCount: safeGet(grid, 'gridRowCount'),
  columnCount: safeGet(grid, 'gridColumnCount'),
  rowGap: safeGet(grid, 'gridRowGap'),
  rowTracks: Array.isArray(rawTracks) ? rawTracks.map(trackValue) : null,
  rowTrackTypes: Array.isArray(rawTracks)
    ? rawTracks.map(t => (t && typeof t === 'object' ? (t.type || null) : 'NUMBER')) : null,
  rowYs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.y))),
  columnXs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.x))),
  clipsContent: safeGet(grid, 'clipsContent')
};

/* ---------- archive / staging ---------- */
const pageKids = kids(figma.currentPage) || [];
const archiveFrames = pageKids.filter(c => c.name === ARCHIVE_NAME);
const stagingFrames = pageKids.filter(c => c.name === STAGING_NAME);
const tempFrames = pageKids.filter(c => /\[Temp\]|JOOB PROBE TEMP/i.test(c.name || ''))
  .map(c => ({ id: c.id, name: c.name }));
const archive = archiveFrames[0] || null;
const archiveKids = archive ? (kids(archive) || []) : [];
const archiveIds = archiveKids.map(c => c.id);

let archiveMeta = null;
let archiveMetaError = null;
if (archive) {
  try {
    const raw = archive.getPluginData(ARCHIVE_META_KEY);
    if (raw) archiveMeta = JSON.parse(raw);
    else archiveMetaError = 'archive 프레임에 매핑 기록이 없다';
  } catch (e) { archiveMetaError = 'archive 매핑 기록을 읽지 못했다: ' + e.message; }
}
const metaBySrc = {};
if (archiveMeta && Array.isArray(archiveMeta.cards)) {
  for (const c of archiveMeta.cards) metaBySrc[c.srcId] = c;
}

/* ---------- 그리드 자식이 전부 App Card 인스턴스인가 ---------- */
const cardRecords = [];
const nonAppCardChildren = [];
for (const c of gridChildren) {
  if (c.type !== 'INSTANCE') { nonAppCardChildren.push({ id: c.id, name: c.name, type: c.type }); continue; }
  const mc = await mainCompOf(c);
  const inSet = !!(mc && mc.parent && mc.parent.id === APPCARD_SET_ID);
  if (!inSet) { nonAppCardChildren.push({ id: c.id, name: c.name, type: c.type,
    mainComponent: mc ? mc.name : null }); continue; }
  cardRecords.push({ node: c, mainId: mc.id, mainName: mc.name });
}

/* ---------- 새 인스턴스 ↔ 원본 짝짓기 ----------
 * archive 기록의 newInstanceId 가 있으면 그걸 쓴다. 없으면 셀 좌표로 맞춘다. */
const pairBy = archiveMeta ? 'archive 기록 (newInstanceId)' : '셀 좌표';
const pairs = [];
const unpairedNewIds = [];
for (const rec of cardRecords) {
  let srcId = null;
  for (const id of Object.keys(metaBySrc)) {
    if (metaBySrc[id].newInstanceId === rec.node.id) { srcId = id; break; }
  }
  if (!srcId && archiveMeta) {
    for (const id of Object.keys(metaBySrc)) {
      const m = metaBySrc[id];
      if (near(m.x, r2(rec.node.x)) && near(m.y, r2(rec.node.y))) { srcId = id; break; }
    }
  }
  if (!srcId) unpairedNewIds.push(rec.node.id);
  pairs.push({ srcId, rec });
}

/* ---------- 카드별 검증 ---------- */
const cards = [];
for (const pair of pairs) {
  const node = pair.rec.node;
  const srcId = pair.srcId;
  const meta = srcId ? metaBySrc[srcId] : null;
  const archivedOld = srcId ? archiveKids.filter(c => c.id === srcId)[0] || null : null;

  const row = { newInstanceId: node.id, srcId, pairedBy: pairBy, checks: {}, detail: {} };

  /* variant */
  const expectedTone = srcId === ENDED_CARD_ID ? 'ended' : 'inProgress';
  row.detail.variantName = pair.rec.mainName;
  row.detail.variantId = pair.rec.mainId;
  row.detail.expectedTone = expectedTone;
  row.checks.variantCorrect = pair.rec.mainId === VARIANT_IDS[expectedTone];

  /* 셀 */
  const cell = { row: safeGet(node, 'gridRowAnchorIndex'), col: safeGet(node, 'gridColumnAnchorIndex'),
    rowSpan: safeGet(node, 'gridRowSpan'), colSpan: safeGet(node, 'gridColumnSpan'),
    x: r2(node.x), y: r2(node.y) };
  row.detail.cell = cell;
  row.detail.originalCell = meta
    ? { row: meta.row, col: meta.column, rowSpan: meta.rowSpan, colSpan: meta.columnSpan, x: meta.x, y: meta.y }
    : null;
  row.checks.cellMatchesOriginal = !!meta && cell.row === meta.row && cell.col === meta.column &&
    cell.rowSpan === meta.rowSpan && cell.colSpan === meta.columnSpan &&
    near(cell.x, meta.x) && near(cell.y, meta.y);

  /* 크기 · sizing */
  row.detail.size = r2(node.width) + '×' + r2(node.height);
  row.detail.widthPx = r2(node.width);
  row.detail.heightPx = r2(node.height);
  row.detail.layoutSizingHorizontal = safeGet(node, 'layoutSizingHorizontal');
  row.detail.layoutSizingVertical = safeGet(node, 'layoutSizingVertical');
  row.detail.layoutGrow = safeGet(node, 'layoutGrow');
  row.checks.sizingIsFill = row.detail.layoutSizingHorizontal === 'FILL';
  row.checks.layoutGrowIsOne = row.detail.layoutGrow === 1;
  row.checks.heightIsMasterHeight = near(node.height, EXPECT.cardHeight, 1.5);
  row.checks.widthIsColumnWidth = near(node.width, EXPECT.cardWidth, 1.5);

  /* 내용 — archive 에 있는 원본과 직접 비교한다 */
  const nowContent = readCardContent(node);
  const oldContent = archivedOld ? readCardContent(archivedOld) : null;
  row.detail.content = { company: nowContent.company, position: nowContent.position,
    stage: nowContent.stage, status: nowContent.status, stageCount: nowContent.stageCount,
    bodyTexts: nowContent.bodyTexts };
  row.detail.originalContent = oldContent ? { company: oldContent.company, position: oldContent.position,
    stage: oldContent.stage, status: oldContent.status, stageCount: oldContent.stageCount,
    bodyTexts: oldContent.bodyTexts } : null;
  const fields = ['company', 'position', 'stage', 'status', 'stageCount'];
  row.detail.contentDiff = oldContent
    ? fields.filter(f => nowContent[f] !== oldContent[f])
        .map(f => ({ field: f, old: oldContent[f], now: nowContent[f] })) : null;
  row.checks.contentMatchesOriginal = !!oldContent && row.detail.contentDiff.length === 0;
  row.checks.originalFoundInArchive = !!archivedOld;

  /* 상태 텍스트와 variant 가 논리적으로 맞는가 */
  const statusText = nowContent.status;
  const statusImpliesEnded = !!statusText && /불합격|탈락|종료|마감|취소|철회/.test(statusText);
  row.detail.statusText = statusText;
  row.detail.statusImpliesEnded = statusImpliesEnded;
  row.checks.statusAgreesWithVariant = statusImpliesEnded
    ? (expectedTone === 'ended') : (expectedTone === 'inProgress');
  if (!row.checks.statusAgreesWithVariant) {
    notes.push(node.id + ' — 상태 텍스트 "' + statusText + '" 와 variant ' + expectedTone +
      ' 가 논리적으로 어긋난다. 사람이 확정한 매핑이지만 한 번 더 봐주세요.');
  }

  /* 칩 tone */
  row.detail.chipTones = {};
  const toneChecks = [];
  for (const role of ['position', 'stage', 'status', 'stageCount']) {
    const chipRef = nowContent.roles[role];
    let value = null;
    if (chipRef && chipRef.node.type === 'INSTANCE') {
      try {
        const cp = chipRef.node.componentProperties;
        if (cp) {
          const hit = Object.keys(cp).filter(k => /^tone/i.test(k.split('#')[0]))[0];
          value = hit ? String(cp[hit].value) : null;
        }
      } catch (e) { /* 무시 */ }
    }
    const want = role === 'status' ? toneForStatus(statusText) : 'neutral';
    row.detail.chipTones[role] = { text: chipRef ? chipRef.text : null, tone: value, expected: want };
    toneChecks.push(!!value && !!want && value.toLowerCase() === want.toLowerCase());
  }
  row.checks.chipTextsResolved = ['position', 'stage', 'status', 'stageCount']
    .every(k => !!nowContent.roles[k]);
  row.checks.chipTonesCorrect = toneChecks.every(Boolean);

  /* Stage Count Dot */
  const scChip = nowContent.roles.stageCount;
  let dotNode = null, dotMain = null;
  if (scChip) {
    dotNode = collectDeep(scChip.node, x => /^leading$/i.test(x.name || ''), 4)[0] || null;
    if (dotNode && dotNode.type === 'INSTANCE') dotMain = await mainCompOf(dotNode);
  }
  row.detail.stageCountDot = { exists: !!dotNode, visible: dotNode ? dotNode.visible : null,
    mainComponent: dotMain ? dotMain.name : null };
  row.checks.stageCountDotVisible = !!dotNode && dotNode.visible === true;
  row.checks.stageCountDotIsDotIcon = !!dotMain && dotMain.name === ICONS.dot;

  /* 나머지 칩의 leading 은 숨김 유지 */
  const otherLeading = [];
  for (const role of ['position', 'stage', 'status']) {
    const ref = nowContent.roles[role];
    const lead = ref ? (collectDeep(ref.node, x => /^leading$/i.test(x.name || ''), 4)[0] || null) : null;
    otherLeading.push({ role, exists: !!lead, visible: lead ? lead.visible : null });
  }
  row.detail.otherChipLeading = otherLeading;
  row.checks.otherChipLeadingStillHidden = otherLeading.every(o => !o.exists || o.visible === false);

  /* link / more */
  const insts = collectDeep(node, x => x.type === 'INSTANCE', 8);
  const iconRows = [];
  for (const role of ['link', 'more']) {
    const want = role === 'link' ? ICONS.link : ICONS.more;
    let found = null, foundMain = null;
    for (const inst of insts) {
      const mc = await mainCompOf(inst);
      if (mc && mc.name === want) { found = inst; foundMain = mc; break; }
    }
    if (!found) {
      for (const inst of insts) {
        if (new RegExp(role, 'i').test(inst.name || '')) { found = inst; foundMain = await mainCompOf(inst); break; }
      }
    }
    iconRows.push({ role, found: !!found, mainComponent: foundMain ? foundMain.name : null,
      expected: want, visible: found ? found.visible : null,
      ok: !!foundMain && foundMain.name === want && !!found && found.visible === true });
  }
  row.detail.iconButtons = iconRows;
  row.checks.linkIconCorrect = iconRows[0].ok;
  row.checks.moreIconCorrect = iconRows[1].ok;

  /* Status Indicator */
  const si = collectDeep(node, x => /status\s*indicator|상태\s*표시/i.test(x.name || ''), 8)[0] || null;
  let siValues = [];
  if (si && si.type === 'INSTANCE') {
    try {
      const cp = si.componentProperties;
      if (cp) siValues = Object.keys(cp).map(k => String(cp[k].value));
    } catch (e) { /* 무시 */ }
  }
  row.detail.statusIndicator = { found: !!si, values: siValues, expected: expectedTone };
  row.checks.statusIndicatorCorrect = !!si &&
    (siValues.length === 0 || siValues.some(v => v.toLowerCase() === expectedTone.toLowerCase()));

  row.failedChecks = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (row.failedChecks.length) errors.push(node.id + ' 실패 항목: ' + row.failedChecks.join(', '));
  cards.push(row);
}

/* ---------- 레이아웃 빚 (참고값, 실패 아님) ---------- */
const lastRowTop = gridState.rowYs.length ? gridState.rowYs[gridState.rowYs.length - 1] : null;
const cardHeightNow = cards.length ? cards[0].detail.heightPx : null;
const contentBottom = (lastRowTop !== null && cardHeightNow !== null) ? r2(lastRowTop + cardHeightNow) : null;
const contentOverflow = contentBottom === null ? null : r2(Math.max(0, contentBottom - gridState.height));
const footer = await figma.getNodeByIdAsync(FOOTER_ID);
const footerTop = footer ? r2(footer.y) : null;
const footerOverlapByContent = (footerTop !== null && contentBottom !== null)
  ? r2((gridState.y + contentBottom) - footerTop) : null;

const layoutDebt = {
  gridFrameBottom: r2(gridState.y + gridState.height),
  contentBottom: contentBottom === null ? null : r2(gridState.y + contentBottom),
  contentOverflowPx: contentOverflow,
  footerTop,
  footerOverlapByContent,
  expected: KNOWN_DEBT,
  matchesExpectation: near(contentOverflow, KNOWN_DEBT.contentOverflowPx, 1) &&
    near(footerOverlapByContent, KNOWN_DEBT.footerOverlapByContentAfter, 1),
  treatedAsFailure: false,
  note: 'Phase E 는 그리드 트랙 높이와 푸터 위치를 고치지 않는다. 이 값은 기록용이다.'
};
if (!layoutDebt.matchesExpectation) {
  notes.push('레이아웃 빚 값이 예상과 다르다 — 넘침 ' + contentOverflow + 'px (예상 ' +
    KNOWN_DEBT.contentOverflowPx + '), 푸터 겹침 ' + footerOverlapByContent + 'px (예상 ' +
    KNOWN_DEBT.footerOverlapByContentAfter + '). 실패로 보지는 않지만 확인이 필요하다.');
}

/* ---------- 중복 / 떠도는 노드 ---------- */
const newIdCounts = {};
for (const c of cards) newIdCounts[c.newInstanceId] = (newIdCounts[c.newInstanceId] || 0) + 1;
const duplicateNewInstances = Object.keys(newIdCounts).filter(k => newIdCounts[k] > 1);
const srcCounts = {};
for (const c of cards) if (c.srcId) srcCounts[c.srcId] = (srcCounts[c.srcId] || 0) + 1;
const duplicateSrcMappings = Object.keys(srcCounts).filter(k => srcCounts[k] > 1);

/* 페이지 최상위에 App Card 인스턴스가 떠돌지 않는가 */
const strayAppCards = [];
for (const c of pageKids) {
  if (c.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(c);
  if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) strayAppCards.push({ id: c.id, name: c.name });
}
/* archive 안에 새 인스턴스가 섞여 있지 않은가 */
const strayInArchive = [];
for (const c of archiveKids) {
  if (c.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(c);
  if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) strayInArchive.push(c.id);
}

/* old 12장이 아직 그리드 자식인가 */
const oldStillInGrid = OLD_CARD_IDS.filter(id => gridChildren.some(c => c.id === id));
const oldMissingFromArchive = OLD_CARD_IDS.filter(id => archiveIds.indexOf(id) < 0);

/* ---------- 성공 조건 ---------- */
const endedCards = cards.filter(c => c.detail.variantId === VARIANT_IDS.ended);
const inProgressCards = cards.filter(c => c.detail.variantId === VARIANT_IDS.inProgress);

const successCriteria = {
  archiveFrameExists: !!archive,
  singleArchiveFrame: archiveFrames.length === 1,
  archiveHasAll12Originals: oldMissingFromArchive.length === 0,
  oldCardsNoLongerInGrid: oldStillInGrid.length === 0,
  noStagingFrame: stagingFrames.length === 0,
  noTempFrames: tempFrames.length === 0,
  gridChildCountIs12: gridState.childCount === EXPECT.childCount,
  allGridChildrenAreAppCards: nonAppCardChildren.length === 0 && cards.length === EXPECT.childCount,
  exactlyOneEndedCard: endedCards.length === 1,
  endedCardIsTheRightOne: endedCards.length === 1 && endedCards[0].srcId === ENDED_CARD_ID,
  otherElevenAreInProgress: inProgressCards.length === 11,
  allVariantsCorrect: cards.length > 0 && cards.every(c => c.checks.variantCorrect),
  allCellsMatchOriginal: cards.length > 0 && cards.every(c => c.checks.cellMatchesOriginal),
  rowCountIs3: gridState.rowCount === EXPECT.rowCount,
  noFourthRow: gridState.rowYs.length === EXPECT.rowCount,
  gridSizeUnchanged: gridState.size === EXPECT.gridSize,
  rowTracksUnchanged: Array.isArray(gridState.rowTracks) &&
    gridState.rowTracks.length === EXPECT.rowTracks.length &&
    gridState.rowTracks.every((v, i) => near(v, EXPECT.rowTracks[i])),
  rowYsUnchanged: gridState.rowYs.length === EXPECT.rowYs.length &&
    gridState.rowYs.every((v, i) => near(v, EXPECT.rowYs[i], 1)),
  allContentMatchesOriginal: cards.length > 0 && cards.every(c => c.checks.contentMatchesOriginal),
  allChipTextsResolved: cards.length > 0 && cards.every(c => c.checks.chipTextsResolved),
  allChipTonesCorrect: cards.length > 0 && cards.every(c => c.checks.chipTonesCorrect),
  allStageCountDotsVisible: cards.length > 0 && cards.every(c => c.checks.stageCountDotVisible),
  allStageCountDotsAreDotIcon: cards.length > 0 && cards.every(c => c.checks.stageCountDotIsDotIcon),
  otherChipLeadingStillHidden: cards.length > 0 && cards.every(c => c.checks.otherChipLeadingStillHidden),
  allLinkIconsCorrect: cards.length > 0 && cards.every(c => c.checks.linkIconCorrect),
  allMoreIconsCorrect: cards.length > 0 && cards.every(c => c.checks.moreIconCorrect),
  allStatusIndicatorsCorrect: cards.length > 0 && cards.every(c => c.checks.statusIndicatorCorrect),
  allSizingIsFill: cards.length > 0 && cards.every(c => c.checks.sizingIsFill),
  allLayoutGrowIsOne: cards.length > 0 && cards.every(c => c.checks.layoutGrowIsOne),
  allHeightsAreMasterHeight: cards.length > 0 && cards.every(c => c.checks.heightIsMasterHeight),
  noStrayAppCardsOnPage: strayAppCards.length === 0,
  noNewInstancesInArchive: strayInArchive.length === 0,
  noDuplicateNewInstances: duplicateNewInstances.length === 0,
  noDuplicateSourceMappings: duplicateSrcMappings.length === 0,
  everyCardPairedToOriginal: cards.length > 0 && cards.every(c => !!c.srcId),
  archiveMetadataReadable: !!archiveMeta,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);

if (archiveMetaError) notes.push(archiveMetaError);
if (unpairedNewIds.length) notes.push('원본과 짝짓지 못한 새 인스턴스: ' + unpairedNewIds.join(', '));
if (nonAppCardChildren.length) {
  errors.push('App Card 인스턴스가 아닌 그리드 자식: ' + JSON.stringify(nonAppCardChildren));
}

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY',
  readOnly: true,
  aborted: false,

  successCriteria, successCriteriaMet, failedCriteria,

  grid: gridState,
  expected: EXPECT,

  archive: {
    exists: !!archive, frameCount: archiveFrames.length,
    id: archive ? archive.id : null, name: ARCHIVE_NAME,
    childCount: archiveKids.length, childIds: archiveIds,
    missingOriginals: oldMissingFromArchive,
    metadataReadable: !!archiveMeta,
    metadataError: archiveMetaError,
    metadataCardCount: archiveMeta && Array.isArray(archiveMeta.cards) ? archiveMeta.cards.length : null,
    strayNewInstances: strayInArchive
  },
  staging: { frameCount: stagingFrames.length, ids: stagingFrames.map(f => f.id) },
  tempFrames,
  strayAppCardsOnPage: strayAppCards,
  duplicateNewInstances, duplicateSrcMappings, unpairedNewIds,
  oldStillInGrid,
  nonAppCardChildren,

  pairingBasis: pairBy,
  cardCount: cards.length,
  endedCount: endedCards.length,
  inProgressCount: inProgressCards.length,
  cards,

  knownLayoutDebt: layoutDebt,

  notes,
  errorCount: errors.length,
  errors: errors.slice(0, 10),
  verdict: successCriteriaMet
    ? 'Phase E CLOSED — 12장 전부 App Card 인스턴스로 교체됐고 원본은 archive 에 남아 있습니다.'
    : '아직 닫을 수 없습니다. failedCriteria 를 확인해주세요.'
});
