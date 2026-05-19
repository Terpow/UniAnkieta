/**
 * TeacherDashboard.js – Sprint 5
 * Panel wykładowcy / admina:
 *   • Summary Cards (metryki)
 *   • Bar/Pie charts dla pytań zamkniętych (Chart.js via CDN)
 *   • Lista odpowiedzi otwartych z paginacją
 *   • Eksport CSV i PDF z spinnerem + Toast po sukcesie
 */
import { apiRequest, API_URL } from './api.js';
import { TOKEN_KEY, clearToken } from './login.js';

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildNav(email = '') {
  const initials = email ? email.slice(0, 2).toUpperCase() : 'AD';
  return `
    <nav class="topnav">
      <div class="topnav__brand">
        <div class="topnav__logo">🏛️</div>
        <span class="topnav__name">UniAnkieta</span>
      </div>
      <div class="topnav__right">
        <div class="topnav__user">
          <div class="topnav__avatar">${initials}</div>
          <span class="role-tag role-tag-admin">Admin / Nauczyciel</span>
        </div>
        <button id="back-btn" class="btn btn-ghost btn-sm">← Powrót</button>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Wyloguj</button>
      </div>
    </nav>`;
}

// ── Palette for charts ─────────────────────────────────────────────────────
const COLORS = [
  '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed',
  '#0891b2', '#d97706', '#15803d', '#be185d', '#1d4ed8',
];

// ── Load Chart.js from CDN (once) ─────────────────────────────────────────
function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

// ── Render one Bar chart for a closed question ─────────────────────────────
function renderBarChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.distribution.map(d => d.choice),
      datasets: [{
        label: 'Procent odpowiedzi (%)',
        data: data.distribution.map(d => d.percent),
        backgroundColor: COLORS.slice(0, data.distribution.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}%  (${data.distribution[ctx.dataIndex].count} odp.)`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + '%' },
          grid: { color: '#f1f5f9' },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Render one Pie chart ───────────────────────────────────────────────────
function renderPieChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.distribution.map(d => d.choice),
      datasets: [{
        data: data.distribution.map(d => d.count),
        backgroundColor: COLORS.slice(0, data.distribution.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} odp. (${data.distribution[ctx.dataIndex].percent}%)`,
          },
        },
      },
    },
  });
}

// ── Summary cards ──────────────────────────────────────────────────────────
function renderSummaryCards(metrics) {
  return `
    <div class="dashboard-grid" style="margin-bottom:32px;">
      <div class="card" style="text-align:center;">
        <div style="font-size:32px; font-weight:800; color:var(--brand); font-family:var(--font-display);">
          ${metrics.total_surveys_issued}
        </div>
        <div style="font-size:13px; color:var(--muted); margin-top:6px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;">
          Wydanych ankiet
        </div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:32px; font-weight:800; color:var(--ok); font-family:var(--font-display);">
          ${metrics.surveys_submitted}
        </div>
        <div style="font-size:13px; color:var(--muted); margin-top:6px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;">
          Wypełnionych
        </div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:32px; font-weight:800; color:var(--accent); font-family:var(--font-display);">
          ${metrics.fill_rate_percent}%
        </div>
        <div style="font-size:13px; color:var(--muted); margin-top:6px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;">
          Frekwencja
        </div>
      </div>
      <div class="card" style="text-align:center;">
        <div style="font-size:32px; font-weight:800; color:var(--ink-2); font-family:var(--font-display);">
          ${metrics.total_answers_recorded}
        </div>
        <div style="font-size:13px; color:var(--muted); margin-top:6px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;">
          Zapisanych odpowiedzi
        </div>
      </div>
    </div>`;
}

// ── Export helpers ─────────────────────────────────────────────────────────
async function downloadFile(url, filename, btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  // Spinner while generating
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;margin-right:8px;"></span> Generowanie…`;

  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const resp = await fetch(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || 'Błąd serwera');
    }
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(objUrl);
    // ✅ Success Toast as specified
    window.showToast?.('Plik został pomyślnie pobrany', 'success');
  } catch (err) {
    window.showToast?.(`Błąd eksportu: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// ── Open answers panel ─────────────────────────────────────────────────────
async function loadOpenAnswers(questionId, page = 1) {
  const container = document.getElementById(`open-${questionId}`);
  if (!container) return;
  container.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  try {
    const data = await apiRequest(
      `/api/admin/analytics/open/${questionId}?page=${page}&page_size=10`
    );
    if (!data.answers.length) {
      container.innerHTML = `<p class="text-muted" style="padding:16px;">Brak odpowiedzi.</p>`;
      return;
    }
    const list = data.answers.map((a, i) =>
      `<div style="padding:10px 14px; border-left:3px solid var(--brand-mid); margin-bottom:8px; background:var(--line-2); border-radius:0 8px 8px 0; font-size:14px; color:var(--ink-2);">
         <span style="color:var(--muted-2); font-size:12px; margin-right:8px;">#${(page - 1) * 10 + i + 1}</span>
         ${escapeHtml(a)}
       </div>`
    ).join('');

    const pagerPrev = page > 1
      ? `<button class="btn btn-secondary btn-sm" onclick="window.__loadOpen(${questionId}, ${page - 1})">← Poprzednia</button>`
      : '';
    const pagerNext = page < data.pages
      ? `<button class="btn btn-secondary btn-sm" onclick="window.__loadOpen(${questionId}, ${page + 1})">Następna →</button>`
      : '';

    container.innerHTML = `
      ${list}
      <div style="display:flex; gap:8px; justify-content:space-between; margin-top:12px; font-size:13px; color:var(--muted);">
        ${pagerPrev}
        <span>Strona ${data.page} / ${data.pages} &nbsp;(${data.total} odpowiedzi)</span>
        ${pagerNext}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Błąd: ${escapeHtml(err.message)}</div>`;
  }
}

// ── Main render ────────────────────────────────────────────────────────────
export async function renderTeacherDashboard(email = '') {
  const app = document.querySelector('#app');
  if (!app) return;

  // Skeleton while loading
  app.innerHTML = `
    ${buildNav(email)}
    <main class="app-main">
      <div class="page-header">
        <h1>Panel Wykładowcy – Statystyki</h1>
        <p>Wyniki ankiet, wykresy i eksport danych (RODO-compliant).</p>
      </div>
      <div class="loader"><div class="spinner"></div><p>Ładowanie danych…</p></div>
    </main>`;

  document.getElementById('back-btn')?.addEventListener('click', () => window.location.reload());
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken(); localStorage.clear(); window.location.href = '/';
  });

  try {
    await loadChartJs();
    const [metrics, closedStats] = await Promise.all([
      apiRequest('/api/admin/analytics/summary'),
      apiRequest('/api/admin/analytics/closed'),
    ]);

    // Build chart sections
    const closedHtml = closedStats.length
      ? closedStats.map((q, idx) => `
          <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
              <div>
                <h3 style="font-size:16px;">${escapeHtml(q.question_text)}</h3>
                <p>${q.total_answers} odpowiedzi</p>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm chart-toggle-btn" data-idx="${idx}" data-type="bar">
                  📊 Bar
                </button>
                <button class="btn btn-secondary btn-sm chart-toggle-btn" data-idx="${idx}" data-type="pie">
                  🥧 Pie
                </button>
              </div>
            </div>

            ${q.total_answers === 0
              ? `<div class="empty-state" style="padding:24px;"><p>Brak odpowiedzi dla tego pytania.</p></div>`
              : `
                <div id="chart-bar-${idx}" style="position:relative; height:260px;">
                  <canvas id="canvas-bar-${idx}"></canvas>
                </div>
                <div id="chart-pie-${idx}" style="position:relative; height:260px; display:none;">
                  <canvas id="canvas-pie-${idx}"></canvas>
                </div>

                <!-- distribution table -->
                <table class="data-table" style="margin-top:16px;">
                  <thead><tr><th>Opcja</th><th>Liczba</th><th>Procent</th></tr></thead>
                  <tbody>
                    ${q.distribution.map(d => `
                      <tr>
                        <td>${escapeHtml(d.choice)}</td>
                        <td><strong>${d.count}</strong></td>
                        <td>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; background:var(--line-2); border-radius:999px; height:8px; overflow:hidden; min-width:80px;">
                              <div style="width:${d.percent}%; height:100%; background:var(--brand); border-radius:999px;"></div>
                            </div>
                            <span style="font-size:13px; font-weight:600; color:var(--brand); min-width:38px;">${d.percent}%</span>
                          </div>
                        </td>
                      </tr>`).join('')}
                  </tbody>
                </table>`}
          </div>`)
        .join('')
      : `<div class="empty-state"><div class="empty-state__icon">📊</div><h3>Brak pytań zamkniętych</h3><p>Utwórz pytania zamknięte, aby zobaczyć wykresy.</p></div>`;

    // Fetch open questions list to show paginated answers
    let allQuestions = [];
    try { allQuestions = await apiRequest('/api/admin/questions/'); } catch { /* ignore */ }
    const openQs = allQuestions.filter(q => q.question_type === 'open' && q.is_active);

    const openHtml = openQs.length
      ? openQs.map(q => `
          <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
              <div>
                <h3 style="font-size:16px;">✍ ${escapeHtml(q.text)}</h3>
                <p>Otwarte odpowiedzi – anonimowe</p>
              </div>
            </div>
            <div id="open-${q.id}">
              <div class="loader"><div class="spinner"></div></div>
            </div>
          </div>`).join('')
      : '';

    app.innerHTML = `
      ${buildNav(email)}
      <main class="app-main">
        <div class="page-header">
          <h1>Panel Wykładowcy – Statystyki</h1>
          <p>Wyniki ankiet, wykresy i eksport danych (RODO-compliant).</p>
        </div>

        ${renderSummaryCards(metrics)}

        <!-- Export section (Sprint 5: embedded in existing Eksport module) -->
        <div class="card" style="margin-bottom:32px;">
          <div class="card-header">
            <div>
              <h3>Eksport danych</h3>
              <p>Pobierz wyniki ankiet. Dane nie zawierają żadnych identyfikatorów studentów (RODO).</p>
            </div>
          </div>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-secondary" id="export-csv-btn" style="min-width:180px;">
              📄 Pobierz CSV
            </button>
            <button class="btn btn-secondary" id="export-pdf-btn" style="min-width:180px;">
              📑 Pobierz PDF
            </button>
          </div>
          <p class="text-sm text-muted" style="margin-top:12px;">
            CSV: każdy wiersz = anonimowe zgłoszenie, kolumny = pytania.<br>
            PDF: wykresy + lista komentarzy z pytań otwartych.
          </p>
        </div>

        <!-- Closed questions charts -->
        ${closedStats.length ? `
        <div class="page-header" style="margin-bottom:16px;">
          <h2 style="font-family:var(--font-display); font-size:22px;">Pytania zamknięte – Wykresy</h2>
        </div>` : ''}
        ${closedHtml}

        <!-- Open questions answers -->
        ${openQs.length ? `
        <div class="page-header" style="margin-bottom:16px;">
          <h2 style="font-family:var(--font-display); font-size:22px;">Pytania otwarte – Odpowiedzi</h2>
        </div>
        ${openHtml}` : ''}
      </main>`;

    // Re-wire nav buttons (after innerHTML replacement)
    document.getElementById('back-btn')?.addEventListener('click', () => window.location.reload());
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      clearToken(); localStorage.clear(); window.location.href = '/';
    });

    // Export buttons
    document.getElementById('export-csv-btn')?.addEventListener('click', () =>
      downloadFile('/api/admin/analytics/export/csv', 'wyniki_ankiet.csv', 'export-csv-btn'));
    document.getElementById('export-pdf-btn')?.addEventListener('click', () =>
      downloadFile('/api/admin/analytics/export/pdf', 'raport_ankiet.pdf', 'export-pdf-btn'));

    // Render charts
    closedStats.forEach((q, idx) => {
      if (q.total_answers === 0) return;
      renderBarChart(`canvas-bar-${idx}`, q);

      // Toggle chart type buttons
      document.querySelectorAll(`.chart-toggle-btn[data-idx="${idx}"]`).forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          document.getElementById(`chart-bar-${idx}`).style.display =
            type === 'bar' ? 'block' : 'none';
          document.getElementById(`chart-pie-${idx}`).style.display =
            type === 'pie' ? 'block' : 'none';

          // Lazy-render pie on first click
          if (type === 'pie' && !btn.dataset.rendered) {
            renderPieChart(`canvas-pie-${idx}`, q);
            btn.dataset.rendered = '1';
          }

          document.querySelectorAll(`.chart-toggle-btn[data-idx="${idx}"]`).forEach(b =>
            b.classList.toggle('btn-primary', b.dataset.type === type));
        });
      });
    });

    // Expose pagination helper for inline onclick handlers
    window.__loadOpen = loadOpenAnswers;

    // Load open answers (page 1)
    openQs.forEach(q => loadOpenAnswers(q.id, 1));

  } catch (err) {
    const main = app.querySelector('main') || app;
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <h3>Błąd ładowania statystyk</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="window.location.reload()">
          Odśwież
        </button>
      </div>`;
  }
}