
import io
import csv
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Answer, Question, QuestionType, SurveyToken
from app.core.security import get_current_admin_user

router = APIRouter(prefix="/analytics", tags=["Analytics – Sprint 5"])


# ────────────────────────────────────────────────────────────
# 1. CLOSED QUESTIONS: percentage distribution per choice
# ────────────────────────────────────────────────────────────
@router.get("/closed/{question_id}")
def closed_question_stats(
    question_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    Returns percentage distribution across answer choices
    for a single closed-ended question.
    """
    question = db.query(Question).filter(
        Question.id == question_id,
        Question.question_type == QuestionType.CLOSED,
    ).first()
    if not question:
        raise HTTPException(404, "Closed question not found")

    answers = db.query(Answer).filter(Answer.question_id == question_id).all()
    total = len(answers)

    # Count occurrences for each declared choice
    counter = Counter(a.value for a in answers)
    distribution = []
    for choice in question.choices:
        count = counter.get(choice.text, 0)
        distribution.append({
            "choice": choice.text,
            "count": count,
            "percent": round(count / total * 100, 1) if total else 0.0,
        })

    return {
        "question_id": question_id,
        "question_text": question.text,
        "total_answers": total,
        "distribution": distribution,
    }


# ────────────────────────────────────────────────────────────
# 2. ALL CLOSED QUESTIONS: summary for dashboard
# ────────────────────────────────────────────────────────────
@router.get("/closed")
def all_closed_stats(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """Returns stats for ALL active closed questions (used by teacher dashboard)."""
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


# ────────────────────────────────────────────────────────────
# 3. OPEN QUESTIONS: paginated anonymous text answers
# ────────────────────────────────────────────────────────────
@router.get("/open/{question_id}")
def open_question_answers(
    question_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    Returns paginated list of anonymous text answers for an open question.
    GDPR: only .value is returned — no user reference whatsoever.
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
        "pages": max(1, -(-total // page_size)),  # ceiling division
        "answers": [a.value for a in answers],   # GDPR: value only
    }


# ────────────────────────────────────────────────────────────
# 4. WORD CLOUD: top-N words from open answers
# ────────────────────────────────────────────────────────────
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
    _admin=Depends(get_current_admin_user),
):
    """Top-N word frequencies for open answers (Word Cloud data)."""
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
        "words": [
            {"word": w, "count": c}
            for w, c in counter.most_common(top_n)
        ],
    }


# ────────────────────────────────────────────────────────────
# 5. SUMMARY METRICS (for Summary Cards in teacher panel)
# ────────────────────────────────────────────────────────────
@router.get("/summary")
def summary_metrics(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    Returns high-level survey metrics for Summary Cards.
    GDPR-safe: no personal identifiers.
    """
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


# ────────────────────────────────────────────────────────────
# 6. CSV EXPORT  (GDPR-compliant, no student IDs)
# ────────────────────────────────────────────────────────────
@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    CSV export: rows = anonymous submissions, columns = questions.
    GDPR: NO user_id, email, IP or any other student identifier.
    Each row is identified only by an auto-incremented submission number.
    """
    questions = db.query(Question).filter(Question.is_active == True).all()
    if not questions:
        raise HTTPException(404, "No active questions found")

    # Group answers by question_id. Since answers are fully anonymous
    # (no user_id, no token reference after submission), we order by .id
    # to reconstruct "submission slots" as best we can.
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

    # Header row  – GDPR: no personal column
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


# ────────────────────────────────────────────────────────────
# 7. PDF EXPORT  (questions + open comments)
# ────────────────────────────────────────────────────────────
@router.get("/export/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin_user),
):
    """
    PDF report: questions + aggregated stats for closed, comment list for open.
    GDPR: no student identifiers.
    Requires: reportlab (pip install reportlab)
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
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title2", parent=styles["Heading1"],
        fontSize=18, spaceAfter=6, textColor=colors.HexColor("#1e3a8a"),
        alignment=TA_CENTER,
    )
    h2_style = ParagraphStyle(
        "H2", parent=styles["Heading2"],
        fontSize=13, spaceBefore=14, spaceAfter=4,
        textColor=colors.HexColor("#1d4ed8"),
    )
    normal = styles["Normal"]
    small = ParagraphStyle("Small", parent=normal, fontSize=9, textColor=colors.HexColor("#64748b"))

    story = []
    story.append(Paragraph("UniAnkieta – Raport Wyników", title_style))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#bfdbfe")))
    story.append(Spacer(1, 0.4 * cm))

    questions = db.query(Question).filter(Question.is_active == True).all()

    for q in questions:
        story.append(Paragraph(f"Pytanie: {q.text}", h2_style))
        answers = db.query(Answer).filter(Answer.question_id == q.id).all()
        total = len(answers)
        story.append(Paragraph(f"Łączna liczba odpowiedzi: <b>{total}</b>", normal))
        story.append(Spacer(1, 0.2 * cm))

        if q.question_type == QuestionType.CLOSED and q.choices:
            counter = Counter(a.value for a in answers)
            table_data = [["Opcja", "Liczba", "Procent"]]
            for c in q.choices:
                cnt = counter.get(c.text, 0)
                pct = f"{cnt / total * 100:.1f}%" if total else "0%"
                table_data.append([c.text, str(cnt), pct])

            t = Table(table_data, colWidths=[10 * cm, 3 * cm, 3 * cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
                ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE",   (0, 0), (-1, 0), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                 [colors.HexColor("#f8fafc"), colors.white]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("TOPPADDING",  (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(t)

        elif q.question_type == QuestionType.OPEN:
            story.append(Paragraph("Komentarze (anonimowe):", normal))
            story.append(Spacer(1, 0.15 * cm))
            for i, a in enumerate(answers[:50], 1):      # cap at 50
                story.append(Paragraph(f"{i}. {a.value}", small))
            if total > 50:
                story.append(Paragraph(f"… i {total - 50} kolejnych odpowiedzi.", small))

        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="raport_ankiet.pdf"'},
    )
