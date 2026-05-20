# UA-TC-003 – Logowanie istniejącego użytkownika 

## Informacje ogólne

| Pole | Wartość |
|------|---------|
| **ID scenariusza** | UA-TC-003 |
| **Tytuł** | Logowanie istniejącego użytkownika – pozytywny i negatywny |
| **Funkcjonalność** | Formularz logowania / endpoint `POST /api/auth/login-password` |
| **Typ testu** | ✅ Pozytywny · ✅ Negatywny |
| **Środowisko** | Frontend: http://localhost:5173 · Backend: http://localhost:8000 · Chrome 124+ · Windows 11 · Docker Compose |
| **Priorytet** | Wysoki |
| **Powiązane Issue** | #48 |

## Dane testowe

| Pole | Wartość |
|------|---------|
| Email (poprawny) | `student1@uniankieta.pl` |
| Hasło (poprawne) | `Demo1234!` |
| Email (nieistniejący) | `nieistniejacy@student.pl` |
| Hasło (błędne) | `ZleHaslo999!` |

## Warunki wstępne

1. `docker compose up --build` zakończone sukcesem
2. Użytkownik `student1@uniankieta.pl` **istnieje** w bazie (uruchom `seed_demo.py`)
3. Użytkownik nie jest zalogowany
4. Token JWT **nie istnieje** w `localStorage['uniankieta_jwt']`

## Przypadek A – Logowanie poprawne (Pozytywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173` | Strona logowania załadowana. Widoczne pola: Email, Hasło, przycisk „Zaloguj się" |
| 2 | Wpisz email: `student1@uniankieta.pl` | Pole wypełnione |
| 3 | Wpisz hasło: `Demo1234!` | Pole wypełnione (zamaskowane: ••••••••••) |
| 4 | Kliknij „Zaloguj się" | Przycisk nieaktywny, tekst „Ładowanie…". Wysyłane `POST /api/auth/login-password` |
| 5 | Sprawdź DevTools → Network → `login-password` | HTTP 200 OK. JSON: `access_token`, `token_type: "bearer"`, `user_info.role: "Student"` |
| 6 | Sprawdź DevTools → Application → LocalStorage | Klucz `uniankieta_jwt` istnieje z tokenem JWT |
| 7 | Sprawdź zawartość strony | Panel studenta widoczny. Email `student1@uniankieta.pl` w nawigacji. Rola: Student |

### Rezultat A

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 200 · Token w localStorage · Panel studenta widoczny |
| **Rzeczywisty rezultat** | Logowanie przebiegło prawidłowo. DevTools → Network pokazał żądanie POST /api/auth/login-password z odpowiedzią HTTP 200 OK. W odpowiedzi JSON znajdował się poprawny access_token oraz user_info.role: "Student". W localStorage pojawił się klucz uniankieta_jwt z tokenem JWT. Po przekierowaniu widoczny był panel studenta z poprawnym adresem email w nagłówku.|
| **Wynik testu** | ✔ PASS|

---

## Przypadek B – Błędne hasło (Negatywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173` | Strona logowania załadowana |
| 2 | Wpisz email: `student1@uniankieta.pl` | Pole wypełnione |
| 3 | Wpisz hasło: `ZleHaslo999!` | Pole wypełnione (zamaskowane) |
| 4 | Kliknij „Zaloguj się" | Przycisk nieaktywny, tekst „Ładowanie…" |
| 5 | Sprawdź DevTools → Network → `login-password` | HTTP 401 Unauthorized. JSON: `detail: "Nieprawidłowy email lub hasło."` |
| 6 | Sprawdź zawartość strony | Komunikat błędu widoczny. Użytkownik NIE jest zalogowany |
| 7 | Sprawdź DevTools → Application → LocalStorage | Klucz `uniankieta_jwt` **nie istnieje** |

### Rezultat B

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 401 · Komunikat błędu · Brak tokena w localStorage |
| **Rzeczywisty rezultat** | System poprawnie odrzucił logowanie. DevTools → Network pokazał odpowiedź HTTP 401 Unauthorized z komunikatem detail: "Nieprawidłowy email lub hasło.". Na stronie pojawił się czerwony komunikat błędu. W localStorage nie zapisano żadnego tokena. |
| **Wynik testu** | ✔ PASS|

---

## Przypadek C – Nieistniejący email (Negatywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173` | Strona logowania załadowana |
| 2 | Wpisz email: `nieistniejacy@student.pl` | Pole wypełnione |
| 3 | Wpisz hasło: `cokolwiek123` | Pole wyp
| 4 | Kliknij „Zaloguj się"` | Wysyłane żądanie
| 5 | DevTools → Network → login-password | HTTP 401 Unauthorized
| 6 | Sprawdź stronę | Komunikat błędu widoczny
| 7 | Sprawdź localStorage |	Brak tokena

### Rezultat C

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 401 · Komunikat błędu · Brak tokena |
| **Rzeczywisty rezultat** | System poprawnie odrzucił próbę logowania. DevTools → Network pokazał odpowiedź HTTP 401 Unauthorized. Komunikat błędu został wyświetlony pod formularzem. LocalStorage pozostał pusty — token nie został wygenerowany.|
| **Wynik testu** | ✔ PASS|

# Uwagi
- Endpoint działa zgodnie z logiką bezpieczeństwa JWT
- System poprawnie rozróżnia błędne hasło i nieistniejący email
- Brak podatności typu „user enumeration” — komunikat błędu jest taki sam
- Token zapisywany jest tylko przy poprawnym logowaniu

# Powiązane
- Issue: #48
- Endpoint: POST /api/auth/login-password
- Frontend: src/login.js
