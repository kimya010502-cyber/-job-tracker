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

const SCRIPT_VERSION = '20a-v4-phaseE-audit';
const REQUIRED_PROBE_MAJOR = '20b-v4';   // 이 버전의 probe 결과만 읽는다

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
    probeStatus.versionMatches = typeof probeFindings.probeVersion === 'string' &&
      probeFindings.probeVersion.indexOf(REQUIRED_PROBE_MAJOR) === 0;
    probeStatus.requiredProbeVersion = REQUIRED_PROBE_MAJOR;
    if (!probeStatus.fresh) {
      probeStatus.reason = 'probe 실행 이후 그리드가 바뀌었다 — 낡은 실험 결과라 쓰지 않는다';
      probeFindings = null;
    } else if (!probeStatus.versionMatches) {
      probeStatus.reason = '저장된 probe 결과가 ' + probeStatus.probeVersion + ' 이다. ' +
        REQUIRED_PROBE_MAJOR + ' 결과만 쓴다 — 20b v4 를 다시 실행해야 한다';
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
 * 20b v4 probe 로 확정된 모델을 쓴다:
 *   행 위치와 그리드 높이는 행 트랙(gridRowSizes) + gridRowGap 이 정한다.
 *   카드가 트랙보다 커도 트랙은 자라지 않는다 — 카드가 트랙 밖으로 넘칠 뿐이다.
 * 그래도 모델이 현재 측정값을 재현하는지 파일에서 다시 확인한 뒤에 쓴다. */
let gridImpact = null;
if (master && master.variants.length && cards.length) {
  const newH = r2(Math.max.apply(null, master.variants.map(v => v.height)));
  const curHs = cards.map(c => c.height);
  const sameCur = curHs.every(h => Math.abs(h - curHs[0]) < 0.5);
  const curH = sameCur ? curHs[0] : null;
  const padTop = r2(safeGet(grid, 'paddingTop') || 0);

  /* 트랙 크기는 { type, value } 형태일 수 있다 — 읽는 곳을 하나로 통일한다 */
  function trackValue(t) {
    if (typeof t === 'number') return r2(t);
    if (t && typeof t === 'object') {
      const keys = ['value', 'size', 'length', 'px', 'fixed'];
      for (const k of keys) if (typeof t[k] === 'number') return r2(t[k]);
    }
    return null;
  }
  function trackType(t) {
    if (typeof t === 'number') return 'NUMBER';
    if (t && typeof t === 'object') return t.type || t.mode || null;
    return null;
  }
  const rawTracks = gridInfo.gridRowSizes;
  const rowSizes = Array.isArray(rawTracks) ? rawTracks.map(trackValue) : null;
  const rowSizeTypes = Array.isArray(rawTracks) ? rawTracks.map(trackType) : null;
  const tracksReadable = !!rowSizes && rowSizes.length > 0 && rowSizes.every(v => typeof v === 'number');
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

  /* 모델 1 — 행 트랙 + gap (probe 로 확정된 모델) */
  const trackModel = (tracksReadable && apiRowGap !== null) ? (function () {
    const list = rowYsFrom(rowSizes, apiRowGap);
    const h = heightFrom(rowSizes, apiRowGap);
    return { name: 'track', rowYs: list, gridHeight: h,
      reproducesRowYs: matchesMeasuredYs(list),
      reproducesGridHeight: Math.abs(h - gridInfo.height) < 1 };
  })() : null;

  /* 모델 2 — 카드 높이 + 눈으로 잰 간격 (v2 가 쓰다가 틀린 모델. 대조용으로 남긴다) */
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

  /* probe 가 확정한 것: 트랙은 자라지 않는다 */
  const pfTracksFixed = probeFindings && typeof probeFindings.rowTracksFixed === 'boolean'
    ? probeFindings.rowTracksFixed : null;

  const lastRowTop = ys.length ? ys[ys.length - 1] : null;
  const trackSize = tracksReadable ? rowSizes[0] : null;

  /* 프레임 바닥과 내용 바닥은 다른 값이다. 둘을 구분해서 낸다. */
  const gridFrameBottomLocal = gridInfo.height;
  const currentContentBottomLocal = (lastRowTop !== null && curH !== null) ? r2(lastRowTop + curH) : null;
  const newContentBottomLocal = (lastRowTop !== null) ? r2(lastRowTop + newH) : null;

  gridImpact = {
    currentCardHeights: curHs, allCurrentSame: sameCur, currentCardHeight: curH,
    newCardHeight: newH, heightDelta: curH === null ? null : r2(newH - curH),
    rowSizesRaw: rawTracks, rowSizes, rowSizeTypes, tracksReadable,
    apiRowGap, observedRowGap: obsGap,
    observedRows: rows, observedColumns: gridInfo.observedColumns,
    measuredRowYs: ys, lastRowTop,
    currentGridHeight: gridInfo.height,
    gridHeightMode: gridInfo.layoutSizingVertical,
    paddingTop: padTop, paddingV: gridInfo.paddingV,

    modelCandidates: candidates,
    heightModel: winner ? winner.name : null,
    heightModelReproducesCurrent: !!winner,
    modelNote: winner
      ? ('현재 행 위치와 그리드 높이를 재현하는 모델: ' + winner.name)
      : '어떤 모델도 현재 측정값을 재현하지 못했다 — 예측을 gate 근거로 쓰지 않는다',

    /* 트랙 성장 여부 — probe 실측 */
    rowTracksFixed: pfTracksFixed,
    trackSize,
    predictedRowYs: ys,
    rowYsUnchanged: pfTracksFixed === true,
    predictedGridHeight: pfTracksFixed === true ? gridInfo.height : null,
    gridHeightUnchanged: pfTracksFixed === true,

    /* 프레임 기준 vs 내용 기준 */
    gridFrameBottom: gridFrameBottomLocal,
    currentContentBottom: currentContentBottomLocal,
    newContentBottom: newContentBottomLocal,
    currentContentOverflowPx: currentContentBottomLocal === null ? null
      : r2(Math.max(0, currentContentBottomLocal - gridFrameBottomLocal)),
    newContentOverflowPx: newContentBottomLocal === null ? null
      : r2(Math.max(0, newContentBottomLocal - gridFrameBottomLocal)),
    currentCardOverflowsTrack: (trackSize !== null && curH !== null) ? r2(curH - trackSize) : null,
    newCardOverflowsTrack: (trackSize !== null) ? r2(newH - trackSize) : null,
    clipsContent: gridInfo.clipsContent,

    overflowIsBlocking: false,
    overflowClassification: 'known layout debt — 이미 존재하던 문제이고 Phase E 교체가 만든 것이 아니다',
    overflowNote: null
  };
  gridImpact.knownContentOverflowPx = gridImpact.newContentOverflowPx;

  /* probe 가 복제본에서 잰 값과 audit 이 원본에서 계산한 값이 맞는지 대조한다 */
  if (probeFindings) {
    const near1 = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1;
    gridImpact.probeCrossCheck = {
      probeTrackBefore: probeFindings.trackBefore, auditTrackSize: trackSize,
      trackAgrees: near1(probeFindings.trackBefore, trackSize),
      probeNewCardHeight: probeFindings.newCardHeightObserved, auditNewCardHeight: newH,
      newCardHeightAgrees: near1(probeFindings.newCardHeightObserved, newH),
      probeOverflowBeyondTrack: probeFindings.overflowBeyondTrack,
      auditOverflowBeyondTrack: gridImpact.newCardOverflowsTrack,
      overflowAgrees: near1(probeFindings.overflowBeyondTrack, gridImpact.newCardOverflowsTrack),
      probeGridHeightAfter: probeFindings.gridHeightAfter, auditGridHeight: gridInfo.height,
      gridHeightAgrees: near1(probeFindings.gridHeightAfter, gridInfo.height),
      probeRowYsAfter: probeFindings.rowYsAfter, auditRowYs: ys,
      rowYsAgree: Array.isArray(probeFindings.rowYsAfter) &&
        probeFindings.rowYsAfter.length === ys.length &&
        probeFindings.rowYsAfter.every((v, k) => near1(v, ys[k]))
    };
    const cc = gridImpact.probeCrossCheck;
    cc.allAgree = cc.trackAgrees && cc.newCardHeightAgrees && cc.overflowAgrees &&
                  cc.gridHeightAgrees && cc.rowYsAgree;
    if (!cc.allAgree) {
      notes.push('probe 가 복제본에서 잰 값과 audit 이 원본에서 계산한 값이 어긋난다 — ' +
                 '어느 쪽이 맞는지 확인해야 한다: ' + JSON.stringify(cc));
    }
  }

  if (gridImpact.newContentOverflowPx !== null && gridImpact.newContentOverflowPx > 0.5) {
    gridImpact.overflowNote = '새 카드(' + newH + ')가 행 트랙(' + trackSize + ')보다 ' +
      gridImpact.newCardOverflowsTrack + 'px 크다. 마지막 행 위(' + lastRowTop + ')에서 시작하므로 ' +
      '내용 바닥이 ' + newContentBottomLocal + ' 이 되어 그리드 프레임 바닥 ' + gridFrameBottomLocal +
      ' 보다 ' + gridImpact.newContentOverflowPx + 'px 아래로 내려간다. ' +
      (gridInfo.clipsContent === true
        ? 'clipsContent = true 라 그만큼 잘려 보이지 않는다.'
        : 'clipsContent = false 라 잘리지 않고 그대로 보인다.') +
      ' 지금도 같은 이유로 ' + gridImpact.currentContentOverflowPx + 'px 넘쳐 있다 — ' +
      '교체가 만든 문제가 아니라 이미 있던 레이아웃 빚이다.';
    notes.push(gridImpact.overflowNote);
  }
  if (!gridImpact.heightModelReproducesCurrent) {
    notes.push('그리드 높이 모델이 현재 값을 재현하지 못한다 — 예측을 gate 근거로 쓰지 않는다');
  }
}

/* ---------- 푸터 겹침 ----------
 * 겹침은 두 가지 기준으로 다르게 나온다. 섞으면 안 된다.
 *   프레임 기준: 그리드 프레임의 바닥 (카드가 넘쳐도 안 변한다)
 *   내용 기준  : 카드가 실제로 끝나는 지점 (눈에 보이는 것)
 * Phase E 는 푸터를 고치지 않는다. 영향만 잰다. */
const footer = await figma.getNodeByIdAsync(FOOTER_ID);
let footerImpact = null;
if (footer) {
  const fp = footer.parent;
  const sameSpace = !!fp && !!grid.parent && fp.id === grid.parent.id;
  const gy = r2(grid.y);
  const footerTop = r2(footer.y);

  const gridFrameBottom = r2(gy + gridInfo.height);
  const currentContentBottom = (gridImpact && gridImpact.currentContentBottom !== null)
    ? r2(gy + gridImpact.currentContentBottom) : null;
  const newContentBottom = (gridImpact && gridImpact.newContentBottom !== null)
    ? r2(gy + gridImpact.newContentBottom) : null;

  const ovFrameNow = r2(gridFrameBottom - footerTop);
  const ovContentNow = currentContentBottom === null ? null : r2(currentContentBottom - footerTop);
  const ovContentAfter = newContentBottom === null ? null : r2(newContentBottom - footerTop);

  footerImpact = {
    footerId: footer.id, footerName: footer.name,
    parentId: fp ? fp.id : null, parentName: fp ? fp.name : null,
    layoutPositioning: safeGet(footer, 'layoutPositioning'),
    footerTop, footerHeight: r2(footer.height),
    footerBottom: r2(footer.y + footer.height),
    gridY: gy, gridOwnHeight: gridInfo.height,
    sameParentAsGrid: sameSpace,

    gridFrameBottom,
    currentContentBottom,
    newContentBottom,
    currentContentOverflowPx: gridImpact ? gridImpact.currentContentOverflowPx : null,
    newContentOverflowPx: gridImpact ? gridImpact.newContentOverflowPx : null,

    footerOverlapByFrameNow: ovFrameNow,
    footerOverlapByContentNow: ovContentNow,
    footerOverlapByContentAfter: ovContentAfter,
    footerOverlapIncreaseByContent: (ovContentNow === null || ovContentAfter === null)
      ? null : r2(ovContentAfter - ovContentNow),
    footerOverlapByFrameAfter: ovFrameNow,
    footerOverlapIncreaseByFrame: 0,

    basisNote: '프레임 기준 겹침은 그리드 프레임 바닥(' + gridFrameBottom + ') 기준이고, ' +
               '내용 기준 겹침은 카드가 실제로 끝나는 지점 기준이다. ' +
               '눈에 보이는 겹침은 내용 기준 쪽이다.',
    frameBottomUnchanged: gridImpact ? gridImpact.gridHeightUnchanged === true : null,
    predictionResolved: !!(gridImpact && gridImpact.rowTracksFixed !== null),
    predictionBasis: (gridImpact && gridImpact.rowTracksFixed === true)
      ? '20b v4 probe 실측 — 행 트랙이 자라지 않으므로 행 위치와 프레임 높이는 그대로다'
      : '아직 미확정 (20b v4 probe 필요)',
    coordinateSpaceWarning: sameSpace ? null
      : '푸터와 그리드의 부모가 달라 y 좌표를 그대로 빼면 안 된다 — 같은 좌표계인지 확인 필요',
    phaseEScope: 'Phase E 는 푸터 구조를 고치지 않는다. 여기 값은 측정 기록이다.'
  };
  if (footerImpact.coordinateSpaceWarning) notes.push(footerImpact.coordinateSpaceWarning);
  if (ovContentNow !== null && ovContentNow > 0) {
    notes.push('푸터 겹침 — 내용 기준으로 지금 ' + ovContentNow + 'px, 교체 후 ' + ovContentAfter +
      'px (증가 ' + r2(ovContentAfter - ovContentNow) + 'px). ' +
      '프레임 기준으로는 ' + ovFrameNow + 'px 로 변화 없다. ' +
      'Phase E 에서는 고치지 않고 기록만 한다.');
  }
}

/* ---------- 보존 전략 ----------
 * 전략 B 확정 (사용자 지정 + 20b v4 probe 실측).
 * old 를 archive 로 먼저 빼고, 새 instance 는 빈 칸 자동 배치에 맡긴다.
 * anchor setter 는 쓰지 않는다 — 이 Figma 에는 setter 자체가 없다. */
const backupFrames = [];
for (const c of figma.currentPage.children) {
  if (/백업|backup/i.test(c.name || '')) backupFrames.push({ id: c.id, name: c.name,
    size: r2(c.width) + '×' + r2(c.height) });
}
const pf = probeFindings;
function pb(key) { return pf && typeof pf[key] === 'boolean' ? pf[key] : null; }
const probeSaysHideKeepsCell = pb('hiddenChildKeepsCell');
const probeSaysArchiveWorks = pb('archiveMoveReleasesCell');
const probeSaysAutoPlacement = pb('autoPlacementPreservesOriginalCell');
const probeSaysAll12 = pb('all12AutoPlacedCorrectly');
const probeSaysAllCells = pb('allOriginalCellsPreserved');
const probeSaysNoFourthRow = pb('noUnexpectedFourthRow');
const probeSaysStrategySafe = pb('replacementStrategySafe');
const probeAnchorSetterSupported = pb('anchorSetterSupported');
if (pf) {
  hiddenEvidence.resolvedByProbe = probeSaysHideKeepsCell !== null;
  hiddenEvidence.probeVerdict = probeSaysHideKeepsCell === null ? null
    : (probeSaysHideKeepsCell ? 'hiddenOccupiesCell (숨겨도 칸을 계속 차지한다)'
                              : 'hiddenExcluded (숨기면 칸이 비워진다)');
  hiddenEvidence.probeVersion = pf.probeVersion || null;
  if (hiddenEvidence.probeVerdict) {
    notes.push('20b v4 probe 실측으로 숨김 동작이 확정됐다: ' + hiddenEvidence.probeVerdict +
      '. 그래서 원본을 숨겨서 보존하는 기존 방식(A)은 쓰지 않는다.');
  }
}

const strategyBConfirmed = probeSaysArchiveWorks === true && probeSaysAutoPlacement === true &&
  probeSaysAll12 === true && probeSaysAllCells === true && probeSaysNoFourthRow === true &&
  probeSaysStrategySafe === true;

const preservation = {
  preservationStrategy: strategyBConfirmed ? 'B' : null,
  currentPolicy: '원본을 삭제하지 않는다 — Phase A~D 와 같다. 다만 숨기는 대신 옮긴다',
  hiddenBehaviorVerdict: hiddenEvidence.verdict,
  hiddenBehaviorFromProbe: hiddenEvidence.probeVerdict,
  probeFindingsUsed: !!pf,
  probeVersion: pf ? pf.probeVersion : null,
  policyStillSafe: strategyBConfirmed,
  backupFramesOnPage: backupFrames,
  probeEvidence: {
    archiveMoveReleasesCell: probeSaysArchiveWorks,
    autoPlacementPreservesOriginalCell: probeSaysAutoPlacement,
    all12AutoPlacedCorrectly: probeSaysAll12,
    allOriginalCellsPreserved: probeSaysAllCells,
    noUnexpectedFourthRow: probeSaysNoFourthRow,
    replacementStrategySafe: probeSaysStrategySafe,
    finalChildCount: pf ? pf.finalChildCount : null,
    finalRowCount: pf ? pf.finalRowCount : null,
    anchorSetterSupported: probeAnchorSetterSupported
  },
  options: [
    { option: 'A', what: '원본을 그리드 안에서 visible = false (Phase A~D 방식)',
      viable: probeSaysHideKeepsCell === false,
      risk: probeSaysHideKeepsCell === true
        ? '높음 — probe 실측: 숨긴 카드가 칸을 계속 차지한다. 12장을 숨기면 새 카드가 갈 칸이 없다'
        : (probeSaysHideKeepsCell === false ? '낮음' : '판정 불가 — probe 필요'),
      rejected: probeSaysHideKeepsCell === true,
      reversible: '원본을 다시 켜고 인스턴스를 숨기면 끝' },
    { option: 'B', what: 'old 12장을 archive frame 으로 이동 + 새 instance 는 빈 칸 자동 배치',
      viable: strategyBConfirmed,
      chosen: strategyBConfirmed,
      risk: strategyBConfirmed
        ? '낮음 — 12장 전체 시뮬레이션에서 자식 12개 · 3행이 유지되고 모든 카드가 원래 칸에 앉았다'
        : '판정 불가 — 20b v4 probe 를 먼저 실행해야 한다',
      reversible: 'archive 에 적어 둔 원래 cell / index 로 되돌린다. 삭제하지 않으므로 복구 가능',
      archiveRecordPerCard: ['srcId', 'originalIndex', 'gridRowAnchorIndex', 'gridColumnAnchorIndex',
                             'originalX / originalY', 'originalWidth / originalHeight'],
      archivePlacement: '그리드와 푸터가 있는 프레임 바깥. 실제 화면 레이아웃에 영향이 없는 위치',
      note: 'anchor setter 를 쓰지 않는다 — 이 Figma 에는 setter 가 없고, 필요도 없다' },
    { option: 'C', what: '백업 프레임이 있으므로 그리드 안의 원본은 삭제',
      viable: false,
      rejected: true,
      risk: '높음 — 지금까지의 정책(삭제 금지)과 다르다',
      note: '백업 프레임 ' + backupFrames.length + '개 발견. 이 안은 쓰지 않는다' }
  ],
  recommended: strategyBConfirmed ? 'B' : null,
  recommendationBasis: strategyBConfirmed
    ? '20b v4 probe 실측: old 를 archive 로 빼면 그 칸이 비고, 새 instance 를 넣으면 ' +
      'Figma 가 비워진 그 칸에 배치한다. read-back 한 row/column 이 old 와 같고 다른 카드도 ' +
      '움직이지 않았다. 12장을 실제 순서대로 반복해도 자식 12개 · 3행이 유지됐다.'
    : 'probe 실측이 없거나 통과하지 않아 전략을 확정하지 않는다',
  replacementStepsPerCard: [
    '① old 의 cell / index / geometry 기록 (row, column, rowSpan, columnSpan, x, y, width, height)',
    '② old 를 archive frame 으로 이동',
    '③ 새 App Card instance 생성',
    '④ anchor 를 직접 쓰지 않는다',
    '⑤ Figma 자동 배치에 맡긴다',
    '⑥ 새 instance 의 row / column read-back 이 old 와 같은지 확인',
    '⑦ 다른 카드가 움직이지 않았는지 확인',
    '⑧ 다음 카드로 진행'
  ],
  anchorPolicy: {
    writeAnchorsDirectly: false,
    reason: 'gridRowAnchorIndex / gridColumnAnchorIndex 에 setter 가 없다 (probe 실측). ' +
            '대신 old 를 먼저 빼서 칸을 비우고 자동 배치가 그 칸을 쓰게 한다',
    verifyInstead: ['새 instance 의 row/column read-back 이 old 와 같은지',
                    '다른 카드가 움직이지 않았는지', '행 수가 3 그대로인지']
  }
};
if (!preservation.policyStillSafe) {
  notes.push('보존 전략을 확정하지 못했다 — 20b v4 probe 의 archiveMoveReleasesCell / ' +
             'autoPlacementPreservesOriginalCell / all12AutoPlacedCorrectly 가 모두 true 여야 한다');
}

/* ---------- 교체 순서 ---------- */
const replacementOrder = cards.map(c => ({ cardId: c.id, indexAtAuditTime: c.index,
  x: c.x, y: c.y })).sort((a, b) => a.indexAtAuditTime - b.indexAtAuditTime);

/* ---------- gate ----------
 * 통과 = Phase E DRY_RUN 을 쓸 수 있다는 뜻이다.
 * 이미 측정된 14px 내용 넘침과 푸터 겹침은 교체를 막는 조건이 아니다.
 * 교체 전에도 있던 문제이고, 재는 것까지가 Phase E 의 몫이다. */
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

  /* 아래는 20b v4 probe 실측이 있어야 열린다 */
  probeFindingsAvailable: !!probeFindings,
  probeVersionMatchesV4: probeStatus.versionMatches === true && !!probeFindings,
  hiddenOldLayoutBehaviorResolved: hiddenEvidence.resolvedByProbe === true,
  archiveMoveReleasesCell: probeSaysArchiveWorks === true,
  autoPlacementPreservesOriginalCell: probeSaysAutoPlacement === true,
  all12AutoPlacedCorrectly: probeSaysAll12 === true,
  replacementStrategySafe: preservation.policyStillSafe === true &&
    preservation.preservationStrategy === 'B',

  /* 높이·넘침·푸터는 '잴 수 있는가' 를 묻는다. 값이 크다고 막지 않는다 */
  heightScenarioResolved: !!(gridImpact && gridImpact.rowTracksFixed !== null),
  gridHeightImpactMeasurable: !!(gridImpact && gridImpact.heightModelReproducesCurrent === true),
  footerOverlapMeasurable: !!(footerImpact && footerImpact.footerOverlapByContentAfter !== null &&
    footerImpact.footerOverlapByFrameNow !== null && !footerImpact.coordinateSpaceWarning),
  overflowRiskMeasurable: !!(gridImpact && typeof gridImpact.newContentOverflowPx === 'number' &&
    typeof gridImpact.currentContentOverflowPx === 'number' &&
    gridImpact.clipsContent !== null),
  replacementOrderMeasurable: replacementOrder.length === cards.length &&
    replacementOrder.every(o => o.indexAtAuditTime >= 0)
};
const gatePassed = Object.keys(gate).every(k => gate[k]);

/* gate 에 넣지 않은 측정 결과 — 막지는 않지만 기록으로 남긴다 */
const knownLayoutDebt = {
  knownContentOverflowPx: gridImpact ? gridImpact.newContentOverflowPx : null,
  currentContentOverflowPx: gridImpact ? gridImpact.currentContentOverflowPx : null,
  overflowIncreasePx: (gridImpact && gridImpact.newContentOverflowPx !== null &&
    gridImpact.currentContentOverflowPx !== null)
    ? r2(gridImpact.newContentOverflowPx - gridImpact.currentContentOverflowPx) : null,
  clipsContent: gridImpact ? gridImpact.clipsContent : null,
  footerOverlapByContentNow: footerImpact ? footerImpact.footerOverlapByContentNow : null,
  footerOverlapByContentAfter: footerImpact ? footerImpact.footerOverlapByContentAfter : null,
  footerOverlapIncreaseByContent: footerImpact ? footerImpact.footerOverlapIncreaseByContent : null,
  blocksPhaseE: false,
  whyNotBlocking: '교체 전에도 있던 넘침이다. Phase E 는 카드 마스터로 통일하는 작업이고, ' +
    '그리드 트랙 높이와 푸터 위치를 고치는 것은 별도 단계(step 12 레이아웃 정리)의 몫이다.',
  toFixLater: ['행 트랙 205 → 새 카드 높이에 맞추기', '푸터 absolute 위치 재검토',
               '그리드 세로 FIXED 687 재검토']
};

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
  knownLayoutDebt,
  preservation,
  replacementOrder,

  notes,
  nextStep: !probeFindings
    ? '먼저 20b v4 probe 를 실행해주세요. GRID 동작 관련 gate 는 probe 실측 없이는 열리지 않습니다.'
    : (gatePassed
        ? 'gate 전부 통과. 이 결과를 확인받은 뒤 Phase E DRY_RUN 을 씁니다.'
        : 'false 인 gate 항목부터 해결해야 합니다.')
});
