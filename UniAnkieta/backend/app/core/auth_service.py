from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models import User

def get_role_from_email(email: str) -> str:
    """
    Prosta logika przypisania roli na podstawie domeny/treści emaila.
    Używana w trybie demo (auto-create) i dev loginach.
    """
    email_lower = email.lower()
    if "admin" in email_lower:
        return "Admin"
    if "teacher" in email_lower or "wykladowca" in email_lower or "prof" in email_lower:
        return "Teacher"
    return "Student"

def authenticate_or_create_user(db: Session, sso_email: str, sso_id: str):
    """Znajduje użytkownika w bazie lub tworzy nowego."""
    user = db.query(User).filter(
        or_(User.sso_id == sso_id, User.email == sso_email)
    ).first()

    if not user:
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
        if not user.sso_id:
            user.sso_id = sso_id
            db.commit()
            db.refresh(user)

    return user