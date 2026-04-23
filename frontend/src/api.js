// api.js – Shared fetch helper with JWT
import { TOKEN_KEY } from './login.js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem(TOKEN_KEY);

  const settings = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };

  if (body) {
    settings.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, settings);

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/';
    throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd serwera');
    }
    const text = await response.text();
    throw new Error(text || 'Błąd serwera');
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
};