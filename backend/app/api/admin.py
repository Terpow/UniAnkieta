from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.core.security import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/users")
async def list_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    """List all users (admin only)"""
    return db.query(User).all()

@router.patch("/users/{user_id}/role")
async def change_role(user_id: int, new_role: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    """Change user role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role
    db.commit()
    return {"status": "success", "message": f"User {user_id} role updated to {new_role}"}