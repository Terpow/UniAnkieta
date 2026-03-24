import os
import time
from fastapi import FastAPI, Depends, HTTPException
<<<<<<< HEAD
=======
from fastapi.middleware.cors import CORSMiddleware # Добавили импорт
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse
<<<<<<< HEAD
from fastapi.middleware.cors import CORSMiddleware

# Импорты вашего проекта
=======

# Импорты твоего проекта
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
from app.database import engine, get_db
from app import models
from app.core.security import create_access_token
from app.core.auth_service import authenticate_or_create_user

<<<<<<< HEAD
# Импорт роутеров
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
=======
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
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad

load_dotenv()

# --- 1. ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ---
def create_tables_with_retry():
    max_retries = 5
    retry_interval = 5
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Попытка подключения к БД #{attempt}...")
            models.Base.metadata.create_all(bind=engine)
            print("База данных подключена, таблицы проверены!")
            return
        except OperationalError as e:
            print(f"База данных еще не готова... ({e})")
            if attempt == max_retries:
                raise e
            time.sleep(retry_interval)

create_tables_with_retry()

# --- 2. СОЗДАНИЕ ПРИЛОЖЕНИЯ ---
app = FastAPI(
    title="UniAnkieta API - SSO Integrated",
    description="Backend для системы анкетирования с поддержкой SSO и админ-панели",
    version="1.0.0"
)

# --- 3. НАСТРОЙКА CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. ПОДКЛЮЧЕНИЕ РОУТЕРОВ ---
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# --- 5. СИСТЕМНЫЕ ЭНДПОИНТЫ ---

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/healthcheck", tags=["System"])
def health_check():
    return {"status": "OK", "message": "Пулемет заряжен, SSO интегрировано!"}

<<<<<<< HEAD
# --- 6. ТЕСТОВЫЕ ВХОДЫ (Теперь реально сохраняют в базу!) ---

@app.get("/api/auth/dev-login-admin", tags=["Development"])
def dev_login_admin(db: Session = Depends(get_db)):
    """Выдает токен Админа и СОЗДАЕТ его в базе"""
    # Этот вызов заставит базу сохранить юзера
    user = authenticate_or_create_user(
        db=db, 
        sso_email="admin@admin.pl", # Оканчивается на @admin.pl -> роль Admin
        sso_id="dev_admin_fixed_id"
    )
    token = create_access_token(user_id=user.id, role=user.role)
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user_info": {"id": user.id, "email": user.email, "role": user.role}
    }

@app.get("/api/auth/dev-login-student", tags=["Development"])
def dev_login_student(db: Session = Depends(get_db)):
    """Выдает токен Студента и СОЗДАЕТ его в базе"""
    user = authenticate_or_create_user(
        db=db, 
        sso_email="student@student.pl", 
        sso_id="dev_student_fixed_id"
    )
    token = create_access_token(user_id=user.id, role=user.role)
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user_info": {"id": user.id, "email": user.email, "role": user.role}
    }

# --- 7. ЛОГИКА SSO ---

@app.get("/api/auth/login", tags=["Auth"])
def login_sso():
    return RedirectResponse(url="/api/auth/callback?code=test_user_123")

@app.get("/api/auth/callback", tags=["Auth"])
=======
@app.get("/api/auth/dev-login-admin")
def dev_login_admin():
    token = create_access_token(user_id=1, role="Admin")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/login")
def login_sso():
    # Ведем на callback, который сгенерирует токен
    return RedirectResponse(url="/api/auth/callback?code=test_user_123")

@app.get("/api/auth/callback")
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
def sso_callback(code: str, db: Session = Depends(get_db)):
    try:
        mock_university_profile = {
            "sso_id": f"usos_{code}",
            "email": f"user_{code}@student.pl"
        }
<<<<<<< HEAD
        
=======
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
        user = authenticate_or_create_user(
            db=db, 
            sso_email=mock_university_profile["email"], 
            sso_id=mock_university_profile["sso_id"]
        )
<<<<<<< HEAD
        
=======
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
        token = create_access_token(user_id=user.id, role=user.role)
        return {
            "access_token": token,
            "token_type": "bearer",
<<<<<<< HEAD
            "user": {"id": user.id, "email": user.email, "role": user.role}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSO Auth Error: {str(e)}")
=======
            "user": {"email": user.email, "role": user.role}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad
