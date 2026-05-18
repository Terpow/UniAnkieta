# UniAnkieta

## Opis projektu
UniAnkieta to nowoczesna aplikacja webowa przeznaczona do przeprowadzania w pełni anonimowych ankiet studenckich na uczelniach wyższych. System pozwala na zbieranie opinii od studentów na temat prowadzonych zajęć, przedmiotów oraz kadry dydaktycznej w sposób bezpieczny, szybki i zgodny z wymaganiami prawnymi (w tym RODO). Rozwiązanie to automatyzuje proces zbierania danych, eliminuje ankiety papierowe oraz dostarcza gotowe zestawienia statystyczne dla wykładowców i administracji.

## Sprint plan
Projekt był realizowany w oparciu o metodykę zwinno-szablonową (Agile/Scrum). Główne etapy rozwoju systemu obejmowały:
* **Sprinty 1-3:** Opracowanie architektury bazy danych, podstawowych modeli SQLAlchemy, mechanizmów autoryzacji JWT oraz struktury interfejsu SPA.
* **Sprint 4:** Implementacja zarządzania edycjami ankiet (Survey Tours) oraz kreatora szablonów pytań otwartych i zamkniętych (UC-01, UC-30).
* **Sprint 5 :** Dodanie zaawansowanego panelu analitycznego i eksportu danych, implementacja trybu deweloperskiego (Demo-mode login), pełna obsługa panelu zarządzania użytkownikami (UC-35) oraz końcowe testy integracyjne.
* **Sprint 6:**  

## Autorzy
* **Zespół Projektowy UniAnkieta** (w ramach kursu Projekt Zespołowy Systemów Informatycznych 2026).

## Technologie
### Backend:
* **Python 3.11** (obraz `python:3.11-slim`)
* **FastAPI** – framework do budowy wydajnego REST API 
* **SQLAlchemy** – ORM do mapowania obiektowo-relacyjnego 
* **Pydantic** – walidacja danych i definicja schematów API 
* **PostgreSQL** – relacyjna baza danych 
* **Passlib / Bcrypt** – bezpieczne haszowanie haseł użytkowników 
* **JWT (JSON Web Tokens)** – autoryzacja stanowa sesji 

### Frontend:
***JavaScript (ES6+)** – czysta logika aplikacji SPA 
***Vite** – nowoczesne narzędzie do budowania i uruchamiania frontendu 
* **Node.js 20** (obraz `node:20-slim`)

### DevOps i Konteneryzacja:
* **Docker & Docker Compose** – konteneryzacja całego środowiska uruchomieniowego 

## Funkcjonalności
* **Pełna anonimizacja odpowiedzi (UC-05):** System generuje unikalne, kryptograficzne tokeny ankiet (`SurveyToken`), które uniemożliwiają powiązanie konkretnego studenta z jego odpowiedziami, gwarantując poufność i zgodność z RODO.
* **Integracja z systemem USOS:** Pobieranie struktury grup dydaktycznych, przedmiotów oraz danych akademickich.
* **System uprawnień i ról (UC-35):** Trzy poziomy dostępów: Admin, Teacher, Student.
  * **Admin:** Zarządzanie kontami użytkowników, zmiana ról, tworzenie pytań oraz uruchamianie tur ankiet.
  * **Teacher:** Dostęp do statystyk, raportów oraz analizy wyników ankiet z własnych przedmiotów.
  * **Student:** Przegląd i bezpieczne, anonimowe wypełnianie aktywnych ankiet.
* **Zarządzanie turami (UC-01):** Elastyczne planowanie ram czasowych (data rozpoczęcia i zakończenia) dla poszczególnych procesów ankietyzacji.
* **Szablony pytań (UC-30):** Obsługa pytań otwartych (tekstowych) oraz zamkniętych (wielokrotnego wyboru z dynamicznymi opcjami odpowiedzi).
* **Tryb deweloperski (Demo Mode):** Uproszczone logowanie jednym kliknięciem na testowe profile w celu prezentacji działania systemu.

## Architektura projektu
Aplikacja została zaprojektowana w architekturze klient-serwer (Client-Server Architecture) z pełnym odseparowaniem warstwy wizualnej od logiki biznesowej:
1. **Frontend SPA:** Warstwa prezentacji komunikująca się z serwerem asynchronicznie za pomocą `Fetch API` z przesyłaniem tokenu JWT w nagłówkach HTTP (`Authorization: Bearer`).
2. **Backend API:** RESTful API oparte na FastAPI z modularnym podziałem na routery (`auth`, `admin`, `tours`, `questions`, `analytics`, `usos`).
3. **Baza danych:** Warstwa trwałości danych PostgreSQL odzwierciedlona za pomocą relacyjnych modeli SQLAlchemy.

## Instalacja
Do uruchomienia projektu wymagane jest zainstalowane środowisko **Docker** oraz **Docker Compose**.

1. Sklonuj repozytorium projektu:
   ```bash
   git clone <link-do-twojego-repozytorium>
   cd uniankieta

```

2. Upewnij się, że pliki konfiguracyjne środowiska są poprawnie ustawione (np. adres URL API we frontendzie wskazuje na port backendu).



## Uruchomienie aplikacji

Wszystkie usługi (Baza danych, API, Aplikacja webowa) są w pełni zorkiestrowane za pomocą Docker Compose.

W celu zbudowania obrazów i uruchomienia kontenerów w katalogu głównym projektu wykonaj polecenie:

```bash
docker-compose up --build

```

Po pomyślnym uruchomieniu aplikacja będzie dostępna pod następującymi adresami:

* 
**Frontend (Aplikacja kliencka):** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173) 


* 
**Backend API (Serwer):** [http://localhost:8000](https://www.google.com/search?q=http://localhost:8000) 


* **Dokumentacja API (Swagger UI):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)

Uwaga: Backend posiada wbudowany mechanizm automatycznego ponawiania prób połączenia z bazą danych (retry), co zapobiega błędom startowym przed pełnym uruchomieniem bazy danych PostgreSQL.

## Instrukcja użytkownika

1. Otwórz przeglądarkę internetową i przejdź pod adres `http://localhost:5173`.


2. **Logowanie i rejestracja:**
* Możesz zarejestrować nowe konto użytkownika w zakładce "Rejestracja".


* Możesz zalogować się za pomocą adresu e-mail i hasła.


* Dla celów szybkiej prezentacji skorzystaj z sekcji **tryb deweloperski** na dole ekranu logowania i kliknij przycisk **Student**, **Teacher** lub **Admin**, aby zalogować się bez wpisywania haseł.




3. 
**Panel Admina:** Umożliwia wgląd w listę użytkowników i zmianę ich ról, dodawanie nowych pytań do bazy oraz tworzenie tur ankiet.


4. 
**Wypełnianie ankiet:** Zalogowany Student widzi przypisane do niego aktywne tury ankiet, które może wypełnić w sposób całkowicie bezpieczny i anonimowy.



## Struktura repozytorium

```text
├── backend/               # Część serwerowa aplikacji (FastAPI) 
│   ├── app/
│   │   ├── api/           # Routery obsługujące poszczególne moduły (auth, admin, tours, questions, analytics) 
│   │   ├── core/          # Logika bezpieczeństwa, generowanie tokenów, usługi autoryzacji 
│   │   ├── models.py      # Definicje tabel i relacji bazy danych SQLAlchemy 
│   │   ├── schemas.py     # Schematy walidacyjne Pydantic 
│   │   ├── database.py    # Konfiguracja silnika i połączenia z DB 
│   │   └── main.py        # Główny punkt wejścia aplikacji FastAPI 
│   ├── Dockerfile         # Plik konfiguracyjny kontenera backendu
│   └── requirements.txt   # Zależności i biblioteki języka Python
├── frontend/              # Interfejs użytkownika (Vite) 
│   ├── assets/            # Statyczne pliki graficzne (np. logo)
│   ├── adminUsers.js      # Panel administracyjny zarządzania rolami użytkowników 
│   ├── login.js           # Obsługa formularzy logowania, rejestracji oraz integracji SSO 
│   ├── api.js             # Wspólny moduł zapytań Fetch API z obsługą nagłówków JWT 
│   ├── main.js            # Główny plik inicjalizacyjny frontendu 
│   ├── index.html         # Główny plik szablonu HTML frontendu
│   └── Dockerfile         # Plik konfiguracyjny kontenera frontendu
└── docker-compose.yml     # Plik konfiguracyjny orkiestracji usług Docker 

```

## API

Pełna interaktywna dokumentacja wszystkich punktów końcowych (endpoints) znajduje się pod adresem `http://localhost:8000/docs`.

### Wybrane Endpointy API:

* **Autentykacja (`/api/auth`):**
* 
`POST /api/auth/register` – Rejestracja nowego konta.


* 
`POST /api/auth/login-password` – Logowanie e-mail/hasło (w trybie Sprint 5 jako demo-mode).


* `GET /api/auth/dev-login-admin` | `-teacher` | `-student` – Szybkie logowanie deweloperskie.




* **Administracja (`/api/admin`):**
* 
`GET /api/admin/users` – Pobranie listy wszystkich zarejestrowanych użytkowników.


* 
`PATCH /api/admin/users/{userId}/role` – Dynamiczna zmiana roli użytkownika.




* **Zarządzanie Turami i Pytaniami:**
* 
`POST /api/admin/tours` – Tworzenie nowej edycji ankietyzacji.


* 
`POST /api/admin/questions` – Dodawanie pytań otwartych/zamkniętych do szablonu.


* 
`GET /api/admin/analytics` – Pobieranie zagregowanych wyników i statystyk (Sprint 5).





## Zrzuty ekranu

*Sekcja przeznaczona na dokumentację graficzną interfejsu systemu:*

* 
`![Ekran Logowania](docs/login_screen.png)` 


* `![Panel Administratora](docs/admin_panel.png)`
* `![Statystyki i Analiza](docs/analytics_dashboard.png)`

## Status projektu

Projekt został pomyślnie ukończony w ramach kursu szkolnego *Projekt Zespołowy Systemów Informatycznych 2026*. Wszystkie kluczowe wymagania funkcjonalne, włączając w to zaawansowaną analitykę i integrację modułów ze Sprintu 5, zostały wdrożone i przetestowane.

## Licencja

Projekt o charakterze edukacyjnym. Wszelkie prawa zastrzeżone © 2026 Zespół UniAnkieta.



