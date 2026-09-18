/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 41
 * 상세 화면 구현 전 — 기존 디자인 시스템 컴포넌트 구조 한 번에 훑기 (읽기 전용)
 *
 * 아무것도 만들지 않고, 바꾸지 않고, 지우지 않는다. 플래그 없이 그대로 실행한다.
 * G5 처럼 "레거시를 찾아내는" audit 이 아니다 — 목적은 단 하나, **Button/Select/Input/Icon Library 의
 * 정확한 id 와 property 구조를 추측하지 않고 실제 값으로 확보**하는 것. 상세 화면에서 이 컴포넌트들을
 * 인스턴스로 갖다 쓰려면 정확한 componentId 와 (있다면) variant property 이름이 필요하기 때문이다.
 *
 * 하는 일
 *   1) 파일 전체에서 COMPONENT/COMPONENT_SET 을 전부 찾아 이름 · id · 크기 · variant property 목록을 낸다
 *   2) 이름이 Button/Select/Input/Chip/Icon 패턴에 맞는 것만 요약으로 따로 뽑는다(전체 목록도 그대로 준다)
 *   3) Icon Library 안에 있는 개별 아이콘 이름을 전부 나열한다(상세 화면에 필요할 만한 것: 뒤로가기 화살표 ·
 *      연필(수정) · 휴지통(삭제) · 외부 링크 · 달력 · 자물쇠 · 체크 · 복사 · Bold/Italic/List/Checkbox/Link)
 *   4) Chip 세트(`1029:1984`)의 현재 variant 옵션과 각 variant 의 실제 크기(태그로 쓸 만큼 작은지)를 낸다
 * ========================================================================== */

const SCRIPT_VERSION = '41-v1-detail-screen-component-discovery';

const KNOWN = { chipSet: '1029:1984', iconButton: '1037:2091', mainFrame: '1002:2' };
const NAME_PATTERNS = {
  button: /^button$/i, select: /^select$/i, input: /^input$/i, chip: /^chip$/i,
  icon: /^icon\s*\//i, navItem: /nav\s*item/i, header: /^header$/i, aside: /^aside$/i
};
const WANTED_ICON_HINTS = /back|arrow|edit|pencil|trash|delete|external|link|calendar|date|lock|check|copy|bold|italic|list|checkbox/i;

/* ======== 공통 ======== */
const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
function out(obj) { try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ } return obj; }
function size(n) { return n ? r2(n.width) + '×' + r2(n.height) : null; }
function pathTo(n) { const p = []; let x = n; while (x && x.type !== 'PAGE' && x.type !== 'DOCUMENT') { p.unshift(x.name); x = x.parent; } return p.join(' › '); }
function pageOf(n) { let x = n; while (x && x.type !== 'PAGE') x = x.parent; return x ? x.name : null; }

/* ======== 0. 전 페이지 로드 ======== */
await figma.loadAllPagesAsync();

/* ======== 1. 파일 전체 COMPONENT / COMPONENT_SET ======== */
const allComponents = figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
const componentRows = allComponents.map(n => {
  let props = null;
  try {
    const defs = n.componentPropertyDefinitions || {};
    props = Object.keys(defs).map(k => ({ key: k, type: defs[k].type, default: defs[k].defaultValue, variantOptions: defs[k].variantOptions || null }));
  } catch (e) { props = null; }
  return { id: n.id, name: n.name, type: n.type, size: size(n), page: pageOf(n), path: pathTo(n), properties: props };
});

/* ======== 2. 이름 패턴별 요약 ======== */
const summaryByPattern = {};
for (const key of Object.keys(NAME_PATTERNS)) {
  summaryByPattern[key] = componentRows.filter(r => NAME_PATTERNS[key].test(r.name)).map(r => ({ id: r.id, name: r.name, type: r.type, size: r.size, path: r.path }));
}

/* ======== 3. 아이콘 라이브러리 — 이름에 "Icon /" 들어간 것 중 상세 화면에 쓸 만한 것 ======== */
const allIcons = summaryByPattern.icon;
const relevantIcons = allIcons.filter(r => WANTED_ICON_HINTS.test(r.name));

/* ======== 4. Chip 세트 variant 옵션 ======== */
let chipSetInfo = null;
const chipSetNode = await figma.getNodeByIdAsync(KNOWN.chipSet);
if (chipSetNode) {
  const defs = chipSetNode.componentPropertyDefinitions || {};
  const toneDef = defs['tone'] || null;
  const variantChildren = (chipSetNode.children || []).map(c => ({ id: c.id, name: c.name, size: size(c) }));
  chipSetInfo = { id: chipSetNode.id, name: chipSetNode.name, size: size(chipSetNode), toneOptions: toneDef ? toneDef.variantOptions : null, variants: variantChildren };
} else { notes.push('Chip 세트(' + KNOWN.chipSet + ')를 못 찾았다'); }

/* ======== 5. mainFrame 존재 확인(참고용) ======== */
const mainFrame = await figma.getNodeByIdAsync(KNOWN.mainFrame);
if (!mainFrame) notes.push('메인 화면(' + KNOWN.mainFrame + ')을 못 찾았다 — id 가 바뀌었을 수 있다');

return out({
  scriptVersion: SCRIPT_VERSION, mode: 'READ_ONLY_DISCOVERY',
  summary: {
    totalComponentsAndSets: componentRows.length,
    buttonMatches: summaryByPattern.button.length, selectMatches: summaryByPattern.select.length,
    inputMatches: summaryByPattern.input.length, chipMatches: summaryByPattern.chip.length,
    iconMatches: summaryByPattern.icon.length, navItemMatches: summaryByPattern.navItem.length,
    relevantIconCount: relevantIcons.length,
    mainFrameFound: !!mainFrame
  },
  byPattern: summaryByPattern,
  relevantIcons,
  chipSetInfo,
  allComponents: componentRows,
  notes, errorCount: errors.length, errors
});
