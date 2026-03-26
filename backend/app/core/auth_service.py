from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models import User

def get_role_from_email(email: str) -> str:
    """Простая логика определения роли по email"""
    if "admin" in email.lower():
        return "Admin"
    return "Student"

def authenticate_or_create_user(db: Session, sso_email: str, sso_id: str):
    """Ищет юзера в базе или создает нового, если его нет"""
    
    # 1. Ищем пользователя по ID или по Email
    user = db.query(User).filter(
        or_(User.sso_id == sso_id, User.email == sso_email)
    ).first()
    
    if not user:
        # 2. Если не нашли — создаем
        new_role = get_role_from_email(sso_email)
        user = User(
            email=sso_email,
            sso_id=sso_id,
            role=new_role,
            hashed_password="sso_protected"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # 3. Если нашли, но sso_id пустой — обновляем
        if not user.sso_id:
            user.sso_id = sso_id
            db.commit()
            db.refresh(user)
            
    return user