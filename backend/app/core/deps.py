from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")

def get_current_user(authorization: str = Header(...)):
    """Validates the JWT token provided in the Authorization header"""
    try:
        # Expected format: "Bearer <token>"
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise IndexError
            
        token = parts[1]
        
        # Decode the token using the secret key and algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Returns the payload containing user_id and role
        return payload  
    except (JWTError, IndexError):
        raise HTTPException(
            status_code=401, 
            detail="Could not validate credentials or invalid token format"
        )

def check_admin_role(user=Depends(get_current_user)):
    """Dependency to verify if the current user has administrative privileges"""
    if user.get("role") != "Admin":
        raise HTTPException(
            status_code=403, 
            detail="Access denied: Insufficient permissions"
        )
    return user