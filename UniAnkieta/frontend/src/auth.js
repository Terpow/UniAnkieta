async function loginAsAdmin() {
    try {
        const response = await fetch("http://localhost:8000/api/auth/dev-login-admin");
        const data = await response.json();
        
        localStorage.setItem("token", data.access_token);
        
        alert("Jesteś Zalogowany jako admin!.");
        window.location.reload(); 
    } catch (err) {
        alert("Backend wyłączony albo bląd");
    }
}