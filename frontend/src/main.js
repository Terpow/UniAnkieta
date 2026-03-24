import './style.css'
import { buildLoginUI, handleSSOCallback, getToken, getRoleFromToken, clearToken } from './login.js'

const surveys = [
  { subject: 'Podstawy Programowania', lecturer: 'dr inż. Jan Kowalski', status: 'Wypełniona' },
  { subject: 'Analiza Matematyczna I', lecturer: 'prof. dr hab. Ewa Nowak', status: 'Oczekuje' },
  { subject: 'Sieci Komputerowe', lecturer: 'mgr Anna Lis', status: 'Oczekuje' },
  { subject: 'Wychowanie Fizyczne', lecturer: 'dr Piotr Sportowy', status: 'Wypełniona' }
];

function renderSurveyApp() {
  document.querySelector('#app').innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <div class="uni-header__inner">
          <div class="uni-logo">
            <div class="uni-logo__icon">🏛️</div>
            <div>
              <h1>UniAnkieta</h1>
              <p>Wirtualny System Ankiet Uczelnianych</p>
            </div>
          </div>
          <nav class="uni-nav">
            <a href="#">Strona główna</a>
            <a href="#">Ankiety</a>
            <a href="#">Kontakt</a>
          </nav>
        </div>
      </header>

      <main class="uni-main">
        <section class="uni-welcome">
          <h2>Moje ankiety</h2>
          <p>Wybierz przedmiot i przejdź do oceny.</p>
        </section>

        <section class="uni-panel">
          <h3>Lista przedmiotów do oceny</h3>
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

      <footer class="uni-footer">
        <p>© 2026 UniAnkieta • Wydział Informatyki UE</p>
      </footer>
    </div>
  `;

  loadSurveys();

  document.getElementById('logout').addEventListener('click', () => {
    clearToken();
    window.location.href = window.location.pathname;
  });
}

function renderAdminPanel() {
  document.querySelector('#app').innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <div class="uni-header__inner">
          <div class="uni-logo">
            <div class="uni-logo__icon">🛠️</div>
            <div>
              <h1>UniAnkieta - Panel administracyjny</h1>
              <p>Panel zarządzania ankietami</p>
            </div>
          </div>
        </div>
      </header>
      <main class="uni-main">
        <div class="card">
          <h2>Panel administracyjny</h2>
          <p>Tu będzie UC-35: zarządzanie ankietami i użytkownikami.</p>
        </div>
      </main>
      <footer class="uni-footer"><p>© 2026 UniAnkieta</p></footer>
    </div>
  `;

  document.getElementById('logout').addEventListener('click', () => {
    clearToken();
    window.location.href = window.location.pathname;
  });
}

function loadSurveys() {
  const body = document.getElementById('survey-body');
  if (!body) return;
  body.innerHTML = '';

  surveys.forEach(s => {
    const statusClass = s.status === 'Wypełniona' ? 'status-green' : 'status-red';
    const action = s.status === 'Oczekuje' ? '<button class="action-button">Wypełnij</button>' : 'Brak';

    body.innerHTML += `
      <tr>
        <td>${s.subject}</td>
        <td>${s.lecturer}</td>
        <td><span class="${statusClass}">${s.status}</span></td>
        <td>${action}</td>
      </tr>
    `;
  });
}

function initApp() {
  const callbackRole = handleSSOCallback();
  const token = getToken();
  const role = callbackRole || (token ? getRoleFromToken(token) : null);

  if (role === 'student') {
    renderSurveyApp();
  } else if (role === 'admin' || role === 'administrator' || role === 'wykladowca') {
    renderAdminPanel();
  } else {
    buildLoginUI(document.querySelector('#app'));
  }
}

initApp();
