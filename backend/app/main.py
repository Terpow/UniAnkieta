import os
import time
from app.api.responses import router as responses_router
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

# Импорты вашего проекта
from app.database import engine, get_db
from app import models
from app.core.security import create_access_token
from app.core.auth_service import authenticate_or_create_user

# --- ИМПОРТ РОУТЕРОВ ---
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.usos import router as usos_router
from app.api.tours import router as tours_router
from app.api.questions import router as questions_router # Добавили наш новый роутер

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
app.include_router(responses_router) 
app.include_router(admin_router, prefix="/api")
app.include_router(usos_router, prefix="/api") 

# Админские роутеры (сгруппированы под префиксом /api/admin)
app.include_router(tours_router, prefix="/api/admin/tours", tags=["Tour Management"])
app.include_router(questions_router, prefix="/api/admin/questions", tags=["Question Templates"])

# --- 5. СИСТЕМНЫЕ ЭНДПОИНТЫ ---

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/healthcheck", tags=["System"])
def health_check():
    return {"status": "OK", "message": "Пулемет заряжен, SSO интегрировано!"}

# --- 6. ТЕСТОВЫЕ ВХОДЫ ---

@app.get("/api/auth/dev-login-admin", tags=["Development"])
def dev_login_admin(db: Session = Depends(get_db)):
    user = authenticate_or_create_user(
        db=db, 
        sso_email="admin@admin.pl", 
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
            "user": {"id": user.id, "email": user.email, "role": user.role}
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSO Auth Error: {str(e)}")

# --- 8. КАСТОМИЗАЦИЯ OPENAPI (Для кнопки Authorize) ---

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Определяем схему Bearer (JWT)
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # Указываем, что BearerAuth нужен для всех путей в API
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
            
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi