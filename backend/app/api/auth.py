from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# 1. РАСКОММЕНТИРУЕМ ИМПОРТЫ (проверь пути к файлам!)
from app.core.auth_service import authenticate_or_create_user
from app.core.security import create_access_token
from app.database import get_db  # Импорт сессии базы данных

router = APIRouter(prefix="/auth", tags=["SSO Authentication"])

@router.get("/login")
async def login():
    print("Шлюз: Перенаправляем студента на портал USOS...")
    return RedirectResponse(url="/auth/callback?code=mock_usos_super_code_777")

@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)): # Добавили db
    print(f"Шлюз: Получен код авторизации от вуза: {code}")
    
    # Имитация ответа от сервера вуза
    mock_university_profile = {
        "sso_id": "usos_987654321",
        "email": "jan.kowalski@student.pl",
        "name": "Jan Kowalski"
    }
    
    # --- БЛОК АЛЕКСЕЯ (ОЖИВЛЯЕМ) ---
    
    # 1. Твоя функция ищет юзера по sso_id или создает его
    user = authenticate_or_create_user(
        db=db, 
        sso_email=mock_university_profile["email"],
        sso_id=mock_university_profile["sso_id"]
    )
    
    # 2. Твоя функция генерирует реальный JWT токен
    access_token = create_access_token(
        user_id=user.id, 
        role=user.role
    )
    
    # ----------------------------------------------------------------

    # Шаг 4: Возвращаем РЕАЛЬНЫЙ токен Амиру (фронтенду)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Успешная авторизация через SSO!",
        "user_info": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "name": mock_university_profile["name"]
        }
    }