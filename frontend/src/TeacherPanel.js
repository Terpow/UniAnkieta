// TeacherPanel.js –  Full Teacher Panel 
// Mirrors AdminPanel but scoped to Teacher role permissions.
// Teachers can: manage question templates, create/edit tours, assign students.
// Teachers CANNOT: manage user roles, delete tours.

import { apiRequest, API_URL } from './api.js';
import { clearToken, TOKEN_KEY } from './login.js';

let state = {
  tours: [],
  questions: [],
  students: [],
  activeTourId: null,
  tourStudents: [],
  view: 'dashboard', // 'dashboard' | 'tours' | 'tour-students' | 'questions'
};

let teacherEmail = '';

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pl-PL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDatetimeLocal(v) {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Nav ────────────────────────────────────────────────────────────────────

function buildNav() {
  const initials = teacherEmail ? teacherEmail.slice(0, 2).toUpperCase() : 'TC';
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div id="notif-bell" class="notif-bell" title="Powiadomienia">
          🔔 <span id="notif-count" class="notif-badge hidden">0</span>
        </div>
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="topnav__user-email" style="font-size:13px;color:var(--muted)">${teacherEmail}</span>
          <span class="role-tag role-tag-teacher">Teacher</span>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>
    <div id="notif-panel" class="notif-panel hidden"></div>
  `;
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken(); localStorage.clear(); window.location.href = '/';
  });
}

function renderLayout(content) {
  document.querySelector('#app').innerHTML = buildNav() + `<main class="app-main">${content}</main>`;
  setupLogout();
  loadNotifications();
  document.getElementById('notif-bell')?.addEventListener('click', toggleNotifPanel);
}

//  Notifications 

async function loadNotifications() {
  try {
    const data = await apiRequest('/api/notifications');
    const count = data.count || 0;
    const badge = document.getElementById('notif-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
    window._notifications = data.notifications || [];
  } catch { /* silent */ }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    renderNotifPanel(panel);
  }
}

function renderNotifPanel(panel) {
  const notifs = window._notifications || [];
  if (!notifs.length) {
    panel.innerHTML = `<div class="notif-empty">Brak nowych powiadomień 🎉</div>`;
    return;
  }
  panel.innerHTML = notifs.map(n => `
    <div class="notif-item notif-${n.priority}">
      <div class="notif-item__icon">${n.type === 'tour_ending_soon' ? '⏰' : '📋'}</div>
      <div>
        <div class="notif-item__title">${escapeHtml(n.title)}</div>
        <div class="notif-item__body">${escapeHtml(n.body)}</div>
      </div>
    </div>
  `).join('');
}

// Dashboard 

function renderDashboard() {
  state.view = 'dashboard';
  renderLayout(`
    <div class="page-header">
      <h1>Panel Nauczyciela</h1>
      <p>Zarządzaj turami ankiet, szablonami pytań i przypisuj studentów.</p>
    </div>

    <div class="dashboard-grid">
      <div class="dash-card" id="tc-tours">
        <div class="dash-card__icon dash-card__icon-amber">🗓️</div>
        <div>
          <h3>Tury Ankiet</h3>
          <p>Twórz i edytuj tury, przypisuj studentów do ankiet.</p>
        </div>
        <div class="dash-card__arrow">Przejdź →</div>
      </div>

      <div class="dash-card" id="tc-questions">
        <div class="dash-card__icon dash-card__icon-purple">📝</div>
        <div>
          <h3>Szablony Pytań</h3>
          <p>Dodawaj i zarządzaj pytaniami zamkniętymi i otwartymi.</p>
        </div>
        <div class="dash-card__arrow">Przejdź →</div>
      </div>

      <div class="dash-card" id="tc-stats">
        <div class="dash-card__icon dash-card__icon-teal">📊</div>
        <div>
          <h3>Statystyki</h3>
          <p>Przeglądaj wyniki i raporty ankiet.</p>
        </div>
        <div class="dash-card__arrow">Otwórz →</div>
      </div>
    </div>

    <div id="teacher-summary" class="card">
      <div class="card-header"><h3>Podsumowanie</h3></div>
      <div class="loader"><div class="spinner"></div></div>
    </div>
  `);

  document.getElementById('tc-tours')?.addEventListener('click', renderToursView);
  document.getElementById('tc-questions')?.addEventListener('click', renderQuestionsView);
  document.getElementById('tc-stats')?.addEventListener('click', () => {
    import('./TeacherDashboard.js').then(m => m.renderTeacherDashboard(teacherEmail));
  });

  loadSummary();
}

async function loadSummary() {
  const el = document.getElementById('teacher-summary');
  if (!el) return;
  try {
    const [summary, tours, questions] = await Promise.all([
      apiRequest('/api/admin/analytics/summary'),
      apiRequest('/api/teacher/tours'),
      apiRequest('/api/teacher/questions'),
    ]);
    const activeTours = tours.filter(t => t.is_active).length;
    const activeQ = questions.filter(q => q.is_active).length;
    el.innerHTML = `
      <div class="card-header"><h3>Podsumowanie systemu</h3></div>
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-item__value">${tours.length}</div>
          <div class="stat-item__label">Wszystkich tur</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value stat-green">${activeTours}</div>
          <div class="stat-item__label">Aktywnych tur</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value">${questions.length}</div>
          <div class="stat-item__label">Szablonów pytań</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value stat-blue">${activeQ}</div>
          <div class="stat-item__label">Aktywnych pytań</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value">${summary.surveys_submitted}</div>
          <div class="stat-item__label">Wypełnionych ankiet</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value stat-amber">${summary.fill_rate_percent}%</div>
          <div class="stat-item__label">Wskaźnik wypełnienia</div>
        </div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--warn)">Błąd ładowania: ${escapeHtml(err.message)}</p>`;
  }
}

//  Tours View 

async function renderToursView() {
  state.view = 'tours';
  renderLayout(`
    <div class="page-header">
      <div class="page-header__breadcrumb">
        <button id="back-to-dash" class="btn btn-ghost btn-sm">← Powrót</button>
        <span>/</span><span>Tury Ankiet</span>
      </div>
      <h1>Zarządzanie Turami</h1>
      <p>Twórz tury, aktywuj je i przypisuj studentów.</p>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <h3>Nowa tura</h3>
      </div>
      <div class="tour-form-grid">
        <div class="field">
          <label>Nazwa tury</label>
          <input type="text" id="tour-name" placeholder="np. Ankieta – Semestr Zimowy 2025/26" />
        </div>
        <div class="field">
          <label>Data startu</label>
          <input type="datetime-local" id="tour-start" />
        </div>
        <div class="field">
          <label>Data końca</label>
          <input type="datetime-local" id="tour-end" />
        </div>
      </div>
      <div style="display:flex; gap:12px; margin-top:8px;">
        <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer;">
          <input type="checkbox" id="tour-active" checked /> Aktywna od razu
        </label>
        <button class="btn btn-primary" id="create-tour-btn" style="width:auto; padding:10px 24px; margin-top:0;">
          ＋ Utwórz turę
        </button>
      </div>
      <div id="tour-create-status" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Lista tur</h3>
        <button class="btn btn-secondary btn-sm" id="refresh-tours-btn">🔄 Odśwież</button>
      </div>
      <div id="tours-list"><div class="loader"><div class="spinner"></div></div></div>
    </div>
  `);

  document.getElementById('back-to-dash')?.addEventListener('click', renderDashboard);
  document.getElementById('create-tour-btn')?.addEventListener('click', createTour);
  document.getElementById('refresh-tours-btn')?.addEventListener('click', fetchAndRenderTours);
  fetchAndRenderTours();
}

async function fetchAndRenderTours() {
  const el = document.getElementById('tours-list');
  if (el) el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  try {
    state.tours = await apiRequest('/api/teacher/tours');
    renderToursList();
  } catch (err) {
    if (el) el.innerHTML = `<p style="color:var(--warn)">Błąd: ${escapeHtml(err.message)}</p>`;
  }
}

function renderToursList() {
  const el = document.getElementById('tours-list');
  if (!el) return;
  if (!state.tours.length) {
    el.innerHTML = `<div class="empty-state" style="padding:32px">
      <div class="empty-state__icon">🗓️</div>
      <h3>Brak tur</h3><p>Utwórz pierwszą turę używając formularza powyżej.</p>
    </div>`;
    return;
  }
  const now = new Date();
  el.innerHTML = `<div style="overflow-x:auto;">
    <table class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>Nazwa</th><th>Start</th><th>Koniec</th>
          <th>Status</th><th>Akcje</th>
        </tr>
      </thead>
      <tbody>
        ${state.tours.map(t => {
          const start = new Date(t.start_date);
          const end = new Date(t.end_date);
          const isRunning = t.is_active && start <= now && end >= now;
          const statusBadge = t.is_active
            ? (isRunning ? '<span class="badge badge-green">Aktywna</span>' : '<span class="badge badge-amber">Aktywna (inna data)</span>')
            : '<span class="badge badge-gray">Nieaktywna</span>';
          return `
            <tr>
              <td><code style="color:var(--brand); font-weight:700;">#${t.id}</code></td>
              <td style="font-weight:500;">${escapeHtml(t.name)}</td>
              <td>${formatDate(t.start_date)}</td>
              <td>${formatDate(t.end_date)}</td>
              <td>${statusBadge}</td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm toggle-tour-btn"
                    data-id="${t.id}" data-active="${t.is_active}">
                    ${t.is_active ? '⏸ Deaktywuj' : '▶ Aktywuj'}
                  </button>
                  <button class="btn btn-secondary btn-sm assign-students-btn"
                    data-id="${t.id}" data-name="${escapeHtml(t.name)}">
                    👥 Studenci
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  el.querySelectorAll('.toggle-tour-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleTour(Number(btn.dataset.id), btn.dataset.active === 'true'));
  });
  el.querySelectorAll('.assign-students-btn').forEach(btn => {
    btn.addEventListener('click', () => openTourStudents(Number(btn.dataset.id), btn.dataset.name));
  });
}

async function createTour() {
  const name = document.getElementById('tour-name')?.value?.trim();
  const start = document.getElementById('tour-start')?.value;
  const end = document.getElementById('tour-end')?.value;
  const isActive = document.getElementById('tour-active')?.checked ?? true;
  const statusEl = document.getElementById('tour-create-status');

  if (!name || !start || !end) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ Wypełnij wszystkie pola.</div>`;
    return;
  }
  if (new Date(start) >= new Date(end)) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ Data końca musi być późniejsza niż start.</div>`;
    return;
  }

  const btn = document.getElementById('create-tour-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Tworzenie…'; }
  try {
    await apiRequest('/api/teacher/tours', 'POST', {
      name,
      start_date: new Date(start).toISOString(),
      end_date: new Date(end).toISOString(),
      is_active: isActive,
    });
    window.showToast?.('Tura utworzona! 🗓️', 'success');
    document.getElementById('tour-name').value = '';
    document.getElementById('tour-start').value = '';
    document.getElementById('tour-end').value = '';
    if (statusEl) statusEl.innerHTML = '';
    fetchAndRenderTours();
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ ${escapeHtml(err.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '＋ Utwórz turę'; }
  }
}

async function toggleTour(id, currentlyActive) {
  try {
    await apiRequest(`/api/teacher/tours/${id}`, 'PATCH', { is_active: !currentlyActive });
    window.showToast?.(currentlyActive ? 'Tura deaktywowana.' : 'Tura aktywowana! ✅', 'success');
    fetchAndRenderTours();
  } catch (err) {
    window.showToast?.(`Błąd: ${err.message}`, 'error');
  }
}

// Tour Students Assignment 

async function openTourStudents(tourId, tourName) {
  state.activeTourId = tourId;
  state.view = 'tour-students';
  renderLayout(`
    <div class="page-header">
      <div class="page-header__breadcrumb">
        <button id="back-to-tours" class="btn btn-ghost btn-sm">← Powrót</button>
        <span>/</span><span>Tury</span><span>/</span>
        <span>${escapeHtml(tourName)}</span>
      </div>
      <h1>Przypisanie studentów</h1>
      <p>Zarządzaj dostępem studentów do tury: <strong>${escapeHtml(tourName)}</strong></p>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <input type="text" id="student-search" placeholder="🔍 Szukaj studenta po e-mail..." 
          style="flex:1; padding:10px 14px; border:1.5px solid var(--line); border-radius:8px; font-family:inherit; font-size:14px; outline:none;" />
        <button class="btn btn-primary" id="assign-all-btn" style="width:auto; padding:10px 20px; margin:0;">
          👥 Przypisz wszystkich
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Studenci</h3>
        <div style="display:flex; gap:8px;">
          <span id="assigned-count" class="badge badge-green">—</span>
          <button class="btn btn-secondary btn-sm" id="refresh-students-btn">🔄</button>
        </div>
      </div>
      <div id="students-list"><div class="loader"><div class="spinner"></div></div></div>
    </div>
  `);

  document.getElementById('back-to-tours')?.addEventListener('click', renderToursView);
  document.getElementById('assign-all-btn')?.addEventListener('click', assignAll);
  document.getElementById('refresh-students-btn')?.addEventListener('click', fetchTourStudents);
  document.getElementById('student-search')?.addEventListener('input', filterStudents);

  fetchTourStudents();
}

let _allStudentRows = [];

async function fetchTourStudents() {
  const el = document.getElementById('students-list');
  if (el) el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  try {
    state.tourStudents = await apiRequest(`/api/teacher/tours/${state.activeTourId}/students`);
    _allStudentRows = state.tourStudents;
    renderStudentRows(state.tourStudents);
    updateAssignedCount();
  } catch (err) {
    if (el) el.innerHTML = `<p style="color:var(--warn)">Błąd: ${escapeHtml(err.message)}</p>`;
  }
}

function filterStudents() {
  const q = document.getElementById('student-search')?.value?.toLowerCase() || '';
  const filtered = _allStudentRows.filter(s => s.email.toLowerCase().includes(q));
  renderStudentRows(filtered);
}

function updateAssignedCount() {
  const count = _allStudentRows.filter(s => s.has_token).length;
  const el = document.getElementById('assigned-count');
  if (el) el.textContent = `${count} / ${_allStudentRows.length} przypisanych`;
}

function renderStudentRows(students) {
  const el = document.getElementById('students-list');
  if (!el) return;
  if (!students.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px">
      <div class="empty-state__icon">🔍</div><p>Brak wyników.</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="overflow-x:auto;">
    <table class="data-table">
      <thead>
        <tr><th>Email</th><th>Grupa</th><th>Status</th><th>Akcja</th></tr>
      </thead>
      <tbody>
        ${students.map(s => {
          const badge = s.token_used
            ? '<span class="badge badge-gray">Wypełniona</span>'
            : s.has_token
              ? '<span class="badge badge-green">Przypisany</span>'
              : '<span class="badge badge-amber">Nieprzypisany</span>';
          const action = s.token_used
            ? '<span class="text-muted" style="font-size:13px;">—</span>'
            : s.has_token
              ? `<button class="btn btn-danger btn-sm remove-student-btn" data-id="${s.id}">Usuń</button>`
              : `<button class="btn btn-secondary btn-sm add-student-btn" data-id="${s.id}">＋ Przypisz</button>`;
          return `<tr>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.group || '—')}</td>
            <td>${badge}</td>
            <td>${action}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  el.querySelectorAll('.add-student-btn').forEach(btn => {
    btn.addEventListener('click', () => assignStudent(Number(btn.dataset.id)));
  });
  el.querySelectorAll('.remove-student-btn').forEach(btn => {
    btn.addEventListener('click', () => removeStudent(Number(btn.dataset.id)));
  });
}

async function assignStudent(studentId) {
  try {
    await apiRequest(`/api/teacher/tours/${state.activeTourId}/students/${studentId}`, 'POST');
    window.showToast?.('Student przypisany ✅', 'success');
    fetchTourStudents();
  } catch (err) { window.showToast?.(err.message, 'error'); }
}

async function removeStudent(studentId) {
  try {
    await apiRequest(`/api/teacher/tours/${state.activeTourId}/students/${studentId}`, 'DELETE');
    window.showToast?.('Student usunięty z tury.', 'success');
    fetchTourStudents();
  } catch (err) { window.showToast?.(err.message, 'error'); }
}

async function assignAll() {
  const btn = document.getElementById('assign-all-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Przypisywanie…'; }
  try {
    const data = await apiRequest(`/api/teacher/tours/${state.activeTourId}/assign-all`, 'POST');
    window.showToast?.(`Przypisano ${data.assigned} studentów ✅`, 'success');
    fetchTourStudents();
  } catch (err) {
    window.showToast?.(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '👥 Przypisz wszystkich'; }
  }
}

//  Questions View 

async function renderQuestionsView() {
  state.view = 'questions';
  renderLayout(`
    <div class="page-header">
      <div class="page-header__breadcrumb">
        <button id="back-to-dash-q" class="btn btn-ghost btn-sm">← Powrót</button>
        <span>/</span><span>Szablony Pytań</span>
      </div>
      <h1>Szablony Pytań</h1>
      <p>Twórz i zarządzaj pytaniami używanymi we wszystkich ankietach.</p>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><h3>Dodaj pytanie</h3></div>
      <div class="field">
        <label>Treść pytania</label>
        <textarea id="q-text" rows="2" placeholder="Jak oceniasz jakość prowadzenia zajęć?"></textarea>
      </div>
      <div style="display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px;">
        <div class="field" style="margin-bottom:0; flex:1; min-width:180px;">
          <label>Typ</label>
          <select id="q-type">
            <option value="closed">Zamknięte (wybór)</option>
            <option value="open">Otwarte (tekst)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="add-q-btn" style="width:auto; padding:10px 24px; margin:0;">
          ＋ Dodaj pytanie
        </button>
      </div>
      <div id="choices-area" style="display:flex; flex-direction:column; gap:8px;">
        <div class="field" style="margin-bottom:0;">
          <label>Opcje odpowiedzi (po jednej w linii)</label>
          <textarea id="q-choices" rows="4" placeholder="Bardzo dobrze&#10;Dobrze&#10;Średnio&#10;Słabo"></textarea>
        </div>
      </div>
      <div id="q-create-status" style="margin-top:12px;"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Lista pytań</h3>
        <button class="btn btn-secondary btn-sm" id="refresh-q-btn">🔄 Odśwież</button>
      </div>
      <div id="questions-list"><div class="loader"><div class="spinner"></div></div></div>
    </div>
  `);

  document.getElementById('back-to-dash-q')?.addEventListener('click', renderDashboard);
  document.getElementById('add-q-btn')?.addEventListener('click', createQuestion);
  document.getElementById('refresh-q-btn')?.addEventListener('click', fetchAndRenderQuestions);

  const qType = document.getElementById('q-type');
  const choicesArea = document.getElementById('choices-area');
  qType?.addEventListener('change', () => {
    choicesArea.style.display = qType.value === 'closed' ? 'flex' : 'none';
  });

  fetchAndRenderQuestions();
}

async function fetchAndRenderQuestions() {
  const el = document.getElementById('questions-list');
  if (el) el.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  try {
    state.questions = await apiRequest('/api/teacher/questions');
    renderQuestionsList();
  } catch (err) {
    if (el) el.innerHTML = `<p style="color:var(--warn)">Błąd: ${escapeHtml(err.message)}</p>`;
  }
}

function renderQuestionsList() {
  const el = document.getElementById('questions-list');
  if (!el) return;
  if (!state.questions.length) {
    el.innerHTML = `<div class="empty-state" style="padding:32px">
      <div class="empty-state__icon">📝</div>
      <h3>Brak pytań</h3><p>Dodaj pierwsze pytanie powyżej.</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="overflow-x:auto;">
    <table class="data-table">
      <thead>
        <tr><th>ID</th><th>Pytanie</th><th>Typ</th><th>Status</th><th>Akcje</th></tr>
      </thead>
      <tbody>
        ${state.questions.map(q => `
          <tr>
            <td><code style="color:var(--brand); font-weight:700;">#${q.id}</code></td>
            <td style="max-width:380px;">${escapeHtml(q.text)}</td>
            <td>
              <span class="badge ${q.question_type === 'closed' ? 'badge-blue' : 'badge-amber'}">
                ${q.question_type === 'closed' ? '✓ Zamknięte' : '✍ Otwarte'}
              </span>
            </td>
            <td>
              <span class="badge ${q.is_active ? 'badge-green' : 'badge-gray'}">
                ${q.is_active ? 'Aktywne' : 'Nieaktywne'}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn-sm toggle-q-btn" data-id="${q.id}">
                  ${q.is_active ? '⏸ Deaktywuj' : '▶ Aktywuj'}
                </button>
                <button class="btn btn-danger btn-sm delete-q-btn" data-id="${q.id}">
                  🗑 Usuń
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;

  el.querySelectorAll('.toggle-q-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleQuestion(Number(btn.dataset.id)));
  });
  el.querySelectorAll('.delete-q-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteQuestion(Number(btn.dataset.id)));
  });
}

async function createQuestion() {
  const text = document.getElementById('q-text')?.value?.trim();
  const type = document.getElementById('q-type')?.value || 'closed';
  const rawChoices = document.getElementById('q-choices')?.value || '';
  const statusEl = document.getElementById('q-create-status');

  if (!text) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ Wpisz treść pytania.</div>`;
    return;
  }
  const choices = type === 'closed'
    ? rawChoices.split('\n').map(s => s.trim()).filter(Boolean)
    : [];
  if (type === 'closed' && choices.length < 2) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ Dodaj co najmniej 2 opcje odpowiedzi.</div>`;
    return;
  }

  const btn = document.getElementById('add-q-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Dodawanie…'; }
  try {
    await apiRequest('/api/teacher/questions', 'POST', { text, question_type: type, choices });
    window.showToast?.('Pytanie dodane! 📝', 'success');
    document.getElementById('q-text').value = '';
    document.getElementById('q-choices').value = '';
    if (statusEl) statusEl.innerHTML = '';
    fetchAndRenderQuestions();
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-error">⚠️ ${escapeHtml(err.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '＋ Dodaj pytanie'; }
  }
}

async function toggleQuestion(id) {
  try {
    await apiRequest(`/api/teacher/questions/${id}`, 'PATCH');
    window.showToast?.('Status pytania zmieniony ✅', 'success');
    fetchAndRenderQuestions();
  } catch (err) { window.showToast?.(err.message, 'error'); }
}

async function deleteQuestion(id) {
  if (!confirm('Czy na pewno chcesz usunąć to pytanie? Operacja jest nieodwracalna.')) return;
  try {
    await apiRequest(`/api/teacher/questions/${id}`, 'DELETE');
    window.showToast?.('Pytanie usunięte.', 'success');
    fetchAndRenderQuestions();
  } catch (err) { window.showToast?.(err.message, 'error'); }
}

//Export 

export function renderTeacherPanel(email = '') {
  teacherEmail = email;
  renderDashboard();
}
