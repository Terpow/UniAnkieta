import os
import time
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel
from passlib.context import CryptContext

from app.database import engine, get_db
from app import models
from app.core.security import create_access_token, get_current_user
from app.core.auth_service import authenticate_or_create_user
from app.api.responses import router as responses_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.usos import router as usos_router
from app.api.tours import router as tours_router
from app.api.questions import router as questions_router
from app.api.analytics import router as analytics_router   # Sprint 5

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_tables_with_retry():
    for attempt in range(1, 6):
        try:
            print(f"DB connection attempt #{attempt}...")
            models.Base.metadata.create_all(bind=engine)
            print("DB connected, tables verified!")
            return
        except OperationalError as e:
            print(f"DB not ready ({e})")
            if attempt == 5:
                raise
            time.sleep(5)


create_tables_with_retry()

app = FastAPI(title="UniAnkieta API",
              description="Backend for the UniAnkieta survey system",
              version="1.5.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(responses_router)
app.include_router(admin_router, prefix="/api")
app.include_router(usos_router, prefix="/api")
app.include_router(tours_router, prefix="/api/admin/tours",
                   tags=["Tour Management – Admin"])
app.include_router(tours_router, prefix="/api/tours",
                   tags=["Tour Management – Student"])
app.include_router(questions_router, prefix="/api/admin/questions",
                   tags=["Question Templates"])
app.include_router(analytics_router, prefix="/api/admin",
                   tags=["Analytics & Export – Sprint 5"])


# ── Schemas ────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "Student"


# ── Sprint 5: Demo-mode login ───────────────────────────────────────────────
# If email found → issue token regardless of password (demo mode).
# If email NOT found → auto-create account and issue token.
@app.post("/api/auth/login-password", tags=["Auth"])
def login_with_password(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user:
        # Auto-create
        from app.core.auth_service import get_role_from_email
        role = get_role_from_email(data.email)
        hashed = pwd_context.hash(data.password) if data.password else "auto_created"
        user = models.User(email=data.email, hashed_password=hashed,
                           role=role, sso_id=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        pw = user.hashed_password or ""
        if pw.startswith("$2") and data.password:
            try:
                if not pwd_context.verify(data.password, pw):
                    raise HTTPException(401, "Nieprawidłowy email lub hasło.")
            except Exception as exc:
                raise HTTPException(401, "Błąd autoryzacji.") from exc
        # SSO / dev accounts: pass through without password check

    token = create_access_token(user_id=user.id, role=user.role)
    return {"access_token": token, "token_type": "bearer",
            "user_info": {"id": user.id, "email": user.email, "role": user.role}}


@app.post("/api/auth/register", tags=["Auth"])
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Użytkownik z tym emailem już istnieje.")
    role = data.role if data.role in ["Student", "Teacher"] else "Student"
    user = models.User(email=data.email, hashed_password=pwd_context.hash(data.password),
                       role=role, sso_id=None)
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role)
    return {"access_token": token, "token_type": "bearer",
            "user_info": {"id": user.id, "email": user.email, "role": user.role}}


# ── Student surveys ────────────────────────────────────────────────────────
from app.models import SurveyToken, SurveyTour
from datetime import datetime, timezone

@app.get("/api/tours/my-surveys", tags=["Student"])
def get_my_surveys(db: Session = Depends(get_db),
                   current_user: models.User = Depends(get_current_user)):
    tokens = db.query(SurveyToken).filter(SurveyToken.user_id == current_user.id).all()
    now = datetime.now(timezone.utc)
    result = []
    for t in tokens:
        tour = db.query(SurveyTour).filter(SurveyTour.id == t.tour_id).first()
        if not tour:
            continue
        start = tour.start_date.replace(tzinfo=timezone.utc) if tour.start_date.tzinfo is None else tour.start_date
        end = tour.end_date.replace(tzinfo=timezone.utc) if tour.end_date.tzinfo is None else tour.end_date
        can_fill = tour.is_active and not t.is_used and start <= now <= end
        status = ("Wypełniona" if t.is_used else
                  "Nieaktywna" if not tour.is_active else
                  "Jeszcze nieaktywna" if now < start else
                  "Zakończona" if now > end else "Do wypełnienia")
        result.append({"tour_id": tour.id, "tour_name": tour.name,
                       "start_date": tour.start_date.isoformat(),
                       "end_date": tour.end_date.isoformat(),
                       "is_active": tour.is_active, "is_used": t.is_used,
                       "can_fill": can_fill, "status": status})
    return result


# ── System ─────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root(): return RedirectResponse(url="/docs")

@app.get("/healthcheck", tags=["System"])
def health_check(): return {"status": "OK", "message": "UniAnkieta API is online."}


# ── Dev auth ───────────────────────────────────────────────────────────────
@app.get("/api/auth/dev-login-admin", tags=["Development"])
def dev_login_admin(db: Session = Depends(get_db)):
    user = authenticate_or_create_user(db=db, sso_email="admin@admin.pl",
                                       sso_id="dev_admin_fixed_id")
    if user.role != "Admin":
        user.role = "Admin"; db.commit(); db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role)
    return {"access_token": token, "token_type": "bearer",
            "user_info": {"id": user.id, "email": user.email, "role": user.role}}

@app.get("/api/auth/dev-login-student", tags=["Development"])
def dev_login_student(db: Session = Depends(get_db)):
    user = authenticate_or_create_user(db=db, sso_email="student@student.pl",
                                       sso_id="dev_student_fixed_id")
    token = create_access_token(user_id=user.id, role=user.role)
    return {"access_token": token, "token_type": "bearer",
            "user_info": {"id": user.id, "email": user.email, "role": user.role}}


# ── SSO mock ──────────────────────────────────────────────────────────────
@app.get("/api/auth/sso-login", tags=["Auth"])
def login_sso(): return RedirectResponse(url="/api/auth/sso-callback?code=test_user_123")

@app.get("/api/auth/sso-callback", tags=["Auth"])
def sso_callback(code: str, db: Session = Depends(get_db)):
    try:
        user = authenticate_or_create_user(db=db, sso_email=f"user_{code}@student.pl",
                                           sso_id=f"usos_{code}")
        token = create_access_token(user_id=user.id, role=user.role)
        return RedirectResponse(url=f"{FRONTEND_URL}/?token={token}")
    except Exception as exc:
        raise HTTPException(400, f"SSO Error: {exc}") from exc


# ── OpenAPI ────────────────────────────────────────────────────────────────
def custom_openapi():
    if app.openapi_schema: return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version,
                         description=app.description, routes=app.routes)
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}}
    for path in schema["paths"]:
        for method in schema["paths"][path]:
            schema["paths"][path][method]["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi
