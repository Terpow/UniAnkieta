import { apiRequest } from './api.js';

export async function renderAdminToursPage() {
    const app = document.querySelector('#app');
    app.innerHTML = `
        <div class="uni-app">
            <header class="uni-header">
                <div class="uni-header__inner">
                    <h1>🗓️ Zarządzanie Turami</h1>
                    <button id="back-btn-tours" class="action-button">← Powrót</button>
                </div>
            </header>
            <main class="uni-main">
                <div class="card">
                    <h3>Utwórz nową turę</h3>
                    <input type="text" id="tourName" placeholder="Nazwa tury" class="input-field" style="width:100%; margin-bottom:10px;">
                    <label>Start:</label>
                    <input type="datetime-local" id="startDate" class="input-field" style="width:100%; margin-bottom:10px;">
                    <label>Koniec:</label>
                    <input type="datetime-local" id="endDate" class="input-field" style="width:100%; margin-bottom:10px;">
                    <label>ID Szablonu:</label>
                    <input type="number" id="templateSelect" class="input-field" style="width:100%; margin-bottom:10px;">
                    <button id="createTourBtn" class="action-button" style="width:100%; background:#f1c40f; color:black;">Aktywuj turę</button>
                    
                    <hr style="margin:30px 0;">
                    
                    <h3>Lista tur в базе</h3>
                    <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                        <thead>
                            <tr style="background:#f4f4f4; text-align:left;">
                                <th style="padding:10px; border:1px solid #ddd;">Nazwa</th>
                                <th style="padding:10px; border:1px solid #ddd;">Start</th>
                                <th style="padding:10px; border:1px solid #ddd;">Status</th>
                            </tr>
                        </thead>
                        <tbody id="toursTable">
                            <tr><td colspan="3" style="text-align:center; padding:20px;">Ładowanie...</td></tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    `;

    document.getElementById('createTourBtn').onclick = createNewTour;
    document.getElementById('back-btn-tours').onclick = () => window.location.reload();
    
    // Загружаем список сразу при открытии страницы
    loadTours();
}

async function loadTours() {
    const tableBody = document.getElementById('toursTable');
    try {
        // Запрос списка всех тур
        const tours = await apiRequest("/api/admin/tours/tours/", "GET");
        
        if (!tours || tours.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Brak utworzonych tur.</td></tr>';
            return;
        }

        tableBody.innerHTML = tours.map(t => `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; border:1px solid #ddd;">${t.name || 'Brak nazwy'}</td>
                <td style="padding:10px; border:1px solid #ddd;">${t.start_date ? new Date(t.start_date).toLocaleString() : '-'}</td>
                <td style="padding:10px; border:1px solid #ddd;">
                    <span class="status-badge ${t.is_active ? 'status-green' : 'status-red'}" 
                          style="background:${t.is_active ? '#2ecc71' : '#e74c3c'}; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                        ${t.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Błąd ładowania:", err);
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:red;">Błąd ładowania: ${err.message}</td></tr>`;
    }
}

async function createNewTour() {
    const name = document.getElementById('tourName').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const templateId = document.getElementById('templateSelect').value;

    if (!name || !startDate || !endDate || !templateId) {
        return alert("Wypełnij wszystkie pola!");
    }

    const tourData = {
        name: name,
        start_date: startDate + ":00", // Добавляем секунды для бэкенда
        end_date: endDate + ":00",
        template_id: parseInt(templateId),
        is_active: true
    };

    try {
        await apiRequest("/api/admin/tours/tours/", "POST", tourData);
        alert("Tura utworzona!");
        // Очищаем поля после успеха
        document.getElementById('tourName').value = "";
        // Сразу обновляем таблицу, чтобы увидеть новую запись
        loadTours();
    } catch (err) { 
        alert("Błąd tworzenia: " + err.message); 
    }
}