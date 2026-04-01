from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Question, QuestionChoice, QuestionType
from app.schemas import QuestionCreate, QuestionResponse

router = APIRouter()

# --- ЭНДПОИНТ: СОЗДАНИЕ ВОПРОСА ---
@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question_in: QuestionCreate, 
    db: Session = Depends(get_db)
):
    """
    Создает новый шаблон вопроса.
    - Если question_type == 'closed', нужно передать список 'choices'.
    - Если 'open', список 'choices' будет проигнорирован.
    """
    
    # 1. Валидация для закрытых вопросов
    if question_in.question_type == QuestionType.CLOSED:
        if not question_in.choices or len(question_in.choices) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Закрытый вопрос должен иметь хотя бы 2 варианта ответа (choices)."
            )
    
    # 2. Создаем сам объект вопроса
    new_question = Question(
        text=question_in.text,
        question_type=question_in.question_type,
        is_active=True
    )
    
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    # 3. Если вопрос закрытый, сохраняем варианты ответов
    if question_in.question_type == QuestionType.CLOSED:
        for choice_text in question_in.choices:
            db_choice = QuestionChoice(
                question_id=new_question.id, 
                text=choice_text
            )
            db.add(db_choice)
        
        db.commit()
        db.refresh(new_question) # Чтобы подтянулись созданные choices в ответ

    return new_question

# --- ЭНДПОИНТ: ПОЛУЧЕНИЕ ВСЕХ ВОПРОСОВ ---
@router.get("/", response_model=List[QuestionResponse])
def get_all_questions(db: Session = Depends(get_db)):
    """
    Возвращает список всех существующих шаблонов вопросов с их вариантами.
    """
    return db.query(Question).all()

# --- ЭНДПОИНТ: УДАЛЕНИЕ ВОПРОСА ---
@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """
    Удаляет вопрос. Благодаря cascade="all, delete-orphan" в моделях, 
    варианты ответов удалятся автоматически.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    
    db.delete(question)
    db.commit()
    return None