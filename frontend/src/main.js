// main.js – Application entry point
import './style.css';
import {
  buildLoginUI,
  handleSSOCallback,
  getToken,
  getRoleFromToken,
  clearToken,
  getUserInfoFromToken,
  getUserInfo,
  setUserInfo,
  TOKEN_KEY,
  API_URL
} from './login.js';

import { renderAdminUsersPage } from './adminUsers.js';
import { renderAdminQuestionsPage } from './TemplateEditor.js';
import { renderAdminToursPage } from './ToursManager.js';
import { renderStudentSurveysPage } from './studentSurveys.js';

// --- SYSTEM POWIADOMIEN (Toast) ---
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

function getDisplayName(identity) {
  const email = identity?.email || '';
  if (!email) return 'uzytkowniku';
  return email.split('@')[0] || email;
}

// --- NAWIGACJA ---
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
    </nav>
  `;
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });
}

// --- EKSPORT CSV (Tymczasowo wylaczony dla Sprint 4) ---
async function downloadCsv() {
  showToast('Eksport danych bedzie dostepny w Sprint 5', 'info');
  console.log('Endpoint /api/admin/export/csv jest obecnie nieaktywny.');
}

// --- PANEL ADMINISTRATORA ---
function renderAdminPanel(email) {
  const welcomeName = email ? email.split('@')[0] : 'uzytkowniku';

  document.querySelector('#app').innerHTML = `
    ${buildTopNav(email, 'Admin')}
    <main class="app-main">
      <div class="page-header">
        <h1>Panel Administratora</h1>
        <p>Witamy, <strong>${welcomeName}</strong>. Zarzadzaj turami, pytaniami, uzytkownikami i danymi systemu.</p>
      </div>

      <div class="dashboard-grid">
        <div class="dash-card" id="dash-users">
          <div class="dash-card__icon dash-card__icon-blue">👥</div>
          <div>
            <h3>Uzytkownicy</h3>
            <p>Zarzadzaj rolami i uprawnieniami kont w systemie.</p>
          </div>
          <div class="dash-card__arrow">Przejdz →</div>
        </div>

        <div class="dash-card" id="dash-tours">
          <div class="dash-card__icon dash-card__icon-amber">🗓️</div>
          <div>
            <h3>Tury Ankiet</h3>
            <p>Tworz i zarzadzaj turami, przypisuj studentow.</p>
          </div>
          <div class="dash-card__arrow">Przejdz →</div>
        </div>

        <div class="dash-card" id="dash-questions">
          <div class="dash-card__icon dash-card__icon-purple">📝</div>
          <div>
            <h3>Szablony Pytan</h3>
            <p>Edytuj pytania zamkniete i otwarte dla ankiet.</p>
          </div>
          <div class="dash-card__arrow">Przejdz →</div>
        </div>

        <div class="dash-card" id="dash-export" style="opacity: 0.7;">
          <div class="dash-card__icon dash-card__icon-teal">📥</div>
          <div>
            <h3>Eksport danych</h3>
            <p>Pobierz wyniki ankiet (Dostepne wkrotce).</p>
          </div>
          <div class="dash-card__arrow">Info</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3>Import danych USOS</h3>
            <p>Wczytaj liste studentow z pliku CSV eksportowanego z systemu USOS.</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <input type="file" id="usos-file" accept=".csv" style="font-size:14px; color:var(--muted);" />
          <button class="btn btn-secondary" id="usos-import-btn">📤 Importuj CSV</button>
          <span id="usos-status" class="text-muted"></span>
        </div>
      </div>
    </main>
  `;

  document.getElementById('dash-users').addEventListener('click', () => renderAdminUsersPage('Admin'));
  document.getElementById('dash-tours').addEventListener('click', () => renderAdminToursPage());
  document.getElementById('dash-questions').addEventListener('click', () => renderAdminQuestionsPage());
  document.getElementById('dash-export').addEventListener('click', downloadCsv);

  document.getElementById('usos-import-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('usos-file');
    const statusEl = document.getElementById('usos-status');
    const file = fileInput.files[0];

    if (!file) {
      showToast('Wybierz plik CSV', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      statusEl.textContent = 'Importowanie...';
      const resp = await fetch(`${API_URL}/api/usos/import-students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Blad importu');

      showToast(`Dodano ${data.new_students_added || data.new_students || 0} studentow`, 'success');
      statusEl.textContent = `Gotowe`;
    } catch (err) {
      showToast(err.message, 'error');
      statusEl.textContent = 'Blad importu';
    }
  });

  setupLogout();
}

async function resolveIdentity(token) {
  const stored = getUserInfo();
  if (stored?.email) return stored;

  try {
    const resp = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const identity = {
      id: data.id,
      email: data.email,
      role: data.role,
      display_name: data.display_name
    };
    setUserInfo(identity);
    return identity;
  } catch {
    return null;
  }
}

// --- INICJALIZACJA APLIKACJI ---
async function initApp() {
  const callbackRole = handleSSOCallback();
  const token = getToken();
  let role = callbackRole || (token ? getRoleFromToken(token) : null);

  if (role) role = role.toLowerCase();

  if (!role) {
    buildLoginUI(document.querySelector('#app'));
    return;
  }

  const tokenInfo = getUserInfoFromToken(token);
  let identity = getUserInfo() || null;

  const tokenUserId = tokenInfo?.sub ? Number(tokenInfo.sub) : null;
  const storedUserId = typeof identity?.id === 'number' ? identity.id : null;
  const isStaleIdentity = tokenUserId && storedUserId && tokenUserId !== storedUserId;

  if ((!identity?.email || isStaleIdentity) && token) {
    identity = await resolveIdentity(token);
  }

  const email = identity?.email || tokenInfo?.email || 'uzytkownik';
  const displayName = identity?.display_name || getDisplayName({ email });

  if (role === 'admin' || role === 'administrator') {
    renderAdminPanel(email);
  } else {
    renderStudentSurveysPage(email, role, displayName);
  }
}

initApp();



