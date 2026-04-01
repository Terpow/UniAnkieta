from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# Таблица для связи "Многие ко многим" между Группами и Предметами
group_subject_association = Table(
    "group_subjects",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id"), primary_key=True),
)

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Например, "Informatyka-1"
    
    users = relationship("User", back_populates="group")
    subjects = relationship("Subject", secondary=group_subject_association, back_populates="groups")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Student") # Student, Teacher, Admin
    sso_id = Column(String, unique=True, index=True, nullable=True)
    
    group_id = Column(Integer, ForeignKey("groups.id"))
    group = relationship("Group", back_populates="users")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    groups = relationship("Group", secondary=group_subject_association, back_populates="subjects")

# --- ШАГ 1: МОДЕЛЬ ДЛЯ УПРАВЛЕНИЯ ТУРАМИ ---

class SurveyTour(Base):
    __tablename__ = "survey_tours"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False) # Например: "Зимняя сессия 2025"
    
    # Сроки проведения анкетирования
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Флаг активности (админ может выключить туру вручную раньше срока)
    is_active = Column(Boolean, default=True)

    # Техническое поле: когда была создана запись
    created_at = Column(DateTime, default=datetime.utcnow)
