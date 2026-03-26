import { getRoleFromToken, getToken, clearToken } from './login.js';

const API_BASE_URL = 'http://localhost:8000/api';
const USERS_URL = `${API_BASE_URL}/admin/users`;

const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Student', label: 'Student' }
];

const ROLE_CLASS = {
  admin: 'role-admin',
  teacher: 'role-teacher',
  student: 'role-student'
};

function normalizeRole(role) {
  return role ? String(role).toLowerCase() : '';
}

function getStoredToken() {
  return localStorage.getItem('access_token') || getToken();
}

function getAuthHeader() {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function setLoading(isLoading) {
  const loader = document.getElementById('admin-users-loading');
  if (!loader) return;
  loader.classList.toggle('hidden', !isLoading);
}

function setStatus(message, tone = 'info') {
  const el = document.getElementById('admin-users-status');
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('admin-users-body');
  if (!tbody) return;

  tbody.innerHTML = users.map(user => {
    const currentRole = user.role || 'Student';
    const roleKey = normalizeRole(currentRole);
    const roleClass = ROLE_CLASS[roleKey] || 'role-student';

    const options = ROLE_OPTIONS.map(option => {
      const selected = option.value === currentRole ? 'selected' : '';
      return `<option value="${option.value}" ${selected}>${option.label}</option>`;
    }).join('');

    return `
      <tr>
        <td>${user.id}</td>
        <td>${user.email}</td>
        <td><span class="role-badge ${roleClass}">${currentRole}</span></td>
        <td>
          <div class="role-actions">
            <select class="role-select" data-user-id="${user.id}">
              ${options}
            </select>
            <button class="action-button" data-user-id="${user.id}">Zmień rolę</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const buttons = Array.from(tbody.querySelectorAll('button[data-user-id]'));
  buttons.forEach(button => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.userId;
      const select = tbody.querySelector(`select[data-user-id="${userId}"]`);
      if (!select) return;
      await updateRole(userId, select.value);
    });
  });
}

async function fetchUsers() {
  const token = getStoredToken();
  if (!token) {
    setStatus('Нет токена. Пожалуйста, войдите снова.', 'error');
    return;
  }

  setLoading(true);
  setStatus('');

  try {
    const response = await fetch(USERS_URL, {
      method: 'GET',
      headers: {
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      setStatus(`Ошибка загрузки пользователей (${response.status}).`, 'error');
      return;
    }

    const users = await response.json();
    renderUsersTable(users);
    setStatus(`Пользователей в базе: ${users.length}.`, 'success');
  } catch (err) {
    console.error(err);
    setStatus('Не удалось загрузить пользователей. Проверьте сервер.', 'error');
  } finally {
    setLoading(false);
  }
}

async function updateRole(userId, roleName) {
  const token = getStoredToken();
  if (!token) {
    setStatus('Нет токена. Пожалуйста, войдите снова.', 'error');
    return;
  }

  setLoading(true);
  setStatus('Обновляем роль...', 'info');

  try {
    const response = await fetch(`${USERS_URL}/${userId}/role?new_role=${encodeURIComponent(roleName)}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      setStatus(`Ошибка обновления роли (${response.status}).`, 'error');
      return;
    }

    setStatus('Роль обновлена успешно!', 'success');
    await fetchUsers();
  } catch (err) {
    console.error(err);
    setStatus('Не удалось обновить роль. Проверьте сервер.', 'error');
  } finally {
    setLoading(false);
  }
}

export function renderAdminUsersPage(initialRole = null) {
  const token = getStoredToken();
  const role = initialRole || (token ? getRoleFromToken(token) : null);

  if (normalizeRole(role) !== 'admin') {
    window.location.href = '/';
    return;
  }

  const app = document.querySelector('#app');
  if (!app) return;

  app.innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <div class="uni-header__inner">
          <div class="uni-logo">
            <div class="uni-logo__icon">🧭</div>
            <div>
              <h1>UniAnkieta</h1>
              <p>Zarządzanie użytkownikami</p>
            </div>
          </div>
          <div class="admin-header-actions">
            <a class="admin-link" href="/admin">Panel admina</a>
            <button id="logout" class="logout-button">Wyloguj</button>
          </div>
        </div>
      </header>

      <main class="uni-main">
        <section class="uni-panel">
          <div class="card">
            <div class="admin-users-header">
              <div>
                <h2>Zarządzanie użytkownikami</h2>
                <p class="muted">Zmień role użytkowników bezpośrednio z listy.</p>
              </div>
              <div id="admin-users-loading" class="spinner hidden" aria-label="loading"></div>
            </div>
            <div id="admin-users-status" class="status-message" data-tone="info"></div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Obecna rola</th>
                     <th>Zmień na...</th>
                  </tr>
                </thead>
                <tbody id="admin-users-body"></tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer class="uni-footer">
        <p>© 2026 UniAnkieta • Panel administracyjny</p>
      </footer>
    </div>
  `;

  const logout = document.getElementById('logout');
  if (logout) {
    logout.addEventListener('click', () => {
      localStorage.clear();
      clearToken();
      window.location.href = '/login';
    });
  }

  fetchUsers();
}