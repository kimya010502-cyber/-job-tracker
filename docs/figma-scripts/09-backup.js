/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 09
 * 인스턴스 교체 직전 백업 프레임 생성
 *
 * 하는 일은 하나뿐이다: 메인 화면 프레임을 복제해서 우측 빈 캔버스에 놓는다.
 *   - 원본 1002:2 는 **읽기만** 한다. 속성을 하나도 바꾸지 않는다.
 *   - 순수 추가 동작이라 기존 노드에 영향이 없다.
 *   - 같은 이름의 백업이 이미 있으면 중단한다.
 *
 * 왜 필요한가
 *   기존 백업 1019:2 는 스크립트 01 **이전** 상태다 (Abel/Inter 폰트 + raw hex).
 *   거기로 되돌리면 지금까지의 토큰·스타일 작업이 전부 날아간다.
 *   "교체 직전" 으로 되돌릴 지점이 없어서 새로 뜬다.
 *
 * 한계 (알고 쓸 것)
 *   복제본 안의 인스턴스는 **같은 마스터 컴포넌트를 참조**한다.
 *   따라서 이 백업은 픽셀 동결이 아니라 구조·배치 스냅샷이다.
 *   교체 작업 중에는 컴포넌트를 수정하지 않으므로 롤백 용도로는 충분하다.
 *
 * 실행법
 *   1) DRY_RUN = true  → 무엇을 복제할지만 보고, 아무것도 만들지 않음
 *   2) 결과 확인 후 DRY_RUN = false 로 재실행
 *
 * ⚠ 이 스크립트는 교체 작업과 절대 합치지 않는다. 백업 성공을 확인한 뒤에만 교체를 시작한다.
 * ========================================================================== */

const DRY_RUN = true;          // ← 실제 생성할 때만 false 로 변경
const SCRIPT_VERSION = '09-v1-backup';

const TARGET_ID = '1002:2';
const EXPECTED_FRAME_NAME = '메인 화면 (지원 목록 및 kpi 차트)';
const BACKUP_NAME = '[백업] 메인 화면 — 인스턴스 교체 전';
const GAP_FROM_RIGHTMOST = 400;

const notes = [];
const r2 = n => Math.round(n * 100) / 100;

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}

/* ---------- 가드 ---------- */
const main = await figma.getNodeByIdAsync(TARGET_ID);
if (!main) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: TARGET_ID + ' 을 찾을 수 없음' });
}
if (main.name !== EXPECTED_FRAME_NAME) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: true,
               reason: '프레임 이름 불일치. 기대="' + EXPECTED_FRAME_NAME + '", 실제="' + main.name + '"' });
}

const already = figma.currentPage.children.find(n => n.name === BACKUP_NAME);
if (already) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
    aborted: true,
    reason: '같은 이름의 백업이 이미 존재함 — 중단. 아무것도 만들지 않았다.',
    existingBackup: { id: already.id, name: already.name, x: r2(already.x), y: r2(already.y),
                      size: r2(already.width) + '×' + r2(already.height) }
  });
}

/* ---------- 원본 계측 (읽기만) ---------- */
const beforeDescendants = main.findAll(() => true).length;
const beforeChildren = main.children.length;
const beforeSize = { w: r2(main.width), h: r2(main.height) };
const instanceCount = main.findAll(n => n.type === 'INSTANCE').length;

const maxRight = Math.max(...figma.currentPage.children.map(n => n.x + (n.width || 0)));
const targetX = r2(maxRight + GAP_FROM_RIGHTMOST);
const targetY = r2(main.y);

const otherBackups = figma.currentPage.children
  .filter(n => n.name.indexOf('[백업]') === 0)
  .map(n => ({ id: n.id, name: n.name, x: r2(n.x) }));

if (DRY_RUN) {
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    aborted: false,
    wouldClone: { id: main.id, name: main.name, size: beforeSize.w + '×' + beforeSize.h },
    wouldName: BACKUP_NAME,
    wouldPlaceAt: { x: targetX, y: targetY },
    sourceStats: { directChildren: beforeChildren, descendants: beforeDescendants, instances: instanceCount },
    existingBackups: otherBackups,
    writesToOriginal: '없음 — 원본 ' + TARGET_ID + ' 은 읽기만 한다',
    limitation: '복제본의 인스턴스는 같은 마스터 컴포넌트를 참조한다. 구조·배치 스냅샷이지 픽셀 동결이 아니다.',
    notes
  });
}

/* ---------- 복제 (APPLY) ---------- */
const backup = main.clone();
backup.name = BACKUP_NAME;
backup.x = targetX;
backup.y = targetY;
figma.currentPage.appendChild(backup);

/* ---------- 검증 ---------- */
const afterDescendants = backup.findAll(() => true).length;
const originalDescendantsNow = main.findAll(() => true).length;

const checks = {
  descendantCountMatches: afterDescendants === beforeDescendants,
  childCountMatches: backup.children.length === beforeChildren,
  sizeMatches: Math.abs(backup.width - beforeSize.w) < 0.5 && Math.abs(backup.height - beforeSize.h) < 0.5,
  instanceCountMatches: backup.findAll(n => n.type === 'INSTANCE').length === instanceCount,
  originalUntouched: originalDescendantsNow === beforeDescendants,
  placedOutsideOriginal: backup.x > main.x + main.width
};
const failed = Object.keys(checks).filter(k => !checks[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  aborted: false,
  backupId: backup.id,
  backupName: backup.name,
  placedAt: { x: r2(backup.x), y: r2(backup.y) },
  size: r2(backup.width) + '×' + r2(backup.height),
  source: { id: main.id, descendantsBefore: beforeDescendants, descendantsNow: originalDescendantsNow },
  backupStats: { directChildren: backup.children.length, descendants: afterDescendants,
                 instances: backup.findAll(n => n.type === 'INSTANCE').length },
  checks,
  allChecksPassed: failed.length === 0,
  failedChecks: failed,
  rollbackHint: '되돌릴 때는 이 백업 프레임의 내용을 참고하거나, Phase 별 VERIFY 가 기록한 oldNodeId 를 visible=true 로 되돌린다.',
  notes
});
