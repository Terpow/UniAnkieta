from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

# Internal module imports
from app.core.auth_service import authenticate_or_create_user
from app.core.security import create_access_token
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["SSO Authentication"])

@router.get("/login")
async def login():
    """Entry point: simulates a redirect from the University SSO"""
    return RedirectResponse(url="/api/auth/callback?code=mock_usos_super_code_777")

@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """Handle SSO response and create session"""
    
    # Mock data for Admin testing
    mock_university_profile = {
        "sso_id": "admin_12345", 
        "email": "admin@admin.pl",
        "name": "Jan Kowalski (Admin)"
    }
    
    # 1. Find or create user in the DB via service
    user = authenticate_or_create_user(
        db=db, 
        sso_email=mock_university_profile["email"],
        sso_id=mock_university_profile["sso_id"]
    )
    
    # 2. Generate JWT token
    # IMPORTANT: Pass user_id and role as required by security.py
    access_token = create_access_token(
        user_id=user.id, 
        role=user.role
    )
    
    # 3. Redirect user to the frontend with the token in the URL
    frontend_url = f"http://localhost:5173/?token={access_token}"
    return RedirectResponse(url=frontend_url)

@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out."}