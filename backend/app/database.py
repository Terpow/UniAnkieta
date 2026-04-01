import os
from sqlalchemy import create_engine  # Исправлено: было create_all
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Загружаем .env только если мы НЕ в Docker (локально)
load_dotenv()

# Приоритет: 
# 1. Переменная окружения (из docker-compose)
# 2. Файл .env
# 3. Дефолтное значение (только для локальной разработки!)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    print("⚠️ WARNING: DATABASE_URL not found, using local default.")
    # Используй имя сервиса 'db' вместо 'localhost', если хочешь, чтобы работало в Docker по умолчанию
    SQLALCHEMY_DATABASE_URL = "postgresql://user:password@db:5432/uniankieta"

# Создаем движок
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()