from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models import User

def get_role_from_email(email: str) -> str:
    """Simple logic to determine user role based on email domain/content"""
    if "admin" in email.lower():
        return "Admin"
    return "Student"

def authenticate_or_create_user(db: Session, sso_email: str, sso_id: str):
    """Finds a user in the database or creates a new one if they don't exist"""
    
    # 1. Look for the user by SSO ID or Email
    user = db.query(User).filter(
        or_(User.sso_id == sso_id, User.email == sso_email)
    ).first()
    
    if not user:
        # 2. If not found — create a new user
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
        # 3. If found but sso_id is missing (e.g., manual import) — update it
        if not user.sso_id:
            user.sso_id = sso_id
            db.commit()
            db.refresh(user)
            
    return user