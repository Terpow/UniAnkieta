from fastapi import FastAPI
from .database import engine  # Импорт движка базы
from . import models          # Импорт твоих моделей

# ГЛАВНАЯ СТРОКА: она создает таблицы в Postgres при запуске
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="UniAnkieta API")

@app.get("/healthcheck")
def health_check():
    return {"status": "OK", "message": "Пулемет заряжен таблицами!"}

# Сюда Стас потом будет дописывать свои маршруты (логин, анкеты и т.д.)