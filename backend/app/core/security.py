import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from dotenv import load_dotenv

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