// Dev helper: manual admin login via console (not auto-used)
async function loginAsAdmin() {
    try {
        // Стучимся на наш тестовый эндпоинт, который мы прописали в main.py
        const response = await fetch("http://localhost:8000/api/auth/dev-login-admin");
        const data = await response.json();
        
        // СОХРАНЯЕМ ТОКЕН
        localStorage.setItem("uniankieta_jwt", data.access_token);
        
        alert("Вы вошли как админ! Теперь запросы будут работать.");
        window.location.reload(); // Перезагружаем, чтобы api.js подхватил токен
    } catch (err) {
        alert("Бэкенд выключен или ошибка сети");
    }
}