/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 12
 * 아이콘 시스템 1단계) Icon Library 17종 생성
 *
 * 확정 사양
 *   canvas      16 × 16 (17개 전부)
 *   glyph       원본 크기 유지 · 캔버스 중앙 정렬 · vectorPaths 보존
 *               예외: max(w,h) > 16 인 글리프만 **비율 유지 비례 축소**로 최장변을 정확히 16 으로 맞춘다
 *               (rescale 사용 — 획 두께까지 함께 줄어든다). 나머지 15개는 크기를 바꾸지 않는다.
 *   instance    리사이즈하지 않는다 (호스트 슬롯도 전부 16×16 으로 맞춘다)
 *   Icon / Dot  원본 벡터 없이 8×8 원을 중앙에 생성. 시즌 6px / 동기화 8px → 8px 로 정규화
 *
 * 범위 — 순수 추가
 *   기존 마스터 9종을 수정하지 않는다 (조회도 이름 충돌 검사 외에는 하지 않는다)
 *   원본 화면 1002:2 를 수정하지 않는다
 *
 * clone 에 대한 주의
 *   Figma 의 node.clone() 은 복제본을 **원본과 같은 부모에** 넣는다.
 *   따라서 clone 직후 곧바로 컴포넌트로 옮긴다. 최종 상태에서 1002:2 는 그대로여야 한다.
 *   이를 확인하려고 각 원본 부모의 자식 수를 **복제 전에 기록**해 두고 마지막에 대조한다.
 *   하나라도 어긋나면 errors 에 남는다.
 *
 * 실행법
 *   1) DRY_RUN = true  → source 17개 존재 여부와 예상 이름만 출력, 아무것도 만들지 않음
 *   2) 이상 없으면 DRY_RUN = false 로 재실행
 *
 * 멱등성
 *   같은 이름의 컴포넌트가 하나라도 있으면 **중단**한다. 부분 생성 상태를 만들지 않는다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경
const SCRIPT_VERSION = '12-v3-icon-library-counts';

const TARGET_ID = '1002:2';
const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';

const CANVAS = 16;
const DOT_SIZE = 8;
const GRID_COLS = 6;
const GRID_PITCH = 56;

const ICONS = [
  { name: 'Icon / Search',             src: '1003:1701', use: '검색 Input',            phase: 'B' },
  { name: 'Icon / Reset',              src: '1003:1731', use: '초기화 Button',         phase: 'B' },
  { name: 'Icon / Plus',               src: '1009:711',  use: '기록 추가 Button',      phase: 'C' },
  { name: 'Icon / Arrow Up',           src: '1002:38',   use: 'KPI1 델타 배지',        phase: 'D' },
  { name: 'Icon / Stage Count',        src: '1002:171',  use: '카드 단계 수 배지 ×12', phase: 'E' },
  { name: 'Icon / External Link',      src: '1002:176',  use: '카드 공고 바로가기 ×12', phase: 'E' },
  { name: 'Icon / More',               src: '1002:179',  use: '카드 더보기 ×12',       phase: 'E' },
  { name: 'Icon / Nav / Applications', src: '1002:514',  use: '사이드바 지원 내역',    phase: 'F' },
  { name: 'Icon / Nav / Statistics',   src: '1002:519',  use: '사이드바 통계',         phase: 'F' },
  { name: 'Icon / Nav / Calendar',     src: '1002:524',  use: '사이드바 캘린더',       phase: 'F' },
  { name: 'Icon / Nav / Memo',         src: '1002:529',  use: '사이드바 메모',         phase: 'F' },
  { name: 'Icon / Nav / Settings',     src: '1002:539',  use: '사이드바 설정',         phase: 'F' },
  { name: 'Icon / Nav / Help',         src: '1002:544',  use: '사이드바 도움말',       phase: 'F' },
  { name: 'Icon / Chevron Left',       src: '1002:461',  use: '페이지네이션 prev',     phase: 'F' },
  { name: 'Icon / Chevron Right',      src: '1002:468',  use: '페이지네이션 next',     phase: 'F' },
  { name: 'Icon / Bell',               src: '1002:489',  use: '상단바 알림',           phase: '별도' },
  { name: 'Icon / Dot',                src: null,        use: 'Chip leading dot (시즌·동기화·상태)', phase: 'A' }
];

const errors = [];
const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ========================================================================
 * 0. 가드
 * ====================================================================== */
const main = await figma.getNodeByIdAsync(TARGET_ID);
if (!main || main.name !== EXPECTED_FRAME_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '대상 파일이 아님. ' + TARGET_ID + ' = ' + (main ? main.name : '없음') });
}

// 이름 충돌 — 하나라도 있으면 중단
const existingComps = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
const existingNames = {};
for (const c of existingComps) existingNames[c.name] = c.id;
const collisions = ICONS.filter(i => existingNames[i.name]).map(i => ({ name: i.name, existingId: existingNames[i.name] }));
if (collisions.length) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: '같은 이름의 컴포넌트가 이미 존재함 — 중단. 부분 생성 상태를 만들지 않는다.',
    collisions
  });
}

/* ========================================================================
 * 1. source 노드 확인
 * ====================================================================== */
function pathDataOf(n) {
  try {
    if (!n || !n.vectorPaths || !n.vectorPaths.length) return null;
    return n.vectorPaths.map(p => String(p.data || '')).join(' ');
  } catch (e) { return null; }
}
function commandSeqOf(pd) { return pd ? (pd.match(/[A-Za-z]/g) || []).join('') : null; }
function insideTarget(n) {
  let cur = n, i = 0;
  while (cur && i < 30) { if (cur.id === TARGET_ID) return true; cur = cur.parent; i++; }
  return false;
}

const sourceReport = [];
const parentCountBefore = {};   // 부모 id → 자식 수 (복제 전)
let missing = 0;

for (const icon of ICONS) {
  if (!icon.src) {
    sourceReport.push({ name: icon.name, src: null, found: true, kind: 'primitive',
                        note: '원본 없음 — ' + DOT_SIZE + '×' + DOT_SIZE + ' 원을 새로 그린다', use: icon.use, phase: icon.phase });
    continue;
  }
  const n = await figma.getNodeByIdAsync(icon.src);
  const found = !!n;
  if (!found) { missing++; }
  const pd = found ? pathDataOf(n) : null;
  if (found && n.parent) parentCountBefore[n.parent.id] = n.parent.children.length;
  sourceReport.push({
    name: icon.name, src: icon.src, found,
    type: found ? n.type : null,
    size: found ? r2(n.width) + '×' + r2(n.height) : null,
    hasVectorPaths: !!pd,
    pathCommands: pd ? (pd.match(/[A-Za-z]/g) || []).length : null,
    insideMainFrame: found ? insideTarget(n) : null,
    parentName: found && n.parent ? n.parent.name : null,
    fitsCanvas: found ? (n.width <= CANVAS && n.height <= CANVAS) : null,
    wouldResize: found ? (Math.max(n.width, n.height) > CANVAS) : null,
    predictedSize: found && Math.max(n.width, n.height) > CANVAS
      ? (function () { const k = CANVAS / Math.max(n.width, n.height); return r2(n.width * k) + '×' + r2(n.height * k); })()
      : (found ? r2(n.width) + '×' + r2(n.height) : null),
    use: icon.use, phase: icon.phase
  });
}

if (missing > 0) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
    reason: 'source 노드 ' + missing + '개를 찾지 못함 — 중단',
    sources: sourceReport
  });
}

const oversized = sourceReport.filter(s => s.fitsCanvas === false);
if (oversized.length) {
  notes.push('캔버스 16 초과 글리프 → 비례 축소 대상: ' +
             oversized.map(o => o.name + ' ' + o.size + ' → ' + o.predictedSize).join(' / '));
}

/* ========================================================================
 * 2. DRY_RUN 보고
 * ====================================================================== */
const maxRight = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0)));
const originX = r2(maxRight + 400);
const originY = -491;

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    plannedComponentCount: ICONS.length,
    plannedNames: ICONS.map(i => i.name),
    nameCollisions: [],
    sources: sourceReport,
    sourcesFound: sourceReport.filter(s => s.found).length,
    canvas: CANVAS + '×' + CANVAS,
    dotSize: DOT_SIZE + '×' + DOT_SIZE,
    glyphPolicy: '원본 크기 유지 · 캔버스 중앙 정렬 · vectorPaths 보존 · 인스턴스 리사이즈 안 함',
    oversizedPolicy: 'max(w,h) > ' + CANVAS + ' 인 글리프만 비율 유지 비례 축소(rescale)로 최장변을 정확히 ' + CANVAS + ' 로 맞춘다',
    wouldResizeIcons: sourceReport.filter(s2 => s2.wouldResize).map(s2 => ({ name: s2.name, from: s2.size, to: s2.predictedSize })),
    wouldKeepOriginalSize: sourceReport.filter(s2 => s2.wouldResize === false).map(s2 => s2.name),
    placement: { originX, originY, cols: GRID_COLS, pitch: GRID_PITCH },
    writesToMasters: '없음 — 기존 마스터 9종은 이름 충돌 검사 외에 조회하지 않는다',
    writesToMainFrame: '없음 — clone 은 곧바로 컴포넌트로 옮기고, 부모 자식 수를 복제 전후로 대조한다',
    notes,
    errorCount: errors.length,
    errorSample: errors.slice(0, 8)
  });
}

/* ========================================================================
 * 3. 생성 (APPLY)
 * ====================================================================== */
const created = [];
const comps = [];
let dotInfo = { created: false };

for (let i = 0; i < ICONS.length; i++) {
  const icon = ICONS[i];
  try {
    const comp = figma.createComponent();
    comp.name = icon.name;
    comp.resize(CANVAS, CANVAS);
    comp.fills = [];
    comp.strokes = [];
    comp.clipsContent = false;          // 원본 크기 유지가 우선 — 잘리지 않게 한다
    comp.x = r2(originX + (i % GRID_COLS) * GRID_PITCH);
    comp.y = r2(originY + Math.floor(i / GRID_COLS) * GRID_PITCH);
    figma.currentPage.appendChild(comp);

    let glyph = null;
    let sourcePath = null;

    if (icon.src) {
      const srcNode = await figma.getNodeByIdAsync(icon.src);
      sourcePath = pathDataOf(srcNode);
      glyph = srcNode.clone();          // clone 은 원본과 같은 부모에 들어간다
      comp.appendChild(glyph);          // → 곧바로 컴포넌트로 옮긴다
      glyph.name = 'glyph';
    } else {
      const dot = figma.createEllipse();
      dot.name = 'glyph';
      dot.resize(DOT_SIZE, DOT_SIZE);
      const V = {};
      for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
      if (V['brand/strong']) {
        dot.fills = [figma.variables.setBoundVariableForPaint(
          { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1 }, 'color', V['brand/strong'])];
      } else {
        notes.push('brand/strong 변수를 찾지 못해 Dot 을 기본 색으로 둔다');
      }
      dot.strokes = [];
      comp.appendChild(dot);
      glyph = dot;
      dotInfo = { created: true, type: dot.type, requestedSize: DOT_SIZE + '×' + DOT_SIZE,
                  fillBoundTo: V['brand/strong'] ? 'brand/strong' : null };
    }

    // 최장변이 캔버스를 넘으면 비율 유지 비례 축소 (rescale 은 획 두께까지 함께 줄인다)
    const beforeW = glyph.width, beforeH = glyph.height;
    const aspectBefore = beforeH > 0 ? beforeW / beforeH : null;
    let didResize = false;
    const maxDim = Math.max(beforeW, beforeH);
    if (maxDim > CANVAS) {
      try { glyph.rescale(CANVAS / maxDim); didResize = true; }
      catch (e) { errors.push(icon.name + ' rescale 실패: ' + e.message); }
    }
    const aspectAfter = glyph.height > 0 ? glyph.width / glyph.height : null;

    // 중앙 정렬 (컴포넌트가 auto layout 이 아니므로 좌표로 배치한다)
    glyph.x = r2((CANVAS - glyph.width) / 2);
    glyph.y = r2((CANVAS - glyph.height) / 2);
    try { glyph.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }; }
    catch (e) { notes.push(icon.name + ' constraints 설정 실패: ' + e.message); }

    const clonedPath = pathDataOf(glyph);
    created.push({
      name: comp.name, id: comp.id,
      canvas: r2(comp.width) + '×' + r2(comp.height),
      glyphSize: r2(glyph.width) + '×' + r2(glyph.height),
      glyphSizeBefore: r2(beforeW) + '×' + r2(beforeH),
      glyphPos: r2(glyph.x) + ',' + r2(glyph.y),
      resized: didResize,
      centered: Math.abs(glyph.x - (CANVAS - glyph.width) / 2) < 0.5 &&
                Math.abs(glyph.y - (CANVAS - glyph.height) / 2) < 0.5,
      fitsCanvas: glyph.width <= CANVAS + 0.01 && glyph.height <= CANVAS + 0.01,
      maxDimension: r2(Math.max(glyph.width, glyph.height)),
      // 크기를 바꾸지 않은 15개: 경로 문자열이 완전히 같아야 한다
      pathPreserved: (icon.src && !didResize) ? (sourcePath === clonedPath) : null,
      // 축소한 2개: 문자열은 달라져도 되고, 비율과 위상(명령 구성)이 유지되면 된다
      aspectBefore: aspectBefore === null ? null : r2(aspectBefore),
      aspectAfter: aspectAfter === null ? null : r2(aspectAfter),
      aspectPreserved: (aspectBefore && aspectAfter) ? Math.abs(aspectBefore - aspectAfter) < 0.01 : null,
      topologyPreserved: (icon.src && didResize)
        ? (commandSeqOf(sourcePath) === commandSeqOf(clonedPath)) : null,
      source: icon.src
    });
    comps.push(comp);

    try {
      comp.description = icon.use + ' 용 아이콘. canvas 16×16, 글리프는 원본 크기로 중앙 정렬.\n' +
                         '호스트 슬롯도 16×16 이므로 인스턴스를 리사이즈하지 않는다.';
    } catch (e) { /* 무시 */ }
  } catch (e) {
    errors.push(icon.name + ' 생성 실패: ' + e.message);
  }
}

/* ========================================================================
 * 4. 검증 — 원본 화면이 그대로인지
 * ====================================================================== */
const parentCheck = [];
for (const pid of Object.keys(parentCountBefore)) {
  const p = await figma.getNodeByIdAsync(pid);
  const now = p && 'children' in p ? p.children.length : null;
  const ok = now === parentCountBefore[pid];
  parentCheck.push({ parentId: pid, before: parentCountBefore[pid], after: now, ok });
  if (!ok) errors.push('원본 부모 ' + pid + ' 의 자식 수가 ' + parentCountBefore[pid] + ' → ' + now + ' 로 바뀜 (복제본이 남아 있을 수 있다)');
}

const allCanvas16 = created.every(c => c.canvas === CANVAS + '×' + CANVAS);
const allCentered = created.every(c => c.centered);
const allFitCanvas = created.every(c => c.fitsCanvas);
const mainFrameIntact = parentCheck.every(p => p.ok);

const resizedIcons = created.filter(c => c.resized).map(c => c.name);
const unresized = created.filter(c => !c.resized && c.source);
const resized = created.filter(c => c.resized);

// 크기를 바꾸지 않은 vector (Dot·축소본 제외, 현재 14개): vectorPaths 문자열 완전 보존
// ※ 개수는 하드코딩하지 않는다 — c.source 유무와 c.resized 로 동적 분류한다
const pathsPreservedForUnresized = unresized.every(c => c.pathPreserved === true);
// 축소된 vector (현재 Memo·Bell 2개): 비율 + 위상 유지, 최장변 정확히 16
const aspectPreservedForResized = resized.every(c => c.aspectPreserved === true);
const topologyPreservedForResized = resized.every(c => c.topologyPreserved === true);
const resizedFitExactly = resized.every(c => Math.abs(c.maxDimension - CANVAS) < 0.05);
// 축소는 oversized 였던 것만
const expectedResize = sourceReport.filter(s2 => s2.wouldResize).map(s2 => s2.name).sort().join('|');
const onlyOversizedWereResized = resizedIcons.slice().sort().join('|') === expectedResize;

if (!pathsPreservedForUnresized) errors.push('크기를 바꾸지 않은 아이콘 중 경로가 달라진 것이 있음');
if (!aspectPreservedForResized) errors.push('축소한 아이콘의 종횡비가 바뀜');
if (!topologyPreservedForResized) errors.push('축소한 아이콘의 경로 위상(명령 구성)이 바뀜');
if (!onlyOversizedWereResized) errors.push('의도하지 않은 아이콘이 축소됨: ' + resizedIcons.join(', '));
if (!allFitCanvas) errors.push('캔버스를 넘는 글리프가 남아 있음');

// Dot 은 vector 가 아니라 primitive 라 경로 검증 대상이 아니다 — 따로 본다
const dotEntry = created.find(c => !c.source);
const dotCheck = dotEntry ? {
  found: true, name: dotEntry.name, canvas: dotEntry.canvas, glyphSize: dotEntry.glyphSize,
  sizeIsDotSize: dotEntry.glyphSize === DOT_SIZE + '×' + DOT_SIZE,
  centered: dotEntry.centered, notResized: dotEntry.resized === false,
  shapeType: dotInfo.type || null, isEllipse: dotInfo.type === 'ELLIPSE',
  fillBoundTo: dotInfo.fillBoundTo
} : { found: false };
if (!dotCheck.found) errors.push('Icon / Dot 이 생성되지 않음');
else {
  if (!dotCheck.sizeIsDotSize) errors.push('Dot 크기가 ' + DOT_SIZE + '×' + DOT_SIZE + ' 이 아님: ' + dotCheck.glyphSize);
  if (!dotCheck.isEllipse) errors.push('Dot 이 ELLIPSE 가 아님: ' + dotCheck.shapeType);
  if (!dotCheck.fillBoundTo) errors.push('Dot fill 이 변수에 바인딩되지 않음');
}

const counts = {
  total: created.length,
  vectorSources: created.filter(c => c.source).length,
  primitives: created.filter(c => !c.source).length,
  resizedVectors: resized.length,
  unresizedVectors: unresized.length
};

if (created.length !== ICONS.length) errors.push('생성된 컴포넌트가 ' + created.length + '개로 기대치 ' + ICONS.length + ' 와 다름');

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  createdCount: created.length,
  expectedCount: ICONS.length,
  created,
  counts,
  dotCheck,
  allCanvas16,
  allCentered,
  allFitCanvas,
  mainFrameIntact,
  resizedIcons,
  onlyOversizedWereResized,
  pathsPreservedForUnresized,
  aspectPreservedForResized,
  topologyPreservedForResized,
  resizedFitExactly,
  parentCheck,
  createdNodeIds: comps.map(c => c.id),
  placement: { originX, originY, cols: GRID_COLS, pitch: GRID_PITCH },
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
