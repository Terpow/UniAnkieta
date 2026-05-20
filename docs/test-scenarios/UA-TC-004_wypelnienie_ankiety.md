# UA-TC-004 – Wypełnienie ankiety przez studenta

## Informacje ogólne

| Pole | Wartość |
|------|---------|
| **ID scenariusza** | UA-TC-004 |
| **Tytuł** | Wypełnienie ankiety przez studenta – główny user flow |
| **Funkcjonalność** | Panel studenta / endpoint `POST /api/responses/submit` |
| **Typ testu** | ✅ Pozytywny · ✅ Negatywny |
| **Środowisko** | Frontend: http://localhost:5173 · Backend: http://localhost:8000 · Chrome 124+ · Windows 11 · Docker Compose |
| **Priorytet** | Wysoki |
| **Powiązane Issue** | #48 |

## Dane testowe

| Pole | Wartość |
|------|---------|
| Email studenta | `student1@uniankieta.pl` |
| Hasło | `Demo1234!` |
| Tura | `Demo Tour – Semestr Letni 2025` (aktywna, daty aktualne) |
| Odpowiedź zamknięta | `Średni` |
| Odpowiedź otwarta | `Więcej ćwiczeń praktycznych.` |

## Warunki wstępne

1. `docker compose up --build` zakończone sukcesem
2. Uruchomiono `seed_demo.py` – tura i pytania istnieją w bazie
3. Student `student1@uniankieta.pl` ma przypisany token dla tury (`is_used = false`)
4. Tura ma `is_active = true` i aktualne daty (start ≤ dziś ≤ end)
5. Użytkownik nie jest zalogowany

## Przypadek A – Wypełnienie ankiety (Pozytywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Otwórz `http://localhost:5173`, zaloguj jako `student1@uniankieta.pl` | Panel studenta widoczny. Lista ankiet załadowana |
| 2 | Znajdź turę `Demo Tour – Semestr Letni 2025` na liście | Tura widoczna ze statusem „Do wypełnienia" |
| 3 | Kliknij „Wypełnij ankietę" | Formularz ankiety otwarty. Widoczne wszystkie pytania (zamknięte i otwarte) |
| 4 | Dla pytania zamkniętego wybierz opcję `Średni` | Opcja zaznaczona (radio button aktywny) |
| 5 | Dla pytania otwartego wpisz: `Więcej ćwiczeń praktycznych.` | Tekst wpisany w pole textarea |
| 6 | Kliknij „Wyślij ankietę" | Przycisk nieaktywny chwilowo. Wysyłane `POST /api/responses/submit` z tokenem jednorazowym |
| 7 | Sprawdź DevTools → Network → `submit` | HTTP 200 OK. Potwierdzenie przyjęcia odpowiedzi |
| 8 | Sprawdź zawartość strony | Komunikat „Dziękujemy za wypełnienie ankiety!" lub podobny. Przycisk „Wypełnij" zniknął |
| 9 | Sprawdź listę ankiet | Tura ma status „Wypełniona". Przycisk „Wypełnij" niedostępny |
| 10 | Sprawdź DevTools → Network: ponowna próba submit | HTTP 403 – token już wykorzystany (`is_used = true`) |

### Rezultat A

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 200 · Status tury zmieniony na „Wypełniona" · Ponowne wypełnienie niemożliwe |
| **Rzeczywisty rezultat** | Wszystkie kroki przebiegły prawidłowo. DevTools → Network pokazał odpowiedź HTTP 200 OK dla submit. Token jednorazowy został oznaczony jako is_used = true w bazie danych. Na stronie pojawił się komunikat potwierdzający wysłanie ankiety, a tura zmieniła status na „Wypełniona”. Ponowna próba wysłania odpowiedzi zwróciła HTTP 403 Forbidden, zgodnie z logiką backendu. |
| **Wynik testu** | ✔ PASS|

---

## Przypadek B – Student bez tokena (Negatywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Zaloguj jako student bez przypisanej tury | Panel studenta widoczny. Lista ankiet pusta lub tura niewidoczna |
| 2 | Wywołaj `GET /api/tours/my-token/{tour_id}` bez tokena | HTTP 403 Forbidden. JSON: `detail: "No active token for this tour or already completed."` |

### Rezultat B

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 403 · Ankieta niedostępna dla studenta bez tokena |
| **Rzeczywisty rezultat** |System poprawnie odrzucił próbę pobrania tokena. DevTools → Network pokazał odpowiedź HTTP 403 Forbidden z komunikatem detail: "No active token for this tour or already completed.". Lista ankiet była pusta, a student nie miał możliwości otwarcia formularza. |
| **Wynik testu** | ✔ PASS|

---

## Przypadek C – Ponowne wypełnienie (Negatywny)

| # | Akcja | Oczekiwany efekt |
|---|-------|-----------------|
| 1 | Zaloguj jako student który już wypełnił ankietę (`is_used = true`) | Panel studenta widoczny |
| 2 | Sprawdź status tury na liście | Status „Wypełniona". Przycisk „Wypełnij" niedostępny |
| 3 | Wywołaj ręcznie `GET /api/tours/my-token/{tour_id}` | HTTP 403 Forbidden |

### Rezultat C

| Pole | Wartość |
|------|---------|
| **Oczekiwany rezultat** | HTTP 403 · Brak możliwości ponownego wypełnienia |
| **Rzeczywisty rezultat** | System poprawnie zablokował ponowne wypełnienie ankiety. DevTools → Network pokazał odpowiedź HTTP 403 Forbidden. Na liście ankiet status tury był oznaczony jako „Wypełniona”, a przycisk „Wypełnij” był nieaktywny.|
| **Wynik testu** | ✔ PASS |

---

## Uwagi

- Anonimowość zapewniona przez token jednorazowy – odpowiedź nie zawiera `user_id`
- Token zmienia `is_used = true` po pierwszym submit (`backend/app/api/responses.py`)
- Tura nieaktywna lub poza zakresem dat zwraca błąd przy próbie wypełnienia
- Pytania otwarte wymagają minimum 1 znaku – walidacja po stronie frontendu

## Powiązane

- Issue: [#48 – Dodaj scenariusze testów manualnych](../../issues/48)
- Endpoint: `POST /api/responses/submit` (`backend/app/api/responses.py`)
- Endpoint: `GET /api/tours/my-token/{tour_id}` (`backend/app/api/tours.py`)
- Frontend: `src/studentSurvey.js`
