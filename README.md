# UniAnkieta 🎓
Проект системы анкетирования для университета.

## 🚀 Как запустить (UC-01)
1. Установи **Docker Desktop**.
2. В корне проекта выполни: 
   ```
   docker-compose up --build
````

3.  **Backend API (Swagger):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)
4.  **Frontend:** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)

-----

## 🔐 Авторизация (Тестирование)

Для эмуляции входа через SSO университета:

1.  Перейди по ссылке: `http://localhost:8000/api/auth/login`
2.  Скопируй токен из адресной строки браузера.
3.  В **Swagger** нажми кнопку **Authorize**, введи `Bearer` + твой\_токен.

-----

## 🛠 Работа с базой данных (PostgreSQL)

Если нужно быстро проверить юзеров или выдать права админа через терминал:

### 1\. Посмотреть всех пользователей (ID, Email, Role):

```
docker-compose exec db psql -U user -d uniankieta -c "SELECT id, sso_id, email, role FROM users;"
```

### 2\. Сделать пользователя Админом:

*(Замени `ЧИСЛО` на ID из списка выше)*

```
docker-compose exec db psql -U user -d uniankieta -c "UPDATE users SET role = 'Admin' WHERE id = ЧИСЛО;"
```

### 3\. Разжаловать до Студента:

```
docker-compose exec db psql -U user -d uniankieta -c "UPDATE users SET role = 'Student' WHERE id = ЧИСЛО;"
```

-----

## 🐳 Полезные команды Docker

  * **Остановить проект:** `docker-compose down`
  * **Очистить базу и контейнеры:** `docker-compose down -v`
  * **Просмотр логов бэкенда:** `docker-compose logs -f app`

### Что я добавил:
1.  **Ссылки на Frontend и Swagger:** Чтобы не вспоминать порты (`8000` и `5173`).
2.  **Инструкцию по токену:** Это самое частое место, где все путаются.
3.  **Команды для БД:** Те самые, что мы проверили. Теперь любой из команды сможет сам себе выдать админку за 5 секунд.


