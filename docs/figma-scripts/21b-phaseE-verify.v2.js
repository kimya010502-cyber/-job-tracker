/* ============================================================================
 * 줍줍 디자인 시스템 정리 — 스크립트 21b (v2)
 * Phase E 최종 검증 (읽기 전용)
 *
 * 아무것도 만들지 않고 아무것도 바꾸지 않는다.
 * createXxx / appendChild / insertChild / resize / remove / setProperties /
 * setPluginData / .characters= / .fills= / .visible= / .layoutSizing= 를
 * 한 줄도 포함하지 않는다.
 *
 * v1 에서 바뀐 것: 21-v2 와 똑같은 resolver 를 쓴다.
 *   - 칩은 Chip 세트(1029:1984) 인스턴스만
 *   - 마스터 역할은 audit 이 확인한 node id 로 집고, 새 인스턴스에서는 같은 경로로 찾는다
 *   - old 원본은 archive 안에서 라벨 row 구조로 다시 읽는다
 *   - Icon Button 은 바깥과 안쪽 아이콘을 따로 본다
 *   - Status Indicator 는 컴포넌트 세트 이름으로 확인한다
 *
 * 이미 측정된 레이아웃 빚(내용 14px 넘침, 푸터 겹침 65.5)은 실패로 보지 않는다.
 * ========================================================================== */

const SCRIPT_VERSION = '21b-v2-phaseE-verify';
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


/* ========================================================================== *
 * 여기부터 검증. 위의 resolver 는 21-v2 와 한 글자도 다르지 않게 가져왔다.
 * (교체 스크립트와 검증 스크립트가 서로 다른 방식으로 읽으면 검증이 의미가 없다)
 * ========================================================================== */
const ARCHIVE_META_KEY = 'joob.phaseE.archive';
const ENDED_CARD_ID = '1003:1794';
const EXPECT = {
  gridSize: '976×687', rowTracks: [205, 205, 205], rowYs: [0, 241, 482],
  cardHeight: 219, cardWidth: 235, childCount: 12, rowCount: 3
};
const KNOWN_DEBT = { contentOverflowPx: 14, footerOverlapByContentAfter: 65.5 };

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

const grid = await figma.getNodeByIdAsync(GRID_ID);
if (!grid) return out({ scriptVersion: SCRIPT_VERSION, mode: 'VERIFY', readOnly: true,
  aborted: true, reason: GRID_ID + ' 를 찾을 수 없다' });

const gridChildren = kids(grid) || [];
const rawTracks = safeGet(grid, 'gridRowSizes');
const gridState = {
  size: r2(grid.width) + '×' + r2(grid.height),
  width: r2(grid.width), height: r2(grid.height), y: r2(grid.y),
  childCount: gridChildren.length,
  rowCount: safeGet(grid, 'gridRowCount'),
  rowTracks: Array.isArray(rawTracks) ? rawTracks.map(trackValue) : null,
  rowYs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.y))),
  columnXs: uniqSorted(gridChildren.filter(c => c.visible !== false).map(c => r2(c.x))),
  clipsContent: safeGet(grid, 'clipsContent')
};

/* archive / staging */
const pageKids = kids(figma.currentPage) || [];
const archiveFrames = pageKids.filter(c => c.name === ARCHIVE_NAME);
const stagingFrames = pageKids.filter(c => c.name === STAGING_NAME);
const tempFrames = pageKids.filter(c => /\[Temp\]|JOOB PROBE TEMP/i.test(c.name || ''))
  .map(c => ({ id: c.id, name: c.name }));
const archive = archiveFrames[0] || null;
const archiveKids = archive ? (kids(archive) || []) : [];
const archiveIds = archiveKids.map(c => c.id);
let archiveMeta = null, archiveMetaError = null;
if (archive) {
  try {
    const raw = archive.getPluginData(ARCHIVE_META_KEY);
    if (raw) archiveMeta = JSON.parse(raw); else archiveMetaError = 'archive 프레임에 매핑 기록이 없다';
  } catch (e) { archiveMetaError = 'archive 매핑 기록을 읽지 못했다: ' + e.message; }
}
const metaBySrc = {};
if (archiveMeta && Array.isArray(archiveMeta.cards)) for (const c of archiveMeta.cards) metaBySrc[c.srcId] = c;

/* 마스터 — 21-v2 와 같은 방식 */
const masters = { inProgress: await resolveMaster('inProgress'), ended: await resolveMaster('ended') };
const chipToneProperty = await readChipToneProperty();

/* 그리드 자식 분류 */
const appCards = [];
const nonAppCardChildren = [];
for (const c of gridChildren) {
  if (c.type !== 'INSTANCE') { nonAppCardChildren.push({ id: c.id, name: c.name, type: c.type }); continue; }
  const mc = await mainCompOf(c);
  const inSet = !!(mc && mc.parent && mc.parent.id === APPCARD_SET_ID);
  if (!inSet) { nonAppCardChildren.push({ id: c.id, name: c.name, type: c.type, main: mc ? mc.name : null }); continue; }
  appCards.push({ node: c, mainId: mc.id, mainName: mc.name });
}

function readChipTone(chipNode) {
  if (!chipNode || chipNode.type !== 'INSTANCE') return null;
  try {
    const cp = chipNode.componentProperties;
    if (!cp) return null;
    const key = chipToneProperty.found
      ? Object.keys(cp).filter(k => k.split('#')[0] === chipToneProperty.propertyName)[0]
      : Object.keys(cp).filter(k => /^tone/i.test(k.split('#')[0]))[0];
    return key ? String(cp[key].value) : null;
  } catch (e) { return null; }
}

const cards = [];
for (const ac of appCards) {
  const node = ac.node;
  const row = { newInstanceId: node.id, checks: {}, detail: {} };

  /* 원본과 짝짓기 — archive 기록의 newInstanceId, 없으면 좌표 */
  let srcId = null;
  for (const id of Object.keys(metaBySrc)) if (metaBySrc[id].newInstanceId === node.id) { srcId = id; break; }
  if (!srcId) for (const id of Object.keys(metaBySrc)) {
    const m = metaBySrc[id];
    if (near(m.x, r2(node.x)) && near(m.y, r2(node.y))) { srcId = id; break; }
  }
  row.srcId = srcId;
  const meta = srcId ? metaBySrc[srcId] : null;
  const archivedOld = srcId ? (archiveKids.filter(c => c.id === srcId)[0] || null) : null;

  /* variant */
  const expectedTone = srcId === ENDED_CARD_ID ? 'ended' : 'inProgress';
  const master = masters[ac.mainId === VARIANT_IDS.ended ? 'ended' : 'inProgress'];
  row.detail.variantName = ac.mainName;
  row.detail.expectedTone = expectedTone;
  row.checks.variantCorrect = ac.mainId === VARIANT_IDS[expectedTone];

  /* 셀 */
  const cell = { row: safeGet(node, 'gridRowAnchorIndex'), col: safeGet(node, 'gridColumnAnchorIndex'),
    rowSpan: safeGet(node, 'gridRowSpan'), colSpan: safeGet(node, 'gridColumnSpan'),
    x: r2(node.x), y: r2(node.y) };
  row.detail.cell = cell;
  row.detail.originalCell = meta ? { row: meta.row, col: meta.column, rowSpan: meta.rowSpan,
    colSpan: meta.columnSpan, x: meta.x, y: meta.y } : null;
  row.checks.cellMatchesOriginal = !!meta && cell.row === meta.row && cell.col === meta.column &&
    cell.rowSpan === meta.rowSpan && cell.colSpan === meta.columnSpan &&
    near(cell.x, meta.x) && near(cell.y, meta.y);

  /* 크기 · sizing */
  row.detail.widthPx = r2(node.width); row.detail.heightPx = r2(node.height);
  row.detail.sizingH = safeGet(node, 'layoutSizingHorizontal');
  row.detail.growValue = safeGet(node, 'layoutGrow');
  row.checks.sizingIsFill = row.detail.sizingH === 'FILL';
  row.checks.layoutGrowIsOne = row.detail.growValue === 1;
  row.checks.heightIsMasterHeight = near(node.height, EXPECT.cardHeight, 1.5);

  /* 내용 — 새 카드는 마스터 경로로, 원본은 구조 resolver 로 */
  const now = {};
  for (const role of TEXT_ROLES) {
    const e = master.roles[role];
    const t = e && e.textPath ? atPath(node, e.textPath) : null;
    now[role] = t && t.type === 'TEXT' ? trim(t.characters) : null;
  }
  const old = archivedOld ? await readOldCard(archivedOld) : null;
  row.detail.content = now;
  row.detail.originalContent = old ? old.content : null;
  row.detail.contentDiff = old
    ? TEXT_ROLES.filter(k => now[k] !== old.content[k]).map(k => ({ field: k, old: old.content[k], now: now[k] }))
    : null;
  row.checks.originalFoundInArchive = !!archivedOld;
  row.checks.originalContentResolved = !!old && old.resolved;
  row.checks.contentMatchesOriginal = !!old && row.detail.contentDiff.length === 0;

  /* 상태와 variant 가 논리적으로 맞는가 */
  const statusImpliesEnded = !!now.status && /불합격|탈락|종료|마감|취소|철회/.test(now.status);
  row.detail.statusImpliesEnded = statusImpliesEnded;
  row.checks.statusAgreesWithVariant = statusImpliesEnded ? expectedTone === 'ended' : expectedTone === 'inProgress';

  /* 칩 — Chip 세트 인스턴스 · tone */
  row.detail.chips = {};
  const chipOk = [];
  for (const role of CHIP_ROLES) {
    const e = master.roles[role];
    const chipNode = e && e.path ? atPath(node, e.path) : null;
    const setId = chipNode && chipNode.type === 'INSTANCE' ? await mainSetIdOf(chipNode) : null;
    const tone = readChipTone(chipNode);
    const want = role === 'status' ? toneForStatus(now.status) : CHIP_ROLE_TONES[role];
    const entry = { text: now[role], isChipInstance: setId === CHIP_SET_ID, tone, expectedTone: want,
      toneOk: !!tone && !!want && tone.toLowerCase() === want.toLowerCase() };
    row.detail.chips[role] = entry;
    chipOk.push(entry.isChipInstance && entry.toneOk);
  }
  row.checks.allChipsAreChipInstances = CHIP_ROLES.every(r => row.detail.chips[r].isChipInstance);
  row.checks.chipTonesCorrect = CHIP_ROLES.every(r => row.detail.chips[r].toneOk);

  /* Stage Count Dot */
  const dot = master.stageCountDot && master.stageCountDot.path ? atPath(node, master.stageCountDot.path) : null;
  const dotMain = dot && dot.type === 'INSTANCE' ? await mainCompOf(dot) : null;
  row.detail.stageCountDot = { exists: !!dot, visible: dot ? dot.visible : null, mainComponent: dotMain ? dotMain.name : null };
  row.checks.stageCountDotVisible = !!dot && dot.visible === true;
  row.checks.stageCountDotIsDotIcon = !!dotMain && dotMain.name === ICONS.dot;

  /* 나머지 칩의 leading 은 숨김 유지 */
  const otherLead = [];
  for (const role of ['position', 'stage', 'status']) {
    const e = master.roles[role];
    const chipNode = e && e.path ? atPath(node, e.path) : null;
    const lead = chipNode ? (collectDeep(chipNode, x => /^leading$/i.test(x.name || ''), 4)[0] || null) : null;
    otherLead.push({ role, exists: !!lead, visible: lead ? lead.visible : null });
  }
  row.detail.otherChipLeading = otherLead;
  row.checks.otherChipLeadingStillHidden = otherLead.every(o => !o.exists || o.visible === false);

  /* link / more — 바깥 Icon Button + 안쪽 아이콘 */
  row.detail.iconButtons = {};
  for (const role of ['link', 'more']) {
    const mb = master.iconButtons[role];
    const outer = mb && mb.outerPath ? atPath(node, mb.outerPath) : null;
    const inner = mb && mb.innerPath ? atPath(node, mb.innerPath) : null;
    const outerSet = outer && outer.type === 'INSTANCE' ? await mainSetNameOf(outer) : null;
    const outerMain = outer && outer.type === 'INSTANCE' ? await mainCompOf(outer) : null;
    const innerMain = inner && inner.type === 'INSTANCE' ? await mainCompOf(inner) : null;
    const want = role === 'link' ? ICONS.link : ICONS.more;
    const e = { outer: outerMain ? outerMain.name : null, outerSet,
      outerIsIconButton: outerSet === ICON_BUTTON_NAME || (!!outerMain && outerMain.name === ICON_BUTTON_NAME),
      outerVisible: outer ? outer.visible : null,
      inner: innerMain ? innerMain.name : null, innerExpected: want };
    e.ok = e.outerIsIconButton && e.outerVisible === true && e.inner === want;
    row.detail.iconButtons[role] = e;
  }
  row.checks.linkIconCorrect = row.detail.iconButtons.link.ok;
  row.checks.moreIconCorrect = row.detail.iconButtons.more.ok;

  /* Status Indicator */
  const siPath = master.roles.statusIndicator ? master.roles.statusIndicator.path : null;
  const si = siPath ? atPath(node, siPath) : null;
  const siSet = si && si.type === 'INSTANCE' ? await mainSetNameOf(si) : null;
  const siMain = si && si.type === 'INSTANCE' ? await mainCompOf(si) : null;
  let siValues = [];
  try { const cp = si && si.type === 'INSTANCE' ? si.componentProperties : null;
        if (cp) siValues = Object.keys(cp).map(k => String(cp[k].value)); } catch (e) { /* 무시 */ }
  row.detail.statusIndicator = { found: !!si, setName: siSet, mainComponent: siMain ? siMain.name : null,
    values: siValues, expected: expectedTone };
  row.checks.statusIndicatorCorrect = !!si && siSet === STATUS_INDICATOR_SET_NAME &&
    (siValues.some(v => v.toLowerCase() === expectedTone.toLowerCase()) ||
     (!!siMain && new RegExp(expectedTone, 'i').test(siMain.name || '')));

  row.failedChecks = Object.keys(row.checks).filter(k => row.checks[k] === false);
  if (row.failedChecks.length) errors.push(node.id + ' (' + srcId + ') 실패: ' + row.failedChecks.join(', '));
  cards.push(row);
}

/* 레이아웃 빚 — 기록만 */
const lastRowTop = gridState.rowYs.length ? gridState.rowYs[gridState.rowYs.length - 1] : null;
const cardH = cards.length ? cards[0].detail.heightPx : null;
const contentBottom = (lastRowTop !== null && cardH !== null) ? r2(lastRowTop + cardH) : null;
const contentOverflow = contentBottom === null ? null : r2(Math.max(0, contentBottom - gridState.height));
const footer = await figma.getNodeByIdAsync('1002:451');
const footerTop = footer ? r2(footer.y) : null;
const footerOverlap = (footerTop !== null && contentBottom !== null) ? r2(gridState.y + contentBottom - footerTop) : null;
const knownLayoutDebt = {
  gridFrameBottom: r2(gridState.y + gridState.height),
  contentBottom: contentBottom === null ? null : r2(gridState.y + contentBottom),
  contentOverflowPx: contentOverflow, footerTop, footerOverlapByContent: footerOverlap,
  expected: KNOWN_DEBT,
  matchesExpectation: near(contentOverflow, KNOWN_DEBT.contentOverflowPx, 1) &&
    near(footerOverlap, KNOWN_DEBT.footerOverlapByContentAfter, 1),
  treatedAsFailure: false,
  note: 'Phase E 는 그리드 트랙 높이와 푸터 위치를 고치지 않는다. 기록용이다.'
};
if (!knownLayoutDebt.matchesExpectation) {
  notes.push('레이아웃 빚 값이 예상과 다르다 — 넘침 ' + contentOverflow + ' (예상 14), 푸터 겹침 ' +
    footerOverlap + ' (예상 65.5). 실패로 보지는 않는다.');
}

/* 중복 · 떠도는 노드 */
const idCount = {}, srcCount = {};
for (const c of cards) { idCount[c.newInstanceId] = (idCount[c.newInstanceId] || 0) + 1;
  if (c.srcId) srcCount[c.srcId] = (srcCount[c.srcId] || 0) + 1; }
const duplicateNewInstances = Object.keys(idCount).filter(k => idCount[k] > 1);
const duplicateSrcMappings = Object.keys(srcCount).filter(k => srcCount[k] > 1);
const strayAppCardsOnPage = [];
for (const c of pageKids) {
  if (c.type !== 'INSTANCE') continue;
  const sid = await mainSetIdOf(c);
  if (sid === APPCARD_SET_ID) strayAppCardsOnPage.push({ id: c.id, name: c.name });
}
const strayInArchive = [];
for (const c of archiveKids) {
  if (c.type !== 'INSTANCE') continue;
  const sid = await mainSetIdOf(c);
  if (sid === APPCARD_SET_ID) strayInArchive.push(c.id);
}
const oldStillInGrid = OLD_CARD_IDS.filter(id => gridChildren.some(c => c.id === id));
const oldMissingFromArchive = OLD_CARD_IDS.filter(id => archiveIds.indexOf(id) < 0);
const endedCards = cards.filter(c => c.detail.variantName && /ended/i.test(c.detail.variantName));
const inProgressCards = cards.filter(c => c.detail.variantName && /inprogress/i.test(c.detail.variantName));
const every = k => cards.length > 0 && cards.every(c => c.checks[k] === true);

const successCriteria = {
  archiveFrameExists: !!archive,
  singleArchiveFrame: archiveFrames.length === 1,
  archiveHasAll12Originals: oldMissingFromArchive.length === 0,
  oldCardsNoLongerInGrid: oldStillInGrid.length === 0,
  noStagingFrame: stagingFrames.length === 0,
  noTempFrames: tempFrames.length === 0,
  gridChildCountIs12: gridState.childCount === EXPECT.childCount,
  allGridChildrenAreAppCards: nonAppCardChildren.length === 0 && cards.length === EXPECT.childCount,
  mastersResolved: masters.inProgress.resolved === true && masters.ended.resolved === true,
  exactlyOneEndedCard: endedCards.length === 1,
  endedCardIsKakao: endedCards.length === 1 && endedCards[0].srcId === ENDED_CARD_ID,
  otherElevenAreInProgress: inProgressCards.length === 11,
  allVariantsCorrect: every('variantCorrect'),
  allCellsMatchOriginal: every('cellMatchesOriginal'),
  rowCountIs3: gridState.rowCount === EXPECT.rowCount,
  noFourthRow: gridState.rowYs.length === EXPECT.rowCount,
  gridSizeUnchanged: gridState.size === EXPECT.gridSize,
  rowTracksUnchanged: Array.isArray(gridState.rowTracks) && gridState.rowTracks.length === 3 &&
    gridState.rowTracks.every((v, i) => near(v, EXPECT.rowTracks[i])),
  rowYsUnchanged: gridState.rowYs.length === 3 && gridState.rowYs.every((v, i) => near(v, EXPECT.rowYs[i], 1)),
  allOriginalsResolvedInArchive: every('originalContentResolved'),
  allContentMatchesOriginal: every('contentMatchesOriginal'),
  allStatusAgreesWithVariant: every('statusAgreesWithVariant'),
  allChipsAreChipInstances: every('allChipsAreChipInstances'),
  allChipTonesCorrect: every('chipTonesCorrect'),
  allStageCountDotsVisible: every('stageCountDotVisible'),
  allStageCountDotsAreDotIcon: every('stageCountDotIsDotIcon'),
  otherChipLeadingStillHidden: every('otherChipLeadingStillHidden'),
  allLinkIconsCorrect: every('linkIconCorrect'),
  allMoreIconsCorrect: every('moreIconCorrect'),
  allStatusIndicatorsCorrect: every('statusIndicatorCorrect'),
  allSizingIsFill: every('sizingIsFill'),
  allLayoutGrowIsOne: every('layoutGrowIsOne'),
  allHeightsAreMasterHeight: every('heightIsMasterHeight'),
  noStrayAppCardsOnPage: strayAppCardsOnPage.length === 0,
  noNewInstancesInArchive: strayInArchive.length === 0,
  noDuplicateNewInstances: duplicateNewInstances.length === 0,
  noDuplicateSourceMappings: duplicateSrcMappings.length === 0,
  everyCardPairedToOriginal: cards.length > 0 && cards.every(c => !!c.srcId),
  archiveMetadataReadable: !!archiveMeta,
  noErrors: errors.length === 0
};
const successCriteriaMet = Object.keys(successCriteria).every(k => successCriteria[k]);
const failedCriteria = Object.keys(successCriteria).filter(k => !successCriteria[k]);
if (archiveMetaError) notes.push(archiveMetaError);

return out({
  scriptVersion: SCRIPT_VERSION,
  mode: 'VERIFY', readOnly: true, aborted: false,
  successCriteria, successCriteriaMet, failedCriteria,
  grid: gridState, expected: EXPECT,
  archive: { exists: !!archive, frameCount: archiveFrames.length, id: archive ? archive.id : null,
    childCount: archiveKids.length, missingOriginals: oldMissingFromArchive,
    metadataReadable: !!archiveMeta, metadataError: archiveMetaError, strayNewInstances: strayInArchive },
  staging: { frameCount: stagingFrames.length }, tempFrames,
  strayAppCardsOnPage, duplicateNewInstances, duplicateSrcMappings, oldStillInGrid, nonAppCardChildren,
  masterIssues: { inProgress: masters.inProgress.issues, ended: masters.ended.issues },
  endedCount: endedCards.length, inProgressCount: inProgressCards.length,
  contentTable: cards.map(c => Object.assign({ srcId: c.srcId, variant: c.detail.variantName }, c.detail.content)),
  cards,
  knownLayoutDebt,
  notes, errorCount: errors.length, errors: errors.slice(0, 10),
  verdict: successCriteriaMet
    ? 'Phase E CLOSED — 12장 전부 App Card 인스턴스로 교체됐고 원본은 archive 에 남아 있습니다.'
    : '아직 닫을 수 없습니다. failedCriteria 를 확인해주세요.'
});
