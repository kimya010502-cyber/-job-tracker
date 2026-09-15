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

const SCRIPT_VERSION = '20b-v3-phaseE-grid-probe';

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
let probeD = null;         // 실험 D·E 용 (별도 복제본)
let archive = null;
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

/* ---------- 측정 ---------- */
function layoutOf(frame) {
  const kids = Array.isArray(frame.children) ? frame.children : [];
  return {
    gridWidth: r2(frame.width), gridHeight: r2(frame.height),
    rowCount: safeGet(frame, 'gridRowCount'), columnCount: safeGet(frame, 'gridColumnCount'),
    rowSizes: safeGet(frame, 'gridRowSizes'), columnSizes: safeGet(frame, 'gridColumnSizes'),
    rowGap: safeGet(frame, 'gridRowGap'), columnGap: safeGet(frame, 'gridColumnGap'),
    childCount: kids.length,
    cells: kids.map((c, i) => ({
      i, id: c.id, name: c.name, visible: c.visible,
      x: r2(c.x), y: r2(c.y), w: r2(c.width), h: r2(c.height),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'),
      rowSpan: safeGet(c, 'gridRowSpan'), colSpan: safeGet(c, 'gridColumnSpan')
    }))
  };
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
      moved.push({ id: ca.id, before: ca.x + ',' + ca.y + ' ' + ca.w + '×' + ca.h +
                   ' r' + ca.row + 'c' + ca.col,
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

  /* ---------- C. 같은 셀 anchor 를 가진 새 인스턴스 + old 숨김 ---------- */
  const targetIndex = probe.children.indexOf(target);
  if (setOk) {
    probeC = freshClone('gridC', 1);
    const baseC = layoutOf(probeC);
    const targetC = probeC.children[targetIndex];
    const targetCellC = baseC.cells[targetIndex];
    const variant = set.children.filter(v => /inprogress|progress/i.test(v.name))[0] || set.children[0];
    newInstance = variant.createInstance();
    probeC.appendChild(newInstance);          // probeC 소유가 된 뒤에 assertOwned 통과
    newInstance.name = PROBE_TAG + ' / newcard';
    const afterAppend = layoutOf(probeC);

    const wrote = {};
    const anchorKeys = ['gridRowAnchorIndex', 'gridColumnAnchorIndex', 'gridRowSpan', 'gridColumnSpan'];
    const wantValues = { gridRowAnchorIndex: targetCellC.row, gridColumnAnchorIndex: targetCellC.col,
                         gridRowSpan: targetCellC.rowSpan, gridColumnSpan: targetCellC.colSpan };
    for (const k of anchorKeys) {
      const want = wantValues[k];
      if (want === null || typeof want === 'undefined') { wrote[k] = { want: null, wrote: false, readBack: null, ok: null }; continue; }
      let err = null;
      try { assertOwned(newInstance, 'C: anchor 쓰기'); newInstance[k] = want; }
      catch (e) { err = e.message; }
      const readBack = safeGet(newInstance, k);
      wrote[k] = { want, wrote: !err, error: err, readBack, ok: !err && readBack === want };
    }
    const afterAnchor = layoutOf(probeC);

    setVisible(targetC, false, 'C: old 숨기기');
    const afterC = layoutOf(probeC);
    const newCellC = afterC.cells.filter(c => c.id === newInstance.id)[0];
    const othersC = othersUnchanged(baseC, afterC, [targetC.id, newInstance.id]);

    experiments.C_newInstanceWithSameAnchor = {
      newInstanceId: newInstance.id,
      newInstanceSize: newCellC ? (newCellC.w + '×' + newCellC.h) : null,
      probeUsed: probeC.id,
      rowCountAfterAppend: afterAppend.rowCount,
      rowCountGrewOnAppend: afterAppend.rowCount !== baseC.rowCount,
      appendNote: '자식이 13개가 되는 순간 그리드가 행을 늘리는지 자체가 관측 대상이다',
      anchorWrite: wrote,
      anchorWriteAllOk: anchorKeys.every(k => wrote[k].ok === true || wrote[k].ok === null),
      anchorWriteAnyFailed: anchorKeys.some(k => wrote[k].ok === false),
      rowCountAfterAnchor: afterAnchor.rowCount,
      newChildX: newCellC ? newCellC.x : null, newChildY: newCellC ? newCellC.y : null,
      targetCellX: targetCellC.x, targetCellY: targetCellC.y,
      newChildLandsOnTargetCell: !!newCellC && near(newCellC.x, targetCellC.x) && near(newCellC.y, targetCellC.y),
      othersUnchanged: othersC.unchanged, movedCount: othersC.movedCount, movedSample: othersC.moved,
      gridHeightAfter: afterC.gridHeight, rowSizesAfter: afterC.rowSizes
    };
    experiments.C_newInstanceWithSameAnchor.rowCountVsBaseline =
      afterC.rowCount === baseC.rowCount ? '같음' : (baseC.rowCount + ' → ' + afterC.rowCount);
    experiments.C_newInstanceWithSameAnchor.insertBeforeRemoveGrowsGrid =
      afterC.rowCount !== baseC.rowCount;
    experiments.C_newInstanceWithSameAnchor.orderNote =
      '칸이 12개 다 찬 상태에서 13번째를 먼저 넣으면 그리드가 행을 하나 더 만들 수 있다. ' +
      'D 에서 반대 순서(먼저 빼고 넣기)를 별도 복제본에서 따로 잰다.';
    newInstance = null;
  } else {
    experiments.C_newInstanceWithSameAnchor = { skipped: true, reason: '컴포넌트 세트를 읽지 못했다' };
  }

  /* ---------- D. old 를 archive 로 옮겼을 때 ---------- */
  if (setOk && !aborted) {
    probeD = freshClone('gridD', 2);
    const baseD = layoutOf(probeD);
    const targetD = probeD.children[targetIndex];
    const targetCellD = baseD.cells[targetIndex];
    /* 순서: ① old 를 archive 로 뺀다 ② 새 인스턴스를 넣는다 ③ anchor 를 명시한다 */
    moveInto(archive, targetD, 'D: old 를 archive 로 이동');
    const afterRemoveOnly = layoutOf(probeD);

    const variantD = set.children.filter(v => /inprogress|progress/i.test(v.name))[0] || set.children[0];
    newInstance = variantD.createInstance();
    probeD.appendChild(newInstance);
    newInstance.name = PROBE_TAG + ' / newcard2';
    const afterInsert = layoutOf(probeD);
    const autoPlaced = afterInsert.cells.filter(c => c.id === newInstance.id)[0];
    const landedWithoutAnchor = !!autoPlaced &&
      near(autoPlaced.x, targetCellD.x) && near(autoPlaced.y, targetCellD.y);

    const anchorWriteD = {};
    for (const k of ['gridRowAnchorIndex', 'gridColumnAnchorIndex', 'gridRowSpan', 'gridColumnSpan']) {
      const want = { gridRowAnchorIndex: targetCellD.row, gridColumnAnchorIndex: targetCellD.col,
                     gridRowSpan: targetCellD.rowSpan, gridColumnSpan: targetCellD.colSpan }[k];
      if (want === null || typeof want === 'undefined') { anchorWriteD[k] = { want: null, ok: null }; continue; }
      let err = null;
      try { assertOwned(newInstance, 'D: anchor 쓰기'); newInstance[k] = want; } catch (e) { err = e.message; }
      const readBack = safeGet(newInstance, k);
      anchorWriteD[k] = { want, error: err, readBack, ok: !err && readBack === want };
    }
    const afterMove = layoutOf(probeD);
    const newCellD = afterMove.cells.filter(c => c.id === newInstance.id)[0];
    const othersD = othersUnchanged(baseD, afterMove, [targetD.id, newInstance.id]);
    const targetStillInGrid = afterMove.cells.some(c => c.id === targetD.id);

    experiments.D_archiveMove = {
      probeUsed: probeD.id,
      targetMovedOut: !targetStillInGrid,
      targetParentAfter: targetD.parent ? targetD.parent.id : null,
      targetParentIsArchive: !!targetD.parent && targetD.parent.id === archive.id,
      childCountAfter: afterMove.childCount,
      order: '① old 를 archive 로 이동 ② 새 instance 추가 ③ anchor 명시',
      rowCountBaseline: baseD.rowCount,
      rowCountAfterRemoveOnly: afterRemoveOnly.rowCount,
      rowCountAfterInsert: afterInsert.rowCount,
      rowCountAfter: afterMove.rowCount,
      rowCountChanged: baseD.rowCount !== afterMove.rowCount,
      removeThenInsertKeepsRowCount: baseD.rowCount === afterMove.rowCount,
      newChildAutoPlacedOnFreedCell: landedWithoutAnchor,
      autoPlacedX: autoPlaced ? autoPlaced.x : null, autoPlacedY: autoPlaced ? autoPlaced.y : null,
      anchorWrite: anchorWriteD,
      anchorWriteAllOk: Object.keys(anchorWriteD).every(k => anchorWriteD[k].ok !== false),
      anchorWriteAnyFailed: Object.keys(anchorWriteD).some(k => anchorWriteD[k].ok === false),
      newChildX: newCellD ? newCellD.x : null, newChildY: newCellD ? newCellD.y : null,
      newChildAnchor: newCellD ? ('r' + newCellD.row + 'c' + newCellD.col) : null,
      newChildStaysOnTargetCell: !!newCellD && near(newCellD.x, targetCellD.x) && near(newCellD.y, targetCellD.y),
      othersUnchanged: othersD.unchanged, movedCount: othersD.movedCount, movedSample: othersD.moved,
      gridHeightAfter: afterMove.gridHeight, rowSizesAfter: afterMove.rowSizes,
      /* archive 에 남길 복원 정보가 실제로 읽히는지 */
      archiveRecordReadable: {
        srcIdInProbe: targetD.id,
        srcIdInRealFile: targetCell.id,
        originalIndex: targetCellD.i,
        originalRow: targetCellD.row, originalColumn: targetCellD.col,
        originalRowSpan: targetCellD.rowSpan, originalColumnSpan: targetCellD.colSpan,
        originalX: targetCellD.x, originalY: targetCellD.y,
        originalWidth: targetCellD.w, originalHeight: targetCellD.h
      },
      archiveRecordNote: '실제 Phase E 에서는 이 6가지를 카드마다 archive 에 적어 둔다'
    };
    experiments.D_archiveMove.archiveMoveReleasesCell =
      experiments.D_archiveMove.targetMovedOut &&
      experiments.D_archiveMove.newChildStaysOnTargetCell &&
      experiments.D_archiveMove.othersUnchanged &&
      experiments.D_archiveMove.removeThenInsertKeepsRowCount;

    /* ---------- E. 높이 모델 ---------- */
    const taller = newCellD ? newCellD.h : null;
    const baseRowSizes = Array.isArray(baseD.rowSizes) ? baseD.rowSizes.map(r2) : null;
    const nowRowSizes = Array.isArray(afterMove.rowSizes) ? afterMove.rowSizes.map(r2) : null;
    /* 행이 늘어난 것(칸 부족)과 트랙이 커진 것(카드가 밀어냄)은 다른 사건이다.
     * 트랙 성장 여부는 "대상 카드가 있던 그 행" 의 크기만 비교해서 판단한다. */
    const tRow = typeof targetCellD.row === 'number' ? targetCellD.row : 0;
    const trackBefore = baseRowSizes ? baseRowSizes[tRow] : null;
    const trackAfter = nowRowSizes ? nowRowSizes[tRow] : null;
    const sameSizes = (trackBefore !== null && trackAfter !== null) ? near(trackBefore, trackAfter) : null;
    const rowCountChangedE = !!baseRowSizes && !!nowRowSizes && baseRowSizes.length !== nowRowSizes.length;
    let hugResult = null;
    try {
      assertOwned(probeD, 'E: HUG 실험');
      probeD.layoutSizingVertical = 'HUG';
      const afterHug = layoutOf(probeD);
      hugResult = { applied: safeGet(probeD, 'layoutSizingVertical') === 'HUG',
        gridHeight: afterHug.gridHeight, rowSizes: afterHug.rowSizes,
        heightChanged: !near(afterMove.gridHeight, afterHug.gridHeight),
        rowSizesChanged: !(Array.isArray(afterHug.rowSizes) && Array.isArray(nowRowSizes) &&
          afterHug.rowSizes.length === nowRowSizes.length &&
          afterHug.rowSizes.every((v, i) => near(r2(v), nowRowSizes[i]))) };
    } catch (e) { hugResult = { applied: false, error: e.message }; }

    experiments.E_heightModel = {
      probeUsed: probeD.id,
      newCardHeight: taller,
      oldCardHeight: targetCellD.h,
      rowSizesBefore: baseRowSizes, rowSizesAfter: nowRowSizes,
      targetRowIndex: tRow,
      targetRowTrackBefore: trackBefore, targetRowTrackAfter: trackAfter,
      rowCountChanged: rowCountChangedE,
      rowTracksGrewForTallerChild: sameSizes === false,
      rowTracksFixed: sameSizes === true,
      gridHeightBefore: baseD.gridHeight, gridHeightAfter: afterMove.gridHeight,
      gridHeightChanged: !near(baseD.gridHeight, afterMove.gridHeight),
      childOverflowsTrack: (baseRowSizes && taller !== null)
        ? r2(taller - baseRowSizes[0]) : null,
      hugTest: hugResult,
      note: '행 트랙 크기가 그대로면 카드가 커져도 그리드 높이는 늘지 않고 카드가 트랙 밖으로 넘친다'
    };
  } else {
    experiments.D_archiveMove = { skipped: true, reason: '새 인스턴스를 만들지 못했다' };
    experiments.E_heightModel = { skipped: true, reason: '새 인스턴스를 만들지 못했다' };
  }
} catch (e) {
  aborted = true;
  abortReason = e.message;
  errors.push('실험 중단: ' + e.message);
}

/* ---------- 임시 노드 정리 ---------- */
const cleanup = { removed: [], failed: [] };
for (const n of [archive, probe, probeC, probeD]) {
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
const C = experiments.C_newInstanceWithSameAnchor || {};
const D = experiments.D_archiveMove || {};
const E = experiments.E_heightModel || {};

const hiddenChildKeepsCell = typeof B.hiddenChildKeepsCell === 'boolean' ? B.hiddenChildKeepsCell : null;
const hiddenChildReflowsOthers = typeof B.hiddenChildReflowsOthers === 'boolean' ? B.hiddenChildReflowsOthers : null;
const explicitAnchorReplacementWorks = (C.skipped || aborted) ? null
  : !!(C.anchorWriteAllOk && !C.anchorWriteAnyFailed &&
       (C.newChildLandsOnTargetCell === true || D.newChildStaysOnTargetCell === true));
const archiveMoveReleasesCell = (D.skipped || aborted) ? null
  : (typeof D.archiveMoveReleasesCell === 'boolean' ? D.archiveMoveReleasesCell : null);

let recommendedPreservationStrategy = null;
let strategyReason = '';
if (aborted) {
  strategyReason = '실험이 중단됐다 (' + abortReason + ') — 전략을 추천하지 않는다';
} else if (archiveMoveReleasesCell === true && explicitAnchorReplacementWorks === true) {
  recommendedPreservationStrategy = 'B. old 12장을 archive frame 으로 이동 + 새 instance 에 같은 cell anchor 를 명시';
  strategyReason = 'old 를 그리드 밖으로 옮겨도 나머지 카드가 움직이지 않았고, ' +
                   '새 instance 에 row/column anchor 를 써서 같은 칸에 정확히 앉혔다';
} else if (hiddenChildKeepsCell === true && explicitAnchorReplacementWorks === true) {
  recommendedPreservationStrategy = 'A. old 를 숨겨서 보존 (숨긴 자식이 칸을 유지하므로 새 instance 는 별도 anchor 필요)';
  strategyReason = '숨겨도 다른 카드가 움직이지 않았지만, 숨긴 카드가 칸을 계속 차지한다';
} else {
  strategyReason = '실험 결과가 안전 조건을 만족하지 않는다 — DRY_RUN 전에 다시 봐야 한다';
}

const replacementStrategySafe = !aborted && sourceGridUntouched === true &&
  explicitAnchorReplacementWorks === true && archiveMoveReleasesCell === true &&
  recommendedPreservationStrategy !== null;

const findings = {
  probeVersion: SCRIPT_VERSION,
  ranAt: Date.now(),
  sourceGridId: GRID_ID,
  sourceHashAtProbeTime: afterHash,
  sourceGridUntouched,
  hiddenChildKeepsCell,
  hiddenChildReflowsOthers,
  archiveMoveReleasesCell,
  explicitAnchorReplacementWorks,
  anchorWriteDetail: C.anchorWrite || null,
  recommendedPreservationStrategy,
  replacementStrategySafe,
  rowTracksFixed: typeof E.rowTracksFixed === 'boolean' ? E.rowTracksFixed : null,
  rowTracksGrewForTallerChild: typeof E.rowTracksGrewForTallerChild === 'boolean'
    ? E.rowTracksGrewForTallerChild : null,
  rowSizesBefore: E.rowSizesBefore || null,
  rowSizesAfter: E.rowSizesAfter || null,
  gridHeightBefore: typeof E.gridHeightBefore === 'number' ? E.gridHeightBefore : null,
  gridHeightAfterTallerChild: typeof E.gridHeightAfter === 'number' ? E.gridHeightAfter : null,
  newCardHeightObserved: typeof E.newCardHeight === 'number' ? E.newCardHeight : null,
  hugRecalculatesRowSizes: E.hugTest ? (E.hugTest.rowSizesChanged === true) : null,
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

const gate = {
  sourceGridUntouched: sourceGridUntouched === true,
  probeCreated: probeCreated === true,
  probeRemoved: probeRemoved === true,
  noErrors: errors.length === 0,
  hiddenOldLayoutBehaviorResolved: typeof hiddenChildKeepsCell === 'boolean',
  explicitAnchorReplacementWorks: explicitAnchorReplacementWorks === true,
  archiveMoveReleasesCell: archiveMoveReleasesCell === true,
  replacementStrategySafe: replacementStrategySafe === true,
  heightModelObserved: typeof E.rowTracksFixed === 'boolean',
  findingsStored: pluginDataWritten === true
};
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
  explicitAnchorReplacementWorks,
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
  nextStep: 'gatePassed = true 이면 20a v3 audit 을 실행합니다. ' +
            'audit 이 이 결과를 읽어 Phase E gate 를 채웁니다.'
});
