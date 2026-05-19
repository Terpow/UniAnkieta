// main.js – Application entry point  (Sprint 5 update)
import './style.css';
import { buildLoginUI, handleSSOCallback, getToken, getRoleFromToken,
         clearToken, getUserInfoFromToken, TOKEN_KEY, API_URL } from './login.js';
import { renderAdminUsersPage }      from './adminUsers.js';
import { renderAdminQuestionsPage }  from './TemplateEditor.js';
import { renderAdminToursPage }      from './ToursManager.js';
import { renderStudentSurveysPage }  from './studentSurveys.js';
import { renderTeacherDashboard }    from './TeacherDashboard.js';   // Sprint 5

// ── Toast system ───────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

// ── Nav builder ────────────────────────────────────────────────────────────
function buildTopNav(email, role) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleClass = `role-tag-${role.toLowerCase()}`;
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="topnav__user-email" style="font-size:13px; color:var(--muted)">${email}</span>
          <span class="role-tag ${roleClass}">${roleLabel}</span>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>`;
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken(); localStorage.clear(); window.location.href = '/';
  });
}

// ── Admin panel ────────────────────────────────────────────────────────────
function renderAdminPanel(email) {
  document.querySelector('#app').innerHTML = `
    ${buildTopNav(email, 'Admin')}
    <main class="app-main">
      <div class="page-header">
        <h1>Panel Administratora</h1>
        <p>Zarządzaj turami, pytaniami, użytkownikami i danymi systemu.</p>
      </div>

      <div class="dashboard-grid">
        <div class="dash-card" id="dash-users">
          <div class="dash-card__icon dash-card__icon-blue">👥</div>
          <div>
            <h3>Użytkownicy</h3>
            <p>Zarządzaj rolami i uprawnieniami kont w systemie.</p>
          </div>
          <div class="dash-card__arrow">Przejdź →</div>
        </div>

        <div class="dash-card" id="dash-tours">
          <div class="dash-card__icon dash-card__icon-amber">🗓️</div>
          <div>
            <h3>Tury Ankiet</h3>
            <p>Twórz i zarządzaj turami, przypisuj studentów.</p>
          </div>
          <div class="dash-card__arrow">Przejdź →</div>
        </div>

        <div class="dash-card" id="dash-questions">
          <div class="dash-card__icon dash-card__icon-purple">📝</div>
          <div>
            <h3>Szablony Pytań</h3>
            <p>Edytuj pytania zamknięte i otwarte dla ankiet.</p>
          </div>
          <div class="dash-card__arrow">Przejdź →</div>
        </div>

        <!-- Sprint 5: opens TeacherDashboard with real charts + CSV/PDF export -->
        <div class="dash-card" id="dash-export">
          <div class="dash-card__icon dash-card__icon-teal">📊</div>
          <div>
            <h3>Statystyki & Eksport</h3>
            <p>Wykresy wyników, eksport CSV i PDF (RODO-compliant).</p>
          </div>
          <div class="dash-card__arrow">Otwórz →</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Import danych USOS</h3>
            <p>Wczytaj listę studentów z pliku CSV eksportowanego z systemu USOS.</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <input type="file" id="usos-file" accept=".csv" style="font-size:14px; color:var(--muted);" />
          <button class="btn btn-secondary" id="usos-import-btn">📤 Importuj CSV</button>
          <span id="usos-status" class="text-muted"></span>
        </div>
        <p class="text-sm text-muted" style="margin-top:12px;">
          Format CSV: kolumny <code>email</code>, <code>sso_id</code>, <code>group_name</code>
        </p>
      </div>
    </main>`;

  document.getElementById('dash-users').addEventListener('click', () => renderAdminUsersPage('Admin'));
  document.getElementById('dash-tours').addEventListener('click', () => renderAdminToursPage());
  document.getElementById('dash-questions').addEventListener('click', () => renderAdminQuestionsPage());
  document.getElementById('dash-export').addEventListener('click', () => renderTeacherDashboard(email));

  document.getElementById('usos-import-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('usos-file');
    const statusEl  = document.getElementById('usos-status');
    const file = fileInput.files[0];
    if (!file) { statusEl.textContent = 'Wybierz plik CSV.'; return; }

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem(TOKEN_KEY);
    statusEl.textContent = 'Importowanie...';

    try {
      const resp = await fetch(`${API_URL}/api/usos/import-students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Błąd importu');
      statusEl.textContent = `✅ Dodano ${data.new_students_added} nowych studentów.`;
      showToast(`Import zakończony: +${data.new_students_added} studentów`, 'success');
    } catch (err) {
      statusEl.textContent = `❌ ${err.message}`;
      showToast(err.message, 'error');
    }
  });

  setupLogout();
}

// ── App initializer ────────────────────────────────────────────────────────
function initApp() {
  const callbackRole = handleSSOCallback();
  const token = getToken();
  let role = callbackRole || (token ? getRoleFromToken(token) : null);
  if (role) role = role.toLowerCase();

  if (!role) {
    buildLoginUI(document.querySelector('#app'));
    return;
  }

  const info  = getUserInfoFromToken(token);
  const email = info?.email || info?.sub || '';

  if (role === 'admin' || role === 'administrator') {
    renderAdminPanel(email);
    return;
  }

  // Teacher → open stats dashboard directly
  if (role === 'teacher') {
    renderTeacherDashboard(email);
    return;
  }

  // Student
  renderStudentSurveysPage(email, role);
}

initApp();