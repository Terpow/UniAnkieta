// login.js – Auth helpers + Login UI
import logoUrl from './assets/logo.png';
export const TOKEN_KEY = 'uniankieta_jwt';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// JWT helpers
function decodeJwt(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function getRoleFromToken(token) {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  const role = decoded.role || decoded.user?.role || null;
  return role ? String(role).toLowerCase() : null;
}

export function getUserInfoFromToken(token) {
  return decodeJwt(token);
}

// Handle SSO token from URL (?token=...)
export function handleSSOCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return null;
  setToken(token);
  window.history.replaceState(null, '', window.location.pathname);
  return getRoleFromToken(token);
}

// Build the full login page
export function buildLoginUI(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-hero">
        <div class="login-hero__logo">
          <img src="${logoUrl}" alt="UniAnkieta" class="logo-img">
        </div>
        <h1>UniAnkieta</h1>
        <p>System anonimowych ankiet studenckich — szybko, bezpiecznie, zgodnie z RODO.</p>
        <div class="login-hero__features">
          <div class="login-hero__feature">
            <div class="login-hero__feature-icon">🔒</div>
            Pełna anonimizacja odpowiedzi
          </div>
          <div class="login-hero__feature">
            <div class="login-hero__feature-icon">📊</div>
            Automatyчные raporty i statystyki
          </div>
          <div class="login-hero__feature">
            <div class="login-hero__feature-icon">🎓</div>
            Integracja z systemem USOS
          </div>
        </div>
      </div>

      <div class="login-form-panel">
        <div class="login-box">
          <div class="login-box__header">
            <h2>Zaloguj się</h2>
            <p>Wejdź na swoje konto lub skorzystaj z SSO uczelni.</p>
          </div>

          <div class="login-tabs">
            <button class="login-tab active" id="tab-email">Email &amp; Hasło</button>
            <button class="login-tab" id="tab-register">Rejestracja</button>
          </div>

          <div id="panel-email">
            <div id="login-alert"></div>
            <div class="form-group">
              <label class="form-label" for="login-email">Adres e-mail</label>
              <input class="form-input" type="email" id="login-email" placeholder="jan.kowalski@uczelnia.pl" autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Hasło</label>
              <input class="form-input" type="password" id="login-password" placeholder="••••••••" autocomplete="current-password" />
            </div>
            <button class="btn btn-primary" id="login-submit-btn">
              Zaloguj się
            </button>

            <div class="form-divider">lub</div>

            <button class="btn btn-secondary w-full" id="sso-login-btn" style="justify-content:center">
              🏫 &nbsp;Zaloguj przez SSO uczelni
            </button>

            <div class="form-divider" style="margin-top:24px; font-size:11px; color:var(--muted-2);">tryb deweloperski</div>
            <div class="dev-logins">
              <button class="btn-dev" id="dev-student-btn">🎓 Student</button>
              <button class="btn-dev btn-dev-teacher" id="dev-teacher-btn">👩‍🏫 Teacher</button>
              <button class="btn-dev btn-dev-admin" id="dev-admin-btn">🛠️ Admin</button>
            </div>
          </div>

          <div id="panel-register" class="hidden">
            <div id="register-alert"></div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Adres e-mail</label>
              <input class="form-input" type="email" id="reg-email" placeholder="jan.kowalski@uczelnia.pl" />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Hasło</label>
              <input class="form-input" type="password" id="reg-password" placeholder="min. 8 znaków" />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password2">Powtórz hasło</label>
              <input class="form-input" type="password" id="reg-password2" placeholder="••••••••" />
            </div>
            <button class="btn btn-primary" id="register-submit-btn">Utwórz konto</button>
          </div>
        </div>
      </div>
    </div>
  `;


  // Tab switching
  const tabEmail = document.getElementById('tab-email');
  const tabRegister = document.getElementById('tab-register');
  const panelEmail = document.getElementById('panel-email');
  const panelRegister = document.getElementById('panel-register');

  tabEmail.addEventListener('click', () => {
    tabEmail.classList.add('active');
    tabRegister.classList.remove('active');
    panelEmail.classList.remove('hidden');
    panelRegister.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabEmail.classList.remove('active');
    panelRegister.classList.remove('hidden');
    panelEmail.classList.add('hidden');
  });

  // Allow Enter key to submit login
  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  loginEmailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginPasswordInput.focus(); });
  loginPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doEmailLogin(); });

  // Email/Password login
  document.getElementById('login-submit-btn').addEventListener('click', doEmailLogin);

  // SSO login
  document.getElementById('sso-login-btn').addEventListener('click', () => {
    window.location.href = `${API_URL}/api/auth/sso-login`;
  });

  // Dev logins
  document.getElementById('dev-student-btn').addEventListener('click', () => doDevLogin('/api/auth/dev-login-student'));
  document.getElementById('dev-admin-btn').addEventListener('click', () => doDevLogin('/api/auth/dev-login-admin'));
  document.getElementById('dev-teacher-btn').addEventListener('click', () => doDevLogin('/api/auth/dev-login-teacher'));

  // Register
  const regPasswordInput = document.getElementById('reg-password');
  const regPassword2Input = document.getElementById('reg-password2');
  regPassword2Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); });
  document.getElementById('register-submit-btn').addEventListener('click', doRegister);
}

function setAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!message) { el.innerHTML = ''; return; }
  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  el.innerHTML = `<div class="alert alert-${type}">${icons[type]} ${message}</div>`;
}

function setButtonLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.original = btn.textContent;
    btn.textContent = 'Ładowanie...';
  } else {
    btn.textContent = text || btn.dataset.original || btn.textContent;
  }
}

async function doEmailLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    setAlert('login-alert', 'Wpisz email i hasło.', 'error');
    return;
  }

  setAlert('login-alert', '');
  setButtonLoading('login-submit-btn', true);

  try {
    const response = await fetch(`${API_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setAlert('login-alert', data.detail || 'Błąd logowania.', 'error');
      return;
    }

    setToken(data.access_token);
    window.location.reload();
  } catch {
    setAlert('login-alert', 'Nie można połączyć się z serwerem.', 'error');
  } finally {
    setButtonLoading('login-submit-btn', false);
  }
}

async function doRegister() {
  const email = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;
  const password2 = document.getElementById('reg-password2')?.value;

  if (!email || !password) {
    setAlert('register-alert', 'Wypełnij wszystkie pola.', 'error');
    return;
  }

  if (password !== password2) {
    setAlert('register-alert', 'Hasła nie są identyczne.', 'error');
    return;
  }

  if (password.length < 8) {
    setAlert('register-alert', 'Hasło musi mieć co najmniej 8 znaków.', 'error');
    return;
  }

  setAlert('register-alert', '');
  setButtonLoading('register-submit-btn', true);

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'Student' })
    });

    const data = await response.json();

    if (!response.ok) {
      setAlert('register-alert', data.detail || 'Błąd rejestracji.', 'error');
      return;
    }

    setToken(data.access_token);
    window.location.reload();
  } catch {
    setAlert('register-alert', 'Nie można połączyć się z serwerem.', 'error');
  } finally {
    setButtonLoading('register-submit-btn', false);
  }
}

async function doDevLogin(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const data = await response.json();
    if (!data.access_token) throw new Error('Brak tokenu.');
    setToken(data.access_token);
    window.location.reload();
  } catch {
    alert('Błąd połączenia z backendem. Upewnij się, że serwer działa.');
  }
}