import io
import csv
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Answer, Question, QuestionType, SurveyToken
# ← Sprint 5: używamy get_current_admin_or_teacher zamiast get_current_admin_user
from app.core.security import get_current_admin_or_teacher

router = APIRouter(prefix="/analytics", tags=["Analytics – Sprint 5"])



# 1. CLOSED QUESTIONS: percentage distribution per choice

@router.get("/closed/{question_id}")
def closed_question_stats(
    question_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    question = db.query(Question).filter(
        Question.id == question_id,
        Question.question_type == QuestionType.CLOSED,
    ).first()
    if not question:
        raise HTTPException(404, "Closed question not found")

    answers = db.query(Answer).filter(Answer.question_id == question_id).all()
    total = len(answers)
    counter = Counter(a.value for a in answers)
    distribution = [
        {
            "choice": choice.text,
            "count": counter.get(choice.text, 0),
            "percent": round(counter.get(choice.text, 0) / total * 100, 1) if total else 0.0,
        }
        for choice in question.choices
    ]
    return {
        "question_id": question_id,
        "question_text": question.text,
        "total_answers": total,
        "distribution": distribution,
    }


# 2. ALL CLOSED QUESTIONS: summary for dashboard

@router.get("/closed")
def all_closed_stats(
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    """
    Agreguje dane po question_id z tabeli Answer — niezależnie od tego,
    czy szablon pytania jest aktywny, zmieniony lub usunięty.
    Pytania usunięte (cascade) nie pojawią się, ale ich odpowiedzi
    pozostają przez relację ON DELETE CASCADE na poziomie Answer.
    Aktywne pytania zamknięte są zawsze zwracane.
    """
    questions = db.query(Question).filter(
        Question.question_type == QuestionType.CLOSED,
        Question.is_active == True,
    ).all()

    result = []
    for q in questions:
        answers = db.query(Answer).filter(Answer.question_id == q.id).all()
        total = len(answers)
        counter = Counter(a.value for a in answers)
        distribution = [
            {
                "choice": c.text,
                "count": counter.get(c.text, 0),
                "percent": round(counter.get(c.text, 0) / total * 100, 1) if total else 0.0,
            }
            for c in q.choices
        ]
        result.append({
            "question_id": q.id,
            "question_text": q.text,
            "total_answers": total,
            "distribution": distribution,
        })
    return result


# 3. OPEN QUESTIONS: paginated anonymous text answers

@router.get("/open/{question_id}")
def open_question_answers(
    question_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    """
    Zwraca stronicowaną listę anonimowych odpowiedzi tekstowych.
    RODO: zwracane jest tylko .value — żaden identyfikator użytkownika.
    """
    question = db.query(Question).filter(
        Question.id == question_id,
        Question.question_type == QuestionType.OPEN,
    ).first()
    if not question:
        raise HTTPException(404, "Open question not found")

    total = db.query(Answer).filter(Answer.question_id == question_id).count()
    answers = (
        db.query(Answer)
        .filter(Answer.question_id == question_id)
        .order_by(Answer.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "question_id": question_id,
        "question_text": question.text,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
        "answers": [a.value for a in answers],
    }


# 4. WORD CLOUD: top-N words from open answers

_STOPWORDS_PL = {
    "i", "w", "z", "na", "do", "się", "to", "że", "jest", "są",
    "nie", "jak", "tak", "co", "ale", "po", "za", "o", "a", "też",
    "już", "ten", "ta", "tego", "tej", "te", "być", "przez", "bardzo",
    "go", "jej", "jego", "tu", "czy", "tylko", "np", "jeszcze",
}

@router.get("/wordcloud/{question_id}")
def word_cloud_data(
    question_id: int,
    top_n: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    question = db.query(Question).filter(
        Question.id == question_id,
        Question.question_type == QuestionType.OPEN,
    ).first()
    if not question:
        raise HTTPException(404, "Open question not found")

    answers = db.query(Answer).filter(Answer.question_id == question_id).all()
    words: list[str] = []
    for a in answers:
        for w in a.value.lower().split():
            clean = "".join(ch for ch in w if ch.isalpha())
            if clean and clean not in _STOPWORDS_PL and len(clean) > 2:
                words.append(clean)

    counter = Counter(words)
    return {
        "question_id": question_id,
        "question_text": question.text,
        "words": [{"word": w, "count": c} for w, c in counter.most_common(top_n)],
    }


# 5. SUMMARY METRICS

@router.get("/summary")
def summary_metrics(
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    total_tokens = db.query(SurveyToken).count()
    used_tokens = db.query(SurveyToken).filter(SurveyToken.is_used == True).count()
    total_answers = db.query(Answer).count()
    fill_rate = round(used_tokens / total_tokens * 100, 1) if total_tokens else 0.0
    return {
        "total_surveys_issued": total_tokens,
        "surveys_submitted": used_tokens,
        "total_answers_recorded": total_answers,
        "fill_rate_percent": fill_rate,
    }


# 6. CSV EXPORT (RODO-compliant)

@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    """
    CSV export: rows = anonimowe zgłoszenia, columns = pytania.
    RODO: BEZ user_id, email, IP ani żadnego identyfikatora studenta.
    """
    questions = db.query(Question).filter(Question.is_active == True).all()
    if not questions:
        raise HTTPException(404, "No active questions found")

    answers_by_q: dict[int, list[str]] = {}
    for q in questions:
        rows = (
            db.query(Answer)
            .filter(Answer.question_id == q.id)
            .order_by(Answer.id)
            .all()
        )
        answers_by_q[q.id] = [r.value for r in rows]

    max_rows = max((len(v) for v in answers_by_q.values()), default=0)

    output = io.StringIO()
    writer = csv.writer(output)
    header = ["Submission #"] + [q.text for q in questions]
    writer.writerow(header)

    for i in range(max_rows):
        row = [i + 1]
        for q in questions:
            values = answers_by_q.get(q.id, [])
            row.append(values[i] if i < len(values) else "")
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="wyniki_ankiet.csv"'},
    )



# 7. PDF EXPORT (questions + open comments)

@router.get("/export/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    _user=Depends(get_current_admin_or_teacher),
):
    """
    PDF report: pytania + zagregowane statystyki dla zamkniętych,
    lista komentarzy dla otwartych.
    RODO: bez identyfikatorów studentów.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer,
            Table, TableStyle, HRFlowable,
        )
        from reportlab.lib.enums import TA_CENTER
    except ImportError:
        raise HTTPException(
            500,
            "ReportLab not installed. Run: pip install reportlab",
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"],
                                 fontSize=18, spaceAfter=12)
    h2_style = ParagraphStyle("h2", parent=styles["Heading2"],
                               fontSize=13, spaceBefore=14, spaceAfter=6)
    body_style = styles["BodyText"]

    story = []
    story.append(Paragraph("Raport UniAnkieta", title_style))
    story.append(Paragraph("Dane RODO-compliant – bez identyfikatorów studentów.", body_style))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Spacer(1, 0.4*cm))

    questions = db.query(Question).filter(Question.is_active == True).all()
    if not questions:
        story.append(Paragraph("Brak aktywnych pytań.", body_style))
    else:
        for q in questions:
            story.append(Paragraph(q.text, h2_style))
            answers = db.query(Answer).filter(Answer.question_id == q.id).all()
            total = len(answers)
            story.append(Paragraph(f"Liczba odpowiedzi: {total}", body_style))

            if q.question_type == QuestionType.CLOSED and q.choices:
                counter = Counter(a.value for a in answers)
                table_data = [["Opcja", "Liczba", "%"]]
                for choice in q.choices:
                    cnt = counter.get(choice.text, 0)
                    pct = f"{round(cnt/total*100,1)}%" if total else "0%"
                    table_data.append([choice.text, str(cnt), pct])
                tbl = Table(table_data, colWidths=[10*cm, 3*cm, 3*cm])
                tbl.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
                    ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                     [colors.white, colors.HexColor("#F5F3FF")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]))
                story.append(Spacer(1, 0.2*cm))
                story.append(tbl)
            elif q.question_type == QuestionType.OPEN:
                for idx, a in enumerate(answers[:50], 1):
                    story.append(Paragraph(f"{idx}. {a.value}", body_style))
                if total > 50:
                    story.append(Paragraph(f"… i {total-50} więcej odpowiedzi.", body_style))

            story.append(Spacer(1, 0.3*cm))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="raport_ankiet.pdf"'},
    )