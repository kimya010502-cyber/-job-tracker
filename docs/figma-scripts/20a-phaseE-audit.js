/* ============================================================================
 * 줍줍 — 스크립트 20a
 * Phase E 사전 감사: Application Card 12장 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * addComponentProperty / .fills= / .visible= / .layoutSizing= 를 한 줄도 포함하지 않는다.
 *
 * 이전 값을 하드코딩하지 않는다. 그리드의 현재 상태를 다시 읽는다.
 *
 * 이번 단계의 핵심 위험 — GRID 에서 숨긴 자식이 셀을 계속 차지하는가
 *   Auto Layout 은 숨긴 자식을 레이아웃에서 뺀다. Phase A~D 가 그 위에서 돌아갔다.
 *   **GRID 는 다른 레이아웃 모드고 그 증거는 GRID 로 옮겨오지 않는다.**
 *   게다가 자식에 명시적 셀 앵커(gridRowAnchorIndex 등)가 있으면
 *   숨긴 자식의 칸이 비어 있을 수 있고, 새 인스턴스가 다른 칸으로 갈 수도 있다.
 *   그래서 이 스크립트는 **가정하지 않고 파일에서 증거를 찾는다.**
 *   증거가 없으면 indeterminate 로 두고 gate 를 막는다.
 * ========================================================================== */

const SCRIPT_VERSION = '20a-v2-phaseE-audit';

const GRID_ID = '1002:140';
const APPCARD_SET_ID = '1037:2163';
const FOOTER_ID = '1002:451';

const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];
const ENDED_WORDS = /불합격|탈락|지원\s*철회|철회|종료|마감|취소|최종\s*탈락/;
const ENDED_WORDS_G = /불합격|탈락|지원\s*철회|철회|종료|마감|취소|최종\s*탈락/g;
const ONGOING_WORDS = /진행|검토|면접|서류|대기|접수|합격|제안|조율/;
/* 주의: 진행어 "합격" 은 종료어 "불합격" 안에도 들어 있다.
 * 그래서 진행어는 반드시 종료어를 먼저 지운 나머지 문자열에서만 찾는다. */

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
    const rec = { type: p.type, visible: p.visible !== false };
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
/* 인스턴스 내부로 들어가지 않고 직계만 세는 판정 */
function nestedInsideAnotherInstance(n, root) {
  let p = n.parent;
  while (p && p.id !== root.id) { if (p.type === 'INSTANCE') return true; p = p.parent; }
  return false;
}
function safeGet(n, prop) {
  try { const v = n[prop]; return v === undefined ? null : v; } catch (e) { return null; }
}

/* ---------- 그리드 ---------- */
const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, aborted: true,
                        reason: '그리드 ' + GRID_ID + ' 을 찾을 수 없음' });

const gridChildren = kids(grid) || [];
const gridInfo = {
  id: grid.id, name: grid.name, type: grid.type,
  size: r2(grid.width) + '×' + r2(grid.height),
  width: r2(grid.width), height: r2(grid.height),
  layoutMode: safeGet(grid, 'layoutMode'),
  layoutWrap: safeGet(grid, 'layoutWrap'),
  itemSpacing: r2(safeGet(grid, 'itemSpacing') || 0),
  counterAxisSpacing: safeGet(grid, 'counterAxisSpacing'),
  gridRowGap: safeGet(grid, 'gridRowGap'),
  gridColumnGap: safeGet(grid, 'gridColumnGap'),
  gridRowCount: safeGet(grid, 'gridRowCount'),
  gridColumnCount: safeGet(grid, 'gridColumnCount'),
  gridRowSizes: safeGet(grid, 'gridRowSizes'),
  gridColumnSizes: safeGet(grid, 'gridColumnSizes'),
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
    .map(k => r2(safeGet(grid, k) || 0)).join('/'),
  paddingH: r2((safeGet(grid, 'paddingLeft') || 0) + (safeGet(grid, 'paddingRight') || 0)),
  paddingV: r2((safeGet(grid, 'paddingTop') || 0) + (safeGet(grid, 'paddingBottom') || 0)),
  primaryAxisSizingMode: safeGet(grid, 'primaryAxisSizingMode'),
  counterAxisSizingMode: safeGet(grid, 'counterAxisSizingMode'),
  layoutSizingHorizontal: safeGet(grid, 'layoutSizingHorizontal'),
  layoutSizingVertical: safeGet(grid, 'layoutSizingVertical'),
  clipsContent: safeGet(grid, 'clipsContent'),
  childCount: gridChildren.length,
  children: gridChildren.map((c, i) => ({
    index: i, id: c.id, name: c.name, type: c.type, visible: c.visible,
    x: r2(c.x), y: r2(c.y), width: r2(c.width), height: r2(c.height),
    layoutPositioning: safeGet(c, 'layoutPositioning'),
    gridRowAnchorIndex: safeGet(c, 'gridRowAnchorIndex'),
    gridColumnAnchorIndex: safeGet(c, 'gridColumnAnchorIndex'),
    gridRowSpan: safeGet(c, 'gridRowSpan'),
    gridColumnSpan: safeGet(c, 'gridColumnSpan'),
    layoutGrow: safeGet(c, 'layoutGrow'),
    layoutSizingHorizontal: safeGet(c, 'layoutSizingHorizontal'),
    layoutSizingVertical: safeGet(c, 'layoutSizingVertical')
  }))
};
gridInfo.anyChildHasExplicitCellAnchor = gridInfo.children.some(c =>
  c.gridRowAnchorIndex !== null || c.gridColumnAnchorIndex !== null);
gridInfo.hiddenChildCount = gridInfo.children.filter(c => c.visible === false).length;
gridInfo.visibleChildCount = gridInfo.children.filter(c => c.visible !== false).length;

/* 좌표에서 실제 행·열을 읽는다 */
function uniqSorted(arr) {
  const out2 = [];
  for (const v of arr) if (!out2.some(x => Math.abs(x - v) < 1)) out2.push(v);
  return out2.sort((a, b) => a - b);
}
const visKids = gridInfo.children.filter(c => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
const xs = uniqSorted(visKids.map(c => c.x));
const ys = uniqSorted(visKids.map(c => c.y));
gridInfo.observedColumnXs = xs;
gridInfo.observedRowYs = ys;
gridInfo.observedColumns = xs.length;
gridInfo.observedRows = ys.length;
gridInfo.observedColumnGap = xs.length > 1 && visKids.length
  ? r2(xs[1] - xs[0] - visKids[0].width) : null;
gridInfo.observedRowGap = ys.length > 1 && visKids.length
  ? r2(ys[1] - ys[0] - visKids[0].height) : null;
gridInfo.gridBottom = r2(grid.y + grid.height);

/* ---------- 숨긴 자식이 셀을 차지하는가 ----------
 * 가정하지 않는다. 파일에 증거가 있으면 읽고, 없으면 indeterminate 로 둔다. */
const hiddenEvidence = {
  hiddenChildCount: gridInfo.hiddenChildCount,
  visibleChildCount: gridInfo.visibleChildCount,
  totalChildCount: gridInfo.childCount,
  explicitCellAnchorsPresent: gridInfo.anyChildHasExplicitCellAnchor,
  observedRows: gridInfo.observedRows,
  observedColumns: gridInfo.observedColumns,
  verdict: 'indeterminate',
  reason: null,
  evidenceSource: null
};
if (gridInfo.anyChildHasExplicitCellAnchor) {
  hiddenEvidence.verdict = 'cellsAreExplicit';
  hiddenEvidence.reason = '자식에 명시적 셀 앵커(gridRowAnchorIndex / gridColumnAnchorIndex)가 있다. ' +
    '칸이 좌표로 고정돼 있으므로 숨겨도 그 칸은 비어 있을 가능성이 높고, ' +
    '새 인스턴스가 어느 칸에 들어갈지도 앵커가 정한다. 자동 흐름 가정이 성립하지 않는다.';
  hiddenEvidence.evidenceSource = 'gridRowAnchorIndex / gridColumnAnchorIndex';
} else if (gridInfo.hiddenChildCount > 0) {
  /* 숨긴 자식이 이미 있으면, 보이는 자식 수로 칸이 설명되는지 본다 */
  const cellsIfHiddenExcluded = gridInfo.visibleChildCount;
  const cellsIfHiddenIncluded = gridInfo.childCount;
  const observedCells = gridInfo.observedRows * gridInfo.observedColumns;
  const exOk = observedCells >= cellsIfHiddenExcluded &&
               observedCells - cellsIfHiddenExcluded < gridInfo.observedColumns;
  const inOk = observedCells >= cellsIfHiddenIncluded &&
               observedCells - cellsIfHiddenIncluded < gridInfo.observedColumns;
  hiddenEvidence.observedCells = observedCells;
  hiddenEvidence.cellsIfHiddenExcluded = cellsIfHiddenExcluded;
  hiddenEvidence.cellsIfHiddenIncluded = cellsIfHiddenIncluded;
  if (exOk && !inOk) {
    hiddenEvidence.verdict = 'hiddenExcluded';
    hiddenEvidence.reason = '보이는 자식 수로 칸 배치가 설명되고 전체 수로는 설명되지 않는다';
  } else if (inOk && !exOk) {
    hiddenEvidence.verdict = 'hiddenOccupiesCell';
    hiddenEvidence.reason = '전체 자식 수로 칸 배치가 설명되고 보이는 수로는 설명되지 않는다';
  } else {
    hiddenEvidence.reason = '두 가설이 모두 맞거나 모두 안 맞아 구분되지 않는다';
  }
  hiddenEvidence.evidenceSource = '현재 숨긴 자식과 칸 배치 대조';
} else {
  hiddenEvidence.reason = '그리드에 숨긴 자식이 없어 현재 파일로는 판별할 수 없다. ' +
    'Phase A~D 의 근거는 Auto Layout 이고 GRID 는 다른 레이아웃 모드라 그대로 옮겨올 수 없다.';
  hiddenEvidence.evidenceSource = null;
}
if (hiddenEvidence.verdict !== 'hiddenExcluded') {
  notes.push('GRID 에서 숨긴 자식이 칸을 차지하는지 확정하지 못했다 (' + hiddenEvidence.verdict +
    '). Phase E 의 "원본을 숨겨서 보존" 정책이 그대로 통하지 않을 수 있다.');
}

/* ---------- 새 App Card 마스터 ---------- */
const set = await figma.getNodeByIdAsync(APPCARD_SET_ID);
let master = null;
if (set && set.type === 'COMPONENT_SET') {
  let props = null;
  try { props = set.componentPropertyDefinitions; } catch (e) { /* 무시 */ }
  master = { setId: set.id, name: set.name,
             variantNames: set.children.map(c => c.name),
             properties: props ? Object.keys(props).map(k => ({ key: k, type: props[k].type,
               defaultValue: props[k].defaultValue })) : [],
             variants: [] };

  for (const v of set.children) {
    const vrec = { name: v.name, id: v.id,
      size: r2(v.width) + '×' + r2(v.height), width: r2(v.width), height: r2(v.height),
      layoutMode: safeGet(v, 'layoutMode'),
      padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
        .map(k => r2(safeGet(v, k) || 0)).join('/'),
      gap: r2(safeGet(v, 'itemSpacing') || 0),
      widthMode: safeGet(v, 'layoutSizingHorizontal'),
      heightMode: safeGet(v, 'layoutSizingVertical'),
      cornerRadius: safeGet(v, 'cornerRadius') };

    /* 텍스트 노드 */
    const texts = collectDeep(v, x => x.type === 'TEXT', 8);
    vrec.textNodes = [];
    for (const t of texts) {
      vrec.textNodes.push({ id: t.id, name: t.name, characters: t.characters,
        y: r2(t.y), fontSize: r2(safeGet(t, 'fontSize')),
        insideInstance: nestedInsideAnotherInstance(t, v),
        editable: !nestedInsideAnotherInstance(t, v) ? 'direct override' : 'nested instance override' });
    }

    /* 직계 인스턴스 vs 중첩 인스턴스 */
    const allInst = collectDeep(v, x => x.type === 'INSTANCE', 8);
    vrec.directInstances = [];
    vrec.nestedInstances = [];
    for (const inst of allInst) {
      const mc = await mainCompOf(inst);
      const entry = { id: inst.id, name: inst.name,
        mainComponent: mc ? mc.name : null,
        mainSet: mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : null,
        size: r2(inst.width) + '×' + r2(inst.height), visible: inst.visible };
      if (nestedInsideAnotherInstance(inst, v)) vrec.nestedInstances.push(entry);
      else vrec.directInstances.push(entry);
    }
    vrec.directInstanceCount = vrec.directInstances.length;
    vrec.nestedInstanceCount = vrec.nestedInstances.length;
    vrec.recursiveInstanceTotal = allInst.length;

    /* 역할별 분류 */
    vrec.chips = vrec.directInstances.filter(x => x.mainSet === 'Chip' || /chip/i.test(x.name || ''));
    vrec.iconButtons = vrec.directInstances.filter(x =>
      x.mainSet === 'Icon Button' || /icon\s*button|link|more/i.test(x.name || ''));
    vrec.statusIndicators = vrec.directInstances.filter(x =>
      /status|indicator/i.test((x.name || '') + ' ' + (x.mainSet || '')));
    vrec.otherDirectInstances = vrec.directInstances.filter(x =>
      vrec.chips.indexOf(x) < 0 && vrec.iconButtons.indexOf(x) < 0 &&
      vrec.statusIndicators.indexOf(x) < 0);

    /* stage count 영역 */
    const stageNodes = collectDeep(v, x => /stage\s*count|단계/i.test(x.name || ''), 8);
    vrec.stageCountNodes = [];
    for (const sn of stageNodes) {
      const lead = collectDeep(sn, x => x.name === 'leading', 4)[0] ||
                   (sn.name === 'leading' ? sn : null);
      let leadMain = null;
      if (lead && lead.type === 'INSTANCE') { const m = await mainCompOf(lead); leadMain = m ? m.name : null; }
      vrec.stageCountNodes.push({ id: sn.id, name: sn.name, type: sn.type, visible: sn.visible,
        size: r2(sn.width) + '×' + r2(sn.height),
        leadingId: lead ? lead.id : null, leadingType: lead ? lead.type : null,
        leadingVisible: lead ? lead.visible : null, leadingMainComponent: leadMain });
    }

    /* 모든 leading 슬롯의 기본 노출 상태 */
    const leads = collectDeep(v, x => x.name === 'leading', 8);
    vrec.leadingSlots = [];
    for (const l of leads) {
      let lm = null;
      if (l.type === 'INSTANCE') { const m = await mainCompOf(l); lm = m ? m.name : null; }
      vrec.leadingSlots.push({ id: l.id, type: l.type, visible: l.visible, mainComponent: lm,
        parentName: l.parent ? l.parent.name : null,
        insideInstance: nestedInsideAnotherInstance(l, v) });
    }
    master.variants.push(vrec);
  }
}

/* ---------- 기존 카드 12장 ---------- */
async function isAppCardInstance(n) {
  if (!n || n.type !== 'INSTANCE') return false;
  const mc = await mainCompOf(n);
  return !!(mc && mc.parent && mc.parent.id === APPCARD_SET_ID);
}
const cardNodes = [];
const alreadyReplaced = [];
for (const c of gridChildren) {
  if (c.layoutPositioning === 'ABSOLUTE') continue;
  if (await isAppCardInstance(c)) { alreadyReplaced.push(c.id); continue; }
  if (collectDeep(c, x => x.type === 'TEXT', 8).length >= 2) cardNodes.push(c);
}
if (alreadyReplaced.length) {
  notes.push('이미 App Card 인스턴스인 자식 ' + alreadyReplaced.length + '개는 대상에서 제외한다: ' +
             alreadyReplaced.join(', '));
}

const cards = [];
for (const c of cardNodes) {
  const rec = { id: c.id, index: gridChildren.indexOf(c),
    x: r2(c.x), y: r2(c.y), size: r2(c.width) + '×' + r2(c.height),
    width: r2(c.width), height: r2(c.height), visible: c.visible,
    layoutPositioning: safeGet(c, 'layoutPositioning'),
    gridRowAnchorIndex: safeGet(c, 'gridRowAnchorIndex'),
    gridColumnAnchorIndex: safeGet(c, 'gridColumnAnchorIndex') };

  /* 텍스트 — 위치 순으로 전부 싣는다. 의미 부여는 아래에서 따로 한다. */
  const texts = collectDeep(c, x => x.type === 'TEXT', 8).sort((a, b) => a.y - b.y || a.x - b.x);
  rec.texts = [];
  for (const t of texts) {
    const pp = await firstPaint(t);
    rec.texts.push({ id: t.id, name: t.name, characters: t.characters,
      x: r2(t.x), y: r2(t.y), width: r2(t.width),
      fontSize: r2(safeGet(t, 'fontSize')), color: pp ? pp.hex : null,
      colorVariable: pp ? pp.variable : null,
      insideBadge: false });
  }

  /* 칩처럼 생긴 것 — 배경 있는 작은 프레임 + 텍스트 */
  const chipish = collectDeep(c, x => (x.type === 'FRAME' || x.type === 'GROUP' || x.type === 'INSTANCE') &&
    x.height <= 32 && Array.isArray(x.fills) && x.fills.some(f => f.visible !== false) &&
    collectDeep(x, y => y.type === 'TEXT', 4).length > 0, 6);
  rec.chips = [];
  for (const ch of chipish) {
    const bt = collectDeep(ch, x => x.type === 'TEXT', 4)[0];
    const bp = await firstPaint(ch);
    const btp = bt ? await firstPaint(bt) : null;
    const dot = collectDeep(ch, x => SHAPE_TYPES.indexOf(x.type) >= 0 ||
      (x.type === 'INSTANCE' && /dot|icon/i.test(x.name || '')), 4)[0] || null;
    let dotMain = null;
    if (dot && dot.type === 'INSTANCE') { const m = await mainCompOf(dot); dotMain = m ? m.name : null; }
    rec.chips.push({ id: ch.id, name: ch.name, type: ch.type,
      size: r2(ch.width) + '×' + r2(ch.height), x: r2(ch.x), y: r2(ch.y),
      text: bt ? bt.characters : null, textId: bt ? bt.id : null,
      fill: bp ? bp.hex : null, fillVariable: bp ? bp.variable : null,
      textColor: btp ? btp.hex : null, textColorVariable: btp ? btp.variable : null,
      cornerRadius: safeGet(ch, 'cornerRadius'),
      dotId: dot ? dot.id : null, dotType: dot ? dot.type : null,
      dotVisible: dot ? dot.visible : null, dotMainComponent: dotMain });
    if (bt) {
      const hit = rec.texts.filter(x => x.id === bt.id)[0];
      if (hit) hit.insideBadge = true;
    }
  }

  /* 아이콘 / 벡터 */
  const shapes = collectDeep(c, x => SHAPE_TYPES.indexOf(x.type) >= 0, 8);
  rec.shapes = shapes.map(x => ({ id: x.id, name: x.name, type: x.type,
    size: r2(x.width) + '×' + r2(x.height), visible: x.visible,
    x: r2(x.x), y: r2(x.y) }));

  /* 인스턴스 */
  const allInst = collectDeep(c, x => x.type === 'INSTANCE', 8);
  rec.directInstances = [];
  rec.nestedInstances = [];
  for (const inst of allInst) {
    const mc = await mainCompOf(inst);
    const entry = { id: inst.id, name: inst.name, mainComponent: mc ? mc.name : null,
      mainSet: mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : null,
      size: r2(inst.width) + '×' + r2(inst.height), visible: inst.visible };
    if (nestedInsideAnotherInstance(inst, c)) rec.nestedInstances.push(entry);
    else rec.directInstances.push(entry);
  }
  rec.directInstanceCount = rec.directInstances.length;
  rec.recursiveInstanceTotal = allInst.length;

  /* 아이콘 버튼처럼 생긴 것 — 텍스트 없고 도형만 있는 작은 정사각형 */
  rec.iconButtonLike = collectDeep(c, x => (x.type === 'FRAME' || x.type === 'INSTANCE') &&
    x.width <= 32 && x.height <= 32 &&
    collectDeep(x, y => y.type === 'TEXT', 3).length === 0 &&
    collectDeep(x, y => SHAPE_TYPES.indexOf(y.type) >= 0, 3).length > 0, 6)
    .map(x => ({ id: x.id, name: x.name, type: x.type,
      size: r2(x.width) + '×' + r2(x.height), x: r2(x.x), visible: x.visible }));

  cards.push(rec);
}

/* ---------- variant 매핑 ---------- */
function toneFromVariantName(n) {
  const s = (n || '').toLowerCase();
  if (s.indexOf('inprogress') >= 0 || s.indexOf('progress') >= 0) return 'inProgress';
  if (s.indexOf('ended') >= 0 || s.indexOf('end') >= 0) return 'ended';
  return null;
}
const variantMapping = [];
for (const c of cards) {
  const allText = c.texts.map(t => t.characters).join(' ');
  const chipText = c.chips.map(ch => ch.text).filter(Boolean).join(' ');
  const combined = allText + ' ' + chipText;
  const endedHits = (combined.match(ENDED_WORDS) || []);
  const residual = combined.replace(ENDED_WORDS_G, ' ');
  const ongoingHits = (residual.match(ONGOING_WORDS) || []);
  const m = { cardId: c.id, index: c.index,
    allTextSample: combined.trim().slice(0, 200),
    residualAfterRemovingEndedWords: residual.replace(/  +/g, ' ').trim().slice(0, 200),
    chipTexts: c.chips.map(ch => ch.text),
    endedWordFound: endedHits.length ? endedHits[0] : null,
    ongoingWordFound: ongoingHits.length ? ongoingHits[0] : null };

  if (m.endedWordFound && !m.ongoingWordFound) {
    m.suggestedTone = 'ended'; m.confidence = 'high';
    m.reason = '종료 의미 단어 "' + m.endedWordFound + '" 만 발견됐다';
  } else if (m.ongoingWordFound && !m.endedWordFound) {
    m.suggestedTone = 'inProgress'; m.confidence = 'high';
    m.reason = '진행 의미 단어 "' + m.ongoingWordFound + '" 만 발견됐다';
  } else if (m.endedWordFound && m.ongoingWordFound) {
    m.suggestedTone = null; m.confidence = 'low';
    m.reason = '종료어 "' + m.endedWordFound + '" 와 진행어 "' + m.ongoingWordFound +
               '" 가 같이 있다. 어느 쪽이 현재 상태인지 텍스트만으로 정할 수 없다 — 사람이 정해야 한다';
  } else {
    m.suggestedTone = null; m.confidence = 'low';
    m.reason = '종료·진행 어느 쪽 단어도 찾지 못했다 — 사람이 정해야 한다';
  }
  m.suggestedVariant = m.suggestedTone && master
    ? (master.variants.filter(v => toneFromVariantName(v.name) === m.suggestedTone)[0] || {}).name || null
    : null;
  m.resolved = !!m.suggestedVariant && m.confidence !== 'low';
  if (!m.resolved) notes.push('카드 ' + c.id + ' variant 미확정 — ' + m.reason);
  variantMapping.push(m);
}

/* ---------- 높이 / 그리드 영향 ---------- */
let gridImpact = null;
if (master && master.variants.length && cards.length) {
  const newH = r2(Math.max.apply(null, master.variants.map(v => v.height)));
  const curHs = cards.map(c => c.height);
  const sameCur = curHs.every(h => Math.abs(h - curHs[0]) < 0.5);
  const rowGap = gridInfo.observedRowGap;
  const rows = gridInfo.observedRows;
  const predictedRowYs = (rowGap !== null && ys.length)
    ? ys.map((_, i) => r2(ys[0] + i * (newH + rowGap))) : null;
  const predictedContentHeight = (rowGap !== null && rows > 0)
    ? r2(rows * newH + (rows - 1) * rowGap + gridInfo.paddingV) : null;

  gridImpact = {
    currentCardHeights: curHs, allCurrentSame: sameCur,
    currentCardHeight: sameCur ? curHs[0] : null,
    newCardHeight: newH,
    heightDelta: sameCur ? r2(newH - curHs[0]) : null,
    observedRowGap: rowGap, observedRows: rows, observedColumns: gridInfo.observedColumns,
    currentRowYs: ys, predictedRowYs,
    currentGridHeight: gridInfo.height,
    predictedGridContentHeight: predictedContentHeight,
    gridHeightMode: gridInfo.layoutSizingVertical,
    gridHugsVertically: gridInfo.layoutSizingVertical === 'HUG',
    predictedGridHeight: gridInfo.layoutSizingVertical === 'HUG' ? predictedContentHeight : gridInfo.height,
    gridHeightGrowth: (gridInfo.layoutSizingVertical === 'HUG' && predictedContentHeight !== null)
      ? r2(predictedContentHeight - gridInfo.height) : 0,
    /* 공식이 현재 높이를 재현하는지 먼저 확인한다 */
    formulaReproducesCurrent: (rowGap !== null && rows > 0 && sameCur)
      ? Math.abs(r2(rows * curHs[0] + (rows - 1) * rowGap + gridInfo.paddingV) - gridInfo.height) < 1
      : null
  };

  /* 세로가 FIXED 인 그리드는 커지지 않는다. 늘어난 내용은 넘치거나 잘린다. */
  const fixedV = gridInfo.layoutSizingVertical !== 'HUG';
  gridImpact.gridGrowsVertically = !fixedV;
  gridImpact.overflowPx = (fixedV && predictedContentHeight !== null)
    ? r2(Math.max(0, predictedContentHeight - gridInfo.height)) : 0;
  gridImpact.contentExceedsFixedGrid = fixedV && predictedContentHeight !== null &&
    predictedContentHeight - gridInfo.height > 0.5;
  gridImpact.clipsContent = gridInfo.clipsContent;
  gridImpact.overflowConsequence = !gridImpact.contentExceedsFixedGrid
    ? (fixedV ? '세로 FIXED 이지만 내용이 현재 높이 안에 들어간다' : '그리드가 세로로 늘어나 내용을 담는다')
    : (gridInfo.clipsContent === true
        ? '세로 FIXED + clipsContent=true — 넘치는 ' + gridImpact.overflowPx + 'px 는 잘려서 안 보인다'
        : '세로 FIXED + clipsContent=false — 넘치는 ' + gridImpact.overflowPx +
          'px 가 그리드 밖으로 삐져나와 아래 요소(푸터)와 겹친다');
  /* 넘침이 있으면 푸터 겹침 계산의 기준 높이도 그리드 높이가 아니라 내용 높이다 */
  gridImpact.effectiveBottomAfter = (predictedContentHeight !== null)
    ? (fixedV ? r2(gridInfo.height + gridImpact.overflowPx) : predictedContentHeight)
    : null;
  if (gridImpact.contentExceedsFixedGrid) {
    notes.push('그리드 세로가 ' + gridInfo.layoutSizingVertical + ' 라 늘어나지 않는다. ' +
      '예상 내용 높이 ' + predictedContentHeight + ' > 현재 높이 ' + gridInfo.height +
      ' — ' + gridImpact.overflowPx + 'px 넘침. ' + gridImpact.overflowConsequence);
  }
  if (gridImpact.formulaReproducesCurrent === false) {
    notes.push('그리드 높이 공식이 현재 값을 재현하지 못한다 — 예측을 확정값으로 쓰지 말 것');
  }
}

/* ---------- 푸터 겹침 ---------- */
const footer = await figma.getNodeByIdAsync(FOOTER_ID);
let footerImpact = null;
if (footer) {
  const fp = footer.parent;
  const gridBottomNow = r2(grid.y + grid.height);
  const gridBottomAfter = gridImpact && gridImpact.effectiveBottomAfter !== null &&
                          gridImpact.effectiveBottomAfter !== undefined
    ? r2(grid.y + gridImpact.effectiveBottomAfter)
    : (gridImpact && gridImpact.predictedGridHeight !== null
        ? r2(grid.y + gridImpact.predictedGridHeight) : null);
  footerImpact = {
    footerId: footer.id, footerName: footer.name,
    parentId: fp ? fp.id : null, parentName: fp ? fp.name : null,
    layoutPositioning: safeGet(footer, 'layoutPositioning'),
    y: r2(footer.y), height: r2(footer.height), footerTop: r2(footer.y),
    gridY: r2(grid.y), gridHeightNow: gridInfo.height, gridBottomNow,
    sameParentAsGrid: !!fp && !!grid.parent && fp.id === grid.parent.id,
    overlapNow: r2(gridBottomNow - footer.y),
    gridBottomAfter,
    overlapAfter: gridBottomAfter === null ? null : r2(gridBottomAfter - footer.y),
    overlapIncrease: (gridBottomAfter === null) ? null
      : r2((gridBottomAfter - footer.y) - (gridBottomNow - footer.y)),
    coordinateSpaceWarning: (!!fp && !!grid.parent && fp.id !== grid.parent.id)
      ? '푸터와 그리드의 부모가 달라 y 좌표를 그대로 빼면 안 된다 — 같은 좌표계인지 확인 필요'
      : null,
    note: 'Phase E 는 푸터 구조를 고치지 않는다. 영향만 잰다.'
  };
  if (footerImpact.coordinateSpaceWarning) notes.push(footerImpact.coordinateSpaceWarning);
  if (footerImpact.overlapNow > 0) {
    notes.push('푸터 겹침이 이미 ' + footerImpact.overlapNow + 'px 있다' +
      (footerImpact.overlapIncrease ? '. 교체하면 ' + footerImpact.overlapIncrease + 'px 더 늘어난다' : ''));
  }
}

/* ---------- 보존 전략 ---------- */
const backupFrames = [];
for (const c of figma.currentPage.children) {
  if (/백업|backup/i.test(c.name || '')) backupFrames.push({ id: c.id, name: c.name,
    size: r2(c.width) + '×' + r2(c.height) });
}
const preservation = {
  currentPolicy: '원본을 삭제하지 않고 visible = false 로 보존 (Phase A~D)',
  hiddenBehaviorVerdict: hiddenEvidence.verdict,
  policyStillSafe: hiddenEvidence.verdict === 'hiddenExcluded',
  backupFramesOnPage: backupFrames,
  options: [
    { option: 'A', what: '기존대로 원본을 그리드 안에서 visible = false',
      viable: hiddenEvidence.verdict === 'hiddenExcluded',
      risk: hiddenEvidence.verdict === 'hiddenExcluded'
        ? '낮음 — 숨긴 자식이 칸을 차지하지 않는 것이 확인됨'
        : '높음 — 숨긴 카드가 칸을 계속 차지하면 4×3 배치가 24칸으로 늘어난다',
      reversible: '원본을 다시 켜고 인스턴스를 숨기면 끝' },
    { option: 'B', what: '원본을 그리드 밖의 보관용 프레임으로 옮기고 그리드에는 새 인스턴스만 둔다',
      viable: true,
      risk: '중간 — 노드를 옮기므로 부모가 바뀐다. 되돌리려면 다시 옮겨야 한다',
      reversible: '보관 프레임에서 원래 index 로 되돌려야 한다 — index 를 기록해둬야 함',
      note: '그리드 칸 문제를 확실히 피한다' },
    { option: 'C', what: '백업 프레임이 이미 있으므로 그리드 안의 원본은 삭제',
      viable: backupFrames.length > 0,
      risk: '높음 — 되돌리기가 백업 프레임 전체 복원에 의존한다. 지금까지의 정책과 다르다',
      reversible: '백업 프레임에서 통째로 복원',
      note: '백업 프레임 ' + backupFrames.length + '개 발견. ' +
            '다만 백업이 이 그리드의 현재 상태와 같은지 확인되지 않았다' }
  ],
  recommended: hiddenEvidence.verdict === 'hiddenExcluded' ? 'A' : null,
  recommendationBasis: hiddenEvidence.verdict === 'hiddenExcluded'
    ? '숨긴 자식이 칸을 차지하지 않는 것이 파일에서 확인됐다 — 기존 정책을 그대로 쓴다'
    : 'GRID 의 숨김 동작이 확정되지 않아 추천하지 않는다. ' +
      '확정 없이 12장을 숨기면 배치가 무너질 수 있다. ' +
      'DRY_RUN 전에 이 한 가지를 먼저 정해야 한다.'
};
if (!preservation.policyStillSafe) {
  notes.push('보존 전략을 확정하지 못했다 — GRID 의 숨김 동작이 먼저 확인돼야 한다');
}

/* ---------- 교체 순서 ---------- */
const replacementOrder = cards.map(c => ({ cardId: c.id, indexAtAuditTime: c.index,
  x: c.x, y: c.y })).sort((a, b) => a.indexAtAuditTime - b.indexAtAuditTime);

/* ---------- gate ---------- */
const stageCountResolved = !!master && master.variants.length > 0 &&
  master.variants.every(v => v.stageCountNodes && v.stageCountNodes.length > 0);
const iconButtonsResolved = !!master && master.variants.length > 0 &&
  master.variants.every(v => v.iconButtons && v.iconButtons.length === 2);
const chipsResolved = !!master && master.variants.length > 0 &&
  master.variants.every(v => v.chips && v.chips.length === 4);

const gate = {
  gridFound: !!grid,
  exactly12CardsResolved: cards.length === 12,
  noDuplicateCandidates: (function () {
    const seen = {};
    for (const c of cards) { if (seen[c.id]) return false; seen[c.id] = true; }
    return true;
  })(),
  appCardSetFound: !!master,
  bothVariantsExist: !!master &&
    ['inProgress', 'ended'].every(t => master.variants.some(v => toneFromVariantName(v.name) === t)),
  masterRolesResolved: !!master && master.variants.every(v => v.textNodes && v.textNodes.length > 0),
  nestedComponentsResolved: chipsResolved && iconButtonsResolved,
  stageCountIconResolved: stageCountResolved,
  iconButtonsResolved: iconButtonsResolved,
  chipMappingResolved: chipsResolved && cards.every(c => c.chips.length > 0),
  allOldCardContentResolved: cards.length > 0 && cards.every(c => c.texts.length > 0),
  variantMappingResolved: variantMapping.length === cards.length && cards.length > 0 &&
    variantMapping.every(m => m.resolved === true),
  hiddenOldLayoutBehaviorResolved: hiddenEvidence.verdict === 'hiddenExcluded',
  replacementStrategySafe: preservation.policyStillSafe === true,
  gridHeightImpactMeasurable: !!(gridImpact && gridImpact.predictedGridContentHeight !== null &&
    gridImpact.formulaReproducesCurrent === true),
  footerOverlapMeasurable: !!(footerImpact && footerImpact.overlapAfter !== null &&
    !footerImpact.coordinateSpaceWarning),
  overflowRiskMeasurable: !!(gridImpact && gridImpact.overflowConsequence),
  gridContentFitsOrGrows: !!(gridImpact && gridImpact.contentExceedsFixedGrid === false),
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

  grid: gridInfo,
  hiddenChildEvidence: hiddenEvidence,
  hiddenChildNote: 'GRID 는 Auto Layout 과 다른 레이아웃 모드다. Phase A~D 의 근거를 그대로 옮겨오지 않는다. ' +
                   'verdict 가 hiddenExcluded 가 아니면 보존 전략부터 정해야 한다.',

  cardCount: cards.length,
  alreadyReplacedIds: alreadyReplaced,
  cards,

  master,
  variantMapping,
  gridImpact,
  footerImpact,
  preservation,
  replacementOrder,

  notes,
  nextStep: 'gatePassed = true 이면 Phase E DRY_RUN 을 씁니다. ' +
            'hiddenOldLayoutBehaviorResolved 가 false 면 그것부터 정해야 합니다.'
});
