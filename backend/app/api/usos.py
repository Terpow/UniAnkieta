import csv
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Group

router = APIRouter(prefix="/usos", tags=["USOS Import"])

@router.post("/import-students")
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Only .csv files are supported.")

    content = await file.read()
    # Using utf-8-sig to handle potential BOM from Excel-generated CSVs
    decoded_content = content.decode('utf-8-sig') 
    reader = csv.DictReader(io.StringIO(decoded_content))
    
    imported_users_count = 0
    for row in reader:
        group_name = row['group_name'].strip()
        
        # Check if the group exists, create if it doesn't
        group = db.query(Group).filter(Group.name == group_name).first()
        if not group:
            group = Group(name=group_name)
            db.add(group)
            db.flush() # Get group ID for the user mapping

        # Check for existing user to avoid duplicates
        user_exists = db.query(User).filter(User.email == row['email'].strip()).first()
        if not user_exists:
            new_user = User(
                email=row['email'].strip(),
                sso_id=row['sso_id'].strip(),
                role="Student",
                group_id=group.id,
                hashed_password="not_set" # SSO managed
            )
            db.add(new_user)
            imported_users_count += 1

    # Finalize the transaction
    db.commit() 
    
    return {
        "status": "success", 
        "message": "Import completed", 
        "new_students_added": imported_users_count
    }