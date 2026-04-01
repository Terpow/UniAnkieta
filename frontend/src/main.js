import './style.css'
import { buildLoginUI, handleSSOCallback, getToken, getRoleFromToken, clearToken } from './login.js'
import { renderAdminUsersPage } from './adminUsers.js' // Импортируем страницу управления пользователями

// Данные для студенческого интерфейса (заглушка)
const surveys = [
  { subject: 'Podstawy Programowania', lecturer: 'dr inż. Jan Kowalski', status: 'Wypełniona' },
  { subject: 'Analiza Matematyczna I', lecturer: 'prof. dr hab. Ewa Nowak', status: 'Oczekuje' },
  { subject: 'Sieci Komputerowe', lecturer: 'mgr Anna Lis', status: 'Oczekuje' }
];

/**
 * Отрисовка интерфейса СТУДЕНТА
 */
function renderSurveyApp() {
  document.querySelector('#app').innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <div class="uni-header__inner">
          <h1>UniAnkieta</h1>
          <button id="logout-btn" class="action-button" style="background: #e74c3c">Wyloguj</button>
        </div>
      </header>
      <main class="uni-main">
        <section class="uni-welcome">
          <h2>Moje ankiety</h2>
          <p>Wybierz przedmiot i wypełnij opinię.</p>
        </section>
        <section class="uni-panel">
          <div class="card">
            <table>
              <thead>
                <tr>
                  <th>Przedmiot</th>
                  <th>Wykładowca</th>
                  <th>Status</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody id="survey-body"></tbody>
            </table>
          </div>
        </section>
      </main>
    </div>`;
  
  loadSurveys();
  setupLogout();
}

/**
 * Отрисовка ГЛАВНОЙ ПАНЕЛИ АДМИНИСТРАТОРА
 */
function renderAdminPanel() {
  document.querySelector('#app').innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <div class="uni-header__inner">
          <div class="uni-logo">
            <div class="uni-logo__icon">🛠️</div>
            <h1>UniAnkieta - Admin</h1>
          </div>
          <button id="logout-btn" class="action-button" style="background: #e74c3c">Wyloguj</button>
        </div>
      </header>
      <main class="uni-main">
        <div class="card">
          <h2>Panel Administratora</h2>
          <p style="color: green;">● Połączono z bazą PostgreSQL (Docker)</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
          <div class="admin-tools">
             <strong>Dostępne operacje:</strong>
             <ul style="margin-top: 10px; list-style: none; padding: 0;">
                <li style="margin-bottom: 15px;">
                  <button id="btn-manage-users" class="action-button small" style="background: #3498db; width: 100%; text-align: left; padding: 10px;">
                    👥 Zarządzaj użytkownikami (RBAC)
                  </button>
                </li>
                <li style="margin-bottom: 10px; color: #7f8c8d;">📝 Zarządzanie listą ankiet (CRUD) - <i>Wkrótce</i></li>
                <li style="margin-bottom: 10px; color: #7f8c8d;">📊 Eksport wyników do CSV - <i>Wkrótce</i></li>
             </ul>
          </div>
        </div>
      </main>
    </div>`;

  // Навешиваем событие на кнопку перехода к списку пользователей
  document.getElementById('btn-manage-users')?.addEventListener('click', () => {
    renderAdminUsersPage();
  });

  setupLogout();
}

/**
 * Наполнение таблицы анкет для студента
 */
function loadSurveys() {
  const body = document.getElementById('survey-body');
  if (!body) return;

  body.innerHTML = surveys.map(s => `
    <tr>
      <td><strong>${s.subject}</strong></td>
      <td>${s.lecturer}</td>
      <td>
        <span class="status-badge ${s.status === 'Wypełniona' ? 'status-green' : 'status-red'}">
          ${s.status}
        </span>
      </td>
      <td>
        ${s.status === 'Oczekuje' ? '<button class="action-button small">Wypełnij</button>' : '—'}
      </td>
    </tr>
  `).join('');
}

/**
 * Функция выхода из системы
 */
function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear(); // Полная очистка для надежности
    window.location.href = '/';
  });
}

/**
 * Точка входа в приложение (Инициализация)
 */
function initApp() {
  // 1. Обработка возврата из SSO (если есть токен в URL)
  const callbackRole = handleSSOCallback();
  
  // 2. Получение текущего токена
  const token = getToken();
  
  // 3. Определение роли (из URL или из сохраненного JWT)
  let role = callbackRole || (token ? getRoleFromToken(token) : null);

  // Приведение к нижнему регистру для надежности проверки
  if (role) role = role.toLowerCase();

  console.log("Current User Role:", role);

  if (!role) {
    // Если роли нет — показываем экран входа
    buildLoginUI(document.querySelector('#app'));
  } else if (role === 'admin' || role === 'administrator') {
    // Если админ — показываем панель управления
    renderAdminPanel();
  } else {
    // Все остальные (student, teacher) — в интерфейс анкет
    renderSurveyApp();
  }
}

// Запуск приложения
initApp();