import os
import time
import hashlib
import hmac
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app import models
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.questions import router as questions_router
from app.api.responses import router as responses_router
from app.api.tours import router as tours_router
from app.api.usos import router as usos_router
from app.core.auth_service import authenticate_or_create_user
from app.core.security import create_access_token, get_current_user
from app.database import engine, get_db
from app.models import SurveyToken, SurveyTour

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash password safely. Falls back to SHA256 if bcrypt backend is unavailable."""
    try:
        return pwd_context.hash(plain_password)
    except Exception:
        digest = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return f"sha256${digest}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("sha256$"):
        digest = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(stored_hash, f"sha256${digest}")

    try:
        return pwd_context.verify(plain_password, stored_hash)
    except Exception:
        return False


# --- 1. DATABASE INITIALIZATION ---
def create_tables_with_retry():
    max_retries = 5
    retry_interval = 5
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Database connection attempt #{attempt}...")
            models.Base.metadata.create_all(bind=engine)
            print("Database connected, tables verified!")
            return
        except OperationalError as exc:
            print(f"Database not ready yet... ({exc})")
            if attempt == max_retries:
                raise exc
            time.sleep(retry_interval)


create_tables_with_retry()


# --- 2. APP INITIALIZATION ---
app = FastAPI(
    title="UniAnkieta API",
    description="Backend for the UniAnkieta survey system",
    version="1.0.0",
)


# --- 3. CORS CONFIGURATION ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
FRONTEND_URLS = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:5173,http://127.0.0.1:5173",
)

allowed_origins = [origin.strip() for origin in FRONTEND_URLS.split(",") if origin.strip()]
if FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 4. ROUTER REGISTRATION ---
app.include_router(auth_router, prefix="/api")
app.include_router(responses_router)
app.include_router(admin_router, prefix="/api")
app.include_router(usos_router, prefix="/api")

# Admin path: /api/admin/tours/
app.include_router(tours_router, prefix="/api/admin/tours", tags=["Tour Management - Admin"])
# Student path: /api/tours/
app.include_router(tours_router, prefix="/api/tours", tags=["Tour Management - Student"])

app.include_router(questions_router, prefix="/api/admin/questions", tags=["Question Templates"])


# --- 5. EMAIL/PASSWORD LOGIN SCHEMA ---
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "Student"


# --- 6. EMAIL/PASSWORD LOGIN ENDPOINT ---
@app.post("/api/auth/login-password", tags=["Auth"])
def login_with_password(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email.strip().lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo.")

    # Allow SSO/import users or verify password hash
    if user.hashed_password not in ("not_set", "sso_protected"):
        if not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Nieprawidlowy email lub haslo.")

    token = create_access_token(user_id=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {"id": user.id, "email": user.email, "role": user.role},
    }


# --- 7. REGISTER ENDPOINT ---
@app.post("/api/auth/register", tags=["Auth"])
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = (data.email or "").strip().lower()
    password = data.password or ""

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Podaj poprawny adres email.")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Haslo musi miec co najmniej 8 znakow.")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Uzytkownik z tym emailem juz istnieje.")

    allowed_roles = ["Student", "Teacher"]
    role = data.role if data.role in allowed_roles else "Student"

    hashed = hash_password(password)
    new_user = models.User(
        email=email,
        hashed_password=hashed,
        role=role,
        sso_id=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(user_id=new_user.id, role=new_user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {"id": new_user.id, "email": new_user.email, "role": new_user.role},
    }


# --- 8. CURRENT USER INFO ---
@app.get("/api/auth/me", tags=["Auth"])
def get_me(current_user: models.User = Depends(get_current_user)):
    display_name = current_user.email.split("@")[0] if current_user.email else f"user_{current_user.id}"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "display_name": display_name,
    }


# --- 9. STUDENT: MY SURVEYS ENDPOINT ---
@app.get("/api/tours/my-surveys", tags=["Student"])
def get_my_surveys(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tokens = db.query(SurveyToken).filter(SurveyToken.user_id == current_user.id).all()

    result = []
    now = datetime.now(timezone.utc)

    for token_data in tokens:
        tour = db.query(SurveyTour).filter(SurveyTour.id == token_data.tour_id).first()
        if not tour:
            continue

        start = tour.start_date.replace(tzinfo=timezone.utc) if tour.start_date.tzinfo is None else tour.start_date
        end = tour.end_date.replace(tzinfo=timezone.utc) if tour.end_date.tzinfo is None else tour.end_date

        can_fill = tour.is_active and (not token_data.is_used) and start <= now <= end

        if token_data.is_used:
            status_text = "Wypelniona"
        elif not tour.is_active:
            status_text = "Nieaktywna"
        elif now < start:
            status_text = "Jeszcze nieaktywna"
        elif now > end:
            status_text = "Zakonczona"
        else:
            status_text = "Do wypelnienia"

        result.append(
            {
                "tour_id": tour.id,
                "tour_name": tour.name,
                "start_date": tour.start_date.isoformat(),
                "end_date": tour.end_date.isoformat(),
                "is_active": tour.is_active,
                "is_used": token_data.is_used,
                "can_fill": can_fill,
                "status": status_text,
            }
        )

    return result


# --- 10. SYSTEM ENDPOINTS ---
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/healthcheck", tags=["System"])
def health_check():
    return {"status": "OK", "message": "UniAnkieta API is online."}


# --- 11. DEV AUTH ENTRIES ---
@app.get("/api/auth/dev-login-admin", tags=["Development"])
def dev_login_admin(db: Session = Depends(get_db)):
    user = authenticate_or_create_user(
        db=db,
        sso_email="admin@admin.pl",
        sso_id="dev_admin_fixed_id",
    )
    if user.role != "Admin":
        user.role = "Admin"
        db.commit()
        db.refresh(user)

    token = create_access_token(user_id=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {"id": user.id, "email": user.email, "role": user.role},
    }


@app.get("/api/auth/dev-login-student", tags=["Development"])
def dev_login_student(db: Session = Depends(get_db)):
    user = authenticate_or_create_user(
        db=db,
        sso_email="student@student.pl",
        sso_id="dev_student_fixed_id",
    )
    token = create_access_token(user_id=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {"id": user.id, "email": user.email, "role": user.role},
    }


# --- 12. SSO MOCK ---
@app.get("/api/auth/sso-login", tags=["Auth"])
def login_sso():
    return RedirectResponse(url="/api/auth/sso-callback?code=test_user_123")


@app.get("/api/auth/sso-callback", tags=["Auth"])
def sso_callback(code: str, db: Session = Depends(get_db)):
    try:
        mock_profile = {
            "sso_id": f"usos_{code}",
            "email": f"user_{code}@student.pl",
        }
        user = authenticate_or_create_user(
            db=db,
            sso_email=mock_profile["email"],
            sso_id=mock_profile["sso_id"],
        )
        token = create_access_token(user_id=user.id, role=user.role)
        frontend_url = f"{FRONTEND_URL}/?token={token}"
        return RedirectResponse(url=frontend_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"SSO Error: {str(exc)}")


# --- 13. OPENAPI CUSTOMIZATION ---
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


