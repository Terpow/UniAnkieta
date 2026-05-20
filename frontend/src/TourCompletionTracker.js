// TourCompletionTracker.js 
// Real-time tour completion tracker widget.
// Available in TeacherDashboard and TeacherPanel.
// Shows per-tour fill rates with visual progress bars.

import { apiRequest, API_URL } from './api.js';
import { TOKEN_KEY } from './login.js';

/**
 * Renders the completion tracker into the given container element.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {Function} [onTourClick] - Optional callback when a tour row is clicked.
 */
export async function renderCompletionTracker(container, onTourClick = null) {
  if (!container) return;

  container.innerHTML = `
    <div class="card-header">
      <h3>📊 Wskaźnik ukończenia tur</h3>
      <button class="btn btn-secondary btn-sm" id="refresh-tracker-btn">🔄 Odśwież</button>
    </div>
    <div id="tracker-body">
      <div class="loader"><div class="spinner"></div></div>
    </div>
  `;

  document.getElementById('refresh-tracker-btn')?.addEventListener('click', () => loadData());

  async function loadData() {
    const body = document.getElementById('tracker-body');
    if (body) body.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

    try {
      // Fetch all tours
      const tours = await apiRequest('/api/teacher/tours');
      if (!tours.length) {
        if (body) body.innerHTML = `
          <div class="empty-state" style="padding:32px">
            <div class="empty-state__icon">🗓️</div>
            <p>Brak tur w systemie.</p>
          </div>`;
        return;
      }

      // Fetch summary for aggregate context
      const summary = await apiRequest('/api/admin/analytics/summary');

      // Fetch per-tour completion data (tokens)
      // We call the teacher students endpoint for each tour
      const tourData = await Promise.all(tours.map(async (t) => {
        try {
          const students = await apiRequest(`/api/teacher/tours/${t.id}/students`);
          const assigned = students.filter(s => s.has_token).length;
          const completed = students.filter(s => s.token_used).length;
          const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
          return { tour: t, assigned, completed, pct };
        } catch {
          return { tour: t, assigned: 0, completed: 0, pct: 0 };
        }
      }));

      // Sort: active first, then by fill rate desc
      tourData.sort((a, b) => {
        if (a.tour.is_active !== b.tour.is_active) return b.tour.is_active - a.tour.is_active;
        return b.pct - a.pct;
      });

      if (!body) return;

      body.innerHTML = `
        <div style="margin-bottom:16px; display:flex; gap:16px; flex-wrap:wrap;">
          <div class="stat-item" style="flex:1; min-width:120px;">
            <div class="stat-item__value stat-blue">${summary.surveys_submitted}</div>
            <div class="stat-item__label">Łącznie wypełniono</div>
          </div>
          <div class="stat-item" style="flex:1; min-width:120px;">
            <div class="stat-item__value ${summary.fill_rate_percent >= 70 ? 'stat-green' : summary.fill_rate_percent >= 40 ? 'stat-amber' : 'stat-red'}">${summary.fill_rate_percent}%</div>
            <div class="stat-item__label">Globalny wskaźnik</div>
          </div>
          <div class="stat-item" style="flex:1; min-width:120px;">
            <div class="stat-item__value">${tours.filter(t => t.is_active).length}</div>
            <div class="stat-item__label">Aktywnych tur</div>
          </div>
        </div>

        <div>
          ${tourData.map(({ tour, assigned, completed, pct }) => {
            const fillClass = pct >= 70 ? 'fill-high' : pct >= 40 ? 'fill-medium' : 'fill-low';
            const isActive = tour.is_active;
            const cursor = onTourClick ? 'cursor:pointer;' : '';
            return `
              <div class="completion-row" data-tour-id="${tour.id}" style="${cursor}">
                <div class="completion-row__name" title="${escapeHtml(tour.name)}">
                  ${isActive ? '<span style="color:var(--ok); font-size:10px;">●</span> ' : ''}
                  ${escapeHtml(tour.name)}
                </div>
                <div class="completion-row__bar">
                  <div class="completion-row__fill ${fillClass}" style="width:${pct}%"></div>
                </div>
                <div class="completion-row__pct" style="color:${pct >= 70 ? 'var(--ok)' : pct >= 40 ? '#d97706' : 'var(--warn)'}">
                  ${pct}%
                </div>
                <div style="font-size:12px; color:var(--muted); white-space:nowrap; min-width:60px; text-align:right;">
                  ${completed}/${assigned}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      if (onTourClick) {
        body.querySelectorAll('.completion-row[data-tour-id]').forEach(row => {
          row.addEventListener('click', () => onTourClick(Number(row.dataset.tourId)));
        });
      }
    } catch (err) {
      if (body) body.innerHTML = `<p style="color:var(--warn); padding:16px;">Błąd: ${escapeHtml(err.message)}</p>`;
    }
  }

  loadData();
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Creates a self-contained completion tracker card and appends it to a parent.
 */
export function mountCompletionTracker(parentSelector, onTourClick = null) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;
  const card = document.createElement('div');
  card.className = 'card';
  card.style.marginTop = '24px';
  parent.appendChild(card);
  renderCompletionTracker(card, onTourClick);
}
