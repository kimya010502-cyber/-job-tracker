/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 12
 * 아이콘 시스템 1단계) Icon Library 17종 생성
 *
 * 확정 사양
 *   canvas      16 × 16 (17개 전부)
 *   glyph       원본 크기 유지 · 캔버스 중앙 정렬 · vectorPaths 보존
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
const SCRIPT_VERSION = '12-v1-icon-library';

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
  notes.push('캔버스 16 을 넘는 글리프: ' + oversized.map(o => o.name + '(' + o.size + ')').join(', ') +
             ' — 원본 크기를 유지하면 캔버스 밖으로 나간다. clipsContent 를 끄므로 잘리지는 않지만 확인 필요.');
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
    }

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
      glyphPos: r2(glyph.x) + ',' + r2(glyph.y),
      centered: Math.abs(glyph.x - (CANVAS - glyph.width) / 2) < 0.5 &&
                Math.abs(glyph.y - (CANVAS - glyph.height) / 2) < 0.5,
      pathPreserved: icon.src ? (sourcePath === clonedPath) : null,
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
const allPathsPreserved = created.every(c => c.pathPreserved !== false);
const mainFrameIntact = parentCheck.every(p => p.ok);

if (created.length !== ICONS.length) errors.push('생성된 컴포넌트가 ' + created.length + '개로 기대치 ' + ICONS.length + ' 와 다름');

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  createdCount: created.length,
  expectedCount: ICONS.length,
  created,
  allCanvas16,
  allCentered,
  allPathsPreserved,
  mainFrameIntact,
  parentCheck,
  createdNodeIds: comps.map(c => c.id),
  placement: { originX, originY, cols: GRID_COLS, pitch: GRID_PITCH },
  notes,
  errorCount: errors.length,
  errorSample: errors.slice(0, 8)
});
