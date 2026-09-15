/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 21
 * Phase E · Application Card 12장을 App Card 인스턴스로 교체
 *
 * DRY_RUN = true 인 동안에는 파일을 한 글자도 바꾸지 않는다.
 *   - archive / staging 프레임 생성 없음
 *   - instance 생성 없음, old 이동 없음
 *   - pluginData 쓰기 없음, GRID 쓰기 없음, visible 변경 없음
 *   - 모든 쓰기는 W() 를 거치고, DRY_RUN 이면 W() 가 거부한다
 *   - 결과의 mutationCount 가 0 이어야 한다
 *
 * 전략 B (20b v4 probe 실측으로 확정)
 *   old 를 archive 로 먼저 옮겨 칸을 비우고, 새 instance 를 GRID 에 넣어
 *   Figma 자동 배치가 그 칸을 쓰게 한다. anchor 는 직접 쓰지 않는다.
 *
 * 카드 하나가 실패하면 다음 카드로 넘어가지 않고 멈춘다.
 * old 가 이미 archive 로 간 뒤 실패하면 그 카드만 되돌린다.
 * ========================================================================== */

const SCRIPT_VERSION = '21-v1-phaseE-appcard-replace';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

const GRID_ID = '1002:140';
const APPCARD_SET_ID = '1037:2163';
const VARIANT_IDS = { inProgress: '1037:2093', ended: '1037:2128' };

const PROBE_KEY = 'joob.phaseE.probe';
const REQUIRED_PROBE_MAJOR = '20b-v4';

const ARCHIVE_NAME = '[Archive] Phase E — Original Application Cards';
const STAGING_NAME = '[Temp] Phase E — Prepared App Cards';

/* 교체 대상 12장 — 사용자 확정 목록 */
const OLD_CARD_IDS = [
  '1002:141', '1003:1749', '1003:1794', '1003:1839',
  '1003:1884', '1003:1929', '1003:1974', '1003:2019',
  '1009:3', '1009:48', '1009:93', '1009:138'
];

/* variant 판정 — 사람이 확정한 최종 매핑. 다시 추론하지 않는다. */
const HUMAN_VARIANT_DECISION = { '1003:1794': 'ended' };
const HUMAN_DEFAULT_TONE = 'inProgress';

/* 상태 텍스트 → Chip tone — 사용자 확정 표.
 * old 카드의 실제 색도 같이 읽어서 근거로 남기되, 판정은 이 표가 한다. */
const STATUS_TONE_TABLE = [
  { match: /접수\s*완료|접수/, tone: 'brand' },
  { match: /서류\s*확인|서류\s*검토|서류\s*통과/, tone: 'success' },
  { match: /일정\s*조율|일정\s*협의/, tone: 'brand' },
  { match: /불합격|탈락/, tone: 'danger' }
];
const CHIP_ROLE_TONES = { position: 'neutral', stage: 'neutral', stageCount: 'neutral' };

/* 역할 판별에 쓰는 단어 — 카드 텍스트를 하드코딩하지 않기 위한 분류용이다 */
const RE_STAGE_COUNT = /\d+\s*단계|단계\s*\d+|\d+\s*\/\s*\d+/;
const RE_STATUS = /접수|완료|확인|검토|조율|협의|불합격|탈락|합격|대기|종료|마감|철회/;
const RE_STAGE = /서류|면접|과제|인적성|코딩|필기|최종|포트폴리오|지원/;
const RE_DATE = /\d{4}[.\-\/]\s*\d{1,2}[.\-\/]\s*\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일/;
const RE_APPLIED_LABEL = /지원일|지원\s*날짜|접수일/;
const RE_SCHEDULE_LABEL = /일정|예정|면접일|마감일/;

const ICONS = { dot: 'Icon / Dot', link: 'Icon / External Link', more: 'Icon / More' };

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

/* ---------- 쓰기 관문 ----------
 * 모든 쓰기는 여기를 지난다. DRY_RUN 이면 아무것도 하지 않고 거부한다. */
let mutationCount = 0;
const mutationLog = [];
function W(what, fn) {
  if (DRY_RUN) throw new Error('DRY_RUN 인데 쓰기를 시도했다: ' + what);
  mutationCount++;
  mutationLog.push(what);
  return fn();
}

/* ---------- 노드 경로 ----------
 * 마스터에서 찾은 노드를 인스턴스에서 다시 찾을 때 이름 대신 자식 index 사슬을 쓴다.
 * 이름은 중복되거나 바뀔 수 있지만 index 사슬은 인스턴스가 마스터 구조를 그대로
 * 복제하는 한 정확하다. */
function pathOf(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur.id !== root.id) {
    const p = cur.parent;
    if (!p || !Array.isArray(p.children)) return null;
    path.unshift(p.children.indexOf(cur));
    cur = p;
  }
  return cur && cur.id === root.id ? path : null;
}
function atPath(root, path) {
  let cur = root;
  for (const i of path) {
    const cs = kids(cur);
    if (!cs || i < 0 || i >= cs.length) return null;
    cur = cs[i];
  }
  return cur;
}

/* ---------- 색 ---------- */
function hexOf(paint) {
  if (!paint || paint.type !== 'SOLID' || !paint.color) return null;
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return ('#' + h(paint.color.r) + h(paint.color.g) + h(paint.color.b)).toUpperCase();
}
async function firstFill(node) {
  const fills = safeGet(node, 'fills');
  if (!Array.isArray(fills)) return null;
  for (const f of fills) {
    if (f.visible === false) continue;
    let variable = null;
    try {
      const bound = f.boundVariables && f.boundVariables.color;
      if (bound && bound.id) {
        const v = await figma.variables.getVariableByIdAsync(bound.id);
        variable = v ? v.name : bound.id;
      }
    } catch (e) { /* 변수 못 읽어도 색은 남긴다 */ }
    return { hex: hexOf(f), type: f.type, variable };
  }
  return null;
}

/* ---------- 칩처럼 생긴 것 ---------- */
function chipLike(root) {
  return collectDeep(root, x =>
    (x.type === 'FRAME' || x.type === 'GROUP' || x.type === 'INSTANCE') &&
    x.height <= 32 && x.height >= 12 &&
    collectDeep(x, y => y.type === 'TEXT', 3).length > 0, 6);
}
function textOf(node) {
  const t = collectDeep(node, x => x.type === 'TEXT', 3)[0];
  return t ? { node: t, characters: t.characters } : { node: null, characters: null };
}

/* ---------- 칩 4개의 역할을 내용으로 가른다 ----------
 * 위치 순서에 기대지 않는다. 내용으로 가르고, 위치 순서도 같이 기록해서
 * 둘이 다르면 드러나게 한다. */
function classifyChips(chipRecords) {
  const byPos = chipRecords.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const roles = { position: null, stage: null, status: null, stageCount: null };
  const conflicts = [];
  const rest = [];

  for (const c of byPos) {
    const t = c.text || '';
    if (RE_STAGE_COUNT.test(t)) {
      if (roles.stageCount) conflicts.push('stageCount 후보가 둘 이상: "' + roles.stageCount.text + '", "' + t + '"');
      else roles.stageCount = c;
      continue;
    }
    if (RE_STATUS.test(t)) {
      if (roles.status) conflicts.push('status 후보가 둘 이상: "' + roles.status.text + '", "' + t + '"');
      else roles.status = c;
      continue;
    }
    rest.push(c);
  }
  /* 남은 것 중 전형 단계 단어가 있으면 stage, 나머지가 position */
  for (const c of rest) {
    const t = c.text || '';
    if (!roles.stage && RE_STAGE.test(t)) { roles.stage = c; continue; }
    if (!roles.position) { roles.position = c; continue; }
    conflicts.push('역할을 정하지 못한 칩: "' + t + '"');
  }
  /* position 이 비었는데 stage 가 둘일 수 없으므로, 남은 자리를 순서로 메운다 */
  if (!roles.position && !roles.stage && byPos.length) conflicts.push('position/stage 를 모두 정하지 못했다');

  return {
    roles,
    positionalOrder: byPos.map(c => c.text),
    resolvedCount: ['position', 'stage', 'status', 'stageCount'].filter(k => roles[k]).length,
    conflicts
  };
}

/* ---------- 상태 텍스트 → tone ---------- */
function toneForStatus(text) {
  const t = text || '';
  for (const row of STATUS_TONE_TABLE) if (row.match.test(t)) return row.tone;
  return null;
}

/* ---------- 시작 ---------- */
const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
  aborted: true, reason: GRID_ID + ' 를 찾을 수 없다', mutationCount });

const gridChildren = kids(grid) || [];
const gridInfo = {
  id: grid.id, name: grid.name,
  size: r2(grid.width) + '×' + r2(grid.height),
  width: r2(grid.width), height: r2(grid.height), x: r2(grid.x), y: r2(grid.y),
  layoutMode: safeGet(grid, 'layoutMode'),
  gridRowCount: safeGet(grid, 'gridRowCount'),
  gridColumnCount: safeGet(grid, 'gridColumnCount'),
  gridRowGap: safeGet(grid, 'gridRowGap'),
  gridColumnGap: safeGet(grid, 'gridColumnGap'),
  clipsContent: safeGet(grid, 'clipsContent'),
  layoutSizingVertical: safeGet(grid, 'layoutSizingVertical'),
  childCount: gridChildren.length
};
/* 행 트랙은 { type, value } 형태일 수 있다 */
function trackValue(t) {
  if (typeof t === 'number') return r2(t);
  if (t && typeof t === 'object') {
    for (const k of ['value', 'size', 'length', 'px', 'fixed']) if (typeof t[k] === 'number') return r2(t[k]);
  }
  return null;
}
const rawRowTracks = safeGet(grid, 'gridRowSizes');
gridInfo.rowTracks = Array.isArray(rawRowTracks) ? rawRowTracks.map(trackValue) : null;
gridInfo.rowTrackTypes = Array.isArray(rawRowTracks)
  ? rawRowTracks.map(t => (t && typeof t === 'object' ? (t.type || null) : 'NUMBER')) : null;

function cellOf(node) {
  return {
    row: safeGet(node, 'gridRowAnchorIndex'), col: safeGet(node, 'gridColumnAnchorIndex'),
    rowSpan: safeGet(node, 'gridRowSpan'), colSpan: safeGet(node, 'gridColumnSpan'),
    x: r2(node.x), y: r2(node.y), width: r2(node.width), height: r2(node.height)
  };
}
function uniqSorted(list) {
  const acc = [];
  for (const v of list) if (!acc.some(x => Math.abs(x - v) < 1)) acc.push(v);
  return acc.sort((a, b) => a - b);
}
gridInfo.rowYs = uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.y)));
gridInfo.columnXs = uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.x)));

/* ---------- 20b v4 probe 결과 ---------- */
function snapshotOf(node) {
  const cs = kids(node) || [];
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
    childCount: cs.length,
    children: cs.map((c, i) => ({
      i, id: c.id, name: c.name, type: c.type, visible: c.visible,
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
const currentGridHash = hashOf(snapshotOf(grid));
let probe = null;
const probeStatus = { key: PROBE_KEY, found: false, versionMatches: false, fresh: false, reason: null };
try {
  const raw = figma.root.getPluginData(PROBE_KEY);
  if (!raw) { probeStatus.reason = '20b v4 probe 를 아직 실행하지 않았다'; }
  else {
    probeStatus.found = true;
    const parsed = JSON.parse(raw);
    probeStatus.probeVersion = parsed.probeVersion || null;
    probeStatus.versionMatches = typeof parsed.probeVersion === 'string' &&
      parsed.probeVersion.indexOf(REQUIRED_PROBE_MAJOR) === 0;
    probeStatus.hashAtProbeTime = parsed.sourceHashAtProbeTime || null;
    probeStatus.hashNow = currentGridHash;
    probeStatus.fresh = parsed.sourceHashAtProbeTime === currentGridHash;
    if (probeStatus.versionMatches && probeStatus.fresh) probe = parsed;
    else probeStatus.reason = !probeStatus.versionMatches
      ? ('probe 결과가 ' + probeStatus.probeVersion + ' 이다 — ' + REQUIRED_PROBE_MAJOR + ' 만 쓴다')
      : 'probe 실행 이후 그리드가 바뀌었다 — 낡은 근거라 쓰지 않는다';
  }
} catch (e) { probeStatus.reason = 'probe 결과를 읽지 못했다: ' + e.message; }

/* ---------- 대상 12장 ---------- */
const targets = [];
const missingIds = [];
for (const id of OLD_CARD_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { missingIds.push(id); continue; }
  targets.push(n);
}
const notInGrid = targets.filter(n => !n.parent || n.parent.id !== GRID_ID).map(n => n.id);
const extraChildren = gridChildren.filter(c => OLD_CARD_IDS.indexOf(c.id) < 0)
  .map(c => ({ id: c.id, name: c.name, type: c.type }));

/* 이미 App Card 인스턴스인 자식이 있는지 */
const alreadyAppCard = [];
for (const c of gridChildren) {
  if (c.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(c);
  if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) alreadyAppCard.push(c.id);
}

/* ---------- 마스터 ---------- */
const set = await figma.getNodeByIdAsync(APPCARD_SET_ID);
const setOk = !!set && set.type === 'COMPONENT_SET';
const variantNodes = {};
for (const tone of ['inProgress', 'ended']) {
  const v = await figma.getNodeByIdAsync(VARIANT_IDS[tone]);
  variantNodes[tone] = (v && v.type === 'COMPONENT') ? v : null;
}

/* 마스터 안에서 역할별 노드를 찾고, 그 위치를 index 사슬로 기록한다 */
async function resolveMaster(variant) {
  if (!variant) return null;
  const rec = { variantId: variant.id, variantName: variant.name,
    size: r2(variant.width) + '×' + r2(variant.height),
    width: r2(variant.width), height: r2(variant.height),
    texts: [], chips: [], iconButtons: [], statusIndicator: null, roles: {}, issues: [] };

  const texts = collectDeep(variant, x => x.type === 'TEXT', 8);
  for (const t of texts) {
    rec.texts.push({ name: t.name, characters: t.characters, y: r2(t.y), x: r2(t.x),
      fontSize: r2(safeGet(t, 'fontSize')),
      fontName: (function () { const f = safeGet(t, 'fontName'); return f && f.family ? (f.family + ' / ' + f.style) : String(f); })(),
      fontIsMixed: safeGet(t, 'fontName') === figma.mixed,
      path: pathOf(t, variant) });
  }

  const chipNodes = chipLike(variant);
  for (const ch of chipNodes) {
    const t = textOf(ch);
    let mainName = null, mainSetId = null;
    if (ch.type === 'INSTANCE') {
      const mc = await mainCompOf(ch);
      if (mc) { mainName = mc.name; mainSetId = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null; }
    }
    const lead = collectDeep(ch, x => /^leading$/i.test(x.name || ''), 4)[0] || null;
    let leadMain = null;
    if (lead && lead.type === 'INSTANCE') { const m = await mainCompOf(lead); leadMain = m ? m.name : null; }
    rec.chips.push({ name: ch.name, type: ch.type, text: t.characters,
      textPath: t.node ? pathOf(t.node, variant) : null,
      path: pathOf(ch, variant), x: r2(ch.x), y: r2(ch.y),
      size: r2(ch.width) + '×' + r2(ch.height),
      mainComponent: mainName, mainSetId,
      leadingExists: !!lead, leadingPath: lead ? pathOf(lead, variant) : null,
      leadingMainComponent: leadMain, leadingVisibleByDefault: lead ? lead.visible : null });
  }

  /* 아이콘 버튼 — 이름 우선, 없으면 메인 컴포넌트 이름으로 */
  const insts = collectDeep(variant, x => x.type === 'INSTANCE', 8);
  for (const inst of insts) {
    const mc = await mainCompOf(inst);
    const mcName = mc ? mc.name : null;
    const isLink = /link/i.test(inst.name || '') || mcName === ICONS.link;
    const isMore = /more/i.test(inst.name || '') || mcName === ICONS.more;
    if (!isLink && !isMore) continue;
    rec.iconButtons.push({ role: isLink ? 'link' : 'more', name: inst.name,
      mainComponent: mcName, path: pathOf(inst, variant),
      visibleByDefault: inst.visible, size: r2(inst.width) + '×' + r2(inst.height) });
  }

  /* 상태 표시 */
  const si = collectDeep(variant, x => /status\s*indicator|상태\s*표시/i.test(x.name || ''), 8)[0] || null;
  if (si) {
    let mc = null;
    if (si.type === 'INSTANCE') mc = await mainCompOf(si);
    let props = null;
    try { props = si.type === 'INSTANCE' ? si.componentProperties : null; } catch (e) { /* 무시 */ }
    rec.statusIndicator = { name: si.name, type: si.type, path: pathOf(si, variant),
      mainComponent: mc ? mc.name : null,
      mainSetId: mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null,
      properties: props ? Object.keys(props).map(k => ({ key: k, value: props[k].value })) : null,
      visible: si.visible };
  } else rec.issues.push('Status Indicator 를 찾지 못했다');

  /* 칩 4개 역할 — 마스터에서도 내용으로 가른다 */
  const cls = classifyChips(rec.chips.map(c => ({ text: c.text, x: c.x, y: c.y, ref: c })));
  rec.chipRoleOrder = cls.positionalOrder;
  rec.chipRoleConflicts = cls.conflicts;
  for (const role of ['position', 'stage', 'status', 'stageCount']) {
    rec.roles[role] = cls.roles[role] ? cls.roles[role].ref : null;
    if (!rec.roles[role]) rec.issues.push('마스터에서 ' + role + ' 칩을 찾지 못했다');
  }

  /* 본문 텍스트 역할 — 칩 안이 아닌 텍스트 중에서 */
  const chipTextPaths = rec.chips.map(c => JSON.stringify(c.textPath));
  const bodyTexts = rec.texts.filter(t => chipTextPaths.indexOf(JSON.stringify(t.path)) < 0);
  function pickByName(re) { return bodyTexts.filter(t => re.test(t.name || ''))[0] || null; }
  rec.bodyRoles = {
    company: pickByName(/company|회사/i) || bodyTexts.slice().sort((a, b) => a.y - b.y || b.fontSize - a.fontSize)[0] || null,
    appliedDate: pickByName(/applied|지원일|접수일/i) || null,
    schedule: pickByName(/schedule|일정|예정/i) || null
  };
  rec.bodyTextInventory = bodyTexts;
  if (!rec.bodyRoles.company) rec.issues.push('마스터에서 company 텍스트를 찾지 못했다');
  return rec;
}

const masterInProgress = await resolveMaster(variantNodes.inProgress);
const masterEnded = await resolveMaster(variantNodes.ended);

/* Chip 컴포넌트 세트의 tone 속성 — 값 이름을 파일에서 읽는다 */
let chipToneProperty = null;
if (masterInProgress && masterInProgress.chips.length) {
  const chipSetId = masterInProgress.chips.map(c => c.mainSetId).filter(Boolean)[0] || null;
  if (chipSetId) {
    const chipSet = await figma.getNodeByIdAsync(chipSetId);
    let defs = null;
    try { defs = chipSet ? chipSet.componentPropertyDefinitions : null; } catch (e) { /* 무시 */ }
    if (defs) {
      for (const key of Object.keys(defs)) {
        const d = defs[key];
        if (d.type !== 'VARIANT' || !Array.isArray(d.variantOptions)) continue;
        const opts = d.variantOptions.map(o => String(o));
        const looksLikeTone = ['neutral', 'brand', 'success', 'danger']
          .filter(t => opts.some(o => o.toLowerCase() === t)).length >= 2;
        if (looksLikeTone) {
          chipToneProperty = { setId: chipSetId, propertyKey: key,
            propertyName: key.split('#')[0], options: opts, defaultValue: d.defaultValue };
          break;
        }
      }
    }
    if (!chipToneProperty) notes.push('Chip 세트에서 tone 속성을 찾지 못했다 — 칩 색을 바꿀 수 없다');
  }
}
function toneOptionFor(tone) {
  if (!chipToneProperty) return null;
  return chipToneProperty.options.filter(o => o.toLowerCase() === String(tone).toLowerCase())[0] || null;
}

/* ---------- old 카드에서 내용 읽기 ---------- */
async function readOldCard(node, index) {
  const rec = { srcId: node.id, name: node.name, originalIndex: gridChildren.indexOf(node),
    planIndex: index, cell: cellOf(node),
    layoutSizingHorizontal: safeGet(node, 'layoutSizingHorizontal'),
    layoutSizingVertical: safeGet(node, 'layoutSizingVertical'),
    layoutGrow: safeGet(node, 'layoutGrow'),
    issues: [] };

  const chipNodes = chipLike(node);
  rec.chips = [];
  for (const ch of chipNodes) {
    const t = textOf(ch);
    const fill = await firstFill(ch);
    const tFill = t.node ? await firstFill(t.node) : null;
    let mainName = null;
    if (ch.type === 'INSTANCE') { const mc = await mainCompOf(ch); mainName = mc ? mc.name : null; }
    let props = null;
    try { props = ch.type === 'INSTANCE' ? ch.componentProperties : null; } catch (e) { /* 무시 */ }
    rec.chips.push({ id: ch.id, name: ch.name, type: ch.type, text: t.characters,
      x: r2(ch.x), y: r2(ch.y), size: r2(ch.width) + '×' + r2(ch.height),
      fill: fill ? fill.hex : null, fillVariable: fill ? fill.variable : null,
      textColor: tFill ? tFill.hex : null, textColorVariable: tFill ? tFill.variable : null,
      mainComponent: mainName,
      variantProperties: props ? Object.keys(props).map(k => k + '=' + props[k].value).join(', ') : null });
  }

  const cls = classifyChips(rec.chips);
  rec.chipPositionalOrder = cls.positionalOrder;
  rec.chipRoleConflicts = cls.conflicts;
  rec.content = {
    position: cls.roles.position ? cls.roles.position.text : null,
    stage: cls.roles.stage ? cls.roles.stage.text : null,
    status: cls.roles.status ? cls.roles.status.text : null,
    stageCount: cls.roles.stageCount ? cls.roles.stageCount.text : null
  };
  rec.chipRoleSources = {
    position: cls.roles.position ? cls.roles.position.id : null,
    stage: cls.roles.stage ? cls.roles.stage.id : null,
    status: cls.roles.status ? cls.roles.status.id : null,
    stageCount: cls.roles.stageCount ? cls.roles.stageCount.id : null
  };

  /* 칩 밖 텍스트 */
  const chipTextIds = [];
  for (const ch of chipNodes) { const t = textOf(ch); if (t.node) chipTextIds.push(t.node.id); }
  const allTexts = collectDeep(node, x => x.type === 'TEXT', 8)
    .filter(t => chipTextIds.indexOf(t.id) < 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  rec.bodyTexts = allTexts.map(t => ({ id: t.id, name: t.name, characters: t.characters,
    x: r2(t.x), y: r2(t.y), fontSize: r2(safeGet(t, 'fontSize')) }));

  function pick(pred) { return rec.bodyTexts.filter(pred)[0] || null; }
  const byNameCompany = pick(t => /company|회사/i.test(t.name || ''));
  const applied = pick(t => RE_APPLIED_LABEL.test(t.name || '') || RE_APPLIED_LABEL.test(t.characters || ''));
  const schedule = pick(t => RE_SCHEDULE_LABEL.test(t.name || '') || RE_SCHEDULE_LABEL.test(t.characters || ''));
  const dates = rec.bodyTexts.filter(t => RE_DATE.test(t.characters || ''));

  rec.content.company = byNameCompany ? byNameCompany.characters
    : (rec.bodyTexts.length ? rec.bodyTexts[0].characters : null);
  rec.content.appliedDate = applied ? applied.characters : (dates[0] ? dates[0].characters : null);
  rec.content.schedule = schedule ? schedule.characters
    : (dates[1] ? dates[1].characters : null);
  rec.contentSources = {
    company: byNameCompany ? 'name' : 'topmost body text',
    appliedDate: applied ? 'label' : (dates[0] ? 'date pattern' : 'not found'),
    schedule: schedule ? 'label' : (dates[1] ? 'date pattern (두 번째)' : 'not found')
  };

  for (const k of ['company', 'position', 'stage', 'status', 'stageCount']) {
    if (!rec.content[k]) rec.issues.push(k + ' 값을 읽지 못했다');
  }
  if (cls.conflicts.length) rec.issues.push('칩 역할 충돌: ' + cls.conflicts.join(' / '));
  rec.contentResolved = rec.issues.length === 0;
  return rec;
}

/* ---------- 카드별 계획 ---------- */
const plan = [];
for (let i = 0; i < targets.length; i++) {
  const node = targets[i];
  const old = await readOldCard(node, i);
  const tone = HUMAN_VARIANT_DECISION[node.id] || HUMAN_DEFAULT_TONE;
  const master = tone === 'ended' ? masterEnded : masterInProgress;

  const statusTone = toneForStatus(old.content.status);
  const chipPlan = {
    position: { text: old.content.position, tone: CHIP_ROLE_TONES.position,
                toneOption: toneOptionFor(CHIP_ROLE_TONES.position) },
    stage: { text: old.content.stage, tone: CHIP_ROLE_TONES.stage,
             toneOption: toneOptionFor(CHIP_ROLE_TONES.stage) },
    status: { text: old.content.status, tone: statusTone,
              toneOption: statusTone ? toneOptionFor(statusTone) : null,
              toneSource: statusTone ? '사용자 확정 표 (상태 텍스트 기준)' : null,
              oldFill: (old.chips.filter(c => c.id === old.chipRoleSources.status)[0] || {}).fill || null,
              oldFillVariable: (old.chips.filter(c => c.id === old.chipRoleSources.status)[0] || {}).fillVariable || null,
              oldVariantProperties: (old.chips.filter(c => c.id === old.chipRoleSources.status)[0] || {}).variantProperties || null },
    stageCount: { text: old.content.stageCount, tone: CHIP_ROLE_TONES.stageCount,
                  toneOption: toneOptionFor(CHIP_ROLE_TONES.stageCount) }
  };

  const stageCountChip = master ? master.roles.stageCount : null;
  const dotPlan = {
    leadingExists: stageCountChip ? stageCountChip.leadingExists : null,
    mainComponent: stageCountChip ? stageCountChip.leadingMainComponent : null,
    mainComponentIsDot: stageCountChip ? stageCountChip.leadingMainComponent === ICONS.dot : null,
    visibleByDefault: stageCountChip ? stageCountChip.leadingVisibleByDefault : null,
    plannedVisible: true,
    path: stageCountChip ? stageCountChip.leadingPath : null
  };
  const otherChipLeadingPlan = ['position', 'stage', 'status'].map(role => {
    const c = master ? master.roles[role] : null;
    return { role, leadingExists: c ? c.leadingExists : null,
      visibleByDefault: c ? c.leadingVisibleByDefault : null,
      plannedVisible: false, plannedChange: false };
  });

  const linkBtn = master ? (master.iconButtons.filter(b => b.role === 'link')[0] || null) : null;
  const moreBtn = master ? (master.iconButtons.filter(b => b.role === 'more')[0] || null) : null;

  const item = {
    key: 'card-' + (i + 1),
    srcId: old.srcId,
    srcName: old.name,
    originalIndex: old.originalIndex,
    oldCell: 'r' + old.cell.row + 'c' + old.cell.col,
    oldRow: old.cell.row, oldColumn: old.cell.col,
    oldRowSpan: old.cell.rowSpan, oldColumnSpan: old.cell.colSpan,
    oldX: old.cell.x, oldY: old.cell.y,
    oldSize: old.cell.width + '×' + old.cell.height,
    oldSizing: { h: old.layoutSizingHorizontal, v: old.layoutSizingVertical, grow: old.layoutGrow },

    company: old.content.company,
    position: old.content.position,
    stage: old.content.stage,
    status: old.content.status,
    appliedDate: old.content.appliedDate,
    schedule: old.content.schedule,
    stageCount: old.content.stageCount,
    contentSources: old.contentSources,
    chipPositionalOrder: old.chipPositionalOrder,

    plannedVariant: 'state=' + tone,
    plannedVariantId: VARIANT_IDS[tone],
    variantDecisionSource: HUMAN_VARIANT_DECISION[old.srcId]
      ? 'human-explicit (사용자 확정)' : 'human-rule (나머지는 inProgress)',

    chipTones: {
      position: chipPlan.position.tone + ' → ' + chipPlan.position.toneOption,
      stage: chipPlan.stage.tone + ' → ' + chipPlan.stage.toneOption,
      status: chipPlan.status.tone + ' → ' + chipPlan.status.toneOption,
      stageCount: chipPlan.stageCount.tone + ' → ' + chipPlan.stageCount.toneOption
    },
    chipPlan,

    stageCountDot: dotPlan,
    otherChipLeading: otherChipLeadingPlan,
    linkIcon: linkBtn ? { mainComponent: linkBtn.mainComponent, plannedVisible: true,
      expected: ICONS.link, matches: linkBtn.mainComponent === ICONS.link } : null,
    moreIcon: moreBtn ? { mainComponent: moreBtn.mainComponent, plannedVisible: true,
      expected: ICONS.more, matches: moreBtn.mainComponent === ICONS.more } : null,
    statusIndicator: master && master.statusIndicator
      ? { fromVariant: master.statusIndicator.properties, expectedState: tone,
          overridePlanned: false,
          note: 'variant 가 주는 상태를 그대로 쓰고 read-back 으로만 확인한다' }
      : null,

    plannedSizing: { layoutSizingHorizontal: 'FILL', layoutGrow: 1,
      layoutSizingVertical: '마스터 값 유지 (강제하지 않음)',
      whenApplied: 'GRID 에 들어간 뒤에만 설정한다. staging 안에서는 FILL 을 설정하지 않는다' },
    predictedSize: master ? (master.width + '×' + master.height) : null,
    predictedCell: 'r' + old.cell.row + 'c' + old.cell.col,
    predictedXY: old.cell.x + ',' + old.cell.y,

    archiveMetadata: {
      srcId: old.srcId, originalIndex: old.originalIndex,
      row: old.cell.row, column: old.cell.col,
      rowSpan: old.cell.rowSpan, columnSpan: old.cell.colSpan,
      x: old.cell.x, y: old.cell.y, width: old.cell.width, height: old.cell.height
    },

    contentResolved: old.contentResolved,
    statusToneResolved: !!chipPlan.status.toneOption,
    issues: old.issues.slice(),
    _old: old
  };
  if (!item.statusToneResolved) {
    item.issues.push('상태 "' + old.content.status + '" 에 맞는 tone 을 정하지 못했다' +
      (chipToneProperty ? '' : ' (Chip tone 속성 자체를 못 찾았다)'));
  }
  item.ready = item.contentResolved && item.statusToneResolved &&
    !!item.plannedVariantId && dotPlan.leadingExists === true;
  plan.push(item);
}

/* ---------- 기존 archive / staging 프레임 확인 ---------- */
const pageKids = kids(figma.currentPage) || [];
const existingArchive = pageKids.filter(c => c.name === ARCHIVE_NAME).map(c => c.id);
const existingStaging = pageKids.filter(c => c.name === STAGING_NAME).map(c => c.id);
const strayTempFrames = pageKids.filter(c => /\[Temp\]|JOOB PROBE TEMP/i.test(c.name || ''))
  .map(c => ({ id: c.id, name: c.name }));

/* ---------- preflight ---------- */
const allChipRolesResolved = plan.length > 0 && plan.every(p => p.contentResolved);
const masterChipRolesResolved = !!masterInProgress && !!masterEnded &&
  ['position', 'stage', 'status', 'stageCount'].every(k =>
    masterInProgress.roles[k] && masterEnded.roles[k]);

const preflight = {
  gridExists: !!grid,
  gridIsGridLayout: gridInfo.layoutMode === 'GRID',
  exactly12OldCardsFound: targets.length === 12 && missingIds.length === 0,
  allOldCardsAreGridChildren: notInGrid.length === 0,
  gridChildCountIs12: gridChildren.length === 12,
  noExtraGridChildren: extraChildren.length === 0,
  zeroAppCardInstancesNow: alreadyAppCard.length === 0,
  noDuplicateArchiveFrame: existingArchive.length === 0,
  noDuplicateStagingFrame: existingStaging.length === 0,
  appCardSetFound: setOk,
  bothVariantsFound: !!variantNodes.inProgress && !!variantNodes.ended,
  masterRolesResolved: masterChipRolesResolved,
  all12VariantMappingsResolved: plan.length === 12 && plan.every(p => !!p.plannedVariantId),
  all12ContentMappingsResolved: plan.length === 12 && allChipRolesResolved,
  all4ChipRolesResolvedEveryCard: allChipRolesResolved,
  chipTonePropertyFound: !!chipToneProperty,
  allChipTonesResolved: plan.length === 12 && plan.every(p =>
    p.chipPlan.position.toneOption && p.chipPlan.stage.toneOption &&
    p.chipPlan.status.toneOption && p.chipPlan.stageCount.toneOption),
  stageCountDotPathResolved: plan.length === 12 && plan.every(p =>
    p.stageCountDot.leadingExists === true && Array.isArray(p.stageCountDot.path)),
  stageCountDotIsDotIcon: plan.length === 12 && plan.every(p => p.stageCountDot.mainComponentIsDot === true),
  linkIconResolved: plan.length === 12 && plan.every(p => p.linkIcon && p.linkIcon.matches === true),
  moreIconResolved: plan.length === 12 && plan.every(p => p.moreIcon && p.moreIcon.matches === true),
  statusIndicatorResolved: plan.length === 12 && plan.every(p => !!p.statusIndicator),
  probeFindingsPresent: !!probe,
  probeVersionIsV4: probeStatus.versionMatches === true,
  probeHashMatchesGrid: probeStatus.fresh === true,
  replacementStrategySafe: !!probe && probe.replacementStrategySafe === true,
  archiveMoveReleasesCell: !!probe && probe.archiveMoveReleasesCell === true,
  all12AutoPlacedCorrectly: !!probe && probe.all12AutoPlacedCorrectly === true,
  heightScenarioResolved: !!probe && probe.heightScenarioResolved === true,
  everyCardReady: plan.length === 12 && plan.every(p => p.ready)
};
const preflightPassed = Object.keys(preflight).every(k => preflight[k]);
const preflightFailures = Object.keys(preflight).filter(k => !preflight[k]);

if (missingIds.length) errors.push('찾지 못한 old 카드 id: ' + missingIds.join(', '));
if (notInGrid.length) errors.push('그리드 자식이 아닌 old 카드: ' + notInGrid.join(', '));
if (extraChildren.length) errors.push('목록에 없는 그리드 자식: ' + JSON.stringify(extraChildren));
for (const p of plan) if (p.issues.length) notes.push(p.key + ' (' + p.srcId + '): ' + p.issues.join(' / '));

/* ---------- 예측 ---------- */
const newCardHeight = masterInProgress ? masterInProgress.height : null;
const trackSize = Array.isArray(gridInfo.rowTracks) ? gridInfo.rowTracks[0] : null;
const lastRowTop = gridInfo.rowYs.length ? gridInfo.rowYs[gridInfo.rowYs.length - 1] : null;
const contentBottom = (lastRowTop !== null && newCardHeight !== null) ? r2(lastRowTop + newCardHeight) : null;
const knownOverflow = contentBottom === null ? null : r2(Math.max(0, contentBottom - gridInfo.height));
const footerNode = await figma.getNodeByIdAsync('1002:451');
const footerTop = footerNode ? r2(footerNode.y) : null;
const footerOverlapAfter = (footerTop !== null && contentBottom !== null)
  ? r2((r2(grid.y) + contentBottom) - footerTop) : null;

const prediction = {
  plannedArchiveName: ARCHIVE_NAME,
  plannedStagingName: STAGING_NAME,
  replacementOrder: plan.map(p => ({ key: p.key, srcId: p.srcId,
    originalIndex: p.originalIndex, cell: p.oldCell })),
  finalChildCount: 12,
  finalRowCount: gridInfo.gridRowCount,
  gridSize: gridInfo.size,
  rowTracks: gridInfo.rowTracks,
  rowTrackTypes: gridInfo.rowTrackTypes,
  rowYs: gridInfo.rowYs,
  columnXs: gridInfo.columnXs,
  newCardHeight,
  newCardOverflowsTrackPx: (trackSize !== null && newCardHeight !== null) ? r2(newCardHeight - trackSize) : null,
  contentBottom,
  knownContentOverflowPx: knownOverflow,
  footerTop,
  footerOverlapByContentAfter: footerOverlapAfter,
  knownLayoutDebt: {
    blocksPhaseE: false,
    reason: '교체 전에도 있던 넘침이다. 그리드 트랙 높이와 푸터 위치는 별도 단계에서 고친다.'
  },
  probeConfirmed: probe ? {
    rowTracksFixed: probe.rowTracksFixed, trackBefore: probe.trackBefore, trackAfter: probe.trackAfter,
    overflowBeyondTrack: probe.overflowBeyondTrack,
    gridHeightAfter: probe.gridHeightAfter, rowYsAfter: probe.rowYsAfter
  } : null
};

/* ---------- DRY_RUN 은 여기서 끝난다 ---------- */
function planForOutput() {
  return plan.map(p => {
    const copy = {};
    for (const k of Object.keys(p)) if (k !== '_old') copy[k] = p[k];
    copy.oldCardInventory = {
      chips: p._old.chips, bodyTexts: p._old.bodyTexts,
      chipRoleSources: p._old.chipRoleSources, contentSources: p._old.contentSources
    };
    return copy;
  });
}
if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    dryRun: true,
    readOnly: true,
    mutationCount,
    mutationCountIsZero: mutationCount === 0,
    writeGate: '모든 쓰기는 W() 를 거친다. DRY_RUN 이면 W() 가 예외를 던진다',
    aborted: false,

    preflight, preflightPassed, preflightFailures,
    probeStatus,
    grid: gridInfo,
    oldCardIdsExpected: OLD_CARD_IDS,
    oldCardsFound: targets.length,
    missingIds, notInGrid, extraChildren,
    alreadyAppCardInstances: alreadyAppCard,
    existingArchiveFrames: existingArchive,
    existingStagingFrames: existingStaging,
    strayTempFrames,

    chipToneProperty,
    masterInProgress, masterEnded,

    cards: planForOutput(),
    prediction,

    applyPlan: {
      beforeAll: ['A. archive 프레임 생성 — ' + ARCHIVE_NAME,
                  'B. staging 프레임 생성 — ' + STAGING_NAME,
                  '둘 다 그리드·푸터가 있는 프레임 바깥, 화면 레이아웃에 영향 없는 위치'],
      perCard: ['① old 원본 정보 기록 (srcId / index / row / column / span / x / y / w / h)',
                '② staging 에서 새 App Card instance 생성',
                '③ variant 설정 (variant 컴포넌트에서 직접 생성)',
                '④ 텍스트 override (company / position / stage / status / 지원일 / 일정 / stage count)',
                '⑤ nested Chip tone 설정',
                '⑥ stage count Dot visible = true',
                '⑦ link / more 아이콘 검증',
                '⑧ Status Indicator 검증',
                '— 여기까지 read-back 전부 성공해야 GRID swap 시작 —',
                '⑨ old 를 archive 로 이동 (이 단계가 먼저여야 칸이 빈다)',
                '⑩ 준비된 instance 를 GRID 에 append (anchor 직접 쓰기 금지)',
                '⑪ 자동 배치 read-back: row / column / x / y / rowSpan / columnSpan 이 old 와 같은지',
                '⑫ GRID sizing: layoutSizingHorizontal = FILL, layoutGrow = 1 설정 후 read-back',
                '⑬ 그리드 검증: 자식 12 · 행 3 · 4행 없음 · 다른 카드 이동 없음 · 크기 ≈ 235×219'],
      afterAll: ['staging 프레임 삭제 (반드시)',
                 'archive 프레임은 rollback 용으로 남긴다',
                 'archive 에 12장 매핑 metadata 기록'],
      onFailure: ['현재 카드에서 멈춘다. 다음 카드로 진행하지 않는다',
                  'old 가 아직 GRID 에 있으면: staging instance 정리하고 old 는 그대로 둔다',
                  'old 가 이미 archive 로 갔으면: 새 instance 를 GRID 에서 빼고 old 를 다시 append 한 뒤 ' +
                  '원래 row/column/x/y 복귀와 자식 12 · 행 3 을 확인한다']
    },
    notes,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
    nextStep: preflightPassed
      ? 'preflight 전부 통과. 이 계획을 확인받은 뒤 DRY_RUN = false 로 APPLY 합니다.'
      : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * 여기서부터 APPLY. DRY_RUN = false 일 때만 실행된다.
 * ========================================================================== */
if (!preflightPassed) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
    reason: 'preflight 실패 — 시작하지 않는다', preflight, preflightFailures, mutationCount });
}

const results = [];
let stoppedAt = null;
let failedAt = null;
let rollbackAttempted = false;
let rollbackSucceeded = null;
let partialMutationDetected = false;
let partialMutationKind = null;
const strayInstanceIds = [];

/* 폰트를 먼저 전부 불러온다 — 글자를 못 바꾸는 상태로 시작하지 않기 위해서다 */
const fontsToLoad = [];
for (const m of [masterInProgress, masterEnded]) {
  if (!m) continue;
  for (const t of m.texts) {
    if (t.fontIsMixed) continue;
    const parts = String(t.fontName).split(' / ');
    if (parts.length === 2 && fontsToLoad.every(f => f.family !== parts[0] || f.style !== parts[1])) {
      fontsToLoad.push({ family: parts[0], style: parts[1] });
    }
  }
}
const fontLoad = { requested: fontsToLoad.slice(), loaded: [], failed: [] };
for (const f of fontsToLoad) {
  try { await figma.loadFontAsync(f); fontLoad.loaded.push(f.family + ' / ' + f.style); }
  catch (e) { fontLoad.failed.push({ font: f.family + ' / ' + f.style, error: e.message }); }
}
if (fontLoad.failed.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
    reason: '폰트를 불러오지 못해 텍스트를 바꿀 수 없다', fontLoad, mutationCount });
}

/* archive / staging */
const gridParent = grid.parent;
const archive = W('archive 프레임 생성', () => {
  const f = figma.createFrame();
  figma.currentPage.appendChild(f);
  f.name = ARCHIVE_NAME;
  f.x = r2(grid.x) + 3000; f.y = r2(grid.y);
  f.resize(1000, 1000);
  f.clipsContent = false;
  return f;
});
const staging = W('staging 프레임 생성', () => {
  const f = figma.createFrame();
  figma.currentPage.appendChild(f);
  f.name = STAGING_NAME;
  f.x = r2(grid.x) + 3000; f.y = r2(grid.y) + 1500;
  f.resize(1000, 1000);
  f.clipsContent = false;
  return f;
});

/* ---------- 그리드 상태 읽기 ---------- */
function gridState() {
  const cs = kids(grid) || [];
  return {
    childCount: cs.length,
    rowCount: safeGet(grid, 'gridRowCount'),
    cells: cs.map(c => ({ id: c.id, x: r2(c.x), y: r2(c.y),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex') }))
  };
}
function othersMoved(before, after, exceptIds) {
  const ex = exceptIds || [];
  const moved = [];
  for (const b of before.cells) {
    if (ex.indexOf(b.id) >= 0) continue;
    const a = after.cells.filter(x => x.id === b.id)[0];
    if (!a) { moved.push({ id: b.id, reason: '사라짐' }); continue; }
    if (!near(a.x, b.x) || !near(a.y, b.y) || a.row !== b.row || a.col !== b.col) {
      moved.push({ id: b.id, before: b.x + ',' + b.y, after: a.x + ',' + a.y });
    }
  }
  return moved;
}


for (let i = 0; i < plan.length; i++) {
  const p = plan[i];
  const rec = { key: p.key, srcId: p.srcId, complete: false, steps: {}, errors: [] };
  const beforeGrid = gridState();
  let inst = null;
  let oldMovedToArchive = false;
  const master = p.plannedVariant === 'state=ended' ? masterEnded : masterInProgress;

  try {
    /* ②③ staging 에서 instance 생성 + variant 확정 */
    const variantComp = await figma.getNodeByIdAsync(p.plannedVariantId);
    if (!variantComp || variantComp.type !== 'COMPONENT') {
      throw new Error('variant 컴포넌트를 찾지 못했다: ' + p.plannedVariantId);
    }
    inst = W(p.key + ': instance 생성', () => variantComp.createInstance());
    W(p.key + ': staging 으로 이동', () => { staging.appendChild(inst); });
    inst.name = 'App Card — ' + (p.company || p.key);
    const instMain = await mainCompOf(inst);
    rec.steps.variant = { wanted: p.plannedVariantId, readBack: instMain ? instMain.id : null,
      variantName: instMain ? instMain.name : null,
      ok: !!instMain && instMain.id === p.plannedVariantId };
    if (!rec.steps.variant.ok) throw new Error('variant 가 계획과 다르다');

    /* ④ 텍스트 override */
    const textPlan = [
      { role: 'company', path: master.bodyRoles.company ? master.bodyRoles.company.path : null, value: p.company },
      { role: 'appliedDate', path: master.bodyRoles.appliedDate ? master.bodyRoles.appliedDate.path : null, value: p.appliedDate },
      { role: 'schedule', path: master.bodyRoles.schedule ? master.bodyRoles.schedule.path : null, value: p.schedule },
      { role: 'position', path: master.roles.position ? master.roles.position.textPath : null, value: p.position },
      { role: 'stage', path: master.roles.stage ? master.roles.stage.textPath : null, value: p.stage },
      { role: 'status', path: master.roles.status ? master.roles.status.textPath : null, value: p.status },
      { role: 'stageCount', path: master.roles.stageCount ? master.roles.stageCount.textPath : null, value: p.stageCount }
    ];
    rec.steps.texts = [];
    for (const t of textPlan) {
      if (t.value === null || typeof t.value === 'undefined') {
        rec.steps.texts.push({ role: t.role, skipped: true, reason: '옮길 값이 없다' });
        continue;
      }
      if (!t.path) throw new Error(t.role + ' 텍스트 위치를 마스터에서 찾지 못했다');
      const node = atPath(inst, t.path);
      if (!node || node.type !== 'TEXT') throw new Error(t.role + ' 위치에 TEXT 가 없다');
      W(p.key + ': ' + t.role + ' 텍스트', () => { node.characters = t.value; });
      const back = node.characters;
      rec.steps.texts.push({ role: t.role, wanted: t.value, readBack: back, ok: back === t.value });
      if (back !== t.value) throw new Error(t.role + ' 텍스트가 되읽기에서 다르다');
    }

    /* ⑤ nested Chip tone */
    rec.steps.chipTones = [];
    for (const role of ['position', 'stage', 'status', 'stageCount']) {
      const chipRef = master.roles[role];
      const wantOption = p.chipPlan[role].toneOption;
      if (!chipRef || !chipRef.path || !wantOption || !chipToneProperty) {
        throw new Error(role + ' 칩 tone 을 설정할 수 없다');
      }
      const chipNode = atPath(inst, chipRef.path);
      if (!chipNode || chipNode.type !== 'INSTANCE') throw new Error(role + ' 칩이 인스턴스가 아니다');
      W(p.key + ': ' + role + ' tone', () => {
        const props = {};
        props[chipToneProperty.propertyKey] = wantOption;
        chipNode.setProperties(props);
      });
      let back = null;
      try {
        const cp = chipNode.componentProperties;
        const hit = Object.keys(cp).filter(k => k.split('#')[0] === chipToneProperty.propertyName)[0];
        back = hit ? cp[hit].value : null;
      } catch (e) { /* 무시 */ }
      rec.steps.chipTones.push({ role, wanted: wantOption, readBack: back, ok: back === wantOption });
      if (back !== wantOption) throw new Error(role + ' 칩 tone 이 되읽기에서 다르다: ' + back);
    }

    /* ⑥ stage count Dot 켜기 */
    const dotNode = p.stageCountDot.path ? atPath(inst, p.stageCountDot.path) : null;
    if (!dotNode) throw new Error('stage count 의 leading 노드를 찾지 못했다');
    const dotMain = dotNode.type === 'INSTANCE' ? await mainCompOf(dotNode) : null;
    W(p.key + ': stage count Dot 켜기', () => { dotNode.visible = true; });
    rec.steps.stageCountDot = { mainComponent: dotMain ? dotMain.name : null,
      isDotIcon: !!dotMain && dotMain.name === ICONS.dot,
      readBackVisible: dotNode.visible, ok: dotNode.visible === true };
    if (!rec.steps.stageCountDot.ok) throw new Error('stage count Dot 을 켰는데 되읽으면 꺼져 있다');

    /* 나머지 칩의 leading 은 건드리지 않는다 — 기본 숨김 유지 */
    rec.steps.otherChipLeading = [];
    for (const role of ['position', 'stage', 'status']) {
      const c = master.roles[role];
      const node = c && c.leadingPath ? atPath(inst, c.leadingPath) : null;
      rec.steps.otherChipLeading.push({ role, exists: !!node,
        visible: node ? node.visible : null, changed: false });
    }

    /* ⑦ link / more 아이콘 */
    rec.steps.iconButtons = [];
    for (const role of ['link', 'more']) {
      const ref = master.iconButtons.filter(b => b.role === role)[0];
      if (!ref || !ref.path) throw new Error(role + ' 아이콘 버튼을 마스터에서 찾지 못했다');
      const node = atPath(inst, ref.path);
      if (!node) throw new Error(role + ' 아이콘 버튼이 인스턴스에 없다');
      const mc = node.type === 'INSTANCE' ? await mainCompOf(node) : null;
      if (node.visible !== true) W(p.key + ': ' + role + ' 아이콘 켜기', () => { node.visible = true; });
      const want = role === 'link' ? ICONS.link : ICONS.more;
      const row = { role, mainComponent: mc ? mc.name : null, expected: want,
        mainMatches: !!mc && mc.name === want, readBackVisible: node.visible };
      row.ok = row.mainMatches && node.visible === true;
      rec.steps.iconButtons.push(row);
      if (!row.ok) throw new Error(role + ' 아이콘 검증 실패');
    }

    /* ⑧ Status Indicator — override 하지 않고 확인만 한다 */
    const siRef = master.statusIndicator;
    if (!siRef || !siRef.path) throw new Error('Status Indicator 를 마스터에서 찾지 못했다');
    const siNode = atPath(inst, siRef.path);
    let siProps = null;
    try { siProps = siNode && siNode.type === 'INSTANCE' ? siNode.componentProperties : null; }
    catch (e) { /* 무시 */ }
    const siValues = siProps ? Object.keys(siProps).map(k => String(siProps[k].value)) : [];
    const wantState = p.plannedVariant === 'state=ended' ? 'ended' : 'inProgress';
    rec.steps.statusIndicator = { found: !!siNode, properties: siValues,
      expectedState: wantState, overridden: false };
    rec.steps.statusIndicator.ok = !!siNode &&
      (siValues.length === 0 || siValues.some(v => v.toLowerCase() === wantState.toLowerCase()));
    if (!rec.steps.statusIndicator.ok) {
      throw new Error('Status Indicator 상태가 variant 와 맞지 않는다: ' + siValues.join(', '));
    }

    /* ---- 여기까지 staging 에서 전부 성공. 이제 GRID 를 건드린다 ---- */
    /* ⑨ old 를 archive 로 — 이 단계가 먼저여야 칸이 빈다 */
    const oldNode = await figma.getNodeByIdAsync(p.srcId);
    if (!oldNode || !oldNode.parent || oldNode.parent.id !== GRID_ID) {
      throw new Error('old 카드가 더 이상 그리드 자식이 아니다');
    }
    W(p.key + ': old 를 archive 로 이동', () => { archive.appendChild(oldNode); });
    oldMovedToArchive = true;
    rec.steps.archiveMove = { movedOut: !kids(grid).some(c => c.id === p.srcId),
      parentAfter: oldNode.parent ? oldNode.parent.id : null,
      metadata: p.archiveMetadata };
    rec.steps.archiveMove.ok = rec.steps.archiveMove.movedOut &&
      rec.steps.archiveMove.parentAfter === archive.id;
    if (!rec.steps.archiveMove.ok) throw new Error('old 를 archive 로 옮기지 못했다');

    /* ⑩ 새 instance 를 GRID 에 append — anchor 는 쓰지 않는다 */
    W(p.key + ': instance 를 GRID 에 추가', () => { grid.appendChild(inst); });

    /* ⑪ 자동 배치 read-back */
    const placed = cellOf(inst);
    rec.steps.placement = {
      anchorWrittenDirectly: false,
      wanted: { row: p.oldRow, col: p.oldColumn, rowSpan: p.oldRowSpan, colSpan: p.oldColumnSpan,
                x: p.oldX, y: p.oldY },
      readBack: { row: placed.row, col: placed.col, rowSpan: placed.rowSpan, colSpan: placed.colSpan,
                  x: placed.x, y: placed.y },
      rowOk: placed.row === p.oldRow,
      colOk: placed.col === p.oldColumn,
      rowSpanOk: placed.rowSpan === p.oldRowSpan,
      colSpanOk: placed.colSpan === p.oldColumnSpan,
      xOk: near(placed.x, p.oldX),
      yOk: near(placed.y, p.oldY)
    };
    rec.steps.placement.ok = rec.steps.placement.rowOk && rec.steps.placement.colOk &&
      rec.steps.placement.rowSpanOk && rec.steps.placement.colSpanOk &&
      rec.steps.placement.xOk && rec.steps.placement.yOk;
    if (!rec.steps.placement.ok) throw new Error('자동 배치 결과가 old 의 칸과 다르다');

    /* ⑫ GRID sizing — 그리드에 들어간 뒤에만 설정한다 */
    W(p.key + ': layoutSizingHorizontal = FILL', () => { inst.layoutSizingHorizontal = 'FILL'; });
    W(p.key + ': layoutGrow = 1', () => { inst.layoutGrow = 1; });
    rec.steps.sizing = {
      horizontalReadBack: safeGet(inst, 'layoutSizingHorizontal'),
      growReadBack: safeGet(inst, 'layoutGrow'),
      verticalReadBack: safeGet(inst, 'layoutSizingVertical'),
      oldVertical: p.oldSizing.v
    };
    rec.steps.sizing.horizontalOk = rec.steps.sizing.horizontalReadBack === 'FILL';
    rec.steps.sizing.growOk = rec.steps.sizing.growReadBack === 1;
    rec.steps.sizing.verticalPreserved = rec.steps.sizing.verticalReadBack === p.oldSizing.v;
    rec.steps.sizing.ok = rec.steps.sizing.horizontalOk && rec.steps.sizing.growOk;
    if (!rec.steps.sizing.horizontalOk) throw new Error('FILL 을 썼는데 되읽으면 ' + rec.steps.sizing.horizontalReadBack);
    if (!rec.steps.sizing.growOk) throw new Error('layoutGrow 를 1 로 썼는데 되읽으면 ' + rec.steps.sizing.growReadBack);

    /* ⑬ 그리드 전체 검증 */
    const afterGrid = gridState();
    const moved = othersMoved(beforeGrid, afterGrid, [p.srcId, inst.id]);
    rec.steps.gridCheck = {
      childCount: afterGrid.childCount, childCountOk: afterGrid.childCount === 12,
      rowCount: afterGrid.rowCount, rowCountOk: afterGrid.rowCount === beforeGrid.rowCount,
      noFourthRow: afterGrid.rowCount === beforeGrid.rowCount,
      otherCardsMoved: moved.length, otherCardsMovedSample: moved.slice(0, 4),
      newSize: r2(inst.width) + '×' + r2(inst.height),
      sizeOk: near(inst.width, 235, 1.5) && near(inst.height, 219, 1.5)
    };
    rec.steps.gridCheck.ok = rec.steps.gridCheck.childCountOk && rec.steps.gridCheck.rowCountOk &&
      moved.length === 0 && rec.steps.gridCheck.sizeOk;
    if (!rec.steps.gridCheck.ok) throw new Error('그리드 검증 실패: ' + JSON.stringify(rec.steps.gridCheck));

    rec.newInstanceId = inst.id;
    rec.complete = true;
    results.push(rec);
  } catch (e) {
    rec.errors.push(e.message);
    failedAt = p.key;
    stoppedAt = p.key;
    errors.push(p.key + ' 실패: ' + e.message);

    /* ---------- rollback ---------- */
    const rb = { oldWasInArchive: oldMovedToArchive, steps: [] };
    try {
      if (!oldMovedToArchive) {
        /* old 는 아직 그리드에 있다 — staging instance 만 치운다 */
        if (inst && !inst.removed) {
          W(p.key + ': 실패한 staging instance 제거', () => { inst.remove(); });
          rb.steps.push('staging instance 제거');
        }
        rb.kind = 'staging 단계 실패 — GRID 는 건드리지 않았다';
        partialMutationKind = 'stagingOnly';
        rollbackAttempted = true;
        rollbackSucceeded = true;
      } else {
        rollbackAttempted = true;
        partialMutationKind = 'gridSwapStarted';
        /* 1. 새 instance 를 그리드에서 뺀다 */
        if (inst && !inst.removed) {
          W(p.key + ': 새 instance 를 그리드에서 제거', () => { inst.remove(); });
          rb.steps.push('새 instance 제거');
        }
        /* 2. old 를 그리드로 되돌린다 */
        const oldBack = await figma.getNodeByIdAsync(p.srcId);
        if (!oldBack) throw new Error('되돌릴 old 노드를 찾지 못했다');
        W(p.key + ': old 를 그리드로 복귀', () => { grid.appendChild(oldBack); });
        rb.steps.push('old 를 그리드로 복귀');
        /* 3. 원래 칸으로 돌아왔는지 */
        const back = cellOf(oldBack);
        rb.restored = { row: back.row, col: back.col, x: back.x, y: back.y };
        rb.wanted = { row: p.oldRow, col: p.oldColumn, x: p.oldX, y: p.oldY };
        rb.cellRestored = back.row === p.oldRow && back.col === p.oldColumn &&
          near(back.x, p.oldX) && near(back.y, p.oldY);
        /* 4. 그리드 전체 */
        const g = gridState();
        rb.childCount = g.childCount; rb.rowCount = g.rowCount;
        rb.childCountOk = g.childCount === 12;
        rb.rowCountOk = g.rowCount === beforeGrid.rowCount;
        rollbackSucceeded = rb.cellRestored && rb.childCountOk && rb.rowCountOk;
        rb.kind = 'GRID swap 시작 후 실패 — 이 카드만 되돌렸다';
      }
    } catch (e2) {
      rb.error = e2.message;
      rollbackSucceeded = false;
      errors.push(p.key + ' rollback 실패: ' + e2.message);
    }
    if (inst && !inst.removed && (!rollbackSucceeded || rb.kind !== 'staging 단계 실패')) {
      strayInstanceIds.push(inst.id);
    }
    partialMutationDetected = true;
    rec.rollback = rb;
    results.push(rec);
    break;   /* 다음 카드로 진행하지 않는다 */
  }
}

/* ---------- 마무리 ---------- */
const completedTargets = results.filter(r => r.complete).map(r => r.srcId);
const targetsNotStarted = plan.filter(p => !results.some(r => r.key === p.key)).map(p => p.srcId);

/* staging 은 반드시 정리한다. archive 는 rollback 용으로 남긴다. */
const stagingCleanup = { attempted: false, removed: false, leftoverChildren: null, error: null };
try {
  const left = kids(staging) || [];
  stagingCleanup.leftoverChildren = left.map(c => c.id);
  stagingCleanup.attempted = true;
  if (left.length) {
    notes.push('staging 에 노드가 ' + left.length + '개 남아 있다 — 지우기 전에 id 를 기록했다: ' +
               left.map(c => c.id).join(', '));
    for (const c of left) strayInstanceIds.push(c.id);
  }
  W('staging 프레임 삭제', () => { staging.remove(); });
  stagingCleanup.removed = true;
} catch (e) {
  stagingCleanup.error = e.message;
  errors.push('staging 프레임을 지우지 못했다: ' + e.message + " — 캔버스에서 '" + STAGING_NAME + "' 를 직접 지워주세요");
}

/* archive metadata 기록 */
const archiveMeta = { written: false, error: null, entries: completedTargets.length };
try {
  const payload = {
    phase: 'E', writtenBy: SCRIPT_VERSION, writtenAt: Date.now(),
    gridId: GRID_ID, archiveFrameId: archive.id,
    cards: plan.filter(p => completedTargets.indexOf(p.srcId) >= 0)
      .map(p => Object.assign({}, p.archiveMetadata,
        { newInstanceId: (results.filter(r => r.srcId === p.srcId)[0] || {}).newInstanceId || null,
          plannedVariant: p.plannedVariant }))
  };
  W('archive metadata 기록', () => { archive.setPluginData('joob.phaseE.archive', JSON.stringify(payload)); });
  archiveMeta.written = true;
} catch (e) { archiveMeta.error = e.message; }

/* 최종 그리드 상태 */
const finalGrid = gridState();
const finalAppCards = [];
for (const c of kids(grid) || []) {
  if (c.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(c);
  if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) finalAppCards.push(c.id);
}
const archiveKids = kids(archive) || [];

const successCriteria = {
  allTwelveCompleted: completedTargets.length === 12,
  noErrors: errors.length === 0,
  stoppedNowhere: stoppedAt === null,
  gridChildCountIs12: finalGrid.childCount === 12,
  gridRowCountUnchanged: finalGrid.rowCount === gridInfo.gridRowCount,
  allChildrenAreAppCards: finalAppCards.length === finalGrid.childCount,
  archiveHasAllOldCards: archiveKids.length === completedTargets.length,
  stagingRemoved: stagingCleanup.removed === true,
  noStrayInstances: strayInstanceIds.length === 0,
  archiveMetadataWritten: archiveMeta.written === true
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  dryRun: false,
  aborted: false,
  mutationCount,

  successCriteria, successCriteriaMet,

  completedTargets,
  targetsNotStarted,
  stoppedAt, failedAt,
  rollbackAttempted, rollbackSucceeded,
  strayInstanceIds,
  partialMutationDetected, partialMutationKind,

  archiveFrameId: archive.id, archiveFrameName: ARCHIVE_NAME,
  archiveChildCount: archiveKids.length,
  archiveChildIds: archiveKids.map(c => c.id),
  archiveMetadata: archiveMeta,
  stagingCleanup,

  fontLoad,
  grid: { before: gridInfo, afterChildCount: finalGrid.childCount, afterRowCount: finalGrid.rowCount },
  cards: results,

  notes,
  errorCount: errors.length,
  errors: errors.slice(0, 10),
  nextStep: successCriteriaMet
    ? '21b verifier 를 실행해 최종 확인합니다.'
    : '실패 지점부터 확인해주세요. 완료된 카드는 그대로 두고, 나머지는 시작하지 않았습니다.',
  mutationLogSample: mutationLog.slice(0, 40),
  mutationLogTotal: mutationLog.length
});
