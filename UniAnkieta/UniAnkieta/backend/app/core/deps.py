from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")

def get_current_user(authorization: str = Header(...)):
    """Проверяет токен в заголовке запроса"""
    try:
        # Убираем слово 'Bearer ' из заголовка
        token = authorization.split(" ")[1]
        # Расшифровываем токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # Здесь будут user_id и role
    except (JWTError, IndexError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def check_admin_role(user=Depends(get_current_user)):
    """Проверяет, является ли пользователь админом"""
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user