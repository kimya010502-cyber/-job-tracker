/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 21 (v2)
 * Phase E · Application Card 12장을 App Card 인스턴스로 교체
 *
 * v1 에서 바뀐 것은 "무엇을 읽는가" 하나다.
 *   v1 은 카드 안의 모든 FRAME 을 칩 후보로 훑었고, 그래서 wrapper 프레임이
 *   칩으로 잡혀 역할이 한 칸씩 밀렸다 (company 가 null, stage 가 '지원일').
 *   v2 는 훑지 않는다. 구조로 찾는다.
 *     old 카드 : 라벨 row → 같은 row 의 오른쪽 값
 *     마스터    : audit 이 확인한 node id 로 직접 집는다
 *     칩       : Chip 컴포넌트 세트 인스턴스만 칩으로 본다
 *
 * 안전장치는 v1 그대로다.
 *   DRY_RUN = true 인 동안 파일을 한 글자도 바꾸지 않는다.
 *   모든 쓰기는 W() 를 지나고, DRY_RUN 이면 W() 가 예외를 던진다.
 *   결과의 mutationCount 가 0 이 아니면 그 자체가 오류다.
 * ========================================================================== */

const SCRIPT_VERSION = '21-v2-phaseE-appcard-replace';
const DRY_RUN = true;          // APPLY 할 때만 false 로 바꾼다

const GRID_ID = '1002:140';
const APPCARD_SET_ID = '1037:2163';
const CHIP_SET_ID = '1029:1984';          // 칩은 이 세트의 인스턴스만 인정한다
const STATUS_INDICATOR_SET_NAME = 'Status Indicator';
const ICON_BUTTON_NAME = 'Icon Button';
const VARIANT_IDS = { inProgress: '1037:2093', ended: '1037:2128' };

const PROBE_KEY = 'joob.phaseE.probe';
const REQUIRED_PROBE_MAJOR = '20b-v4';

const ARCHIVE_NAME = '[Archive] Phase E — Original Application Cards';
const STAGING_NAME = '[Temp] Phase E — Prepared App Cards';

const OLD_CARD_IDS = [
  '1002:141', '1003:1749', '1003:1794', '1003:1839',
  '1003:1884', '1003:1929', '1003:1974', '1003:2019',
  '1009:3', '1009:48', '1009:93', '1009:138'
];

const HUMAN_VARIANT_DECISION = { '1003:1794': 'ended' };
const HUMAN_DEFAULT_TONE = 'inProgress';

/* audit v4 가 확인한 마스터 안의 역할별 node id.
 * 마스터를 heuristic 으로 훑지 않고 이 id 로 직접 집는다.
 * 집은 뒤에는 "정말 그 variant 안에 있고 기대한 종류인가" 를 다시 확인한다. */
const MASTER_ROLE_IDS = {
  inProgress: {
    variantId: '1037:2093',
    company: '1037:2098', position: '1037:2099', stage: '1037:2105', status: '1037:2110',
    appliedDate: '1037:2115', schedule: '1037:2118', stageCount: '1037:2120',
    link: '1037:2124', more: '1037:2126', statusIndicator: '1037:2096'
  },
  ended: {
    variantId: '1037:2128',
    company: '1037:2133', position: '1037:2134', stage: '1037:2140', status: '1037:2145',
    appliedDate: '1037:2150', schedule: '1037:2153', stageCount: '1037:2155',
    link: '1037:2159', more: '1037:2161', statusIndicator: '1037:2131'
  }
};
const CHIP_ROLES = ['position', 'stage', 'status', 'stageCount'];
const TEXT_ROLES = ['company', 'position', 'stage', 'status', 'appliedDate', 'schedule', 'stageCount'];

/* old 카드의 라벨 — 정확히 일치할 때만 라벨로 본다.
 * "일정" 을 부분일치로 찾으면 상태값 "일정 조율" 까지 걸린다. */
const LABELS = {
  stage: ['현재 단계', '현재단계'],
  status: ['전형 상태', '전형상태'],
  appliedDate: ['지원일'],
  schedule: ['일정']
};

const STATUS_TONE_TABLE = [
  { match: /접수\s*완료|접수/, tone: 'brand' },
  { match: /서류\s*확인|서류\s*검토|서류\s*통과/, tone: 'success' },
  { match: /일정\s*조율|일정\s*협의/, tone: 'brand' },
  { match: /불합격|탈락/, tone: 'danger' }
];
const CHIP_ROLE_TONES = { position: 'neutral', stage: 'neutral', stageCount: 'neutral' };

const ICONS = { dot: 'Icon / Dot', link: 'Icon / External Link', more: 'Icon / More' };

const notes = [];
const errors = [];
const r2 = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
const near = (a, b, t) => typeof a === 'number' && typeof b === 'number' &&
                          Math.abs(a - b) < (typeof t === 'number' ? t : 0.5);
const trim = s => (typeof s === 'string' ? s.trim() : s);

function out(obj) {
  try { print(JSON.stringify(obj, null, 2)); } catch (e) { /* Scripter 아님 */ }
  return obj;
}
function safeGet(node, key) {
  try { const v = node[key]; return typeof v === 'undefined' ? null : v; } catch (e) { return null; }
}
function kids(n) { return Array.isArray(n.children) ? n.children : null; }
function collectDeep(n, pred, depth, acc) {
  acc = acc || [];
  const cs = kids(n);
  if (!cs || depth <= 0) return acc;
  for (const c of cs) { if (pred(c)) acc.push(c); collectDeep(c, pred, depth - 1, acc); }
  return acc;
}
async function mainCompOf(inst) {
  try { return await inst.getMainComponentAsync(); }
  catch (e) { try { return inst.mainComponent; } catch (e2) { return null; } }
}
async function mainSetIdOf(inst) {
  const mc = await mainCompOf(inst);
  return mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.id : null;
}
async function mainSetNameOf(inst) {
  const mc = await mainCompOf(inst);
  return mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : null;
}
function isDescendantOf(node, root) {
  let cur = node;
  while (cur) { if (cur.id === root.id) return true; cur = cur.parent; }
  return false;
}
function firstText(node) {
  return collectDeep(node, x => x.type === 'TEXT', 4)[0] || null;
}
function textIn(node) {
  const t = firstText(node);
  return t ? t.characters : null;
}

/* ---------- 쓰기 관문 ---------- */
let mutationCount = 0;
const mutationLog = [];
function W(what, fn) {
  if (DRY_RUN) throw new Error('DRY_RUN 인데 쓰기를 시도했다: ' + what);
  mutationCount++;
  mutationLog.push(what);
  return fn();
}

/* ---------- 노드 경로 ---------- */
function pathOf(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur.id !== root.id) {
    const p = cur.parent;
    if (!p || !Array.isArray(p.children)) return null;
    path.unshift(p.children.indexOf(cur));
    cur = p;
  }
  return cur && cur.id === root.id ? path : null;
}
function atPath(root, path) {
  let cur = root;
  for (const i of path) {
    const cs = kids(cur);
    if (!cs || i < 0 || i >= cs.length) return null;
    cur = cs[i];
  }
  return cur;
}

/* ---------- 색 ---------- */
function hexOf(paint) {
  if (!paint || paint.type !== 'SOLID' || !paint.color) return null;
  const h = v => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return ('#' + h(paint.color.r) + h(paint.color.g) + h(paint.color.b)).toUpperCase();
}
async function firstFill(node) {
  const fills = safeGet(node, 'fills');
  if (!Array.isArray(fills)) return null;
  for (const f of fills) {
    if (f.visible === false) continue;
    let variable = null;
    try {
      const bound = f.boundVariables && f.boundVariables.color;
      if (bound && bound.id) {
        const v = await figma.variables.getVariableByIdAsync(bound.id);
        variable = v ? v.name : bound.id;
      }
    } catch (e) { /* 변수 못 읽어도 색은 남긴다 */ }
    return { hex: hexOf(f), type: f.type, variable };
  }
  return null;
}
function toneForStatus(text) {
  const t = text || '';
  for (const row of STATUS_TONE_TABLE) if (row.match.test(t)) return row.tone;
  return null;
}

/* ---------- old 카드: 라벨 row 구조로 값을 찾는다 ----------
 * 카드 안 모든 프레임을 훑지 않는다. 라벨 텍스트를 정확히 일치로 찾고,
 * 그 라벨이 속한 row 안에서 오른쪽 값을 집는다. */
function labelTextNode(card, names) {
  const texts = collectDeep(card, x => x.type === 'TEXT', 8);
  for (const t of texts) {
    const c = trim(t.characters);
    if (names.indexOf(c) >= 0) return t;
  }
  return null;
}
/* 라벨이 든 가장 가까운 조상 중, 라벨 말고 다른 TEXT 도 들어 있는 것 = 그 row */
function rowOf(labelNode, card) {
  let cur = labelNode.parent;
  while (cur && cur.id !== card.id) {
    const texts = collectDeep(cur, x => x.type === 'TEXT', 6);
    if (texts.length >= 2) return cur;
    cur = cur.parent;
  }
  return null;
}
/* row 안에서 라벨이 아닌 값 텍스트 — 가장 오른쪽 것 */
function valueTextInRow(row, labelNode) {
  const texts = collectDeep(row, x => x.type === 'TEXT', 6)
    .filter(t => t.id !== labelNode.id)
    .sort((a, b) => b.x - a.x);
  return texts[0] || null;
}
/* 값 텍스트를 감싸고 있는 Background 배지 (없으면 null) */
function backgroundAround(node, stopAt) {
  let cur = node ? node.parent : null;
  while (cur && cur.id !== stopAt.id) {
    if (/^background$/i.test(cur.name || '')) return cur;
    cur = cur.parent;
  }
  return null;
}

/* ---------- 마스터: audit 이 확인한 id 로 직접 집는다 ---------- */
async function resolveMaster(tone) {
  const ids = MASTER_ROLE_IDS[tone];
  const variant = await figma.getNodeByIdAsync(ids.variantId);
  const rec = { tone, variantId: ids.variantId, found: !!variant, issues: [], roles: {} };
  if (!variant || variant.type !== 'COMPONENT') {
    rec.issues.push('variant 컴포넌트를 찾지 못했다: ' + ids.variantId);
    return rec;
  }
  rec.variantName = variant.name;
  rec.width = r2(variant.width); rec.height = r2(variant.height);
  rec.size = rec.width + '×' + rec.height;

  for (const role of ['company', 'position', 'stage', 'status', 'appliedDate',
                      'schedule', 'stageCount', 'link', 'more', 'statusIndicator']) {
    const id = ids[role];
    const node = await figma.getNodeByIdAsync(id);
    const entry = { role, expectedId: id, found: !!node };
    if (!node) { rec.issues.push(role + ' node ' + id + ' 를 찾지 못했다'); rec.roles[role] = entry; continue; }
    entry.name = node.name;
    entry.type = node.type;
    entry.insideVariant = isDescendantOf(node, variant);
    entry.path = pathOf(node, variant);
    if (!entry.insideVariant || !entry.path) {
      rec.issues.push(role + ' node ' + id + ' 가 variant ' + ids.variantId + ' 안에 없다');
    }
    rec.roles[role] = entry;
  }

  /* 칩 4개 — 반드시 Chip 세트 인스턴스여야 한다 */
  for (const role of CHIP_ROLES) {
    const e = rec.roles[role];
    if (!e || !e.found) continue;
    const node = await figma.getNodeByIdAsync(e.expectedId);
    e.isInstance = node.type === 'INSTANCE';
    e.mainSetId = e.isInstance ? await mainSetIdOf(node) : null;
    e.isChipInstance = e.isInstance && e.mainSetId === CHIP_SET_ID;
    const t = firstText(node);
    e.textPath = t ? pathOf(t, variant) : null;
    e.placeholderText = t ? t.characters : null;
    if (!e.isChipInstance) {
      rec.issues.push(role + ' 이 Chip 세트(' + CHIP_SET_ID + ') 인스턴스가 아니다 — ' +
        e.type + ' / mainSet ' + e.mainSetId);
    }
    if (!e.textPath) rec.issues.push(role + ' 칩 안에서 TEXT 를 찾지 못했다');
  }

  /* 본문 텍스트 3개 */
  for (const role of ['company', 'appliedDate', 'schedule']) {
    const e = rec.roles[role];
    if (!e || !e.found) continue;
    const node = await figma.getNodeByIdAsync(e.expectedId);
    e.isText = node.type === 'TEXT';
    e.textPath = e.isText ? e.path : (function () {
      const t = firstText(node);
      return t ? pathOf(t, variant) : null;
    })();
    e.placeholderText = e.isText ? node.characters : textIn(node);
    const fn = e.isText ? safeGet(node, 'fontName') : null;
    e.fontName = fn && fn.family ? (fn.family + ' / ' + fn.style) : null;
    e.fontIsMixed = fn === figma.mixed;
    if (!e.textPath) rec.issues.push(role + ' 의 TEXT 위치를 찾지 못했다');
  }

  /* stage count 안의 leading Dot */
  const scEntry = rec.roles.stageCount;
  if (scEntry && scEntry.found) {
    const sc = await figma.getNodeByIdAsync(scEntry.expectedId);
    const lead = collectDeep(sc, x => /^leading$/i.test(x.name || ''), 4)[0] ||
                 collectDeep(sc, x => x.type === 'INSTANCE', 3)[0] || null;
    const leadMain = lead && lead.type === 'INSTANCE' ? await mainCompOf(lead) : null;
    rec.stageCountDot = {
      exists: !!lead, name: lead ? lead.name : null, type: lead ? lead.type : null,
      path: lead ? pathOf(lead, variant) : null,
      mainComponent: leadMain ? leadMain.name : null,
      isDotIcon: !!leadMain && leadMain.name === ICONS.dot,
      visibleByDefault: lead ? lead.visible : null
    };
    if (!rec.stageCountDot.exists) rec.issues.push('stage count 칩 안에서 leading 을 찾지 못했다');
    else if (!rec.stageCountDot.isDotIcon) {
      rec.issues.push('stage count 의 leading 이 ' + ICONS.dot + ' 가 아니다: ' + rec.stageCountDot.mainComponent);
    }
  } else rec.stageCountDot = { exists: false };

  /* link / more — 바깥은 Icon Button, 안쪽 아이콘은 따로 본다 */
  rec.iconButtons = {};
  for (const role of ['link', 'more']) {
    const e = rec.roles[role];
    const entry = { role, expectedId: e ? e.expectedId : null, outerFound: !!(e && e.found) };
    if (e && e.found) {
      const outer = await figma.getNodeByIdAsync(e.expectedId);
      const outerMain = outer.type === 'INSTANCE' ? await mainCompOf(outer) : null;
      const outerSetName = outer.type === 'INSTANCE' ? await mainSetNameOf(outer) : null;
      entry.outerName = outer.name;
      entry.outerMainComponent = outerMain ? outerMain.name : null;
      entry.outerMainSetName = outerSetName;
      entry.outerIsIconButton = (outerSetName === ICON_BUTTON_NAME) ||
        (!!outerMain && outerMain.name === ICON_BUTTON_NAME) ||
        new RegExp(ICON_BUTTON_NAME, 'i').test(outer.name || '');
      entry.outerVisible = outer.visible;
      entry.outerPath = pathOf(outer, variant);
      /* 안쪽 아이콘 — 바깥 자신을 뺀 중첩 인스턴스 중 Icon / 으로 시작하는 것 */
      const wantInner = role === 'link' ? ICONS.link : ICONS.more;
      let innerNode = null, innerMain = null;
      for (const cand of collectDeep(outer, x => x.type === 'INSTANCE', 4)) {
        const mc = await mainCompOf(cand);
        if (mc && mc.name === wantInner) { innerNode = cand; innerMain = mc; break; }
        if (!innerNode && mc && /^Icon \//.test(mc.name || '')) { innerNode = cand; innerMain = mc; }
      }
      entry.innerFound = !!innerNode;
      entry.innerName = innerNode ? innerNode.name : null;
      entry.innerMainComponent = innerMain ? innerMain.name : null;
      entry.innerExpected = wantInner;
      entry.innerMatches = !!innerMain && innerMain.name === wantInner;
      entry.innerVisible = innerNode ? innerNode.visible : null;
      entry.innerPath = innerNode ? pathOf(innerNode, variant) : null;
      entry.ok = entry.outerIsIconButton && entry.innerMatches;
      if (!entry.outerIsIconButton) rec.issues.push(role + ' 의 바깥이 ' + ICON_BUTTON_NAME + ' 이 아니다');
      if (!entry.innerMatches) {
        rec.issues.push(role + ' 안쪽 아이콘이 ' + wantInner + ' 가 아니다: ' + entry.innerMainComponent);
      }
    } else rec.issues.push(role + ' 아이콘 버튼을 찾지 못했다');
    rec.iconButtons[role] = entry;
  }

  /* Status Indicator — 세트 이름으로 확인한다 */
  const siEntry = rec.roles.statusIndicator;
  if (siEntry && siEntry.found) {
    const si = await figma.getNodeByIdAsync(siEntry.expectedId);
    const setName = si.type === 'INSTANCE' ? await mainSetNameOf(si) : null;
    const mc = si.type === 'INSTANCE' ? await mainCompOf(si) : null;
    let props = null;
    try { props = si.type === 'INSTANCE' ? si.componentProperties : null; } catch (e) { /* 무시 */ }
    rec.statusIndicator = {
      id: si.id, name: si.name, type: si.type,
      mainSetName: setName, mainComponent: mc ? mc.name : null,
      isStatusIndicator: setName === STATUS_INDICATOR_SET_NAME,
      properties: props ? Object.keys(props).map(k => k.split('#')[0] + '=' + props[k].value) : [],
      variantValues: props ? Object.keys(props).map(k => String(props[k].value)) : [],
      path: siEntry.path, visible: si.visible
    };
    if (!rec.statusIndicator.isStatusIndicator) {
      rec.issues.push('Status Indicator 의 컴포넌트 세트 이름이 "' + STATUS_INDICATOR_SET_NAME +
        '" 가 아니다: ' + setName);
    }
    const wantState = tone;
    rec.statusIndicator.matchesTone = rec.statusIndicator.variantValues.length === 0 ||
      rec.statusIndicator.variantValues.some(v => v.toLowerCase() === wantState.toLowerCase()) ||
      (!!mc && new RegExp(wantState, 'i').test(mc.name || ''));
    if (!rec.statusIndicator.matchesTone) {
      rec.issues.push('Status Indicator 상태가 variant tone(' + wantState + ') 과 다르다: ' +
        rec.statusIndicator.properties.join(', '));
    }
  } else rec.statusIndicator = { found: false };

  rec.resolved = rec.issues.length === 0;
  return rec;
}

/* ---------- Chip 세트의 tone 속성 ---------- */
async function readChipToneProperty() {
  const chipSet = await figma.getNodeByIdAsync(CHIP_SET_ID);
  if (!chipSet) return { found: false, reason: CHIP_SET_ID + ' 를 찾지 못했다' };
  let defs = null;
  try { defs = chipSet.componentPropertyDefinitions; } catch (e) { return { found: false, reason: e.message }; }
  if (!defs) return { found: false, reason: '속성 정의를 읽지 못했다' };
  for (const key of Object.keys(defs)) {
    const d = defs[key];
    if (d.type !== 'VARIANT' || !Array.isArray(d.variantOptions)) continue;
    const opts = d.variantOptions.map(o => String(o));
    const hits = ['neutral', 'brand', 'success', 'danger'].filter(t => opts.some(o => o.toLowerCase() === t));
    if (hits.length >= 2) {
      return { found: true, setId: CHIP_SET_ID, propertyKey: key, propertyName: key.split('#')[0],
        options: opts, defaultValue: d.defaultValue };
    }
  }
  return { found: false, reason: 'tone 처럼 보이는 VARIANT 속성을 찾지 못했다',
    propertyKeys: Object.keys(defs) };
}

/* ---------- old 카드 읽기 (구조 기반) ---------- */
async function readOldCard(card) {
  const rec = { srcId: card.id, name: card.name, issues: [],
    content: {}, sources: {}, evidence: {} };

  /* A. company — Heading 안의 TEXT */
  const heading = collectDeep(card, x => /heading/i.test(x.name || ''), 6)[0] || null;
  let companyNode = heading ? firstText(heading) : null;
  if (!companyNode) {
    /* 폴백: 카드 위쪽에서 가장 큰 글자 */
    const texts = collectDeep(card, x => x.type === 'TEXT', 8)
      .sort((a, b) => (safeGet(b, 'fontSize') || 0) - (safeGet(a, 'fontSize') || 0) || a.y - b.y);
    companyNode = texts[0] || null;
    rec.sources.company = companyNode ? '폴백: 가장 큰 글자' : null;
  } else rec.sources.company = 'Heading 안의 TEXT';
  rec.content.company = companyNode ? trim(companyNode.characters) : null;
  rec.evidence.companyNodeId = companyNode ? companyNode.id : null;
  rec.evidence.headingNodeId = heading ? heading.id : null;

  /* B~F. 라벨 row 구조 */
  const rowInfo = {};
  for (const role of ['stage', 'status', 'appliedDate', 'schedule']) {
    const label = labelTextNode(card, LABELS[role]);
    if (!label) { rec.issues.push(role + ' 라벨(' + LABELS[role].join('/') + ')을 찾지 못했다'); continue; }
    const row = rowOf(label, card);
    if (!row) { rec.issues.push(role + ' 라벨이 든 row 를 찾지 못했다'); continue; }
    const value = valueTextInRow(row, label);
    if (!value) { rec.issues.push(role + ' row 안에서 값 텍스트를 찾지 못했다'); continue; }
    const bg = backgroundAround(value, row);
    rowInfo[role] = { labelId: label.id, rowId: row.id, rowName: row.name,
      valueId: value.id, backgroundId: bg ? bg.id : null };
    rec.content[role] = trim(value.characters);
    rec.evidence[role + 'NodeId'] = bg ? bg.id : value.id;
    rec.evidence[role + 'ValueTextId'] = value.id;
    rec.sources[role] = bg ? '라벨 row 오른쪽 Background' : '라벨 row 오른쪽 TEXT';
    if (bg) {
      const fill = await firstFill(bg);
      rec.evidence[role + 'Fill'] = fill ? fill.hex : null;
      rec.evidence[role + 'FillVariable'] = fill ? fill.variable : null;
    }
  }
  rec.evidence.rows = rowInfo;

  /* B. position — header 안, company 옆의 Background 배지 */
  const usedBg = ['stage', 'status'].map(k => rowInfo[k] ? rowInfo[k].backgroundId : null).filter(Boolean);
  const backgrounds = collectDeep(card, x => /^background$/i.test(x.name || ''), 8);
  const bgRecords = [];
  for (const bg of backgrounds) {
    const t = firstText(bg);
    const fill = await firstFill(bg);
    bgRecords.push({ id: bg.id, x: r2(bg.x), y: r2(bg.y),
      text: t ? trim(t.characters) : null, textId: t ? t.id : null,
      fill: fill ? fill.hex : null, fillVariable: fill ? fill.variable : null,
      hasVector: collectDeep(bg, v => v.type === 'VECTOR', 3).length > 0,
      used: usedBg.indexOf(bg.id) >= 0 });
  }
  rec.evidence.backgrounds = bgRecords;

  const headerY = companyNode ? r2(companyNode.y) : null;
  const freeBg = bgRecords.filter(b => !b.used && b.text);
  /* position = company 와 같은 줄에 있는 배지 (가장 가까운 y) */
  let positionBg = null;
  if (headerY !== null) {
    const sameRow = freeBg.filter(b => Math.abs(b.y - headerY) <= 24)
      .sort((a, b) => Math.abs(a.y - headerY) - Math.abs(b.y - headerY) || b.x - a.x);
    positionBg = sameRow[0] || null;
  }
  if (!positionBg) {
    const topMost = freeBg.slice().sort((a, b) => a.y - b.y)[0] || null;
    positionBg = topMost;
    if (positionBg) rec.sources.position = '폴백: 남은 배지 중 가장 위';
  } else rec.sources.position = 'company 와 같은 줄의 Background 배지';
  if (positionBg) {
    rec.content.position = positionBg.text;
    rec.evidence.positionNodeId = positionBg.id;
    rec.evidence.positionFill = positionBg.fill;
    rec.evidence.positionFillVariable = positionBg.fillVariable;
  } else rec.issues.push('position 배지를 찾지 못했다');

  /* G. stageCount — 남은 배지 중 숫자 텍스트 + 아이콘, 카드 아래쪽 왼쪽 */
  const stillFree = freeBg.filter(b => !positionBg || b.id !== positionBg.id);
  const numeric = stillFree.filter(b => /^\s*\d+\s*$/.test(b.text || '') || /\d/.test(b.text || ''));
  const withIcon = numeric.filter(b => b.hasVector);
  const pool = withIcon.length ? withIcon : numeric;
  const stageCountBg = pool.slice().sort((a, b) => b.y - a.y || a.x - b.x)[0] || null;
  if (stageCountBg) {
    rec.content.stageCount = stageCountBg.text;
    rec.evidence.stageCountNodeId = stageCountBg.id;
    rec.evidence.stageCountHasIcon = stageCountBg.hasVector;
    rec.sources.stageCount = withIcon.length ? '아이콘이 든 숫자 배지 (카드 하단)' : '숫자 배지 (카드 하단)';
  } else rec.issues.push('stage count 배지를 찾지 못했다');

  /* 값이 비었는지 — "-" 는 정상 값이다 */
  for (const role of TEXT_ROLES) {
    const v = rec.content[role];
    if (v === null || typeof v === 'undefined' || v === '') rec.issues.push(role + ' 값을 읽지 못했다');
  }
  rec.resolved = rec.issues.length === 0;
  return rec;
}

/* ---------- 시작 ---------- */
const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: DRY_RUN ? 'DRY_RUN' : 'APPLY',
  aborted: true, reason: GRID_ID + ' 를 찾을 수 없다', mutationCount });

const gridChildren = kids(grid) || [];
function trackValue(t) {
  if (typeof t === 'number') return r2(t);
  if (t && typeof t === 'object') {
    for (const k of ['value', 'size', 'length', 'px', 'fixed']) if (typeof t[k] === 'number') return r2(t[k]);
  }
  return null;
}
function uniqSorted(list) {
  const acc = [];
  for (const v of list) if (!acc.some(x => Math.abs(x - v) < 1)) acc.push(v);
  return acc.sort((a, b) => a - b);
}
const rawRowTracks = safeGet(grid, 'gridRowSizes');
const gridInfo = {
  id: grid.id, name: grid.name,
  size: r2(grid.width) + '×' + r2(grid.height),
  width: r2(grid.width), height: r2(grid.height), x: r2(grid.x), y: r2(grid.y),
  layoutMode: safeGet(grid, 'layoutMode'),
  gridRowCount: safeGet(grid, 'gridRowCount'),
  gridColumnCount: safeGet(grid, 'gridColumnCount'),
  gridRowGap: safeGet(grid, 'gridRowGap'),
  gridColumnGap: safeGet(grid, 'gridColumnGap'),
  clipsContent: safeGet(grid, 'clipsContent'),
  layoutSizingVertical: safeGet(grid, 'layoutSizingVertical'),
  childCount: gridChildren.length,
  rowTracks: Array.isArray(rawRowTracks) ? rawRowTracks.map(trackValue) : null,
  rowTrackTypes: Array.isArray(rawRowTracks)
    ? rawRowTracks.map(t => (t && typeof t === 'object' ? (t.type || null) : 'NUMBER')) : null,
  rowYs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.y))),
  columnXs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.x)))
};
function cellOf(node) {
  return {
    row: safeGet(node, 'gridRowAnchorIndex'), col: safeGet(node, 'gridColumnAnchorIndex'),
    rowSpan: safeGet(node, 'gridRowSpan'), colSpan: safeGet(node, 'gridColumnSpan'),
    x: r2(node.x), y: r2(node.y), width: r2(node.width), height: r2(node.height)
  };
}

/* ---------- probe 결과 ---------- */
function snapshotOf(node) {
  const cs = kids(node) || [];
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
    childCount: cs.length,
    children: cs.map((c, i) => ({
      i, id: c.id, name: c.name, type: c.type, visible: c.visible,
      x: r2(c.x), y: r2(c.y), width: r2(c.width), height: r2(c.height),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex'),
      rowSpan: safeGet(c, 'gridRowSpan'), colSpan: safeGet(c, 'gridColumnSpan')
    }))
  };
}
function hashOf(obj) {
  const str = JSON.stringify(obj);
  let h = 5381;
  for (let k = 0; k < str.length; k++) h = ((h * 33) ^ str.charCodeAt(k)) >>> 0;
  return 'h' + h.toString(16) + '-' + str.length;
}
const currentGridHash = hashOf(snapshotOf(grid));
let probe = null;
const probeStatus = { key: PROBE_KEY, found: false, versionMatches: false, fresh: false, reason: null };
try {
  const raw = figma.root.getPluginData(PROBE_KEY);
  if (!raw) { probeStatus.reason = '20b v4 probe 를 아직 실행하지 않았다'; }
  else {
    probeStatus.found = true;
    const parsed = JSON.parse(raw);
    probeStatus.probeVersion = parsed.probeVersion || null;
    probeStatus.versionMatches = typeof parsed.probeVersion === 'string' &&
      parsed.probeVersion.indexOf(REQUIRED_PROBE_MAJOR) === 0;
    probeStatus.hashAtProbeTime = parsed.sourceHashAtProbeTime || null;
    probeStatus.hashNow = currentGridHash;
    probeStatus.fresh = parsed.sourceHashAtProbeTime === currentGridHash;
    if (probeStatus.versionMatches && probeStatus.fresh) probe = parsed;
    else probeStatus.reason = !probeStatus.versionMatches
      ? ('probe 결과가 ' + probeStatus.probeVersion + ' 이다 — ' + REQUIRED_PROBE_MAJOR + ' 만 쓴다')
      : 'probe 실행 이후 그리드가 바뀌었다 — 낡은 근거라 쓰지 않는다';
  }
} catch (e) { probeStatus.reason = 'probe 결과를 읽지 못했다: ' + e.message; }

/* ---------- 대상 ---------- */
const targets = [];
const missingIds = [];
for (const id of OLD_CARD_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { missingIds.push(id); continue; }
  targets.push(n);
}
const notInGrid = targets.filter(n => !n.parent || n.parent.id !== GRID_ID).map(n => n.id);
const extraChildren = gridChildren.filter(c => OLD_CARD_IDS.indexOf(c.id) < 0)
  .map(c => ({ id: c.id, name: c.name, type: c.type }));
const alreadyAppCard = [];
for (const c of gridChildren) {
  if (c.type !== 'INSTANCE') continue;
  const sid = await mainSetIdOf(c);
  if (sid === APPCARD_SET_ID) alreadyAppCard.push(c.id);
}

const masterInProgress = await resolveMaster('inProgress');
const masterEnded = await resolveMaster('ended');
const chipToneProperty = await readChipToneProperty();
function toneOptionFor(tone) {
  if (!chipToneProperty.found) return null;
  return chipToneProperty.options.filter(o => o.toLowerCase() === String(tone).toLowerCase())[0] || null;
}

/* ---------- 카드별 계획 ---------- */
const plan = [];
for (let i = 0; i < targets.length; i++) {
  const node = targets[i];
  const old = await readOldCard(node);
  const cell = cellOf(node);
  const tone = HUMAN_VARIANT_DECISION[node.id] || HUMAN_DEFAULT_TONE;
  const master = tone === 'ended' ? masterEnded : masterInProgress;
  const statusTone = toneForStatus(old.content.status);

  const chipPlan = {};
  for (const role of CHIP_ROLES) {
    const want = role === 'status' ? statusTone : CHIP_ROLE_TONES[role];
    chipPlan[role] = {
      text: old.content[role],
      tone: want,
      toneOption: want ? toneOptionFor(want) : null,
      toneSource: role === 'status' ? '사용자 확정 표 (상태 텍스트 기준)' : '역할 고정값',
      oldNodeId: old.evidence[role + 'NodeId'] || null,
      oldFill: old.evidence[role + 'Fill'] || null,
      oldFillVariable: old.evidence[role + 'FillVariable'] || null
    };
  }

  const item = {
    key: 'card-' + (i + 1),
    srcId: old.srcId, srcName: old.name,
    originalIndex: gridChildren.indexOf(node),
    oldCell: 'r' + cell.row + 'c' + cell.col,
    oldRow: cell.row, oldColumn: cell.col,
    oldRowSpan: cell.rowSpan, oldColumnSpan: cell.colSpan,
    oldX: cell.x, oldY: cell.y,
    oldSize: cell.width + '×' + cell.height,
    oldSizing: { h: safeGet(node, 'layoutSizingHorizontal'),
                 v: safeGet(node, 'layoutSizingVertical'), grow: safeGet(node, 'layoutGrow') },

    company: old.content.company,
    position: old.content.position,
    stage: old.content.stage,
    status: old.content.status,
    appliedDate: old.content.appliedDate,
    schedule: old.content.schedule,
    stageCount: old.content.stageCount,

    companyNodeId: old.evidence.companyNodeId || null,
    positionNodeId: old.evidence.positionNodeId || null,
    stageNodeId: old.evidence.stageNodeId || null,
    statusNodeId: old.evidence.statusNodeId || null,
    appliedDateNodeId: old.evidence.appliedDateNodeId || null,
    scheduleNodeId: old.evidence.scheduleNodeId || null,
    stageCountNodeId: old.evidence.stageCountNodeId || null,
    roleSources: old.sources,

    plannedVariant: 'state=' + tone,
    plannedVariantId: VARIANT_IDS[tone],
    variantDecisionSource: HUMAN_VARIANT_DECISION[old.srcId]
      ? 'human-explicit (사용자 확정)' : 'human-rule (나머지는 inProgress)',

    chipTones: {
      position: chipPlan.position.tone + ' → ' + chipPlan.position.toneOption,
      stage: chipPlan.stage.tone + ' → ' + chipPlan.stage.toneOption,
      status: chipPlan.status.tone + ' → ' + chipPlan.status.toneOption,
      stageCount: chipPlan.stageCount.tone + ' → ' + chipPlan.stageCount.toneOption
    },
    chipPlan,

    stageCountDot: master && master.stageCountDot ? {
      leadingExists: master.stageCountDot.exists,
      mainComponent: master.stageCountDot.mainComponent,
      mainComponentIsDot: master.stageCountDot.isDotIcon,
      visibleByDefault: master.stageCountDot.visibleByDefault,
      plannedVisible: true,
      path: master.stageCountDot.path
    } : { leadingExists: false, plannedVisible: true },
    otherChipLeading: ['position', 'stage', 'status'].map(role => ({
      role, plannedVisible: false, plannedChange: false,
      note: '기본 숨김 상태를 그대로 둔다' })),

    linkIcon: master ? {
      outer: master.iconButtons.link.outerMainComponent || master.iconButtons.link.outerName,
      outerIsIconButton: master.iconButtons.link.outerIsIconButton,
      inner: master.iconButtons.link.innerMainComponent,
      innerExpected: ICONS.link,
      innerMatches: master.iconButtons.link.innerMatches,
      plannedVisible: true, ok: master.iconButtons.link.ok } : null,
    moreIcon: master ? {
      outer: master.iconButtons.more.outerMainComponent || master.iconButtons.more.outerName,
      outerIsIconButton: master.iconButtons.more.outerIsIconButton,
      inner: master.iconButtons.more.innerMainComponent,
      innerExpected: ICONS.more,
      innerMatches: master.iconButtons.more.innerMatches,
      plannedVisible: true, ok: master.iconButtons.more.ok } : null,

    statusIndicator: master && master.statusIndicator ? {
      id: master.statusIndicator.id,
      mainSetName: master.statusIndicator.mainSetName,
      properties: master.statusIndicator.properties,
      expectedState: tone,
      matchesTone: master.statusIndicator.matchesTone,
      overridePlanned: false,
      note: 'variant 가 주는 상태를 그대로 쓰고 read-back 으로만 확인한다' } : null,

    plannedSizing: { layoutSizingHorizontal: 'FILL', layoutGrow: 1,
      layoutSizingVertical: '마스터 값 유지 (강제하지 않음)',
      whenApplied: 'GRID 에 들어간 뒤에만 설정한다. staging 안에서는 FILL 을 설정하지 않는다' },
    predictedSize: master && master.width ? (master.width + '×' + master.height) : null,
    predictedCell: 'r' + cell.row + 'c' + cell.col,
    predictedXY: cell.x + ',' + cell.y,

    archiveMetadata: {
      srcId: old.srcId, originalIndex: gridChildren.indexOf(node),
      row: cell.row, column: cell.col, rowSpan: cell.rowSpan, columnSpan: cell.colSpan,
      x: cell.x, y: cell.y, width: cell.width, height: cell.height
    },

    contentResolved: old.resolved,
    statusToneResolved: !!chipPlan.status.toneOption,
    issues: old.issues.slice(),
    _old: old
  };
  if (!item.statusToneResolved) {
    item.issues.push('상태 "' + old.content.status + '" 에 맞는 tone 을 정하지 못했다' +
      (chipToneProperty.found ? '' : ' (Chip tone 속성 자체를 못 찾았다)'));
  }
  item.allRoleNodeIdsPresent = TEXT_ROLES.every(k => !!item[k + 'NodeId']);
  item.ready = item.contentResolved && item.statusToneResolved && item.allRoleNodeIdsPresent &&
    !!item.plannedVariantId && item.stageCountDot.leadingExists === true;
  plan.push(item);
}
for (const p of plan) if (p.issues.length) notes.push(p.key + ' (' + p.srcId + '): ' + p.issues.join(' / '));

/* ---------- preflight ---------- */
const pageKids = kids(figma.currentPage) || [];
const existingArchive = pageKids.filter(c => c.name === ARCHIVE_NAME).map(c => c.id);
const existingStaging = pageKids.filter(c => c.name === STAGING_NAME).map(c => c.id);
const strayTempFrames = pageKids.filter(c => /\[Temp\]|JOOB PROBE TEMP/i.test(c.name || ''))
  .map(c => ({ id: c.id, name: c.name }));

const masterChipsOk = [masterInProgress, masterEnded].every(m =>
  !!m && CHIP_ROLES.every(r => m.roles[r] && m.roles[r].isChipInstance === true && !!m.roles[r].textPath));
const masterTextsOk = [masterInProgress, masterEnded].every(m =>
  !!m && ['company', 'appliedDate', 'schedule'].every(r => m.roles[r] && !!m.roles[r].textPath));

const preflight = {
  gridExists: !!grid,
  gridIsGridLayout: gridInfo.layoutMode === 'GRID',
  exactly12OldCardsFound: targets.length === 12 && missingIds.length === 0,
  allOldCardsAreGridChildren: notInGrid.length === 0,
  gridChildCountIs12: gridChildren.length === 12,
  noExtraGridChildren: extraChildren.length === 0,
  zeroAppCardInstancesNow: alreadyAppCard.length === 0,
  noDuplicateArchiveFrame: existingArchive.length === 0,
  noDuplicateStagingFrame: existingStaging.length === 0,
  appCardSetFound: !!(await figma.getNodeByIdAsync(APPCARD_SET_ID)),
  bothVariantsFound: !!masterInProgress.found && !!masterEnded.found,
  masterRolesResolved: masterInProgress.resolved === true && masterEnded.resolved === true,
  masterChipsAreChipInstances: masterChipsOk,
  masterTextRolesResolved: masterTextsOk,
  all12VariantMappingsResolved: plan.length === 12 && plan.every(p => !!p.plannedVariantId),
  all12ContentMappingsResolved: plan.length === 12 && plan.every(p => p.contentResolved),
  all4ChipRolesResolvedEveryCard: plan.length === 12 &&
    plan.every(p => CHIP_ROLES.every(r => !!p.chipPlan[r].text)),
  allRoleNodeIdsPresent: plan.length === 12 && plan.every(p => p.allRoleNodeIdsPresent),
  chipTonePropertyFound: chipToneProperty.found === true,
  allChipTonesResolved: plan.length === 12 &&
    plan.every(p => CHIP_ROLES.every(r => !!p.chipPlan[r].toneOption)),
  stageCountDotPathResolved: plan.length === 12 &&
    plan.every(p => p.stageCountDot.leadingExists === true && Array.isArray(p.stageCountDot.path)),
  stageCountDotIsDotIcon: plan.length === 12 && plan.every(p => p.stageCountDot.mainComponentIsDot === true),
  linkIconResolved: plan.length === 12 && plan.every(p => p.linkIcon && p.linkIcon.ok === true),
  moreIconResolved: plan.length === 12 && plan.every(p => p.moreIcon && p.moreIcon.ok === true),
  statusIndicatorResolved: plan.length === 12 &&
    plan.every(p => p.statusIndicator && p.statusIndicator.matchesTone === true),
  probeFindingsPresent: !!probe,
  probeVersionIsV4: probeStatus.versionMatches === true,
  probeHashMatchesGrid: probeStatus.fresh === true,
  replacementStrategySafe: !!probe && probe.replacementStrategySafe === true,
  archiveMoveReleasesCell: !!probe && probe.archiveMoveReleasesCell === true,
  all12AutoPlacedCorrectly: !!probe && probe.all12AutoPlacedCorrectly === true,
  heightScenarioResolved: !!probe && probe.heightScenarioResolved === true,
  everyCardReady: plan.length === 12 && plan.every(p => p.ready)
};
const preflightPassed = Object.keys(preflight).every(k => preflight[k]);
const preflightFailures = Object.keys(preflight).filter(k => !preflight[k]);

if (missingIds.length) errors.push('찾지 못한 old 카드 id: ' + missingIds.join(', '));
if (notInGrid.length) errors.push('그리드 자식이 아닌 old 카드: ' + notInGrid.join(', '));
if (extraChildren.length) errors.push('목록에 없는 그리드 자식: ' + JSON.stringify(extraChildren));
for (const m of [masterInProgress, masterEnded]) {
  if (m && m.issues.length) notes.push('마스터 ' + m.tone + ': ' + m.issues.join(' / '));
}
if (!chipToneProperty.found) notes.push('Chip tone 속성: ' + chipToneProperty.reason);

/* ---------- 예측 ---------- */
const newCardHeight = masterInProgress.height || null;
const trackSize = Array.isArray(gridInfo.rowTracks) ? gridInfo.rowTracks[0] : null;
const lastRowTop = gridInfo.rowYs.length ? gridInfo.rowYs[gridInfo.rowYs.length - 1] : null;
const contentBottom = (lastRowTop !== null && newCardHeight !== null) ? r2(lastRowTop + newCardHeight) : null;
const knownOverflow = contentBottom === null ? null : r2(Math.max(0, contentBottom - gridInfo.height));
const footerNode = await figma.getNodeByIdAsync('1002:451');
const footerTop = footerNode ? r2(footerNode.y) : null;
const footerOverlapAfter = (footerTop !== null && contentBottom !== null)
  ? r2((gridInfo.y + contentBottom) - footerTop) : null;

const prediction = {
  plannedArchiveName: ARCHIVE_NAME,
  plannedStagingName: STAGING_NAME,
  replacementOrder: plan.map(p => ({ key: p.key, srcId: p.srcId,
    originalIndex: p.originalIndex, cell: p.oldCell })),
  finalChildCount: 12,
  finalRowCount: gridInfo.gridRowCount,
  gridSize: gridInfo.size,
  rowTracks: gridInfo.rowTracks, rowTrackTypes: gridInfo.rowTrackTypes,
  rowYs: gridInfo.rowYs, columnXs: gridInfo.columnXs,
  newCardHeight,
  newCardOverflowsTrackPx: (trackSize !== null && newCardHeight !== null) ? r2(newCardHeight - trackSize) : null,
  contentBottom, knownContentOverflowPx: knownOverflow,
  footerTop, footerOverlapByContentAfter: footerOverlapAfter,
  knownLayoutDebt: { blocksPhaseE: false,
    reason: '교체 전에도 있던 넘침이다. 그리드 트랙 높이와 푸터 위치는 별도 단계에서 고친다.' },
  probeConfirmed: probe ? {
    rowTracksFixed: probe.rowTracksFixed, trackBefore: probe.trackBefore, trackAfter: probe.trackAfter,
    overflowBeyondTrack: probe.overflowBeyondTrack,
    gridHeightAfter: probe.gridHeightAfter, rowYsAfter: probe.rowYsAfter } : null
};

/* ---------- DRY_RUN 은 여기서 끝난다 ---------- */
function cardsForOutput() {
  return plan.map(p => {
    const c = {};
    for (const k of Object.keys(p)) if (k !== '_old') c[k] = p[k];
    c.oldCardEvidence = {
      rows: p._old.evidence.rows || null,
      backgrounds: p._old.evidence.backgrounds || null,
      headingNodeId: p._old.evidence.headingNodeId || null
    };
    return c;
  });
}
if (DRY_RUN) {
  const contentTable = plan.map(p => ({
    srcId: p.srcId, company: p.company, position: p.position, stage: p.stage,
    status: p.status, appliedDate: p.appliedDate, schedule: p.schedule, stageCount: p.stageCount,
    variant: p.plannedVariant,
    nodeIds: { companyNodeId: p.companyNodeId, positionNodeId: p.positionNodeId,
      stageNodeId: p.stageNodeId, statusNodeId: p.statusNodeId,
      appliedDateNodeId: p.appliedDateNodeId, scheduleNodeId: p.scheduleNodeId,
      stageCountNodeId: p.stageCountNodeId },
    anyNull: TEXT_ROLES.some(k => p[k] === null || typeof p[k] === 'undefined' || p[k] === '')
  }));
  return out({
    scriptVersion: SCRIPT_VERSION,
    mode: 'DRY_RUN',
    dryRun: true, readOnly: true,
    mutationCount, mutationCountIsZero: mutationCount === 0,
    writeGate: '모든 쓰기는 W() 를 거친다. DRY_RUN 이면 W() 가 예외를 던진다',
    aborted: false,

    preflight, preflightPassed, preflightFailures,
    probeStatus,
    grid: gridInfo,

    oldCardIdsExpected: OLD_CARD_IDS,
    oldCardsFound: targets.length,
    missingIds, notInGrid, extraChildren,
    alreadyAppCardInstances: alreadyAppCard,
    existingArchiveFrames: existingArchive,
    existingStagingFrames: existingStaging,
    strayTempFrames,

    contentTable,
    contentTableHasNulls: contentTable.some(r => r.anyNull),
    scheduleDashIsValid: '스케줄 값 "-" 는 정상 값이다. null 만 실패로 본다',

    chipToneProperty,
    masterInProgress, masterEnded,
    masterRoleIdsUsed: MASTER_ROLE_IDS,
    masterDiscoveryBasis: 'audit v4 가 확인한 node id 로 직접 집고, ' +
      'variant 안에 있는지 / 기대한 종류인지를 다시 확인한다',

    cards: cardsForOutput(),
    prediction,

    applyPlan: {
      beforeAll: ['A. archive 프레임 생성 — ' + ARCHIVE_NAME,
                  'B. staging 프레임 생성 — ' + STAGING_NAME],
      perCard: ['① old 원본 정보 기록', '② staging 에서 새 instance 생성', '③ variant 확정',
                '④ 텍스트 7개 override', '⑤ nested Chip tone 4개', '⑥ stage count Dot visible = true',
                '⑦ link / more 바깥·안쪽 검증', '⑧ Status Indicator 검증',
                '— 여기까지 read-back 성공해야 GRID swap 시작 —',
                '⑨ old 를 archive 로 이동', '⑩ 새 instance 를 GRID 에 append (anchor 직접 쓰기 금지)',
                '⑪ 자동 배치 read-back', '⑫ FILL + layoutGrow 1', '⑬ 그리드 검증'],
      afterAll: ['staging 삭제', 'archive 유지', 'archive 에 12장 매핑 기록'],
      onFailure: ['현재 카드에서 멈춘다',
                  'old 가 아직 GRID 에 있으면 staging instance 만 정리',
                  'old 가 이미 archive 로 갔으면 새 instance 를 빼고 old 를 되돌린 뒤 칸 복귀 확인']
    },
    notes,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
    nextStep: preflightPassed
      ? 'preflight 전부 통과. 이 계획을 확인받은 뒤 DRY_RUN = false 로 APPLY 합니다.'
      : 'preflight 실패 항목부터 해결해야 합니다: ' + preflightFailures.join(', ')
  });
}

/* ========================================================================== *
 * APPLY — DRY_RUN = false 일 때만
 * ========================================================================== */
if (!preflightPassed) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
    reason: 'preflight 실패 — 시작하지 않는다', preflight, preflightFailures, mutationCount });
}

const fontsToLoad = [];
for (const m of [masterInProgress, masterEnded]) {
  for (const role of ['company', 'appliedDate', 'schedule']) {
    const e = m.roles[role];
    if (!e || !e.fontName || e.fontIsMixed) continue;
    const parts = String(e.fontName).split(' / ');
    if (parts.length === 2 && fontsToLoad.every(f => f.family !== parts[0] || f.style !== parts[1])) {
      fontsToLoad.push({ family: parts[0], style: parts[1] });
    }
  }
  for (const role of CHIP_ROLES) {
    const e = m.roles[role];
    if (!e || !e.textPath) continue;
    const variant = await figma.getNodeByIdAsync(m.variantId);
    const t = atPath(variant, e.textPath);
    const fn = t ? safeGet(t, 'fontName') : null;
    if (!fn || fn === figma.mixed || !fn.family) continue;
    if (fontsToLoad.every(f => f.family !== fn.family || f.style !== fn.style)) {
      fontsToLoad.push({ family: fn.family, style: fn.style });
    }
  }
}
const fontLoad = { requested: fontsToLoad.slice(), loaded: [], failed: [] };
for (const f of fontsToLoad) {
  try { await figma.loadFontAsync(f); fontLoad.loaded.push(f.family + ' / ' + f.style); }
  catch (e) { fontLoad.failed.push({ font: f.family + ' / ' + f.style, error: e.message }); }
}
if (fontLoad.failed.length) {
  return out({ scriptVersion: SCRIPT_VERSION, mode: 'APPLY', aborted: true,
    reason: '폰트를 불러오지 못해 텍스트를 바꿀 수 없다', fontLoad, mutationCount });
}

const archive = W('archive 프레임 생성', () => {
  const f = figma.createFrame();
  figma.currentPage.appendChild(f);
  f.name = ARCHIVE_NAME;
  f.x = gridInfo.x + 3000; f.y = gridInfo.y;
  f.resize(1000, 1000);
  f.clipsContent = false;
  return f;
});
const staging = W('staging 프레임 생성', () => {
  const f = figma.createFrame();
  figma.currentPage.appendChild(f);
  f.name = STAGING_NAME;
  f.x = gridInfo.x + 3000; f.y = gridInfo.y + 1500;
  f.resize(1000, 1000);
  f.clipsContent = false;
  return f;
});

function gridState() {
  const cs = kids(grid) || [];
  return {
    childCount: cs.length,
    rowCount: safeGet(grid, 'gridRowCount'),
    cells: cs.map(c => ({ id: c.id, x: r2(c.x), y: r2(c.y),
      row: safeGet(c, 'gridRowAnchorIndex'), col: safeGet(c, 'gridColumnAnchorIndex') }))
  };
}
function othersMoved(before, after, exceptIds) {
  const ex = exceptIds || [];
  const moved = [];
  for (const b of before.cells) {
    if (ex.indexOf(b.id) >= 0) continue;
    const a = after.cells.filter(x => x.id === b.id)[0];
    if (!a) { moved.push({ id: b.id, reason: '사라짐' }); continue; }
    if (!near(a.x, b.x) || !near(a.y, b.y) || a.row !== b.row || a.col !== b.col) {
      moved.push({ id: b.id, before: b.x + ',' + b.y, after: a.x + ',' + a.y });
    }
  }
  return moved;
}

const results = [];
let stoppedAt = null;
let failedAt = null;
let rollbackAttempted = false;
let rollbackSucceeded = null;
let partialMutationDetected = false;
let partialMutationKind = null;
const strayInstanceIds = [];

for (let i = 0; i < plan.length; i++) {
  const p = plan[i];
  const rec = { key: p.key, srcId: p.srcId, complete: false, steps: {}, errors: [] };
  const beforeGrid = gridState();
  const master = p.plannedVariant === 'state=ended' ? masterEnded : masterInProgress;
  let inst = null;
  let oldMovedToArchive = false;

  try {
    const variantComp = await figma.getNodeByIdAsync(p.plannedVariantId);
    if (!variantComp || variantComp.type !== 'COMPONENT') {
      throw new Error('variant 컴포넌트를 찾지 못했다: ' + p.plannedVariantId);
    }
    inst = W(p.key + ': instance 생성', () => variantComp.createInstance());
    W(p.key + ': staging 으로 이동', () => { staging.appendChild(inst); });
    inst.name = 'App Card — ' + (p.company || p.key);
    const instMain = await mainCompOf(inst);
    rec.steps.variant = { wanted: p.plannedVariantId, readBack: instMain ? instMain.id : null,
      variantName: instMain ? instMain.name : null,
      ok: !!instMain && instMain.id === p.plannedVariantId };
    if (!rec.steps.variant.ok) throw new Error('variant 가 계획과 다르다');

    /* ④ 텍스트 7개 */
    rec.steps.texts = [];
    for (const role of TEXT_ROLES) {
      const value = p[role];
      const entry = master.roles[role];
      if (!entry || !entry.textPath) throw new Error(role + ' 텍스트 위치를 마스터에서 찾지 못했다');
      if (value === null || typeof value === 'undefined') {
        throw new Error(role + ' 값이 없다 — preflight 를 통과했으면 안 되는 상태다');
      }
      const node = atPath(inst, entry.textPath);
      if (!node || node.type !== 'TEXT') throw new Error(role + ' 위치에 TEXT 가 없다');
      W(p.key + ': ' + role + ' 텍스트', () => { node.characters = value; });
      const back = node.characters;
      rec.steps.texts.push({ role, wanted: value, readBack: back, ok: back === value });
      if (back !== value) throw new Error(role + ' 텍스트가 되읽기에서 다르다');
    }

    /* ⑤ Chip tone 4개 */
    rec.steps.chipTones = [];
    for (const role of CHIP_ROLES) {
      const entry = master.roles[role];
      const wantOption = p.chipPlan[role].toneOption;
      if (!entry || !entry.path || !wantOption || !chipToneProperty.found) {
        throw new Error(role + ' 칩 tone 을 설정할 수 없다');
      }
      const chipNode = atPath(inst, entry.path);
      if (!chipNode || chipNode.type !== 'INSTANCE') throw new Error(role + ' 칩이 인스턴스가 아니다');
      W(p.key + ': ' + role + ' tone', () => {
        const props = {};
        props[chipToneProperty.propertyKey] = wantOption;
        chipNode.setProperties(props);
      });
      let back = null;
      try {
        const cp = chipNode.componentProperties;
        const hit = cp ? Object.keys(cp).filter(k => k.split('#')[0] === chipToneProperty.propertyName)[0] : null;
        back = hit ? String(cp[hit].value) : null;
      } catch (e) { /* 무시 */ }
      rec.steps.chipTones.push({ role, wanted: wantOption, readBack: back, ok: back === wantOption });
      if (back !== wantOption) throw new Error(role + ' 칩 tone 이 되읽기에서 다르다: ' + back);
    }

    /* ⑥ stage count Dot */
    const dotNode = p.stageCountDot.path ? atPath(inst, p.stageCountDot.path) : null;
    if (!dotNode) throw new Error('stage count 의 leading 노드를 찾지 못했다');
    const dotMain = dotNode.type === 'INSTANCE' ? await mainCompOf(dotNode) : null;
    W(p.key + ': stage count Dot 켜기', () => { dotNode.visible = true; });
    rec.steps.stageCountDot = { mainComponent: dotMain ? dotMain.name : null,
      isDotIcon: !!dotMain && dotMain.name === ICONS.dot,
      readBackVisible: dotNode.visible };
    rec.steps.stageCountDot.ok = dotNode.visible === true && rec.steps.stageCountDot.isDotIcon;
    if (!rec.steps.stageCountDot.ok) throw new Error('stage count Dot 검증 실패');

    /* 나머지 칩의 leading 은 건드리지 않는다 */
    rec.steps.otherChipLeading = [];
    for (const role of ['position', 'stage', 'status']) {
      const entry = master.roles[role];
      const chipNode = entry && entry.path ? atPath(inst, entry.path) : null;
      const lead = chipNode ? (collectDeep(chipNode, x => /^leading$/i.test(x.name || ''), 4)[0] || null) : null;
      rec.steps.otherChipLeading.push({ role, exists: !!lead,
        visible: lead ? lead.visible : null, changed: false });
    }

    /* ⑦ link / more — 바깥과 안쪽을 따로 확인 */
    rec.steps.iconButtons = [];
    for (const role of ['link', 'more']) {
      const mb = master.iconButtons[role];
      if (!mb || !mb.outerPath) throw new Error(role + ' 아이콘 버튼 위치를 마스터에서 찾지 못했다');
      const outer = atPath(inst, mb.outerPath);
      if (!outer) throw new Error(role + ' 아이콘 버튼이 인스턴스에 없다');
      if (outer.visible !== true) W(p.key + ': ' + role + ' 바깥 켜기', () => { outer.visible = true; });
      const outerSetName = outer.type === 'INSTANCE' ? await mainSetNameOf(outer) : null;
      const outerMain = outer.type === 'INSTANCE' ? await mainCompOf(outer) : null;
      const inner = mb.innerPath ? atPath(inst, mb.innerPath) : null;
      const innerMain = inner && inner.type === 'INSTANCE' ? await mainCompOf(inner) : null;
      if (inner && inner.visible !== true) W(p.key + ': ' + role + ' 안쪽 켜기', () => { inner.visible = true; });
      const wantInner = role === 'link' ? ICONS.link : ICONS.more;
      const row = { role,
        outerMainComponent: outerMain ? outerMain.name : null, outerSetName,
        outerIsIconButton: outerSetName === ICON_BUTTON_NAME ||
          (!!outerMain && outerMain.name === ICON_BUTTON_NAME),
        outerVisible: outer.visible,
        innerMainComponent: innerMain ? innerMain.name : null, innerExpected: wantInner,
        innerMatches: !!innerMain && innerMain.name === wantInner,
        innerVisible: inner ? inner.visible : null };
      row.ok = row.outerIsIconButton && row.innerMatches && outer.visible === true;
      rec.steps.iconButtons.push(row);
      if (!row.ok) throw new Error(role + ' 아이콘 검증 실패: ' + JSON.stringify(row));
    }

    /* ⑧ Status Indicator — 확인만 한다 */
    const siPath = master.roles.statusIndicator ? master.roles.statusIndicator.path : null;
    if (!siPath) throw new Error('Status Indicator 위치를 마스터에서 찾지 못했다');
    const siNode = atPath(inst, siPath);
    const siSetName = siNode && siNode.type === 'INSTANCE' ? await mainSetNameOf(siNode) : null;
    const siMain = siNode && siNode.type === 'INSTANCE' ? await mainCompOf(siNode) : null;
    let siProps = null;
    try { siProps = siNode && siNode.type === 'INSTANCE' ? siNode.componentProperties : null; }
    catch (e) { /* 무시 */ }
    const siValues = siProps ? Object.keys(siProps).map(k => String(siProps[k].value)) : [];
    const wantState = p.plannedVariant === 'state=ended' ? 'ended' : 'inProgress';
    rec.steps.statusIndicator = { found: !!siNode, mainSetName: siSetName,
      mainComponent: siMain ? siMain.name : null, values: siValues,
      expectedState: wantState, overridden: false };
    rec.steps.statusIndicator.ok = !!siNode && siSetName === STATUS_INDICATOR_SET_NAME &&
      (siValues.length === 0 || siValues.some(v => v.toLowerCase() === wantState.toLowerCase()) ||
       (!!siMain && new RegExp(wantState, 'i').test(siMain.name || '')));
    if (!rec.steps.statusIndicator.ok) {
      throw new Error('Status Indicator 가 variant 와 맞지 않는다: ' + siValues.join(', '));
    }

    /* ---- 여기까지 staging 에서 전부 성공. 이제 GRID 를 건드린다 ---- */
    /* ⑨ old 를 archive 로 — 이 단계가 먼저여야 칸이 빈다 */
    const oldNode = await figma.getNodeByIdAsync(p.srcId);
    if (!oldNode || !oldNode.parent || oldNode.parent.id !== GRID_ID) {
      throw new Error('old 카드가 더 이상 그리드 자식이 아니다');
    }
    W(p.key + ': old 를 archive 로 이동', () => { archive.appendChild(oldNode); });
    oldMovedToArchive = true;
    rec.steps.archiveMove = { movedOut: !kids(grid).some(c => c.id === p.srcId),
      parentAfter: oldNode.parent ? oldNode.parent.id : null,
      metadata: p.archiveMetadata };
    rec.steps.archiveMove.ok = rec.steps.archiveMove.movedOut &&
      rec.steps.archiveMove.parentAfter === archive.id;
    if (!rec.steps.archiveMove.ok) throw new Error('old 를 archive 로 옮기지 못했다');

    /* ⑩ 새 instance 를 GRID 에 append — anchor 는 쓰지 않는다 */
    W(p.key + ': instance 를 GRID 에 추가', () => { grid.appendChild(inst); });

    /* ⑪ 자동 배치 read-back */
    const placed = cellOf(inst);
    rec.steps.placement = {
      anchorWrittenDirectly: false,
      wanted: { row: p.oldRow, col: p.oldColumn, rowSpan: p.oldRowSpan, colSpan: p.oldColumnSpan,
                x: p.oldX, y: p.oldY },
      readBack: { row: placed.row, col: placed.col, rowSpan: placed.rowSpan, colSpan: placed.colSpan,
                  x: placed.x, y: placed.y },
      rowOk: placed.row === p.oldRow,
      colOk: placed.col === p.oldColumn,
      rowSpanOk: placed.rowSpan === p.oldRowSpan,
      colSpanOk: placed.colSpan === p.oldColumnSpan,
      xOk: near(placed.x, p.oldX),
      yOk: near(placed.y, p.oldY)
    };
    rec.steps.placement.ok = rec.steps.placement.rowOk && rec.steps.placement.colOk &&
      rec.steps.placement.rowSpanOk && rec.steps.placement.colSpanOk &&
      rec.steps.placement.xOk && rec.steps.placement.yOk;
    if (!rec.steps.placement.ok) throw new Error('자동 배치 결과가 old 의 칸과 다르다');

    /* ⑫ GRID sizing — 그리드에 들어간 뒤에만 설정한다 */
    W(p.key + ': layoutSizingHorizontal = FILL', () => { inst.layoutSizingHorizontal = 'FILL'; });
    W(p.key + ': layoutGrow = 1', () => { inst.layoutGrow = 1; });
    rec.steps.sizing = {
      horizontalReadBack: safeGet(inst, 'layoutSizingHorizontal'),
      growReadBack: safeGet(inst, 'layoutGrow'),
      verticalReadBack: safeGet(inst, 'layoutSizingVertical'),
      oldVertical: p.oldSizing.v
    };
    rec.steps.sizing.horizontalOk = rec.steps.sizing.horizontalReadBack === 'FILL';
    rec.steps.sizing.growOk = rec.steps.sizing.growReadBack === 1;
    rec.steps.sizing.verticalPreserved = rec.steps.sizing.verticalReadBack === p.oldSizing.v;
    rec.steps.sizing.ok = rec.steps.sizing.horizontalOk && rec.steps.sizing.growOk;
    if (!rec.steps.sizing.horizontalOk) throw new Error('FILL 을 썼는데 되읽으면 ' + rec.steps.sizing.horizontalReadBack);
    if (!rec.steps.sizing.growOk) throw new Error('layoutGrow 를 1 로 썼는데 되읽으면 ' + rec.steps.sizing.growReadBack);

    /* ⑬ 그리드 전체 검증 */
    const afterGrid = gridState();
    const moved = othersMoved(beforeGrid, afterGrid, [p.srcId, inst.id]);
    rec.steps.gridCheck = {
      childCount: afterGrid.childCount, childCountOk: afterGrid.childCount === 12,
      rowCount: afterGrid.rowCount, rowCountOk: afterGrid.rowCount === beforeGrid.rowCount,
      noFourthRow: afterGrid.rowCount === beforeGrid.rowCount,
      otherCardsMoved: moved.length, otherCardsMovedSample: moved.slice(0, 4),
      newSize: r2(inst.width) + '×' + r2(inst.height),
      sizeOk: near(inst.width, 235, 1.5) && near(inst.height, 219, 1.5)
    };
    rec.steps.gridCheck.ok = rec.steps.gridCheck.childCountOk && rec.steps.gridCheck.rowCountOk &&
      moved.length === 0 && rec.steps.gridCheck.sizeOk;
    if (!rec.steps.gridCheck.ok) throw new Error('그리드 검증 실패: ' + JSON.stringify(rec.steps.gridCheck));

    rec.newInstanceId = inst.id;
    rec.complete = true;
    results.push(rec);
  } catch (e) {
    rec.errors.push(e.message);
    failedAt = p.key;
    stoppedAt = p.key;
    errors.push(p.key + ' 실패: ' + e.message);

    /* ---------- rollback ---------- */
    const rb = { oldWasInArchive: oldMovedToArchive, steps: [] };
    try {
      if (!oldMovedToArchive) {
        /* old 는 아직 그리드에 있다 — staging instance 만 치운다 */
        if (inst && !inst.removed) {
          W(p.key + ': 실패한 staging instance 제거', () => { inst.remove(); });
          rb.steps.push('staging instance 제거');
        }
        rb.kind = 'staging 단계 실패 — GRID 는 건드리지 않았다';
        partialMutationKind = 'stagingOnly';
        rollbackAttempted = true;
        rollbackSucceeded = true;
      } else {
        rollbackAttempted = true;
        partialMutationKind = 'gridSwapStarted';
        /* 1. 새 instance 를 그리드에서 뺀다 */
        if (inst && !inst.removed) {
          W(p.key + ': 새 instance 를 그리드에서 제거', () => { inst.remove(); });
          rb.steps.push('새 instance 제거');
        }
        /* 2. old 를 그리드로 되돌린다 */
        const oldBack = await figma.getNodeByIdAsync(p.srcId);
        if (!oldBack) throw new Error('되돌릴 old 노드를 찾지 못했다');
        W(p.key + ': old 를 그리드로 복귀', () => { grid.appendChild(oldBack); });
        rb.steps.push('old 를 그리드로 복귀');
        /* 3. 원래 칸으로 돌아왔는지 */
        const back = cellOf(oldBack);
        rb.restored = { row: back.row, col: back.col, x: back.x, y: back.y };
        rb.wanted = { row: p.oldRow, col: p.oldColumn, x: p.oldX, y: p.oldY };
        rb.cellRestored = back.row === p.oldRow && back.col === p.oldColumn &&
          near(back.x, p.oldX) && near(back.y, p.oldY);
        /* 4. 그리드 전체 */
        const g = gridState();
        rb.childCount = g.childCount; rb.rowCount = g.rowCount;
        rb.childCountOk = g.childCount === 12;
        rb.rowCountOk = g.rowCount === beforeGrid.rowCount;
        rollbackSucceeded = rb.cellRestored && rb.childCountOk && rb.rowCountOk;
        rb.kind = 'GRID swap 시작 후 실패 — 이 카드만 되돌렸다';
      }
    } catch (e2) {
      rb.error = e2.message;
      rollbackSucceeded = false;
      errors.push(p.key + ' rollback 실패: ' + e2.message);
    }
    if (inst && !inst.removed && (!rollbackSucceeded || rb.kind !== 'staging 단계 실패')) {
      strayInstanceIds.push(inst.id);
    }
    partialMutationDetected = true;
    rec.rollback = rb;
    results.push(rec);
    break;   /* 다음 카드로 진행하지 않는다 */
  }
}

/* ---------- 마무리 ---------- */
const completedTargets = results.filter(r => r.complete).map(r => r.srcId);
const targetsNotStarted = plan.filter(p => !results.some(r => r.key === p.key)).map(p => p.srcId);

/* staging 은 반드시 정리한다. archive 는 rollback 용으로 남긴다. */
const stagingCleanup = { attempted: false, removed: false, leftoverChildren: null, error: null };
try {
  const left = kids(staging) || [];
  stagingCleanup.leftoverChildren = left.map(c => c.id);
  stagingCleanup.attempted = true;
  if (left.length) {
    notes.push('staging 에 노드가 ' + left.length + '개 남아 있다 — 지우기 전에 id 를 기록했다: ' +
               left.map(c => c.id).join(', '));
    for (const c of left) strayInstanceIds.push(c.id);
  }
  W('staging 프레임 삭제', () => { staging.remove(); });
  stagingCleanup.removed = true;
} catch (e) {
  stagingCleanup.error = e.message;
  errors.push('staging 프레임을 지우지 못했다: ' + e.message + " — 캔버스에서 '" + STAGING_NAME + "' 를 직접 지워주세요");
}

/* archive metadata 기록 */
const archiveMeta = { written: false, error: null, entries: completedTargets.length };
try {
  const payload = {
    phase: 'E', writtenBy: SCRIPT_VERSION, writtenAt: Date.now(),
    gridId: GRID_ID, archiveFrameId: archive.id,
    cards: plan.filter(p => completedTargets.indexOf(p.srcId) >= 0)
      .map(p => Object.assign({}, p.archiveMetadata,
        { newInstanceId: (results.filter(r => r.srcId === p.srcId)[0] || {}).newInstanceId || null,
          plannedVariant: p.plannedVariant }))
  };
  W('archive metadata 기록', () => { archive.setPluginData('joob.phaseE.archive', JSON.stringify(payload)); });
  archiveMeta.written = true;
} catch (e) { archiveMeta.error = e.message; }

/* 최종 그리드 상태 */
const finalGrid = gridState();
const finalAppCards = [];
for (const c of kids(grid) || []) {
  if (c.type !== 'INSTANCE') continue;
  const mc = await mainCompOf(c);
  if (mc && mc.parent && mc.parent.id === APPCARD_SET_ID) finalAppCards.push(c.id);
}
const archiveKids = kids(archive) || [];

const successCriteria = {
  allTwelveCompleted: completedTargets.length === 12,
  noErrors: errors.length === 0,
  stoppedNowhere: stoppedAt === null,
  gridChildCountIs12: finalGrid.childCount === 12,
  gridRowCountUnchanged: finalGrid.rowCount === gridInfo.gridRowCount,
  allChildrenAreAppCards: finalAppCards.length === finalGrid.childCount,
  archiveHasAllOldCards: archiveKids.length === completedTargets.length,
  stagingRemoved: stagingCleanup.removed === true,
  noStrayInstances: strayInstanceIds.length === 0,
  archiveMetadataWritten: archiveMeta.written === true
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'APPLY',
  dryRun: false,
  aborted: false,
  mutationCount,

  successCriteria, successCriteriaMet,

  completedTargets,
  targetsNotStarted,
  stoppedAt, failedAt,
  rollbackAttempted, rollbackSucceeded,
  strayInstanceIds,
  partialMutationDetected, partialMutationKind,

  archiveFrameId: archive.id, archiveFrameName: ARCHIVE_NAME,
  archiveChildCount: archiveKids.length,
  archiveChildIds: archiveKids.map(c => c.id),
  archiveMetadata: archiveMeta,
  stagingCleanup,

  fontLoad,
  grid: { before: gridInfo, afterChildCount: finalGrid.childCount, afterRowCount: finalGrid.rowCount },
  cards: results,

  notes,
  errorCount: errors.length,
  errors: errors.slice(0, 10),
  nextStep: successCriteriaMet
    ? '21b verifier 를 실행해 최종 확인합니다.'
    : '실패 지점부터 확인해주세요. 완료된 카드는 그대로 두고, 나머지는 시작하지 않았습니다.',
  mutationLogSample: mutationLog.slice(0, 40),
  mutationLogTotal: mutationLog.length
});
