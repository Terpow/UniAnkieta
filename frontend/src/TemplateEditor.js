// TemplateEditor.js – Admin question template editor (UC-30, UC-31)
import { apiRequest } from './api.js';
import { clearToken } from './login.js';

let localQuestions = [];

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildNav() {
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div class="topnav__user">
          <div class="topnav__avatar">AD</div>
          <span class="role-tag role-tag-admin">Admin</span>
        </div>
        <button id="back-btn" class="btn btn-ghost btn-sm">← Powrót</button>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>
  `;
}

function renderLocalQuestions() {
  const container = document.getElementById('local-questions');
  if (!container) return;

  if (localQuestions.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:24px; border:2px dashed var(--line); border-radius:var(--radius);">
      <p style="color:var(--muted-2); font-size:14px;">Dodaj pytania powyżej.</p>
    </div>`;
    return;
  }

  container.innerHTML = localQuestions.map((q, i) => `
    <div class="question-list-item">
      <div class="question-list-item__text">
        <strong style="color:var(--brand); margin-right:8px;">${i + 1}.</strong>
        ${escapeHtml(q.text)}
        ${q.question_type === 'closed' && q.choices.length
          ? `<div style="font-size:12px; color:var(--muted); margin-top:4px;">Opcje: ${q.choices.map(escapeHtml).join(', ')}</div>`
          : ''}
      </div>
      <span class="question-list-item__type">${q.question_type === 'closed' ? '✗ Zamknięte' : '✍ Otwarte'}</span>
      <button class="btn btn-danger btn-sm" data-idx="${i}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('button[data-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localQuestions.splice(Number(btn.dataset.idx), 1);
      renderLocalQuestions();
    });
  });
}

async function loadExistingQuestions() {
  const container = document.getElementById('existing-questions');
  if (!container) return;

  container.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const questions = await apiRequest('/api/admin/questions/');

    if (!questions || questions.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:32px">
        <div class="empty-state__icon">📝</div>
        <h3>Brak pytań</h3>
        <p>Utwórz pierwsze pytanie używając formularza powyżej.</p>
      </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px;">
        ${questions.map((q) => `
          <div style="background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:12px;">
              <span class="badge ${q.question_type === 'closed' ? 'badge-blue' : 'badge-amber'}">
                ${q.question_type === 'closed' ? '✗ Zamknięte' : '✍ Otwarte'}
              </span>
              <span class="badge ${q.is_active ? 'badge-green' : 'badge-gray'}">
                ${q.is_active ? 'Aktywne' : 'Nieaktywne'}
              </span>
            </div>
            <p style="font-size:15px; font-weight:600; color:var(--ink); margin-bottom:10px; line-height:1.4;">
              ${escapeHtml(q.text)}
            </p>
            ${q.choices && q.choices.length ? `
              <div style="font-size:12px; color:var(--muted); background:var(--line-2); border-radius:8px; padding:8px; margin-bottom:12px;">
                ${q.choices.map((c) => `<span style="display:inline-block; margin:2px 4px 2px 0; background:var(--panel); border:1px solid var(--line); border-radius:4px; padding:2px 8px;">${escapeHtml(c.text)}</span>`).join('')}
              </div>` : ''}
            <button class="btn btn-danger btn-sm w-full" data-qid="${q.id}">🗑 Usuń pytanie</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('button[data-qid]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Usunąć to pytanie? Tego nie można cofnąć.')) return;
        btn.disabled = true;
        btn.textContent = '…';
        try {
          await apiRequest(`/api/admin/questions/${btn.dataset.qid}`, 'DELETE');
          window.showToast?.('Pytanie usunięte.', 'success');
          loadExistingQuestions();
        } catch (err) {
          window.showToast?.(`Błąd: ${err.message}`, 'error');
          btn.disabled = false;
          btn.textContent = '🗑 Usuń pytanie';
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Błąd ładowania: ${escapeHtml(err.message)}</div>`;
  }
}

function addLocalQuestion() {
  const textEl = document.getElementById('q-text');
  const typeEl = document.getElementById('q-type');
  const optsEl = document.getElementById('q-options');

  const text = textEl.value.trim();
  if (!text) {
    window.showToast?.('Wpisz treść pytania.', 'error');
    textEl.focus();
    return;
  }

  const type = typeEl.value;
  let choices = [];

  if (type === 'closed') {
    choices = optsEl.value.split(',').map((o) => o.trim()).filter(Boolean);
    if (choices.length < 2) {
      window.showToast?.('Pytanie zamknięte musi mieć co najmniej 2 opcje (oddzielone przecinkami).', 'error');
      optsEl.focus();
      return;
    }
  }

  localQuestions.push({ text, question_type: type, choices });
  textEl.value = '';
  optsEl.value = '';
  renderLocalQuestions();
  window.showToast?.('Pytanie dodane do listy.', 'success');
}

async function saveAllQuestions() {
  if (localQuestions.length === 0) {
    window.showToast?.('Dodaj najpierw pytania.', 'error');
    return;
  }

  const btn = document.getElementById('save-all-btn');
  btn.disabled = true;
  btn.textContent = 'Zapisywanie…';

  let saved = 0;
  let errors = 0;

  for (const q of localQuestions) {
    try {
      await apiRequest('/api/admin/questions/', 'POST', {
        text: q.text,
        question_type: q.question_type,
        choices: q.choices
      });
      saved++;
    } catch {
      errors++;
    }
  }

  localQuestions = [];
  renderLocalQuestions();
  await loadExistingQuestions();

  btn.disabled = false;
  btn.textContent = '💾 Zapisz pytania';

  if (errors === 0) {
    window.showToast?.(`Zapisano ${saved} pytań!`, 'success');
  } else {
    window.showToast?.(`Zapisano ${saved}, błędy: ${errors}.`, 'error');
  }
}

export function renderAdminQuestionsPage() {
  localQuestions = [];

  document.querySelector('#app').innerHTML = `
    ${buildNav()}
    <main class="app-main">
      <div class="page-header">
        <h1>Edytor Pytań</h1>
        <p>Utwórz pytania otwarte i zamknięte używane w turach ankietowania.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <h3>Dodaj nowe pytanie</h3>
        </div>
        <div style="display:grid; grid-template-columns:1fr auto; gap:16px; align-items:start;">
          <div>
            <div class="field">
              <label>Treść pytania</label>
              <input type="text" id="q-text" class placeholder="Np. Jak oceniasz prowadzącego?" />
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="field">
                <label>Typ pytania</label>
                <select id="q-type">
                  <option value="open">✍ Otwarte (tekst)</option>
                  <option value="closed">✗ Zamknięte (wybór)</option>
                </select>
              </div>
              <div class="field">
                <label>Opcje (tylko zamknięte)</label>
                <input type="text" id="q-options" placeholder="Dobra, Średnia, Słaba" />
              </div>
            </div>
          </div>
          <div style="padding-top:32px;">
            <button class="btn btn-primary" id="add-q-btn" style="white-space:nowrap;">＋ Dodaj</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <h3>Pytania do zapisania <span id="q-count" style="background:var(--brand-soft); color:var(--brand); font-size:13px; padding:2px 8px; border-radius:999px; font-weight:700; margin-left:8px;">0</span></h3>
          <button class="btn btn-primary" id="save-all-btn">💾 Zapisz pytania</button>
        </div>
        <div id="local-questions"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Istniejące pytania</h3>
          <button class="btn btn-secondary btn-sm" id="refresh-q-btn">🔄 Odśwież</button>
        </div>
        <div id="existing-questions">
          <div class="loader"><div class="spinner"></div></div>
        </div>
      </div>
    </main>
  `;

  // Wire up field styles
  ['q-text', 'q-options', 'q-type'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.cssText = 'width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:inherit; font-size:14px; outline:none;';
      el.addEventListener('focus', () => el.style.borderColor = 'var(--brand)');
      el.addEventListener('blur', () => el.style.borderColor = 'var(--line)');
    }
  });

  // Toggle options field visibility
  const qType = document.getElementById('q-type');
  const qOpts = document.getElementById('q-options');
  qType.addEventListener('change', () => {
    qOpts.placeholder = qType.value === 'closed'
      ? 'Dobra, Średnia, Słaba (min. 2)'
      : '(tylko dla pytań zamkniętych)';
    qOpts.disabled = qType.value === 'open';
    qOpts.style.opacity = qType.value === 'open' ? '0.4' : '1';
  });

  document.getElementById('add-q-btn')?.addEventListener('click', () => {
    addLocalQuestion();
    // Update count badge
    const cnt = document.getElementById('q-count');
    if (cnt) cnt.textContent = String(localQuestions.length);
  });

  document.getElementById('save-all-btn')?.addEventListener('click', async () => {
    await saveAllQuestions();
    const cnt = document.getElementById('q-count');
    if (cnt) cnt.textContent = '0';
  });

  document.getElementById('refresh-q-btn')?.addEventListener('click', loadExistingQuestions);
  document.getElementById('back-btn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });

  renderLocalQuestions();
  loadExistingQuestions();
}