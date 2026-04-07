from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
# Подставь свои импорты моделей
from app.database import get_db 
from app.models import SurveyToken, Answer 

router = APIRouter(prefix="/api/responses", tags=["Responses"])

@router.post("/submit")
def submit_survey(submission: dict, db: Session = Depends(get_db)):
    # 1. Берем токен из запроса
    token_val = submission.get("token")
    db_token = db.query(SurveyToken).filter(SurveyToken.token == token_val).first()
    
    # 2. Проверка (UC-04: Status Wypełnienia)
    if not db_token:
        raise HTTPException(status_code=404, detail="Токен не найден")
    if db_token.is_used:
        raise HTTPException(status_code=400, detail="Вы уже заполнили эту анкету!")

    # 3. Сохраняем ответы (UC-05: Anonimizacja)
    # Мы сохраняем ТОЛЬКО текст и ID вопроса. Мы НЕ сохраняем user_id!
    for ans in submission.get("answers", []):
        new_answer = Answer(
            question_id=ans["question_id"],
            value=ans["value"]
        )
        db.add(new_answer)

    # 4. "Сжигаем" билет
    db_token.is_used = True
    db.commit()
    
    return {"message": "Анкета успешно отправлена анонимно!"}