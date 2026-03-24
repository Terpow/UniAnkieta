from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# Импорты логики аутентификации
from app.core.auth_service import authenticate_or_create_user
from app.core.security import create_access_token
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["SSO Authentication"])

@router.get("/login")
async def login():
    """Шлюз: Имитация перенаправления студента на портал USOS"""
    print("Шлюз: Перенаправляем студента на портал USOS...")
    return RedirectResponse(url="/api/auth/callback?code=mock_usos_super_code_777")

@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """Обработка ответа от SSO и выдача JWT токена"""
    print(f"Шлюз: Получен код авторизации от вуза: {code}")
    
    # Имитация данных, полученных от сервера вуза после проверки кода
    mock_university_profile = {
        "sso_id": "usos_987654321",
        "email": "jan.kowalski@student.pl",
        "name": "Jan Kowalski"
    }
    
    try:
        # 1. Поиск пользователя в базе или создание нового
        user = authenticate_or_create_user(
            db=db, 
            sso_email=mock_university_profile["email"],
            sso_id=mock_university_profile["sso_id"]
        )
        
        # 2. Генерация реального JWT токена с ролью
        access_token = create_access_token(
            user_id=user.id, 
            role=user.role
        )
        
        # 3. Возвращаем токен фронтенду (Амиру)
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка аутентификации: {str(e)}")

@router.post("/logout")
async def logout():
    """Безопасный выход: сервер подтверждает сброс сессии"""
    return {
        "message": "Successfully logged out. Please delete your token on the client side."
    }