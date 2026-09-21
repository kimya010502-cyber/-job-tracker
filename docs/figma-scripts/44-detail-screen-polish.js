/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 44
 * 상세 화면(지원 기업별) 시각적 다듬기 — 43-v1 구조 유지, 새 프레임/컴포넌트 생성 없음
 *
 * 43-v1 APPLY 성공 후 사용자 피드백: 구조는 유지하되 원본 PNG 대비 정보 밀도·위계가 아직 부족하다.
 * 이번엔 재설계가 아니라 기존 `detailScreen = 1145:4666` 을 직접 수정(다듬기)한다. 새 프레임/컴포넌트를
 * 만들지 않는다 — audit/discovery/backup/verifier 없이 이 스크립트 1개로 DRY_RUN → APPLY 끝낸다.
 *
 * 고치는 것 (10개)
 *   1) Summary bar — padding/gap 축소해서 더 compact 하게 (한 줄에 조밀하게)
 *   2) Current 카드 — 내부 padding/gap 소폭 증가 + 날짜 입력 행과 메모 영역 사이에 얇은 구분선 삽입 +
 *      메모 박스에 옅은 stroke 추가해서 입력 필드와 분리돼 보이게
 *   3) Timeline connector — 선 두께 2→3, 색을 더 진하게(과하지 않게)
 *   4) waiting-locked 카드 — 높이 56→68, padding/gap 소폭 증가(두 인스턴스 공용 메인 컴포넌트를 수정해서
 *      한 번에 반영)
 *   5) 2단 비율 재조정 — 좌 636 · gap 20 · 우 320 = 976(콘텐츠 폭) 그대로 유지, PNG 쪽으로 더 가깝게
 *   6) 기업 메모 패널 — 태그 행에 layoutWrap 적용해서 잘리지 않고 2줄 이내로 감싸지게, 본문 4줄을
 *      textAutoResize=HEIGHT 로 고쳐서 줄바꿈이 실제로 되게, 본문을 별도 그룹으로 묶어 헤더와의 간격 정리
 *   7) Guide Card — padding/gap 증가 + 본문 텍스트도 wrap 폭을 고쳐서 2~3줄로 자연스럽게 보이게(HUG 라서
 *      내용이 늘면 카드 높이는 자동으로 커진다)
 *   8) 상단 Action 영역 — gap 소폭 증가 + 자동저장 상태와 버튼 그룹 사이에 얇은 구분선 삽입
 *   9) 전체적으로 padding/gap 을 아주 조금씩 키워서 너무 축소돼 보이지 않게(단, 여전히 compact 유지)
 *   10) Sidebar/Header, 기존 컴포넌트 시스템은 건드리지 않는다. 새 icon/component 도 만들지 않는다 —
 *       waiting-locked/state=current/Guide Card 는 "메인 컴포넌트를 직접 수정"만 하지 새로 만들지 않는다.
 *
 * 되돌리기 방침: 이 스크립트는 아무것도 새로 만들거나 지우지 않는다(속성 수정 + 얇은 구분선/그룹 프레임
 * 삽입뿐). 그래서 삭제 기반 rollback 이 의미가 없다 — 중간에 실패하면 어디까지 적용됐는지 정확히 보고만
 * 하고, 필요하면 Figma 자체 실행취소(Ctrl/Cmd+Z)로 되돌리면 된다.
 *
 * 실행법
 *   1) DRY_RUN = true → 1145:4666 아래에서 수정 대상 노드를 전부 실제로 찾을 수 있는지만 확인. mutation 0.
 *   2) 같은 scriptVersion 에서 DRY_RUN = false 로 APPLY.
 * ========================================================================== */

const DRY_RUN = true;          // ← APPLY 할 때만 false 로 변경
const SCRIPT_VERSION = '44-v1-detail-screen-polish';

const DETAIL_SCREEN_ID = '1145:4666';

/* ======== 공통 ======== */
const notes = [];
let mutationCount = 0;
const stepsDone = [];
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function kids(n) { return n && Array.isArray(n.children) ? n.children : []; }
function child(n, name) { return kids(n).find(c => c.name === name) || null; }
function childrenNamed(n, name) { return kids(n).filter(c => c.name === name); }

/* ======== 0. 구조 재확인(추측 없이, 43 이 실제로 만든 구조를 그대로 따라간다) ======== */
const blockers = [];
function gate(key, cond) { if (!cond) blockers.push(key + ' 를 찾지 못했다'); }

const detailScreen = await figma.getNodeByIdAsync(DETAIL_SCREEN_ID);
gate('detailScreen', !!detailScreen);

let mainContent = null, topBar = null, topLeft = null, topRight = null, summaryBar = null, body = null,
  leftCol = null, rightCol = null, curInst = null, lockedInsts = [], connectors = [],
  memoPanel = null, tagRow = null, guideCardInst = null;

if (detailScreen) {
  mainContent = child(detailScreen, 'Main');
  gate('mainContent(Main)', !!mainContent);
  if (mainContent) {
    topBar = child(mainContent, 'page-top');
    summaryBar = child(mainContent, 'summary-bar');
    body = child(mainContent, 'body');
    gate('topBar(page-top)', !!topBar);
    gate('summaryBar', !!summaryBar);
    gate('body', !!body);
    if (topBar) { topLeft = child(topBar, 'top-left'); topRight = child(topBar, 'top-right'); gate('topRight', !!topRight); }
    if (body) {
      leftCol = child(body, 'timeline'); rightCol = child(body, 'memo-panel');
      gate('leftCol(timeline)', !!leftCol); gate('rightCol(memo-panel)', !!rightCol);
      if (leftCol) {
        curInst = child(leftCol, 'state=current');
        lockedInsts = childrenNamed(leftCol, 'state=waiting-locked');
        connectors = childrenNamed(leftCol, 'connector');
        gate('curInst(state=current)', !!curInst);
        gate('lockedInsts(2x state=waiting-locked)', lockedInsts.length === 2);
        gate('connectors(2x)', connectors.length === 2);
      }
      if (rightCol) {
        memoPanel = child(rightCol, 'memo-card');
        guideCardInst = child(rightCol, 'Guide Card');
        gate('memoPanel(memo-card)', !!memoPanel);
        gate('guideCardInst', !!guideCardInst);
        if (memoPanel) { tagRow = child(memoPanel, 'tags'); gate('tagRow(tags)', !!tagRow); }
      }
    }
  }
}

let curComp = null, lockedComp = null, guideComp = null, curContent = null, curAccent = null, lockedTextCol = null;
if (blockers.length === 0) {
  curComp = await curInst.getMainComponentAsync();
  lockedComp = await lockedInsts[0].getMainComponentAsync();
  guideComp = await guideCardInst.getMainComponentAsync();
  gate('curComp(state=current 메인 컴포넌트)', !!curComp);
  gate('lockedComp(state=waiting-locked 메인 컴포넌트)', !!lockedComp);
  gate('guideComp(Guide Card 메인 컴포넌트)', !!guideComp);
  if (curComp) {
    curContent = child(curComp, 'content');
    curAccent = curComp.children.find(c => c.name === 'accent') || null;
    gate('curContent', !!curContent);
    gate('curAccent', !!curAccent);
  }
  if (lockedComp) { lockedTextCol = child(child(lockedComp, 'left') || lockedComp, 'text'); gate('lockedTextCol', !!lockedTextCol); }
}

const preflightPassed = blockers.length === 0;

if (DRY_RUN || !preflightPassed) {
  return out({
    scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY', aborted: !preflightPassed,
    preflightPassed, blockers,
    plan: preflightPassed ? {
      target: { id: detailScreen.id, name: detailScreen.name },
      willCreateNew: [],
      willEdit: [
        'summary-bar (padding/gap 축소)',
        'state=current 메인 컴포넌트 (padding/gap 증가, 구분선 삽입, memo-box stroke, 폭 재조정)',
        'connector line 2개 (두께/색상)',
        'state=waiting-locked 메인 컴포넌트 (높이/padding/gap 증가) — 인스턴스 2개에 동시 반영',
        'body/leftCol/rightCol/memo-card/Guide Card (폭 636/20/320 재배분)',
        'memo-card 태그 행(wrap) + 본문 4줄(줄바꿈 폭 수정 + 그룹핑)',
        'Guide Card 메인 컴포넌트 (padding/gap 증가, 본문 줄바꿈 폭 수정)',
        'top-right 액션 영역 (gap 증가 + 구분선 삽입)',
        'Main content (itemSpacing 소폭 증가)'
      ],
      note: '새 컴포넌트/아이콘/프레임 생성 없음. 얇은 구분선 rect 2개와 메모 본문 그룹 frame 1개만 새로 만들어 기존 구조에 끼워 넣는다.'
    } : null,
    mutationCount, notes, stepsDone
  });
}

/* ======== APPLY ======== */
function divider(name, w, h, hex) {
  const d = figma.createRectangle(); d.name = name; d.resize(w, h);
  const c = hex.replace('#', '');
  d.fills = [{ type: 'SOLID', color: { r: parseInt(c.substr(0, 2), 16) / 255, g: parseInt(c.substr(2, 2), 16) / 255, b: parseInt(c.substr(4, 2), 16) / 255 } }];
  return d;
}
function vframe(name, opts) {
  opts = opts || {};
  const f = figma.createFrame(); f.name = name; f.layoutMode = opts.horizontal ? 'HORIZONTAL' : 'VERTICAL';
  f.itemSpacing = opts.gap || 0; f.layoutSizingHorizontal = 'HUG'; f.layoutSizingVertical = 'HUG'; f.fills = [];
  return f;
}

const NEW_CARD_W = 636, NEW_MEMO_W = 320, NEW_GAP = 20;
let failure = null;
try {
  /* -- 1) Summary bar compact -- */
  summaryBar.paddingTop = summaryBar.paddingBottom = 7;
  summaryBar.itemSpacing = 11;
  for (const d of childrenNamed(summaryBar, 'divider')) d.resize(d.width, 12);
  mutationCount++; stepsDone.push('summary-bar compact');

  /* -- 8) Top action area spacing + 구분선 -- */
  topRight.itemSpacing = 12;
  const topDivider = divider('divider', 1, 20, '#e5e3f0');
  topRight.insertChild(1, topDivider);
  mutationCount++; stepsDone.push('top-right spacing + divider');

  /* -- 2) Current 카드 내부 위계 -- */
  curContent.paddingLeft = curContent.paddingRight = 20;
  curContent.paddingTop = curContent.paddingBottom = 20;
  curContent.itemSpacing = 16;
  const memoHeaderNode = child(curContent, 'memo-header');
  const memoBoxNode = child(curContent, 'memo-box');
  if (memoHeaderNode) {
    const idx = curContent.children.indexOf(memoHeaderNode);
    const contentDivider = divider('divider', NEW_CARD_W - curContent.x - 40, 1, '#e5e3f0');
    curContent.insertChild(idx, contentDivider);
  }
  if (memoBoxNode) {
    memoBoxNode.strokes = [{ type: 'SOLID', color: { r: 0.83, g: 0.81, b: 0.93 } }];
    memoBoxNode.strokeWeight = 1;
  }
  mutationCount++; stepsDone.push('current card internal hierarchy');

  /* -- 5) 2단 비율 재조정 (좌 636 · gap 20 · 우 320, 합 976 유지) -- */
  const contentX = curContent.x;
  curContent.resize(NEW_CARD_W - contentX, curContent.height);
  curAccent.resize(curAccent.width, curContent.height);
  curComp.resize(contentX + curContent.width, curContent.height);
  mutationCount++; stepsDone.push('current card width -> ' + NEW_CARD_W);

  /* -- 4) waiting-locked 메인 컴포넌트 (인스턴스 2개 공용) -- */
  lockedComp.resize(NEW_CARD_W, 68);
  lockedComp.paddingTop = lockedComp.paddingBottom = 16;
  lockedComp.itemSpacing = 14;
  if (lockedTextCol) lockedTextCol.itemSpacing = 4;
  mutationCount++; stepsDone.push('waiting-locked card height/padding');

  /* -- 3) Timeline connector 강화 -- */
  for (const c of connectors) {
    const line = child(c, 'line');
    if (line) {
      line.resize(3, line.height);
      line.fills = [{ type: 'SOLID', color: { r: 0.70, g: 0.68, b: 0.85 } }];
    }
  }
  mutationCount++; stepsDone.push('connector strengthened');

  /* -- body/rightCol/memoPanel/Guide Card 폭 재배분 -- */
  body.itemSpacing = NEW_GAP;
  rightCol.resize(NEW_MEMO_W, rightCol.height);
  memoPanel.resize(NEW_MEMO_W, memoPanel.height);
  memoPanel.paddingLeft = memoPanel.paddingRight = memoPanel.paddingTop = memoPanel.paddingBottom = 20;
  guideComp.resize(NEW_MEMO_W, guideComp.height);
  guideComp.paddingLeft = guideComp.paddingRight = guideComp.paddingTop = guideComp.paddingBottom = 18;
  guideComp.itemSpacing = 8;
  mutationCount++; stepsDone.push('right column width -> ' + NEW_MEMO_W);

  /* -- 6) 기업 메모 패널 — 태그 wrap + 본문 줄바꿈 + 그룹핑 -- */
  const innerW = NEW_MEMO_W - 40;
  tagRow.layoutSizingHorizontal = 'FIXED'; tagRow.resize(innerW, tagRow.height);
  try { tagRow.layoutWrap = 'WRAP'; tagRow.counterAxisSpacing = 6; } catch (e) { notes.push('tagRow wrap 속성 일부 미지원: ' + e.message); }

  const bodyTexts = memoPanel.children.filter(c => c.type === 'TEXT');
  for (const t of bodyTexts) { t.textAutoResize = 'HEIGHT'; t.resize(innerW, t.height); }
  if (bodyTexts.length) {
    const firstIdx = memoPanel.children.indexOf(bodyTexts[0]);
    const memoBodyGroup = vframe('memo-body', { gap: 8 });
    for (const t of bodyTexts) memoBodyGroup.appendChild(t);
    memoPanel.insertChild(firstIdx, memoBodyGroup);
  }
  mutationCount++; stepsDone.push('memo panel tag wrap + body wrap/grouping');

  /* -- 7) Guide Card 본문 줄바꿈 -- */
  const guideBodyText = guideComp.children.find(c => c.type === 'TEXT');
  if (guideBodyText) { guideBodyText.textAutoResize = 'HEIGHT'; guideBodyText.resize(NEW_MEMO_W - 36, guideBodyText.height); }
  mutationCount++; stepsDone.push('guide card body wrap');

  /* -- 9) 전체 밀도 소폭 상향 -- */
  mainContent.itemSpacing = 16;
  mutationCount++; stepsDone.push('main content spacing');
} catch (e) {
  failure = '수정 중 실패(여기까지는 적용됨: ' + stepsDone.join(', ') + '): ' + (e && e.message ? e.message : String(e));
}

if (failure) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true, failure, stepsDone, mutationCount, notes });
}

/* ======== 되읽기 — 가벼운 수치 확인만 ======== */
const c = {};
c.summaryCompact = summaryBar.paddingTop === 7;
c.cardWidth = curComp.width === 636 && lockedComp.width === 636;
c.rightColWidth = rightCol.width === 320 && memoPanel.width === 320 && guideComp.width === 320;
c.bodyGap = body.itemSpacing === 20;
c.mainContentSpacing = mainContent.itemSpacing === 16;
const failedCriteria = Object.keys(c).filter(k => c[k] !== true);

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: false,
  successCriteriaMet: failedCriteria.length === 0, checks: c, failedCriteria,
  stepsDone, mutationCount, notes
});
