# Dokumentacja API UniAnkieta

Niniejsza dokumentacja opisuje kluczowe endpointy API backendu.

## 1. Uwierzytelnianie (Auth)
- `POST /auth/login` – logowanie użytkownika, zwraca token JWT.
- `POST /auth/logout` – unieważnienie sesji.

## 2. Moduł Survey (Sondy)
- `GET /surveys` – pobranie listy wszystkich sond.
- `POST /surveys` – utworzenie nowej sondy.
- `GET /surveys/{id}` – pobranie szczegółów konkretnej sondy.

## 3. Moduł Questions (Pytania)
- `GET /questions/{survey_id}` – pobranie listy pytań dla danej sondy.
- `POST /questions` – dodanie nowego pytania do sondy.

## 4. Administracja
- `GET /admin/users` – zarządzanie listą użytkowników (wymaga roli Admin).
