from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
# Internal module imports
from app.database import get_db 
from app.models import SurveyToken, Answer 

router = APIRouter(prefix="/api/responses", tags=["Responses"])

@router.post("/submit")
def submit_survey(submission: dict, db: Session = Depends(get_db)):
    # 1. Retrieve the token from the request
    token_val = submission.get("token")
    db_token = db.query(SurveyToken).filter(SurveyToken.token == token_val).first()
    
    # 2. Validation (UC-04: Completion Status)
    if not db_token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    if db_token.is_used:
        raise HTTPException(status_code=400, detail="You have already submitted this survey!")

    # 3. Save responses (UC-05: Anonymization)
    # We save ONLY the text/value and question ID. 
    # CRITICAL: We DO NOT save the user_id or link the answer to the token!
    for ans in submission.get("answers", []):
        new_answer = Answer(
            question_id=ans["question_id"],
            value=ans["value"]
        )
        db.add(new_answer)

    # 4. "Burn" the ticket (mark token as used)
    db_token.is_used = True
    db.commit()
    
    return {"message": "Survey submitted successfully and anonymously!"}