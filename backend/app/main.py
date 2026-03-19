import os
import time
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse

# Импорты вашего проекта
from app.database import engine, get_db
from app import models
from app.core.security import create_access_token
from app.core.auth_service import authenticate_or_create_user

# Загружаем переменные из .env (актуально для локального запуска)
load_dotenv()

def create_tables_with_retry():
    """
    Пытается создать таблицы в БД. 
    Если БД еще не готова (в Docker это часто), ждет и пробует снова.
    """
    max_retries = 5
    retry_interval = 5  # секунды
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"🔄 Попытка подключения к БД #{attempt}...")
            models.Base.metadata.create_all(bind=engine)
            print("✅ База данных подключена, таблицы проверены/созданы!")
            return
        except OperationalError as e:
            print(f"⚠️ База данных еще не готова... ({e})")
            if attempt == max_retries:
                print("❌ Не удалось подключиться к БД после 5 попыток. Выход.")
                raise e
            time.sleep(retry_interval)

# Запускаем инициализацию таблиц перед стартом FastAPI
create_tables_with_retry()

app = FastAPI(title="UniAnkieta API - SSO Integrated")

@app.get("/healthcheck")
def health_check():
    return {"status": "OK", "message": "Пулемет заряжен, SSO интегрировано!"}

# --- ТЕСТОВЫЕ ВХОДЫ ДЛЯ РАЗРАБОТКИ (АМИР) ---

@app.get("/api/auth/dev-login-admin")
def dev_login_admin():
    """Временный вход: выдает токен Админа (ID 1)"""
    token = create_access_token(user_id=1, role="Admin")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/dev-login-student")
def dev_login_student():
    """Временный вход: выдает токен Студента (ID 2)"""
    token = create_access_token(user_id=2, role="Student")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/login")
def login_sso():
    # Имитируем, что мы отправляем пользователя на сервер вуза
    # Но для тестов сразу кидаем его на наш callback с тестовым кодом
    return RedirectResponse(url="/api/auth/callback?code=test_user_123")

# --- SSO CALLBACK (СТАС) ---

@app.get("/api/auth/callback")
def sso_callback(code: str, db: Session = Depends(get_db)):
    """
    Принимает 'code' от системы вуза, авторизует или создает пользователя.
    """
    try:
        # 1. Имитация получения данных от SSO сервера вуза
        mock_university_profile = {
            "sso_id": f"usos_{code}",
            "email": f"user_{code}@student.pl"
        }
        
        # 2. Авторизация или регистрация пользователя в нашей БД
        user = authenticate_or_create_user(
            db=db, 
            sso_email=mock_university_profile["email"], 
            sso_id=mock_university_profile["sso_id"]
        )
        
        # 3. Генерация нашего JWT токена
        token = create_access_token(user_id=user.id, role=user.role)
        
        print(f"👤 Успешный вход: {user.email} (Role: {user.role})")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "message": "SSO Login Success",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "sso_id": user.sso_id
            }
        }
        
    except Exception as e:
        print(f"❌ Ошибка SSO: {str(e)}")
        raise HTTPException(status_code=400, detail=f"SSO Auth Error: {str(e)}")