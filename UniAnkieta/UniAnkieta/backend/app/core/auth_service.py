from sqlalchemy.orm import Session
from app.models import User

def get_role_from_email(email: str) -> str:
    """Определяет роль: если почта админская — Admin, иначе — Student"""
    email = email.lower()
    if email.endswith("@admin.pl"):
        return "Admin"
    return "Student"

def authenticate_or_create_user(db: Session, sso_email: str, sso_id: str):
    """Ищет юзера в базе или создает нового, если его нет"""
    # 1. Ищем по sso_id (который  добавил в models.py)
    user = db.query(User).filter(User.sso_id == sso_id).first()
    
    if not user:
        # 2. Если не нашли — создаем
        new_role = get_role_from_email(sso_email)
        user = User(
            email=sso_email,
            sso_id=sso_id,
            role=new_role,
            hashed_password="sso_protected" # Пароль не нужен, заходим через вуз
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user