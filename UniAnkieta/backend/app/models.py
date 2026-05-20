import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# ASSOCIATION TABLES 

# Many-to-Many relationship table between Groups and Subjects
group_subject_association = Table(
    "group_subjects",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id"), primary_key=True),
)

#  CORE MODELS (Groups, Users, Subjects) 

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    users = relationship("User", back_populates="group")
    subjects = relationship("Subject", secondary=group_subject_association, back_populates="groups")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Student") 
    sso_id = Column(String, unique=True, index=True, nullable=True)
    
    group_id = Column(Integer, ForeignKey("groups.id"))
    group = relationship("Group", back_populates="users")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    groups = relationship("Group", secondary=group_subject_association, back_populates="subjects")

# TOUR MANAGEMENT MODEL (UC-01) 

class SurveyTour(Base):
    __tablename__ = "survey_tours"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

#  QUESTION TEMPLATE MODELS (UC-30)

class QuestionType(str, enum.Enum):
    OPEN = "open"      # Open-ended question (text response)
    CLOSED = "closed"  # Closed-ended question (multiple choice)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    question_type = Column(SQLEnum(QuestionType), nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationship with answer choices (only for CLOSED type)
    # cascade="all, delete-orphan" removes choices if the question is deleted
    choices = relationship("QuestionChoice", back_populates="question", cascade="all, delete-orphan")

class QuestionChoice(Base):
    __tablename__ = "question_choices"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)

    question = relationship("Question", back_populates="choices")

# ANONYMIZATION & RESPONSE MODELS (UC-05)

class SurveyToken(Base):
    __tablename__ = "survey_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tour_id = Column(Integer, ForeignKey("survey_tours.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    is_used = Column(Boolean, default=False)

    # Helper relationships
    user = relationship("User")
    tour = relationship("SurveyTour")

class Answer(Base):
    __tablename__ = "answers"
    id = Column(Integer, primary_key=True, index=True)
    # Link to the question to identify what is being answered
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    # The actual response value (text or choice ID)
    value = Column(String, nullable=False)
    # Timestamp of the response
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    question = relationship("Question")