import './style.css'
import { buildLoginUI, handleSSOCallback, getToken, getRoleFromToken, clearToken } from './login.js'
import { renderAdminUsersPage } from './adminUsers.js'
// ИМПОРТ НОВЫХ СТРАНИЦ (Проверь названия файлов!)
import { renderAdminQuestionsPage } from './TemplateEditor.js' 
import { renderAdminToursPage } from './ToursManager.js'

const surveys = [
  { subject: 'Podstawy Programowania', lecturer: 'dr inż. Jan Kowalski', status: 'Wypełniona' },
  { subject: 'Analiza Matematyczna I', lecturer: 'prof. dr hab. Ewa Nowak', status: 'Oczekuje' },
  { subject: 'Sieci Komputerowe', lecturer: 'mgr Anna Lis', status: 'Oczekuje' }
];

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
 * ОБНОВЛЕННАЯ ПАНЕЛЬ АДМИНИСТРАТОРА (Спринт 3)
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
          <p style="color: #2ecc71; font-weight: bold;">● Połączono z bazą PostgreSQL (Docker)</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
          
          <div class="admin-tools">
             <strong>Dostępne operacje (Sprint 3):</strong>
             <ul style="margin-top: 15px; list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;">
                <li>
                  <button id="btn-manage-users" class="action-button" style="background: #3498db; width: 100%; text-align: left; padding: 12px;">
                    👥 Zarządzaj użytkownikami (RBAC)
                  </button>
                </li>
                <li>
                  <button id="btn-manage-questions" class="action-button" style="background: #9b59b6; width: 100%; text-align: left; padding: 12px;">
                    📝 Edytor pytań i szablonów (UC-31)
                  </button>
                </li>
                <li>
                  <button id="btn-manage-tours" class="action-button" style="background: #f1c40f; color: #2c3e50; width: 100%; text-align: left; padding: 12px;">
                    🗓️ Zarządzanie turami ankiet (UC-01)
                  </button>
                </li>
                <li style="color: #bdc3c7; padding: 12px; border: 1px dashed #ddd; border-radius: 4px;">
                  📊 Eksport wyników do CSV - <i>Wkrótce</i>
                </li>
             </ul>
          </div>
        </div>
      </main>
    </div>`;

  // Навешиваем события на все кнопки
  document.getElementById('btn-manage-users')?.addEventListener('click', () => renderAdminUsersPage());
  document.getElementById('btn-manage-questions')?.addEventListener('click', () => renderAdminQuestionsPage());
  document.getElementById('btn-manage-tours')?.addEventListener('click', () => renderAdminToursPage());

  setupLogout();
}

function loadSurveys() {
  const body = document.getElementById('survey-body');
  if (!body) return;
  body.innerHTML = surveys.map(s => `
    <tr>
      <td><strong>${s.subject}</strong></td>
      <td>${s.lecturer}</td>
      <td><span class="status-badge ${s.status === 'Wypełniona' ? 'status-green' : 'status-red'}">${s.status}</span></td>
      <td>${s.status === 'Oczekuje' ? '<button class="action-button small">Wypełnij</button>' : '—'}</td>
    </tr>
  `).join('');
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });
}

function initApp() {
  const callbackRole = handleSSOCallback();
  const token = getToken();
  let role = callbackRole || (token ? getRoleFromToken(token) : null);

  if (role) role = role.toLowerCase();

  if (!role) {
    buildLoginUI(document.querySelector('#app'));
  } else if (role === 'admin' || role === 'administrator') {
    renderAdminPanel();
  } else {
    renderSurveyApp();
  }
}

initApp();