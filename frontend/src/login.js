const TOKEN_KEY = 'uniankieta_jwt';

function decodeJwt(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (e) {
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

export function buildLoginUI(container) {
  container.innerHTML = `
    <div class="uni-app">
      <main class="uni-main">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-logo">🏛️</div>
            <div>
              <h1>UniAnkieta</h1>
              <p>System ankiet studenckich (SSO)</p>
            </div>
          </div>
          <p class="login-text">Zaloguj się przez system uczelniany, aby przejść do ankiet или panelu administratora.</p>
          <button id="sso-login-btn" class="login-button">Zaloguj przez SSO uczelni</button>
          <div id="login-status" style="margin-top:10px; font-size:14px; color:#666;"></div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('sso-login-btn').addEventListener('click', () => {
    document.getElementById('sso-login-btn').textContent = 'Przekierowanie...';
    window.location.href = 'http://localhost:8000/api/auth/login';
  });
}

/**
 * Перехватывает токен из URL после редиректа
 */
export function handleSSOCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (token) {
    setToken(token);
    // Убираем токен из адресной строки для красоты
    window.history.replaceState(null, '', window.location.pathname);
    return getRoleFromToken(token);
  }
  return null;
}