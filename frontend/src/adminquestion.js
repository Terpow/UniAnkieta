import { getRoleFromToken, getToken, clearToken } from './login.js';

const API_BASE_URL = 'http://localhost:8000/api/admin/questions';

function getStoredToken() {
  return localStorage.getItem('access_token') || getToken();
}

function setStatus(message, tone = 'info') {
  const el = document.getElementById('questions-status');
  if (!el) return;
  el.textContent = message;
  el.style.color = tone === 'error' ? '#ff4d4d' : '#2ecc71';
  el.style.fontWeight = 'bold';
}

function createEmptyQuestion() {
  return {
    id: crypto.randomUUID(),
    text: '',
    type: 'text', // Это внутренний тип для фронтенда
    options: ''
  };
}

// --- ОТПРАВКА НА БЭКЕНД ---
async function saveQuestionsToBackend(questions) {
  const token = getStoredToken();
  
  for (const q of questions) {
    // Мапим типы фронтенда на твой Enum QuestionType ('open' или 'closed')
    const isClosed = ['single_choice', 'multiple_choice', 'rating', 'scale'].includes(q.type);
    
    // Формируем payload ТОЧНО по твоей схеме QuestionCreate
    const payload = {
      text: q.text,
      question_type: isClosed ? 'closed' : 'open',
      choices: isClosed ? parseOptions(q) : [] 
    };

    console.log("Отправка вопроса:", payload); // Для отладки в консоли браузера

    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errDetail = await response.json();
      throw new Error(errDetail.detail || `Błąd serwera: ${response.status}`);
    }
  }
}

function parseOptions(q) {
  if (q.type === 'rating') return ['1', '2', '3', '4', '5'];
  if (q.type === 'scale') return ['1', '2', '3', '4', '5'];
  
  // Берем текст из textarea и превращаем в массив строк (List[str])
  return q.options 
    ? q.options.split('\n').map(o => o.trim()).filter(o => o !== '') 
    : [];
}

function renderQuestions(questions) {
  const list = document.getElementById('questions-list');
  if (!list) return;

  list.innerHTML = questions.map((q, index) => `
    <div class="question-card" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #fff;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <strong>Pytanie ${index + 1}</strong>
        <button onclick="removeQuestion('${q.id}')" style="color: red; cursor: pointer; border: none; background: none;">Usuń</button>
      </div>
      
      <input class="input-field" style="width: 100%; padding: 8px; margin-bottom: 10px;" 
             data-id="${q.id}" data-field="text" value="${q.text}" placeholder="Wpisz treść pytania...">
      
      <div style="margin-bottom: 10px;">
        <select class="input-field" data-id="${q.id}" data-field="type">
          <option value="text" ${q.type === 'text' ? 'selected' : ''}>Tekst otwarty (open)</option>
          <option value="single_choice" ${q.type === 'single_choice' ? 'selected' : ''}>Wybór (closed)</option>
          <option value="rating" ${q.type === 'rating' ? 'selected' : ''}>Ocena 1-5</option>
        </select>
      </div>

      ${(q.type === 'single_choice') ? `
        <textarea class="input-field" style="width: 100%;" data-id="${q.id}" data-field="options" 
                  placeholder="Wpisz opcje (każda w nowej linii)">${q.options || ''}</textarea>
      ` : ''}
    </div>
  `).join('');

  list.querySelectorAll('[data-field]').forEach(el => {
    el.onchange = (e) => {
      const q = questions.find(item => item.id === el.dataset.id);
      q[el.dataset.field] = el.value;
      if (el.dataset.field === 'type') renderQuestions(questions);
    };
  });
}

window.removeQuestion = (id) => {
  window.currentQuestions = window.currentQuestions.filter(q => q.id !== id);
  renderQuestions(window.currentQuestions);
};

export function renderAdminQuestionsPage() {
  window.currentQuestions = [createEmptyQuestion()];
  const app = document.querySelector('#app');
  
  app.innerHTML = `
    <div style="max-width: 600px; margin: 20px auto; font-family: sans-serif;">
      <h2>🛠 Edytor pytań</h2>
      <div id="questions-status"></div>
      <div id="questions-list"></div>
      <button id="add-q-btn" style="padding: 10px; cursor: pointer;">＋ Dodaj pytanie</button>
      <button id="save-tpl-btn" style="padding: 10px; cursor: pointer; background: #2ecc71; color: white; border: none;">Zapisz w bazie Postgres</button>
    </div>
  `;

  renderQuestions(window.currentQuestions);

  document.getElementById('add-q-btn').onclick = () => {
    window.currentQuestions.push(createEmptyQuestion());
    renderQuestions(window.currentQuestions);
  };

  document.getElementById('save-tpl-btn').onclick = async () => {
    try {
      setStatus("Zapisywanie...", "info");
      await saveQuestionsToBackend(window.currentQuestions);
      setStatus("Sukces! Pytania zapisane в базе.", "success");
      window.currentQuestions = [createEmptyQuestion()];
      renderQuestions(window.currentQuestions);
    } catch (e) {
      setStatus(`Błąd: ${e.message}`, "error");
    }
  };
}