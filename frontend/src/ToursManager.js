// ToursManager.js – Admin tours management (UC-26)
import { apiRequest } from './api.js';
import { clearToken } from './login.js';

let studentModalTourId = null;

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
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

async function loadTours() {
  const tbody = document.getElementById('tours-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="loader"><div class="spinner"></div></div></td></tr>`;

  try {
    // Use /api/admin/tours/ – admin endpoint
    const tours = await apiRequest('/api/admin/tours/');

    if (!tours || tours.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:32px">
        <div class="empty-state__icon">🗓️</div>
        <h3>Brak tur</h3>
        <p>Utwórz pierwszą turę ankiet używając formularza powyżej.</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = tours.map((t) => {
      const active = t.is_active;
      return `
        <tr>
          <td style="font-weight:600;">${escapeHtml(t.name)}</td>
          <td style="font-size:13px;">${escapeHtml(formatDate(t.start_date))}</td>
          <td style="font-size:13px;">${escapeHtml(formatDate(t.end_date))}</td>
          <td>
            <span class="badge ${active ? 'badge-green' : 'badge-gray'}">
              ${active ? 'Aktywna' : 'Nieaktywna'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm toggle-btn" data-tour-id="${t.id}" data-active="${active}">
                ${active ? '⏸ Dezaktywuj' : '▶ Aktywuj'}
              </button>
              <button class="btn btn-secondary btn-sm students-btn" data-tour-id="${t.id}" style="background:var(--brand-soft); color:var(--brand);">
                👥 Studenci
              </button>
              <button class="btn btn-danger btn-sm delete-btn" data-tour-id="${t.id}">
                🗑
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Toggle active
    tbody.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tourId = btn.dataset.tourId;
        const isActive = btn.dataset.active === 'true';
        btn.disabled = true;
        try {
          await apiRequest(`/api/admin/tours/${tourId}`, 'PATCH', { is_active: !isActive });
          window.showToast?.(`Tura ${!isActive ? 'aktywowana' : 'dezaktywowana'}.`, 'success');
          loadTours();
        } catch (err) {
          window.showToast?.(`Błąd: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });

    // Delete
    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Usunąć tę turę? Wszystkie przypisane tokeny zostaną usunięte.')) return;
        btn.disabled = true;
        try {
          await apiRequest(`/api/admin/tours/${btn.dataset.tourId}`, 'DELETE');
          window.showToast?.('Tura usunięta.', 'success');
          loadTours();
        } catch (err) {
          window.showToast?.(`Błąd: ${err.message}`, 'error');
          btn.disabled = false;
        }
      });
    });

    // Students modal
    tbody.querySelectorAll('.students-btn').forEach((btn) => {
      btn.addEventListener('click', () => openStudentsModal(Number(btn.dataset.tourId)));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="alert alert-error">Błąd: ${escapeHtml(err.message)}</div></td></tr>`;
  }
}

async function createTour() {
  const name = document.getElementById('tour-name')?.value?.trim();
  const start = document.getElementById('tour-start')?.value;
  const end = document.getElementById('tour-end')?.value;

  if (!name || !start || !end) {
    window.showToast?.('Wypełnij wszystkie pola.', 'error');
    return;
  }

  const btn = document.getElementById('create-tour-btn');
  btn.disabled = true;
  btn.textContent = 'Tworzenie…';

  try {
    await apiRequest('/api/admin/tours/', 'POST', {
      name,
      start_date: start + ':00',
      end_date: end + ':00',
      is_active: true
    });

    document.getElementById('tour-name').value = '';
    document.getElementById('tour-start').value = '';
    document.getElementById('tour-end').value = '';

    window.showToast?.(`Tura "${name}" została utworzona i tokeny rozesłane do studentów!`, 'success');
    loadTours();
  } catch (err) {
    window.showToast?.(`Błąd: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '＋ Utwórz turę';
  }
}

async function openStudentsModal(tourId) {
  studentModalTourId = tourId;

  // Show modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'students-modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <div>
          <h2>Studenci tury #${tourId}</h2>
          <p>Zaznacz studentów, którzy powinni mieć dostęp do tej tury.</p>
        </div>
        <button class="btn btn-icon" id="close-students-modal">✕</button>
      </div>
      <div id="students-modal-body">
        <div class="loader"><div class="spinner"></div></div>
      </div>
      <div class="modal__footer">
        <button class="btn btn-secondary" id="cancel-students-btn">Anuluj</button>
        <button class="btn btn-primary" id="save-students-btn">💾 Zapisz zmiany</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('close-students-modal')?.addEventListener('click', closeStudentsModal);
  document.getElementById('cancel-students-btn')?.addEventListener('click', closeStudentsModal);
  document.getElementById('save-students-btn')?.addEventListener('click', saveStudentAssignments);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStudentsModal(); });

  // Load students
  try {
    const students = await apiRequest(`/api/admin/tours/${tourId}/students`);
    const body = document.getElementById('students-modal-body');
    if (!body) return;

    if (!students || students.length === 0) {
      body.innerHTML = `<div class="empty-state" style="padding:24px">
        <p>Brak studentów w systemie. Zaimportuj dane z USOS.</p>
      </div>`;
      return;
    }

    body.innerHTML = `
      <div style="max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
        ${students.map((s) => `
          <label class="checkbox-label">
            <input
              type="checkbox"
              class="student-checkbox"
              data-student-id="${s.id}"
              ${s.has_token && !s.token_used ? 'checked' : ''}
            />
            <div style="flex:1;">
              <div style="font-weight:500; font-size:14px;">${escapeHtml(s.email)}</div>
              <div style="font-size:12px; color:var(--muted);">
                ${s.has_token
                  ? (s.token_used ? '✓ Wypełnił' : '⏳ Przypisany')
                  : 'Nie przypisany'}
              </div>
            </div>
          </label>
        `).join('')}
      </div>
    `;
  } catch (err) {
    const body = document.getElementById('students-modal-body');
    if (body) body.innerHTML = `<div class="alert alert-error">Błąd: ${escapeHtml(err.message)}</div>`;
  }
}

function closeStudentsModal() {
  document.getElementById('students-modal-overlay')?.remove();
  studentModalTourId = null;
}

async function saveStudentAssignments() {
  const tourId = studentModalTourId;
  if (!tourId) return;

  const checkboxes = document.querySelectorAll('.student-checkbox');
  const btn = document.getElementById('save-students-btn');
  btn.disabled = true;
  btn.textContent = 'Zapisywanie…';

  let errors = 0;

  for (const cb of checkboxes) {
    const studentId = cb.dataset.studentId;
    const shouldAssign = cb.checked;
    const wasAssigned = cb.defaultChecked;

    if (shouldAssign && !wasAssigned) {
      try {
        await apiRequest(`/api/admin/tours/${tourId}/students/${studentId}`, 'POST');
      } catch { errors++; }
    } else if (!shouldAssign && wasAssigned) {
      try {
        await apiRequest(`/api/admin/tours/${tourId}/students/${studentId}`, 'DELETE');
      } catch { errors++; }
    }
  }

  closeStudentsModal();
  loadTours();

  if (errors === 0) {
    window.showToast?.('Studenci zaktualizowani!', 'success');
  } else {
    window.showToast?.(`Zakończono z ${errors} błędami.`, 'error');
  }
}

export async function renderAdminToursPage() {
  document.querySelector('#app').innerHTML = `
    ${buildNav()}
    <main class="app-main">
      <div class="page-header">
        <h1>Zarządzanie Turami</h1>
        <p>Twórz tury ankiet, przypisuj studentów i zarządzaj harmonogramem.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="card-header">
          <h3>Nowa tura</h3>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:12px; align-items:end;">
          <div class="field" style="margin:0">
            <label>Nazwa tury</label>
            <input type="text" id="tour-name" placeholder="Np. Semestr Letni 2025" />
          </div>
          <div class="field" style="margin:0">
            <label>Data startu</label>
            <input type="datetime-local" id="tour-start" />
          </div>
          <div class="field" style="margin:0">
            <label>Data końca</label>
            <input type="datetime-local" id="tour-end" />
          </div>
          <button class="btn btn-primary" id="create-tour-btn" style="white-space:nowrap;">＋ Utwórz turę</button>
        </div>
        <p class="text-sm text-muted" style="margin-top:12px;">
          Po utworzeniu tury, tokeny zostaną automatycznie wygenerowane dla wszystkich aktywnych studentów.
        </p>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Lista tur</h3>
          <button class="btn btn-secondary btn-sm" id="refresh-tours-btn">🔄 Odśwież</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Start</th>
                <th>Koniec</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody id="tours-tbody">
              <tr><td colspan="5"><div class="loader"><div class="spinner"></div></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  `;

  // Wire up field styles
  ['tour-name', 'tour-start', 'tour-end'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cssText = 'width:100%; padding:10px 12px; border:1.5px solid var(--line); border-radius:8px; font-family:inherit; font-size:14px; outline:none;';
    el.addEventListener('focus', () => el.style.borderColor = 'var(--brand)');
    el.addEventListener('blur', () => el.style.borderColor = 'var(--line)');
  });

  document.getElementById('create-tour-btn')?.addEventListener('click', createTour);
  document.getElementById('refresh-tours-btn')?.addEventListener('click', loadTours);
  document.getElementById('back-btn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    localStorage.clear();
    window.location.href = '/';
  });

  loadTours();
}