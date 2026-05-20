from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Question, QuestionChoice, QuestionType
from app.schemas import QuestionCreate, QuestionResponse

router = APIRouter()

# --- ENDPOINT: CREATE QUESTION ---
@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question_in: QuestionCreate, 
    db: Session = Depends(get_db)
):
    """
    Creates a new question template.
    - If question_type == 'closed', a list of 'choices' must be provided.
    - If 'open', the 'choices' list will be ignored.
    """
    
    # 1. Validation for closed-ended questions
    if question_in.question_type == QuestionType.CLOSED:
        if not question_in.choices or len(question_in.choices) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A closed-ended question must have at least 2 answer choices."
            )
    
    # 2. Create the question object
    new_question = Question(
        text=question_in.text,
        question_type=question_in.question_type,
        is_active=True
    )
    
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    # 3. If it's a closed question, save the choices
    if question_in.question_type == QuestionType.CLOSED:
        for choice_text in question_in.choices:
            db_choice = QuestionChoice(
                question_id=new_question.id, 
                text=choice_text
            )
            db.add(db_choice)
        
        db.commit()
        db.refresh(new_question) # Refresh to include the created choices in the response

    return new_question

# --- ENDPOINT: GET ALL QUESTIONS ---
@router.get("/", response_model=List[QuestionResponse])
def get_all_questions(db: Session = Depends(get_db)):
    """
    Returns a list of all existing question templates with their choices.
    """
    return db.query(Question).all()

# --- ENDPOINT: DELETE QUESTION ---
@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """
    Deletes a question. Thanks to cascade="all, delete-orphan" in the models, 
    associated choices will be deleted automatically.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    return None