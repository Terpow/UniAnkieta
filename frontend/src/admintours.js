import { getRoleFromToken, getToken, clearToken } from './login.js';

const API_BASE_URL = 'http://localhost:8000/api';
const TOURS_URL = `${API_BASE_URL}/admin/tours`;
const TEMPLATES_URL = `${API_BASE_URL}/templates`; // Путь к шаблонам
const IMPORT_URL = `${API_BASE_URL}/usos/import-students`;

function getStoredToken() {
  return localStorage.getItem('access_token') || getToken();
}

function getAuthHeader() {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function setStatus(message, tone = 'info') {
  const el = document.getElementById('admin-tours-status');
  if (!el) return;
  el.textContent = message;
  el.className = `status-message status-${tone}`;
}

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// --- НОВАЯ ФУНКЦИЯ: Загрузка шаблонов для выпадающего списка ---
async function loadTemplatesToSelect() {
  try {
    const response = await fetch(TEMPLATES_URL, { headers: getAuthHeader() });
    const templates = await response.json();
    const select = document.getElementById('tour-template-id');
    if (select && templates) {
      select.innerHTML = '<option value="">-- Wybierz szablon --</option>' + 
        templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
  } catch (err) {
    console.error("Błąd ładowania szablonów:", err);
  }
}

async function fetchTours() {
  try {
    const response = await fetch(TOURS_URL, { headers: getAuthHeader() });
    const tours = await response.json();
    renderToursTable(tours);
  } catch (err) {
    setStatus('Nie udało się pobrać тур.', 'error');
  }
}

function renderToursTable(tours) {
  const tbody = document.getElementById('admin-tours-body');
  if (!tbody) return;
  tbody.innerHTML = tours.map(tour => `
    <tr>
      <td>${tour.id}</td>
      <td>${tour.name}</td>
      <td>${new Date(tour.start_date).toLocaleString()}</td>
      <td>${tour.is_active ? '✅' : '❌'}</td>
      <td><button class="action-button small danger">Usuń</button></td>
    </tr>
  `).join('');
}

export function renderAdminToursPage() {
  const app = document.querySelector('#app');
  app.innerHTML = `
    <div class="uni-app">
      <header class="uni-header">
        <h1>UniAnkieta: Zarządzanie turami</h1>
        <a href="/admin">Powrót</a>
      </header>

      <main class="uni-main">
        <section class="uni-panel">
          <div class="card">
            <h2>Utwórz nową turę</h2>
            <div id="admin-tours-status"></div>
            
            <div class="form-grid" style="display: flex; flex-direction: column; gap: 10px; max-width: 400px;">
              <input id="tour-name" class="input-field" placeholder="Nazwa tury (np. Letnia 2024)">
              
              <label>Data rozpoczęcia:</label>
              <input id="tour-start" type="datetime-local" class="input-field">
              
              <label>Data zakończenia:</label>
              <input id="tour-end" type="datetime-local" class="input-field">
              
              <label>Wybierz szablon ankiety:</label>
              <select id="tour-template-id" class="input-field">
                <option value="">Ładowanie szablonów...</option>
              </select>

              <label class="toggle-line">
                <input id="tour-active" type="checkbox" checked>
                <span>Aktywna od razu</span>
              </label>
              
              <button id="tour-create" class="action-button primary">Dodaj turę в Postgres</button>
            </div>

            <h2 style="margin-top: 30px;">Aktywne tury</h2>
            <table>
              <thead>
                <tr><th>ID</th><th>Nazwa</th><th>Start</th><th>Status</th><th>Akcja</th></tr>
              </thead>
              <tbody id="admin-tours-body"></tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  `;

  // Вешаем событие на кнопку создания
  document.getElementById('tour-create').onclick = async () => {
    const payload = {
      name: document.getElementById('tour-name').value,
      start_date: toIsoString(document.getElementById('tour-start').value),
      end_date: toIsoString(document.getElementById('tour-end').value),
      is_active: document.getElementById('tour-active').checked,
      template_id: parseInt(document.getElementById('tour-template-id').value) // Тот самый ID
    };

    if (!payload.name || !payload.template_id) {
      setStatus('Wypełnij nazwę и wybierz szablon!', 'error');
      return;
    }

    try {
      const res = await fetch(TOURS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatus('Tura utworzona!', 'success');
        fetchTours();
      } else {
        const err = await res.json();
        setStatus('Błąd: ' + (err.detail || 'Serwer odrzucił dane'), 'error');
      }
    } catch (e) {
      setStatus('Błąd połączenia', 'error');
    }
  };

  // Инициализация данных на странице
  loadTemplatesToSelect();
  fetchTours();
}