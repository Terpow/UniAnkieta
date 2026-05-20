from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from .models import QuestionType  # Importing the question type from models

# --- SURVEY TOUR SCHEMAS (UC-01) ---

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

# QUESTION TEMPLATE SCHEMAS (UC-30) 

# Schema for answer choices (specifically for closed-ended questions)
class QuestionChoiceSchema(BaseModel):
    id: int
    text: str

    class Config:
        from_attributes = True

# Schema for creating a new question
class QuestionCreate(BaseModel):
    text: str = Field(..., example="How would you rate the difficulty of this course?")
    question_type: QuestionType = Field(..., example="closed")
    # List of strings for answer choices (provided only for 'closed' type)
    choices: Optional[List[str]] = Field(default=[], example=["Easy", "Medium", "Hard"])

# Schema for server response (includes ID and list of choices)
class QuestionResponse(BaseModel):
    id: int
    text: str
    question_type: QuestionType
    is_active: bool
    choices: List[QuestionChoiceSchema] = []

    class Config:
        from_attributes = True