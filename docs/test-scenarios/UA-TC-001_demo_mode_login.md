# UA-TC-001 – Logowanie w trybie Demo Mode

## Informacje ogólne

| Pole | Wartość |
|------|---------|
| **ID scenariusza** | UA-TC-001 |
| **Tytuł** | Logowanie w trybie Demo Mode – auto-tworzenie konta |
| **Funkcjonalność** | Formularz logowania / endpoint `POST /api/auth/login-password` |
| **Typ testu** | ✅ Pozytywny |
| **Środowisko** | Frontend: http://localhost:5173 · Backend: http://localhost:8000 · Chrome 124+ · Windows 11 · Docker Compose |
| **Priorytet** | Wysoki |
| **Powiązane Issue** | #48 |

## Dane testowe

| Pole | Wartość |
|------|---------|
| Email | `nowyuzytkownik@student.pl` |
| Hasło | `dowolne123` (ignorowane – tryb demo) |
| Rola oczekiwana | Student |

## Warunki wstępne

1. `docker compose up --build` zakończone sukcesem
2. Baza danych pusta – brak użytkownika `nowyuzytkownik@student.pl`
3. Użytkownik nie jest zalogowany
4. Token JWT **nie istnieje** w `localStorage['uniankieta_jwt']`

## Kroki wykonania

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173` | Strona logowania załadowana. Widoczne pola: Email, Hasło, przycisk „Zaloguj się" |
| 2 | Wpisz email: `nowyuzytkownik@student.pl` | Pole wypełnione |
| 3 | Wpisz hasło: `dowolne123` | Pole wypełnione (zamaskowane: ••••••••••) |
| 4 | Kliknij „Zaloguj się" | Przycisk zmienia tekst na „Ładowanie…", jest nieaktywny. Wysyłane żądanie `POST /api/auth/login-password` |
| 5 | Sprawdź DevTools → Network → `login-password` | HTTP 200 OK. JSON zawiera: `access_token`, `token_type: "bearer"`, `user_info.role: "Student"` |
| 6 | Sprawdź DevTools → Application → Local Storage → `localhost:5173` | Klucz `uniankieta_jwt` istnieje, wartość to token JWT (format: `xxxxx.yyyyy.zzzzz`) |
| 7 | Sprawdź zawartość strony | Panel studenta widoczny. Email `nowyuzytkownik@student.pl` w nawigacji. Rola: Student |
| 8 | Sprawdź bazę: `SELECT * FROM users WHERE email='nowyuzytkownik@student.pl'` | Rekord istnieje. `role = 'Student'`, `hashed_password = 'demo_mode'` |

## Rezultaty

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 200 z tokenem JWT · Token w localStorage · Nowy użytkownik utworzony automatycznie · Redirect do panelu studenta |
| **Rzeczywisty rezultat** | Przycisk nieaktywny → HTTP 200 → token w localStorage → panel studenta z emailem w nawigacji · Rekord w bazie: role=Student, hashed_password=demo_mode |
| **Wynik testu** | ✅ PASS |

## Uwagi

- Sprawdzono DevTools → Network: `POST /api/auth/login-password` → 200 OK
- Sprawdzono DevTools → Application → LocalStorage: klucz `uniankieta_jwt` obecny
- Sprawdzono bazę przez pgAdmin: rekord użytkownika utworzony poprawnie
- Demo Mode jest wymaganiem projektowym Sprintu 5 – hasło jest celowo ignorowane
- Logika ról: email zawiera `admin` → Admin · `teacher` → Teacher · pozostałe → Student

## Powiązane

- Issue: [#48 – Dodaj scenariusze testów manualnych](../../issues/48)
- Endpoint: `POST /api/auth/login-password` (`backend/app/main.py`)
- Frontend: `src/login.js`
