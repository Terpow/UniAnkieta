import csv
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import csv
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

# Импортируем базу и твои шикарные модели
from app.database import get_db
from app.models import User, Group

router = APIRouter(prefix="/usos", tags=["USOS Import"])

@router.post("/import-students")
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Загружаем CSV файл: email, sso_id, group_name"""
    
    # Проверяем формат. Воздух не принимаем!
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Бро, принимаем только .csv файлы! Плаки-плаки.")

    try:
        content = await file.read()
        decoded_content = content.decode('utf-8-sig') # utf-8-sig убирает невидимые символы (BOM) от Excel
        reader = csv.DictReader(io.StringIO(decoded_content))
        
        # Проверяем, что в CSV есть нужные нам колонки
        expected_columns = ['email', 'sso_id', 'group_name']
        if not all(col in reader.fieldnames for col in expected_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"Неправильный формат CSV! Жду колонки: {expected_columns}. А получил: {reader.fieldnames}"
            )

        imported_users = 0
        imported_groups = 0

        # Лудим данные по строкам
        for row in reader:
            email = row['email'].strip()
            sso_id = row['sso_id'].strip()
            group_name = row['group_name'].strip()

            if not email or not group_name:
                continue # Пропускаем пустые строки на уверенном

            # 1. Ищем группу. Если нет — лудим новую!
            group = db.query(Group).filter(Group.name == group_name).first()
            if not group:
                group = Group(name=group_name)
                db.add(group)
                db.commit()
                db.refresh(group)
                imported_groups += 1

            # 2. Ищем студента. Если нет — создаем и кидаем в группу!
            user = db.query(User).filter(User.email == email).first()
            if not user:
                new_user = User(
                    email=email,
                    sso_id=sso_id,
                    role="Student",
                    group_id=group.id,
                    hashed_password="not_set_sso_user" # Пароль не нужен, они заходят через USOS
                )
                db.add(new_user)
                imported_users += 1

        # Финальный коммит — забираем джекпот
        db.commit()

        return {
            "message": "Сюдааа! Нормалдаки занесли данные!",
            "stats": {
                "new_students_added": imported_users,
                "new_groups_created": imported_groups
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Какая-то дичь при парсинге: {str(e)}")
# from app.models import User, Group # Скоро подключим твои модели

router = APIRouter(prefix="/usos", tags=["USOS Import"])

@router.post("/import-students")
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Закидываем CSV файл со студентами из USOS"""
    
    # Проверяем, что закинули нормальный файл, а не воздух
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Бро, принимаем только .csv файлы! Плаки-плаки.")

    try:
        # Читаем котлету данных
        content = await file.read()
        decoded_content = content.decode('utf-8')
        
        # Парсим CSV
        reader = csv.DictReader(io.StringIO(decoded_content))
        
        imported_count = 0
        for row in reader:
            # Тут мы будем вытаскивать данные: row['email'], row['name'], row['group']
            # И сохранять их в базу данных!
            imported_count += 1
            
        return {"message": f"Сюдааа! Успешно загружено {imported_count} студентов на уверенном!"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга: {str(e)}")