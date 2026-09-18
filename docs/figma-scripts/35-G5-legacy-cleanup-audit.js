/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 35
 * Phase G5 사전 감사 — 메인 화면 안 hidden / legacy / duplicate 노드 인벤토리 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. setPluginData 도 쓰지 않는다. 플래그 없이 그대로 실행한다.
 *
 * 범위      메인 화면 `1002:2` 내부만. backup(`1044:47`/`1019:2`)은 애초에 이 서브트리 밖이라 스캔하지 않고
 *           결과에도 포함하지 않는다 — cleanup 대상에서 완전히 제외.
 *
 * 찾는 방법 1) 이미 알려진 후보 5개(H1/H2/G1 단계에서 남긴 것으로 기록된 hidden/wrapper)를 지금 상태로 다시 확인
 *           2) 메인 화면 서브트리 전체를 훑어 `visible === false` 인 노드를 전부 찾는다(하위로는 더 안 들어간다 —
 *              부모가 hidden 이면 그 자식들은 같이 지워지므로 별도 후보로 안 낸다)
 *           3) 이름에 legacy/구버전/old/deprecated/temp/copy/backup 류 패턴이 있는 노드는 **visible 이어도** 같이 낸다
 *              (숨기는 걸 잊고 이름만 남겨뒀을 가능성 — 자동 삭제 대상은 아니고 항상 REVIEW_REQUIRED)
 *
 * 분류 규칙 SAFE_TO_DELETE 는 **visible === false 인 노드에만** 준다 (visible 노드는 아무리 이름이 수상해도
 *           REVIEW_REQUIRED 까지만 — 화면에 실제로 안 쓰이는지는 사람이 확인). 그 중에서도:
 *             - COMPONENT / COMPONENT_SET 자신이거나, 내부에 컴포넌트 정의를 포함하고 있으면 → REVIEW_REQUIRED
 *             - 그 컴포넌트가 파일 어딘가에서 실제 인스턴스로 쓰이고 있으면 → REVIEW_REQUIRED
 *             - 그 외 hidden 이면 → SAFE_TO_DELETE. hidden 노드는 Figma auto-layout 이 flow 계산에서 이미
 *               제외하므로(HUG 부모 크기에 영향 없음) 레이아웃 영향은 없다고 본다 — 이 근거를 이유에 그대로 남긴다.
 *           visible 인 wrapper(자식 ≤1, padding/gap 전부 0, 보이는 fill/stroke/effect 없음) → REVIEW_REQUIRED
 *           (평탄화 후보, 삭제 후보 아님). 그 외 spacing/layout 역할이 남은 visible 노드 → KEEP.
 * ========================================================================== */

const SCRIPT_VERSION = '35-G5-v1-legacy-cleanup-audit';

const IDS = { mainFrame: '1002:2' };
const KNOWN_CANDIDATES = {
  '1003:1735': '기록상 legacy View Toggle hidden (G1 단계 이전 원본, G1-B 교체 후 숨김)',
  '1003:1734': '기록상 View Toggle wrapper',
  '1003:1728': '기록상 reset 버튼 wrapper',
  '1002:487': '기록상 legacy Bell hidden (H1 단계 이전 원본, Icon Button 1110:672 로 교체 후 숨김)',
  '1002:478': '기록상 legacy sync 배지 hidden (H2-B 단계 이전 원본, Chip tone=sync 1115:688 로 교체 후 숨김)'
};
const SUSPECT_NAME_RE = /legacy|레거시|구버전|old\b|deprecated|사용\s*안\s*함|temp\b|임시|copy|복사본|이전\s*버전|backup|백업|unused|미사용/i;

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function flow(n) { return kids(n).filter(c => c.visible !== false && sg(c, 'layoutPositioning') !== 'ABSOLUTE'); }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function visibleEffects(list) { return Array.isArray(list) ? list.filter(e => e.visible !== false) : []; }
function walk(n, fn, depth) { depth = depth || 0; fn(n, depth); for (const c of kids(n)) walk(c, fn, depth + 1); }
function countDescendants(n) { let c = 0; walk(n, (x) => { if (x !== n) c++; }); return c; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function pathTo(n, stopId) { const p = []; let x = n; while (x && x.type !== 'PAGE') { p.unshift(x.name + ' (' + x.id + ')'); if (x.id === stopId) break; x = x.parent; } return p.join(' › '); }

/* ======== 0. 가드 ======== */
const mainFrame = await figma.getNodeByIdAsync(IDS.mainFrame);
if (!mainFrame) return out({ scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT', aborted: true, reason: IDS.mainFrame + ' 를 찾지 못했다' });
await figma.loadAllPagesAsync();

/* ======== 1. 메인 화면 서브트리 스캔 — hidden 노드(하위로 더 안 들어감) + 이름이 수상한 visible 노드 ======== */
const hiddenTop = [];
const suspiciousVisible = [];
(function scan(n, depth) {
  if (depth > 0) {
    if (n.visible === false) { hiddenTop.push(n); return; } // 자식은 같이 지워지므로 더 안 들어간다
    if (SUSPECT_NAME_RE.test(n.name)) suspiciousVisible.push(n);
  }
  for (const c of kids(n)) scan(c, depth + 1);
})(mainFrame, 0);

/* ======== 2. 알려진 후보 5개 — 지금 상태로 다시 확인, 위 스캔 결과와 합친다(중복 제거) ======== */
const knownNodes = [];
for (const id of Object.keys(KNOWN_CANDIDATES)) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { notes.push('알려진 후보 ' + id + ' 를 지금 문서에서 찾지 못했다 (이미 지워졌거나 ID 가 바뀌었을 수 있다)'); continue; }
  if (!hiddenTop.some(x => x.id === id) && !suspiciousVisible.some(x => x.id === id)) knownNodes.push(n);
}
const allCandidateNodes = [];
const seen = new Set();
for (const n of hiddenTop.concat(suspiciousVisible, knownNodes)) { if (!seen.has(n.id)) { seen.add(n.id); allCandidateNodes.push(n); } }

/* ======== 3. 분류 ======== */
function isWrapperCandidate(n) {
  if (kids(n).length > 1) return false;
  const lm = sg(n, 'layoutMode');
  if (lm && lm !== 'NONE') {
    const p = pads(n);
    if (p.t !== 0 || p.r !== 0 || p.b !== 0 || p.l !== 0) return false;
    if ((sg(n, 'itemSpacing') || 0) !== 0) return false;
  }
  if (visiblePaints(sg(n, 'fills')).length) return false;
  if (visiblePaints(sg(n, 'strokes')).length) return false;
  if (visibleEffects(sg(n, 'effects')).length) return false;
  return true;
}
function containsComponentDef(n) { let found = false; walk(n, (x) => { if (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') found = true; }); return found; }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }
async function usedElsewhereAsMainComponent(n) {
  const compIds = new Set();
  walk(n, (x) => { if (x.type === 'COMPONENT') compIds.add(x.id); });
  if (!compIds.size) return null;
  for (const inst of figma.root.findAllWithCriteria({ types: ['INSTANCE'] })) {
    const mc = await mainCompOf(inst);
    if (mc && compIds.has(mc.id) && !inside(inst, n.id)) return inst.id + ' (' + inst.name + ')';
  }
  return null;
}

async function classify(n) {
  const parent = n.parent;
  const lm = sg(n, 'layoutMode');
  const isComponentDef = n.type === 'COMPONENT' || n.type === 'COMPONENT_SET';
  const nestedComponent = !isComponentDef ? containsComponentDef(n) : false;
  const externalUse = (isComponentDef || nestedComponent) ? await usedElsewhereAsMainComponent(n) : null;

  if (isComponentDef) return { cls: 'REVIEW_REQUIRED', reason: '컴포넌트 정의(' + n.type + ') 자신 — 자동 분류 대상에서 제외, 수동 확인 필요' };
  if (nestedComponent) return { cls: 'REVIEW_REQUIRED', reason: '내부에 컴포넌트 정의가 포함돼 있어 자동 삭제 대상에서 제외' + (externalUse ? ' (실제로 ' + externalUse + ' 가 이 컴포넌트를 쓰고 있음)' : '') };

  if (n.visible === false) {
    const known = KNOWN_CANDIDATES[n.id];
    /* 같은 부모의 visible 인 INSTANCE 형제 중 크기가 비슷한 것 — 교체 인스턴스일 가능성 */
    const sibs = parent ? kids(parent).filter(c => c.id !== n.id && c.visible !== false && c.type === 'INSTANCE') : [];
    /* 폭은 넉넉하게 본다 — 교체 컴포넌트가 padding/gap 규칙이 달라 몇 px 커지는 건 흔하다(예: legacy 131 → Chip 규칙 137).
       높이는 같은 행 요소일 가능성이 높으므로 좁게 본다. */
    const replacement = sibs.find(c => Math.abs(c.height - n.height) < 4 && Math.abs(c.width - n.width) < Math.max(20, n.width * 0.3));
    const reasonParts = [];
    if (known) reasonParts.push('알려진 legacy 노드: ' + known);
    reasonParts.push('hidden 이라 auto-layout flow 계산에서 이미 제외돼 있음 — 삭제해도 부모(HUG) 크기·형제 위치에 영향 없음');
    reasonParts.push(replacement ? '비슷한 크기의 새 인스턴스 ' + replacement.id + '(' + replacement.name + ') 가 같은 부모에 있어 교체된 것으로 보임' : '같은 부모에서 교체 인스턴스를 자동으로 찾지 못함 — 그래도 hidden + 미참조라 삭제 안전으로 판단');
    return { cls: 'SAFE_TO_DELETE', reason: reasonParts.join('. '), replacementSibling: replacement ? { id: replacement.id, name: replacement.name } : null };
  }

  /* visible — 이름이 수상하거나 알려진 wrapper 후보 */
  if (isWrapperCandidate(n)) {
    return { cls: 'REVIEW_REQUIRED', reason: '보이는 wrapper 이지만 padding/gap/시각 요소가 전부 없고 자식 ' + kids(n).length + '개만 감싸고 있음 — 삭제가 아니라 평탄화(부모에 자식 직접 연결) 후보. 자동 삭제 대상 아님' };
  }
  const hasLayoutRole = !!(lm && lm !== 'NONE' && (pads(n).t || pads(n).r || pads(n).b || pads(n).l || sg(n, 'itemSpacing')));
  if (kids(n).length > 1 || hasLayoutRole) {
    return { cls: 'KEEP', reason: (hasLayoutRole ? 'padding/gap 이 있어 spacing 역할을 하고 있음' : '자식 ' + kids(n).length + '개를 묶는 구조적 역할이 있음') + ' — 이름은 legacy 패턴과 비슷하지만 지금도 layout/구조 역할이 남아있어 유지' };
  }
  return { cls: 'REVIEW_REQUIRED', reason: '이름이 legacy 패턴과 일치하고 visible=true, padding/gap/구조 역할도 뚜렷하지 않음 — 실제 화면에서 쓰이는지 수동 확인 필요' };
}

const rows = [];
for (const n of allCandidateNodes) {
  const parent = n.parent;
  const lm = sg(n, 'layoutMode');
  const cl = await classify(n);
  rows.push({
    id: n.id, name: n.name, type: n.type,
    visible: n.visible !== false,
    parent: parent ? { id: parent.id, name: parent.name } : null,
    path: pathTo(n, IDS.mainFrame),
    childCount: kids(n).length, totalDescendants: countDescendants(n),
    size: size(n),
    layoutMode: lm, sizingH: sg(n, 'layoutSizingHorizontal'), sizingV: sg(n, 'layoutSizingVertical'),
    padding: lm && lm !== 'NONE' ? pads(n) : null, itemSpacing: lm && lm !== 'NONE' ? sg(n, 'itemSpacing') : null,
    currentRole: KNOWN_CANDIDATES[n.id] || (n.visible === false ? '(알려진 기록 없음 — 이번 스캔에서 새로 발견된 hidden 노드)' : '(이름 패턴으로 발견된 visible 후보)'),
    impactIfDeleted: n.visible === false
      ? 'hidden 노드라 auto-layout flow 에서 이미 제외됨 — 부모/형제 레이아웃에 영향 없음. 자식 ' + kids(n).length + '개(전체 하위 ' + countDescendants(n) + '개)도 함께 삭제됨'
      : '아직 화면에 쓰이고 있을 수 있음 — 삭제 시 부모(' + (parent ? parent.name : '?') + ') 레이아웃/spacing 이 바뀔 수 있어 별도 검토 필요',
    classification: cl.cls, reason: cl.reason, replacementSibling: cl.replacementSibling || null,
    isKnownCandidate: !!KNOWN_CANDIDATES[n.id], foundVia: KNOWN_CANDIDATES[n.id] ? 'known' : (n.visible === false ? 'hidden-scan' : 'name-pattern')
  });
}

/* ======== 4. 알려진 후보 중 이번 스캔에 안 걸린 것 = 상태가 바뀌었다는 뜻 ======== */
const missingFromScan = Object.keys(KNOWN_CANDIDATES).filter(id => !rows.some(r => r.id === id));
for (const id of missingFromScan) {
  const n = await figma.getNodeByIdAsync(id);
  if (n) notes.push('알려진 후보 ' + id + ' 는 지금 visible=' + (n.visible !== false) + ' · 이름 "' + n.name + '" 이라 이번 hidden/이름 스캔 조건에 안 걸렸다 (이미 정리됐거나 이름이 바뀌었을 수 있다) — classification 없이 참고용으로만 표시');
}

/* ======== 요약 ======== */
const safe = rows.filter(r => r.classification === 'SAFE_TO_DELETE');
const review = rows.filter(r => r.classification === 'REVIEW_REQUIRED');
const keep = rows.filter(r => r.classification === 'KEEP');
const summary = {
  totalCandidatesFound: rows.length,
  totalHiddenCount: hiddenTop.length,
  suspiciousVisibleCount: suspiciousVisible.length,
  knownCandidatesStillPresent: rows.filter(r => r.isKnownCandidate).length,
  knownCandidatesMissingOrChanged: missingFromScan.length,
  cleanupCandidateCount: safe.length,
  reviewRequiredCount: review.length,
  keepCount: keep.length,
  protectedNodeCount: review.length + keep.length,
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary,
  candidates: rows,
  safeToDelete: safe.map(r => r.id + ' ' + r.name),
  reviewRequired: review.map(r => r.id + ' ' + r.name),
  scope: { mainFrame: IDS.mainFrame, note: 'backup(1044:47 / 1019:2)은 메인 화면 서브트리 밖이라 스캔하지 않았고 cleanup 대상에도 없다.' },
  notes, errors
});
