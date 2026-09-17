/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 23a
 * Phase F2 레이아웃 AUDIT (읽기 전용)
 *
 * F2 는 Pagination 교체만이 아니다. footer 구조, grid/footer 겹침, 스크롤 구조,
 * 첫 화면 카드 노출량을 함께 설계해야 한다. 이 스크립트는 그 설계의 근거만 모은다.
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * setPluginData / .characters= / .visible= / .layoutSizing= / .gridRowSizes= /
 * .clipsContent= / .overflowDirection= / .layoutPositioning= 를 한 줄도 포함하지 않는다.
 *
 * 숫자는 파일에서 읽는다. 사용자 메시지의 숫자는 "기대값" 으로만 두고, 읽은 값과 대조한다.
 * 추천은 하되, 추천의 근거가 된 읽은 값을 함께 출력한다.
 * ========================================================================== */

const SCRIPT_VERSION = '23a-F2-v1-layout-audit';
/* 사전 조사: Figma MCP 1회 읽기 (2026-09-17) → 이 스크립트로 재현 검증 */

/* MCP 사전 조사로 확인한 계층 — audit 은 이 관계를 파일에서 다시 확인한다 */
const IDS = {
  main: '1002:2', mainContent: '1002:3', contentContainer: '1002:4', topHeader: '1009:698',
  listSection: '1002:139', listContainer: '1009:2', grid: '1002:140', footer: '1002:451', pagination: '1002:458',
  kpiStrip: '1002:23', toolbar: '1003:1695', addRow: '1009:715', header: '1002:469', aside: '1002:492'
};
const PAG_OLD_IDS = ['1002:459', '1002:462', '1002:464', '1002:466'];
const PAG_SET_ID = '1042:46';
const APPCARD_SET_ID = '1037:2163';

/* 사용자가 알려준 값 — 판정에 쓰지 않고 읽은 값과 대조만 한다 */
const USER_STATED = {
  gridSize: '976×687', rowTracks: [205, 205, 205], rowGap: 36, columnGap: 12, rowYs: [0, 241, 482],
  cardSize: '235×219', footerSize: '976×52', footerY: 635.5, footerPadding: '12/16/12/16',
  listContainerSize: '976×687', paginationSize: '124×28', contentBottom: 701, overlap: 65.5
};
const SLICES = [20, 30, 40];
const GAP_CANDIDATES = [24, 36];

const notes = [];
const errors = [];
const mutationCount = 0;            /* 이 스크립트에는 쓰기 호출이 없다 — 상수로 둔다 */
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' &&
                          Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
const trim = s => (typeof s === 'string' ? s.trim() : s);

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function safeGet(node, key) {
  try { const v = node[key]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; }
}
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs.length || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
async function mainSetIdOf(n) {
  if (!n || n.type !== 'INSTANCE') return null;
  const mc = await mainCompOf(n);
  return mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null;
}
function trackValue(t) {
  if (typeof t === 'number') return r2(t);
  if (t && typeof t === 'object') for (const k of ['value', 'size', 'length', 'px', 'fixed']) if (typeof t[k] === 'number') return r2(t[k]);
  return null;
}
function trackType(t) {
  if (typeof t === 'number') return 'NUMBER';
  return t && typeof t === 'object' ? (t.type || t.mode || null) : null;
}
/* 쓰기 없이 setter 존재만 확인한다 (프로토타입 체인의 property descriptor) */
function setterExists(node, key) {
  try {
    let o = node;
    for (let depth = 0; o && depth < 8; depth++) {
      const d = Object.getOwnPropertyDescriptor(o, key);
      if (d) return { found: true, hasSetter: typeof d.set === 'function' || d.writable === true };
      o = Object.getPrototypeOf(o);
    }
    return { found: false, hasSetter: null };
  } catch (e) { return { found: false, hasSetter: null, error: e.message }; }
}
/* 메인 프레임 기준 좌표 — absoluteBoundingBox 가 있으면 쓰고, 없으면 조상 x/y 를 더한다 */
function absBox(n) {
  const bb = safeGet(n, 'absoluteBoundingBox');
  if (bb && typeof bb.y === 'number') return { x: r2(bb.x), y: r2(bb.y), width: r2(bb.width), height: r2(bb.height), source: 'absoluteBoundingBox' };
  let x = 0, y = 0, cur = n;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') { x += cur.x || 0; y += cur.y || 0; cur = cur.parent; }
  return { x: r2(x), y: r2(y), width: r2(n.width), height: r2(n.height), source: '조상 x/y 합' };
}

function layoutRecord(n) {
  if (!n) return null;
  const p = n.parent;
  return {
    id: n.id, name: n.name, type: n.type, visible: n.visible,
    parentId: p ? p.id : null, parentName: p ? p.name : null, parentLayoutMode: p ? safeGet(p, 'layoutMode') : null,
    childIndex: p && Array.isArray(p.children) ? p.children.indexOf(n) : null,
    x: r2(n.x), y: r2(n.y), width: r2(n.width), height: r2(n.height), size: r2(n.width) + '×' + r2(n.height),
    layoutMode: safeGet(n, 'layoutMode'), layoutWrap: safeGet(n, 'layoutWrap'),
    layoutPositioning: safeGet(n, 'layoutPositioning'),
    isAbsolute: safeGet(n, 'layoutPositioning') === 'ABSOLUTE',
    layoutSizingHorizontal: safeGet(n, 'layoutSizingHorizontal'),
    layoutSizingVertical: safeGet(n, 'layoutSizingVertical'),
    primaryAxisSizingMode: safeGet(n, 'primaryAxisSizingMode'),
    counterAxisSizingMode: safeGet(n, 'counterAxisSizingMode'),
    primaryAxisAlignItems: safeGet(n, 'primaryAxisAlignItems'),
    counterAxisAlignItems: safeGet(n, 'counterAxisAlignItems'),
    itemSpacing: r2(safeGet(n, 'itemSpacing')),
    padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map(k => r2(safeGet(n, k) || 0)).join('/'),
    paddingTop: r2(safeGet(n, 'paddingTop') || 0), paddingBottom: r2(safeGet(n, 'paddingBottom') || 0),
    paddingLeft: r2(safeGet(n, 'paddingLeft') || 0), paddingRight: r2(safeGet(n, 'paddingRight') || 0),
    constraints: safeGet(n, 'constraints'),
    clipsContent: safeGet(n, 'clipsContent'),
    overflowDirection: safeGet(n, 'overflowDirection'),
    numberOfFixedChildren: safeGet(n, 'numberOfFixedChildren'),
    minWidth: safeGet(n, 'minWidth'), maxWidth: safeGet(n, 'maxWidth'),
    minHeight: safeGet(n, 'minHeight'), maxHeight: safeGet(n, 'maxHeight'),
    absolute: absBox(n)
  };
}
function ancestorChain(n) {
  const chain = [];
  let cur = n ? n.parent : null;
  while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
    chain.push({ id: cur.id, name: cur.name, type: cur.type, layoutMode: safeGet(cur, 'layoutMode'),
      sizingV: safeGet(cur, 'layoutSizingVertical'), size: r2(cur.width) + '×' + r2(cur.height),
      clipsContent: safeGet(cur, 'clipsContent'), overflowDirection: safeGet(cur, 'overflowDirection'),
      positioning: safeGet(cur, 'layoutPositioning') });
    cur = cur.parent;
  }
  return chain;
}
function isInside(node, ancestor) {
  let cur = node;
  while (cur) { if (cur.id === ancestor.id) return true; cur = cur.parent; }
  return false;
}

/* 배치 계산에 쓰는 값만 추린다 */
function layoutOf(n) {
  return {
    layoutMode: safeGet(n, 'layoutMode'), layoutSizingVertical: safeGet(n, 'layoutSizingVertical'),
    paddingTop: r2(safeGet(n, 'paddingTop') || 0), paddingBottom: r2(safeGet(n, 'paddingBottom') || 0),
    paddingLeft: r2(safeGet(n, 'paddingLeft') || 0), paddingRight: r2(safeGet(n, 'paddingRight') || 0),
    itemSpacing: r2(safeGet(n, 'itemSpacing') || 0), clipsContent: safeGet(n, 'clipsContent')
  };
}

/* ---------- 노드 읽기 ---------- */
const nodes = {};
for (const k of Object.keys(IDS)) nodes[k] = await figma.getNodeByIdAsync(IDS[k]);
const records = {};
const chains = {};
for (const k of Object.keys(IDS)) {
  records[k] = layoutRecord(nodes[k]);
  chains[k] = nodes[k] ? ancestorChain(nodes[k]) : null;
  if (!nodes[k]) errors.push(k + ' (' + IDS[k] + ') 를 찾지 못했다');
}
const main = nodes.main, grid = nodes.grid, footer = nodes.footer, pag = nodes.pagination, list = nodes.listContainer;

/* ---------- layoutTree ---------- */
const KEY_IDS = Object.keys(IDS).reduce((m, k) => { m[IDS[k]] = k; return m; }, {});
async function treeOf(n, depth) {
  const rec = { id: n.id, name: n.name, type: n.type,
    role: KEY_IDS[n.id] || null,
    y: r2(n.y), height: r2(n.height), x: r2(n.x), width: r2(n.width),
    layoutMode: safeGet(n, 'layoutMode'), sizingV: safeGet(n, 'layoutSizingVertical'),
    positioning: safeGet(n, 'layoutPositioning') === 'ABSOLUTE' ? 'ABSOLUTE' : undefined,
    visible: n.visible === false ? false : undefined,
    clips: safeGet(n, 'clipsContent') === true ? true : undefined,
    overflow: safeGet(n, 'overflowDirection') && safeGet(n, 'overflowDirection') !== 'NONE' ? safeGet(n, 'overflowDirection') : undefined };
  if (n.type === 'INSTANCE') { const mc = await mainCompOf(n); rec.instanceOf = mc ? mc.name : null; return rec; }
  if (n.type === 'TEXT') { rec.text = (n.characters || '').slice(0, 40); return rec; }
  const cs = kids(n);
  if (!cs.length) return rec;
  /* 핵심 노드로 가는 길목이면 더 깊이 들어간다 */
  const leadsToKey = Object.keys(IDS).some(k => nodes[k] && nodes[k].id !== n.id && isInside(nodes[k], n));
  if (depth <= 0 && !leadsToKey) { rec.childCount = cs.length; return rec; }
  if (cs.length > 14 && !leadsToKey) { rec.childCount = cs.length; rec.childrenSummary = cs.slice(0, 3).map(c => c.name).join(', ') + ' …'; return rec; }
  rec.children = [];
  for (const c of cs) rec.children.push(await treeOf(c, leadsToKey ? Math.max(depth - 1, 1) : depth - 1));
  return rec;
}
const layoutTree = main ? await treeOf(main, 2) : null;

/* 세로 흐름을 한 줄씩 — "그림처럼" 읽히게 */
function flowLines(n, indent, acc) {
  acc = acc || [];
  const pad = '  '.repeat(indent);
  const lm = safeGet(n, 'layoutMode');
  const tag = [lm && lm !== 'NONE' ? lm : 'NONE', safeGet(n, 'layoutSizingVertical') || '',
    safeGet(n, 'layoutPositioning') === 'ABSOLUTE' ? 'ABSOLUTE' : '', safeGet(n, 'clipsContent') ? 'clip' : '',
    safeGet(n, 'overflowDirection') && safeGet(n, 'overflowDirection') !== 'NONE' ? 'scroll:' + safeGet(n, 'overflowDirection') : '']
    .filter(Boolean).join(' ');
  acc.push(pad + (KEY_IDS[n.id] ? '★ ' : '') + n.name + ' (' + n.id + ') y ' + r2(n.y) + '–' + r2(n.y + n.height) +
    ' · ' + r2(n.width) + '×' + r2(n.height) + ' · ' + tag + (n.visible === false ? ' · hidden' : ''));
  const onPath = kids(n).filter(c => Object.keys(IDS).some(k => nodes[k] && isInside(nodes[k], c)));
  const shown = indent < 1 ? kids(n) : onPath;
  for (const c of shown) if (c.type !== 'TEXT') flowLines(c, indent + 1, acc);
  return acc;
}
const verticalFlow = main ? flowLines(main, 0) : null;

const layoutHierarchy = {};
for (const k of Object.keys(IDS)) {
  if (!nodes[k] || k === 'main') continue;
  layoutHierarchy[k] = { insideMain: !!main && isInside(nodes[k], main), chain: chains[k].map(c => c.name + ' (' + c.id + ')').join(' ← ') };
}

/* ========================================================================== *
 * 분석 — 위에서 읽은 값만으로 계산한다
 * ========================================================================== */
const content = nodes.mainContent, container = nodes.contentContainer, section = nodes.listSection;

/* 메인 프레임 기준 y — absoluteBoundingBox 차이로 계산 */
function yInMain(n) { if (!n || !main) return null; return r2(absBox(n).y - absBox(main).y); }

/* ---------- gridAnalysis ---------- */
const gridAnalysis = { found: !!grid };
if (grid) {
  const raw = safeGet(grid, 'gridRowSizes'), rawCols = safeGet(grid, 'gridColumnSizes');
  const tracks = Array.isArray(raw) ? raw.map(trackValue) : null;
  const trackTypes = Array.isArray(raw) ? raw.map(trackType) : null;
  const rowGap = r2(safeGet(grid, 'gridRowGap')), colGap = r2(safeGet(grid, 'gridColumnGap'));
  const cards = kids(grid).filter(c => c.visible !== false);
  const heights = cards.map(c => r2(c.height));
  const sameH = heights.length > 0 && heights.every(h => near(h, heights[0]));
  const cardH = sameH ? heights[0] : null;
  const rowCount = safeGet(grid, 'gridRowCount');
  const heightFrom = (t, gap, rows) => r2(t * rows + gap * Math.max(0, rows - 1));
  const modelNow = tracks ? r2(tracks.reduce((a, b) => a + b, 0) + rowGap * Math.max(0, tracks.length - 1)) : null;
  const contentBottom = cards.length ? r2(Math.max.apply(null, cards.map(c => c.y + c.height))) : null;
  const scenarios = [];
  for (const t of [tracks ? tracks[0] : null, cardH].filter((v, i, a) => typeof v === 'number' && a.indexOf(v) === i)) {
    for (const gap of [rowGap].concat(GAP_CANDIDATES).filter((v, i, a) => typeof v === 'number' && a.indexOf(v) === i)) {
      scenarios.push({ rowTrack: t, rowGap: gap, rows: rowCount, gridHeight: heightFrom(t, gap, rowCount),
        contentBottom: r2(heightFrom(t, gap, rowCount) - t + cardH),
        overflowPerRow: r2(cardH - t), formula: t + '×' + rowCount + ' + ' + gap + '×' + (rowCount - 1) });
    }
  }
  let probe = null;
  try { const s = figma.root.getPluginData('joob.phaseE.probe'); probe = s ? JSON.parse(s) : null; } catch (e) { /* 읽기만 */ }
  Object.assign(gridAnalysis, {
    record: records.grid,
    rowTracksRaw: raw, rowTracks: tracks, rowTrackTypes: trackTypes,
    columnTracksRaw: rawCols, columnTrackTypes: Array.isArray(rawCols) ? rawCols.map(trackType) : null,
    rowGap, columnGap: colGap, rowCount, columnCount: safeGet(grid, 'gridColumnCount'),
    cardCount: cards.length, cardHeights: heights, cardHeight: cardH,
    cardSizing: cards.slice(0, 1).map(c => ({ h: safeGet(c, 'layoutSizingHorizontal'), v: safeGet(c, 'layoutSizingVertical'),
      minHeight: safeGet(c, 'minHeight'), maxHeight: safeGet(c, 'maxHeight'),
      verticalAlign: safeGet(c, 'gridChildVerticalAlign'), horizontalAlign: safeGet(c, 'gridChildHorizontalAlign') }))[0] || null,
    gridSizingVertical: safeGet(grid, 'layoutSizingVertical'),
    heightModelNow: modelNow, heightModelReproduces: near(modelNow, grid.height, 1),
    hugFollowsTracksNotContent: safeGet(grid, 'layoutSizingVertical') === 'HUG' && near(modelNow, grid.height, 1) && contentBottom > grid.height + 0.5,
    contentBottom, overflowNow: r2(contentBottom - grid.height),
    overflowPerRow: cardH !== null && tracks ? r2(cardH - tracks[0]) : null,
    scenarios,
    trackTypesObservedInFile: Array.from(new Set((trackTypes || []).concat(Array.isArray(rawCols) ? rawCols.map(trackType) : []))),
    setterIntrospection: { gridRowSizes: setterExists(grid, 'gridRowSizes'), gridRowGap: setterExists(grid, 'gridRowGap'),
      gridRowCount: setterExists(grid, 'gridRowCount') },
    autoRowTrackNote: '파일에서 관측된 트랙 타입은 ' + JSON.stringify(Array.from(new Set((trackTypes || []).concat(Array.isArray(rawCols) ? rawCols.map(trackType) : [])))) +
      ' 뿐이다. 내용 높이를 따르는 트랙 타입이 API 에 있는지, setter 에 어떤 형태로 써야 하는지는 이 audit 으로는 확인할 수 없다 — ' +
      '복제본에서 실험하는 probe 가 필요하다. 확실한 경로는 FIXED 값을 카드 높이로 맞추는 것이다.',
    rowGrowthEvidence: probe ? {
      source: 'Phase E probe (' + probe.probeVersion + ') 실측',
      insertWhileFullGrewRows: probe.insertBeforeRemoveGrowsGrid !== undefined ? probe.insertBeforeRemoveGrowsGrid : '기록 없음',
      rowTracksFixedForTallerChild: probe.rowTracksFixed
    } : { source: 'probe 기록 없음' },
    rowGrowthNote: '칸이 다 찬 상태에서 자식을 더 넣으면 행이 추가되는 것은 Phase E probe C 에서 관측됐다. ' +
      '추가된 행의 트랙 크기는 마지막 행 값을 따르는지 따로 확인해야 한다.'
  });
}

/* ---------- footerAnalysis ---------- */
const footerAnalysis = { found: !!footer };
if (footer && list) {
  const flow = kids(list).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE');
  const L = layoutOf(list);
  const flowHeight = r2(L.paddingTop + L.paddingBottom + flow.reduce((a, c) => a + c.height, 0) + L.itemSpacing * Math.max(0, flow.length - 1));
  const bottomOffset = r2(list.height - (footer.y + footer.height));
  const texts = collectDeep(footer, x => x.type === 'TEXT', 6).map(t => ({ id: t.id, text: t.characters,
    parentId: t.parent ? t.parent.id : null, parentName: t.parent ? t.parent.name : null,
    inPagination: pag ? isInside(t, pag) : null }));
  const nonPagTexts = texts.filter(t => !t.inPagination);
  const countText = nonPagTexts.filter(t => /총|개|표시/.test(t.text))[0] || null;
  const sortText = nonPagTexts.filter(t => /정렬/.test(t.text))[0] || null;
  const m = countText ? countText.text.match(/총\s*(\d+)\s*개(?:\s*중\s*(\d+)\s*[-–~]\s*(\d+))?/) : null;
  const pagH1 = 32, pagH0 = pag ? r2(pag.height) : null;
  const flowInFooter = kids(footer).filter(c => c.visible !== false);
  const L2 = layoutOf(footer);
  const footerHNow = r2(L2.paddingTop + L2.paddingBottom + Math.max.apply(null, flowInFooter.map(c => c.height)));
  const footerHAfter = r2(L2.paddingTop + L2.paddingBottom + Math.max.apply(null, flowInFooter.map(c => c.id === IDS.pagination ? pagH1 : c.height)));
  const dh = r2(footerHAfter - footerHNow);
  const cons = safeGet(footer, 'constraints');
  const yAfter = cons && cons.vertical === 'MAX' ? r2(footer.y - dh) : (cons && cons.vertical === 'CENTER' ? r2(footer.y - dh / 2) : r2(footer.y));
  const gridContentBottom = gridAnalysis.contentBottom;
  Object.assign(footerAnalysis, {
    record: records.footer,
    parentId: list.id, parentName: list.name, parentLayout: L.layoutMode, parentSizingVertical: L.layoutSizingVertical,
    parentGap: L.itemSpacing,
    parentFlowChildren: flow.map(c => c.id + ' ' + c.name),
    parentHeightFromFlow: flowHeight, parentHeightActual: r2(list.height),
    footerExcludedFromParentHeight: near(flowHeight, list.height, 1) && safeGet(footer, 'layoutPositioning') === 'ABSOLUTE',
    absoluteReference: 'ABSOLUTE 자식은 직계 부모 ' + list.id + ' 의 좌표계에 놓이고, 부모의 Auto Layout 흐름·HUG 계산에서 빠진다',
    constraints: cons,
    bottomOffsetFromParent: bottomOffset,
    maxConstraintMeaning: cons && cons.vertical === 'MAX'
      ? '부모 아래 끝에서 ' + bottomOffset + 'px 떨어진 위치를 유지한다. 부모(=grid 높이)가 커지면 같이 내려가고, footer 자신이 커지면 위로 자란다'
      : '세로 constraints ' + (cons ? cons.vertical : null),
    whyOutOfFlow: 'layoutPositioning = ABSOLUTE 라서 grid 다음 자리를 차지하지 않고 부모 아래 끝에 겹쳐 붙어 있다',
    siblings: kids(list).map(c => ({ id: c.id, name: c.name, positioning: safeGet(c, 'layoutPositioning'), y: r2(c.y), h: r2(c.height) })),
    overlapWithGridContent: gridContentBottom !== null ? r2(gridContentBottom - footer.y) : null,
    texts, countText, sortText,
    countParsed: m ? { total: Number(m[1]), rangeFrom: m[2] ? Number(m[2]) : null, rangeTo: m[3] ? Number(m[3]) : null } : null,
    cardsInGrid: gridAnalysis.cardCount,
    countMatchesGrid: m ? Number(m[1]) === gridAnalysis.cardCount : null,
    paginationIsDirectChild: !!pag && !!pag.parent && pag.parent.id === footer.id,
    paginationChildren: [],
    pagination32pxPrediction: { footerHeightNow: footerHNow, footerHeightModelReproduces: near(footerHNow, footer.height, 1),
      footerHeightAfter: footerHAfter, heightDelta: dh, footerYNow: r2(footer.y), footerYAfterWithCurrentConstraints: yAfter,
      overlapAfterWithCurrentConstraints: gridContentBottom !== null ? r2(gridContentBottom - yAfter) : null,
      basis: 'footer 세로 HUG = 가장 높은 자식 + padding, y 는 constraints.vertical 로 계산' }
  });
  for (const id of PAG_OLD_IDS) {
    const c = await figma.getNodeByIdAsync(id);
    footerAnalysis.paginationChildren.push(c ? { id, size: r2(c.width) + '×' + r2(c.height), opacity: r2(safeGet(c, 'opacity')),
      texts: collectDeep(c, x => x.type === 'TEXT', 4).map(t => t.characters), isInstance: c.type === 'INSTANCE',
      parentId: c.parent ? c.parent.id : null } : { id, missing: true });
  }
}

/* ---------- 콘텐츠 컨테이너 넘침 (새로 확인된 debt) ---------- */
const containerOverflow = container ? (function () {
  const flow = kids(container).filter(c => c.visible !== false && safeGet(c, 'layoutPositioning') !== 'ABSOLUTE');
  const L = layoutOf(container);
  const contentH = r2(L.paddingTop + L.paddingBottom + flow.reduce((a, c) => a + c.height, 0) + L.itemSpacing * Math.max(0, flow.length - 1));
  return { id: container.id, sizingVertical: L.layoutSizingVertical, height: r2(container.height), contentHeight: contentH,
    overflowPx: r2(contentH - container.height), clipsContent: L.clipsContent,
    order: flow.map(c => c.name + ' (' + c.id + ') y ' + r2(c.y) + '–' + r2(c.y + c.height)),
    note: L.layoutSizingVertical === 'FIXED' && contentH > container.height + 0.5
      ? '높이가 FIXED 인데 내용이 더 길어 ' + r2(contentH - container.height) + 'px 넘친다. clipsContent = ' + L.clipsContent + ' 라 잘리지 않고 보인다'
      : '넘침 없음' };
})() : null;

/* grid 카드 이름 중복 (App Card — 회사명) */
const duplicateCompanyNames = (function () {
  if (!grid) return [];
  const cnt = {};
  for (const c of kids(grid)) { const nm = String(c.name || '').replace(/^App Card\s*[—-]\s*/, ''); cnt[nm] = (cnt[nm] || 0) + 1; }
  return Object.keys(cnt).filter(k => cnt[k] > 1).map(k => k + ' ×' + cnt[k]);
})();

/* ---------- viewportMath ---------- */
const viewportMath = { resolved: false };
if (main && grid && gridAnalysis.cardHeight) {
  const cardH = gridAnalysis.cardHeight;
  const listTop = yInMain(grid);
  const containerTop = yInMain(container);
  const contentTop = yInMain(content);
  const mainH = r2(main.height);
  const rowYs = kids(grid).filter(c => c.visible !== false).map(c => r2(c.y)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const rowsInMain = rowYs.map((y, i) => ({ row: i + 1, top: r2(listTop + y), bottom: r2(listTop + y + cardH),
    visiblePx: r2(Math.max(0, Math.min(mainH, listTop + y + cardH) - (listTop + y))),
    fullyVisible: listTop + y + cardH <= mainH + 0.5 }));
  const table = [];
  for (const gap of [gridAnalysis.rowGap].concat(GAP_CANDIDATES).filter((v, i, a) => a.indexOf(v) === i)) {
    for (const slice of SLICES) {
      const listViewport = r2(cardH * 2 + gap + slice);
      table.push({ rowGap: gap, slice, formula: cardH + '×2 + ' + gap + ' + ' + slice,
        listViewportHeight: listViewport,
        viewportHeightIfMainFrameScrolls: r2(listTop + listViewport),
        viewportHeightIfContent1002_3Scrolls: r2(listTop - contentTop + listViewport),
        listTopNeededToKeepMainHeight: r2(mainH - listViewport) });
    }
  }
  Object.assign(viewportMath, {
    resolved: typeof listTop === 'number' && typeof mainH === 'number',
    mainFrameHeight: mainH, mainFrameSizingVertical: safeGet(main, 'layoutSizingVertical'),
    listTopInMain: listTop, contentTopInMain: contentTop, containerTopInMain: containerTop,
    sectionTopInMain: yInMain(section),
    listVisiblePxNow: r2(mainH - listTop),
    rowsInMainNow: rowsInMain,
    thirdRowVisibleNow: rowsInMain[2] ? rowsInMain[2].visiblePx : null,
    targetTable: table,
    feasibility: [
      '지금 화면 높이 ' + mainH + ', 목록 시작 ' + listTop + ' 이면 목록에 ' + r2(mainH - listTop) + 'px 가 보인다 — 3번째 줄이 ' +
        (rowsInMain[2] ? rowsInMain[2].visiblePx : '?') + 'px 보인다.',
      '목표(2줄 + 20~40px)를 1024 높이에서 맞추려면 목록 시작이 약 ' + r2(mainH - (cardH * 2 + 36 + 40)) + '~' + r2(mainH - (cardH * 2 + 24 + 20)) +
        ' 까지 내려가야 한다 — 위쪽 영역을 키우는 것이라 목적과 맞지 않는다.',
      '현실적인 방법은 스크롤 뷰포트 높이를 표의 값(대략 ' + r2(listTop + cardH * 2 + 24 + 20) + '~' + r2(listTop + cardH * 2 + 36 + 40) + ')으로 두는 것이다. ' +
        '이는 1280×1024 대신 더 낮은 데스크톱 뷰포트를 기준 화면으로 삼는다는 결정이다.',
      '메인 프레임은 세로 ' + safeGet(main, 'layoutSizingVertical') + ' 이다. 어느 노드든 뷰포트가 되려면 세로 FIXED + clipsContent + overflowDirection VERTICAL 이 필요하다.'
    ]
  });
}

/* ---------- scrollCandidates ---------- */
function cand(n, role, needs, fixedEffect, risks) {
  if (!n) return { role, found: false };
  return { role, id: n.id, name: n.name, found: true, sizingVertical: safeGet(n, 'layoutSizingVertical'), height: r2(n.height),
    clipsContent: safeGet(n, 'clipsContent'), overflowDirection: safeGet(n, 'overflowDirection'),
    topInMain: yInMain(n), isTopLevelFrame: !!n.parent && n.parent.type === 'PAGE',
    neededChanges: needs, fixedAreaEffect: fixedEffect, risks };
}
const headerNode = nodes.header, asideNode = nodes.aside;
const scrollCandidates = [
  cand(main, '최상위 화면 1002:2',
    ['세로 HUG → FIXED(뷰포트 높이)', 'overflowDirection = VERTICAL (최상위 프레임의 프로토타입 스크롤)', 'Header·Aside 를 "스크롤 시 고정" 자식으로 지정 (numberOfFixedChildren)'],
    'Header(' + (headerNode ? safeGet(headerNode, 'layoutPositioning') : '?') + ') · Aside(' + (asideNode ? safeGet(asideNode, 'layoutPositioning') : '?') +
      ') 는 지금 고정 자식이 아니다(numberOfFixedChildren = ' + safeGet(main, 'numberOfFixedChildren') + '). 지정하지 않으면 같이 스크롤된다',
    ['고정 자식은 자식 순서 규칙이 있어 Header/Aside 순서를 옮겨야 할 수 있다', '화면 전체가 스크롤 단위라 개발 구조(사이드바 고정 + 본문 스크롤)와 1:1 이 아니다']),
  cand(content, '본문 1002:3 Main',
    ['세로 HUG → FIXED(뷰포트 높이)', 'clipsContent = true', 'overflowDirection = VERTICAL'],
    'Header·Aside 는 이 프레임 밖(1002:2 의 ABSOLUTE 자식)이라 그대로 고정된다. 본문만 스크롤된다',
    ['Header 가 본문 위에 겹쳐 있으므로 스크롤할 때 내용이 Header 아래로 지나간다 (웹의 고정 헤더와 같은 동작)',
     '1002:4 Container 가 FIXED ' + (container ? r2(container.height) : '?') + ' 라 내용이 늘어도 스크롤 길이가 늘지 않는다 → 1002:4 를 HUG 로 바꿔야 한다']),
  cand(container, '콘텐츠 1002:4 Container',
    ['이미 FIXED ' + (container ? r2(container.height) : '?'), 'clipsContent = true', 'overflowDirection = VERTICAL'],
    'Header·Aside 는 밖이라 고정. 1002:3 의 위아래 padding 은 스크롤 영역 밖에 남는다',
    ['지금도 ' + (containerOverflow ? containerOverflow.overflowPx : '?') + 'px 넘치는 상태라 clip 을 켜는 순간 보이는 모습이 달라진다',
     '스크롤 영역이 padding 안쪽으로 줄어 화면 아래 ' + (content && container ? r2(content.height - container.y - container.height) : '?') + 'px 가 비어 보인다']),
  cand(section, '목록 1002:139 Section',
    ['세로 HUG → FIXED', 'clipsContent = true', 'overflowDirection = VERTICAL'],
    'KPI · Toolbar 까지 고정된다. 목록만 스크롤된다',
    ['목록 뷰포트가 ' + (container && section ? r2(container.height - section.y) : '?') + 'px 정도로 작아진다 (2줄+조각 목표와 맞추기 어렵다)',
     '스크롤 안에 스크롤이 생기는 구조라 페이지 스크롤과 충돌하기 쉽다'])
];

/* ---------- paginationUXAnalysis ---------- */
const cp = footerAnalysis.countParsed;
const paginationUXAnalysis = {
  facts: {
    countText: footerAnalysis.countText ? footerAnalysis.countText.text : null,
    sortText: footerAnalysis.sortText ? footerAnalysis.sortText.text : null,
    parsed: cp, cardsInGrid: gridAnalysis.cardCount,
    countTextMatchesGrid: footerAnalysis.countMatchesGrid,
    pageSizeImpliedByText: cp && cp.rangeTo ? cp.rangeTo - cp.rangeFrom + 1 : null,
    paginationLabels: (footerAnalysis.paginationChildren || []).map(c => c.texts && c.texts.length ? c.texts.join('') : '(아이콘)'),
    prevOpacity: footerAnalysis.paginationChildren && footerAnalysis.paginationChildren[0] ? footerAnalysis.paginationChildren[0].opacity : null
  },
  inconsistencyNow: cp && cp.rangeTo ? ('문구는 한 페이지 ' + (cp.rangeTo - cp.rangeFrom + 1) + '개를 말하지만 grid 에는 ' + gridAnalysis.cardCount + '장이 있다') : null,
  options: [
    { option: '1. continuous scroll + pagination 유지',
      uxMeaning: '스크롤로 계속 보이는데 페이지 번호가 같이 있어 "지금 몇 페이지인가" 가 두 가지로 해석된다',
      pageButtonsRelation: '1 / 2 버튼이 가리키는 범위가 스크롤 위치와 연결되지 않는다',
      footerTextRelation: '"중 1-8 표시" 는 스크롤할수록 틀린 문구가 된다 — 스크롤 위치에 따라 바꿔야 한다',
      devDifficulty: '스크롤 위치 ↔ 페이지 번호 동기화, 페이지 이동 시 스크롤 이동까지 필요해 가장 복잡하다',
      fitForService: '지원 기록은 수십 건 규모라 페이지 개념의 이득이 작다' },
    { option: '2. continuous scroll + pagination 제거',
      uxMeaning: '목록이 끝까지 이어진다는 한 가지 의미만 남는다. 3번째 줄 조각이 "더 있다" 를 전달한다',
      pageButtonsRelation: '버튼이 없어 충돌이 없다',
      footerTextRelation: '"총 N개" 와 "정렬: …" 만 남기면 스크롤 위치와 상관없이 항상 참인 문구가 된다',
      devDifficulty: '목록 렌더링만 하면 된다 (많아지면 지연 로딩)',
      fitForService: '필터·검색·정렬로 좁혀 보는 관리형 목록에 맞다' }
  ],
  decisionOwner: '사람 — 이 audit 은 문구와 구성의 사실만 모은다. 카피는 바꾸지 않았다'
};

/* ---------- layoutOptions ---------- */
const listGap = list ? r2(safeGet(list, 'itemSpacing')) : null;
const footerYIfInFlow = grid && listGap !== null ? r2(grid.height + listGap) : null;
const layoutOptions = [
  { option: 'A. footer ABSOLUTE 해제 → 1002:139 안의 1009:2 흐름 자식으로',
    facts: '1009:2 는 이미 VERTICAL · 세로 HUG · gap ' + listGap + ' 이고 자식이 grid 와 footer 둘뿐이다',
    feasibility: '높다 — footer 의 layoutPositioning 한 값만 바꾸면 grid 다음 자리로 들어간다',
    autoLayoutStability: '높다 — footer 높이가 1009:2 → 1002:139 → 1002:4 로 정상 전파된다',
    resize: '가로 FIXED 976 인 footer 를 FILL 로 바꾸면 폭 변화에도 따라간다',
    moreCards: 'grid 가 길어지면 footer 가 자연히 아래로 밀린다',
    pagination32: 'footer 가 56 이 되면 1009:2 가 4px 커질 뿐, 위로 자라지 않는다',
    phaseEDebt: footerYIfInFlow !== null && gridAnalysis.contentBottom !== null
      ? ('트랙을 그대로 두면 footer 위 ' + footerYIfInFlow + ' < 카드 바닥 ' + gridAnalysis.contentBottom + ' → ' + r2(gridAnalysis.contentBottom - footerYIfInFlow) +
         'px 겹침이 남는다. 행 트랙을 카드 높이로 맞추면 0 이 된다')
      : null,
    handoff: '가장 좋다 — "목록 아래에 footer" 가 코드의 flex column 과 같다' },
  { option: 'B. GRID + Footer 를 새 세로 컨테이너로 감싸고 gap 명시',
    facts: '1009:2 가 이미 정확히 그 컨테이너다 (VERTICAL, gap ' + listGap + ', 자식 grid+footer)',
    feasibility: '가능하지만 노드를 하나 더 만드는 것 외에 A 와 결과가 같다',
    autoLayoutStability: 'A 와 같다', resize: 'A 와 같다', moreCards: 'A 와 같다', pagination32: 'A 와 같다',
    phaseEDebt: 'A 와 같다 (트랙 수정 필요)',
    handoff: '감싸는 층이 늘어 오히려 불리하다 — 기존 1009:2 를 쓰는 A 를 권한다' },
  { option: 'C. ABSOLUTE 유지, y · constraints 만 조정',
    facts: '현재 constraints.vertical = ' + (footerAnalysis.constraints ? footerAnalysis.constraints.vertical : '?') + ', 부모 높이 = grid 높이',
    feasibility: '가능 — 예: constraints MIN + y 를 카드 바닥 아래로',
    autoLayoutStability: '낮다 — footer 가 부모 HUG 계산에 안 들어가 1009:2 · 1002:139 높이가 footer 를 모른다',
    resize: 'grid 높이가 바뀔 때마다 y 를 다시 맞춰야 한다',
    moreCards: '카드가 늘면 footer 가 부모 아래로 삐져나가고 스크롤 길이에서도 빠질 수 있다',
    pagination32: 'MAX 면 위로, MIN 이면 아래로 자라며 부모 밖으로 나간다',
    phaseEDebt: '값을 맞추는 순간만 해결된다',
    handoff: '나쁘다 — 코드로 옮기면 absolute 배치가 되어 유지보수 부담이 크다' }
];

/* ---------- recommendedStructure ---------- */
const recommendedStructure = {
  status: '제안 — 결정은 사람이 한다',
  grid: { rowTrack: 'FIXED ' + gridAnalysis.cardHeight + ' (카드 높이와 같게)', rowGapOptions: GAP_CANDIDATES,
    reason: 'HUG grid 가 트랙을 따르므로 트랙을 카드 높이에 맞춰야 넘침이 0 이 된다',
    unverified: 'gridRowSizes 쓰기 형태는 probe 로 확인한 뒤 적용한다' },
  footer: { option: 'A', change: 'layoutPositioning ABSOLUTE → AUTO (1009:2 흐름 안)', thenPagination: '32px 교체는 A 이후에 한다 — 위로 자라는 문제가 사라진다' },
  contentContainer: { id: IDS.contentContainer, change: '세로 FIXED → HUG', reason: containerOverflow ? containerOverflow.note : null },
  scroll: { candidate: IDS.mainContent, reason: 'Header · Aside 가 밖에 있어 고정 영역 처리가 따로 필요 없다',
    needs: ['세로 FIXED(뷰포트 높이)', 'clipsContent = true', 'overflowDirection = VERTICAL'] },
  viewport: { note: '표에서 rowGap · slice 를 고르면 뷰포트 높이가 정해진다. 1024 를 유지하면 목표 노출량이 나오지 않는다' },
  pagination: { note: '제거 방향이 continuous scroll 과 의미가 맞다. 문구는 "총 N개 · 정렬" 만 남기는 안을 검토' }
};

/* ---------- migrationRisk ---------- */
const migrationRisk = [
  { risk: 'gridRowSizes 쓰기 형태 미확인', detail: 'setter 존재만 확인했다(' + JSON.stringify(gridAnalysis.setterIntrospection ? gridAnalysis.setterIntrospection.gridRowSizes : null) + '). 복제본 probe 필요' },
  { risk: '1002:4 FIXED 896 넘침', detail: containerOverflow ? containerOverflow.note : null },
  { risk: 'footer 를 흐름에 넣으면 목록 section 높이가 늘어난다', detail: '1002:139 · 1002:4 높이가 footer 만큼 커진다 — 1002:4 가 FIXED 면 넘침이 더 커진다' },
  { risk: '뷰포트 높이 결정', detail: '1024 에서는 목표 노출량이 안 나온다 — 기준 화면 크기를 바꾸는 결정이 필요하다' },
  { risk: '문구 불일치', detail: paginationUXAnalysis.inconsistencyNow },
  { risk: '카드 회사명 중복', detail: 'grid 카드 중 같은 회사명: ' + JSON.stringify(duplicateCompanyNames) },
  { risk: 'Header 가 본문 위에 ABSOLUTE 로 겹침', detail: '스크롤을 켜면 내용이 Header 아래로 지나간다 — 배경이 불투명한지 확인 필요' },
  { risk: 'Phase E/F 에서 숨긴 old 노드', detail: '숨긴 KPI old 4개, Toolbar old 요소, 기록 추가 old 버튼이 Auto Layout 부모 안에 남아 있다 — 부모를 FIXED/HUG 로 바꿀 때 영향 없는지 확인' }
];

/* ---------- gate ---------- */
const chainOk = !!list && !!section && !!container && !!content && !!main &&
  list.parent && list.parent.id === section.id && isInside(section, container) && isInside(container, content) && isInside(content, main);
const pagChildrenOk = (footerAnalysis.paginationChildren || []).length === 4 &&
  footerAnalysis.paginationChildren.every(c => !c.missing && c.parentId === IDS.pagination);
const gate = {
  mainFrameFound: !!main,
  gridFound: !!grid,
  footerFound: !!footer,
  paginationFound: !!pag,
  listContainerFound: !!list,
  layoutHierarchyResolved: chainOk && Object.keys(IDS).every(k => !!nodes[k]),
  gridTrackModelResolved: gridAnalysis.heightModelReproduces === true && Array.isArray(gridAnalysis.rowTracks),
  cardHeightResolved: typeof gridAnalysis.cardHeight === 'number',
  footerAbsoluteBehaviorResolved: footerAnalysis.footerExcludedFromParentHeight === true && !!footerAnalysis.constraints,
  footerParentResolved: !!footer && !!footer.parent && footer.parent.id === IDS.listContainer,
  scrollCandidateResolved: scrollCandidates.filter(c => c.found).length >= 2,
  viewportHeightResolved: viewportMath.resolved === true,
  paginationStructureResolved: footerAnalysis.paginationIsDirectChild === true && pagChildrenOk,
  footerTextResolved: !!footerAnalysis.countText,
  noMutation: mutationCount === 0,
  readOnly: true
};
const gatePassed = Object.keys(gate).every(k => gate[k]);
const gateFailures = Object.keys(gate).filter(k => !gate[k]);

/* 사용자 메시지 값과 대조 */
const statedVsRead = {
  gridSize: { stated: USER_STATED.gridSize, read: records.grid ? records.grid.size : null },
  rowTracks: { stated: USER_STATED.rowTracks, read: gridAnalysis.rowTracks },
  rowGap: { stated: USER_STATED.rowGap, read: gridAnalysis.rowGap },
  cardHeight: { stated: 219, read: gridAnalysis.cardHeight },
  footerSize: { stated: USER_STATED.footerSize, read: records.footer ? records.footer.size : null },
  footerY: { stated: USER_STATED.footerY, read: records.footer ? records.footer.y : null },
  listContainerSize: { stated: USER_STATED.listContainerSize, read: records.listContainer ? records.listContainer.size : null },
  paginationSize: { stated: USER_STATED.paginationSize, read: records.pagination ? records.pagination.size : null },
  contentBottom: { stated: USER_STATED.contentBottom, read: gridAnalysis.contentBottom },
  overlap: { stated: USER_STATED.overlap, read: footerAnalysis.overlapWithGridContent }
};
for (const k of Object.keys(statedVsRead)) {
  const s = statedVsRead[k];
  s.same = JSON.stringify(s.stated) === JSON.stringify(s.read) || near(s.stated, s.read, 0.5);
  if (!s.same) notes.push('사용자 메시지 값과 파일 값이 다르다 — ' + k + ': ' + JSON.stringify(s.stated) + ' vs ' + JSON.stringify(s.read));
}

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'AUDIT', readOnly: true, mutationCount,
  gate, gatePassed, gateFailures,
  layoutTree, verticalFlow, layoutHierarchy, records,
  gridAnalysis, footerAnalysis, containerOverflow,
  scrollCandidates, viewportMath, paginationUXAnalysis,
  layoutOptions, recommendedStructure, migrationRisk,
  statedVsRead,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  nextStep: gatePassed ? 'gate 통과. 결과를 보고 F2 최종 구조(뷰포트 높이 · rowGap · pagination 유지 여부)를 결정합니다.'
                       : 'gate 실패 항목부터 확인해주세요: ' + gateFailures.join(', ')
});
