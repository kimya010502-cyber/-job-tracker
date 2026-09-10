const SUPABASE_URL = 'https://wpnsgxcojxhabnnddikw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbnNneGNvanhoYWJubmRkaWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDYwMjUsImV4cCI6MjEwNDA4MjAyNX0.tmEOkufn95jcoY1qp-5RBcbkBqsELDoaURQdNOLAnLI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LEGACY_MIGRATED_KEY = 'jat_migrated_v2';

const STAGE_CATEGORIES = ['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'ASSIGNMENT', 'EXECUTIVE_INTERVIEW', 'COMPENSATION', 'FINAL_RESULT', 'CUSTOM'];
const STAGE_CATEGORY_LABELS = {
  DOCUMENT: '서류', FIRST_INTERVIEW: '1차 면접', SECOND_INTERVIEW: '2차 면접',
  ASSIGNMENT: '과제 전형', EXECUTIVE_INTERVIEW: '임원 면접', COMPENSATION: '처우 협의',
  FINAL_RESULT: '최종 결과', CUSTOM: '직접 입력'
};
const STANDARD_NAME_TO_CATEGORY = {
  '서류': 'DOCUMENT', '1차 면접': 'FIRST_INTERVIEW', '2차 면접': 'SECOND_INTERVIEW',
  '과제 전형': 'ASSIGNMENT', '임원 면접': 'EXECUTIVE_INTERVIEW', '처우 협의': 'COMPENSATION',
  '최종 결과': 'FINAL_RESULT'
};
const DEFAULT_STAGE_CATEGORIES = ['DOCUMENT', 'FIRST_INTERVIEW', 'ASSIGNMENT', 'EXECUTIVE_INTERVIEW', 'FINAL_RESULT'];
const PASS_RATE_CATEGORIES = ['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'ASSIGNMENT', 'EXECUTIVE_INTERVIEW'];
const DURATION_CATEGORIES = ['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'ASSIGNMENT', 'EXECUTIVE_INTERVIEW', 'COMPENSATION'];

const STATUS_SETS = {
  document: ['접수완료', '서류 확인', '결과 대기', '통과', '탈락', '철회'],
  general: ['진행 전', '결과 대기', '통과', '탈락', '철회'],
  final: ['결과 대기', '최종 합격', '최종 탈락', '철회']
};
const DECIDED_STATUSES = ['통과', '탈락', '최종 합격', '최종 탈락'];
const PASSED_STATUSES = ['통과', '최종 합격'];
const PENDING_STATUSES = ['접수완료', '서류 확인', '진행 전', '결과 대기'];
const OLD_OLD_STATUSES = ['예정', '결과대기', '합격', '불합격', '지원철회'];

const RELEASE_NOTE = {
  version: '0.6.0',
  updatedAt: '2026-09-10T16:39:00+09:00',
  title: '줍줍(JOOB)으로 새롭게 태어났어요',
  description: '지원 현황을 가볍게 모아 관리한다는 의미를 담아\n줍줍이라는 이름으로 새롭게 단장했어요.',
  items: [
    { icon: '✨', title: '줍줍(JOOB)으로 이름이 바뀌었어요', description: '지원하는 오늘이, 더 좋은 내일로 — 새 브랜드로 다시 시작해요.' },
    { icon: '🗂️', title: '전형 카테고리가 더 명확해졌어요', description: '1차·2차 면접, 과제, 처우 협의 등 자주 사용하는 전형을 선택할 수 있어요.' },
    { icon: '🔒', title: '전형 진행 순서가 더 정확해졌어요', description: '이전 전형을 통과해야 다음 전형을 수정할 수 있도록 개선했어요.' },
    { icon: '📊', title: '지원 통계를 더 자세히 확인할 수 있어요', description: '월별 지원 추이, 전형 통과율과 소요시간을 한눈에 확인할 수 있어요.' }
  ]
};

let currentUserId = null;
let currentUserEmail = '';
let applications = [];
let draftStages = [];
let currentDetailId = null;

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

function makeId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.random() * 16 | 0;
    const v = ch === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isValidUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
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

function statusSlug(status) {
  return String(status || '').replace(/\s+/g, '');
}

function statusGroupForCategory(category) {
  if (category === 'DOCUMENT') return 'document';
  if (category === 'FINAL_RESULT') return 'final';
  return 'general';
}
function statusOptionsForCategory(category) {
  return STATUS_SETS[statusGroupForCategory(category)];
}
function defaultStatusForCategory(category) {
  const group = statusGroupForCategory(category);
  if (group === 'document') return '접수완료';
  if (group === 'final') return '결과 대기';
  return '진행 전';
}
function isInterviewCategory(category) {
  return category === 'FIRST_INTERVIEW' || category === 'SECOND_INTERVIEW' || category === 'EXECUTIVE_INTERVIEW';
}

function updateSaveStatus(state) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  if (state === 'saving') { el.textContent = '저장 중...'; el.className = 'save-status'; }
  else if (state === 'saved') { el.textContent = '저장됨'; el.className = 'save-status ok'; }
  else if (state === 'error') { el.textContent = '저장 실패'; el.className = 'save-status error'; }
  else { el.textContent = ''; el.className = 'save-status'; }
}

/* ---------- Supabase 데이터 매핑 / CRUD ---------- */

function rowToApp(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    position: row.position,
    appliedAt: row.applied_at,
    jobPostingUrl: row.job_url || '',
    companyMemo: row.memo || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stages: (row.stages || []).slice().sort((a, b) => a.order_index - b.order_index).map(s => ({
      id: s.id,
      name: s.name,
      category: s.stage_type || null,
      status: s.status,
      scheduledAt: s.scheduled_at || '',
      resultAt: s.result_at || '',
      documentCheckedAt: s.document_checked_at || '',
      statusChangedAt: s.status_changed_at || '',
      statusChangeSource: s.status_change_source || '',
      memo: s.memo || ''
    }))
  };
}

function appToRow(app) {
  return {
    id: app.id,
    user_id: currentUserId,
    company_name: app.companyName,
    position: app.position,
    applied_at: app.appliedAt,
    job_url: app.jobPostingUrl || null,
    memo: app.companyMemo || null
  };
}

function stagesToRows(app) {
  return app.stages.map((s, idx) => ({
    id: s.id,
    application_id: app.id,
    name: s.name,
    stage_type: s.category || 'CUSTOM',
    order_index: idx,
    status: s.status,
    scheduled_at: s.scheduledAt || null,
    result_at: s.resultAt || null,
    document_checked_at: s.documentCheckedAt || null,
    status_changed_at: s.statusChangedAt || null,
    status_change_source: s.statusChangeSource || null,
    memo: s.memo || null
  }));
}

async function loadApplicationsFromServer() {
  const { data, error } = await supabaseClient
    .from('applications')
    .select('*, stages(*)')
    .order('applied_at', { ascending: false });
  if (error) {
    console.error(error);
    alert('데이터를 불러오지 못했습니다: ' + error.message);
    applications = [];
    return;
  }
  applications = (data || []).map(rowToApp);
}

async function upsertApplicationRaw(app) {
  const { error: appErr } = await supabaseClient.from('applications').upsert(appToRow(app));
  if (appErr) { console.error(appErr); return { ok: false, message: appErr.message }; }
  if (app.stages && app.stages.length) {
    const { error: stageErr } = await supabaseClient.from('stages').upsert(stagesToRows(app));
    if (stageErr) { console.error(stageErr); return { ok: false, message: stageErr.message }; }
  }
  return { ok: true };
}

async function saveApplication(app) {
  updateSaveStatus('saving');
  const result = await upsertApplicationRaw(app);
  if (!result.ok) { updateSaveStatus('error'); alert('저장 실패: ' + result.message); return false; }
  updateSaveStatus('saved');
  return true;
}

async function deleteApplicationRemote(id) {
  updateSaveStatus('saving');
  const { error } = await supabaseClient.from('applications').delete().eq('id', id);
  if (error) { console.error(error); updateSaveStatus('error'); alert('삭제 실패: ' + error.message); return false; }
  updateSaveStatus('saved');
  return true;
}

async function deleteStageRemote(id) {
  const { error } = await supabaseClient.from('stages').delete().eq('id', id);
  if (error) console.error(error);
}

/* ---------- 상태값 계산 로직 ---------- */

function computeOverallStatus(app) {
  const stages = app.stages;
  if (stages.some(s => s.status === '철회')) return '종료';
  if (stages.some(s => s.status === '탈락')) return '종료';
  const last = stages[stages.length - 1];
  if (last && (last.status === '최종 합격' || last.status === '최종 탈락')) return '종료';
  return '진행중';
}

function computeEndReason(app) {
  const stages = app.stages;
  if (stages.some(s => s.status === '철회')) return 'withdrawn';
  if (stages.some(s => s.status === '탈락')) return 'failed';
  const last = stages[stages.length - 1];
  if (last && last.status === '최종 합격') return 'finalPassed';
  if (last && last.status === '최종 탈락') return 'failed';
  return null;
}

function computeCurrentStage(app) {
  for (const s of app.stages) {
    if (s.status === '통과') continue;
    return s;
  }
  return app.stages[app.stages.length - 1];
}

function computeFailureDate(app) {
  const failStage = app.stages.find(s => s.status === '탈락' || s.status === '최종 탈락');
  return failStage ? failStage.resultAt : null;
}

function isStageUnlocked(app, idx) {
  if (idx === 0) return true;
  const prev = app.stages[idx - 1];
  return !!prev && prev.status === '통과';
}

function nextSchedule(app) {
  const candidates = app.stages.filter(s => PENDING_STATUSES.includes(s.status) && s.scheduledAt);
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return candidates[0];
}

function hasAnyMemo(app) {
  return !!(app.companyMemo && app.companyMemo.trim()) || app.stages.some(s => s.memo && s.memo.trim());
}

function passRateByCategory() {
  return PASS_RATE_CATEGORIES.map(cat => {
    const stages = [];
    applications.forEach(a => a.stages.forEach(s => { if (s.category === cat) stages.push(s); }));
    const decided = stages.filter(s => s.status === '통과' || s.status === '탈락');
    const passed = decided.filter(s => s.status === '통과');
    return {
      label: STAGE_CATEGORY_LABELS[cat],
      pct: decided.length ? (passed.length / decided.length) * 100 : null,
      passed: passed.length,
      decided: decided.length
    };
  });
}

function finalPassRate() {
  const stages = [];
  applications.forEach(a => a.stages.forEach(s => { if (s.category === 'FINAL_RESULT') stages.push(s); }));
  const decided = stages.filter(s => s.status === '최종 합격' || s.status === '최종 탈락');
  const passed = decided.filter(s => s.status === '최종 합격');
  return {
    label: '최종 합격률',
    pct: decided.length ? (passed.length / decided.length) * 100 : null,
    passed: passed.length,
    decided: decided.length
  };
}

function avgDurationByCategory() {
  return DURATION_CATEGORIES.map(cat => {
    const durations = [];
    applications.forEach(a => {
      a.stages.forEach(s => {
        if (s.category !== cat) return;
        const startStr = cat === 'DOCUMENT' ? a.appliedAt : s.scheduledAt;
        const endStr = s.resultAt;
        if (!startStr || !endStr) return;
        const days = Math.round((new Date(endStr) - new Date(startStr)) / 86400000);
        if (days >= 0) durations.push(days);
      });
    });
    return {
      label: STAGE_CATEGORY_LABELS[cat],
      avg: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      count: durations.length
    };
  });
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

/* ---------- 상태값 마이그레이션 / 자동 전환 ---------- */

function inferStageCategory(name) {
  return STANDARD_NAME_TO_CATEGORY[String(name || '').trim()] || 'CUSTOM';
}

function migrateStatusForCategory(oldStatus, category) {
  if (!OLD_OLD_STATUSES.includes(oldStatus)) return oldStatus;
  const group = statusGroupForCategory(category);
  if (oldStatus === '예정') return group === 'document' ? '접수완료' : '진행 전';
  if (oldStatus === '결과대기') return '결과 대기';
  if (oldStatus === '합격') return group === 'final' ? '최종 합격' : '통과';
  if (oldStatus === '불합격') return group === 'final' ? '최종 탈락' : '탈락';
  if (oldStatus === '지원철회') return '철회';
  return oldStatus;
}

async function migrateLegacyStageData() {
  const rows = [];
  applications.forEach(app => {
    let appChanged = false;
    app.stages.forEach(stage => {
      if (!STAGE_CATEGORIES.includes(stage.category)) {
        const category = inferStageCategory(stage.name);
        stage.status = migrateStatusForCategory(stage.status, category);
        stage.category = category;
        stage.statusChangeSource = stage.statusChangeSource || 'manual';
        appChanged = true;
      }
      if (statusGroupForCategory(stage.category) === 'document' && stage.status === '결과 대기' && !stage.documentCheckedAt) {
        stage.status = '접수완료';
        stage.statusChangedAt = new Date().toISOString();
        stage.statusChangeSource = 'automatic';
        appChanged = true;
      }
    });
    if (appChanged) rows.push(...stagesToRows(app));
  });
  if (!rows.length) return;
  const { error } = await supabaseClient.from('stages').upsert(rows);
  if (error) console.error('상태값 마이그레이션 실패', error);
}

async function runAutoStatusTransitions() {
  const now = new Date();
  const nowIso = now.toISOString();
  const todayVal = todayStr();
  const changedApps = new Set();

  applications.forEach(app => {
    app.stages.forEach((stage, idx) => {
      if (!isStageUnlocked(app, idx)) return;
      if (statusGroupForCategory(stage.category) === 'document' && stage.status === '서류 확인' && stage.documentCheckedAt) {
        const threshold = new Date(stage.documentCheckedAt);
        threshold.setDate(threshold.getDate() + 3);
        if (now >= threshold) {
          stage.status = '결과 대기';
          stage.statusChangedAt = nowIso;
          stage.statusChangeSource = 'automatic';
          changedApps.add(app);
        }
      } else if (isInterviewCategory(stage.category) && stage.status === '진행 전' && stage.scheduledAt) {
        if (stage.scheduledAt < todayVal) {
          stage.status = '결과 대기';
          stage.statusChangedAt = nowIso;
          stage.statusChangeSource = 'automatic';
          changedApps.add(app);
        }
      }
    });
  });

  if (!changedApps.size) return;
  const rows = [];
  changedApps.forEach(app => rows.push(...stagesToRows(app)));
  const { error } = await supabaseClient.from('stages').upsert(rows);
  if (error) console.error('자동 상태 전환 저장 실패', error);
}

/* ---------- 렌더: KPI / 합격률 ---------- */

function renderMainKpis() {
  const el = document.getElementById('kpiGrid');
  if (!el) return;
  const thisMonth = todayStr().slice(0, 7);
  const monthApplied = applications.filter(a => a.appliedAt && a.appliedAt.startsWith(thisMonth)).length;
  const inProgress = applications.filter(a => computeOverallStatus(a) === '진행중').length;
  const monthFailed = applications.filter(a => {
    if (computeEndReason(a) !== 'failed') return false;
    const d = computeFailureDate(a);
    return d && d.startsWith(thisMonth);
  }).length;
  const finalPassed = applications.filter(a => computeEndReason(a) === 'finalPassed').length;

  const cards = [
    ['이번 달 지원', monthApplied], ['진행 중', inProgress], ['이번 달 불합격', monthFailed], ['최종 합격', finalPassed]
  ];
  el.innerHTML = cards.map(([label, value]) =>
    `<div class="kpi-card"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>`
  ).join('');
}

function renderOverallStatsKpis() {
  const el = document.getElementById('statsKpiGrid');
  if (!el) return;
  const total = applications.length;
  const inProgress = applications.filter(a => computeOverallStatus(a) === '진행중').length;
  const failed = applications.filter(a => computeEndReason(a) === 'failed').length;
  const finalPassed = applications.filter(a => computeEndReason(a) === 'finalPassed').length;

  const cards = [
    ['총 지원', total], ['진행 중', inProgress], ['누적 탈락', failed], ['최종 합격', finalPassed]
  ];
  el.innerHTML = cards.map(([label, value]) =>
    `<div class="kpi-card"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>`
  ).join('');
}

function renderRateCards(targetId, rates) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (!rates.length) {
    el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1;padding:16px;">아직 결과 데이터가 없습니다.</p>';
    return;
  }
  el.innerHTML = rates.map(r => `
    <div class="rate-card rate-card-vertical">
      <span class="rate-title">${r.label} 통과율</span>
      <span class="rate-pct">${r.pct === null ? '-' : r.pct.toFixed(1) + '%'}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${r.pct === null ? 0 : r.pct}%"></div></div>
      <span class="rate-frac">${r.decided === 0 ? '데이터 없음' : `${r.passed} / ${r.decided}`}</span>
    </div>
  `).join('');
}

function renderDurationCards(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const data = avgDurationByCategory();
  el.innerHTML = data.map(d => {
    let pctText = '-';
    let subText = '데이터 없음';
    let fillPct = 0;
    if (d.count === 1) {
      pctText = `${Math.round(d.avg)}일`;
      subText = '데이터 1건';
      fillPct = 100;
    } else if (d.count >= 2) {
      pctText = `평균 ${d.avg.toFixed(1)}일`;
      subText = `데이터 ${d.count}건`;
      fillPct = 100;
    }
    return `
    <div class="rate-card rate-card-vertical">
      <span class="rate-title">${d.label} 소요시간</span>
      <span class="rate-pct">${pctText}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${fillPct}%"></div></div>
      <span class="rate-frac">${subText}</span>
    </div>`;
  }).join('');
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
  const stageStatus = document.getElementById('stageStatusFilter').value;
  const stage = document.getElementById('stageFilter').value;
  const position = document.getElementById('positionFilter').value;

  return applications.filter(a => {
    if (search && !a.companyName.toLowerCase().includes(search)) return false;
    if (status !== 'all' && computeOverallStatus(a) !== status) return false;
    const cur = computeCurrentStage(a);
    if (stageStatus !== 'all' && (!cur || cur.status !== stageStatus)) return false;
    if (stage !== 'all') {
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
  renderMainKpis();
  populateFilterOptions();
  const tbody = document.getElementById('appTableBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const rows = applyFilters();

  if (applications.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.hidden = false;
    emptyMsg.innerHTML = '<img src="assets/icon-transparent.png" alt="" class="empty-state-icon"><p>등록된 지원 내역이 없습니다. 우측 상단의 "기록 추가"로 시작해보세요.</p>';
    return;
  }
  if (rows.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.hidden = false;
    emptyMsg.innerHTML = '<img src="assets/icon-transparent.png" alt="" class="empty-state-icon"><p>조건에 맞는 지원 내역이 없습니다.</p>';
    return;
  }
  emptyMsg.hidden = true;

  tbody.innerHTML = rows.map(app => {
    const overall = computeOverallStatus(app);
    const cur = computeCurrentStage(app);
    const sched = nextSchedule(app);
    const schedText = sched ? `${escapeHtml(sched.name)} · ${sched.scheduledAt}` : '-';
    const dotClass = overall === '진행중' ? 'dot-active' : 'dot-closed';
    return `<tr data-id="${app.id}">
      <td><span class="row-dot ${dotClass}" title="${overall}"></span></td>
      <td>${escapeHtml(app.companyName)}</td>
      <td>${escapeHtml(app.position) || '-'}</td>
      <td>${app.appliedAt}</td>
      <td>${cur ? escapeHtml(cur.name) : '-'}</td>
      <td>${cur ? `<span class="status-badge status-${statusSlug(cur.status)}">${cur.status}</span>` : '-'}</td>
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

function periodOverPeriodStats() {
  const now = new Date();
  const day = now.getDate();
  const pad = n => String(n).padStart(2, '0');
  const thisStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const thisEnd = todayStr();

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-01`;
  const lastDayOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
  const prevEndDay = Math.min(day, lastDayOfPrevMonth);
  const prevEnd = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-${pad(prevEndDay)}`;

  const curCount = applications.filter(a => a.appliedAt >= thisStart && a.appliedAt <= thisEnd).length;
  const prevCount = applications.filter(a => a.appliedAt >= prevStart && a.appliedAt <= prevEnd).length;
  return { curCount, prevCount, diff: curCount - prevCount, day };
}

function renderTrendSummary(totalRecent3) {
  const { prevCount, curCount, diff } = periodOverPeriodStats();
  let pct, arrow, cls;
  if (prevCount === 0) {
    if (curCount === 0) { pct = 0; arrow = '－'; cls = ''; }
    else { pct = 100; arrow = '▲'; cls = 'up'; }
  } else {
    pct = Math.abs(Math.round((diff / prevCount) * 100));
    arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '－';
    cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
  }
  document.getElementById('applyTrendSummary').innerHTML = `
    <div class="trend-summary-row">
      <div class="trend-summary-block">
        <span class="trend-summary-label">최근 3개월 총 지원</span>
        <span class="trend-summary-value">${totalRecent3}건</span>
      </div>
      <div class="trend-summary-block align-right">
        <span class="trend-summary-label">전월 동기간 대비</span>
        <span class="trend-summary-value ${cls}">${arrow} ${pct}%</span>
      </div>
    </div>
  `;
}

function renderLineChart(targetId, data, color) {
  const el = document.getElementById(targetId);
  const max = Math.max(1, ...data.map(d => d.count));
  const w = 560, h = 180, padBottom = 30, padTop = 24, padX = 40;
  const chartTop = padTop, chartBottom = h - padBottom;
  const stepX = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: chartBottom - (d.count / max) * (chartBottom - chartTop),
    d
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartBottom} L${points[0].x},${chartBottom} Z`;
  const gridLines = [0, 0.5, 1].map(t => {
    const y = chartBottom - t * (chartBottom - chartTop);
    return `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="#e4e6ef" stroke-width="1" stroke-dasharray="3,4"></line>`;
  }).join('');
  const dots = points.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#fff" stroke-width="2"></circle>
    <text x="${p.x}" y="${p.y - 14}" text-anchor="middle" font-size="12" font-weight="700" fill="#232544">${p.d.count}</text>
    <text x="${p.x}" y="${h - 8}" text-anchor="middle" font-size="11" fill="#6b7086">${p.d.label}</text>
  `).join('');
  const gradId = `lineGrad-${targetId}`;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:150px;">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"></stop>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none"></path>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
    ${dots}
  </svg>`;
}

function renderStatsView() {
  renderOverallStatsKpis();

  const applyData = monthlyApplyCounts(3);
  renderLineChart('applyTrendChart', applyData, '#5b5fc7');
  const totalRecent3 = applyData.reduce((s, d) => s + d.count, 0);
  renderTrendSummary(totalRecent3);

  renderRateCards('statsRateGrid', [...passRateByCategory(), finalPassRate()]);
  renderDurationCards('durationGrid');

  const positions = [...new Set(applications.map(a => a.position).filter(Boolean))];
  const table = document.getElementById('positionStatsTable');
  if (!positions.length) {
    table.innerHTML = '<tbody><tr><td style="padding:14px;color:#6b7086;">데이터가 없습니다.</td></tr></tbody>';
    return;
  }
  const rows = positions.map(pos => {
    const apps = applications.filter(a => a.position === pos);
    const docStages = [];
    apps.forEach(a => a.stages.forEach(s => { if (s.category === 'DOCUMENT') docStages.push(s); }));
    const decided = docStages.filter(s => s.status === '통과' || s.status === '탈락');
    const passed = decided.filter(s => s.status === '통과');
    const rate = decided.length ? ((passed.length / decided.length) * 100).toFixed(1) + '%' : '-';
    return { pos, count: apps.length, rate };
  }).sort((a, b) => b.count - a.count);
  table.innerHTML = `<thead><tr><th>포지션</th><th>지원 수</th><th>서류 통과율</th></tr></thead><tbody>${
    rows.map(r => `<tr><td>${escapeHtml(r.pos)}</td><td>${r.count}건</td><td>${r.rate}</td></tr>`).join('')
  }</tbody>`;
}

let calYear, calMonth;

function initCalendarState() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
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
      if (s.scheduledAt && s.scheduledAt.startsWith(ymPrefix) && PENDING_STATUSES.includes(s.status)) {
        const cat = isInterviewCategory(s.category) ? 'interview' : s.category === 'ASSIGNMENT' ? 'assignment' : 'other';
        push(s.scheduledAt, { type: cat, label: `${s.name} · ${app.companyName}`, appId: app.id });
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
  if (status === '통과' || status === '최종 합격') return { char: '✓', cls: `status-${statusSlug(status)}` };
  if (status === '탈락' || status === '최종 탈락') return { char: '✕', cls: `status-${statusSlug(status)}` };
  if (status === '철회') return { char: '⊘', cls: 'status-철회' };
  if (status === '결과 대기') return { char: '●', cls: 'status-결과대기' };
  if (status === '서류 확인') return { char: '◐', cls: 'status-서류확인' };
  if (status === '접수완료') return { char: '○', cls: 'status-접수완료' };
  return { char: '○', cls: 'status-진행전' };
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
  const dotClass = overall === '진행중' ? 'dot-active' : 'dot-closed';
  const chips = [
    `지원일: ${app.appliedAt}`,
    `<span class="row-dot ${dotClass}"></span> ${overall}`,
    `현재 단계: ${cur ? escapeHtml(cur.name) : '-'}`,
    `전형 상태: ${cur ? `<span class="status-badge status-${statusSlug(cur.status)}">${cur.status}</span>` : '-'}`,
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
    const unlocked = isStageUnlocked(app, idx);
    const isCustom = s.category === 'CUSTOM';
    const statusOptions = statusOptionsForCategory(s.category);
    const dis = unlocked ? '' : 'disabled';
    const docField = statusGroupForCategory(s.category) === 'document' ? `
          <div>
            <label>서류 확인일</label>
            <input type="date" data-field="documentCheckedAt" value="${s.documentCheckedAt || ''}" ${dis}>
          </div>` : '';
    return `<div class="timeline-item ${unlocked ? '' : 'locked'}" data-stage-id="${s.id}">
      <div class="timeline-track">
        <div class="timeline-icon ${icon.cls}">${icon.char}</div>
        ${isLast ? '' : '<div class="timeline-line"></div>'}
      </div>
      <div class="timeline-card">
        <div class="timeline-card-top">
          <button type="button" class="timeline-move" data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="timeline-move" data-act="down" ${isLast ? 'disabled' : ''}>↓</button>
          <select class="timeline-category-select" data-field="category" ${dis}>
            ${STAGE_CATEGORIES.map(c => `<option value="${c}" ${s.category === c ? 'selected' : ''}>${STAGE_CATEGORY_LABELS[c]}</option>`).join('')}
          </select>
          <input type="text" class="timeline-name-input" data-field="name" value="${escapeHtml(s.name)}" placeholder="전형명" ${isCustom ? '' : 'hidden'} ${dis}>
          <button type="button" class="timeline-remove" data-act="remove" ${onlyOne ? 'disabled' : ''}>🗑</button>
        </div>
        ${unlocked ? '' : '<p class="lock-hint">🔒 이전 전형을 통과하면 입력할 수 있습니다.</p>'}
        <div class="timeline-fields">
          <div>
            <label>상태</label>
            <select data-field="status" ${dis}>
              ${statusOptions.map(st => `<option value="${st}" ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>전형 진행일</label>
            <input type="date" data-field="scheduledAt" value="${s.scheduledAt || ''}" ${dis}>
          </div>
          <div>
            <label>결과일</label>
            <input type="date" data-field="resultAt" value="${s.resultAt || ''}" ${dis}>
          </div>${docField}
        </div>
        <textarea class="timeline-memo" data-field="memo" rows="2" placeholder="전형별 메모" ${dis}>${escapeHtml(s.memo || '')}</textarea>
      </div>
    </div>`;
  }).join('');
}

function findStage(app, stageId) {
  return app.stages.find(s => s.id === stageId);
}

/* ---------- 라우팅 ---------- */

const VIEW_TITLES = { list: '지원 내역', detail: '지원 내역', stats: '통계', calendar: '캘린더', notes: '메모', settings: '설정', help: '도움말' };

async function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById(`view-${name}`);
  if (target) target.hidden = false;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  document.title = `줍줍 | ${VIEW_TITLES[name] || 'JOOB'}`;
  if (name === 'list') renderTable();
  if (name === 'stats') { await loadApplicationsFromServer(); renderStatsView(); }
  if (name === 'calendar') renderCalendarView();
  if (name === 'notes') renderNotesView();
}

/* ---------- 인증 / 세션 ---------- */

function showAuthScreen(defaultTab) {
  document.title = '줍줍 | 로그인';
  document.getElementById('appShell').hidden = true;
  document.getElementById('authScreen').hidden = false;
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPw').value = '';
  document.getElementById('signupEmail').value = '';
  document.getElementById('signupPw').value = '';
  document.getElementById('signupPw2').value = '';
  document.getElementById('loginError').hidden = true;
  document.getElementById('signupError').hidden = true;
  activateAuthTab(defaultTab || 'login');
}

function activateAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('loginForm').hidden = tab !== 'login';
  document.getElementById('signupForm').hidden = tab !== 'signup';
  document.getElementById('forgotForm').hidden = true;
  document.getElementById('recoveryForm').hidden = true;
}

function showForgotForm() {
  document.getElementById('loginForm').hidden = true;
  document.getElementById('signupForm').hidden = true;
  document.getElementById('recoveryForm').hidden = true;
  document.getElementById('forgotForm').hidden = false;
}

function showRecoveryForm() {
  document.getElementById('appShell').hidden = true;
  document.getElementById('authScreen').hidden = false;
  document.getElementById('loginForm').hidden = true;
  document.getElementById('signupForm').hidden = true;
  document.getElementById('forgotForm').hidden = true;
  document.getElementById('recoveryForm').hidden = false;
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
}

async function enterApp(session) {
  currentUserId = session.user.id;
  currentUserEmail = session.user.email || '';
  document.getElementById('dropdownEmail').textContent = currentUserEmail;
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appShell').hidden = false;
  await loadApplicationsFromServer();
  await migrateLegacyStageData();
  await maybeOfferMigration();
  await migrateLegacyStageData();
  await runAutoStatusTransitions();
  showView('list');
  maybeShowReleaseModal(session);
}

function collectLegacyApplications() {
  const result = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf('jat_data_') === 0) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (Array.isArray(parsed.applications)) result.push(...parsed.applications);
        } catch (e) {}
      }
    }
  } catch (e) {}
  return result;
}

async function maybeOfferMigration() {
  if (safeGet(LEGACY_MIGRATED_KEY)) return;
  const legacy = collectLegacyApplications();
  if (!legacy.length) { safeSet(LEGACY_MIGRATED_KEY, '1'); return; }
  const proceed = confirm(`기존 브라우저에 저장된 지원 기록 ${legacy.length}건을 발견했습니다.\n\n현재 계정으로 가져오시겠습니까?`);
  if (!proceed) { safeSet(LEGACY_MIGRATED_KEY, '1'); return; }

  updateSaveStatus('saving');
  let successCount = 0;
  let firstError = '';
  for (const app of legacy) {
    if (!isValidUuid(app.id)) app.id = makeId();
    (app.stages || []).forEach(s => { if (!isValidUuid(s.id)) s.id = makeId(); });
    const result = await upsertApplicationRaw(app);
    if (result.ok) successCount++;
    else if (!firstError) firstError = result.message;
  }
  await loadApplicationsFromServer();
  showView('list');

  if (successCount === legacy.length) {
    updateSaveStatus('saved');
    alert(`${successCount}개의 지원 기록을 계정으로 가져왔습니다.`);
    safeSet(LEGACY_MIGRATED_KEY, '1');
  } else if (successCount > 0) {
    updateSaveStatus('error');
    alert(`${successCount}개는 가져왔지만 ${legacy.length - successCount}개는 실패했습니다.\n오류: ${firstError}\n\n새로고침하면 실패한 항목만 다시 시도합니다.`);
  } else {
    updateSaveStatus('error');
    alert(`가져오기에 실패했습니다.\n오류: ${firstError}\n\nSupabase에서 schema.sql이 정상적으로 실행되었는지 확인해주세요.`);
  }
}

async function init() {
  wireEvents();
  document.getElementById('addAppliedAt').value = todayStr();

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showRecoveryForm();
      return;
    }
    if (session && session.user) {
      if (currentUserId === session.user.id) return;
      await enterApp(session);
    } else {
      currentUserId = null;
      currentUserEmail = '';
      applications = [];
      document.getElementById('appShell').hidden = true;
      showAuthScreen('login');
    }
  });
}

/* ---------- 이벤트 바인딩 ---------- */

function wireEvents() {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => activateAuthTab(btn.dataset.tab));
  });

  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value.trim();
    const pw = document.getElementById('signupPw').value;
    const pw2 = document.getElementById('signupPw2').value;
    const errEl = document.getElementById('signupError');
    if (pw !== pw2) { errEl.textContent = '비밀번호가 일치하지 않습니다.'; errEl.hidden = false; return; }
    if (pw.length < 6) { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    const { data, error } = await supabaseClient.auth.signUp({ email, password: pw });
    if (error) { errEl.textContent = error.message; errEl.hidden = false; return; }
    if (!data.session) {
      alert('가입 확인 이메일을 보냈습니다. 메일함을 확인한 뒤 로그인해주세요.');
      activateAuthTab('login');
    }
  });

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPw').value;
    const errEl = document.getElementById('loginError');
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (error) { errEl.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.'; errEl.hidden = false; return; }
    errEl.hidden = true;
  });

  document.getElementById('forgotLinkBtn').addEventListener('click', showForgotForm);
  document.getElementById('backToLoginBtn').addEventListener('click', () => activateAuthTab('login'));

  document.getElementById('forgotForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    const msgEl = document.getElementById('forgotMsg');
    msgEl.hidden = false;
    if (error) { msgEl.textContent = error.message; msgEl.className = 'auth-error'; }
    else { msgEl.textContent = '재설정 링크를 이메일로 보냈습니다.'; msgEl.className = 'auth-note'; }
  });

  document.getElementById('recoveryForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('recoveryPw').value;
    const errEl = document.getElementById('recoveryError');
    if (pw.length < 6) { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) { errEl.textContent = error.message; errEl.hidden = false; return; }
    alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
    await supabaseClient.auth.signOut();
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  const accountMenuBtn = document.getElementById('accountMenuBtn');
  const accountDropdown = document.getElementById('accountDropdown');
  accountMenuBtn.addEventListener('click', () => { accountDropdown.hidden = !accountDropdown.hidden; });
  document.addEventListener('click', e => {
    if (!accountMenuBtn.contains(e.target) && !accountDropdown.contains(e.target)) accountDropdown.hidden = true;
  });
  document.getElementById('lockBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
  });

  document.getElementById('backToListBtn').addEventListener('click', () => showView('list'));

  ['searchInput', 'statusFilter', 'stageStatusFilter', 'stageFilter', 'positionFilter'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', renderTable);
    el.addEventListener('change', renderTable);
  });
  document.getElementById('resetFilterBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('stageStatusFilter').value = 'all';
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
  wireReleaseModal();
}

/* ---------- 업데이트 공지 모달 ---------- */

function formatReleaseDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderReleaseModal() {
  document.getElementById('releaseTitle').textContent = RELEASE_NOTE.title;
  document.getElementById('releaseDesc').innerHTML = escapeHtml(RELEASE_NOTE.description).replace(/\n/g, '<br>');
  document.getElementById('releaseVersion').textContent = 'v' + RELEASE_NOTE.version;
  document.getElementById('releaseUpdatedAt').textContent = formatReleaseDate(RELEASE_NOTE.updatedAt);
  document.getElementById('releaseItems').innerHTML = RELEASE_NOTE.items.map(it => `
    <div class="release-item">
      <div class="release-item-icon">${it.icon}</div>
      <div>
        <div class="release-item-title">${escapeHtml(it.title)}</div>
        <div class="release-item-desc">${escapeHtml(it.description)}</div>
      </div>
    </div>
  `).join('');
}

function maybeShowReleaseModal(session) {
  const hidden = session.user.user_metadata && session.user.user_metadata.hidden_update_version;
  if (hidden === RELEASE_NOTE.version) return;
  renderReleaseModal();
  document.getElementById('releaseModalOverlay').hidden = false;
}

function closeReleaseModal() {
  document.getElementById('releaseModalOverlay').hidden = true;
}

function wireReleaseModal() {
  document.getElementById('releaseConfirmBtn').addEventListener('click', closeReleaseModal);
  document.getElementById('releaseNeverBtn').addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.updateUser({ data: { hidden_update_version: RELEASE_NOTE.version } });
    if (error) console.error('공지 숨김 저장 실패', error);
    closeReleaseModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('releaseModalOverlay').hidden) closeReleaseModal();
  });
}

/* ---------- 기록 추가 Drawer ---------- */

function renderStageConfigList() {
  const el = document.getElementById('stageConfigList');
  el.innerHTML = draftStages.map((s, idx) => `
    <div class="stage-row" data-idx="${idx}">
      <button type="button" class="timeline-move" data-act="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="timeline-move" data-act="down" ${idx === draftStages.length - 1 ? 'disabled' : ''}>↓</button>
      <select data-field="category">
        ${STAGE_CATEGORIES.map(c => `<option value="${c}" ${s.category === c ? 'selected' : ''}>${STAGE_CATEGORY_LABELS[c]}</option>`).join('')}
      </select>
      <input type="text" value="${escapeHtml(s.name)}" placeholder="전형명" data-field="name" ${s.category === 'CUSTOM' ? '' : 'hidden'}>
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
    draftStages = DEFAULT_STAGE_CATEGORIES.map(cat => ({ id: makeId(), name: STAGE_CATEGORY_LABELS[cat], category: cat }));
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
    draftStages.push({ id: makeId(), name: '', category: 'CUSTOM' });
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
    if (!row || e.target.dataset.field !== 'name') return;
    draftStages[Number(row.dataset.idx)].name = e.target.value;
  });

  document.getElementById('stageConfigList').addEventListener('change', e => {
    const row = e.target.closest('.stage-row');
    if (!row || e.target.dataset.field !== 'category') return;
    const idx = Number(row.dataset.idx);
    draftStages[idx].category = e.target.value;
    draftStages[idx].name = e.target.value === 'CUSTOM' ? '' : STAGE_CATEGORY_LABELS[e.target.value];
    renderStageConfigList();
  });

  document.getElementById('addForm').addEventListener('submit', async e => {
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
    const stages = draftStages.map((s, idx) => {
      const category = s.category || 'CUSTOM';
      const name = category === 'CUSTOM' ? (s.name.trim() || `단계 ${idx + 1}`) : STAGE_CATEGORY_LABELS[category];
      return {
        id: s.id, name, category,
        status: defaultStatusForCategory(category),
        scheduledAt: '', resultAt: '', documentCheckedAt: '', memo: '',
        statusChangedAt: now, statusChangeSource: 'manual'
      };
    });

    const newApp = {
      id: makeId(),
      companyName, position, appliedAt,
      jobPostingUrl: document.getElementById('addUrl').value.trim(),
      companyMemo: document.getElementById('addMemo').value.trim(),
      createdAt: now, updatedAt: now,
      stages
    };

    const ok = await saveApplication(newApp);
    if (!ok) return;
    applications.push(newApp);
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
      document.getElementById('editInfoSave').addEventListener('click', async () => {
        const companyName = document.getElementById('editCompanyName').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const appliedAt = document.getElementById('editAppliedAt').value;
        if (!companyName || !position || !appliedAt) return;
        const prev = { companyName: app.companyName, position: app.position, appliedAt: app.appliedAt, jobPostingUrl: app.jobPostingUrl };
        app.companyName = companyName;
        app.position = position;
        app.appliedAt = appliedAt;
        app.jobPostingUrl = document.getElementById('editUrl').value.trim();
        const ok = await saveApplication(app);
        if (!ok) { Object.assign(app, prev); return; }
        renderDetail(app.id);
      });
    }
  });

  document.getElementById('companyMemoInput').addEventListener('blur', async () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const val = document.getElementById('companyMemoInput').value.trim();
    if (val === app.companyMemo) return;
    app.companyMemo = val;
    await saveApplication(app);
  });

  document.getElementById('deleteAppBtn').addEventListener('click', async () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    if (!confirm(`이 지원 기록을 삭제하시겠습니까?\n삭제한 기록은 복구할 수 없습니다.`)) return;
    const ok = await deleteApplicationRemote(app.id);
    if (!ok) return;
    applications = applications.filter(a => a.id !== app.id);
    showView('list');
  });

  document.getElementById('addStageBtn').addEventListener('click', async () => {
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    app.stages.push({
      id: makeId(), name: '', category: 'CUSTOM', status: '진행 전',
      scheduledAt: '', resultAt: '', documentCheckedAt: '', memo: '',
      statusChangedAt: new Date().toISOString(), statusChangeSource: 'manual'
    });
    await saveApplication(app);
    renderDetail(app.id);
  });

  const timeline = document.getElementById('timeline');

  timeline.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = btn.closest('.timeline-item');
    const idx = app.stages.findIndex(s => s.id === item.dataset.stageId);
    let removedId = null;
    if (btn.dataset.act === 'up' && idx > 0) {
      [app.stages[idx - 1], app.stages[idx]] = [app.stages[idx], app.stages[idx - 1]];
    } else if (btn.dataset.act === 'down' && idx < app.stages.length - 1) {
      [app.stages[idx + 1], app.stages[idx]] = [app.stages[idx], app.stages[idx + 1]];
    } else if (btn.dataset.act === 'remove') {
      if (app.stages.length <= 1) return;
      if (!confirm('이 전형 단계를 삭제하시겠습니까?')) return;
      removedId = app.stages[idx].id;
      app.stages.splice(idx, 1);
    } else {
      return;
    }
    await saveApplication(app);
    if (removedId) await deleteStageRemote(removedId);
    renderDetail(app.id);
  });

  timeline.addEventListener('change', async e => {
    const field = e.target.dataset.field;
    if (!field || field === 'name' || field === 'memo') return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = e.target.closest('.timeline-item');
    const idx = app.stages.findIndex(s => s.id === item.dataset.stageId);
    const stage = app.stages[idx];
    if (!stage || !isStageUnlocked(app, idx)) return;

    if (field === 'category') {
      stage.category = e.target.value;
      stage.name = stage.category === 'CUSTOM'
        ? (Object.values(STAGE_CATEGORY_LABELS).includes(stage.name) ? '' : stage.name)
        : STAGE_CATEGORY_LABELS[stage.category];
      if (!statusOptionsForCategory(stage.category).includes(stage.status)) {
        stage.status = defaultStatusForCategory(stage.category);
        stage.resultAt = '';
        stage.documentCheckedAt = '';
      }
      stage.statusChangedAt = new Date().toISOString();
      stage.statusChangeSource = 'manual';
      await saveApplication(app);
      renderDetail(app.id);
      return;
    }

    stage[field] = e.target.value;
    if (field === 'status') {
      stage.statusChangedAt = new Date().toISOString();
      stage.statusChangeSource = 'manual';
      if (DECIDED_STATUSES.includes(stage.status)) {
        stage.resultAt = todayStr();
      } else {
        stage.resultAt = '';
      }
      if (stage.status === '서류 확인') {
        stage.documentCheckedAt = todayStr();
      } else if (stage.status === '접수완료' || stage.status === '진행 전') {
        stage.documentCheckedAt = '';
      }
    }
    await saveApplication(app);
    const warnings = checkDateWarnings(app, stage);
    renderDetail(app.id);
    if (warnings.length) alert(warnings.join('\n'));
  });

  timeline.addEventListener('blur', async e => {
    const field = e.target.dataset.field;
    if (field !== 'name' && field !== 'memo') return;
    const app = applications.find(a => a.id === currentDetailId);
    if (!app) return;
    const item = e.target.closest('.timeline-item');
    const idx = app.stages.findIndex(s => s.id === item.dataset.stageId);
    const stage = app.stages[idx];
    if (!stage || !isStageUnlocked(app, idx)) return;
    const val = e.target.value.trim();
    if (val === stage[field]) return;
    stage[field] = val;
    await saveApplication(app);
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
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('invalid');
        if (confirm(`${data.length}건의 데이터를 서버 계정으로 가져옵니다. 계속할까요?`)) {
          updateSaveStatus('saving');
          let successCount = 0;
          let firstError = '';
          for (const app of data) {
            if (!isValidUuid(app.id)) app.id = makeId();
            (app.stages || []).forEach(s => { if (!isValidUuid(s.id)) s.id = makeId(); });
            const result = await upsertApplicationRaw(app);
            if (result.ok) successCount++;
            else if (!firstError) firstError = result.message;
          }
          await loadApplicationsFromServer();
          await migrateLegacyStageData();
          showView('list');
          if (successCount === data.length) {
            updateSaveStatus('saved');
            alert(`${successCount}건을 가져왔습니다.`);
          } else {
            updateSaveStatus('error');
            alert(`${successCount}/${data.length}건만 가져왔습니다.\n오류: ${firstError}`);
          }
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
    const newPw = document.getElementById('newPwSettings').value;
    if (newPw.length < 6) {
      errEl.textContent = '새 비밀번호는 6자 이상이어야 합니다.';
      errEl.hidden = false;
      return;
    }
    const { error } = await supabaseClient.auth.updateUser({ password: newPw });
    if (error) {
      errEl.textContent = error.message;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    document.getElementById('changePwForm').reset();
    alert('비밀번호가 변경되었습니다.');
  });

  document.getElementById('wipeDataBtn').addEventListener('click', async () => {
    if (!confirm('현재 계정의 모든 지원 내역을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
    const { error } = await supabaseClient.from('applications').delete().eq('user_id', currentUserId);
    if (error) { alert('삭제 실패: ' + error.message); return; }
    applications = [];
    showView('list');
  });
}

init();
