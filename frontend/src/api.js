// api.js
const API_URL = "http://localhost:8000";
const TOKEN_KEY = 'uniankieta_jwt'; // Должно быть как в login.js

export const apiRequest = async (endpoint, method = "GET", body = null) => {
    const token = localStorage.getItem(TOKEN_KEY); // Используем правильный ключ
    
    const settings = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
    };

    if (body) settings.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, settings);
    
    if (response.status === 401) {
        alert("Сессия истекла, авторизуйтесь заново");
        window.location.href = "/login";
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Ошибка сервера");
    }

    return response.json();
};