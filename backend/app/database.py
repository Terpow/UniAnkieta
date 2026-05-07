import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load .env only for local development (ignored if variables are set in Docker)
load_dotenv()

# Priority: 
# 1. Environment variable (from docker-compose)
# 2. .env file
# 3. Default fallback value (local development only)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    print("⚠️ WARNING: DATABASE_URL not found, using local default.")
    # Use the service name 'db' instead of 'localhost' for default Docker networking
    SQLALCHEMY_DATABASE_URL = "postgresql://user:password@db:5432/uniankieta"

# Initialize the engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to provide a database session per request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()