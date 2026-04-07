from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import SurveyTour, User, SurveyToken  # Добавили User и SurveyToken
from app.schemas import SurveyTourCreate, SurveyTourResponse, SurveyTourUpdate
from app.core.security import get_current_admin_user, get_current_user

router = APIRouter(
    prefix="/tours",
    tags=["Tour Management"]
)

# 1. Создать новую туру + Генерация токенов (UC-05)
@router.post("/", response_model=SurveyTourResponse)
def create_tour(
    tour_in: SurveyTourCreate, 
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    if tour_in.start_date >= tour_in.end_date:
        raise HTTPException(status_code=400, detail="Дата начала должна быть раньше даты окончания.")
        
    # Создаем саму туру
    new_tour = SurveyTour(
        name=tour_in.name,
        start_date=tour_in.start_date,
        end_date=tour_in.end_date,
        is_active=tour_in.is_active
    )
    db.add(new_tour)
    db.flush() # Получаем ID новой туры, но не коммитим пока что

    # --- ЛОГИКА АНОНИМИЗАЦИИ (Твоя часть UC-05) ---
    # Находим всех пользователей с ролью "Student"
    students = db.query(User).filter(User.role == "Student").all()
    
    if not students:
        # Если студентов нет, просто сохраняем туру
        db.commit()
        db.refresh(new_tour)
        return new_tour

    # Генерируем уникальный токен для каждого студента
    for student in students:
        token_entry = SurveyToken(
            user_id=student.id,
            tour_id=new_tour.id,
            token=str(uuid.uuid4()), # Генерация случайного ключа
            is_used=False
        )
        db.add(token_entry)

    db.commit()
    db.refresh(new_tour)
    return new_tour

# 2. Получить список всех тур
@router.get("/", response_model=List[SurveyTourResponse])
def get_all_tours(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    tours = db.query(SurveyTour).all()
    return tours

# 3. Эндпоинт для студента: Получить свой секретный токен
# (Это нужно Амиру, чтобы фронтенд знал, какой токен отправить Стасу)
@router.get("/my-token/{tour_id}")
def get_my_survey_token(
    tour_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # Тут нужен обычный юзер, не админ
):
    token_data = db.query(SurveyToken).filter(
        SurveyToken.tour_id == tour_id,
        SurveyToken.user_id == current_user.id,
        SurveyToken.is_used == False
    ).first()

    if not token_data:
        raise HTTPException(
            status_code=403, 
            detail="У вас нет активного токена для этой туры или вы уже её прошли."
        )
    
    return {"token": token_data.token}

# 4. Изменить статус туры
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

    update_data = tour_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tour, key, value)

    db.commit()
    db.refresh(tour)
    return tour