from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# Импорты зависимостей (проверь, что пути совпадают с твоим проектом)
from app.core.auth_service import authenticate_or_create_user
from app.core.security import create_access_token
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["SSO Authentication"])

@router.get("/login")
async def login():
    """Точка входа: перенаправляем на callback с моковым кодом"""
    return RedirectResponse(url="/api/auth/callback?code=mock_usos_super_code_777")

@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """Обработка ответа от SSO и создание сессии"""
    # Имитация данных от вуза (Jan Kowalski - это наш админ для теста)
    mock_university_profile = {
        "sso_id": "usos_UNIQUE_999", 
        "email": "student@student.pl",
        "name": "Jan Kowalski (Admin)"
    }
    
    # 1. Находим или создаем пользователя в БД
    user = authenticate_or_create_user(
        db=db, 
        sso_email=mock_university_profile["email"],
        sso_id=mock_university_profile["sso_id"]
    )
    
    # 2. Генерируем JWT токен с ролью пользователя
    access_token = create_access_token(
        user_id=user.id, 
        role=user.role
    )
    
    # 3. РЕДИРЕКТ НА ФРОНТЕНД с токеном в параметре ?token=
    # Это позволит фронтенду автоматически подхватить сессию
    frontend_url = f"http://localhost:5173/?token={access_token}"
    return RedirectResponse(url=frontend_url)

@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out."}