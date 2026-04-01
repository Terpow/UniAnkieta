from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import SurveyTour
from app.schemas import SurveyTourCreate, SurveyTourResponse, SurveyTourUpdate
from app.core.security import get_current_admin_user

router = APIRouter(
    prefix="/tours",
    tags=["Tour Management"]
)

# 1. Создать новую туру (Только Админ)
@router.post("/", response_model=SurveyTourResponse)
def create_tour(
    tour_in: SurveyTourCreate, 
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin_user) # Защита!
):
    if tour_in.start_date >= tour_in.end_date:
        raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания.")
        
    new_tour = SurveyTour(
        name=tour_in.name,
        start_date=tour_in.start_date,
        end_date=tour_in.end_date,
        is_active=tour_in.is_active
    )
    db.add(new_tour)
    db.commit()
    db.refresh(new_tour)
    return new_tour

# 2. Получить список всех тур (Только Админ)
@router.get("/", response_model=List[SurveyTourResponse])
def get_all_tours(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    tours = db.query(SurveyTour).all()
    return tours

# 3. Изменить статус туры (например, закрыть досрочно)
@router.patch("/{tour_id}", response_model=SurveyTourResponse)
def update_tour(
    tour_id: int, 
    tour_in: SurveyTourUpdate, 
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    tour = db.query(SurveyTour).filter(SurveyTour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Тура не найдена")

    # Обновляем только те поля, которые прислали
    update_data = tour_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tour, key, value)

    db.commit()
    db.refresh(tour)
    return tour