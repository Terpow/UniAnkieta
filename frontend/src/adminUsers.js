// adminUsers.js – Admin user management (UC-35)
import { apiRequest } from './api.js';
import { clearToken } from './login.js';

const ROLE_OPTIONS = ['Admin', 'Teacher', 'Student'];

const ROLE_BADGE = {
  admin:   { cls: 'badge-blue',  label: 'Admin'   },
  teacher: { cls: 'badge-amber', label: 'Teacher' },
  student: { cls: 'badge-green', label: 'Student' }
};

function normalizeRole(role) {
  return role ? String(role).toLowerCase() : 'student';
}

function buildNav(email = '') {
  const initials = email ? email.slice(0, 2).toUpperCase() : 'AD';
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="role-tag role-tag-admin">Admin</span>
        </div>
        <button id="back-to-admin" class="btn btn-ghost btn-sm">← Powrót</button>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>
  `;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state" style="padding:32px">
            <div class="empty-state__icon">👥</div>
            <h3>Brak użytkowników</h3>
            <p>System nie zawiera jeszcze żadnych użytkowników.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = users.map((user) => {
    const roleKey = normalizeRole(user.role);
    const badge = ROLE_BADGE[roleKey] || ROLE_BADGE.student;
    const options = ROLE_OPTIONS.map((r) =>
      `<option value="${r}" ${r === user.role ? 'selected' : ''}>${r}</option>`
    ).join('');

    return `
      <tr>
        <td><code style="color:var(--brand); font-weight:700;">#${user.id}</code></td>
        <td style="font-weight:500;">${escapeHtml(user.email)}</td>
        <td><span class="badge ${badge.cls}">${badge.label}</span></td>
        <td>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="role-select" data-user-id="${user.id}">
              ${options}
            </select>
            <button class="btn btn-secondary btn-sm save-role-btn" data-user-id="${user.id}">
              Zapisz
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.save-role-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const select = tbody.querySelector(`select[data-user-id="${userId}"]`);
      if (!select) return;
      await updateRole(userId, select.value, btn);
    });
  });
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showStatus(msg, type = 'info') {
  const el = document.getElementById('users-status');
  if (!el) return;
  if (!msg) { el.innerHTML = ''; return; }
  const cls = { info: 'alert-info', success: 'alert-success', error: 'alert-error' }[type] || 'alert-info';
  el.innerHTML = `<div class="alert ${cls}">${msg}</div>`;
}

async function fetchUsers() {
  const tbody = document.getElementById('users-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="4"><div class="loader"><div class="spinner"></div></div></td></tr>`;

  try {
    const users = await apiRequest('/api/admin/users');
    renderUsersTable(users);
    showStatus(`Załadowano ${users.length} użytkowników.`, 'success');
    setTimeout(() => showStatus(''), 3000);
  } catch (err) {
    showStatus(`Błąd: ${err.message}`, 'error');
  }
}

async function updateRole(userId, roleName, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  try {
    await apiRequest(`/api/admin/users/${userId}/role?new_role=${encodeURIComponent(roleName)}`, 'PATCH');
    window.showToast?.(`Rola użytkownika #${userId} zmieniona na ${roleName}.`, 'success');
    await fetchUsers();
  } catch (err) {
    window.showToast?.(`Błąd: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = original;
  }
}

export function renderAdminUsersPage(callerRole = null) {
  const app = document.querySelector('#app');
  if (!app) return;

  app.innerHTML = `
    ${buildNav()}
    <main class="app-main">
      <div class="page-header">
        <h1>Zarządzanie użytkownikami</h1>
        <p>Przeglądaj i zmieniaj role wszystkich kont w systemie.</p>
      </div>
      <div id="users-status"></div>
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Lista użytkowników</h3>
            <p>Kliknij "Zapisz" aby zatwierdzić zmianę roli.</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="refresh-users-btn">🔄 Odśwież</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:60px">ID</th>
                <th>Email</th>
                <th>Rola</th>
                <th>Zmień rolę</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              <tr><td colspan="4"><div class="loader"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  `;

  document.getElementById('back-to-admin')?.addEventListener('click', () => window.location.reload());
  document.getElementById('refresh-users-btn')?.addEventListener('click', fetchUsers);
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });

  fetchUsers();
}