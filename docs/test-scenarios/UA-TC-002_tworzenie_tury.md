# UA-TC-002 – Tworzenie tury ankiet (Admin)

## Informacje ogólne

| Pole | Wartość |
|------|---------|
| **ID scenariusza** | UA-TC-002 |
| **Tytuł** | Tworzenie nowej tury ankiet przez Admina |
| **Funkcjonalność** | Panel admina / endpoint `POST /api/admin/tours/` |
| **Typ testu** | ✅ Pozytywny |
| **Środowisko** | Frontend: http://localhost:5173 · Backend: http://localhost:8000 · Chrome 124+ · Windows 11 · Docker Compose |
| **Priorytet** | Wysoki |
| **Powiązane Issue** | #48 |

## Dane testowe

| Pole | Wartość |
|------|---------|
| Email | `admin@uniankieta.pl` |
| Hasło | `Demo1234!` |
| Nazwa tury | `Ankieta semestralna – Test` |
| Data rozpoczęcia | `2025-06-01` |
| Data zakończenia | `2025-06-30` |
| Status | Aktywna |

## Warunki wstępne

1. `docker compose up --build` zakończone sukcesem
2. Użytkownik zalogowany jako **Admin**
3. Tura o nazwie `Ankieta semestralna – Test` **nie istnieje** w bazie
4. Token JWT istnieje w `localStorage['uniankieta_jwt']`

## Kroki wykonania

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173`, zaloguj jako Admin | Panel admina widoczny. Zakładka „Tury ankiet" dostępna w nawigacji |
| 2 | Przejdź do sekcji „Tury ankiet" | Lista istniejących tur widoczna (może być pusta) |
| 3 | Kliknij przycisk „Nowa tura" | Formularz tworzenia tury się otwiera. Widoczne pola: Nazwa, Data rozpoczęcia, Data zakończenia, Status |
| 4 | Wypełnij pole „Nazwa": `Ankieta semestralna – Test` | Pole wypełnione |
| 5 | Ustaw datę rozpoczęcia: `2025-06-01` | Data zaakceptowana |
| 6 | Ustaw datę zakończenia: `2025-06-30` | Data zaakceptowana |
| 7 | Ustaw status: Aktywna | Checkbox/toggle aktywny |
| 8 | Kliknij „Zapisz" / „Utwórz" | Przycisk nieaktywny chwilowo. Wysyłane żądanie `POST /api/admin/tours/` |
| 9 | Sprawdź DevTools → Network → `tours` | HTTP 200 OK. JSON zawiera: `id`, `name: "Ankieta semestralna – Test"`, `is_active: true` |
| 10 | Sprawdź listę tur na stronie | Nowa tura `Ankieta semestralna – Test` widoczna na liście ze statusem „Aktywna" |
| 11 | Odśwież stronę (F5) | Tura nadal widoczna – dane zapisane trwale w bazie |

## Rezultaty

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 200 · Tura widoczna na liście · Dane trwałe po odświeżeniu |
| **Rzeczywisty rezultat** | *(wypełnić podczas testu)* |
| **Wynik testu** | ☐ PASS · ☐ FAIL |

## Przypadki negatywne (do sprawdzenia przy okazji)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| N1 | Wyślij formularz z pustym polem „Nazwa" | Błąd walidacji – formularz nie wysłany |
| N2 | Ustaw datę zakończenia wcześniejszą niż rozpoczęcia | Błąd walidacji |
| N3 | Wywołaj `POST /api/admin/tours/` bez tokena JWT | HTTP 401 Unauthorized |
| N4 | Wywołaj `POST /api/admin/tours/` z tokenem Studenta | HTTP 403 Forbidden |

## Uwagi

- Endpoint chroniony przez `get_current_admin_user` (`backend/app/core/security.py`)
- Po utworzeniu tury Admin może przypisać studentów przez `POST /api/admin/tours/{tour_id}/students/{student_id}`
- Tura nieaktywna (`is_active: false`) nie jest widoczna dla studentów

## Powiązane

- Issue: [#48 – Dodaj scenariusze testów manualnych](../../issues/48)
- Endpoint: `POST /api/admin/tours/` (`backend/app/api/tours.py`)
- Frontend: `src/adminTours.js`
