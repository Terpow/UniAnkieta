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
        raise HTTPException(status_code=400, detail="Бро, только .csv!")

    content = await file.read()
    decoded_content = content.decode('utf-8-sig') 
    reader = csv.DictReader(io.StringIO(decoded_content))
    
    imported_users = 0
    for row in reader:
        group_name = row['group_name'].strip()
        group = db.query(Group).filter(Group.name == group_name).first()
        if not group:
            group = Group(name=group_name)
            db.add(group)
            db.flush()

        user = db.query(User).filter(User.email == row['email'].strip()).first()
        if not user:
            new_user = User(
                email=row['email'].strip(),
                sso_id=row['sso_id'].strip(),
                role="Student",
                group_id=group.id,
                hashed_password="not_set"
            )
            db.add(new_user)
            imported_users += 1

    db.commit() # ВОТ ОН, КЛЮЧ К УСПЕХУ
    return {"message": "DONE", "new_students": imported_users} # Другой текст!