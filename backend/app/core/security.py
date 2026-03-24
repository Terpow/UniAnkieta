import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from dotenv import load_dotenv
<<<<<<< HEAD
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User



# Указываем FastAPI, где искать токен (в заголовке Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Извлекает юзера из базы по токену"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Декодируем токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Проверяет, является ли текущий юзер админом"""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Недостаточно прав. Только для Администраторов."
        )
    return current_user
=======
>>>>>>> 87c5cbae1f99cc936999fa255ba9ca231575cdad

# Загружаем переменные из .env
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-me") # добавил дефолт на всякий
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def create_access_token(user_id: int, role: str):
    """
    Генерирует JWT токен. 
    В 'sub' кладем ID юзера, также добавляем его роль.
    """
    # Берем время истечения из .env или ставим 30 минут по умолчанию
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    
    # Данные для шифрования (Payload)
    # Важно: sub должен быть строкой для стандарта JWT
    to_encode = {
        "sub": str(user_id), 
        "role": role, 
        "exp": expire
    }
    
    # Создаем зашифрованную строку
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt