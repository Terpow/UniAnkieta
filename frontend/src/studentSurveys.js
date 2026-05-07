// studentSurveys.js – Sprint 4: Student survey list + form (UC-02, UC-03, UC-04)
import { apiRequest } from './api.js';
import { clearToken } from './login.js';

let studentState = {
  surveys: [],
  activeSurvey: null,
  questions: [],
  surveyToken: null,
  answers: {}
};

let currentEmail = '';
let currentRole = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function getAnsweredCount() {
  return studentState.questions.filter((q) => {
    const a = studentState.answers[q.id];
    return typeof a === 'string' && a.trim().length > 0;
  }).length;
}

function buildNav(email, role) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleClass = `role-tag-${role.toLowerCase()}`;

  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="topnav__user-email" style="font-size:13px;color:var(--muted)">${email}</span>
          <span class="role-tag ${roleClass}">${roleLabel}</span>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>
  `;
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });
}

function renderLayout(content) {
  document.querySelector('#app').innerHTML =
    buildNav(currentEmail, currentRole) +
    `<main class="app-main">${content}</main>`;
  setupLogout();
}

// Survey list (UC-02)
function renderSurveyList() {
  if (!studentState.surveys.length) {
    renderLayout(`
      <div class="page-header">
        <h1>Moje Ankiety</h1>
        <p>Aktywne tury ankiet przypisane do Twojego konta.</p>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <h3>Brak ankiet</h3>
        <p>Na ten moment nie masz przypisanych aktywnych tur do wypełnienia.</p>
      </div>
    `);
    return;
  }

  const cards = studentState.surveys.map((survey) => {
    const badgeClass = survey.can_fill
      ? 'badge-green'
      : survey.is_used ? 'badge-gray' : 'badge-amber';

    return `
      <article class="survey-card">
        <div class="survey-card__header">
          <h3>${escapeHtml(survey.tour_name)}</h3>
          <span class="badge ${badgeClass}">${escapeHtml(survey.status)}</span>
        </div>
        <div class="survey-card__meta">
          <dl class="survey-meta-item">
            <dt>Start</dt>
            <dd>${escapeHtml(formatDate(survey.start_date))}</dd>
          </dl>
          <dl class="survey-meta-item">
            <dt>Koniec</dt>
            <dd>${escapeHtml(formatDate(survey.end_date))}</dd>
          </dl>
        </div>
        <button
          class="btn ${survey.can_fill ? 'btn-primary' : 'btn-secondary'}"
          data-tour-id="${survey.tour_id}"
          ${survey.can_fill ? '' : 'disabled'}
          style="width:100%; margin-top:4px;"
        >
          ${survey.can_fill ? '✏️ Wypełnij ankietę' : survey.is_used ? '✓ Wypełniona' : '🔒 Niedostępna'}
        </button>
      </article>
    `;
  }).join('');

  renderLayout(`
    <div class="page-header">
      <h1>Moje Ankiety</h1>
      <p>Wybierz aktywną turę, aby przejść do formularza oceny zajęć.</p>
    </div>
    <div class="survey-grid">${cards}</div>
  `);

  document.querySelectorAll('[data-tour-id]').forEach((btn) => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => openSurveyForm(Number(btn.dataset.tourId)));
    }
  });
}

// Survey form (UC-03)
function renderSurveyForm() {
  const total = studentState.questions.length;
  const answered = getAnsweredCount();
  const pct = total ? Math.round((answered / total) * 100) : 0;

  const questionsHtml = studentState.questions.map((q, idx) => {
    const val = studentState.answers[q.id] || '';

    const body = q.question_type === 'closed'
      ? `<div class="choice-list">
          ${q.choices.map((c) => `
            <label class="choice-option ${val === c.text ? 'selected' : ''}">
              <input
                type="radio"
                name="q-${q.id}"
                value="${escapeHtml(c.text)}"
                ${val === c.text ? 'checked' : ''}
              />
              <span>${escapeHtml(c.text)}</span>
            </label>
          `).join('')}
        </div>`
      : `<textarea
          class="survey-textarea"
          data-question-id="${q.id}"
          rows="4"
          placeholder="Wpisz swoją odpowiedź..."
          style="width:100%; padding:12px; border:1.5px solid var(--line); border-radius:8px; font-family:inherit; font-size:14px; resize:vertical; outline:none;"
        >${escapeHtml(val)}</textarea>`;

    return `
      <article class="question-card">
        <div class="question-card__num">${idx + 1}</div>
        <h3>${escapeHtml(q.text)}</h3>
        <div data-qid="${q.id}" data-qtype="${q.question_type}">${body}</div>
      </article>
    `;
  }).join('');

  renderLayout(`
    <div class="page-header">
      <div class="page-header__breadcrumb">
        <button id="back-to-list" class="btn btn-ghost btn-sm" style="padding:4px 8px;">← Powrót</button>
        <span>/</span>
        <span>${escapeHtml(studentState.activeSurvey?.tour_name || '')}</span>
      </div>
      <h1>Formularz Ankiety</h1>
      <p>Wypełnij wszystkie pytania i wyślij ankietę. Odpowiedzi są w pełni anonimowe.</p>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="progress-info">
        <strong id="prog-text">${answered} z ${total} pytań</strong>
        <span id="prog-pct">${pct}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill" id="prog-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:16px;" id="questions-stack">
      ${questionsHtml}
    </div>

    <div class="form-actions">
      <button id="back-to-list-2" class="btn btn-secondary">← Powrót do listy</button>
      <button id="submit-survey-btn" class="btn btn-primary" style="min-width:180px;">📤 Wyślij ankietę</button>
    </div>
  `);

  // Back buttons
  document.getElementById('back-to-list')?.addEventListener('click', renderSurveyList);
  document.getElementById('back-to-list-2')?.addEventListener('click', renderSurveyList);
  document.getElementById('submit-survey-btn')?.addEventListener('click', submitSurvey);

  // Textarea listeners
  document.querySelectorAll('.survey-textarea').forEach((ta) => {
    ta.addEventListener('input', (e) => {
      studentState.answers[Number(e.target.dataset.questionId)] = e.target.value;
      updateProgress();
    });
  });

  // Radio listeners
  document.querySelectorAll('.choice-option input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const qid = Number(e.target.name.replace('q-', ''));
      studentState.answers[qid] = e.target.value;
      // Update selected styles
      document.querySelectorAll(`[name="${e.target.name}"]`).forEach((r) => {
        r.closest('.choice-option')?.classList.toggle('selected', r.checked);
      });
      updateProgress();
    });
  });
}

function updateProgress() {
  const total = studentState.questions.length;
  const answered = getAnsweredCount();
  const pct = total ? Math.round((answered / total) * 100) : 0;

  const fill = document.getElementById('prog-fill');
  const text = document.getElementById('prog-text');
  const pctEl = document.getElementById('prog-pct');

  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${answered} z ${total} pytań`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

async function loadStudentSurveys() {
  renderLayout(`
    <div class="page-header">
      <h1>Moje Ankiety</h1>
    </div>
    <div class="loader">
      <div class="spinner"></div>
      <p>Ładowanie Twoich ankiet…</p>
    </div>
  `);

  try {
    studentState.surveys = await apiRequest('/api/tours/my-surveys');
    renderSurveyList();
  } catch (err) {
    renderLayout(`
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <h3>Błąd ładowania</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="window.location.reload()">Odśwież</button>
      </div>
    `);
  }
}

async function openSurveyForm(tourId) {
  renderLayout(`
    <div class="loader">
      <div class="spinner"></div>
      <p>Ładowanie formularza…</p>
    </div>
  `);

  try {
    const survey = studentState.surveys.find((s) => s.tour_id === tourId) || null;

    const [tokenResponse, questions] = await Promise.all([
      apiRequest(`/api/tours/my-token/${tourId}`),
      apiRequest('/api/admin/questions/')
    ]);

    studentState.activeSurvey = survey;
    studentState.surveyToken = tokenResponse.token;
    studentState.questions = questions.filter((q) => q.is_active);
    studentState.answers = {};

    if (!studentState.questions.length) {
      throw new Error('Brak aktywnych pytań w tej ankiecie. Skontaktuj się z administratorem.');
    }

    renderSurveyForm();
  } catch (err) {
    window.showToast?.(`Błąd: ${err.message}`, 'error');
    renderSurveyList();
  }
}

async function submitSurvey() {
  const unanswered = studentState.questions.filter((q) => {
    const a = studentState.answers[q.id];
    return typeof a !== 'string' || a.trim().length === 0;
  });

  if (unanswered.length) {
    window.showToast?.(`Proszę uzupełnić wszystkie pytania (brakuje ${unanswered.length}).`, 'error');
    return;
  }

  const btn = document.getElementById('submit-survey-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Wysyłanie…'; }

  const payload = {
    token: studentState.surveyToken,
    answers: studentState.questions.map((q) => ({
      question_id: q.id,
      value: studentState.answers[q.id].trim()
    }))
  };

  try {
    await apiRequest('/api/responses/submit', 'POST', payload);
    window.showToast?.('Ankieta wysłana! Dziękujemy za opinię. 🎉', 'success');
    await loadStudentSurveys();
  } catch (err) {
    window.showToast?.(`Błąd wysyłania: ${err.message}`, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '📤 Wyślij ankietę'; }
  }
}

export function renderStudentSurveysPage(email = '', role = 'student') {
  currentEmail = email;
  currentRole = role;
  loadStudentSurveys();
}