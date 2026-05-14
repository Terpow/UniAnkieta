# UniAnkieta 🎓
Проект системы анкетирования для университета.

```

---

## 🐳 Przydatne komendy Docker

*   **Zatrzymanie projektu:** `docker-compose down`
*   **Wyczyszczenie bazy i kontenerów:** `docker-compose down -v`
*   **Podgląd logów backendu:** `docker-compose logs -f app`

### Co zostało dodane:
1.  **Linki do Frontendu i Swaggera:** Żeby nie musieć pamiętać portów (`8000` i `5173`).
2.  **Instrukcja dotycząca tokena:** To najczęstszy punkt, w którym wszyscy się gubią.
3.  **Komendy do bazy danych:** Te same, które testowaliśmy. Teraz każdy z zespołu może nadać sobie upOto tłumaczenie Twojego pliku README na język polski, z zachowaniem technicznego żargonu i przejrzystego formatowania:

---

# UniAnkieta 🎓
Projekt systemu ankietowego dla uniwersytetu.

## 🚀 Jak uruchomić (UC-01)
1. Zainstaluj **Docker Desktop**.
2. W głównym folderze projektu wykonaj:  
   ```bash
   docker-compose up --build

```

3. **Backend API (Swagger):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)
4. **Frontend:** [http://localhost:5173]()

---

## 🔐 Autoryzacja (Testowanie)

Aby zasymulować logowanie przez uniwersyteckie SSO:

1. Przejdź pod adres: `http://localhost:8000/api/auth/login`
2. Skopiuj token z paska adresu przeglądarki.
3. W **Swaggerze** kliknij przycisk **Authorize** i wpisz: `Bearer` + twój_token.

---

## 🛠 Praca z bazą danych (PostgreSQL)

Jeśli chcesz szybko sprawdzić użytkowników lub nadać uprawnienia administratora przez terminal:

### 1. Wyświetlenie wszystkich użytkowników (ID, Email, Role):

```bash
docker-compose exec db psql -U user -d uniankieta -c "SELECT id, sso_id, email, role FROM users;"

```

### 2. Nadanie uprawnień Administratora:

*(Zastąp `ID_UZYTKOWNIKA` numerem ID z listy powyżej)*

```bash
docker-compose exec db psql -U user -d uniankieta -c "UPDATE users SET role = 'Admin' WHERE id = ID_UZYTKOWNIKA;"

```

### 3. Degradacja do roli Studenta:

```bash
docker-compose exec db psql -U user -d uniankieta -c "UPDATE users SET role = 'Student' WHERE id = ID_UZYTKOWNIKA;"

```

---

## 🐳 Przydatne komendy Docker

* **Zatrzymanie projektu:** `docker-compose down`
* **Wyczyszczenie bazy i kontenerów:** `docker-compose down -v`
* **Podgląd logów backendu:** `docker-compose logs -f app`

### Co zostało dodane:

1. **Linki do Frontendu i Swaggera:** Żeby nie musieć pamiętać portów (`8000` i `5173`).
2. **Instrukcja dotycząca tokena:** To najczęstszy punkt, w którym wszyscy się gubią.
3. **Komendy do bazy danych:** Te same, które testowaliśmy. Teraz każdy z zespołu może nadać sobie uprawnienia admina w 5 sekund.

```

```


