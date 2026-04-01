from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Схема для создания туры (то, что присылает фронтенд)
class SurveyTourCreate(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    is_active: Optional[bool] = False

# Схема для обновления туры
class SurveyTourUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

# Схема для ответа (то, что мы возвращаем фронтенду)
class SurveyTourResponse(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool

    class Config:
        from_attributes = True # Позволяет Pydantic читать данные из SQLAlchemy модели