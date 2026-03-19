import os
import time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Добавили импорт
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse

# Импорты твоего проекта
from app.database import engine, get_db
from app import models
from app.core.security import create_access_token
from app.core.auth_service import authenticate_or_create_user

load_dotenv()

def create_tables_with_retry():
    max_retries = 5
    retry_interval = 5 
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

create_tables_with_retry()

app = FastAPI(title="UniAnkieta API - SSO Integrated")

# --- НАСТРОЙКА CORS (ВАЖНО ДЛЯ АМИРА) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Разрешаем фронтенду Амира подключаться
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthcheck")
def health_check():
    return {"status": "OK", "message": "Пулемет заряжен, SSO интегрировано!"}

@app.get("/api/auth/dev-login-admin")
def dev_login_admin():
    token = create_access_token(user_id=1, role="Admin")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/login")
def login_sso():
    # Ведем на callback, который сгенерирует токен
    return RedirectResponse(url="/api/auth/callback?code=test_user_123")

@app.get("/api/auth/callback")
def sso_callback(code: str, db: Session = Depends(get_db)):
    try:
        mock_university_profile = {
            "sso_id": f"usos_{code}",
            "email": f"user_{code}@student.pl"
        }
        user = authenticate_or_create_user(
            db=db, 
            sso_email=mock_university_profile["email"], 
            sso_id=mock_university_profile["sso_id"]
        )
        token = create_access_token(user_id=user.id, role=user.role)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"email": user.email, "role": user.role}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))