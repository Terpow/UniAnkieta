// login.js

const TOKEN_KEY = 'uniankieta_jwt';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = token.split('.')[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return safeJsonParse(decodeURIComponent(escape(decoded)));
  } catch (e) {
    console.error('JWT parse error', e);
    return null;
  }
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRoleFromToken(token) {
  const decoded = decodeJwt(token);
  if (!decoded) return null;

  const role = decoded.role || decoded.user?.role || decoded.rola || null;
  if (!role) return null;

  return String(role).toLowerCase();
}

export function buildLoginUI(container) {
  container.innerHTML = `
    <div class="uni-app">
      <main class="uni-main">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-logo">🏛️</div>
            <div>
              <h1>UniAnkieta</h1>
              <p>System ankiet studenckich (SSO uwzględniony)</p>
            </div>
          </div>

          <p class="login-text">Zaloguj się przez system uczelni.
          Po stronie backendu następuje przekierowanie na stronę SSO, a po weryfikacji wracasz z tokenem.</p>

          <button id="sso-login-btn" class="login-button">Zaloguj przez SSO uczelni</button>
          <p id="login-status" class="login-status"></p>

          <div class="login-hint">Dlaczego nie AJAX? SSO wymaga przekierowania do zewnętrznej strony logowania.</div>
        </div>
      </main>
    </div>
  `;

  const btn = document.getElementById('sso-login-btn');
  const status = document.getElementById('login-status');

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Przekierowanie...';
    status.textContent = 'Łączenie z serwerem SSO...';

    setTimeout(() => {
      window.location.href = 'http://localhost:8000/api/auth/login';
    }, 300);
  });
}

export function handleSSOCallback() {
  const params = new URLSearchParams(window.location.search);
  let token = params.get('token');

  if (!token) {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const cookieToken = cookies.find(c => c.startsWith(`${TOKEN_KEY}=`));
    if (cookieToken) token = cookieToken.split('=')[1];
  }

  if (!token) return null;

  setToken(token);
  const role = getRoleFromToken(token);
  window.history.replaceState(null, '', window.location.pathname);
  return role;
}
