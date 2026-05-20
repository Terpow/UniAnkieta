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
| 8 | Sprawdź zawartość strony | Komunikat „Dziękujemy za wypełnienie ankiety!" lub podob
