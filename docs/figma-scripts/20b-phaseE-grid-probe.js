/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 20b
 * Phase E · GRID 동작 실험 (probe)
 *
 * 무엇을 하는가
 *   원본 그리드 1002:140 을 clone 해서 화면 밖 먼 곳에 임시 복제본을 만들고,
 *   그 복제본에서만 숨김 / 이동 / 새 인스턴스 배치를 실험한다.
 *   실험이 끝나면 임시 노드를 전부 지운다.
 *
 * 원본에 대한 약속
 *   - 원본 그리드 1002:140 과 그 안의 카드 12장에는 쓰기 호출이 한 줄도 없다.
 *   - 실행 전후로 원본의 checksum 을 계산해 비교한다 (sourceGridUntouched).
 *   - clone 은 Figma 규칙상 같은 부모에 먼저 들어가므로, 만들자마자 페이지로 옮긴다.
 *     부모의 자식 수도 전후로 비교한다.
 *   - 임시 노드 삭제는 "이 스크립트가 직접 만든 노드" 에만 적용된다.
 *     ownedByProbe() 를 통과하지 못하는 노드에는 어떤 쓰기도 하지 않는다.
 *
 * 실험 결과는 figma.root 의 pluginData 키 'joob.phaseE.probe' 에도 저장한다.
 *   - 노드를 만들지 않는 보이지 않는 메모다. 20a v3 audit 이 이 값을 읽어서
 *     사람이 숫자를 손으로 옮기지 않아도 되게 한다.
 *   - 저장 사실은 pluginDataWritten / pluginDataKey 로 결과에 표시한다.
 * ========================================================================== */

const SCRIPT_VERSION = '20b-v4-phaseE-grid-probe';

const GRID_ID = '1002:140';
const APPCARD_SET_ID = '1037:2163';
const PROBE_KEY = 'joob.phaseE.probe';
const PROBE_TAG = 'JOOB PROBE TEMP — 삭제해도 됨';
const FAR = 100000;

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

/* ---------- 원본 checksum ---------- */
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
    children: kids.map((c, i) => ({
      i, id: c.id, name: c.name, type: c.type, visible: c.visible,
      x: r2(c.x), y: r2(c.y), width: r2(c.width), height: r2(c.height),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'),
      rowSpan: safeGet(c, 'gridRowSpan'), colSpan: safeGet(c, 'gridColumnSpan')
    }))
  };
}
function hashOf(obj) {
  const s = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(16) + '-' + s.length;
}

/* ---------- 대상 확인 ---------- */
const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: 'PROBE', aborted: true,
  reason: GRID_ID + ' 를 찾을 수 없다', sourceGridUntouched: true });
if (!Array.isArray(grid.children) || !grid.children.length)
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'PROBE', aborted: true,
    reason: GRID_ID + ' 에 자식이 없다', sourceGridUntouched: true });

const beforeSnap = snapshotOf(grid);
const beforeHash = hashOf(beforeSnap);

const set = await figma.getNodeByIdAsync(APPCARD_SET_ID);
const setOk = !!set && set.type === 'COMPONENT_SET' && set.children.length > 0;
if (!setOk) notes.push(APPCARD_SET_ID + ' 를 컴포넌트 세트로 읽지 못했다 — 새 인스턴스 실험은 건너뛴다');

/* ---------- 임시 노드 소유권 ----------
 * probeRoot 안에 있거나 probeRoot 자신인 노드에만 쓰기를 허용한다.
 * archiveFrame 도 이 스크립트가 만든 것이므로 소유 목록에 넣는다. */
let probe = null;          // 실험 A·B 용
let probeC = null;         // 실험 C 용 (별도 복제본)
let probeD = null;         // 실험 D 용 (별도 복제본)
let probeF = null;         // 실험 F·E 용 — 12장 전체 교체 (별도 복제본)
let archive = null;
let archiveF = null;       // 12장 시뮬레이션용 보관 프레임
let newInstance = null;
const createdTopLevel = [];
const ownedRoots = [];     // 이 스크립트가 만든 최상위 임시 노드들

function ownedByProbe(n) {
  let p = n;
  while (p) {
    for (const rootNode of ownedRoots) if (rootNode && p.id === rootNode.id) return true;
    p = p.parent;
  }
  return false;
}
/* 실험마다 원본에서 새로 복제한다. 앞 실험의 부작용이 다음 실험에 섞이지 않게 하기 위해서다. */
function freshClone(label, slot) {
  const c = grid.clone();
  figma.currentPage.appendChild(c);
  c.name = PROBE_TAG + ' / ' + label;
  c.x = FAR; c.y = FAR + slot * 3000;
  ownedRoots.push(c); createdTopLevel.push(c.id);
  return c;
}
function assertOwned(n, what) {
  if (!n) throw new Error(what + ' — 노드가 없다');
  if (n.id === GRID_ID) throw new Error(what + ' — 원본 그리드에는 쓰지 않는다');
  if (!ownedByProbe(n)) throw new Error(what + ' — probe 소유가 아닌 노드 ' + n.id + ' 에는 쓰지 않는다');
  return n;
}
function setVisible(n, v, what) { assertOwned(n, what); n.visible = v; }
function moveInto(parentNode, child, what) {
  assertOwned(parentNode, what + ' (부모)');
  assertOwned(child, what + ' (자식)');
  parentNode.appendChild(child);
}

/* ---------- 측정 ----------
 * gridRowSizes 는 숫자 배열이 아닐 수 있다 (예: { type: 'FIXED', value: 205 }).
 * 트랙 크기를 읽는 곳을 이 함수 하나로 통일한다. before 와 after 를 다른 방식으로
 * 읽으면 "앞은 null, 뒤는 205" 같은 비교가 되어 결론이 통째로 틀어진다. */
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
function tracksOf(frame, key) {
  const raw = safeGet(frame, key);
  if (!Array.isArray(raw)) return { raw, values: null, types: null, readable: false };
  const values = raw.map(trackValue);
  return { raw, values, types: raw.map(trackType),
           readable: values.length > 0 && values.every(v => typeof v === 'number') };
}
function uniqSortedY(list) {
  const acc = [];
  for (const v of list) if (!acc.some(x => Math.abs(x - v) < 1)) acc.push(v);
  return acc.sort((a, b) => a - b);
}
function layoutOf(frame) {
  const kids = Array.isArray(frame.children) ? frame.children : [];
  const rowT = tracksOf(frame, 'gridRowSizes');
  const colT = tracksOf(frame, 'gridColumnSizes');
  const cells = kids.map((c, i) => ({
    i, id: c.id, name: c.name, visible: c.visible,
    x: r2(c.x), y: r2(c.y), w: r2(c.width), h: r2(c.height),
    row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'),
    rowSpan: safeGet(c, 'gridRowSpan'), colSpan: safeGet(c, 'gridColumnSpan')
  }));
  return {
    gridWidth: r2(frame.width), gridHeight: r2(frame.height),
    rowCount: safeGet(frame, 'gridRowCount'), columnCount: safeGet(frame, 'gridColumnCount'),
    rowSizes: rowT.values, rowSizesRaw: rowT.raw, rowSizeTypes: rowT.types,
    rowSizesReadable: rowT.readable,
    columnSizes: colT.values, columnSizeTypes: colT.types,
    rowGap: safeGet(frame, 'gridRowGap'), columnGap: safeGet(frame, 'gridColumnGap'),
    childCount: kids.length,
    rowYs: uniqSortedY(cells.filter(c => c.visible !== false).map(c => c.y)),
    cells
  };
}
/* 셀 좌표가 같은가 — 같은 칸을 가리키는지 비교할 때 쓴다 */
function sameCell(a, b) {
  if (!a || !b) return false;
  return near(a.x, b.x) && near(a.y, b.y) && a.row === b.row && a.col === b.col;
}
/* 두 측정에서, 지정한 id 들을 뺀 나머지 자식이 그대로인지 */
function othersUnchanged(a, b, exceptIds) {
  const ex = exceptIds || [];
  const moved = [];
  for (const ca of a.cells) {
    if (ex.indexOf(ca.id) >= 0) continue;
    const cb = b.cells.filter(x => x.id === ca.id)[0];
    if (!cb) { moved.push({ id: ca.id, reason: '사라짐' }); continue; }
    if (!near(ca.x, cb.x) || !near(ca.y, cb.y) ||
        !near(ca.w, cb.w) || !near(ca.h, cb.h) ||
        ca.row !== cb.row || ca.col !== cb.col) {
      moved.push({ id: ca.id,
                   before: ca.x + ',' + ca.y + ' ' + ca.w + '×' + ca.h + ' r' + ca.row + 'c' + ca.col,
                   after: cb.x + ',' + cb.y + ' ' + cb.w + '×' + cb.h + ' r' + cb.row + 'c' + cb.col });
    }
  }
  return { unchanged: moved.length === 0, movedCount: moved.length, moved: moved.slice(0, 6) };
}

const experiments = {};
let probeCreated = false;
let probeRemoved = false;
let aborted = false;
let abortReason = null;

try {
  /* ---------- 복제본 만들기 ----------
   * clone() 은 같은 부모에 형제로 들어간다. 바로 페이지로 옮긴다. */
  const parentBefore = grid.parent ? grid.parent.children.length : null;
  probe = freshClone('gridAB', 0);
  probeCreated = true;
  const parentAfter = grid.parent ? grid.parent.children.length : null;

  archive = figma.createFrame();
  figma.currentPage.appendChild(archive);
  archive.name = PROBE_TAG + ' / archive';
  archive.x = FAR; archive.y = FAR + 9000;
  archive.resize(400, 400);
  ownedRoots.push(archive); createdTopLevel.push(archive.id);

  experiments.setup = {
    probeId: probe.id, archiveId: archive.id,
    probeIsNotSource: probe.id !== grid.id,
    sourceParentChildCountBefore: parentBefore,
    sourceParentChildCountAfter: parentAfter,
    sourceParentChildCountRestored: parentBefore === parentAfter,
    probeLayoutMode: safeGet(probe, 'layoutMode'),
    probeSameLayoutModeAsSource: safeGet(probe, 'layoutMode') === safeGet(grid, 'layoutMode'),
    probeSameRowGap: safeGet(probe, 'gridRowGap') === safeGet(grid, 'gridRowGap'),
    probeSameRowCount: safeGet(probe, 'gridRowCount') === safeGet(grid, 'gridRowCount'),
    probeSameChildCount: probe.children.length === grid.children.length
  };
  if (!experiments.setup.probeIsNotSource) throw new Error('clone 이 원본과 같은 노드다 — 중단');

  /* ---------- A. 기준 상태 ---------- */
  const baseline = layoutOf(probe);
  const anchored = baseline.cells.filter(c => c.row !== null && c.col !== null && c.visible !== false);
  experiments.A_baseline = {
    childCount: baseline.childCount,
    anchoredChildCount: anchored.length,
    allChildrenAnchored: anchored.length === baseline.cells.filter(c => c.visible !== false).length,
    rowCount: baseline.rowCount, columnCount: baseline.columnCount,
    rowSizes: baseline.rowSizes, rowGap: baseline.rowGap,
    gridHeight: baseline.gridHeight,
    cells: baseline.cells
  };

  /* 실험 대상 — 가운데쯤의 보이는 자식 하나 */
  const visibleCells = baseline.cells.filter(c => c.visible !== false);
  if (!visibleCells.length) throw new Error('복제본에 보이는 자식이 없다');
  const targetCell = visibleCells[Math.floor(visibleCells.length / 2)];
  const target = probe.children.filter(c => c.id === targetCell.id)[0];
  experiments.target = { id: targetCell.id, name: targetCell.name,
    row: targetCell.row, col: targetCell.col,
    rowSpan: targetCell.rowSpan, colSpan: targetCell.colSpan,
    x: targetCell.x, y: targetCell.y, w: targetCell.w, h: targetCell.h };

  /* ---------- B. 숨겼을 때 ---------- */
  setVisible(target, false, 'B: 대상 숨기기');
  const afterHide = layoutOf(probe);
  const hiddenCellNow = afterHide.cells.filter(c => c.id === target.id)[0];
  const othersAfterHide = othersUnchanged(baseline, afterHide, [target.id]);
  experiments.B_hide = {
    hiddenChildStillReportsCell: !!hiddenCellNow &&
      hiddenCellNow.row === targetCell.row && hiddenCellNow.col === targetCell.col,
    hiddenChildAnchorAfter: hiddenCellNow ? ('r' + hiddenCellNow.row + 'c' + hiddenCellNow.col) : null,
    othersUnchanged: othersAfterHide.unchanged,
    movedCount: othersAfterHide.movedCount, movedSample: othersAfterHide.moved,
    rowCountBefore: baseline.rowCount, rowCountAfter: afterHide.rowCount,
    rowCountChanged: baseline.rowCount !== afterHide.rowCount,
    gridHeightBefore: baseline.gridHeight, gridHeightAfter: afterHide.gridHeight,
    gridHeightChanged: !near(baseline.gridHeight, afterHide.gridHeight)
  };
  /* 숨긴 칸이 유지된다 = 다른 자식이 그 자리로 흘러들어오지 않는다 */
  experiments.B_hide.hiddenChildKeepsCell = experiments.B_hide.othersUnchanged &&
    !experiments.B_hide.rowCountChanged;
  experiments.B_hide.hiddenChildReflowsOthers = !experiments.B_hide.othersUnchanged;

  setVisible(target, true, 'B: 대상 복구');
  const afterRestore = layoutOf(probe);
  experiments.B_hide.restoreOk = othersUnchanged(baseline, afterRestore, []).unchanged;
  if (!experiments.B_hide.restoreOk) notes.push('숨김 복구 후 복제본 배치가 기준과 달라졌다 — B 결과 해석에 주의');

  const targetIndex = probe.children.indexOf(target);

  /* ---------- C. anchor setter 가 존재하는가 (참고용) ----------
   * Phase E 전략은 anchor 를 직접 쓰지 않는다. 여기서는 '쓸 수 있는가' 를
   * 기록만 한다. 이 결과는 어떤 성공 조건에도 쓰이지 않는다. */
  if (setOk) {
    probeC = freshClone('gridC', 1);
    const baseC = layoutOf(probeC);
    const targetC = probeC.children[targetIndex];
    const targetCellC = baseC.cells[targetIndex];
    const variant = set.children.filter(v => /inprogress|progress/i.test(v.name))[0] || set.children[0];
    const instC = variant.createInstance();
    probeC.appendChild(instC);
    instC.name = PROBE_TAG + ' / newcard-anchortest';
    const afterAppend = layoutOf(probeC);

    const wrote = {};
    const anchorKeys = ['gridRowAnchorIndex', 'gridColumnAnchorIndex', 'gridRowSpan', 'gridColumnSpan'];
    const wantValues = { gridRowAnchorIndex: targetCellC.row, gridColumnAnchorIndex: targetCellC.col,
                         gridRowSpan: targetCellC.rowSpan, gridColumnSpan: targetCellC.colSpan };
    for (const k of anchorKeys) {
      const want = wantValues[k];
      if (want === null || typeof want === 'undefined') { wrote[k] = { want: null, ok: null }; continue; }
      let err = null;
      try { assertOwned(instC, 'C: anchor 쓰기'); instC[k] = want; } catch (e) { err = e.message; }
      const readBack = safeGet(instC, k);
      wrote[k] = { want, error: err, readBack, ok: !err && readBack === want };
    }
    experiments.C_anchorSetterSupport = {
      informationalOnly: true,
      usedInStrategy: false,
      probeUsed: probeC.id,
      anchorWrite: wrote,
      setterSupported: anchorKeys.every(k => wrote[k].ok !== false),
      rowCountBaseline: baseC.rowCount,
      rowCountAfterAppendWhileFull: afterAppend.rowCount,
      insertBeforeRemoveGrowsGrid: afterAppend.rowCount !== baseC.rowCount,
      orderNote: '칸 12개가 다 찬 상태에서 13번째를 먼저 넣으면 그리드가 행을 하나 더 만든다. ' +
                 '그래서 실제 순서는 반드시 "먼저 빼고 나중에 넣기" 여야 한다.',
      note: 'anchor setter 가 없어도 Phase E 는 진행할 수 있다. 빈 칸 자동 배치를 쓰기 때문이다.'
    };
  } else {
    experiments.C_anchorSetterSupport = { skipped: true, reason: '컴포넌트 세트를 읽지 못했다' };
  }

  /* ---------- D. old 를 archive 로 뺀 뒤 새 인스턴스를 넣는다 (카드 1장) ----------
   * anchor 를 직접 쓰지 않는다. 비워진 칸에 Figma 가 알아서 배치하는지,
   * 그리고 그 결과 read-back 이 old 의 칸과 같은지를 본다. */
  if (setOk) {
    probeD = freshClone('gridD', 2);
    const baseD = layoutOf(probeD);
    const targetD = probeD.children[targetIndex];
    const targetCellD = baseD.cells[targetIndex];

    moveInto(archive, targetD, 'D: old 를 archive 로 이동');
    const afterRemoveOnly = layoutOf(probeD);

    const variantD = set.children.filter(v => /inprogress|progress/i.test(v.name))[0] || set.children[0];
    newInstance = variantD.createInstance();
    probeD.appendChild(newInstance);
    newInstance.name = PROBE_TAG + ' / newcard';
    const afterMove = layoutOf(probeD);

    const newCellD = afterMove.cells.filter(c => c.id === newInstance.id)[0];
    const othersD = othersUnchanged(baseD, afterMove, [targetD.id, newInstance.id]);
    const targetStillInGrid = afterMove.cells.some(c => c.id === targetD.id);
    const anchorReadBackMatchesOld = !!newCellD &&
      newCellD.row === targetCellD.row && newCellD.col === targetCellD.col &&
      newCellD.rowSpan === targetCellD.rowSpan && newCellD.colSpan === targetCellD.colSpan;

    experiments.D_archiveMove = {
      probeUsed: probeD.id,
      order: '① old 를 archive 로 이동 ② 새 instance 추가 (anchor 는 쓰지 않음)',
      anchorWrittenDirectly: false,
      targetMovedOut: !targetStillInGrid,
      targetParentAfter: targetD.parent ? targetD.parent.id : null,
      targetParentIsArchive: !!targetD.parent && targetD.parent.id === archive.id,
      childCountAfter: afterMove.childCount,
      rowCountBaseline: baseD.rowCount,
      rowCountAfterRemoveOnly: afterRemoveOnly.rowCount,
      rowCountAfter: afterMove.rowCount,
      rowCountChanged: baseD.rowCount !== afterMove.rowCount,
      oldCell: { row: targetCellD.row, col: targetCellD.col,
                 rowSpan: targetCellD.rowSpan, colSpan: targetCellD.colSpan,
                 x: targetCellD.x, y: targetCellD.y },
      newCell: newCellD ? { row: newCellD.row, col: newCellD.col,
                            rowSpan: newCellD.rowSpan, colSpan: newCellD.colSpan,
                            x: newCellD.x, y: newCellD.y, h: newCellD.h } : null,
      newChildAutoPlacedOnFreedCell: !!newCellD && sameCell(newCellD, targetCellD),
      anchorReadBackMatchesOld,
      othersUnchanged: othersD.unchanged, movedCount: othersD.movedCount, movedSample: othersD.moved,
      gridHeightAfter: afterMove.gridHeight, rowSizesAfter: afterMove.rowSizes,
      archiveRecordPerCard: {
        srcIdInProbe: targetD.id, srcIdInRealFile: targetCell.id,
        originalIndex: targetCellD.i,
        originalRow: targetCellD.row, originalColumn: targetCellD.col,
        originalRowSpan: targetCellD.rowSpan, originalColumnSpan: targetCellD.colSpan,
        originalX: targetCellD.x, originalY: targetCellD.y,
        originalWidth: targetCellD.w, originalHeight: targetCellD.h
      }
    };
    experiments.D_archiveMove.autoPlacementPreservesOriginalCell =
      experiments.D_archiveMove.newChildAutoPlacedOnFreedCell &&
      anchorReadBackMatchesOld &&
      experiments.D_archiveMove.othersUnchanged &&
      !experiments.D_archiveMove.rowCountChanged;
    experiments.D_archiveMove.archiveMoveReleasesCell =
      experiments.D_archiveMove.targetMovedOut &&
      experiments.D_archiveMove.autoPlacementPreservesOriginalCell;
  } else {
    experiments.D_archiveMove = { skipped: true, reason: '컴포넌트 세트를 읽지 못했다' };
  }

  /* ---------- F. 12장 전체 교체 시뮬레이션 ----------
   * 카드 1장이 되는 것과 12장이 연달아 되는 것은 다른 문제다.
   * 실제 Phase E 순서 그대로 12번 반복해서, 매 단계마다
   * 아직 안 바꾼 카드와 이미 바꾼 카드가 모두 제자리에 있는지 확인한다. */
  if (setOk) {
    probeF = freshClone('gridF12', 3);
    archiveF = figma.createFrame();
    figma.currentPage.appendChild(archiveF);
    archiveF.name = PROBE_TAG + ' / archive12';
    archiveF.x = FAR; archiveF.y = FAR + 12000;
    archiveF.resize(400, 400);
    ownedRoots.push(archiveF); createdTopLevel.push(archiveF.id);

    const baseF = layoutOf(probeF);
    const variantF = set.children.filter(v => /inprogress|progress/i.test(v.name))[0] || set.children[0];
    /* 어느 칸에 무엇이 있어야 하는가 — 단계마다 이 기대표와 실제를 대조한다 */
    const expected = {};
    for (const c of baseF.cells) expected[c.id] = { x: c.x, y: c.y, row: c.row, col: c.col };

    const steps = [];
    /* 절대배치 자식은 그리드 흐름 밖이라 교체 대상이 아니다 — 세어서 빼 둔다 */
    const absoluteKids = probeF.children.filter(c => safeGet(c, 'layoutPositioning') === 'ABSOLUTE')
      .map(c => ({ id: c.id, name: c.name }));
    const originalIds = probeF.children.filter(c => safeGet(c, 'layoutPositioning') !== 'ABSOLUTE')
      .map(c => c.id);
    let stepsCompleted = 0;
    let allPlacedOk = true;

    for (let k = 0; k < originalIds.length; k++) {
      const oldNode = probeF.children.filter(c => c.id === originalIds[k])[0];
      if (!oldNode) { steps.push({ step: k, error: '교체 대상을 찾지 못했다' }); allPlacedOk = false; continue; }
      const before = layoutOf(probeF);
      const oldCell = before.cells.filter(c => c.id === oldNode.id)[0];

      moveInto(archiveF, oldNode, 'F: old 를 archive12 로 이동 (step ' + k + ')');
      const inst = variantF.createInstance();
      probeF.appendChild(inst);
      inst.name = PROBE_TAG + ' / new' + k;
      const after = layoutOf(probeF);
      const newCell = after.cells.filter(c => c.id === inst.id)[0];

      /* 기대표 갱신: old 가 있던 칸을 새 인스턴스가 물려받는다 */
      delete expected[oldNode.id];
      expected[inst.id] = { x: oldCell.x, y: oldCell.y, row: oldCell.row, col: oldCell.col };

      const mismatches = [];
      for (const c of after.cells) {
        const e = expected[c.id];
        if (!e) { mismatches.push({ id: c.id, reason: '기대표에 없는 자식' }); continue; }
        if (!near(c.x, e.x) || !near(c.y, e.y) || c.row !== e.row || c.col !== e.col) {
          mismatches.push({ id: c.id, expected: e.x + ',' + e.y + ' r' + e.row + 'c' + e.col,
                            actual: c.x + ',' + c.y + ' r' + c.row + 'c' + c.col });
        }
      }
      const placedOk = !!newCell && sameCell(newCell, oldCell) &&
                       newCell.rowSpan === oldCell.rowSpan && newCell.colSpan === oldCell.colSpan;
      const otherMoved = mismatches.filter(m => m.id !== inst.id);

      steps.push({
        step: k, oldId: oldNode.id, newId: inst.id,
        oldCell: 'r' + oldCell.row + 'c' + oldCell.col,
        newCell: newCell ? ('r' + newCell.row + 'c' + newCell.col) : null,
        oldXY: oldCell.x + ',' + oldCell.y,
        newXY: newCell ? (newCell.x + ',' + newCell.y) : null,
        oldSize: oldCell.w + '×' + oldCell.h,
        newSize: newCell ? (newCell.w + '×' + newCell.h) : null,
        rowCountBefore: before.rowCount, rowCountAfter: after.rowCount,
        childCountAfter: after.childCount,
        sameCellAsOld: placedOk,
        otherChildrenMoved: otherMoved.length,
        otherChildrenMovedSample: otherMoved.slice(0, 3)
      });
      if (!placedOk || otherMoved.length) allPlacedOk = false;
      stepsCompleted++;
    }

    const finalF = layoutOf(probeF);
    const cellsPreserved = finalF.cells.every(c => {
      const e = expected[c.id];
      return !!e && near(c.x, e.x) && near(c.y, e.y) && c.row === e.row && c.col === e.col;
    });

    experiments.F_full12Replacement = {
      probeUsed: probeF.id, archiveUsed: archiveF.id,
      anchorWrittenDirectly: false,
      order: '카드마다 ① old cell 기록 ② old 를 archive 로 이동 ③ 새 instance 추가 ④ read-back 확인',
      variantUsed: variantF.name,
      variantNote: '배치 실험이므로 12장 모두 같은 variant 를 썼다. 실제 교체에서는 카드별 판정 결과를 쓴다',
      absoluteChildrenSkipped: absoluteKids,
      plannedSteps: originalIds.length,
      stepsCompleted,
      all12ReplacementStepsCompleted: stepsCompleted === originalIds.length && originalIds.length === 12,
      all12AutoPlacedCorrectly: allPlacedOk && stepsCompleted === originalIds.length,
      eachStep: steps,
      finalChildCount: finalF.childCount,
      finalRowCount: finalF.rowCount,
      finalChildCountIs12: finalF.childCount === 12,
      finalRowCountIs3: finalF.rowCount === 3,
      noUnexpectedFourthRow: finalF.rowCount === baseF.rowCount,
      allOriginalCellsPreserved: cellsPreserved,
      archivedCount: Array.isArray(archiveF.children) ? archiveF.children.length : null,
      archivedAll12: Array.isArray(archiveF.children) && archiveF.children.length === originalIds.length,
      baselineRowCount: baseF.rowCount,
      baselineRowYs: baseF.rowYs,
      finalRowYs: finalF.rowYs,
      _baseF: baseF, _finalF: finalF
    };
  } else {
    experiments.F_full12Replacement = { skipped: true, reason: '컴포넌트 세트를 읽지 못했다' };
  }

  /* ---------- E. 높이 · 행 트랙 모델 ----------
   * 12장을 전부 새 카드로 바꾼 뒤의 상태에서 잰다. 그게 Phase E 의 최종 상태다.
   * 트랙 크기는 tracksOf() 하나로만 읽는다. */
  const Fx = experiments.F_full12Replacement;
  if (Fx && !Fx.skipped && Fx.stepsCompleted > 0) {
    const baseF = Fx._baseF, finalF = Fx._finalF;
    const trackBefore = Array.isArray(baseF.rowSizes) ? baseF.rowSizes[0] : null;
    const trackAfter = Array.isArray(finalF.rowSizes) ? finalF.rowSizes[0] : null;
    const newCardHeight = finalF.cells.length ? finalF.cells[0].h : null;
    const tracksSame = (Array.isArray(baseF.rowSizes) && Array.isArray(finalF.rowSizes) &&
      baseF.rowSizes.length === finalF.rowSizes.length &&
      baseF.rowSizes.every((v, n) => near(v, finalF.rowSizes[n])));

    let hugResult = null;
    try {
      assertOwned(probeF, 'E: HUG 실험');
      probeF.layoutSizingVertical = 'HUG';
      const afterHug = layoutOf(probeF);
      hugResult = {
        applied: safeGet(probeF, 'layoutSizingVertical') === 'HUG',
        gridHeight: afterHug.gridHeight, rowSizes: afterHug.rowSizes,
        rowSizeTypes: afterHug.rowSizeTypes, rowYs: afterHug.rowYs,
        heightChanged: !near(finalF.gridHeight, afterHug.gridHeight),
        rowTracksChanged: !(Array.isArray(afterHug.rowSizes) && Array.isArray(finalF.rowSizes) &&
          afterHug.rowSizes.length === finalF.rowSizes.length &&
          afterHug.rowSizes.every((v, n) => near(v, finalF.rowSizes[n])))
      };
      hugResult.fixedTracksStayFixedUnderHug = hugResult.applied && hugResult.rowTracksChanged === false;
    } catch (e) { hugResult = { applied: false, error: e.message }; }

    experiments.E_heightModel = {
      probeUsed: probeF.id,
      measuredAfter: '12장 전체 교체 후',
      oldCardHeight: baseF.cells.length ? baseF.cells[0].h : null,
      newCardHeight,
      trackBefore, trackAfter,
      rowSizesBefore: baseF.rowSizes, rowSizesAfter: finalF.rowSizes,
      rowSizeTypesBefore: baseF.rowSizeTypes, rowSizeTypesAfter: finalF.rowSizeTypes,
      rowSizesReadableBefore: baseF.rowSizesReadable, rowSizesReadableAfter: finalF.rowSizesReadable,
      overflowBeyondTrack: (typeof newCardHeight === 'number' && typeof trackAfter === 'number')
        ? r2(newCardHeight - trackAfter) : null,
      oldOverflowBeyondTrack: (baseF.cells.length && typeof trackBefore === 'number')
        ? r2(baseF.cells[0].h - trackBefore) : null,
      rowGap: finalF.rowGap,
      gridHeightBefore: baseF.gridHeight, gridHeightAfter: finalF.gridHeight,
      gridHeightChanged: !near(baseF.gridHeight, finalF.gridHeight),
      rowYsBefore: baseF.rowYs, rowYsAfter: finalF.rowYs,
      rowYsChanged: !(baseF.rowYs.length === finalF.rowYs.length &&
        baseF.rowYs.every((v, n) => near(v, finalF.rowYs[n]))),
      rowTracksFixed: tracksSame === true,
      rowTracksGrewForTallerChild: tracksSame === false,
      hugTest: hugResult,
      note: '행 트랙이 그대로면 카드가 커져도 그리드 높이는 늘지 않고 카드가 트랙 밖으로 넘친다'
    };
    experiments.E_heightModel.heightModelObserved =
      baseF.rowSizesReadable === true && finalF.rowSizesReadable === true &&
      typeof newCardHeight === 'number' &&
      typeof baseF.gridHeight === 'number' && typeof finalF.gridHeight === 'number' &&
      finalF.rowYs.length > 0;
    experiments.E_heightModel.heightScenarioResolved =
      experiments.E_heightModel.heightModelObserved === true && typeof tracksSame === 'boolean';
    delete Fx._baseF; delete Fx._finalF;
  } else {
    experiments.E_heightModel = { skipped: true, reason: '12장 교체 시뮬레이션을 하지 못했다' };
  }
} catch (e) {
  aborted = true;
  abortReason = e.message;
  errors.push('실험 중단: ' + e.message);
}

/* ---------- 임시 노드 정리 ---------- */
const cleanup = { removed: [], failed: [] };
for (const n of [archive, archiveF, probe, probeC, probeD, probeF]) {
  if (!n) continue;
  try {
    if (n.id === GRID_ID) throw new Error('원본을 지우려 했다 — 중단');
    if (!n.removed) { n.remove(); }
    cleanup.removed.push(n.id);
  } catch (e) { cleanup.failed.push({ id: n.id, error: e.message }); }
}
probeRemoved = cleanup.failed.length === 0 && probeCreated;
if (cleanup.failed.length) {
  errors.push('임시 노드를 지우지 못했다: ' + JSON.stringify(cleanup.failed) +
              " — 캔버스에서 이름이 '" + PROBE_TAG + "' 인 프레임을 직접 지워주세요");
}

/* ---------- 원본 checksum 비교 ---------- */
const afterSnap = snapshotOf(grid);
const afterHash = hashOf(afterSnap);
const sourceGridUntouched = beforeHash === afterHash;
const checksum = {
  before: beforeHash, after: afterHash, equal: sourceGridUntouched,
  childCountBefore: beforeSnap.childCount, childCountAfter: afterSnap.childCount,
  sizeBefore: beforeSnap.width + '×' + beforeSnap.height,
  sizeAfter: afterSnap.width + '×' + afterSnap.height,
  parentChildCountBefore: beforeSnap.parentChildCount,
  parentChildCountAfter: afterSnap.parentChildCount,
  indexInParentBefore: beforeSnap.indexInParent,
  indexInParentAfter: afterSnap.indexInParent
};
if (!sourceGridUntouched) {
  errors.push('원본 그리드 checksum 이 달라졌다 — 결과를 신뢰하지 말 것');
  const diffs = [];
  for (const cb of beforeSnap.children) {
    const ca = afterSnap.children.filter(x => x.id === cb.id)[0];
    if (!ca) { diffs.push({ id: cb.id, reason: '사라짐' }); continue; }
    if (!near(cb.x, ca.x) || !near(cb.y, ca.y) || !near(cb.width, ca.width) ||
        !near(cb.height, ca.height) || cb.visible !== ca.visible ||
        cb.row !== ca.row || cb.col !== ca.col) diffs.push({ id: cb.id, before: cb, after: ca });
  }
  checksum.childDiffs = diffs.slice(0, 6);
}

/* ---------- 결론 ---------- */
const B = experiments.B_hide || {};
const C = experiments.C_anchorSetterSupport || {};
const D = experiments.D_archiveMove || {};
const Fr = experiments.F_full12Replacement || {};
const E = experiments.E_heightModel || {};

const hiddenChildKeepsCell = typeof B.hiddenChildKeepsCell === 'boolean' ? B.hiddenChildKeepsCell : null;
const hiddenChildReflowsOthers = typeof B.hiddenChildReflowsOthers === 'boolean'
  ? B.hiddenChildReflowsOthers : null;

/* Phase E 는 anchor 를 직접 쓰지 않는다. 안전 조건은 '자동 배치가 원래 칸을 지키는가' 다. */
const autoPlacementPreservesOriginalCell = (D.skipped || aborted) ? null
  : (typeof D.autoPlacementPreservesOriginalCell === 'boolean'
      ? D.autoPlacementPreservesOriginalCell : null);
const archiveMoveReleasesCell = (D.skipped || aborted) ? null
  : (typeof D.archiveMoveReleasesCell === 'boolean' ? D.archiveMoveReleasesCell : null);
const all12ReplacementStepsCompleted = (Fr.skipped || aborted) ? null
  : (typeof Fr.all12ReplacementStepsCompleted === 'boolean' ? Fr.all12ReplacementStepsCompleted : null);
const all12AutoPlacedCorrectly = (Fr.skipped || aborted) ? null
  : (typeof Fr.all12AutoPlacedCorrectly === 'boolean' ? Fr.all12AutoPlacedCorrectly : null);
const allOriginalCellsPreserved = (Fr.skipped || aborted) ? null
  : (typeof Fr.allOriginalCellsPreserved === 'boolean' ? Fr.allOriginalCellsPreserved : null);
const noUnexpectedFourthRow = (Fr.skipped || aborted) ? null
  : (typeof Fr.noUnexpectedFourthRow === 'boolean' ? Fr.noUnexpectedFourthRow : null);
const heightModelObserved = (E.skipped || aborted) ? null
  : (typeof E.heightModelObserved === 'boolean' ? E.heightModelObserved : null);
const heightScenarioResolved = (E.skipped || aborted) ? null
  : (typeof E.heightScenarioResolved === 'boolean' ? E.heightScenarioResolved : null);
/* anchor setter 지원 여부는 참고값이다. 어떤 성공 조건에도 쓰지 않는다. */
const anchorSetterSupported = (C.skipped || aborted) ? null
  : (typeof C.setterSupported === 'boolean' ? C.setterSupported : null);

/* 12장 전체가 통과해야 전략이 안전하다고 본다 */
const fullRunOk = all12ReplacementStepsCompleted === true &&
  all12AutoPlacedCorrectly === true &&
  allOriginalCellsPreserved === true &&
  noUnexpectedFourthRow === true &&
  Fr.finalChildCountIs12 === true &&
  Fr.finalRowCountIs3 === true &&
  Fr.archivedAll12 === true;

let recommendedPreservationStrategy = null;
let strategyReason = '';
if (aborted) {
  strategyReason = '실험이 중단됐다 (' + abortReason + ') — 전략을 추천하지 않는다';
} else if (archiveMoveReleasesCell === true && fullRunOk) {
  recommendedPreservationStrategy = 'B. old 12장을 archive frame 으로 이동 + 새 instance 는 빈 칸 자동 배치';
  strategyReason = 'old 를 먼저 그리드 밖으로 빼면 그 칸이 비고, 새 instance 를 넣으면 Figma 가 ' +
                   '비워진 그 칸에 배치한다. read-back 한 row/column 이 old 와 같고 나머지 카드도 ' +
                   '움직이지 않았다. 12장을 실제 순서대로 반복해도 마지막에 자식 12개 · 3행이 유지됐다. ' +
                   'anchor 를 직접 쓰지 않으므로 setter 가 없어도 된다.';
} else {
  strategyReason = '12장 전체 시뮬레이션이 통과하지 않았다 — DRY_RUN 전에 다시 봐야 한다' +
    (all12AutoPlacedCorrectly === false ? ' (자동 배치가 원래 칸을 지키지 못한 단계가 있다)' : '') +
    (noUnexpectedFourthRow === false ? ' (행이 하나 더 생겼다)' : '');
}

const replacementStrategySafe = !aborted && sourceGridUntouched === true &&
  archiveMoveReleasesCell === true && autoPlacementPreservesOriginalCell === true &&
  fullRunOk && recommendedPreservationStrategy !== null;

const findings = {
  probeVersion: SCRIPT_VERSION,
  ranAt: Date.now(),
  sourceGridId: GRID_ID,
  sourceHashAtProbeTime: afterHash,
  sourceGridUntouched,
  hiddenChildKeepsCell,
  hiddenChildReflowsOthers,
  archiveMoveReleasesCell,
  autoPlacementPreservesOriginalCell,
  anchorSetterSupported,
  anchorWrittenDirectlyInStrategy: false,
  all12ReplacementStepsCompleted,
  all12AutoPlacedCorrectly,
  allOriginalCellsPreserved,
  noUnexpectedFourthRow,
  finalChildCount: typeof Fr.finalChildCount === 'number' ? Fr.finalChildCount : null,
  finalRowCount: typeof Fr.finalRowCount === 'number' ? Fr.finalRowCount : null,
  recommendedPreservationStrategy,
  replacementStrategySafe,
  replacementOrderPlan: '카드마다 ① old cell 기록 ② old 를 archive 로 이동 ③ 새 instance 추가 ④ read-back 확인',
  rowTracksFixed: typeof E.rowTracksFixed === 'boolean' ? E.rowTracksFixed : null,
  rowTracksGrewForTallerChild: typeof E.rowTracksGrewForTallerChild === 'boolean'
    ? E.rowTracksGrewForTallerChild : null,
  trackBefore: typeof E.trackBefore === 'number' ? E.trackBefore : null,
  trackAfter: typeof E.trackAfter === 'number' ? E.trackAfter : null,
  overflowBeyondTrack: typeof E.overflowBeyondTrack === 'number' ? E.overflowBeyondTrack : null,
  rowSizesBefore: E.rowSizesBefore || null,
  rowSizesAfter: E.rowSizesAfter || null,
  rowYsBefore: E.rowYsBefore || null,
  rowYsAfter: E.rowYsAfter || null,
  gridHeightBefore: typeof E.gridHeightBefore === 'number' ? E.gridHeightBefore : null,
  gridHeightAfter: typeof E.gridHeightAfter === 'number' ? E.gridHeightAfter : null,
  newCardHeightObserved: typeof E.newCardHeight === 'number' ? E.newCardHeight : null,
  heightModelObserved,
  heightScenarioResolved,
  hugRecalculatesRowTracks: E.hugTest ? (E.hugTest.rowTracksChanged === true) : null,
  hugTest: E.hugTest || null
};

/* ---------- 실험 결과를 문서 메모로 저장 ----------
 * 노드를 만들지 않는 보이지 않는 메타데이터다. 20a v3 audit 이 이걸 읽는다.
 * 원본이 건드려졌거나 실험이 중단됐으면 저장하지 않는다 — 틀린 근거를 남기지 않기 위해서다. */
let pluginDataWritten = false;
let pluginDataError = null;
if (!aborted && sourceGridUntouched) {
  try { figma.root.setPluginData(PROBE_KEY, JSON.stringify(findings)); pluginDataWritten = true; }
  catch (e) { pluginDataError = e.message; }
} else {
  pluginDataError = aborted ? '실험이 중단되어 저장하지 않았다' : '원본 checksum 이 달라져 저장하지 않았다';
}

/* anchor setter 성공 여부는 gate 에 넣지 않는다.
 * Phase E 는 anchor 를 직접 쓰지 않고 빈 칸 자동 배치를 쓰기 때문이다. */
const gate = {
  sourceGridUntouched: sourceGridUntouched === true,
  probeCreated: probeCreated === true,
  probeRemoved: probeRemoved === true,
  noErrors: errors.length === 0,
  hiddenOldLayoutBehaviorResolved: typeof hiddenChildKeepsCell === 'boolean',
  archiveMoveReleasesCell: archiveMoveReleasesCell === true,
  autoPlacementPreservesOriginalCell: autoPlacementPreservesOriginalCell === true,
  all12ReplacementStepsCompleted: all12ReplacementStepsCompleted === true,
  all12AutoPlacedCorrectly: all12AutoPlacedCorrectly === true,
  allOriginalCellsPreserved: allOriginalCellsPreserved === true,
  noUnexpectedFourthRow: noUnexpectedFourthRow === true,
  replacementStrategySafe: replacementStrategySafe === true,
  heightModelObserved: heightModelObserved === true,
  heightScenarioResolved: heightScenarioResolved === true,
  findingsStored: pluginDataWritten === true
};
if (Fr && !Fr.skipped) {
  notes.push('12장 교체 시뮬레이션: ' + Fr.stepsCompleted + '/' + Fr.plannedSteps + '단계 완료, ' +
    '최종 자식 ' + Fr.finalChildCount + '개 · ' + Fr.finalRowCount + '행, ' +
    '원래 칸 유지 ' + (Fr.allOriginalCellsPreserved ? '예' : '아니오'));
}
if (E && !E.skipped && typeof E.overflowBeyondTrack === 'number') {
  notes.push('행 트랙 ' + E.trackBefore + ' → ' + E.trackAfter + ', 새 카드 ' + E.newCardHeight +
    ' → 트랙 밖으로 ' + E.overflowBeyondTrack + 'px 넘침. 그리드 높이 ' +
    E.gridHeightBefore + ' → ' + E.gridHeightAfter);
}
if (anchorSetterSupported === false) {
  notes.push('anchor setter 는 이 Figma 버전에 없다 (no setter for property). ' +
    'Phase E 는 anchor 를 직접 쓰지 않으므로 문제가 되지 않는다.');
}
const gatePassed = Object.keys(gate).every(k => gate[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'PROBE',
  readOnly: false,
  writeScope: '이 스크립트가 직접 만든 임시 노드만. 원본 1002:140 에는 쓰기 0 줄.',
  aborted, abortReason,
  gate, gatePassed,

  sourceGridUntouched,
  probeCreated, probeRemoved,
  hiddenChildKeepsCell,
  hiddenChildReflowsOthers,
  archiveMoveReleasesCell,
  autoPlacementPreservesOriginalCell,
  all12ReplacementStepsCompleted,
  all12AutoPlacedCorrectly,
  allOriginalCellsPreserved,
  noUnexpectedFourthRow,
  finalChildCount: typeof Fr.finalChildCount === 'number' ? Fr.finalChildCount : null,
  finalRowCount: typeof Fr.finalRowCount === 'number' ? Fr.finalRowCount : null,
  heightModelObserved,
  heightScenarioResolved,
  anchorSetterSupported,
  anchorSetterNote: 'anchor setter 는 참고값일 뿐이다. Phase E 전략은 anchor 를 직접 쓰지 않는다',
  recommendedPreservationStrategy,
  strategyReason,
  replacementStrategySafe,

  checksum,
  cleanup,
  createdTopLevelIds: createdTopLevel,
  experiments,

  pluginDataWritten, pluginDataKey: PROBE_KEY, pluginDataError,
  pluginDataNote: '노드가 아니라 문서에 붙는 보이지 않는 메모다. 20a v3 audit 이 이 값을 읽어 ' +
                  '사람이 숫자를 손으로 옮기지 않게 한다. 지우고 싶으면 알려주세요.',

  notes,
  errorCount: errors.length,
  errors: errors.slice(0, 8),
  nextStep: 'gatePassed = true 이면 20a audit 을 실행합니다. audit 이 이 결과를 읽어 Phase E gate 를 채웁니다.'
});
