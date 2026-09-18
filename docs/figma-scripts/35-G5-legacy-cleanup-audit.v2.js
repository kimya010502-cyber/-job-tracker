/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 35 v2
 * Phase G5 사전 감사 — 메인 화면 안 hidden / legacy / duplicate 노드 인벤토리 (읽기 전용)
 *
 * v1 대비 변경점 (v1 은 보존, 이 파일은 별도)
 *   v1 을 실제로 돌리니 SAFE_TO_DELETE 가 70개로 나왔는데, 그 상당수가 진짜 legacy 가 아니라
 *   **컴포넌트 인스턴스 내부의 의도적으로 숨긴 optional slot**(App Card / Chip / KPI 안의
 *   `leading` · `caption` 같은 variant 전용 레이어, id 가 `I<instanceId>;<nodeId>` 형태)이었다.
 *   v1 은 "hidden 이면 기본적으로 안전"으로 봐서 이런 인스턴스 내부 구조까지 다 잡아버린 것이 원인.
 *
 *   v2 규칙 순서를 바꿨다 — **parent chain(또는 id)에 INSTANCE 가 하나라도 있으면 무조건 먼저 그쪽으로 분류**하고,
 *   그 다음에야 "화면에 직접 남은 legacy 원본인지"를 본다:
 *     1) INSTANCE 내부 descendant (parent chain 에 INSTANCE 있음, 또는 id 에 `;` 포함) →
 *        optional-slot 이름 패턴(leading/trailing/caption/glyph/icon/badge/label/dot/indicator 등) 이거나
 *        componentPropertyReferences 가 있으면 `KEEP`(컴포넌트가 스스로 관리하는 상태),
 *        아니면 `REVIEW_REQUIRED`(패턴이 애매해서 사람이 봐야 함) — **이 경로에서는 SAFE_TO_DELETE 를 아예 주지 않는다.**
 *     2) 그 외(= screen 에 직접 hand-built 로 남은 것) 만 기존처럼 컴포넌트 정의 보호 → hidden 판정으로 넘어간다.
 *        `SAFE_TO_DELETE` 는 이제 hidden 이라는 것만으로 안 준다 — **지금 교체 인스턴스가 감지되거나(같은 부모의
 *        비슷한 크기 visible INSTANCE), 이전 단계에서 verifier 로 CLOSED 확인된 기록(`confirmedReplaced: true`)이
 *        있을 때만** 준다. 둘 다 없으면(자동 탐지도 안 되고 기록도 없으면) `REVIEW_REQUIRED` 로 보수적으로 내린다 —
 *        이번에 새로 발견된 노드(`1009:703` · `1009:709` · `1002:506`)가 여기 해당한다.
 *
 *   알려진 후보 목록을 H1/H2/G1-B 5개 + Phase B(Toolbar) 11개 + Phase D(KPI) 4개 + Phase F1(Nav) 6개
 *   (전부 CLOSED 기록 있음, `confirmedReplaced: true`) + 새로 발견된 3개(`confirmedReplaced: false`, 역할 미확인)로 확장.
 *
 *   각 후보에 `insideInstance` · `nearestInstanceAncestor` · `isComponentDefinedOptionalLayer` ·
 *   `topLevelLegacyRoot` · `hasVisibleReplacementSibling` · `deletionScopeDescendantCount` 를 추가.
 *   요약도 `safeLegacyRoots` · `protectedInstanceInternals` · `keepWrappers` · `reviewRequired` ·
 *   `totalHiddenButIntentional` 5개 버킷으로 다시 나눴다.
 *
 * 범위는 v1 과 동일: 메인 화면 `1002:2` 내부만. backup 은 스캔하지 않는다. mutation 없음, setPluginData 없음.
 * ========================================================================== */

const SCRIPT_VERSION = '35-G5-v2-legacy-cleanup-audit';

const IDS = { mainFrame: '1002:2' };

/* confirmedReplaced: true = 이전 단계 verifier 로 CLOSED 까지 확인된 기록(진짜 교체 완료).
   false = 이번 스캔에서 새로 발견돼 역할/교체 여부가 아직 확인되지 않음 — SAFE_TO_DELETE 자동 부여 금지.
   null = legacy "원본" 후보가 아니라 wrapper 류 참고 항목(hidden 판정 대상 아님). */
const KNOWN_CANDIDATES = {
  '1003:1735': { role: '기록상 legacy View Toggle hidden (G1-B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1734': { role: '기록상 View Toggle wrapper', confirmedReplaced: null },
  '1003:1728': { role: '기록상 reset 버튼 wrapper', confirmedReplaced: null },
  '1002:487': { role: '기록상 legacy Bell hidden (H1 교체 이전 원본, Icon Button 1110:672 로 교체)', confirmedReplaced: true },
  '1002:478': { role: '기록상 legacy sync 배지 hidden (H2-B 교체 이전 원본, Chip tone=sync 1115:688 로 교체)', confirmedReplaced: true },
  '1002:24': { role: '기록상 KPI legacy 요소 (Phase D KPI Card4 교체 이전 원본)', confirmedReplaced: true },
  '1002:42': { role: '기록상 KPI legacy 요소 (Phase D KPI Card4 교체 이전 원본)', confirmedReplaced: true },
  '1002:60': { role: '기록상 KPI legacy 요소 (Phase D KPI Card4 교체 이전 원본)', confirmedReplaced: true },
  '1002:78': { role: '기록상 KPI legacy 요소 (Phase D KPI Card4 교체 이전 원본)', confirmedReplaced: true },
  '1003:1697': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1700': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1705': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1708': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1711': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1714': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1717': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1720': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1723': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1726': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1003:1729': { role: '기록상 Toolbar legacy 요소 (Phase B 교체 이전 원본)', confirmedReplaced: true },
  '1002:512': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1002:517': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1002:522': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1002:527': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1002:537': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1002:542': { role: '기록상 Nav legacy 요소 (Phase F1 NavItem6 교체 이전 원본)', confirmedReplaced: true },
  '1009:703': { role: '이번 v1 audit 에서 새로 발견된 screen-level hidden 노드 — 역할/교체 여부 미확인', confirmedReplaced: false },
  '1009:709': { role: '이번 v1 audit 에서 새로 발견된 screen-level hidden 노드 — 역할/교체 여부 미확인', confirmedReplaced: false },
  '1002:506': { role: '이번 v1 audit 에서 새로 발견된 screen-level hidden 노드 — 역할/교체 여부 미확인', confirmedReplaced: false }
};
const SUSPECT_NAME_RE = /legacy|레거시|구버전|old\b|deprecated|사용\s*안\s*함|temp\b|임시|copy|복사본|이전\s*버전|backup|백업|unused|미사용/i;
const OPTIONAL_SLOT_NAME_RE = /^(leading|trailing|caption|glyph|icon|badge|label|dot|indicator|suffix|prefix|adornment)$/i;

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function sg(n, k) { try { const v = n[k]; if (v === figma.mixed) return 'MIXED'; return typeof v === 'undefined' ? null : v; } catch (e) { return null; } }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function pads(n) { return { t: sg(n, 'paddingTop') || 0, r: sg(n, 'paddingRight') || 0, b: sg(n, 'paddingBottom') || 0, l: sg(n, 'paddingLeft') || 0 }; }
function visiblePaints(list) { return Array.isArray(list) ? list.filter(p => p.visible !== false && (typeof p.opacity !== 'number' || p.opacity > 0)) : []; }
function visibleEffects(list) { return Array.isArray(list) ? list.filter(e => e.visible !== false) : []; }
function walk(n, fn, depth) { depth = depth || 0; fn(n, depth); for (const c of kids(n)) walk(c, fn, depth + 1); }
function countDescendants(n) { let c = 0; walk(n, (x) => { if (x !== n) c++; }); return c; }
async function mainCompOf(n) { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }
function pathTo(n, stopId) { const p = []; let x = n; while (x && x.type !== 'PAGE') { p.unshift(x.name + ' (' + x.id + ')'); if (x.id === stopId) break; x = x.parent; } return p.join(' › '); }
function inside(n, ancestorId) { let x = n; while (x) { if (x.id === ancestorId) return true; x = x.parent; } return false; }

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

/* ======== 2. 알려진 후보 목록 — 지금 상태로 다시 확인, 위 스캔 결과와 합친다(중복 제거) ======== */
const knownNodes = [];
for (const id of Object.keys(KNOWN_CANDIDATES)) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { notes.push('알려진 후보 ' + id + ' 를 지금 문서에서 찾지 못했다 (이미 지워졌거나 ID 가 바뀌었을 수 있다)'); continue; }
  if (!hiddenTop.some(x => x.id === id) && !suspiciousVisible.some(x => x.id === id)) knownNodes.push(n);
}
const allCandidateNodes = [];
const seen = new Set();
for (const n of hiddenTop.concat(suspiciousVisible, knownNodes)) { if (!seen.has(n.id)) { seen.add(n.id); allCandidateNodes.push(n); } }

/* ======== 3. 인스턴스 내부 판정 ======== */
function nearestInstanceAncestor(n) {
  let x = n.parent;
  while (x && x.id !== IDS.mainFrame) { if (x.type === 'INSTANCE') return x; x = x.parent; }
  return null;
}
function idLooksLikeNestedInstanceDescendant(id) { return typeof id === 'string' && id.indexOf(';') >= 0; }
function isOptionalSlot(n) {
  const refs = sg(n, 'componentPropertyReferences');
  const hasPropertyRef = refs && typeof refs === 'object' && Object.keys(refs).length > 0;
  return hasPropertyRef || OPTIONAL_SLOT_NAME_RE.test((n.name || '').trim());
}

/* ======== 4. 분류 ======== */
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

async function classify(n, ctx) {
  /* 규칙 1 — 인스턴스 내부 descendant 는 무조건 먼저 여기로: SAFE_TO_DELETE 절대 없음 */
  if (ctx.insideInstance) {
    const anc = ctx.nearestInstanceAncestor;
    const ancDesc = anc ? anc.id + '(' + anc.name + ')' : (ctx.idLooksNested ? 'id 형태로 판단(부모 참조로는 못 찾음)' : '알 수 없음');
    if (ctx.isOptionalSlot) {
      return { cls: 'KEEP', reason: '컴포넌트 인스턴스 ' + ancDesc + ' 내부의 optional slot/variant 레이어로 보임(이름 패턴 또는 componentPropertyReferences 존재) — 인스턴스가 스스로 관리하는 상태라 screen cleanup 대상 아님' };
    }
    return { cls: 'REVIEW_REQUIRED', reason: '컴포넌트 인스턴스 ' + ancDesc + ' 내부 hidden 레이어이지만 optional-slot 패턴과 확실히 일치하지 않음 — 기본적으로 삭제 금지, 수동 확인 필요' };
  }

  const parent = n.parent;
  const lm = sg(n, 'layoutMode');
  const isComponentDef = n.type === 'COMPONENT' || n.type === 'COMPONENT_SET';
  const nestedComponent = !isComponentDef ? containsComponentDef(n) : false;
  const externalUse = (isComponentDef || nestedComponent) ? await usedElsewhereAsMainComponent(n) : null;

  if (isComponentDef) return { cls: 'REVIEW_REQUIRED', reason: '컴포넌트 정의(' + n.type + ') 자신 — 자동 분류 대상에서 제외, 수동 확인 필요' };
  if (nestedComponent) return { cls: 'REVIEW_REQUIRED', reason: '내부에 컴포넌트 정의가 포함돼 있어 자동 삭제 대상에서 제외' + (externalUse ? ' (실제로 ' + externalUse + ' 가 이 컴포넌트를 쓰고 있음)' : '') };

  if (n.visible === false) {
    const known = KNOWN_CANDIDATES[n.id];
    const sibs = parent ? kids(parent).filter(c => c.id !== n.id && c.visible !== false && c.type === 'INSTANCE') : [];
    const replacement = sibs.find(c => Math.abs(c.height - n.height) < 4 && Math.abs(c.width - n.width) < Math.max(20, n.width * 0.3));
    const confirmedByRecord = !!(known && known.confirmedReplaced === true);
    const reasonParts = [];
    if (known) reasonParts.push('알려진 기록: ' + known.role);
    reasonParts.push('hidden 이라 auto-layout flow 계산에서 이미 제외돼 있음 — 삭제해도 부모(HUG) 크기·형제 위치에 영향 없음');
    if (replacement) reasonParts.push('비슷한 크기의 새 인스턴스 ' + replacement.id + '(' + replacement.name + ') 가 같은 부모에 있어 교체된 것으로 보임');
    if (confirmedByRecord) reasonParts.push('이전 단계 verifier 로 CLOSED 확인된 교체 기록이 있음');
    if (replacement || confirmedByRecord) {
      return { cls: 'SAFE_TO_DELETE', reason: reasonParts.join('. '), replacementSibling: replacement ? { id: replacement.id, name: replacement.name } : null };
    }
    reasonParts.push('교체 인스턴스를 자동으로 찾지 못했고 CLOSED 기록도 없음 — 보수적으로 REVIEW_REQUIRED (특히 이번에 새로 발견된 노드는 역할부터 먼저 확인 필요)');
    return { cls: 'REVIEW_REQUIRED', reason: reasonParts.join('. ') };
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
  const anc = nearestInstanceAncestor(n);
  const idNested = idLooksLikeNestedInstanceDescendant(n.id);
  const ctx = { insideInstance: !!anc || idNested, nearestInstanceAncestor: anc, idLooksNested: idNested, isOptionalSlot: isOptionalSlot(n) };
  const cl = await classify(n, ctx);
  rows.push({
    id: n.id, name: n.name, type: n.type,
    visible: n.visible !== false,
    parent: parent ? { id: parent.id, name: parent.name } : null,
    path: pathTo(n, IDS.mainFrame),
    childCount: kids(n).length, deletionScopeDescendantCount: countDescendants(n),
    size: size(n),
    layoutMode: lm, sizingH: sg(n, 'layoutSizingHorizontal'), sizingV: sg(n, 'layoutSizingVertical'),
    padding: lm && lm !== 'NONE' ? pads(n) : null, itemSpacing: lm && lm !== 'NONE' ? sg(n, 'itemSpacing') : null,
    currentRole: (KNOWN_CANDIDATES[n.id] && KNOWN_CANDIDATES[n.id].role) || (ctx.insideInstance ? '(컴포넌트 인스턴스 내부 레이어 — 알려진 화면 legacy 기록 없음)' : (n.visible === false ? '(알려진 기록 없음 — 이번 스캔에서 새로 발견된 hidden 노드)' : '(이름 패턴으로 발견된 visible 후보)')),
    insideInstance: ctx.insideInstance,
    nearestInstanceAncestor: anc ? { id: anc.id, name: anc.name } : null,
    isComponentDefinedOptionalLayer: ctx.insideInstance ? ctx.isOptionalSlot : false,
    topLevelLegacyRoot: !ctx.insideInstance && n.visible === false,
    hasVisibleReplacementSibling: !!(cl.replacementSibling),
    impactIfDeleted: ctx.insideInstance
      ? '컴포넌트 인스턴스 내부이므로 screen 스크립트가 직접 건드릴 대상이 아님 — 인스턴스/마스터 쪽에서 다뤄야 함'
      : (n.visible === false
        ? 'hidden 노드라 auto-layout flow 에서 이미 제외됨 — 부모/형제 레이아웃에 영향 없음. 자식 ' + kids(n).length + '개(전체 하위 ' + countDescendants(n) + '개)도 함께 삭제됨'
        : '아직 화면에 쓰이고 있을 수 있음 — 삭제 시 부모(' + (parent ? parent.name : '?') + ') 레이아웃/spacing 이 바뀔 수 있어 별도 검토 필요'),
    classification: cl.cls, reason: cl.reason, replacementSibling: cl.replacementSibling || null,
    isKnownCandidate: !!KNOWN_CANDIDATES[n.id], foundVia: KNOWN_CANDIDATES[n.id] ? 'known' : (n.visible === false ? 'hidden-scan' : 'name-pattern')
  });
}

/* ======== 5. 알려진 후보 중 이번 스캔에 안 걸린 것 = 상태가 바뀌었다는 뜻 ======== */
const missingFromScan = Object.keys(KNOWN_CANDIDATES).filter(id => !rows.some(r => r.id === id));
for (const id of missingFromScan) {
  const n = await figma.getNodeByIdAsync(id);
  if (n) notes.push('알려진 후보 ' + id + ' 는 지금 visible=' + (n.visible !== false) + ' · 이름 "' + n.name + '" 이라 이번 hidden/이름 스캔 조건에 안 걸렸다 (이미 정리됐거나 이름이 바뀌었을 수 있다) — classification 없이 참고용으로만 표시');
}

/* ======== 요약 ======== */
const safe = rows.filter(r => r.classification === 'SAFE_TO_DELETE');
const instanceInternal = rows.filter(r => r.insideInstance);
const keepScreenLevel = rows.filter(r => r.classification === 'KEEP' && !r.insideInstance);
const reviewScreenLevel = rows.filter(r => r.classification === 'REVIEW_REQUIRED' && !r.insideInstance);
const summary = {
  totalCandidatesFound: rows.length,
  totalHiddenCount: hiddenTop.length,
  suspiciousVisibleCount: suspiciousVisible.length,
  knownCandidatesStillPresent: rows.filter(r => r.isKnownCandidate).length,
  knownCandidatesMissingOrChanged: missingFromScan.length,
  safeLegacyRoots: safe.length,
  protectedInstanceInternals: instanceInternal.length,
  keepWrappers: keepScreenLevel.length,
  reviewRequired: reviewScreenLevel.length + rows.filter(r => r.classification === 'REVIEW_REQUIRED' && r.insideInstance).length,
  totalHiddenButIntentional: rows.filter(r => r.visible === false && r.insideInstance).length,
  errorCount: errors.length
};

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_AUDIT',
  summary,
  candidates: rows,
  safeToDelete: safe.map(r => r.id + ' ' + r.name),
  reviewRequired: rows.filter(r => r.classification === 'REVIEW_REQUIRED').map(r => r.id + ' ' + r.name + (r.insideInstance ? ' (instance-internal)' : ' (screen-level)')),
  scope: { mainFrame: IDS.mainFrame, note: 'backup(1044:47 / 1019:2)은 메인 화면 서브트리 밖이라 스캔하지 않았고 cleanup 대상에도 없다.' },
  notes, errors
});
