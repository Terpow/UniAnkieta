import { apiRequest } from './api.js';

// Массив для хранения вопросов локально перед отправкой
let questions = [];

export function renderAdminQuestionsPage() {
    const app = document.querySelector('#app');
    questions = []; // Очищаем список при каждом открытии страницы
    
    app.innerHTML = `
        <div class="uni-app">
            <header class="uni-header">
                <div class="uni-header__inner">
                    <h1>📝 Edytor Szablonów</h1>
                    <button id="back-btn" class="action-button">← Powrót</button>
                </div>
            </header>
            <main class="uni-main">
                <div class="card">
                    <h2>Nowy Szablon</h2>
                    <input type="text" id="templateName" placeholder="Nazwa szablonu" class="input-field" style="width:100%; margin-bottom:10px;">
                    
                    <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:20px;">
                        <h4>Dodaj pytanie:</h4>
                        <input type="text" id="questionText" placeholder="Treść pytania" class="input-field" style="width:100%; margin-bottom:10px;">
                        <select id="questionType" class="input-field" style="width:100%; margin-bottom:10px;">
                            <option value="open">Otwarte (tekst)</option>
                            <option value="closed">Zamknięte (wybór)</option>
                        </select>
                        <input type="text" id="optionsInput" placeholder="Opcje (oddzielone przecinkami)" class="input-field" style="width:100%; margin-bottom:10px;">
                        <button id="addQuestionBtn" class="action-button" style="width:100%; background: #0047ab;">＋ Dodaj pytanie do listy</button>
                    </div>

                    <div id="questionsList"></div>
                    <hr>
                    <button id="saveTemplateBtn" class="action-button" style="background:#2ecc71; width:100%; margin-top:20px;">💾 Zapisz szablon w bazie</button>
                </div>
            </main>
        </div>
    `;

    // Привязываем события
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestionToList);
    document.getElementById('saveTemplateBtn').addEventListener('click', handleSaveTemplate);
    document.getElementById('back-btn').onclick = () => window.location.reload();
}

function addQuestionToList() {
    const textInput = document.getElementById('questionText');
    const typeSelect = document.getElementById('questionType');
    const optionsInput = document.getElementById('optionsInput');

    const text = textInput.value.trim();
    if (!text) {
        alert("Wpisz treść pytania!");
        return;
    }

    // Создаем объект вопроса
    const newQuestion = {
        text: text,
        question_type: typeSelect.value, 
        choices: typeSelect.value === 'closed' ? optionsInput.value.split(',').map(o => o.trim()).filter(o => o) : []
    };

    // Добавляем в массив
    questions.push(newQuestion);
    
    // Очищаем поля ввода
    textInput.value = "";
    optionsInput.value = "";
    
    // Обновляем список на экране
    renderQuestions();
}

function renderQuestions() {
    const listContainer = document.getElementById('questionsList');
    if (!listContainer) return;

    if (questions.length === 0) {
        listContainer.innerHTML = "";
        return;
    }

    listContainer.innerHTML = questions.map((q, i) => `
        <div style="padding:10px; border:1px solid #ddd; border-radius:5px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; background: white;">
            <span><strong>${i + 1}.</strong> ${q.text} <em>(${q.question_type})</em></span>
            <button class="delete-q-btn" data-index="${i}" style="color:red; background:none; border:none; cursor:pointer;">Usuń</button>
        </div>
    `).join('');

    // Вешаем удаление на кнопки
    document.querySelectorAll('.delete-q-btn').forEach(btn => {
        btn.onclick = (e) => {
            const index = e.target.getAttribute('data-index');
            questions.splice(index, 1);
            renderQuestions();
        };
    });
}

async function handleSaveTemplate() {
    const nameInput = document.getElementById('templateName');
    const name = nameInput.value.trim();

    if (!name) return alert("Wpisz nazwę szablonu!");
    if (questions.length === 0) return alert("Dodaj pytania!");

    // Проверка на наличие минимум 2 вариантов для закрытых вопросов
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].question_type === 'closed' && (!questions[i].choices || questions[i].choices.length < 2)) {
            return alert(`Pytanie nr ${i + 1} ("${questions[i].text}") musi mieć co najmniej 2 opcje wyboru!`);
        }
    }

    // Собираем payload строго по тем полям, которые сервер подтвердил (text, question_type, options)
    const payload = {
        name: name,
        text: name, // Дублируем имя в text, так как сервер просил поле text в корне
        question_type: "open", // Техническое поле для корня
        questions: questions.map(q => ({
            content: q.text,
            question_type: q.question_type,
            options: q.choices.map(c => ({ text: c })) // Превращаем строки в объекты {text: "..."}
        }))
    };

    console.log("ОТПРАВКА С ВАЛИДАЦИЕЙ:", payload);

    try {
        await apiRequest("/api/admin/questions/", "POST", payload);
        alert("Sukces! Szablon został poprawnie zapisany.");
        window.location.reload();
    } catch (e) {
        console.error("Błąd zapisu:", e);
        // Выводим текст ошибки прямо из ответа сервера, если он есть
        alert("Błąd serwera: " + e.message);
    }
}