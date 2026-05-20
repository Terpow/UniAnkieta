// studentSurveys.js –  Redesigned Student Interface (Task 1)
// Modern, card-based survey list with animated progress and visual feedback.
import { apiRequest } from './api.js';
import { clearToken } from './login.js';

let studentState = {
  surveys: [],
  activeSurvey: null,
  questions: [],
  surveyToken: null,
  answers: {},
  currentStep: 0, // step-by-step mode
};

let currentEmail = '';
let currentRole = '';

// Helpers 

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function getAnsweredCount() {
  return studentState.questions.filter(q => {
    const a = studentState.answers[q.id];
    return typeof a === 'string' && a.trim().length > 0;
  }).length;
}

// Nav 

function buildNav(withBack = false, backLabel = 'Powrót') {
  const initials = currentEmail ? currentEmail.slice(0, 2).toUpperCase() : '??';
  const roleLabel = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  const roleClass = `role-tag-${currentRole.toLowerCase()}`;
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div id="notif-bell" class="notif-bell" title="Powiadomienia">
          🔔 <span id="notif-count" class="notif-badge hidden">0</span>
        </div>
        ${withBack ? `<button id="back-btn" class="btn btn-ghost btn-sm">← ${escapeHtml(backLabel)}</button>` : ''}
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="topnav__user-email" style="font-size:13px;color:var(--muted)">${currentEmail}</span>
          <span class="role-tag ${roleClass}">${roleLabel}</span>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>
    <div id="notif-panel" class="notif-panel hidden"></div>
  `;
}

function setupCommonListeners(onBack = null) {
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken(); localStorage.clear(); window.location.href = '/';
  });
  if (onBack) {
    document.getElementById('back-btn')?.addEventListener('click', onBack);
  }
  loadAndShowNotifications();
  document.getElementById('notif-bell')?.addEventListener('click', () => {
    const p = document.getElementById('notif-panel');
    p?.classList.toggle('hidden');
    if (!p?.classList.contains('hidden')) renderNotifPanel(p);
  });
}

//Notifications 

async function loadAndShowNotifications() {
  try {
    const data = await apiRequest('/api/notifications');
    const count = data.count || 0;
    const badge = document.getElementById('notif-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
    window._notifications = data.notifications || [];
  } catch { /* silent */ }
}

function renderNotifPanel(panel) {
  const notifs = window._notifications || [];
  if (!notifs.length) {
    panel.innerHTML = `<div class="notif-empty">Brak nowych powiadomień 🎉</div>`;
    return;
  }
  panel.innerHTML = notifs.map(n => `
    <div class="notif-item notif-${n.priority}" ${n.tour_id ? `data-tour="${n.tour_id}"` : ''}>
      <div class="notif-item__icon">${n.type === 'survey_available' ? '📋' : '⏰'}</div>
      <div>
        <div class="notif-item__title">${escapeHtml(n.title)}</div>
        <div class="notif-item__body">${escapeHtml(n.body)}</div>
      </div>
    </div>
  `).join('');

  panel.querySelectorAll('[data-tour]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const tourId = Number(el.dataset.tour);
      const survey = studentState.surveys.find(s => s.tour_id === tourId);
      if (survey?.can_fill) {
        document.getElementById('notif-panel')?.classList.add('hidden');
        openSurveyForm(tourId);
      }
    });
  });
}

//Survey List (UC-02) 

function renderSurveyList() {
  const app = document.querySelector('#app');
  if (!app) return;

  const nav = buildNav();

  if (!studentState.surveys.length) {
    app.innerHTML = nav + `
      <main class="app-main">
        <div class="student-welcome">
          <div class="student-welcome__content">
            <h1>Moje Ankiety</h1>
            <p>Tu pojawią się ankiety przypisane przez Twojego nauczyciela.</p>
          </div>
        </div>
        <div class="empty-state-hero">
          <div class="empty-state-hero__icon">📭</div>
          <h2>Brak przypisanych ankiet</h2>
          <p>Na ten moment nie masz aktywnych tur do wypełnienia.<br>Skontaktuj się z nauczycielem, jeśli spodziewasz się ankiety.</p>
          <button class="btn btn-secondary" style="width:auto; padding:10px 24px; margin-top:16px;"
            onclick="window.location.reload()">🔄 Odśwież</button>
        </div>
      </main>
    `;
    setupCommonListeners();
    return;
  }

  const now = new Date();
  const available = studentState.surveys.filter(s => s.can_fill);
  const completed = studentState.surveys.filter(s => s.is_used);
  const pending = studentState.surveys.filter(s => !s.can_fill && !s.is_used);

  app.innerHTML = nav + `
    <main class="app-main">
      <div class="student-welcome">
        <div class="student-welcome__content">
          <h1>Witaj, <span class="student-name">${currentEmail.split('@')[0]}</span> 👋</h1>
          <p>Masz <strong>${available.length}</strong> ${pluralSurveys(available.length)} do wypełnienia.</p>
        </div>
        <div class="student-stats-mini">
          <div class="student-stat">
            <span class="student-stat__val">${available.length}</span>
            <span class="student-stat__label">Dostępne</span>
          </div>
          <div class="student-stat">
            <span class="student-stat__val">${completed.length}</span>
            <span class="student-stat__label">Wypełnione</span>
          </div>
          <div class="student-stat">
            <span class="student-stat__val">${pending.length}</span>
            <span class="student-stat__label">Oczekujące</span>
          </div>
        </div>
      </div>

      ${available.length ? `
        <div class="survey-section">
          <h2 class="survey-section__title">
            <span class="survey-section__dot survey-section__dot--green"></span>
            Do wypełnienia
          </h2>
          <div class="survey-grid survey-grid--available">
            ${available.map(s => renderSurveyCard(s)).join('')}
          </div>
        </div>
      ` : ''}

      ${pending.length ? `
        <div class="survey-section">
          <h2 class="survey-section__title">
            <span class="survey-section__dot survey-section__dot--amber"></span>
            Niedostępne
          </h2>
          <div class="survey-grid">
            ${pending.map(s => renderSurveyCard(s)).join('')}
          </div>
        </div>
      ` : ''}

      ${completed.length ? `
        <div class="survey-section">
          <h2 class="survey-section__title">
            <span class="survey-section__dot survey-section__dot--gray"></span>
            Wypełnione
          </h2>
          <div class="survey-grid">
            ${completed.map(s => renderSurveyCard(s)).join('')}
          </div>
        </div>
      ` : ''}
    </main>
  `;

  setupCommonListeners();

  document.querySelectorAll('[data-tour-id]').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => openSurveyForm(Number(btn.dataset.tourId)));
    }
  });
}

function pluralSurveys(n) {
  if (n === 1) return 'ankietę';
  if (n >= 2 && n <= 4) return 'ankiety';
  return 'ankiet';
}

function renderSurveyCard(survey) {
  const isAvailable = survey.can_fill;
  const isDone = survey.is_used;
  const cardClass = isDone ? 'survey-card survey-card--done'
    : isAvailable ? 'survey-card survey-card--available'
    : 'survey-card survey-card--locked';

  const badgeClass = isDone ? 'badge-gray' : isAvailable ? 'badge-green' : 'badge-amber';
  const icon = isDone ? '✓' : isAvailable ? '📋' : '🔒';

  const daysLeft = survey.can_fill
    ? Math.ceil((new Date(survey.end_date) - new Date()) / 86400000)
    : null;

  return `
    <article class="${cardClass}">
      <div class="survey-card__top">
        <div class="survey-card__icon-wrap ${isAvailable ? 'icon-wrap--available' : isDone ? 'icon-wrap--done' : 'icon-wrap--locked'}">
          ${icon}
        </div>
        <span class="badge ${badgeClass}">${escapeHtml(survey.status)}</span>
      </div>
      <h3 class="survey-card__title">${escapeHtml(survey.tour_name)}</h3>
      <div class="survey-card__dates">
        <div class="survey-card__date">
          <span class="survey-card__date-label">Start</span>
          <span class="survey-card__date-val">${formatDate(survey.start_date)}</span>
        </div>
        <div class="survey-card__date">
          <span class="survey-card__date-label">Koniec</span>
          <span class="survey-card__date-val">${formatDate(survey.end_date)}</span>
        </div>
      </div>
      ${isAvailable && daysLeft !== null ? `
        <div class="survey-card__urgency ${daysLeft <= 1 ? 'urgency--high' : 'urgency--normal'}">
          ${daysLeft === 0 ? '⚡ Ostatni dzień!' : daysLeft === 1 ? `⏰ Zostaje 1 dzień` : `⏱ Zostaje ${daysLeft} dni`}
        </div>
      ` : ''}
      <button
        class="survey-card__btn ${isAvailable ? 'btn-available' : isDone ? 'btn-done' : 'btn-locked'}"
        data-tour-id="${survey.tour_id}"
        ${!isAvailable ? 'disabled' : ''}
      >
        ${isDone ? '✓ Wypełniona' : isAvailable ? 'Wypełnij ankietę →' : '🔒 Niedostępna'}
      </button>
    </article>
  `;
}

//Survey Form – Step-by-step (UC-03) 

function renderSurveyForm() {
  const total = studentState.questions.length;
  const step = studentState.currentStep;
  const q = studentState.questions[step];
  const val = studentState.answers[q?.id] || '';
  const pct = total ? Math.round((getAnsweredCount() / total) * 100) : 0;

  const app = document.querySelector('#app');
  if (!app) return;

  app.innerHTML = buildNav(true, 'Moje ankiety') + `
    <main class="app-main survey-form-main">
      <div class="survey-form-header">
        <div class="survey-form-header__meta">
          <span class="survey-form-tour">${escapeHtml(studentState.activeSurvey?.tour_name || '')}</span>
          <span class="survey-form-progress-text">${step + 1} / ${total}</span>
        </div>
        <div class="survey-progress-track">
          <div class="survey-progress-fill" style="width:${((step + 1) / total) * 100}%"></div>
        </div>
      </div>

      <div class="survey-question-panel" id="question-panel">
        <div class="question-num">Pytanie ${step + 1}</div>
        <h2 class="question-text">${escapeHtml(q?.text || '')}</h2>

        <div class="question-body" id="question-body">
          ${q?.question_type === 'closed'
            ? `<div class="choice-grid">
                ${q.choices.map(c => `
                  <label class="choice-card ${val === c.text ? 'choice-card--selected' : ''}">
                    <input type="radio" name="q-${q.id}" value="${escapeHtml(c.text)}" ${val === c.text ? 'checked' : ''} />
                    <span class="choice-card__checkmark"></span>
                    <span class="choice-card__text">${escapeHtml(c.text)}</span>
                  </label>
                `).join('')}
              </div>`
            : `<textarea
                class="survey-textarea-full"
                id="open-answer"
                rows="5"
                placeholder="Wpisz swoją odpowiedź tutaj…"
              >${escapeHtml(val)}</textarea>`
          }
        </div>
      </div>

      <div class="survey-nav">
        <button id="prev-btn" class="btn btn-secondary survey-nav__btn" ${step === 0 ? 'disabled' : ''}>
          ← Poprzednie
        </button>
        <div class="survey-nav__dots">
          ${studentState.questions.map((_, i) => {
            const answered = typeof studentState.answers[studentState.questions[i].id] === 'string'
              && studentState.answers[studentState.questions[i].id].trim().length > 0;
            return `<div class="survey-dot ${i === step ? 'survey-dot--active' : answered ? 'survey-dot--done' : ''}"></div>`;
          }).join('')}
        </div>
        ${step < total - 1
          ? `<button id="next-btn" class="btn btn-primary survey-nav__btn">Następne →</button>`
          : `<button id="submit-btn" class="btn btn-primary survey-nav__btn survey-nav__btn--submit">
               📤 Wyślij ankietę
             </button>`
        }
      </div>

      <div class="survey-overall-progress">
        <div class="progress-info">
          <span>Wypełniono ${getAnsweredCount()} z ${total} pytań</span>
          <strong>${pct}%</strong>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${pct}%"></div>
        </div>
      </div>
    </main>
  `;

  setupCommonListeners(() => renderSurveyList());

  // Radio change
  document.querySelectorAll(`[name="q-${q?.id}"]`).forEach(radio => {
    radio.addEventListener('change', e => {
      studentState.answers[q.id] = e.target.value;
      document.querySelectorAll('.choice-card').forEach(card => {
        const r = card.querySelector('input');
        card.classList.toggle('choice-card--selected', r?.checked || false);
      });
      updateOverallProgress();
    });
  });

  // Textarea change
  document.getElementById('open-answer')?.addEventListener('input', e => {
    studentState.answers[q.id] = e.target.value;
    updateOverallProgress();
  });

  document.getElementById('prev-btn')?.addEventListener('click', () => {
    if (studentState.currentStep > 0) {
      studentState.currentStep--;
      renderSurveyForm();
    }
  });

  document.getElementById('next-btn')?.addEventListener('click', () => {
    if (studentState.currentStep < total - 1) {
      studentState.currentStep++;
      renderSurveyForm();
    }
  });

  document.getElementById('submit-btn')?.addEventListener('click', submitSurvey);
}

function updateOverallProgress() {
  const total = studentState.questions.length;
  const answered = getAnsweredCount();
  const pct = total ? Math.round((answered / total) * 100) : 0;

  const fill = document.querySelector('.progress-bar__fill');
  const text = document.querySelector('.progress-info span');
  const num  = document.querySelector('.progress-info strong');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `Wypełniono ${answered} z ${total} pytań`;
  if (num) num.textContent = `${pct}%`;
}

// Load & Submit 

async function loadStudentSurveys() {
  document.querySelector('#app').innerHTML = buildNav() + `
    <main class="app-main">
      <div class="loader" style="padding:80px 0;">
        <div class="spinner"></div>
        <p style="margin-top:16px; color:var(--muted);">Ładowanie Twoich ankiet…</p>
      </div>
    </main>
  `;
  setupCommonListeners();

  try {
    studentState.surveys = await apiRequest('/api/tours/my-surveys');
    renderSurveyList();
  } catch (err) {
    document.querySelector('#app').innerHTML = buildNav() + `
      <main class="app-main">
        <div class="empty-state-hero">
          <div class="empty-state-hero__icon">⚠️</div>
          <h2>Błąd ładowania</h2>
          <p>${escapeHtml(err.message)}</p>
          <button class="btn btn-primary" style="width:auto; padding:10px 24px; margin-top:16px;"
            onclick="window.location.reload()">Spróbuj ponownie</button>
        </div>
      </main>
    `;
    setupCommonListeners();
  }
}

async function openSurveyForm(tourId) {
  document.querySelector('#app').innerHTML = buildNav() + `
    <main class="app-main">
      <div class="loader" style="padding:80px 0;">
        <div class="spinner"></div>
        <p style="margin-top:16px; color:var(--muted);">Ładowanie formularza…</p>
      </div>
    </main>
  `;

  try {
    const survey = studentState.surveys.find(s => s.tour_id === tourId) || null;
    const [tokenResponse, questions] = await Promise.all([
      apiRequest(`/api/tours/my-token/${tourId}`),
      apiRequest('/api/admin/questions/'),
    ]);

    studentState.activeSurvey = survey;
    studentState.surveyToken = tokenResponse.token;
    studentState.questions = questions.filter(q => q.is_active);
    studentState.answers = {};
    studentState.currentStep = 0;

    if (!studentState.questions.length) {
      throw new Error('Brak aktywnych pytań. Skontaktuj się z administratorem.');
    }
    renderSurveyForm();
  } catch (err) {
    window.showToast?.(`Błąd: ${err.message}`, 'error');
    renderSurveyList();
  }
}

async function submitSurvey() {
  const unanswered = studentState.questions.filter(q => {
    const a = studentState.answers[q.id];
    return typeof a !== 'string' || a.trim().length === 0;
  });

  if (unanswered.length) {
    window.showToast?.(`Proszę odpowiedzieć na wszystkie pytania (brakuje ${unanswered.length}).`, 'error');
    // Jump to first unanswered
    const idx = studentState.questions.findIndex(q => {
      const a = studentState.answers[q.id];
      return typeof a !== 'string' || a.trim().length === 0;
    });
    if (idx >= 0) { studentState.currentStep = idx; renderSurveyForm(); }
    return;
  }

  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Wysyłanie…'; }

  const payload = {
    token: studentState.surveyToken,
    answers: studentState.questions.map(q => ({
      question_id: q.id,
      value: studentState.answers[q.id].trim(),
    })),
  };

  try {
    await apiRequest('/api/responses/submit', 'POST', payload);
    // Show success screen
    document.querySelector('#app').innerHTML = buildNav() + `
      <main class="app-main">
        <div class="survey-success">
          <div class="survey-success__icon">🎉</div>
          <h1>Ankieta wysłana!</h1>
          <p>Dziękujemy za Twoją opinię. Odpowiedzi są w pełni anonimowe i zostaną przeanalizowane przez prowadzącego.</p>
          <button id="back-after-submit" class="btn btn-primary" style="width:auto; padding:12px 32px; margin-top:24px;">
            ← Wróć do moich ankiet
          </button>
        </div>
      </main>
    `;
    setupCommonListeners();
    document.getElementById('back-after-submit')?.addEventListener('click', loadStudentSurveys);
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
