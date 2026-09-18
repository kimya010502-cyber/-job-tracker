/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 30
 * Phase G1-B — 화면의 View Toggle 1개를 View Toggle(view=card) 인스턴스로 교체
 *
 * 대상      1003:1735 (legacy FRAME "Background", 51×35.5) — 부모 1003:1734 Margin 은 유지
 * 방식      같은 부모 · 같은 index 에 view=card 인스턴스를 넣고, 원본은 visible=false 로 숨긴다 (삭제는 G5)
 * 예측      값을 박지 않고 실제 구조(auto layout · padding · sizing · 정렬)에서 계산한다.
 *           예측이 성립하지 않는 구조(Margin 이 auto layout 이 아님, 부모가 FIXED 라 넘침 등)면 APPLY 를 막는다.
 *
 * 보호 (전후 snapshot 대조)
 *   메인 화면 1002:2 전체 — 단, 교체로 **당연히 바뀌는 값만** 가린다:
 *     Margin 1003:1734 의 width · height · y 와 자식 목록 (자식은 따로 검사)
 *     필터 그룹 1003:1703 의 x · width (HUG 로 1px 늘고 SPACE_BETWEEN 이면 왼쪽으로 1px 이동)
 *   원본 토글 1003:1735 서브트리 — 루트의 visible 만 가리고 나머지 전부 동일해야 한다
 *   Margin 자체 속성 (이름 · 부모 · index · layout · padding · fill · 정렬) — 크기 외 동일
 *   G1-A 마스터 (1105:646 / 1105:648 / 1105:664) · Icon Library 17종 · backup 1019:115 / 1044:160
 *
 * 실패 정책
 *   APPLY 중 실패하면 새 인스턴스를 지우고 원본 visible 을 되돌린 뒤,
 *   Margin · 필터 그룹 크기와 보호 대상 snapshot 이 교체 전과 같은지 다시 확인해서 보고한다.
 *
 * v2 (v1 DRY_RUN 이 막힌 이유)
 *   v1 은 Margin 이 HORIZONTAL 이라고 가정하고 인스턴스 위치를 계산했다. 실제 Margin 은
 *   **VERTICAL · HUG/HUG · padding 0/0/0/4 · MIN/MIN** 이라 위치 예측이 null 이 되어 중심 · 간격 gate 가 막혔다.
 *   v2 는 가로/세로를 가리지 않는 배치 함수 하나(childPos)로 Margin → 필터 그룹 → 툴바를 차례로 계산한다.
 *   같은 함수로 "지금 구조"를 계산해 실제 위치와 맞는지 먼저 확인한다 (predictionModelMatchesCurrent).
 *   초기화→토글 간격은 local 좌표 계산과 absoluteTransform 실측 두 가지로 재고 둘이 같아야 통과한다.
 *
 * 실행법
 *   1) DRY_RUN = true  → preflight + 예측만. mutation 0.
 *   2) 결과 검토 후 **같은 scriptVersion** 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '30-G1B-v2-viewtoggle-replace';

const IDS = {
  mainFrame: '1002:2', toolbar: '1003:1695', filterGroup: '1003:1703', margin: '1003:1734', legacy: '1003:1735',
  legacyTable: '1003:1736', legacyCard: '1003:1739', resetWrapper: '1003:1728',
  set: '1105:664', variantTable: '1105:650', variantCard: '1105:657', iconTable: '1105:646', iconCard: '1105:648'
};
const BACKUP_COPY_IDS = ['1019:115', '1044:160'];
const ICON_LIBRARY_IDS = ['1048:784', '1048:786', '1048:788', '1048:790', '1048:792', '1048:794', '1048:796', '1048:798', '1048:800',
  '1048:802', '1048:804', '1048:806', '1048:808', '1048:810', '1048:812', '1048:814', '1048:816'];
const EXPECT_BEFORE = { toolbar: [976, 60], toolbarPad: 12, group: [697, 36], groupGap: 8, margin: [55, 35.5], legacy: [51, 35.5], resetToToggleGap: 12 };
const TOGGLE = [52, 36];
const BASELINE_KEY = 'joob.G1B.baseline';

/* ======== 공통 ======== */
const notes = [];
const errors = [];
let mutationCount = 0;
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function sg(n, k) { try { const v = n[k]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function hex(c) { if (!c) return null; const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2); return '#' + h(c.r) + h(c.g) + h(c.b); }
function pathDataOf(n) { try { return n && n.vectorPaths && n.vectorPaths.length ? n.vectorPaths.map(p => String(p.data || '')).join(' ') : null; } catch (e) { return null; } }
function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function boundColorId(p) { return p && p.boundVariables && p.boundVariables.color ? p.boundVariables.color.id : null; }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }

/* snapshot — mask: { id: ['x','y','width','height','visible'] } 해당 값을 가린다 / skipChildren: [id] 자식을 읽지 않는다 */
function snapshot(root, mask, skipChildren) {
  if (!root) return { exists: false };
  mask = mask || {}; skipChildren = skipChildren || [];
  const lines = [];
  (function w(n) {
    const m = mask[n.id] || [];
    const v = k => (m.indexOf(k) >= 0 ? '*' : k === 'visible' ? n.visible !== false : r2(n[k]));
    let fill = '';
    try { fill = visiblePaints(n.fills).map(p => (p.type === 'SOLID' ? hex(p.color) : p.type) + (boundColorId(p) || '')).join(','); } catch (e) { fill = '?'; }
    const pd = (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION') ? String((pathDataOf(n) || '').length) : '';
    const skip = skipChildren.indexOf(n.id) >= 0;
    lines.push([n.id, n.type, n.name, v('width'), v('height'), v('x'), v('y'), v('visible'), skip ? '*' : kids(n).length, pd, fill].join('|'));
    if (!skip) for (const c of kids(n)) w(c);
  })(root);
  return { exists: true, nodeCount: lines.length, hash: hash(lines.join('\n')) };
}

/* ======== 0. 노드 읽기 ======== */
const N = {};
for (const k of Object.keys(IDS)) N[k] = await figma.getNodeByIdAsync(IDS[k]);
if (!N.mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true, reason: '메인 화면 1002:2 를 찾을 수 없다' });

const pf = {};
const blockers = [];
function gate(key, cond, why) { pf[key] = !!cond; if (!cond) blockers.push(key + ' — ' + why); }

gate('legacyToggleFound', N.legacy && N.legacy.type === 'FRAME' && N.legacy.visible !== false, '1003:1735 가 없거나 FRAME 이 아니거나 이미 숨겨져 있다');
gate('legacyToggleParentIsMargin', N.legacy && N.legacy.parent && N.legacy.parent.id === IDS.margin, '1003:1735 의 부모가 1003:1734 가 아니다');
gate('marginFound', !!N.margin && N.margin.parent && N.margin.parent.id === IDS.filterGroup, '1003:1734 가 없거나 필터 그룹 안에 있지 않다');
gate('marginCurrentSizeExpected', N.margin && near(N.margin.width, EXPECT_BEFORE.margin[0]) && near(N.margin.height, EXPECT_BEFORE.margin[1]), 'Margin 크기가 55×35.5 가 아니다: ' + size(N.margin));
gate('legacyCurrentSizeExpected', N.legacy && near(N.legacy.width, EXPECT_BEFORE.legacy[0]) && near(N.legacy.height, EXPECT_BEFORE.legacy[1]), '원본 토글 크기가 51×35.5 가 아니다: ' + size(N.legacy));
gate('viewToggleSetFound', N.set && N.set.type === 'COMPONENT_SET' && N.set.name === 'View Toggle', '1105:664 View Toggle 세트가 없다');
gate('viewCardVariantFound', N.variantCard && N.variantCard.type === 'COMPONENT' && N.variantCard.name === 'view=card' && N.variantCard.parent && N.variantCard.parent.id === IDS.set, '1105:657 view=card 가 없다');
gate('viewCardSize52x36', N.variantCard && near(N.variantCard.width, TOGGLE[0]) && near(N.variantCard.height, TOGGLE[1]), 'view=card 크기가 52×36 이 아니다: ' + size(N.variantCard));

/* 현재 선택 상태 = card : card 버튼에만 fill/effect 가 있다 */
function looksSelected(n) { return !!n && (visiblePaints(n.fills).length > 0 || visiblePaints(n.effects || []).length > 0 || !!sg(n, 'effectStyleId')); }
const legacyState = { table: looksSelected(N.legacyTable), card: looksSelected(N.legacyCard) };
gate('currentSelectedStateIsCard', legacyState.card && !legacyState.table, '원본의 선택 상태가 card 하나가 아니다: ' + JSON.stringify(legacyState));

gate('filterGroupFound', N.filterGroup && sg(N.filterGroup, 'layoutMode') === 'HORIZONTAL' && N.filterGroup.parent && N.filterGroup.parent.id === IDS.toolbar, '필터 그룹이 없거나 HORIZONTAL auto layout 이 아니거나 툴바 밖에 있다');
gate('toolbarFound', N.toolbar && sg(N.toolbar, 'layoutMode') === 'HORIZONTAL', '툴바가 없거나 HORIZONTAL auto layout 이 아니다');
const tbPad = N.toolbar ? pads(N.toolbar) : null;
gate('toolbarCurrentLayoutMatches',
  N.toolbar && near(N.toolbar.width, EXPECT_BEFORE.toolbar[0]) && near(N.toolbar.height, EXPECT_BEFORE.toolbar[1]) &&
  tbPad.l === EXPECT_BEFORE.toolbarPad && tbPad.r === EXPECT_BEFORE.toolbarPad && tbPad.t === EXPECT_BEFORE.toolbarPad && tbPad.b === EXPECT_BEFORE.toolbarPad &&
  N.filterGroup && near(N.filterGroup.width, EXPECT_BEFORE.group[0]) && near(N.filterGroup.height, EXPECT_BEFORE.group[1]) && sg(N.filterGroup, 'itemSpacing') === EXPECT_BEFORE.groupGap,
  '툴바/필터 그룹 현재 값이 MCP 실측(976×60 · padding 12 · 697×36 · gap 8)과 다르다');

/* Margin 의 구조 — 예측이 가능한 형태인지 */
const mg = N.margin;
const mgInfo = mg ? {
  layoutMode: sg(mg, 'layoutMode'), sizingH: sg(mg, 'layoutSizingHorizontal'), sizingV: sg(mg, 'layoutSizingVertical'),
  padding: pads(mg), itemSpacing: sg(mg, 'itemSpacing'), primaryAlign: sg(mg, 'primaryAxisAlignItems'), counterAlign: sg(mg, 'counterAxisAlignItems'),
  childIds: kids(mg).map(c => c.id), legacyIndex: kids(mg).findIndex(c => c.id === IDS.legacy), legacyPos: N.legacy ? r2(N.legacy.x) + ',' + r2(N.legacy.y) : null,
  legacyPositioning: N.legacy ? sg(N.legacy, 'layoutPositioning') : null
} : null;
gate('marginIsAutoLayout', mgInfo && (mgInfo.layoutMode === 'HORIZONTAL' || mgInfo.layoutMode === 'VERTICAL'), 'Margin 이 auto layout 이 아니다 (' + (mgInfo && mgInfo.layoutMode) + ') — 숨긴 원본이 자리를 차지하지 않는다는 전제와 크기 예측이 성립하지 않는다');
gate('marginLayoutModeVertical', mgInfo && mgInfo.layoutMode === 'VERTICAL', 'Margin layoutMode 가 VERTICAL 이 아니다: ' + (mgInfo && mgInfo.layoutMode));
gate('marginPaddingMatches', mgInfo && mgInfo.padding.t === 0 && mgInfo.padding.r === 0 && mgInfo.padding.b === 0 && mgInfo.padding.l === 4, 'Margin padding 이 0/0/0/4 가 아니다: ' + JSON.stringify(mgInfo && mgInfo.padding));
gate('marginOnlyChildLegacy', mgInfo && mgInfo.childIds.length === 1 && mgInfo.legacyIndex === 0 && mgInfo.legacyPositioning !== 'ABSOLUTE', 'Margin 자식이 원본 하나가 아니다: ' + JSON.stringify(mgInfo && mgInfo.childIds));

/* ======== 1. 예측 ======== */
/* 한 축 HUG/FIXED 크기 — contentW / contentH 는 자식들이 차지하는 가로 · 세로 (padding 제외) */
function axisSize(node, axis, contentW, contentH) {
  const p = pads(node);
  const sizing = axis === 'w' ? sg(node, 'layoutSizingHorizontal') : sg(node, 'layoutSizingVertical');
  const cur = axis === 'w' ? node.width : node.height;
  const needed = r2(axis === 'w' ? p.l + p.r + contentW : p.t + p.b + contentH);
  if (sizing !== 'HUG') return { size: cur, sizing, fixed: true, needed };
  return { size: needed, sizing, fixed: false };
}
/* auto layout 하나 안에서 자식 위치 — 가로/세로 공통
 *   node      부모 (layoutMode · padding · itemSpacing · 정렬을 읽는다)
 *   nodeW/H   부모의 (예상) 크기
 *   sizes     흐름 자식들의 (예상) 크기 [{w,h}] — 숨김 · ABSOLUTE 자식은 넣지 않는다
 *   index     구할 자식 순번
 * 반환 {x, y} (부모 기준 local). 정렬이 BASELINE 처럼 모르는 값이면 null. */
function childPos(node, nodeW, nodeH, sizes, index) {
  const p = pads(node), horizontal = sg(node, 'layoutMode') === 'HORIZONTAL';
  const ms = horizontal ? p.l : p.t, me = horizontal ? p.r : p.b, cs = horizontal ? p.t : p.l, ce = horizontal ? p.b : p.r;
  const mainExt = horizontal ? nodeW : nodeH, crossExt = horizontal ? nodeH : nodeW;
  const mains = sizes.map(z => (horizontal ? z.w : z.h));
  const gap = sg(node, 'itemSpacing') || 0, align = sg(node, 'primaryAxisAlignItems'), calign = sg(node, 'counterAxisAlignItems');
  const used = mains.reduce((a, b) => a + b, 0);
  let pos, step;
  if (align === 'SPACE_BETWEEN' && mains.length > 1) { step = (mainExt - ms - me - used) / (mains.length - 1); pos = ms; }
  else {
    step = gap; const total = used + gap * Math.max(0, mains.length - 1);
    if (align === 'CENTER') pos = ms + (mainExt - ms - me - total) / 2;
    else if (align === 'MAX') pos = mainExt - me - total;
    else if (align === 'MIN' || align === 'SPACE_BETWEEN') pos = ms;
    else return null;
  }
  for (let k = 0; k < index; k++) pos += mains[k] + step;
  const cz = horizontal ? sizes[index].h : sizes[index].w;
  let cross;
  if (calign === 'CENTER') cross = cs + (crossExt - cs - ce - cz) / 2;
  else if (calign === 'MAX') cross = crossExt - ce - cz;
  else if (calign === 'MIN') cross = cs;
  else return null;
  return horizontal ? { x: r2(pos), y: r2(cross) } : { x: r2(cross), y: r2(pos) };
}
function absX(n) { return n.absoluteTransform[0][2]; }
function absY(n) { return n.absoluteTransform[1][2]; }

let pred = null;
if (blockers.length === 0) {
  const tb = N.toolbar, fg = N.filterGroup;
  /* Margin */
  const mW = axisSize(mg, 'w', TOGGLE[0], TOGGLE[1]);
  const mH = axisSize(mg, 'h', TOGGLE[0], TOGGLE[1]);
  const marginFits = (!mW.fixed || mW.needed <= mg.width + 0.01) && (!mH.fixed || mH.needed <= mg.height + 0.01);
  /* 필터 그룹 */
  const fgFlow = flow(fg);
  const fgWidthsAfter = fgFlow.map(c => (c.id === IDS.margin ? mW.size : c.width));
  const fgHeightsAfter = fgFlow.map(c => (c.id === IDS.margin ? mH.size : c.height));
  const fgContentW = fgWidthsAfter.reduce((a, b) => a + b, 0) + (sg(fg, 'primaryAxisAlignItems') === 'SPACE_BETWEEN' ? 0 : (sg(fg, 'itemSpacing') || 0) * Math.max(0, fgFlow.length - 1));
  const gW = axisSize(fg, 'w', fgContentW, Math.max.apply(null, fgHeightsAfter));
  const gH = axisSize(fg, 'h', fgContentW, Math.max.apply(null, fgHeightsAfter));
  const groupFits = (!gW.fixed || gW.needed <= fg.width + 0.01) && (!gH.fixed || gH.needed <= fg.height + 0.01);
  /* 툴바 */
  const tbFlow = flow(tb);
  const tbSizesAfter = tbFlow.map(c => (c.id === IDS.filterGroup ? { w: gW.size, h: gH.size } : { w: c.width, h: c.height }));
  const tbGapTotal = sg(tb, 'primaryAxisAlignItems') === 'SPACE_BETWEEN' ? 0 : (sg(tb, 'itemSpacing') || 0) * Math.max(0, tbFlow.length - 1);
  const freeSpaceBefore = r2(tb.width - tbPad.l - tbPad.r - tbFlow.reduce((a, c) => a + c.width, 0) - tbGapTotal);
  const freeSpaceAfter = r2(tb.width - tbPad.l - tbPad.r - tbSizesAfter.reduce((a, z) => a + z.w, 0) - tbGapTotal);
  const gIdx = tbFlow.findIndex(c => c.id === IDS.filterGroup);
  const gPos = childPos(tb, tb.width, tb.height, tbSizesAfter, gIdx);
  const groupXAfter = gPos ? gPos.x : null, groupYAfter = gPos ? gPos.y : null;
  /* 필터 그룹 안 */
  const fgSizesAfter = fgFlow.map(c => (c.id === IDS.margin ? { w: mW.size, h: mH.size } : { w: c.width, h: c.height }));
  const mIdx = fgFlow.findIndex(c => c.id === IDS.margin);
  const mPos = childPos(fg, gW.size, gH.size, fgSizesAfter, mIdx);
  const marginXAfter = mPos ? mPos.x : null, marginYAfter = mPos ? mPos.y : null;
  /* Margin 안 — 흐름 자식은 새 인스턴스 하나 (원본은 숨김이라 빠진다) */
  const iPos = childPos(mg, mW.size, mH.size, [{ w: TOGGLE[0], h: TOGGLE[1] }], 0);
  const instXInMargin = iPos ? iPos.x : null, instYInMargin = iPos ? iPos.y : null;
  /* 예측 모델 자기 검증 — 같은 함수로 지금 구조를 계산하면 지금 위치가 나와야 한다 */
  const selfLegacy = childPos(mg, mg.width, mg.height, [{ w: N.legacy.width, h: N.legacy.height }], 0);
  const selfMargin = childPos(fg, fg.width, fg.height, fgFlow.map(c => ({ w: c.width, h: c.height })), mIdx);
  const selfGroup = childPos(tb, tb.width, tb.height, tbFlow.map(c => ({ w: c.width, h: c.height })), gIdx);
  const modelSelfCheck = {
    legacyInMargin: selfLegacy, legacyActual: r2(N.legacy.x) + ',' + r2(N.legacy.y),
    marginInGroup: selfMargin, marginActual: r2(mg.x) + ',' + r2(mg.y),
    groupInToolbar: selfGroup, groupActual: r2(fg.x) + ',' + r2(fg.y),
    ok: !!selfLegacy && near(selfLegacy.x, N.legacy.x, 0.01) && near(selfLegacy.y, N.legacy.y, 0.01) &&
        !!selfMargin && near(selfMargin.x, mg.x, 0.01) && near(selfMargin.y, mg.y, 0.01) &&
        !!selfGroup && near(selfGroup.x, fg.x, 0.01) && near(selfGroup.y, fg.y, 0.01)
  };
  /* 초기화 → 토글 간격 — 보이는 몸통의 가장자리끼리.
   * 초기화 = wrapper 안 흐름 자식 중 오른쪽 끝이 가장 큰 것, 토글 = 원본(전) · 새 인스턴스(후)의 왼쪽 끝 */
  const prev = mIdx > 0 ? fgFlow[mIdx - 1] : null;
  const prevBody = prev ? flow(prev).reduce((best, c) => (!best || c.x + c.width > best.x + best.width ? c : best), null) : null;
  const prevVisibleRight = prevBody ? prevBody.x + prevBody.width : null;
  const gapBefore = prevBody ? r2(mg.x + N.legacy.x - (prev.x + prevVisibleRight)) : null;
  const gapBeforeAbsolute = prevBody ? r2(absX(N.legacy) - (absX(prevBody) + prevBody.width)) : null;
  const prevPosAfter = prev ? childPos(fg, gW.size, gH.size, fgSizesAfter, mIdx - 1) : null;
  const gapAfter = prevBody && prevPosAfter && marginXAfter !== null && instXInMargin !== null
    ? r2(marginXAfter + instXInMargin - (prevPosAfter.x + prevVisibleRight)) : null;
  /* 세로 중심 — 툴바 기준으로 부모 사슬(그룹 → Margin → 인스턴스)을 따라 더한다 */
  const toggleTopAfter = groupYAfter !== null && marginYAfter !== null && instYInMargin !== null ? r2(groupYAfter + marginYAfter + instYInMargin) : null;
  const toggleCenterAfter = toggleTopAfter !== null ? r2(toggleTopAfter + TOGGLE[1] / 2) : null;
  const toggleCenterBefore = r2(absY(N.legacy) - absY(tb) + N.legacy.height / 2);
  /* overflow */
  const groupRightAfter = r2(groupXAfter + gW.size);
  const tbInnerRight = r2(tb.width - tbPad.r);

  pred = {
    margin: { before: size(mg), after: r2(mW.size) + '×' + r2(mH.size), sizingH: mW.sizing, sizingV: mH.sizing, fits: marginFits, xAfter: marginXAfter, yAfter: marginYAfter },
    instanceInMargin: { x: instXInMargin, y: instYInMargin, marginLayout: mgInfo.layoutMode },
    modelSelfCheck,
    filterGroup: { before: size(fg), after: r2(gW.size) + '×' + r2(gH.size), sizingH: gW.sizing, sizingV: gH.sizing, fits: groupFits,
      xBefore: r2(fg.x), xAfter: groupXAfter, yAfter: groupYAfter, rightAfter: groupRightAfter },
    toolbar: { size: size(tb), sizingH: sg(tb, 'layoutSizingHorizontal'), sizingV: sg(tb, 'layoutSizingVertical'), primaryAlign: sg(tb, 'primaryAxisAlignItems'),
      freeSpaceBefore, freeSpaceAfter, innerRight: tbInnerRight },
    resetToToggleGap: { resetWrapper: prev ? prev.id + ' ' + prev.name : null, resetBody: prevBody ? prevBody.id + ' ' + prevBody.name : null,
      before: gapBefore, beforeAbsolute: gapBeforeAbsolute, after: gapAfter },
    verticalCenter: { toolbarCenter: r2(tb.height / 2), toggleCenterBefore, toggleTopAfter, toggleCenterAfter,
      toggleBottomAfter: toggleTopAfter !== null ? r2(toggleTopAfter + TOGGLE[1]) : null }
  };

  gate('predictionModelMatchesCurrent', modelSelfCheck.ok, '배치 함수로 지금 구조를 계산한 값이 실제 위치와 다르다 — 예측을 믿을 수 없다: ' + JSON.stringify(modelSelfCheck));
  gate('newInstanceLocalX4', near(instXInMargin, 4, 0.01), '새 인스턴스 예상 local x ' + instXInMargin);
  gate('newInstanceLocalY0', near(instYInMargin, 0, 0.01), '새 인스턴스 예상 local y ' + instYInMargin);
  gate('toggleCenterAfter30', near(toggleCenterAfter, 30, 0.01), '토글 예상 세로 중심 ' + toggleCenterAfter);
  gate('toolbarCenter30', near(tb.height / 2, 30, 0.01), '툴바 중심 ' + r2(tb.height / 2));
  gate('freeSpaceSufficient', freeSpaceAfter >= 0, '교체 후 툴바 여유 폭이 음수: ' + freeSpaceAfter);
  gate('newInstance52x36', near(N.variantCard.width, 52) && near(N.variantCard.height, 36), '');
  gate('marginAfter56x36', marginFits && near(mW.size, 56) && near(mH.size, 36), 'Margin 예상 크기 ' + pred.margin.after + (marginFits ? '' : ' (FIXED 라 안 들어감)'));
  gate('filterGroupAfter698x36', groupFits && near(gW.size, 698) && near(gH.size, 36), '필터 그룹 예상 크기 ' + pred.filterGroup.after + (groupFits ? '' : ' (FIXED 라 넘침)'));
  gate('toolbarFreeSpaceAfter14', near(freeSpaceAfter, 14), '툴바 예상 여유 폭 ' + freeSpaceAfter);
  gate('toggleVerticallyCentered', toggleCenterAfter !== null && near(toggleCenterAfter, tb.height / 2, 0.01), '토글 예상 세로 중심 ' + toggleCenterAfter + ' ≠ 툴바 중심 ' + r2(tb.height / 2));
  gate('resetToToggleGapBefore12', near(gapBefore, EXPECT_BEFORE.resetToToggleGap, 0.01) && near(gapBeforeAbsolute, gapBefore, 0.01), '지금 초기화→토글 간격 local ' + gapBefore + ' / absolute ' + gapBeforeAbsolute);
  gate('resetToToggleGapAfter12', near(gapAfter, EXPECT_BEFORE.resetToToggleGap, 0.01), '교체 후 예상 간격 ' + gapAfter);
  gate('noOverflow', marginFits && groupFits && groupRightAfter <= tbInnerRight + 0.01 && groupXAfter >= tbPad.l - 0.01, '넘침 — 그룹 오른쪽 ' + groupRightAfter + ' / 툴바 안쪽 끝 ' + tbInnerRight);
  gate('noUnexpectedReparenting', mgInfo.childIds.length === 1, '');
}

/* ======== 2. 보호 대상 기준값 ======== */
const MASK = { [IDS.margin]: ['width', 'height', 'y'], [IDS.filterGroup]: ['x', 'width'] };
const SKIP = [IDS.margin];
const protectedNodes = () => {
  const list = [
    ['mainFrame(masked)', () => snapshot(N.mainFrame, MASK, SKIP)],
    ['legacyToggle(visible/x/y masked)', () => snapshot(N.legacy, { [IDS.legacy]: ['visible', 'x', 'y'] })],
    ['set 1105:664', () => snapshot(N.set)], ['icon 1105:646', () => snapshot(N.iconTable)], ['icon 1105:648', () => snapshot(N.iconCard)]
  ];
  return list;
};
async function takeProtected() {
  const res = {};
  for (const [k, f] of protectedNodes()) res[k] = f();
  for (const id of BACKUP_COPY_IDS) res['backup ' + id] = snapshot(await figma.getNodeByIdAsync(id));
  for (const id of ICON_LIBRARY_IDS) res['icon ' + id] = snapshot(await figma.getNodeByIdAsync(id));
  return res;
}
function marginProps() {
  if (!mg) return null;
  const p = pads(mg);
  return JSON.stringify({ name: mg.name, parent: mg.parent ? mg.parent.id : null, index: mg.parent ? kids(mg.parent).indexOf(mg) : null, visible: mg.visible,
    layoutMode: sg(mg, 'layoutMode'), sizingH: sg(mg, 'layoutSizingHorizontal'), sizingV: sg(mg, 'layoutSizingVertical'), p,
    gap: sg(mg, 'itemSpacing'), pa: sg(mg, 'primaryAxisAlignItems'), ca: sg(mg, 'counterAxisAlignItems'), x: r2(mg.x),
    fills: visiblePaints(mg.fills).length, effects: visiblePaints(mg.effects || []).length, clips: sg(mg, 'clipsContent') });
}
const protectedBefore = await takeProtected();
const backupsExist = BACKUP_COPY_IDS.map(id => ({ id, exists: protectedBefore['backup ' + id].exists }));
if (backupsExist.some(b => !b.exists)) notes.push('backup copy 중 없는 것이 있다: ' + JSON.stringify(backupsExist));
const marginPropsBefore = marginProps();

/* 토글 인스턴스 개수 — 파일 전체 */
await figma.loadAllPagesAsync();
async function toggleInstances() {
  const res = [];
  for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    let mc = null; try { mc = await inst.getMainComponentAsync(); } catch (e) { mc = null; }
    if (mc && (mc.id === IDS.variantCard || mc.id === IDS.variantTable)) res.push({ id: inst.id, variant: mc.name, parent: inst.parent ? inst.parent.id : null });
  }
  return res;
}
const instancesBefore = await toggleInstances();
gate('noExistingToggleInstances', instancesBefore.length === 0, '이미 View Toggle 인스턴스가 있다: ' + JSON.stringify(instancesBefore));

pf.protectedNodesPreserved = true;          // DRY_RUN 은 아무것도 바꾸지 않으므로 기준값만 기록한다
pf.mutationCountIsZero = mutationCount === 0;
pf.everyTargetReady = blockers.length === 0;
const preflightPassed = blockers.length === 0 && Object.keys(pf).every(k => pf[k] === true);

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers, preflight: pf,
    prediction: pred,
    current: { legacyState, margin: mgInfo, marginSize: size(mg), filterGroup: size(N.filterGroup), toolbar: size(N.toolbar) },
    plan: preflightPassed ? [
      'view=card(1105:657) 인스턴스를 만든다',
      'Margin 1003:1734 의 index ' + mgInfo.legacyIndex + ' 에 넣는다 (원본은 index ' + (mgInfo.legacyIndex + 1) + ' 로 밀린다)',
      '원본 1003:1735 visible = false (삭제하지 않는다 — G5)',
      '되읽기: 인스턴스 · Margin · 필터 그룹 · 툴바 · 간격 · 세로 중심 · 보호 대상 · stray'
    ] : null,
    protectedBaseline: protectedBefore, toggleInstancesBefore: instancesBefore,
    mutationCount, notes, errorCount: errors.length + blockers.length
  });
}

/* ======== 3. APPLY ======== */
let inst = null, legacyHidden = false, failure = null;
try {
  inst = N.variantCard.createInstance(); mutationCount++;
  mg.insertChild(mgInfo.legacyIndex, inst); mutationCount++;
  N.legacy.visible = false; legacyHidden = true; mutationCount++;
  if (inst.visible === false) { inst.visible = true; mutationCount++; }
  if (!inst.parent || inst.parent.id !== IDS.margin) throw new Error('인스턴스가 Margin 안에 들어가지 않았다');
  if (kids(mg).indexOf(inst) !== mgInfo.legacyIndex) throw new Error('인스턴스 index 가 원본 자리(' + mgInfo.legacyIndex + ')가 아니다');
  const mc = await inst.getMainComponentAsync();
  if (!mc || mc.id !== IDS.variantCard) throw new Error('인스턴스의 main component 가 view=card 가 아니다: ' + (mc ? mc.id : null));
} catch (e) { failure = e && e.message ? e.message : String(e); }

async function rollback(reason) {
  const steps = [];
  if (inst && !inst.removed) { try { inst.remove(); steps.push('instance removed'); } catch (e) { steps.push('instance remove failed: ' + e.message); } }
  if (legacyHidden || (N.legacy && N.legacy.visible === false)) { try { N.legacy.visible = true; steps.push('legacy visible restored'); } catch (e) { steps.push('legacy restore failed: ' + e.message); } }
  const after = await takeProtected();
  const diff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(after[k]));
  const sizesBack = near(mg.width, EXPECT_BEFORE.margin[0]) && near(mg.height, EXPECT_BEFORE.margin[1]) && near(N.filterGroup.width, EXPECT_BEFORE.group[0]);
  const instancesNow = await toggleInstances();
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure: reason, rolledBack: true, rollbackSteps: steps,
    rollbackClean: diff.length === 0 && sizesBack && instancesNow.length === 0 && marginProps() === marginPropsBefore && N.legacy.visible !== false,
    protectedDiff: diff, sizesBack, marginSize: size(mg), filterGroup: size(N.filterGroup), toggleInstancesNow: instancesNow, errorCount: 1 });
}
if (failure) return await rollback(failure);

/* ======== 4. 되읽기 ======== */
const tb = N.toolbar, fg = N.filterGroup;
const c = {};
c.instanceInMarginAtLegacyIndex = inst.parent.id === IDS.margin && kids(mg).indexOf(inst) === mgInfo.legacyIndex;
c.instanceUsesViewCard = (await inst.getMainComponentAsync()).id === IDS.variantCard;
c.instanceSize52x36 = near(inst.width, 52) && near(inst.height, 36);
c.instanceVisible = inst.visible !== false;
c.legacyHidden = N.legacy.visible === false && !N.legacy.removed && N.legacy.parent && N.legacy.parent.id === IDS.margin;
c.marginOnlyInstanceInFlow = flow(mg).length === 1 && flow(mg)[0].id === inst.id;
c.marginMatchesPrediction = near(mg.width, 56) && near(mg.height, 36) && near(mg.x, pred.margin.xAfter) && near(mg.y, pred.margin.yAfter);
c.instancePosMatchesPrediction = near(inst.x, pred.instanceInMargin.x) && near(inst.y, pred.instanceInMargin.y);
c.filterGroupMatchesPrediction = near(fg.width, 698) && near(fg.height, 36) && near(fg.x, pred.filterGroup.xAfter) && near(fg.y, pred.filterGroup.yAfter);
c.toolbarSizeUnchanged = near(tb.width, EXPECT_BEFORE.toolbar[0]) && near(tb.height, EXPECT_BEFORE.toolbar[1]);
const tbFlowNow = flow(tb);
const freeNow = r2(tb.width - tbPad.l - tbPad.r - tbFlowNow.reduce((a, x) => a + x.width, 0) - (sg(tb, 'primaryAxisAlignItems') === 'SPACE_BETWEEN' ? 0 : (sg(tb, 'itemSpacing') || 0) * Math.max(0, tbFlowNow.length - 1)));
c.freeSpaceMatchesPrediction = near(freeNow, pred.toolbar.freeSpaceAfter, 0.01) && freeNow >= 0;
const instAbsY = inst.absoluteTransform[1][2], tbAbsY = tb.absoluteTransform[1][2];
const centerNow = r2(instAbsY - tbAbsY + inst.height / 2);
c.verticalCenterCorrect = near(centerNow, tb.height / 2, 0.01);
const fgFlowNow = flow(fg); const mIdxNow = fgFlowNow.findIndex(x => x.id === IDS.margin); const prevNow = fgFlowNow[mIdxNow - 1];
const prevRightNow = prevNow ? prevNow.x + Math.max.apply(null, [0].concat(flow(prevNow).map(x => x.x + x.width))) : null;
const gapNow = prevNow ? r2(mg.x + inst.x - prevRightNow) : null;
const prevBodyNow = prevNow ? flow(prevNow).reduce((best, x) => (!best || x.x + x.width > best.x + best.width ? x : best), null) : null;
const gapNowAbsolute = prevBodyNow ? r2(absX(inst) - (absX(prevBodyNow) + prevBodyNow.width)) : null;
c.resetToggleGapPreserved = near(gapNow, EXPECT_BEFORE.resetToToggleGap, 0.01) && near(gapNowAbsolute, gapNow, 0.01);
c.noOverflow = fg.x + fg.width <= tb.width - tbPad.r + 0.01 && fg.x >= tbPad.l - 0.01 && fgFlowNow.every(x => x.x + x.width <= fg.width - pads(fg).r + 0.01);
c.marginPropsPreserved = (function () { const a = JSON.parse(marginPropsBefore), b = JSON.parse(marginProps()); return JSON.stringify(a) === JSON.stringify(b); })();
const protectedAfter = await takeProtected();
const protectedDiff = Object.keys(protectedBefore).filter(k => JSON.stringify(protectedBefore[k]) !== JSON.stringify(protectedAfter[k]));
c.protectedNodesPreserved = protectedDiff.length === 0;
const instancesAfter = await toggleInstances();
c.noStrayInstances = instancesAfter.length === 1 && instancesAfter[0].id === inst.id && instancesAfter[0].parent === IDS.margin;
c.mutationCountExpected = mutationCount === 3 || mutationCount === 4;

const failedCriteria = Object.keys(c).filter(k => c[k] !== true);
const successCriteriaMet = failedCriteria.length === 0;

if (!successCriteriaMet) {
  /* 되읽기 실패 → 원래대로 되돌린다 */
  const rb = await rollback('되읽기 검증 실패: ' + failedCriteria.join(', '));
  return rb;
}

try {
  figma.root.setPluginData(BASELINE_KEY, JSON.stringify({
    scriptVersion: SCRIPT_VERSION, at: new Date().toISOString(),
    instanceId: inst.id, legacyId: IDS.legacy,
    protectedAfter, marginPropsAfter: marginProps(),
    expect: { margin: size(mg), filterGroup: size(fg), filterGroupX: r2(fg.x), toolbar: size(tb), freeSpace: freeNow, center: centerNow, gap: gapNow, instancePos: r2(inst.x) + ',' + r2(inst.y) }
  }));
} catch (e) { notes.push('기준값 저장 실패 (verifier 가 다시 잰다): ' + e.message); }

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet, failedCriteria, checks: c,
  result: {
    instance: { id: inst.id, name: inst.name, variant: 'view=card', size: size(inst), pos: r2(inst.x) + ',' + r2(inst.y), index: kids(mg).indexOf(inst), visible: inst.visible },
    legacy: { id: IDS.legacy, visible: N.legacy.visible, index: kids(mg).indexOf(N.legacy) },
    margin: { size: size(mg), pos: r2(mg.x) + ',' + r2(mg.y) },
    filterGroup: { size: size(fg), pos: r2(fg.x) + ',' + r2(fg.y) },
    toolbar: { size: size(tb), freeSpace: freeNow },
    toggleCenterY: centerNow, toolbarCenterY: r2(tb.height / 2), resetToToggleGap: gapNow, resetToToggleGapAbsolute: gapNowAbsolute
  },
  prediction: pred,
  protectedDiff, toggleInstancesAfter: instancesAfter,
  mutationCount, notes, errorCount: errors.length, errors
});
