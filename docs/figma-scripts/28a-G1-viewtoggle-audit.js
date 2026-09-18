/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 28a
 * Phase G1 사전 감사 — View Toggle (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다.
 * 선택(selection)과 현재 페이지도 바꾸지 않는다.
 *
 * 확인하는 것
 *   1) 뷰 토글 후보 — 과거 기록의 ID(1003:1735/1736/1738/1739/1741)가 아직 있는지,
 *      그리고 이름·구조로 메인 화면 전체를 다시 훑어 다른 후보가 없는지
 *   2) 후보의 구조 — 크기, auto layout, padding, radius, fill, 그림자, 자식, 아이콘 벡터
 *   3) 선택 / 비선택 상태가 무엇으로 표현되는지 (fill · effect · 아이콘 색 차이)
 *   4) 툴바 안에서의 위치와 여유 폭 — 교체 시 폭이 바뀌면 넘치는지
 *   5) 참고 마스터 — Icon Button, Pagination Item(선택 상태 관례), Select(툴바 높이)
 *   6) Icon Library 17종 — 뷰 토글에 쓸 수 있는 아이콘이 있는지 (이름 + 경로 일치)
 *   7) 파일 전체에 이미 View/Toggle/Segmented 이름의 컴포넌트가 있는지 (중복 생성 방지)
 *   8) 토큰 — radius / 색 / effect style 중 토글에 쓸 후보
 * ========================================================================== */

const SCRIPT_VERSION = '28a-G1-v1-viewtoggle-audit';

const IDS = {
  mainFrame: '1002:2', main: '1002:3', contentContainer: '1002:4', toolbar: '1003:1695',
  listSection: '1002:139', topHeader: '1009:698', addRow: '1009:715', header: '1002:469'
};
const LEGACY_TOGGLE_IDS = {
  container: '1003:1735', buttonA: '1003:1736', iconA: '1003:1738', buttonB: '1003:1739', iconB: '1003:1741'
};
const REF_IDS = {
  iconButton: '1037:2091', paginationSet: '1042:46', navItemSet: '1042:36', chipHint: null
};
const ICON_LIBRARY = {
  'Icon / Search': '1048:784', 'Icon / Reset': '1048:786', 'Icon / Plus': '1048:788', 'Icon / Arrow Up': '1048:790',
  'Icon / Stage Count': '1048:792', 'Icon / External Link': '1048:794', 'Icon / More': '1048:796',
  'Icon / Nav / Applications': '1048:798', 'Icon / Nav / Statistics': '1048:800', 'Icon / Nav / Calendar': '1048:802',
  'Icon / Nav / Memo': '1048:804', 'Icon / Nav / Settings': '1048:806', 'Icon / Nav / Help': '1048:808',
  'Icon / Chevron Left': '1048:810', 'Icon / Chevron Right': '1048:812', 'Icon / Bell': '1048:814', 'Icon / Dot': '1048:816'
};
const NAME_RE = /view|toggle|segment|보기|토글|table|grid|list|card\s*view|테이블|카드\s*보기|목록/i;

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function safeGet(n, k) { try { const v = n[k]; return typeof v === 'undefined' || v === figma.mixed ? (v === figma.mixed ? 'MIXED' : null) : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function hex(c) {
  if (!c) return null;
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + h(c.r) + h(c.g) + h(c.b);
}
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { try { return n.mainComponent; } catch (e2) { return null; } } }

const varCache = {};
async function varName(id) {
  if (!id) return null;
  if (id in varCache) return varCache[id];
  let name = null;
  try { const v = await figma.variables.getVariableByIdAsync(id); name = v ? v.name : '(찾을 수 없음 ' + id + ')'; } catch (e) { name = '(읽기 실패 ' + id + ')'; }
  varCache[id] = name;
  return name;
}
const styleCache = {};
async function styleName(id) {
  if (!id || id === figma.mixed) return id === figma.mixed ? 'MIXED' : null;
  if (id in styleCache) return styleCache[id];
  let name = null;
  try { const s = await figma.getStyleByIdAsync(id); name = s ? s.name : '(찾을 수 없음)'; } catch (e) { name = '(읽기 실패)'; }
  styleCache[id] = name;
  return name;
}

async function paints(list) {
  if (!Array.isArray(list)) return list === figma.mixed ? 'MIXED' : null;
  const res = [];
  for (const p of list) {
    const bv = p.boundVariables && p.boundVariables.color ? await varName(p.boundVariables.color.id) : null;
    res.push({ type: p.type, visible: p.visible !== false, color: p.type === 'SOLID' ? hex(p.color) : null,
      opacity: r2(typeof p.opacity === 'number' ? p.opacity : 1), variable: bv });
  }
  return res;
}
async function effects(n) {
  const list = safeGet(n, 'effects');
  if (!Array.isArray(list) || !list.length) return [];
  return list.map(e => ({ type: e.type, visible: e.visible !== false,
    color: e.color ? hex(e.color) + '@' + r2(e.color.a) : null,
    offset: e.offset ? r2(e.offset.x) + ',' + r2(e.offset.y) : null, radius: r2(e.radius), spread: r2(e.spread) }));
}
async function boundSummary(n) {
  const bv = safeGet(n, 'boundVariables');
  if (!bv || typeof bv !== 'object') return null;
  const res = {};
  for (const k of Object.keys(bv)) {
    if (k === 'fills' || k === 'strokes' || k === 'effects') continue; // paint 단위로 따로 읽는다
    const v = bv[k];
    if (Array.isArray(v)) { res[k] = []; for (const x of v) res[k].push(await varName(x && x.id)); }
    else if (v && v.id) res[k] = await varName(v.id);
  }
  return Object.keys(res).length ? res : null;
}

/* 노드 하나의 스타일·레이아웃 스냅샷 */
async function describe(n) {
  if (!n) return null;
  const d = {
    id: n.id, name: n.name, type: n.type, visible: n.visible !== false, size: size(n),
    x: r2(n.x), y: r2(n.y), opacity: r2(safeGet(n, 'opacity')),
    layoutMode: safeGet(n, 'layoutMode'), layoutPositioning: safeGet(n, 'layoutPositioning'),
    sizingH: safeGet(n, 'layoutSizingHorizontal'), sizingV: safeGet(n, 'layoutSizingVertical'),
    layoutGrow: safeGet(n, 'layoutGrow'), layoutAlign: safeGet(n, 'layoutAlign'),
    primaryAlign: safeGet(n, 'primaryAxisAlignItems'), counterAlign: safeGet(n, 'counterAxisAlignItems'),
    padding: safeGet(n, 'layoutMode') && safeGet(n, 'layoutMode') !== 'NONE'
      ? [safeGet(n, 'paddingTop'), safeGet(n, 'paddingRight'), safeGet(n, 'paddingBottom'), safeGet(n, 'paddingLeft')].map(r2) : null,
    itemSpacing: r2(safeGet(n, 'itemSpacing')),
    cornerRadius: safeGet(n, 'cornerRadius') === 'MIXED'
      ? [safeGet(n, 'topLeftRadius'), safeGet(n, 'topRightRadius'), safeGet(n, 'bottomRightRadius'), safeGet(n, 'bottomLeftRadius')].map(r2)
      : r2(safeGet(n, 'cornerRadius')),
    clipsContent: safeGet(n, 'clipsContent'),
    fills: await paints(safeGet(n, 'fills')), fillStyle: await styleName(safeGet(n, 'fillStyleId')),
    strokes: await paints(safeGet(n, 'strokes')), strokeWeight: safeGet(n, 'strokeWeight'), strokeAlign: safeGet(n, 'strokeAlign'),
    effects: await effects(n), effectStyle: await styleName(safeGet(n, 'effectStyleId')),
    boundVariables: await boundSummary(n),
    childCount: kids(n).length
  };
  if (n.type === 'INSTANCE') {
    const mc = await mainCompOf(n);
    d.mainComponent = mc ? { id: mc.id, name: mc.name, parentSet: mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name + ' (' + mc.parent.id + ')' : null } : null;
  }
  if (n.type === 'TEXT') d.characters = n.characters;
  if (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION' || n.type === 'ELLIPSE' || n.type === 'RECTANGLE' || n.type === 'LINE') {
    const vp = safeGet(n, 'vectorPaths');
    d.vector = {
      pathCount: Array.isArray(vp) ? vp.length : null,
      pathLengths: Array.isArray(vp) ? vp.map(p => (p.data || '').length) : null,
      pathSig: Array.isArray(vp) ? vp.map(p => (p.data || '').slice(0, 60)).join(' | ') : null,
      strokeCap: safeGet(n, 'strokeCap'), strokeJoin: safeGet(n, 'strokeJoin'),
      constraints: safeGet(n, 'constraints')
    };
  }
  return d;
}

/* 서브트리 — 깊이 제한 */
async function tree(n, depth, maxDepth) {
  const d = await describe(n);
  if (!d) return null;
  if (depth < maxDepth && kids(n).length) {
    d.children = [];
    for (const c of kids(n)) d.children.push(await tree(c, depth + 1, maxDepth));
  }
  return d;
}

function walk(n, fn, depth) {
  depth = depth || 0;
  fn(n, depth);
  for (const c of kids(n)) walk(c, fn, depth + 1);
}
function pathTo(n, stopId) {
  const p = [];
  let x = n;
  while (x && x.type !== 'PAGE') { p.unshift(x.name + ' (' + x.id + ')'); if (x.id === stopId) break; x = x.parent; }
  return p.join(' › ');
}
function isVectorish(n) { return ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE'].indexOf(n.type) >= 0; }

/* ======== 0. 가드 ======== */
const nodes = {};
for (const k of Object.keys(IDS)) nodes[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!nodes.mainFrame) return out({ scriptVersion: SCRIPT_VERSION, aborted: true, reason: '메인 화면 1002:2 를 찾을 수 없다. 다른 파일이 열려 있는지 확인.' });

/* ======== 1. 과거 기록 ID 확인 ======== */
const legacy = {};
for (const k of Object.keys(LEGACY_TOGGLE_IDS)) {
  const n = await figma.getNodeByIdAsync(LEGACY_TOGGLE_IDS[k]);
  legacy[k] = n ? { id: n.id, name: n.name, type: n.type, size: size(n), visible: n.visible !== false,
    parent: n.parent ? n.parent.name + ' (' + n.parent.id + ')' : null, path: pathTo(n, IDS.mainFrame),
    insideToolbar: (function () { let x = n.parent; while (x) { if (x.id === IDS.toolbar) return true; x = x.parent; } return false; })() }
    : { id: LEGACY_TOGGLE_IDS[k], exists: false };
}

/* ======== 2. 이름/구조로 다시 훑기 (메인 화면 전체) ======== */
const byName = [];
const byStructure = [];
walk(nodes.mainFrame, (n, depth) => {
  if (n.id === IDS.mainFrame) return;
  if (NAME_RE.test(n.name)) byName.push({ id: n.id, name: n.name, type: n.type, size: size(n), visible: n.visible !== false, parent: n.parent ? n.parent.id : null });
  /* 구조 후보: 보이는 자식이 2~4개이고, 자식이 모두 같은 크기의 작은 박스이며, 각 자식 안에 벡터가 있는 컨테이너 */
  const vk = kids(n).filter(c => c.visible !== false);
  if ((n.type === 'FRAME' || n.type === 'INSTANCE' || n.type === 'GROUP') && vk.length >= 2 && vk.length <= 4 && n.height <= 48 && n.width <= 160) {
    const sameSize = vk.every(c => Math.abs(c.width - vk[0].width) < 1 && Math.abs(c.height - vk[0].height) < 1);
    const eachHasVector = vk.every(c => { let f = false; walk(c, x => { if (isVectorish(x)) f = true; }); return f; });
    const noText = (function () { let t = false; walk(n, x => { if (x.type === 'TEXT' && x.visible !== false) t = true; }); return !t; })();
    if (sameSize && eachHasVector && noText) byStructure.push({ id: n.id, name: n.name, type: n.type, size: size(n), childCount: vk.length, path: pathTo(n, IDS.mainFrame) });
  }
});

/* 후보 확정: 과거 container ID 가 살아 있으면 그것, 아니면 구조 후보가 정확히 1개일 때만 */
let candidateId = null, candidateBasis = null;
if (legacy.container && legacy.container.exists !== false) { candidateId = LEGACY_TOGGLE_IDS.container; candidateBasis = 'legacyId'; }
else if (byStructure.length === 1) { candidateId = byStructure[0].id; candidateBasis = 'structureUnique'; }
else { candidateBasis = byStructure.length ? 'ambiguous(' + byStructure.length + ')' : 'notFound'; errors.push('뷰 토글 컨테이너를 확정하지 못했다 — ' + candidateBasis); }
const candidate = candidateId ? await figma.getNodeByIdAsync(candidateId) : null;
const structureAgreesWithLegacy = candidateBasis === 'legacyId' ? byStructure.some(s => s.id === candidateId) : null;

/* ======== 3. 후보 구조 + 상태 표현 ======== */
let candidateTree = null, stateAnalysis = null, iconAnalysis = [];
if (candidate) {
  candidateTree = await tree(candidate, 0, 4);
  const buttons = kids(candidate).filter(c => c.visible !== false);
  const btnDesc = [];
  for (const b of buttons) {
    const d = await describe(b);
    const vecs = []; walk(b, x => { if (isVectorish(x)) vecs.push(x); });
    const iconColors = [];
    for (const v of vecs) {
      iconColors.push({ id: v.id, fills: await paints(safeGet(v, 'fills')), strokes: await paints(safeGet(v, 'strokes')), strokeWeight: safeGet(v, 'strokeWeight') });
    }
    const visibleFill = Array.isArray(d.fills) ? d.fills.filter(f => f.visible && f.opacity > 0) : [];
    btnDesc.push({ id: b.id, name: b.name, size: d.size, padding: d.padding, cornerRadius: d.cornerRadius,
      hasVisibleFill: visibleFill.length > 0, fill: visibleFill.map(f => f.color + (f.variable ? ' [' + f.variable + ']' : '')).join(', ') || null,
      effectCount: d.effects.filter(e => e.visible).length, effectStyle: d.effectStyle, iconColors,
      vectorIds: vecs.map(v => v.id) });
  }
  const selectedLike = btnDesc.filter(b => b.hasVisibleFill || b.effectCount > 0);
  stateAnalysis = {
    buttonCount: buttons.length, buttons: btnDesc,
    selectedGuess: selectedLike.length === 1 ? selectedLike[0].id : null,
    selectedBasis: selectedLike.length === 1 ? 'fill/effect 가 있는 버튼이 정확히 하나' : 'fill/effect 로 선택 상태를 구분할 수 없음 (' + selectedLike.length + '개)',
    iconColorDiffers: btnDesc.length === 2 ? JSON.stringify(btnDesc[0].iconColors.map(c => [c.fills, c.strokes])) !== JSON.stringify(btnDesc[1].iconColors.map(c => [c.fills, c.strokes])) : null,
    paddingSymmetric: btnDesc.map(b => Array.isArray(b.padding) ? (b.padding[0] === b.padding[2] && b.padding[1] === b.padding[3]) : null)
  };

  /* 아이콘 벡터 — 새 Icon 컴포넌트를 만든다면 source 가 된다 */
  for (const b of btnDesc) {
    for (const vid of b.vectorIds) {
      const v = await figma.getNodeByIdAsync(vid);
      const vp = safeGet(v, 'vectorPaths');
      iconAnalysis.push({ buttonId: b.id, id: v.id, name: v.name, type: v.type, size: size(v),
        parent: v.parent ? v.parent.name + ' (' + v.parent.id + ' ' + size(v.parent) + ')' : null,
        pathCount: Array.isArray(vp) ? vp.length : null, windingRules: Array.isArray(vp) ? vp.map(p => p.windingRule) : null,
        fitsCanvas16: v.width <= 16.01 && v.height <= 16.01 });
    }
  }
}

/* ======== 4. 툴바 안의 위치와 여유 ======== */
let toolbarAnalysis = null;
if (nodes.toolbar) {
  const tb = nodes.toolbar;
  const flowKids = kids(tb).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE');
  const pad = [safeGet(tb, 'paddingTop'), safeGet(tb, 'paddingRight'), safeGet(tb, 'paddingBottom'), safeGet(tb, 'paddingLeft')].map(r2);
  const gap = r2(safeGet(tb, 'itemSpacing'));
  const isSB = safeGet(tb, 'primaryAxisAlignItems') === 'SPACE_BETWEEN';
  const occupied = r2(pad[1] + pad[3] + flowKids.reduce((a, c) => a + c.width, 0) + (isSB ? 0 : gap * Math.max(0, flowKids.length - 1)));
  const rows = [];
  for (const c of kids(tb)) {
    const inner = [];
    for (const g of kids(c)) {
      const mc = g.type === 'INSTANCE' ? await mainCompOf(g) : null;
      inner.push({ id: g.id, name: g.name, type: g.type, size: size(g), visible: g.visible !== false,
        master: mc ? mc.name + ' (' + mc.id + ')' : null, containsToggle: candidateId ? (g.id === candidateId || !!(function () { let f = false; walk(g, x => { if (x.id === candidateId) f = true; }); return f; })()) : null });
    }
    rows.push({ id: c.id, name: c.name, type: c.type, size: size(c), visible: c.visible !== false,
      layoutMode: safeGet(c, 'layoutMode'), itemSpacing: r2(safeGet(c, 'itemSpacing')),
      sizingH: safeGet(c, 'layoutSizingHorizontal'), children: inner });
  }
  /* 툴바 안 보이는 컨트롤 높이 분포 — 토글 높이 기준 */
  const controlHeights = {};
  walk(tb, (x, depth) => {
    if (depth === 0 || depth > 3 || x.visible === false) return;
    if (x.type === 'INSTANCE') { const k = r2(x.height); controlHeights[k] = (controlHeights[k] || 0) + 1; }
  });
  toolbarAnalysis = {
    size: size(tb), layoutMode: safeGet(tb, 'layoutMode'), primaryAlign: safeGet(tb, 'primaryAxisAlignItems'),
    counterAlign: safeGet(tb, 'counterAxisAlignItems'), padding: pad, itemSpacing: gap,
    sizingH: safeGet(tb, 'layoutSizingHorizontal'), sizingV: safeGet(tb, 'layoutSizingVertical'),
    occupied, freeSpace: r2(tb.width - occupied), rows,
    visibleInstanceHeights: controlHeights,
    toggleCenterY: candidate ? r2(candidate.absoluteTransform[1][2] + candidate.height / 2 - tb.absoluteTransform[1][2]) : null,
    toolbarCenterY: r2(tb.height / 2)
  };
  /* 숨겨진 legacy 원본 (Phase B 에서 숨김) 이 툴바에 남아 있는지 — G5 cleanup 범위 참고 */
  const hidden = []; walk(tb, (x, depth) => { if (depth > 0 && x.visible === false) hidden.push({ id: x.id, name: x.name, type: x.type, parent: x.parent ? x.parent.id : null }); });
  toolbarAnalysis.hiddenDescendants = hidden.length;
  toolbarAnalysis.hiddenTop = hidden.filter(h => { const p = h.parent; return !hidden.some(o => o.id === p); }).slice(0, 20);
}

/* ======== 5. 참고 마스터 ======== */
async function describeSetOrComp(id, maxDepth) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) return { id, exists: false };
  const res = { id: n.id, name: n.name, type: n.type, size: size(n), page: (function () { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x ? x.name : null; })() };
  try {
    const defs = n.componentPropertyDefinitions || {};
    res.properties = Object.keys(defs).map(k => ({ key: k, type: defs[k].type, default: defs[k].defaultValue,
      variantOptions: defs[k].variantOptions || null, preferredValues: defs[k].preferredValues ? defs[k].preferredValues.length : null }));
  } catch (e) { res.properties = '(읽기 실패)'; }
  if (n.type === 'COMPONENT_SET') {
    res.variants = [];
    for (const v of kids(n)) res.variants.push(await tree(v, 0, maxDepth));
  } else {
    res.tree = await tree(n, 0, maxDepth);
  }
  return res;
}
const refs = {
  iconButton: await describeSetOrComp(REF_IDS.iconButton, 2),
  paginationSet: await describeSetOrComp(REF_IDS.paginationSet, 1),
  navItemSet: await describeSetOrComp(REF_IDS.navItemSet, 0)
};
/* 툴바 Select 마스터 (Phase B 에서 교체한 것) — 높이·radius·fill 기준 */
if (toolbarAnalysis) {
  const seen = {};
  refs.toolbarMasters = [];
  for (const row of toolbarAnalysis.rows) for (const c of row.children) {
    if (!c.master || !c.visible) continue;
    const mid = c.master.match(/\(([^)]+)\)$/)[1];
    if (seen[mid]) continue; seen[mid] = true;
    const m = await figma.getNodeByIdAsync(mid);
    refs.toolbarMasters.push({ master: c.master, set: m && m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name + ' (' + m.parent.id + ')' : null,
      snapshot: await describe(m) });
  }
}

/* ======== 6. Icon Library ======== */
const iconLib = [];
const togglePathData = {};
for (const ia of iconAnalysis) {
  const v = await figma.getNodeByIdAsync(ia.id);
  const vp = safeGet(v, 'vectorPaths');
  togglePathData[ia.id] = Array.isArray(vp) ? vp.map(p => p.data).join('||') : null;
}
for (const name of Object.keys(ICON_LIBRARY)) {
  const n = await figma.getNodeByIdAsync(ICON_LIBRARY[name]);
  if (!n) { iconLib.push({ name, id: ICON_LIBRARY[name], exists: false }); continue; }
  const vecs = []; walk(n, x => { if (isVectorish(x) || x.type === 'ELLIPSE') vecs.push(x); });
  const glyph = vecs[0] || null;
  const data = glyph && Array.isArray(safeGet(glyph, 'vectorPaths')) ? glyph.vectorPaths.map(p => p.data).join('||') : null;
  const matchesToggleIcon = Object.keys(togglePathData).filter(k => togglePathData[k] && data && togglePathData[k] === data);
  iconLib.push({ name, id: n.id, actualName: n.name, nameMatches: n.name === name, type: n.type, size: size(n),
    glyph: glyph ? { type: glyph.type, size: size(glyph), fills: await paints(safeGet(glyph, 'fills')), strokes: await paints(safeGet(glyph, 'strokes')) } : null,
    matchesToggleIcon });
}
const libraryHasViewIcon = iconLib.some(i => /view|grid|list|table/i.test(i.actualName || '') || (i.matchesToggleIcon && i.matchesToggleIcon.length));
const iconLibPage = await (async () => { const n = await figma.getNodeByIdAsync(ICON_LIBRARY['Icon / Search']); let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x ? { name: x.name, id: x.id } : null; })();
const iconLibParent = await (async () => { const n = await figma.getNodeByIdAsync(ICON_LIBRARY['Icon / Search']); return n && n.parent ? { id: n.parent.id, name: n.parent.name, type: n.parent.type, layoutMode: safeGet(n.parent, 'layoutMode'), childCount: kids(n.parent).length } : null; })();

/* ======== 7. 파일 전체 컴포넌트 중 이름 충돌 가능성 ======== */
await figma.loadAllPagesAsync();
const allComps = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
const nameClash = allComps.filter(c => /view|toggle|segment|보기|토글/i.test(c.name) && !(c.type === 'COMPONENT' && c.parent && c.parent.type === 'COMPONENT_SET'))
  .map(c => ({ id: c.id, name: c.name, type: c.type }));
const componentPlacement = {};
for (const c of allComps) {
  if (c.type !== 'COMPONENT_SET' && !(c.type === 'COMPONENT' && (!c.parent || c.parent.type !== 'COMPONENT_SET'))) continue;
  let p = c; while (p && p.type !== 'PAGE') p = p.parent;
  const key = (p ? p.name : '?') + ' › ' + (c.parent ? c.parent.name + ' (' + c.parent.id + ')' : '?');
  componentPlacement[key] = (componentPlacement[key] || 0) + 1;
}
/* 다른 페이지/프레임에도 같은 토글이 있는지 — 인스턴스가 아니라 복제본일 수 있어 경로 문자열로 대조 */
const otherCopies = [];
if (candidate) {
  const sigOf = n => kids(n).filter(c => c.visible !== false).map(c => size(c)).join(',') + '/' + size(n);
  const mySig = sigOf(candidate);
  const frames = figma.root.findAllWithCriteria({ types: ['FRAME', 'INSTANCE', 'GROUP'] });
  for (const f of frames) {
    if (f.id === candidate.id) continue;
    if (Math.abs(f.width - candidate.width) > 0.5 || Math.abs(f.height - candidate.height) > 0.5) continue;
    if (sigOf(f) !== mySig) continue;
    let p = f; while (p && p.type !== 'PAGE') p = p.parent;
    otherCopies.push({ id: f.id, name: f.name, page: p ? p.name : null, visible: f.visible !== false });
  }
}

/* ======== 8. 토큰 ======== */
const tokens = { variables: [], effectStyles: [] };
try {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  for (const col of cols) {
    for (const vid of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(vid);
      if (!v) continue;
      if (!/radius|brand|surface|bg|background|border|stroke|text|fg|icon|shadow|elevation|size|control|space|gap|pad/i.test(v.name)) continue;
      const mode = col.defaultModeId;
      let val = v.valuesByMode[mode];
      if (val && typeof val === 'object' && 'r' in val) val = hex(val) + (typeof val.a === 'number' && val.a < 1 ? '@' + r2(val.a) : '');
      else if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') val = '→ ' + (await varName(val.id));
      tokens.variables.push({ collection: col.name, name: v.name, type: v.resolvedType, value: typeof val === 'number' ? r2(val) : val });
    }
  }
} catch (e) { notes.push('변수 목록 읽기 실패: ' + e.message); }
try {
  const es = await figma.getLocalEffectStylesAsync();
  for (const s of es) tokens.effectStyles.push({ id: s.id, name: s.name, effects: (s.effects || []).map(e => e.type + ' ' + (e.color ? hex(e.color) + '@' + r2(e.color.a) : '') + ' ' + (e.offset ? e.offset.x + ',' + e.offset.y : '') + ' r' + r2(e.radius)) });
} catch (e) { notes.push('effect style 읽기 실패: ' + e.message); }

/* ======== 판단 보조 ======== */
const tbHeights = toolbarAnalysis ? Object.keys(toolbarAnalysis.visibleInstanceHeights).map(Number) : [];
const summary = {
  toggleFound: !!candidate,
  toggleId: candidateId, toggleBasis: candidateBasis, structureAgreesWithLegacy,
  toggleSize: candidate ? size(candidate) : null,
  toggleIsInstance: candidate ? candidate.type === 'INSTANCE' : null,
  toggleInsideToolbar: legacy.container ? legacy.container.insideToolbar : null,
  buttonCount: stateAnalysis ? stateAnalysis.buttonCount : null,
  selectedGuess: stateAnalysis ? stateAnalysis.selectedGuess : null,
  iconColorDiffersBetweenStates: stateAnalysis ? stateAnalysis.iconColorDiffers : null,
  toolbarVisibleInstanceHeights: tbHeights,
  toolbarFreeSpace: toolbarAnalysis ? toolbarAnalysis.freeSpace : null,
  iconLibraryHasViewIcons: libraryHasViewIcon,
  toggleIconsFitCanvas16: iconAnalysis.length ? iconAnalysis.every(i => i.fitsCanvas16) : null,
  existingViewToggleComponents: nameClash.length,
  otherCopiesOfToggle: otherCopies.length,
  byNameHits: byName.length, byStructureHits: byStructure.length,
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary,
  legacyIds: legacy,
  discovery: { byName, byStructure },
  candidateTree,
  stateAnalysis,
  iconAnalysis,
  toolbarAnalysis,
  refs,
  iconLibrary: { page: iconLibPage, parent: iconLibParent, entries: iconLib },
  componentsInFile: { nameClash, placement: componentPlacement },
  otherCopies,
  tokens,
  notes, errors
});
