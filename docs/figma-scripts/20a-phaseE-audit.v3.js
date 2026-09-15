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

const SCRIPT_VERSION = '20a-v3-phaseE-audit';

const GRID_ID = '1002:140';
const PROBE_KEY = 'joob.phaseE.probe';   // 20b probe 가 남긴 실험 결과
const APPCARD_SET_ID = '1037:2163';
const FOOTER_ID = '1002:451';

const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'RECTANGLE', 'ELLIPSE', 'STAR', 'LINE', 'POLYGON'];
/* 전형 "상태" 단어 — 끝난 상태 */
const TERMINAL_STATUS = /불합격|지원\s*철회|철회|최종\s*탈락|탈락|종료|마감|취소/;
const TERMINAL_STATUS_G = /불합격|지원\s*철회|철회|최종\s*탈락|탈락|종료|마감|취소/g;
/* 전형 "상태" 단어 — 아직 진행 중인 상태 */
const ONGOING_STATUS = /진행\s*중|진행|검토\s*중|검토|대기|접수|제안|조율|합격/;
/* 전형 "단계" 단어 — 이것만으로는 끝났는지 알 수 없다 */
const STAGE_WORDS = /서류|면접|과제|인적성|코딩|필기|최종|지원/;
/* 주의 1: 진행어 "합격" 은 종료어 "불합격" 안에 들어 있다.
 *         그래서 진행 판정은 반드시 종료어를 먼저 지운 나머지에서만 한다.
 * 주의 2: "서류" 는 단계이지 상태가 아니다. 카카오 카드처럼
 *         단계 "서류" + 상태 "불합격" 인 경우 상태가 이긴다. */
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
hiddenEvidence.resolvedByProbe = false;
hiddenEvidence.probeVerdict = null;
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
/* 파일을 읽는 것만으로는 여기까지가 한계다. 확정은 20b probe 실측이 한다. */
notes.push('숨김 동작에 대한 파일 관찰: ' + hiddenEvidence.verdict +
  '. 이것은 관찰이지 확정이 아니다 — 20b probe 결과로 확정한다.');

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
/* ---------- variant 판정 ----------
 * 사람이 정한 우선순위:
 *   1. 전형 상태 Chip        (칩에 상태 단어가 있으면 그 칩이 최우선)
 *   2. terminal status 여부  (끝난 상태면 단계와 무관하게 ended)
 *   3. 현재 단계             (상태를 못 찾았을 때만)
 *   4. 전체 텍스트 fallback
 * 그리고 사람이 직접 확정한 카드는 위 어떤 자동 판정보다 우선한다. */
const HUMAN_VARIANT_DECISION = { '1003:1794': 'ended' };   // 카카오: 단계 서류 + 상태 불합격
const HUMAN_DEFAULT_FOR_REST = 'inProgress';               // 나머지 11장은 사용자가 inProgress 로 확정
const HUMAN_DECISION_SOURCE = '사용자 확정 (Phase E 요청 메시지)';

const variantMapping = [];
for (const c of cards) {
  const allText = c.texts.map(t => t.characters).filter(Boolean).join(' ');
  const chipTexts = c.chips.map(ch => ch.text).filter(Boolean);
  const combined = (allText + ' ' + chipTexts.join(' ')).trim();

  /* 칩을 상태칩 / 단계칩으로 나눈다 */
  const chipRoles = c.chips.map(ch => {
    const t = ch.text || '';
    const isTerminal = TERMINAL_STATUS.test(t);
    const residual = t.replace(TERMINAL_STATUS_G, ' ');
    const isOngoing = !isTerminal && ONGOING_STATUS.test(residual);
    const isStage = !isTerminal && !isOngoing && STAGE_WORDS.test(t);
    return { chipId: ch.id, text: ch.text, x: ch.x, y: ch.y,
      role: isTerminal ? 'status(terminal)' : (isOngoing ? 'status(ongoing)'
            : (isStage ? 'stage' : 'unknown')) };
  });
  const terminalChips = chipRoles.filter(r => r.role === 'status(terminal)');
  const ongoingChips = chipRoles.filter(r => r.role === 'status(ongoing)');
  const stageChips = chipRoles.filter(r => r.role === 'stage');

  /* 칩 밖 텍스트 — 종료어를 먼저 지운 뒤에 진행어를 찾는다 */
  const terminalInText = combined.match(TERMINAL_STATUS);
  const residualText = combined.replace(TERMINAL_STATUS_G, ' ').replace(/  +/g, ' ').trim();
  const ongoingInText = residualText.match(ONGOING_STATUS);
  const stageInText = residualText.match(STAGE_WORDS);

  const m = { cardId: c.id, index: c.index,
    allTextSample: combined.slice(0, 200),
    chipTexts, chipRoles,
    statusChipTexts: terminalChips.concat(ongoingChips).map(r => r.text),
    stageChipTexts: stageChips.map(r => r.text),
    terminalWordFound: terminalInText ? terminalInText[0] : null,
    ongoingWordFound: ongoingInText ? ongoingInText[0] : null,
    stageWordFound: stageInText ? stageInText[0] : null,
    residualAfterRemovingTerminalWords: residualText.slice(0, 200) };

  /* 자동 판정 — 우선순위대로 */
  if (terminalChips.length) {
    m.autoTone = 'ended'; m.autoConfidence = 'high';
    m.decisionLevel = '1. 전형 상태 Chip (terminal)';
    m.autoReason = '상태 칩 "' + terminalChips[0].text + '" 이 끝난 상태다';
  } else if (ongoingChips.length) {
    m.autoTone = 'inProgress'; m.autoConfidence = 'high';
    m.decisionLevel = '1. 전형 상태 Chip (ongoing)';
    m.autoReason = '상태 칩 "' + ongoingChips[0].text + '" 이 진행 중 상태다';
  } else if (m.terminalWordFound) {
    m.autoTone = 'ended'; m.autoConfidence = 'medium';
    m.decisionLevel = '2. terminal status 텍스트';
    m.autoReason = '칩은 아니지만 텍스트에 끝난 상태 "' + m.terminalWordFound + '" 가 있다';
  } else if (m.ongoingWordFound) {
    m.autoTone = 'inProgress'; m.autoConfidence = 'medium';
    m.decisionLevel = '2. ongoing status 텍스트';
    m.autoReason = '끝난 상태 단어가 없고 진행 상태 "' + m.ongoingWordFound + '" 가 있다';
  } else if (stageChips.length || m.stageWordFound) {
    m.autoTone = 'inProgress'; m.autoConfidence = 'low';
    m.decisionLevel = '3. 현재 단계만 있음';
    m.autoReason = '단계 "' + (stageChips.length ? stageChips[0].text : m.stageWordFound) +
                   '" 만 있고 끝난 상태 표시가 없다 — 단계만으로는 확정하기 약하다';
  } else {
    m.autoTone = null; m.autoConfidence = 'low';
    m.decisionLevel = '4. 판정 근거 없음';
    m.autoReason = '상태·단계 어느 단어도 찾지 못했다';
  }

  /* 사람 확정이 우선 */
  const explicit = HUMAN_VARIANT_DECISION[c.id];
  if (explicit) {
    m.tone = explicit; m.confidence = 'confirmed';
    m.decisionSource = 'human-explicit'; m.humanDecisionNote = HUMAN_DECISION_SOURCE;
  } else {
    m.tone = HUMAN_DEFAULT_FOR_REST; m.confidence = 'confirmed';
    m.decisionSource = 'human-rule(나머지는 inProgress)'; m.humanDecisionNote = HUMAN_DECISION_SOURCE;
  }
  m.finalVariantDecision = 'state=' + m.tone;
  m.reason = m.autoReason + ' / 최종 판정은 ' + m.decisionSource;
  m.autoAgreesWithHuman = m.autoTone === null ? null : (m.autoTone === m.tone);
  if (m.autoAgreesWithHuman === false) {
    notes.push('카드 ' + c.id + ' — 자동 판정은 ' + m.autoTone + ' 인데 사람 확정은 ' + m.tone +
               ' 다. 사람 확정을 따르지만 한 번 더 봐주세요. 근거: ' + m.autoReason);
  }

  m.suggestedTone = m.tone;
  m.suggestedVariant = master
    ? ((master.variants.filter(v => toneFromVariantName(v.name) === m.tone)[0] || {}).name || null)
    : null;
  m.variantId = master
    ? ((master.variants.filter(v => toneFromVariantName(v.name) === m.tone)[0] || {}).id || null)
    : null;
  m.resolved = !!m.suggestedVariant;
  if (!m.resolved) notes.push('카드 ' + c.id + ' — 판정은 ' + m.tone +
    ' 인데 그 이름의 variant 를 컴포넌트 세트에서 찾지 못했다');
  variantMapping.push(m);
}

const variantSummary = {
  endedCount: variantMapping.filter(m => m.tone === 'ended').length,
  inProgressCount: variantMapping.filter(m => m.tone === 'inProgress').length,
  humanExplicitCount: variantMapping.filter(m => m.decisionSource === 'human-explicit').length,
  autoAgreementCount: variantMapping.filter(m => m.autoAgreesWithHuman === true).length,
  autoDisagreementCount: variantMapping.filter(m => m.autoAgreesWithHuman === false).length,
  autoUndecidedCount: variantMapping.filter(m => m.autoAgreesWithHuman === null).length,
  disagreements: variantMapping.filter(m => m.autoAgreesWithHuman === false)
    .map(m => ({ cardId: m.cardId, auto: m.autoTone, human: m.tone, why: m.autoReason })),
  humanDecisionsNotFoundInFile: Object.keys(HUMAN_VARIANT_DECISION)
    .filter(id => !cards.some(c => c.id === id))
};
if (variantSummary.humanDecisionsNotFoundInFile.length) {
  notes.push('사람이 확정한 카드 id 중 이번 스캔에서 못 찾은 것이 있다: ' +
             variantSummary.humanDecisionsNotFoundInFile.join(', ') +
             ' — id 가 바뀌었는지 확인해야 한다');
}

/* ---------- 20b probe 가 남긴 실험 결과를 읽는다 ----------
 * 없으면 없는 대로 둔다. 추측으로 채우지 않는다.
 * 파일이 그 뒤에 바뀌었으면(hash 불일치) 낡은 근거라서 쓰지 않는다. */
function snapshotOf(node) {
  const kids = Array.isArray(node.children) ? node.children : [];
  return {
    id: node.id, name: node.name, type: node.type,
    x: r2(node.x), y: r2(node.y), width: r2(node.width), height: r2(node.height),
    visible: node.visible,
    layoutMode: safeGet(node, 'layoutMode'),
    gridRowCount: safeGet(node, 'gridRowCount'),
    gridColumnCount: safeGet(node, 'gridColumnCount'),
    gridRowGap: safeGet(node, 'gridRowGap'),
    gridColumnGap: safeGet(node, 'gridColumnGap'),
    gridRowSizes: safeGet(node, 'gridRowSizes'),
    gridColumnSizes: safeGet(node, 'gridColumnSizes'),
    layoutSizingVertical: safeGet(node, 'layoutSizingVertical'),
    parentId: node.parent ? node.parent.id : null,
    indexInParent: node.parent && Array.isArray(node.parent.children)
      ? node.parent.children.indexOf(node) : null,
    parentChildCount: node.parent && Array.isArray(node.parent.children)
      ? node.parent.children.length : null,
    childCount: kids.length,
    children: kids.map((c, k) => ({
      i: k, id: c.id, name: c.name, type: c.type, visible: c.visible,
      x: r2(c.x), y: r2(c.y), width: r2(c.width), height: r2(c.height),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'),
      rowSpan: safeGet(c, 'gridRowSpan'), colSpan: safeGet(c, 'gridColumnSpan')
    }))
  };
}
function hashOf(obj) {
  const str = JSON.stringify(obj);
  let h = 5381;
  for (let k = 0; k < str.length; k++) h = ((h * 33) ^ str.charCodeAt(k)) >>> 0;
  return 'h' + h.toString(16) + '-' + str.length;
}
const currentSourceHash = hashOf(snapshotOf(grid));
let probeFindings = null;
const probeStatus = { key: PROBE_KEY, found: false, parsed: false, fresh: null, reason: null };
try {
  const raw = figma.root.getPluginData(PROBE_KEY);
  if (raw) {
    probeStatus.found = true;
    probeFindings = JSON.parse(raw);
    probeStatus.parsed = true;
    probeStatus.probeVersion = probeFindings.probeVersion || null;
    probeStatus.hashAtProbeTime = probeFindings.sourceHashAtProbeTime || null;
    probeStatus.hashNow = currentSourceHash;
    probeStatus.fresh = probeFindings.sourceHashAtProbeTime === currentSourceHash;
    if (!probeStatus.fresh) {
      probeStatus.reason = 'probe 실행 이후 그리드가 바뀌었다 — 낡은 실험 결과라 쓰지 않는다';
      probeFindings = null;
    }
  } else {
    probeStatus.reason = '20b probe 를 아직 실행하지 않았다';
  }
} catch (e) {
  probeStatus.reason = 'probe 결과를 읽지 못했다: ' + e.message;
  probeFindings = null;
}
if (!probeFindings) notes.push('20b probe 결과가 없다 (' + probeStatus.reason +
  ') — GRID 동작 관련 gate 는 열지 않는다');

/* ---------- 높이 / 그리드 영향 ----------
 * 행 y 와 그리드 높이를 무엇이 결정하는지 모델로 세우고,
 * 그 모델이 지금 측정값을 재현할 때에만 예측에 쓴다. */
let gridImpact = null;
if (master && master.variants.length && cards.length) {
  const newH = r2(Math.max.apply(null, master.variants.map(v => v.height)));
  const curHs = cards.map(c => c.height);
  const sameCur = curHs.every(h => Math.abs(h - curHs[0]) < 0.5);
  const curH = sameCur ? curHs[0] : null;
  const padTop = r2(safeGet(grid, 'paddingTop') || 0);
  const rowSizes = Array.isArray(gridInfo.gridRowSizes) ? gridInfo.gridRowSizes.map(r2) : null;
  const apiRowGap = typeof gridInfo.gridRowGap === 'number' ? r2(gridInfo.gridRowGap) : null;
  const obsGap = gridInfo.observedRowGap;
  const rows = gridInfo.observedRows;

  function rowYsFrom(sizes, gap) {
    const list = []; let y = padTop;
    for (let k = 0; k < sizes.length; k++) { list.push(r2(y)); y = y + sizes[k] + gap; }
    return list;
  }
  function heightFrom(sizes, gap) {
    return r2(gridInfo.paddingV + sizes.reduce((a, b) => a + b, 0) + (sizes.length - 1) * gap);
  }
  function matchesMeasuredYs(list) {
    if (!ys.length || list.length < ys.length) return false;
    for (let k = 0; k < ys.length; k++) if (Math.abs(list[k] - ys[k]) > 1) return false;
    return true;
  }

  /* 모델 1 — 행 트랙(gridRowSizes) + gridRowGap 이 행 위치를 정한다 */
  const trackModel = (rowSizes && apiRowGap !== null) ? (function () {
    const list = rowYsFrom(rowSizes, apiRowGap);
    const h = heightFrom(rowSizes, apiRowGap);
    return { name: 'track', rowYs: list, gridHeight: h,
      reproducesRowYs: matchesMeasuredYs(list),
      reproducesGridHeight: Math.abs(h - gridInfo.height) < 1 };
  })() : null;

  /* 모델 2 — 카드 높이 + 눈으로 잰 간격이 행 위치를 정한다 (v2 가 쓰던 모델) */
  const cardModel = (curH !== null && obsGap !== null && rows > 0) ? (function () {
    const sizes = []; for (let k = 0; k < rows; k++) sizes.push(curH);
    const list = rowYsFrom(sizes, obsGap);
    const h = heightFrom(sizes, obsGap);
    return { name: 'card', rowYs: list, gridHeight: h,
      reproducesRowYs: matchesMeasuredYs(list),
      reproducesGridHeight: Math.abs(h - gridInfo.height) < 1 };
  })() : null;

  const candidates = [trackModel, cardModel].filter(Boolean);
  const winner = candidates.filter(m => m.reproducesRowYs && m.reproducesGridHeight)[0] || null;

  /* 카드가 트랙보다 크면 이미 트랙 밖으로 넘친 채 그려지고 있다는 뜻이다 */
  const overflowNow = (rowSizes && curH !== null) ? r2(curH - rowSizes[0]) : null;

  /* 새 카드로 바꿨을 때 — 두 경우를 모두 계산해 둔다.
   * 어느 쪽이 실제인지는 20b probe 의 rowTracksFixed 가 정한다. */
  function scenario(sizes, gap, label) {
    const list = rowYsFrom(sizes, gap);
    const h = heightFrom(sizes, gap);
    const lastTop = list[list.length - 1];
    const contentBottom = r2(lastTop + newH + (gridInfo.paddingV - padTop));
    return { label, rowSizes: sizes.slice(), rowYs: list,
      gridOwnHeight: gridInfo.layoutSizingVertical === 'HUG' ? h : gridInfo.height,
      contentBottom,
      overflowBeyondGrid: r2(Math.max(0, contentBottom - gridInfo.height)) };
  }
  const sFixed = (rowSizes && apiRowGap !== null)
    ? scenario(rowSizes, apiRowGap, '행 트랙 크기 그대로 (카드만 커짐)') : null;
  const sGrow = (rowSizes && apiRowGap !== null)
    ? scenario(rowSizes.map(v => Math.max(v, newH)), apiRowGap, '행 트랙이 새 카드 높이까지 커짐') : null;

  const tracksFixedFromProbe = probeFindings && typeof probeFindings.rowTracksFixed === 'boolean'
    ? probeFindings.rowTracksFixed : null;
  const chosen = tracksFixedFromProbe === true ? sFixed
                : (tracksFixedFromProbe === false ? sGrow : null);

  gridImpact = {
    currentCardHeights: curHs, allCurrentSame: sameCur, currentCardHeight: curH,
    newCardHeight: newH, heightDelta: curH === null ? null : r2(newH - curH),
    apiRowSizes: rowSizes, apiRowGap, observedRowGap: obsGap,
    observedRows: rows, observedColumns: gridInfo.observedColumns,
    measuredRowYs: ys, currentGridHeight: gridInfo.height,
    gridHeightMode: gridInfo.layoutSizingVertical,
    paddingTop: padTop, paddingV: gridInfo.paddingV,

    modelCandidates: candidates,
    heightModel: winner ? winner.name : null,
    heightModelReproducesCurrent: !!winner,
    modelNote: winner
      ? ('현재 행 위치와 그리드 높이를 재현하는 모델: ' + winner.name)
      : '어떤 모델도 현재 측정값을 재현하지 못했다 — 예측을 gate 근거로 쓰지 않는다',

    currentCardOverflowsTrack: overflowNow === null ? null : overflowNow > 0.5,
    currentOverflowPx: overflowNow,
    overflowNote: (overflowNow !== null && overflowNow > 0.5)
      ? ('지금도 카드(' + curH + ')가 행 트랙(' + (rowSizes ? rowSizes[0] : '?') +
         ')보다 ' + overflowNow + 'px 크다. 눈으로 잰 간격 ' + obsGap +
         ' 은 실제 gap 이 아니라 gap ' + apiRowGap + ' 에서 넘친 만큼을 뺀 값이다.')
      : null,

    scenarioTracksFixed: sFixed,
    scenarioTracksGrow: sGrow,
    whichScenarioIsReal: tracksFixedFromProbe === null ? null
      : (tracksFixedFromProbe ? 'scenarioTracksFixed' : 'scenarioTracksGrow'),
    scenarioResolvedBy: tracksFixedFromProbe === null ? null : '20b probe 실측',
    predictedRowYs: chosen ? chosen.rowYs : null,
    predictedGridHeight: chosen ? chosen.gridOwnHeight : null,
    predictedContentBottom: chosen ? chosen.contentBottom : null,
    predictedOverflowBeyondGrid: chosen ? chosen.overflowBeyondGrid : null,
    clipsContent: gridInfo.clipsContent
  };
  if (!gridImpact.heightModelReproducesCurrent) {
    notes.push('그리드 높이 모델이 현재 값을 재현하지 못한다 — predicted 값은 참고용이고 gate 근거가 아니다');
  }
  if (gridImpact.overflowNote) notes.push(gridImpact.overflowNote);
  if (gridImpact.whichScenarioIsReal === null) {
    notes.push('행 트랙이 커지는지 아닌지는 20b probe 가 정한다 — 아직 정해지지 않아 예측을 확정하지 않는다');
  }
}

/* ---------- 푸터 겹침 ---------- */
const footer = await figma.getNodeByIdAsync(FOOTER_ID);
let footerImpact = null;
if (footer) {
  const fp = footer.parent;
  const gridBottomNow = r2(grid.y + grid.height);
  /* 그리드 자체 높이가 아니라 "내용이 실제로 끝나는 지점" 으로 잰다.
   * 세로 FIXED 인 그리드는 내용이 넘쳐도 높이가 그대로이기 때문이다. */
  const bottomBasis = gridImpact && gridImpact.predictedContentBottom !== null &&
                      typeof gridImpact.predictedContentBottom !== 'undefined'
    ? Math.max(gridImpact.predictedContentBottom, gridImpact.predictedGridHeight || 0)
    : null;
  const gridBottomAfter = bottomBasis === null ? null : r2(grid.y + bottomBasis);
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
    measuredNow: '이 줄까지는 실측이다',
    afterIsPrediction: true,
    predictionResolved: !!(gridImpact && gridImpact.whichScenarioIsReal),
    predictionBasis: gridImpact ? (gridImpact.whichScenarioIsReal || '아직 미확정 (20b probe 필요)') : null,
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
const pf = probeFindings;
const probeSaysHideKeepsCell = pf && typeof pf.hiddenChildKeepsCell === 'boolean'
  ? pf.hiddenChildKeepsCell : null;
const probeSaysArchiveWorks = pf && typeof pf.archiveMoveReleasesCell === 'boolean'
  ? pf.archiveMoveReleasesCell : null;
const probeSaysAnchorWorks = pf && typeof pf.explicitAnchorReplacementWorks === 'boolean'
  ? pf.explicitAnchorReplacementWorks : null;
if (pf) {
  hiddenEvidence.resolvedByProbe = probeSaysHideKeepsCell !== null;
  hiddenEvidence.probeVerdict = probeSaysHideKeepsCell === null ? null
    : (probeSaysHideKeepsCell ? 'hiddenOccupiesCell (숨겨도 칸을 계속 차지한다)'
                              : 'hiddenExcluded (숨기면 칸이 비워진다)');
  hiddenEvidence.probeVersion = pf.probeVersion || null;
  if (hiddenEvidence.probeVerdict) {
    notes.push('20b probe 실측으로 숨김 동작이 확정됐다: ' + hiddenEvidence.probeVerdict);
  }
}

const preservation = {
  currentPolicy: '원본을 삭제하지 않고 visible = false 로 보존 (Phase A~D)',
  hiddenBehaviorVerdict: hiddenEvidence.verdict,
  hiddenBehaviorFromProbe: hiddenEvidence.probeVerdict,
  probeFindingsUsed: !!pf,
  policyStillSafe: probeSaysArchiveWorks === true && probeSaysAnchorWorks === true,
  backupFramesOnPage: backupFrames,
  options: [
    { option: 'A', what: '기존대로 원본을 그리드 안에서 visible = false',
      viable: probeSaysHideKeepsCell === false,
      risk: probeSaysHideKeepsCell === false
        ? '낮음 — 숨긴 자식이 칸을 비운다는 것이 probe 에서 확인됨'
        : (probeSaysHideKeepsCell === true
            ? '높음 — 숨긴 카드가 칸을 계속 차지한다. 12장을 숨기면 새 카드 12장이 갈 칸이 없다'
            : '판정 불가 — 20b probe 를 먼저 실행해야 한다'),
      reversible: '원본을 다시 켜고 인스턴스를 숨기면 끝' },
    { option: 'B', what: '원본 12장을 그리드 밖 archive 프레임으로 옮기고 그리드에는 새 인스턴스 12개만 둔다',
      viable: probeSaysArchiveWorks === true && probeSaysAnchorWorks === true,
      risk: probeSaysArchiveWorks === true
        ? '낮음 — old 를 빼도 나머지 카드가 움직이지 않고, 새 인스턴스가 같은 칸에 앉는 것이 probe 에서 확인됨'
        : '판정 불가 — 20b probe 를 먼저 실행해야 한다',
      reversible: 'archive 에 적어 둔 원래 anchor/index 로 되돌린다 (삭제하지 않으므로 복구 가능)',
      archiveRecordPerCard: ['srcId', 'originalIndex', 'gridRowAnchorIndex', 'gridColumnAnchorIndex',
                             'originalX / originalY', 'originalWidth / originalHeight'],
      archivePlacement: '실제 화면 레이아웃에 영향이 없는 위치 — 그리드/푸터가 있는 프레임 바깥',
      note: '명시적 셀 앵커와 숨긴 원본이 충돌할 위험 자체를 없앤다. 사용자가 기본 후보로 지정한 안이다' },
    { option: 'C', what: '백업 프레임이 이미 있으므로 그리드 안의 원본은 삭제',
      viable: backupFrames.length > 0,
      risk: '높음 — 되돌리기가 백업 프레임 전체 복원에 의존한다. 지금까지의 정책과 다르다',
      reversible: '백업 프레임에서 통째로 복원',
      note: '백업 프레임 ' + backupFrames.length + '개 발견. ' +
            '다만 백업이 이 그리드의 현재 상태와 같은지 확인되지 않았다' }
  ],
  recommended: (probeSaysArchiveWorks === true && probeSaysAnchorWorks === true) ? 'B'
    : (probeSaysHideKeepsCell === false ? 'A' : null),
  recommendationBasis: (probeSaysArchiveWorks === true && probeSaysAnchorWorks === true)
    ? 'probe 실측: old 를 archive 로 빼면 칸이 비워지고, 새 인스턴스에 같은 row/column anchor 를 써서 ' +
      '정확히 같은 칸에 앉힐 수 있다. 나머지 카드도 움직이지 않는다.'
    : (probeSaysHideKeepsCell === false
        ? 'probe 실측: 숨기면 칸이 비워진다 — 기존 정책 A 를 쓸 수 있다'
        : 'GRID 의 숨김/이동 동작이 확정되지 않아 추천하지 않는다. 20b probe 를 먼저 실행해야 한다.'),
  newInstanceAnchorPlan: {
    required: gridInfo.anyChildHasExplicitCellAnchor,
    copyFromOld: ['gridRowAnchorIndex', 'gridColumnAnchorIndex', 'gridRowSpan', 'gridColumnSpan'],
    writable: probeSaysAnchorWorks,
    writeDetail: pf ? (pf.anchorWriteDetail || null) : null,
    reason: '새 인스턴스가 알아서 제자리에 갈 것이라고 기대하지 않는다. old 의 셀 좌표를 그대로 옮겨 적는다',
    recommendedOrder: (pf && pf.recommendedPreservationStrategy)
      ? '① old 를 archive 로 이동 ② 새 instance 추가 ③ anchor 명시 ④ 내용 override'
      : null
  }
};
if (!preservation.policyStillSafe) {
  notes.push('보존 전략을 확정하지 못했다 — 20b probe 의 archiveMoveReleasesCell / ' +
             'explicitAnchorReplacementWorks 가 모두 true 여야 한다');
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
    variantMapping.every(m => m.resolved === true && m.suggestedVariant !== null),

  /* 아래 네 개는 파일을 읽는 것만으로는 답이 안 나온다. 20b probe 실측이 있어야 열린다. */
  probeFindingsAvailable: !!probeFindings,
  hiddenOldLayoutBehaviorResolved: hiddenEvidence.resolvedByProbe === true,
  explicitAnchorReplacementWorks: probeSaysAnchorWorks === true,
  archiveMoveReleasesCell: probeSaysArchiveWorks === true,
  replacementStrategySafe: preservation.policyStillSafe === true &&
    preservation.recommended !== null,

  gridHeightImpactMeasurable: !!(gridImpact && gridImpact.heightModelReproducesCurrent === true),
  heightScenarioResolved: !!(gridImpact && gridImpact.whichScenarioIsReal !== null),
  footerOverlapMeasurable: !!(footerImpact && footerImpact.overlapAfter !== null &&
    !footerImpact.coordinateSpaceWarning && footerImpact.predictionResolved === true),
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

  probeStatus,
  grid: gridInfo,
  hiddenChildEvidence: hiddenEvidence,
  hiddenChildNote: 'GRID 는 Auto Layout 과 다른 레이아웃 모드다. Phase A~D 의 근거를 그대로 옮겨오지 않는다. ' +
                   'verdict 가 hiddenExcluded 가 아니면 보존 전략부터 정해야 한다.',

  cardCount: cards.length,
  alreadyReplacedIds: alreadyReplaced,
  cards,

  master,
  variantMapping,
  variantSummary,
  gridImpact,
  footerImpact,
  preservation,
  replacementOrder,

  notes,
  nextStep: probeFindings
    ? 'gatePassed = true 이면 Phase E DRY_RUN 을 씁니다.'
    : '먼저 20b probe 를 실행해주세요. GRID 동작 관련 gate 는 probe 실측 없이는 열리지 않습니다.'
});
