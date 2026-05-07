import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

# --- CONFIGURATION ---
load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Define the authorization scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(user_id: int, role: str):
    """Generates an encrypted JWT token"""
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    
    # Payload data inside the token
    to_encode = {
        "sub": str(user_id), 
        "role": role, 
        "exp": expire
    }
    
    # Encode the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Validates the token and retrieves the user from the database"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    # Look for the user in the database
    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if user is None:
        raise credentials_exception
        
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Dependency: Verifies if the current user has the 'Admin' role"""
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Insufficient permissions. Access restricted to Administrators only."
        )
    return current_user