import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import (
    User, SurveyTour, SurveyToken, Question, QuestionType, QuestionChoice
)
from app.core.security import get_current_admin_or_teacher
from app.schemas import (
    SurveyTourCreate, SurveyTourUpdate, SurveyTourResponse,
    QuestionCreate, QuestionResponse
)

router = APIRouter(prefix="/teacher", tags=["Teacher Panel – Sprint 6"])



# HELPER


def _require_teacher_or_admin(current_user: User = Depends(get_current_admin_or_teacher)):
    return current_user



# SURVEY TOURS (read + create + update + assign students)
# Teachers can create/edit tours but NOT delete them


@router.get("/tours", response_model=List[SurveyTourResponse])
def teacher_get_tours(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """List all survey tours."""
    return db.query(SurveyTour).order_by(SurveyTour.start_date.desc()).all()


@router.post("/tours", response_model=SurveyTourResponse, status_code=201)
def teacher_create_tour(
    tour_in: SurveyTourCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Create a new survey tour."""
    tour = SurveyTour(**tour_in.model_dump())
    db.add(tour)
    db.commit()
    db.refresh(tour)
    return tour


@router.patch("/tours/{tour_id}", response_model=SurveyTourResponse)
def teacher_update_tour(
    tour_id: int,
    tour_in: SurveyTourUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Update tour details or activate/deactivate it."""
    tour = db.query(SurveyTour).filter(SurveyTour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    for key, value in tour_in.model_dump(exclude_unset=True).items():
        setattr(tour, key, value)
    db.commit()
    db.refresh(tour)
    return tour


@router.get("/tours/{tour_id}/students")
def teacher_get_tour_students(
    tour_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """List all students with their token status for a given tour."""
    students = db.query(User).filter(User.role == "Student").all()
    tokens = db.query(SurveyToken).filter(SurveyToken.tour_id == tour_id).all()
    token_map = {t.user_id: t for t in tokens}

    result = []
    for s in students:
        t = token_map.get(s.id)
        result.append({
            "id": s.id,
            "email": s.email,
            "group": s.group.name if s.group else None,
            "has_token": t is not None,
            "token_used": t.is_used if t else False,
        })
    return result


@router.post("/tours/{tour_id}/students/{student_id}", status_code=201)
def teacher_assign_student(
    tour_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Assign a student to a tour (create anonymous token)."""
    existing = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == student_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already assigned to this tour.")

    student = db.query(User).filter(User.id == student_id, User.role == "Student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    token_entry = SurveyToken(
        user_id=student_id,
        tour_id=tour_id,
        token=str(uuid.uuid4()),
        is_used=False,
    )
    db.add(token_entry)
    db.commit()
    return {"status": "assigned"}


@router.delete("/tours/{tour_id}/students/{student_id}", status_code=204)
def teacher_remove_student(
    tour_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Remove a student from a tour (only if they haven't submitted yet)."""
    token = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == student_id,
        SurveyToken.is_used == False,
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found or already used.")
    db.delete(token)
    db.commit()
    return None


# Bulk-assign all students
@router.post("/tours/{tour_id}/assign-all", status_code=201)
def teacher_assign_all_students(
    tour_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Assign ALL students (without a token yet) to this tour."""
    tour = db.query(SurveyTour).filter(SurveyTour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    students = db.query(User).filter(User.role == "Student").all()
    existing_ids = {
        t.user_id
        for t in db.query(SurveyToken).filter(SurveyToken.tour_id == tour_id).all()
    }

    added = 0
    for s in students:
        if s.id not in existing_ids:
            db.add(SurveyToken(
                user_id=s.id,
                tour_id=tour_id,
                token=str(uuid.uuid4()),
                is_used=False,
            ))
            added += 1
    db.commit()
    return {"status": "ok", "assigned": added}



# QUESTION TEMPLATES (full CRUD for Teacher role)


@router.get("/questions", response_model=List[QuestionResponse])
def teacher_get_questions(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """List all question templates (active + inactive)."""
    return db.query(Question).order_by(Question.id).all()


@router.post("/questions", response_model=QuestionResponse, status_code=201)
def teacher_create_question(
    q_in: QuestionCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Create a new question template."""
    question = Question(
        text=q_in.text,
        question_type=q_in.question_type,
        is_active=True,
    )
    db.add(question)
    db.flush()

    if q_in.question_type == QuestionType.CLOSED:
        for text in (q_in.choices or []):
            db.add(QuestionChoice(question_id=question.id, text=text))

    db.commit()
    db.refresh(question)
    return question


@router.patch("/questions/{question_id}")
def teacher_toggle_question(
    question_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Toggle is_active on a question template."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.is_active = not q.is_active
    db.commit()
    db.refresh(q)
    return {"id": q.id, "is_active": q.is_active}


@router.delete("/questions/{question_id}", status_code=204)
def teacher_delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """Delete a question template (cascade removes choices)."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return None


# STUDENT LIST (read-only for Teacher)


@router.get("/students")
def teacher_list_students(
    db: Session = Depends(get_db),
    _user: User = Depends(_require_teacher_or_admin),
):
    """List all students (for assigning to tours)."""
    students = db.query(User).filter(User.role == "Student").all()
    return [
        {
            "id": s.id,
            "email": s.email,
            "group": s.group.name if s.group else None,
        }
        for s in students
    ]
