from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import SurveyTour, User, SurveyToken
from app.schemas import SurveyTourCreate, SurveyTourResponse, SurveyTourUpdate
from app.core.security import get_current_admin_user, get_current_user

router = APIRouter()

# 1. Create a new tour + Token Generation (UC-05)
@router.post("/", response_model=SurveyTourResponse)
def create_tour(
    tour_in: SurveyTourCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    if tour_in.start_date >= tour_in.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be earlier than the end date."
        )

    new_tour = SurveyTour(
        name=tour_in.name,
        start_date=tour_in.start_date,
        end_date=tour_in.end_date,
        is_active=tour_in.is_active
    )
    db.add(new_tour)
    db.flush()

    students = db.query(User).filter(User.role == "Student").all()

    if not students:
        db.commit()
        db.refresh(new_tour)
        return new_tour

    for student in students:
        token_entry = SurveyToken(
            user_id=student.id,
            tour_id=new_tour.id,
            token=str(uuid.uuid4()),
            is_used=False
        )
        db.add(token_entry)

    db.commit()
    db.refresh(new_tour)
    return new_tour

# 2. Get list of all tours (admin)
@router.get("/", response_model=List[SurveyTourResponse])
def get_all_tours(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    return db.query(SurveyTour).all()

# 3. Student endpoint: Get personal secret token
@router.get("/my-token/{tour_id}")
def get_my_survey_token(
    tour_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    token_data = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == current_user.id,
        SurveyToken.is_used == False
    ).first()

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active token for this tour or already completed."
        )

    return {"token": token_data.token}

# 4. Update tour status/details
@router.patch("/{tour_id}", response_model=SurveyTourResponse)
def update_tour(
    tour_id: int,
    tour_in: SurveyTourUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    tour = db.query(SurveyTour).filter(SurveyTour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    update_data = tour_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tour, key, value)

    db.commit()
    db.refresh(tour)
    return tour

# 5. Delete tour (UC-26)
@router.delete("/{tour_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tour(
    tour_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    tour = db.query(SurveyTour).filter(SurveyTour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    # Delete associated tokens first
    db.query(SurveyToken).filter(SurveyToken.tour_id == tour_id).delete()
    db.delete(tour)
    db.commit()
    return None

# 6. Assign student to tour manually (add token)
@router.post("/{tour_id}/students/{student_id}", status_code=201)
def assign_student_to_tour(
    tour_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    existing = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == student_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already assigned to this tour.")

    token_entry = SurveyToken(
        user_id=student_id,
        tour_id=tour_id,
        token=str(uuid.uuid4()),
        is_used=False
    )
    db.add(token_entry)
    db.commit()
    return {"status": "assigned"}

# 7. Remove student from tour (delete token)
@router.delete("/{tour_id}/students/{student_id}", status_code=204)
def remove_student_from_tour(
    tour_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    token = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == student_id,
        SurveyToken.is_used == False
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found.")
    db.delete(token)
    db.commit()
    return None

# 8. Get students for a tour (with token status)
@router.get("/{tour_id}/students")
def get_tour_students(
    tour_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin_user)
):
    students = db.query(User).filter(User.role == "Student").all()
    tokens = db.query(SurveyToken).filter(SurveyToken.tour_id == tour_id).all()
    token_map = {t.user_id: t for t in tokens}

    result = []
    for student in students:
        t = token_map.get(student.id)
        result.append({
            "id": student.id,
            "email": student.email,
            "has_token": t is not None,
            "token_used": t.is_used if t else False
        })
    return result