import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="uni-app">
    <header class="uni-header">
      <div class="uni-header__inner">
        <div class="uni-logo">
          <div class="uni-logo__icon">🏛️</div>
          <div>
            <h1>UniAnkieta</h1>
            <p>Wirtualny System Ankiet Uczelnianych</p>
          </div>
        </div>
        <nav class="uni-nav">
          <a href="#">Strona główna</a>
          <a href="#">Ankiety</a>
          <a href="#">Kontakt</a>
        </nav>
      </div>
    </header>

    <main class="uni-main">
      <section class="uni-welcome">
        <h2>Witaj na stronie ankiet dla studentów</h2>
        <p>Wybierz ankietę z listy przedmiotów i wypełnij ją w kilku prostych krokach.</p>
      </section>

      <section class="uni-panel">
        <h3>Lista dostępnych ankiet</h3>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Przedmiot</th>
                <th>Wykładowca</th>
                <th>Status</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody id="survey-body"></tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="uni-footer">
      <p>© 2026 UniAnkieta • Wydział Informatyki UE</p>
    </footer>
  </div>
`

const surveys = [
  { subject: "Podstawy Programowania", lecturer: "dr inż. Jan Kowalski", status: "Wypełniona" },
  { subject: "Analiza Matematyczna I", lecturer: "prof. dr hab. Ewa Nowak", status: "Oczekuje" },
  { subject: "Sieci Komputerowe", lecturer: "mgr Anna Lis", status: "Oczekuje" },
  { subject: "Wychowanie Fizyczne", lecturer: "dr Piotr Sportowy", status: "Wypełniona" }
];

function loadSurveys() {
  const body = document.getElementById("survey-body");
  if (!body) return;
  body.innerHTML = "";

  surveys.forEach(s => {
    const statusClass = s.status === "Wypełniona" ? "status-green" : "status-red";
    const action = s.status === "Oczekuje" ? '<button class="action-button">Wypełnij</button>' : 'Brak';

    body.innerHTML += `
      <tr>
        <td>${s.subject}</td>
        <td>${s.lecturer}</td>
        <td><span class="${statusClass}">${s.status}</span></td>
        <td>${action}</td>
      </tr>
    `;
  });
}

loadSurveys();

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.reload();
  });
}
