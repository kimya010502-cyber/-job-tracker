const ACCOUNTS_KEY = 'jat_accounts';
const SESSION_KEY = 'jat_session';
const STAGE_STATUSES = ['예정', '결과대기', '합격', '불합격', '지원철회'];
const DEFAULT_STAGE_NAMES = ['서류', '1차 면접', '과제 전형', '임원 면접', '최종 결과'];

let storageWarned = false;
let currentUserId = null;
let applications = [];
let draftStages = [];
let currentDetailId = null;

function warnStorage() {
  if (storageWarned) return;
  storageWarned = true;
  alert('이 브라우저 환경에서는 자동 저장이 되지 않습니다.\n작업 후 설정 메뉴의 "내보내기"로 꼭 백업해주세요.');
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { console.error(e); warnStorage(); return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { console.error(e); warnStorage(); }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { console.error(e); }
}

function makeId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

async function hashPassword(pw) {
  try {
    if (crypto && crypto.subtle && crypto.subtle.digest) {
      const enc = new TextEncoder().encode(pw);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { console.error(e); }
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) | 0;
  return 'fb-' + Math.abs(h).toString(16) + '-' + pw.length;
}

function todayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function isSafeUrl(url) {
  return /^https?:\/\//i.test(url);
}

function getAccounts() {
  try { return JSON.parse(safeGet(ACCOUNTS_KEY) || '[]'); } catch (e) { return []; }
}
function saveAccounts(accounts) {
  safeSet(ACCOUNTS_KEY, JSON.stringify(accounts));
}
function dataKey(userId) { return `jat_data_${userId}`; }

function loadUserData(userId) {
  try {
    const raw = safeGet(dataKey(userId));
    const parsed = raw ? JSON.parse(raw) : { applications: [] };
    return Array.isArray(parsed.applications) ? parsed.applications : [];
  } catch (e) { return []; }
}
function saveUserData() {
  if (!currentUserId) return;
  safeSet(dataKey(currentUserId), JSON.stringify({ applications }));
}

/* ---------- 계산 로직 ---------- */

function isDecided(stage) {
  return stage.status === '합격' || stage.status === '불합격' || stage.status === '지원철회';
}

function computeOverallStatus(app) {
  const stages = app.stages;
  if (stages.some(s => s.status === '지원철회')) return '지원철회';
  if (stages.some(s => s.status === '불합격')) return '불합격';
  const last = stages[stages.length - 1];
  if (last && last.status === '합격') return '최종합격';
  return '진행중';
}

function computeCurrentStage(app) {
  const stages = app.stages;
  const overall = computeOverallStatus(app);
  if (overall === '최종합격') return stages[stages.length - 1];
  if (overall === '불합격') return stages.find(s => s.status === '불합격') || stages[stages.length - 1];
  if (overall === '지원철회') return stages.find(s => s.status === '지원철회') || stages[stages.length - 1];
  return stages.find(s => !isDecided(s)) || stages[stages.length - 1];
}

function nextSchedule(app) {
  const candidates = app.stages.filter(s => (s.status === '예정' || s.status === '결과대기') && s.scheduledAt);
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return candidates[0];
}

function hasAnyMemo(app) {
  return !!(app.companyMemo && app.companyMemo.trim()) || app.stages.some(s => s.memo && s.memo.trim());
}

function passRateByIndex() {
  const maxLen = Math.min(6, applications.reduce((m, a) => Math.max(m, a.stages.length), 0));
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    const atIndex = applications.filter(a => a.stages[i]).map(a => a.stages[i]);
    const decided = atIndex.filter(isDecided).filter(s => s.status !== '지원철회');
    const passed = decided.filter(s => s.status === '합격');
    result.push({
      label: `${i + 1}번째 전형`,
      pct: decided.length ? (passed.length / decided.length) * 100 : null,
      passed: passed.length,
      decided: decided.length
    });
  }
  return result;
}

function checkDateWarnings(app, stage) {
  const warnings = [];
  if (stage.scheduledAt && app.appliedAt && stage.scheduledAt < app.appliedAt) {
    warnings.push(`${stage.name}의 전형 진행일이 지원일보다 빠릅니다.`);
  }
  if (stage.resultAt && stage.scheduledAt && stage.resultAt < stage.scheduledAt) {
    warnings.push(`${stage.name}의 결과일이 전형 진행일보다 빠릅니다.`);
  }
  return warnings;
}

/* ---------- 렌더: KPI / 합격률 ---------- */

function renderKpis(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const total = applications.length;
  const inProgress = applications.filter(a => computeOverallStatus(a) === '진행중').length;
  const failed = applications.filter(a => computeOverallStatus(a) === '불합격').length;
  const passed = applications.filter(a => computeOverallStatus(a) === '최종합격').length;
  const thisMonth = todayStr().slice(0, 7);
  const monthCount = applications.filter(a => a.appliedAt && a.appliedAt.startsWith(thisMonth)).length;

  const cards = [
    ['총 지원', total], ['진행 중', inProgress], ['불합격', failed], ['최종 합격', passed], ['이번 달 지원', monthCount]
  ];
  el.innerHTML = cards.map(([label, value]) =>
    `<div class="kpi-card"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>`
  ).join('');
}

function renderRateCards(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const rates = passRateByIndex();
  if (!rates.length) {
    el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1;padding:16px;">아직 결과 데이터가 없습니다.</p>';
    return;
  }
  el.innerHTML = rates.map(r => `
    <div class="rate-card">
      <div class="rate-top">
        <span class="rate-title">${r.label} 합격률</span>
        <span class="rate-pct">${r.pct === null ? '-' : r.pct.toFixed(1) + '%'}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${r.pct === null ? 0 : r.pct}%"></div></div>
      <div class="rate-frac" style="margin-top:6px;">${r.passed} / ${r.decided}</div>
    </div>
  `).join('');
}

/* ---------- 렌더: 지원 내역 목록 ---------- */

function populateFilterOptions() {
  const stageSel = document.getElementById('stageFilter');
  const posSel = document.getElementById('positionFilter');
  const stageVal = stageSel.value;
  const posVal = posSel.value;

  const stageNames = [...new Set(applications.map(a => computeCurrentStage(a) ? computeCurrentStage(a).name : null).filter(Boolean))];
  const positions = [...new Set(applications.map(a => a.position).filter(Boolean))];

  stageSel.innerHTML = '<option value="all">현재 단계: 전체</option>' +
    stageNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  posSel.innerHTML = '<option value="all">포지션: 전체</option>' +
    positions.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

  if (stageNames.includes(stageVal)) stageSel.value = stageVal;
  if (positions.includes(posVal)) posSel.value = posVal;
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const stage = document.getElementById('stageFilter').value;
  const position = document.getElementById('positionFilter').value;

  return applications.filter(a => {
    if (search && !a.companyName.toLowerCase().includes(search)) return false;
    if (status !== 'all' && computeOverallStatus(a) !== status) return false;
    if (stage !== 'all') {
      const cur = computeCurrentStage(a);
      if (!cur || cur.name !== stage) return false;
    }
    if (position !== 'all' && a.position !== position) return false;
    return true;
  }).sort((a, b) => {
    if (a.appliedAt !== b.appliedAt) return b.appliedAt.localeCompare(a.appliedAt);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

function renderTable() {
  renderKpis('kpiGrid');
  renderRateCards('rateGrid');
  populateFilterOptions();
  const tbody = document.getElementById('appTableBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const rows = applyFilters();

  if (applications.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.hidden = false;
    emptyMsg.textContent = '등록된 지원 내역이 없습니다. 우측 상단의 "기록 추가"로 시작해보세요.';
    return;
  }
  if (rows.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.hidden = false;
    emptyMsg.textContent = '조건에 맞는 지원 내역이 없습니다.';
    return;
  }
  emptyMsg.hidden = true;

  tbody.innerHTML = rows.map(app => {
    const overall = computeOverallStatus(app);
    const cur = computeCurrentStage(app);
    const sched = nextSchedule(app);
    const schedText = sched ? `${escapeHtml(sched.name)} · ${sched.scheduledAt}` : '-';
    return `<tr data-id="${app.id}">
      <td>${escapeHtml(app.companyName)}</td>
      <td>${escapeHtml(app.position) || '-'}</td>
      <td>${app.appliedAt}</td>
      <td>${cur ? escapeHtml(cur.name) : '-'}</td>
      <td><span class="status-badge status-${overall}">${overall}</span></td>
      <td>${schedText}</td>
      <td>${hasAnyMemo(app) ? '📝' : ''}</td>
    </tr>`;
  }).join('');
}

/* ---------- 통계 / 캘린더 / 메모 ---------- */

function lastNMonths(n) {
  const arr = [];
  const base = new Date();
  base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
    arr.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  }
  return arr;
}

function monthlyApplyCounts(n) {
  return lastNMonths(n).map(ym => ({
    label: `${Number(ym.slice(5, 7))}월`,
    count: applications.filter(a => a.appliedAt && a.appliedAt.startsWith(ym)).length
  }));
}

function monthlyPassCounts(n) {
  return lastNMonths(n).map(ym => ({
    label: `${Number(ym.slice(5, 7))}월`,
    count: applications.filter(a => {
      if (computeOverallStatus(a) !== '최종합격') return false;
      const last = a.stages[a.stages.length - 1];
      return last && last.resultAt && last.resultAt.startsWith(ym);
    }).length
  }));
}

function deltaText(data, unit) {
  if (data.length < 2) return '';
  const prev = data[data.length - 2].count;
  const cur = data[data.length - 1].count;
  const diff = cur - prev;
  const sign = diff > 0 ? '+' : '';
  if (prev === 0) {
    return diff === 0 ? `이번 달 <strong>${cur}${unit}</strong>` : `이번 달 <strong>${cur}${unit}</strong> (전월 데이터 없음)`;
  }
  const pct = Math.round((diff / prev) * 100);
  return `이번 달 <strong>${cur}${unit}</strong> · 전월 대비 ${sign}${diff}${unit} (${sign}${pct}%)`;
}

function renderBarChart(targetId, data, color) {
  const el = document.getElementById(targetId);
  const max = Math.max(1, ...data.map(d => d.count));
  const w = 600, h = 160, padBottom = 26, padTop = 20, gap = 12;
  const barW = (w - gap * (data.length + 1)) / data.length;
  const bars = data.map((d, i) => {
    const barH = Math.max((d.count / max) * (h - padTop - padBottom), d.count > 0 ? 3 : 0);
    const x = gap + i * (barW + gap);
    const y = h - padBottom - barH;
    const isLast = i === data.length - 1;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${isLast ? color : color + '55'}"></rect>
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#6b7086">${d.count}</text>
      <text x="${x + barW / 2}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#6b7086">${d.label}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:140px;">${bars}</svg>`;
}

function renderStatsView() {
  renderKpis('statsKpiGrid');
  renderRateCards('statsRateGrid');

  const applyData = monthlyApplyCounts(6);
  renderBarChart('applyTrendChart', applyData, '#5b5fc7');
  document.getElementById('applyTrendDelta').innerHTML = deltaText(applyData, '건');

  const passData = monthlyPassCounts(6);
  renderBarChart('passTrendChart', passData, '#1a9e5c');
  document.getElementById('passTrendDelta').innerHTML = deltaText(passData, '건');

  const positions = [...new Set(applications.map(a => a.position).filter(Boolean))];
  const table = document.getElementById('positionStatsTable');
  if (!positions.length) {
    table.innerHTML = '<tbody><tr><td style="padding:14px;color:#6b7086;">데이터가 없습니다.</td></tr></tbody>';
    return;
  }
  const rows = positions.map(pos => {
    const apps = applications.filter(a => a.position === pos);
    const passed = apps.filter(a => computeOverallStatus(a) === '최종합격').length;
    return `<tr><td>${escapeHtml(pos)}</td><td>${apps.length}건</td><td>${passed}건</td></tr>`;
  }).join('');
  table.innerHTML = `<thead><tr><th>포지션</th><th>지원 수</th><th>최종 합격</th></tr></thead><tbody>${rows}</tbody>`;
}

let calYear, calMonth;

function initCalendarState() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}

function categorizeStageName(name) {
  if (name.includes('과제')) return 'assignment';
  if (name.includes('면접')) return 'interview';
  return 'other';
}

function buildCalendarEvents(year, month) {
  const events = {};
  const ymPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const push = (dateStr, ev) => { (events[dateStr] = events[dateStr] || []).push(ev); };
  applications.forEach(app => {
    if (app.appliedAt && app.appliedAt.startsWith(ymPrefix)) {
      push(app.appliedAt, { type: 'apply', label: `지원 · ${app.companyName}`, appId: app.id });
    }
    app.stages.forEach(s => {
      if (s.scheduledAt && s.scheduledAt.startsWith(ymPrefix) && (s.status === '예정' || s.status === '결과대기')) {
        push(s.scheduledAt, { type: categorizeStageName(s.name), label: `${s.name} · ${app.companyName}`, appId: app.id });
      }
    });
  });
  return events;
}

function renderCalendarView() {
  if (calYear === undefined) initCalendarState();
  document.getElementById('calMonthLabel').textContent = `${calYear}년 ${calMonth + 1}월`;

  const events = buildCalendarEvents(calYear, calMonth);
  const grid = document.getElementById('calendarGrid');
  const firstDay = new Date(calYear, calMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const todayStrVal = todayStr();

  let html = ['일', '월', '화', '수', '목', '금', '토'].map(w => `<div class="calendar-weekday">${w}</div>`).join('');

  for (let i = 0; i < totalCells; i++) {
    const realDate = new Date(calYear, calMonth, i - startWeekday + 1);
    const outMonth = realDate.getMonth() !== calMonth;
    const y = realDate.getFullYear(), m = realDate.getMonth(), d = realDate.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStrVal;
    const dayEvents = events[dateStr] || [];

    html += `<div class="calendar-day ${outMonth ? 'out-month' : ''} ${isToday ? 'today' : ''}">
      <span class="day-number">${d}</span>
      ${dayEvents.map(ev => `<span class="cal-event ev-${ev.type}" data-id="${ev.appId}" title="${escapeHtml(ev.label)}">${escapeHtml(ev.label)}</span>`).join('')}
    </div>`;
  }

  grid.innerHTML = html;
  grid.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', () => { showView('detail'); renderDetail(el.dataset.id); });
  });
}

function wireCalendar() {
  document.getElementById('calPrevBtn').addEventListener('click', () => {
    if (calYear === undefined) initCalendarState();
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendarView();
  });
  document.getElementById('calNextBtn').addEventListener('click', () => {
    if (calYear === undefined) initCalendarState();
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendarView();
  });
  document.getElementById('calTodayBtn').addEventListener('click', () => {
    initCalendarState();
    renderCalendarView();
  });
}

function renderNotesView() {
  const list = document.getElementById('notesList');
  const emptyMsg = document.getElementById('notesEmptyMsg');
  const withMemo = applications.filter(hasAnyMemo);
  if (!withMemo.length) {
    list.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;
  list.innerHTML = withMemo.map(a => {
    const stageMemos = a.stages.filter(s => s.memo && s.memo.trim())
      .map(s => `<div class="note-stage-memo">· ${escapeHtml(s.name)}: ${escapeHtml(s.memo)}</div>`).join('');
    return `<div class="note-card" data-id="${a.id}">
      <div class="note-card-title">${escapeHtml(a.companyName)} · ${escapeHtml(a.position) || '-'}</div>
      ${a.companyMemo ? `<div class="note-card-memo">${escapeHtml(a.companyMemo)}</div>` : ''}
      ${stageMemos}
    </div>`;
  }).join('');
  list.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => { showView('detail'); renderDetail(card.dataset.id); });
  });
}

/* ---------- 상세 페이지 ---------- */

function stageIcon(status) {
  if (status === '합격') return { char: '✓', cls: 'status-합격' };
  if (status === '불합격') return { char: '✕', cls: 'status-불합격' };
  if (status === '지원철회') return { char: '⊘', cls: 'status-지원철회' };
  if (status === '결과대기') return { char: '●', cls: 'status-결과대기' };
  return { char: '○', cls: 'status-예정' };
}

function renderDetail(id) {
  const app = applications.find(a => a.id === id);
  if (!app) { showView('list'); return; }
  currentDetailId = id;
  document.getElementById('editInfoPanel').hidden = true;

  document.getElementById('detailTitle').textContent = `${app.companyName} · ${app.position || '-'}`;

  const overall = computeOverallStatus(app);
  const cur = computeCurrentStage(app);
  const sched = nextSchedule(app);
  const chips = [
    `지원일: ${app.appliedAt}`,
    `현재 단계: ${cur ? escapeHtml(cur.name) : '-'}`,
    `상태: <span class="status-badge status-${overall}">${overall}</span>`,
    `다음 일정: ${sched ? escapeHtml(sched.name) + ' ' + sched.scheduledAt : '-'}`
  ];
  if (app.jobPostingUrl && isSafeUrl(app.jobPostingUrl)) {
    chips.push(`<a href="${escapeHtml(app.jobPostingUrl)}" target="_blank" rel="noopener noreferrer">공고 보기 ↗</a>`);
  }
  document.getElementById('detailChips').innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join('');

  document.getElementById('companyMemoInput').value = app.companyMemo || '';

  renderTimeline(app);
}

function renderTimeline(app) {
  const el = document.getElementById('timeline');
  el.innerHTML = app.stages.map((s, idx) => {
    const icon = stageIcon(s.status);
    const isLast = idx === app.stages.length - 1;
    const onlyOne = app.stages.length === 1;
    return `<div class="timeline-item" data-stage-id="${s.id}">
      <div class="timeline-track">
        <div class="timeline-icon ${icon.cls}">${icon.char}</div>
        ${isLast ? '' : '<div class="timeline-line"></div>'}
      </div>
      <div class="timeline-card">
        <div class="timeline-card-top">
          <button type="button" class="timeline-move" data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="timeline-move" data-act="down" ${isLast ? 'disabled' : ''}>↓</button>
          <input type="text" class="timeline-name-input" data-field="name" value="${escapeHtml(s.name)}">
          <button type="button" class="timeline-remove" data-act="remove" ${onlyOne ? 'disabled' : ''}>🗑</button>
        </div>
        <div class="timeline-fields">
          <div>
            <label>상태</label>
            <select data-field="status">
              ${STAGE_STATUSES.map(st => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>전형 진행일</label>
            <input type="date" data-field="scheduledAt" value="${s.scheduledAt || ''}">
          </div>
          <div>
            <label>결과일</label>
            <input type="date" data-field="resultAt" value="${s.resultAt || ''}">
          </div>
        </div>
        <textarea class="timeline-memo" data-field="memo" rows="2" placeholder="전형별 메모">${escapeHtml(s.memo || '')}</textarea>
      </div>
    </div>`;
  }).join('');
}

function findStage(app, stageId) {
  return app.stages.find(s => s.id === stageId);
}

/* ---------- 라우팅 ---------- */

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById(`view-${name}`);
  if (target) target.hidden = false;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  if (name === 'list') renderTable();
  if (name === 'stats') renderStatsView();
  if (name === 'calendar') renderCalendarView();
  if (name === 'notes') renderNotesView();
}

/* ---------- 인증 / 세션 ---------- */

function showAuthScreen(defaultTab) {
  document.getElementById('appShell').hidden = true;
  document.getElementById('authScreen').hidden = false;
  document.getElementById('newPw').value = '';
  document.getElementById('newPw2').value = '';
  document.getElementById('loadPw').value = '';
  document.getElementById('newAccountError').hidden = true;
  document.getElementById('loadAccountError').hidden = true;
  activateAuthTab(defaultTab || 'new');
}

function activateAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('newAccountForm').hidden = tab !== 'new';
  document.getElementById('loadAccountForm').hidden = tab !== 'load';
}

function loginAs(userId) {
  currentUserId = userId;
  applications = loadUserData(userId);
  safeSet(SESSION_KEY, userId);
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appShell').hidden = false;
  showView('list');
}

function lock() {
  currentUserId = null;
  applications = [];
  safeRemove(SESSION_KEY);
  showAuthScreen('load');
}

async function init() {
  wireEvents();
  document.getElementById('addAppliedAt').value = todayStr();
  const savedSession = safeGet(SESSION_KEY);
  if (savedSession) {
    const acc = getAccounts().find(a => a.id === savedSession);
    if (acc) { loginAs(acc.id); return; }
  }
  showAuthScreen('new');
}

/* ---------- 이벤트 바인딩 ---------- */

function wireEvents() {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => activateAuthTab(btn.dataset.tab));
  });

  document.getElementById('newAccountForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('newPw').value;
    const pw2 = document.getElementById('newPw2').value;
    const errEl = document.getElementById('newAccountError');
    if (pw !== pw2) { errEl.textContent = '비밀번호가 일치하지 않습니다.'; errEl.hidden = false; return; }
    if (pw.length < 4) { errEl.textContent = '비밀번호는 4자 이상이어야 합니다.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    const passwordHash = await hashPassword(pw);
    const accounts = getAccounts();
    const id = makeId();
    accounts.push({ id, passwordHash, createdAt: todayStr() });
    saveAccounts(accounts);
    safeSet(dataKey(id), JSON.stringify({ applications: [] }));
    loginAs(id);
  });

  document.getElementById('loadAccountForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('loadPw').value;
    const errEl = document.getElementById('loadAccountError');
    const passwordHash = await hashPassword(pw);
    const acc = getAccounts().find(a => a.passwordHash === passwordHash);
    if (!acc) { errEl.textContent = '일치하는 기록을 찾을 수 없습니다.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    loginAs(acc.id);
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('switchAccountBtn').addEventListener('click', () => lock());

  const accountMenuBtn = document.getElementById('accountMenuBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  accountMenuBtn.addEventListener('click', () => { accountDropdown.hidden = !accountDropdown.hidden; });
  document.addEventListener('click', e => {
    if (!accountMenuBtn.contains(e.target) && !accountDropdown.contains(e.target)) accountDropdown.hidden = true;
  });
  document.getElementById('lockBtn').addEventListener('click', () => lock());

  document.getElementById('backToListBtn').addEventListener('click', () => showView('list'));

  ['searchInput', 'statusFilter', 'stageFilter', 'positionFilter'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', renderTable);
    el.addEventListener('change', renderTable);
  });
  document.getElementById('resetFilterBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('stageFilter').value = 'all';
    document.getElementById('positionFilter').value = 'all';
    renderTable();
  });

  document.getElementById('appTableBody').addEventListener('click', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    showView('detail');
    renderDetail(tr.dataset.id);
  });

  wireDrawer();
  wireDetail();
  wireSettings();
  wireCalendar();
}

/* ---------- 기록 추가 Drawer ---------- */

function renderStageConfigList() {
  const el = document.getElementById('stageConfigList');
  el.innerHTML = draftStages.map((s, idx) => `
    <div class="stage-row" data-idx="${idx}">
      <button type="button" class="timeline-move" data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="timeline-move" data-act="down" ${idx === draftStages.length - 1 ? 'disabled' : ''}>↓</button>
      <input type="text" value="${escapeHtml(s.name)}" placeholder="단계명">
      <button type="button" class="timeline-remove" data-act="remove" ${draftStages.length === 1 ? 'disabled' : ''}>🗑</button>
    </div>
  `).join('');
}

function checkDuplicateCompany(name) {
  const norm = name.trim().toLowerCase();
  if (!norm) return [];
  return applications.filter(a => a.companyName.trim().toLowerCase() === norm)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

function wireDrawer() {
  const overlay = document.getElementById('addDrawerOverlay');
  const companyInput = document.getElementById('addCompany');
  const dupWarning = document.getElementById('dupWarning');

  document.getElementById('openAddDrawerBtn').addEventListener('click', () => {
    document.getElementById('addForm').reset();
    document.getElementById('addAppliedAt').value = todayStr();
    draftStages = DEFAULT_STAGE_NAMES.map(name => ({ id: makeId(), name }));
    renderStageConfigList();
    document.getElementById('stageConfigBody').hidden = true;
    document.getElementById('toggleStageConfigBtn').textContent = '전형 단계 설정 ▸';
    dupWarning.hidden = true;
    overlay.hidden = false;
  });

  const closeDrawer = () => { overlay.hidden = true; };
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('cancelAddBtn').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });

  companyInput.addEventListener('input', () => {
    const dups = checkDuplicateCompany(companyInput.value);
    if (!dups.length) { dupWarning.hidden = true; return; }
    const d = dups[0];
    dupWarning.hidden = false;
    dupWarning.innerHTML = `⚠ 동일 기업 지원 이력이 있습니다.<br>${escapeHtml(d.companyName)} · ${escapeHtml(d.position) || '-'} · ${d.appliedAt}${dups.length > 1 ? ` 외 ${dups.length - 1}건` : ''}`;
  });

  document.getElementById('toggleStageConfigBtn').addEventListener('click', () => {
    const body = document.getElementById('stageConfigBody');
    body.hidden = !body.hidden;
    document.getElementById('toggleStageConfigBtn').textContent = body.hidden ? '전형 단계 설정 ▸' : '전형 단계 설정 ▾';
  });

  document.getElementById('addStageConfigBtn').addEventListener('click', () => {
    draftStages.push({ id: makeId(), name: '' });
    renderStageConfigList();
  });

  document.getElementById('stageConfigList').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.closest('.stage-row').dataset.idx);
    if (btn.dataset.act === 'up' && idx > 0) {
      [draftStages[idx - 1], draftStages[idx]] = [draftStages[idx], draftStages[idx - 1]];
    } else if (btn.dataset.act === 'down' && idx < draftStages.length - 1) {
      [draftStages[idx + 1], draftStages[idx]] = [draftStages[idx], draftStages[idx + 1]];
    } else if (btn.dataset.act === 'remove' && draftStages.length > 1) {
      draftStages.splice(idx, 1);
    }
    renderStageConfigList();
  });

  document.getElementById('stageConfigList').addEventListener('input', e => {
    const row = e.target.closest('.stage-row');
    if (!row) return;
    draftStages[Number(row.dataset.idx)].name = e.target.value;
  });

  document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const companyName = companyInput.value.trim();
    const position = document.getElementById('addPosition').value.trim();
    const appliedAt = document.getElementById('addAppliedAt').value;
    if (!companyName || !position || !appliedAt) return;

    const dups = checkDuplicateCompany(companyName);
    if (dups.length) {
      const d = dups[0];
      const proceed = confirm(`동일 기업에 지원한 기존 기록이 있습니다.\n${d.appliedAt} · ${d.position || '-'} · ${computeOverallStatus(d)}\n\n그래도 새 지원 기록을 등록하시겠습니까?`);
      if (!proceed) return;
    }

    const now = new Date().toISOString();
    const stages = draftStages.map((s, idx) => ({
      id: s.id, name: s.name.trim() || `단계 ${idx + 1}`,
      status: idx === 0 ? '결과대기' : '예정',
      scheduledAt: '', resultAt: '', memo: ''
    }));

    applications.push({
      id: makeId(),
      companyName, position, appliedAt,
      jobPostingUrl: document.getElementById('addUrl').value.trim(),
      companyMemo: document.getElementById('addMemo').value.trim(),
      createdAt: now, updatedAt: now,
      stages
    });
    saveUserData();
    closeDrawer();
    showView('list');
  });
}

/* ---------- 상세 페이지 이벤트 ---------- */

function wireDetail() {
  const editBtn = document.getElementById('editInfoBtn');
  const panel = document.getElementById('editInfoPanel');

  editBtn.addEventListener('click', () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      panel.innerHTML = `
        <div><label>기업명</label><input type="text" id="editCompanyName" value="${escapeHtml(app.companyName)}"></div>
        <div><label>지원 포지션</label><input type="text" id="editPosition" value="${escapeHtml(app.position)}"></div>
        <div><label>지원일</label><input type="date" id="editAppliedAt" value="${app.appliedAt}"></div>
        <div><label>공고 URL</label><input type="url" id="editUrl" value="${escapeHtml(app.jobPostingUrl || '')}"></div>
        <div class="edit-info-actions">
          <button type="button" class="btn-ghost" id="editInfoCancel">취소</button>
          <button type="button" class="btn-primary" id="editInfoSave">저장</button>
        </div>
      `;
      document.getElementById('editInfoCancel').addEventListener('click', () => { panel.hidden = true; });
      document.getElementById('editInfoSave').addEventListener('click', () => {
        const companyName = document.getElementById('editCompanyName').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const appliedAt = document.getElementById('editAppliedAt').value;
        if (!companyName || !position || !appliedAt) return;
        app.companyName = companyName;
        app.position = position;
        app.appliedAt = appliedAt;
        app.jobPostingUrl = document.getElementById('editUrl').value.trim();
        app.updatedAt = new Date().toISOString();
        saveUserData();
        renderDetail(app.id);
      });
    }
  });

  document.getElementById('companyMemoInput').addEventListener('blur', () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    app.companyMemo = document.getElementById('companyMemoInput').value.trim();
    saveUserData();
  });

  document.getElementById('deleteAppBtn').addEventListener('click', () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    if (!confirm(`이 지원 기록을 삭제하시겠습니까?\n삭제한 기록은 복구할 수 없습니다.`)) return;
    applications = applications.filter(a => a.id !== app.id);
    saveUserData();
    showView('list');
  });

  document.getElementById('addStageBtn').addEventListener('click', () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    app.stages.push({ id: makeId(), name: `단계 ${app.stages.length + 1}`, status: '예정', scheduledAt: '', resultAt: '', memo: '' });
    saveUserData();
    renderDetail(app.id);
  });

  const timeline = document.getElementById('timeline');

  timeline.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = btn.closest('.timeline-item');
    const idx = app.stages.findIndex(s => s.id === item.dataset.stageId);
    if (btn.dataset.act === 'up' && idx > 0) {
      [app.stages[idx - 1], app.stages[idx]] = [app.stages[idx], app.stages[idx - 1]];
    } else if (btn.dataset.act === 'down' && idx < app.stages.length - 1) {
      [app.stages[idx + 1], app.stages[idx]] = [app.stages[idx], app.stages[idx + 1]];
    } else if (btn.dataset.act === 'remove') {
      if (app.stages.length <= 1) return;
      if (!confirm('이 전형 단계를 삭제하시겠습니까?')) return;
      app.stages.splice(idx, 1);
    } else {
      return;
    }
    saveUserData();
    renderDetail(app.id);
  });

  timeline.addEventListener('change', e => {
    const field = e.target.dataset.field;
    if (!field || field === 'name' || field === 'memo') return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = e.target.closest('.timeline-item');
    const stage = findStage(app, item.dataset.stageId);
    if (!stage) return;

    stage[field] = e.target.value;
    if (field === 'status') {
      if (stage.status === '합격' || stage.status === '불합격') {
        stage.resultAt = todayStr();
      } else {
        stage.resultAt = '';
      }
    }
    saveUserData();
    const warnings = checkDateWarnings(app, stage);
    renderDetail(app.id);
    if (warnings.length) alert(warnings.join('\n'));
  });

  timeline.addEventListener('blur', e => {
    const field = e.target.dataset.field;
    if (field !== 'name' && field !== 'memo') return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = e.target.closest('.timeline-item');
    const stage = findStage(app, item.dataset.stageId);
    if (!stage) return;
    stage[field] = e.target.value.trim();
    saveUserData();
  }, true);
}

/* ---------- 설정 ---------- */

function wireSettings() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(applications, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-applications-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('invalid');
        if (confirm(`${data.length}건의 데이터를 가져옵니다. 현재 기록을 덮어쓸까요?`)) {
          applications = data;
          saveUserData();
          showView('list');
        }
      } catch (err) {
        alert('올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('changePwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('changePwError');
    const currentPw = document.getElementById('currentPw').value;
    const newPw = document.getElementById('newPwSettings').value;
    const accounts = getAccounts();
    const acc = accounts.find(a => a.id === currentUserId);
    const curHash = await hashPassword(currentPw);
    if (!acc || acc.passwordHash !== curHash) {
      errEl.textContent = '현재 비밀번호가 일치하지 않습니다.';
      errEl.hidden = false;
      return;
    }
    if (newPw.length < 4) {
      errEl.textContent = '새 비밀번호는 4자 이상이어야 합니다.';
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    acc.passwordHash = await hashPassword(newPw);
    saveAccounts(accounts);
    document.getElementById('changePwForm').reset();
    alert('비밀번호가 변경되었습니다.');
  });

  document.getElementById('startFreshBtn').addEventListener('click', () => {
    if (!confirm('현재 기록에서 로그아웃하고 새 비밀번호로 새 기록을 시작합니다. 계속할까요?')) return;
    lock();
    activateAuthTab('new');
  });

  document.getElementById('wipeDataBtn').addEventListener('click', () => {
    if (!confirm('현재 기록의 모든 지원 내역을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
    applications = [];
    saveUserData();
    showView('list');
  });
}

init();
