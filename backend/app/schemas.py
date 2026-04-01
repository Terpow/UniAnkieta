from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .models import QuestionType  # Импортируем тип вопроса из моделей

# --- СХЕМЫ ДЛЯ ТУР (UC-01) ---

class SurveyTourCreate(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    is_active: Optional[bool] = False

class SurveyTourUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class SurveyTourResponse(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool

    class Config:
        from_attributes = True

# --- СХЕМЫ ДЛЯ ВОПРОСОВ (UC-30) ---

# Схема для варианта ответа (только для закрытых вопросов)
class QuestionChoiceSchema(BaseModel):
    id: int
    text: str

    class Config:
        from_attributes = True

# Схема для создания вопроса
class QuestionCreate(BaseModel):
    text: str = Field(..., example="Как вы оцениваете сложность курса?")
    question_type: QuestionType = Field(..., example="closed")
    # Список строк для вариантов ответов (передаем только для closed)
    choices: Optional[List[str]] = Field(default=[], example=["Легко", "Средне", "Сложно"])

# Схема для ответа сервера (с ID и списком вариантов)
class QuestionResponse(BaseModel):
    id: int
    text: str
    question_type: QuestionType
    is_active: bool
    choices: List[QuestionChoiceSchema] = []

    class Config:
        from_attributes = True