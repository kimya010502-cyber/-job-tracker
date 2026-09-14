/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 11a
 * 아이콘 인벤토리 스캔 (읽기 전용)
 *
 * 이 스크립트는 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * 쓰기 API 를 포함하지 않으며, 모든 대입은 로컬 보고 객체에만 이뤄진다.
 * 마스터 컴포넌트 9종은 조회조차 하지 않는다 — 원본 메인 화면 1002:2 만 훑는다.
 *
 * 목적
 *   실제로 몇 개의 Icon 컴포넌트가 필요한지를 숫자로 확정한다.
 *   같은 글리프가 여러 번 쓰이면 하나로 묶고, dot 처럼 컴포넌트가 필요 없는 것은 따로 센다.
 *
 * 중복 판정 두 단계
 *   exactSignature — 노드 타입 + vectorPaths 데이터(소수 2자리 반올림). 완전 동일 도형.
 *   looseSignature — 경로 명령 문자열(M/L/C/Z…) + 종횡비. 같은 모양이 크기만 다른 경우를 묶는다.
 *
 * 분류
 *   dot   — 12px 이하 원형(모서리 반경이 한 변의 40% 이상)이고 경로가 없는 채움 도형
 *   chevron — 경로 명령이 M-L-L 뿐인 단순 꺾은선
 *   glyph — 그 외 실제 아이콘
 * ========================================================================== */

const SCRIPT_VERSION = '11a-v1-icon-inventory';
const TARGET_ID = '1002:2';
const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';

// 구역 판정용 (교체 Phase 매핑에 쓴다)
const SECTIONS = [
  { id: '1002:492', name: '사이드바',      phase: 'F (NavItem)' },
  { id: '1002:469', name: '상단바',        phase: 'A (동기화 dot) / 별도 (알림 버튼)' },
  { id: '1009:698', name: '본문 헤더',     phase: 'A (시즌 dot) / C (기록 추가)' },
  { id: '1002:23',  name: 'KPI Strip',     phase: 'D' },
  { id: '1003:1695', name: '필터 툴바',    phase: 'B' },
  { id: '1002:140', name: '지원 카드 그리드', phase: 'E' },
  { id: '1002:451', name: '푸터/페이지네이션', phase: 'F (Pagination)' }
];

const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 가드 ---------- */
const main = await figma.getNodeByIdAsync(TARGET_ID);
if (!main || main.name !== EXPECTED_FRAME_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'INVENTORY', readOnly: true, aborted: true,
               reason: '대상 프레임이 아님. ' + TARGET_ID + ' = ' + (main ? main.name : '없음') });
}

/* ---------- 헬퍼 ---------- */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(16);
}
function pathDataOf(n) {
  try {
    if (!n.vectorPaths || !n.vectorPaths.length) return null;
    return n.vectorPaths.map(p => String(p.data || '')).join(' ');
  } catch (e) { return null; }
}
function roundPath(d) {
  return d.replace(/-?\d+(\.\d+)?/g, m => String(Math.round(parseFloat(m) * 100) / 100));
}
function commandSeq(d) {
  return (d.match(/[A-Za-z]/g) || []).join('');
}
function hexOfPaint(p) {
  try {
    if (!p || p.type !== 'SOLID') return p ? p.type : null;
    const c = p.color;
    return '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}
async function tokenOfPaint(p) {
  try {
    if (!p || !p.boundVariables || !p.boundVariables.color) return null;
    const v = await figma.variables.getVariableByIdAsync(p.boundVariables.color.id);
    return v ? v.name : null;
  } catch (e) { return null; }
}
function ancestorNames(n, limit) {
  const out2 = [];
  let cur = n.parent, i = 0;
  while (cur && cur.id !== TARGET_ID && i < (limit || 6)) { out2.push(cur.name); cur = cur.parent; i++; }
  return out2;
}
function meaningfulParent(n) {
  const skip = ['Container', 'Frame', 'Margin', 'Background', 'Overlay', 'Group'];
  let cur = n.parent, i = 0;
  while (cur && cur.id !== TARGET_ID && i < 8) {
    const nm = cur.name || '';
    if (!skip.some(s => nm.indexOf(s) === 0)) return nm;
    cur = cur.parent; i++;
  }
  return '(상위 이름 없음)';
}
function sectionOf(n) {
  let cur = n, i = 0;
  const ids = {};
  while (cur && i < 30) { ids[cur.id] = true; cur = cur.parent; i++; }
  for (const s of SECTIONS) if (ids[s.id]) return s;
  return { id: null, name: '(구역 미상)', phase: '-' };
}

/* ---------- 후보 수집 ---------- */
const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR'];

function isDotLike(n) {
  if (n.width > 12 || n.height > 12) return false;
  if (n.width < 4 || n.height < 4) return false;
  const hasFill = 'fills' in n && Array.isArray(n.fills) && n.fills.length > 0;
  if (!hasFill) return false;
  if (n.type === 'ELLIPSE') return true;
  const r = typeof n.cornerRadius === 'number' ? n.cornerRadius : 0;
  return (n.type === 'RECTANGLE' || n.type === 'FRAME') && r >= Math.min(n.width, n.height) * 0.4;
}

const candidates = main.findAll(n => SHAPE_TYPES.indexOf(n.type) !== -1 || isDotLike(n));

/* ---------- 노드별 정보 ---------- */
const nodes = [];
for (const n of candidates) {
  const raw = pathDataOf(n);
  const rounded = raw ? roundPath(raw) : null;
  const cmds = raw ? commandSeq(raw) : null;
  const aspect = n.height > 0 ? r2(n.width / n.height) : null;

  const fill0 = 'fills' in n && Array.isArray(n.fills) && n.fills.length ? n.fills[0] : null;
  const stroke0 = 'strokes' in n && Array.isArray(n.strokes) && n.strokes.length ? n.strokes[0] : null;

  let kind;
  if (!raw && isDotLike(n)) kind = 'dot';
  else if (cmds && /^M?L?L?$/i.test(cmds) && cmds.length <= 3) kind = 'chevron';
  else if (raw) kind = 'glyph';
  else kind = 'shape';

  const sec = sectionOf(n);
  nodes.push({
    id: n.id,
    name: n.name,
    type: n.type,
    kind,
    size: r2(n.width) + '×' + r2(n.height),
    aspect,
    visible: n.visible,
    section: sec.name,
    phase: sec.phase,
    usedIn: meaningfulParent(n),
    ancestors: ancestorNames(n, 4),
    fillHex: hexOfPaint(fill0),
    fillToken: await tokenOfPaint(fill0),
    strokeHex: hexOfPaint(stroke0),
    strokeToken: await tokenOfPaint(stroke0),
    strokeWeight: (function () { try { return typeof n.strokeWeight === 'number' ? r2(n.strokeWeight) : null; } catch (e) { return null; } })(),
    hasPath: !!raw,
    commandSeq: cmds,
    pathSnippet: rounded ? rounded.slice(0, 80) : null,
    exactSignature: hash(n.type + '|' + (rounded || ('shape:' + n.type + ':' + r2(n.width) + 'x' + r2(n.height)))),
    looseSignature: hash(n.type + '|' + (cmds || 'noPath') + '|' + aspect)
  });
}

/* ---------- 그룹화 ---------- */
function groupBy(list, key) {
  const g = {};
  for (const it of list) { (g[it[key]] = g[it[key]] || []).push(it); }
  return g;
}
function summarize(groups) {
  return Object.keys(groups).map(sig => {
    const items = groups[sig];
    const sizes = [...new Set(items.map(i => i.size))];
    const sections = [...new Set(items.map(i => i.section))];
    const phases = [...new Set(items.map(i => i.phase))];
    const usedIn = [...new Set(items.map(i => i.usedIn))];
    return {
      signature: sig,
      kind: items[0].kind,
      count: items.length,
      sizes,
      sizeVariants: sizes.length,
      sections,
      phases,
      usedIn,
      sampleName: items[0].name,
      sampleId: items[0].id,
      commandSeq: items[0].commandSeq,
      pathSnippet: items[0].pathSnippet,
      fillTokens: [...new Set(items.map(i => i.fillToken || i.fillHex))],
      strokeTokens: [...new Set(items.map(i => i.strokeToken || i.strokeHex))]
    };
  }).sort((a, b) => b.count - a.count);
}

const exactGroups = summarize(groupBy(nodes, 'exactSignature'));
const looseGroups = summarize(groupBy(nodes, 'looseSignature'));

const byKind = groupBy(nodes, 'kind');
const kindCounts = {};
for (const k of Object.keys(byKind)) kindCounts[k] = byKind[k].length;

const glyphNodes = nodes.filter(n => n.kind === 'glyph' || n.kind === 'chevron');
const glyphExact = summarize(groupBy(glyphNodes, 'exactSignature'));
const glyphLoose = summarize(groupBy(glyphNodes, 'looseSignature'));

const dotNodes = nodes.filter(n => n.kind === 'dot');
const dotSummary = {
  count: dotNodes.length,
  sizes: [...new Set(dotNodes.map(d => d.size))],
  bySection: groupBy(dotNodes, 'section'),
  tokens: [...new Set(dotNodes.map(d => d.fillToken || d.fillHex))],
  note: 'dot 은 Icon 컴포넌트가 필요 없다. Chip leading 슬롯 안의 실제 원을 fill 오버라이드로 재사용한다.'
};

/* ---------- Phase 별 매핑 ---------- */
const byPhase = groupBy(nodes, 'phase');
const phaseMap = {};
for (const p of Object.keys(byPhase)) {
  const items = byPhase[p];
  phaseMap[p] = {
    total: items.length,
    dots: items.filter(i => i.kind === 'dot').length,
    glyphs: items.filter(i => i.kind === 'glyph' || i.kind === 'chevron').length,
    uniqueGlyphLoose: [...new Set(items.filter(i => i.kind !== 'dot').map(i => i.looseSignature))].length,
    usedIn: [...new Set(items.map(i => i.usedIn))]
  };
}

/* ---------- 최종 권장치 ---------- */
const recommendation = {
  totalIconLikeNodes: nodes.length,
  dotNodes: dotNodes.length,
  glyphNodes: glyphNodes.length,
  uniqueGlyphs_exact: glyphExact.length,
  uniqueGlyphs_loose: glyphLoose.length,
  recommendedIconComponents: glyphLoose.length,
  rationale: 'loose 기준(경로 명령 + 종횡비)으로 묶은 수가 실제 필요한 Icon 컴포넌트 수에 가깝다. ' +
             'exact 기준은 같은 모양이 크기만 달라도 따로 세므로 과다 계상된다. ' +
             'dot 은 컴포넌트가 필요 없어 제외했다.',
  caution: 'loose 기준은 서로 다른 글리프가 우연히 같은 명령 구성을 가질 때 과소 계상될 수 있다. ' +
           'pathSnippet 을 눈으로 대조해 최종 확정할 것.'
};

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'INVENTORY',
  readOnly: true,
  aborted: false,
  scannedFrame: { id: main.id, name: main.name },
  scopeNote: '원본 메인 화면만 스캔했다. 마스터 컴포넌트와 백업 프레임은 건드리지도 조회하지도 않았다.',

  totalIconLikeNodes: nodes.length,
  kindCounts,

  uniqueExactGroups: exactGroups.length,
  uniqueLooseGroups: looseGroups.length,

  glyphGroupsExact: glyphExact,
  glyphGroupsLoose: glyphLoose,
  dots: dotSummary,

  phaseMap,
  recommendation,

  nodes,
  notes
});
