from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import AiDraft, Ticket, User, utcnow

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = utcnow() - timedelta(days=days)
    recent = Ticket.created_at >= since  # filter used by most queries below

    total = db.scalar(select(func.count()).select_from(Ticket).where(recent))
    not_resolved = db.scalar(select(func.count()).select_from(Ticket).where(recent, Ticket.status != "resolved"))

    return {
        "days": days,
        "tickets": {"total": total, "open": not_resolved},
        "median_first_response_minutes": median(
            db, func.extract("epoch", Ticket.first_response_at - Ticket.created_at) / 60, recent
        ),
        "median_resolution_hours": median(
            db, func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600, recent
        ),
        "ai": ai_stats(db, since),
        "by_category": count_by(db, Ticket.category, recent),
        "by_priority": count_by(db, Ticket.priority, recent),
        "by_sentiment": count_by(db, Ticket.sentiment, recent),
        "open_by_agent": open_by_agent(db),
    }


@router.get("/timeseries")
def timeseries(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tickets created and resolved per day, for the volume chart."""
    since = utcnow() - timedelta(days=days)
    day = func.date_trunc("day", Ticket.created_at)
    resolved = func.sum(case((Ticket.status == "resolved", 1), else_=0))

    rows = db.execute(
        select(day, func.count(), resolved).where(Ticket.created_at >= since).group_by(day).order_by(day)
    ).all()
    return [{"day": row[0].date().isoformat(), "created": row[1], "resolved": int(row[2] or 0)} for row in rows]


def median(db: Session, value, recent):
    """Median of `value` over recent tickets, rounded. None when there is no data."""
    result = db.scalar(select(func.percentile_cont(0.5).within_group(value)).where(recent, value.is_not(None)))
    return round(float(result), 1) if result is not None else None


def count_by(db: Session, column, recent):
    """{"billing": 12, "technical": 7, ...} for a column such as category or priority."""
    rows = db.execute(select(column, func.count()).where(recent, column.is_not(None)).group_by(column)).all()
    return {value: count for value, count in rows}


def ai_stats(db: Session, since):
    """How often agents accepted the AI's drafts, and how fast the AI was."""
    recent = AiDraft.created_at >= since
    outcomes = dict(db.execute(select(AiDraft.status, func.count()).where(recent).group_by(AiDraft.status)).all())

    reviewed = outcomes.get("approved", 0) + outcomes.get("edited", 0) + outcomes.get("rejected", 0)
    accepted = outcomes.get("approved", 0) + outcomes.get("edited", 0)
    average_edit = db.scalar(select(func.avg(AiDraft.edit_ratio)).where(recent, AiDraft.status == "edited"))
    average_latency = db.scalar(select(func.avg(AiDraft.latency_ms)).where(recent))
    no_answer = db.scalar(select(func.count()).select_from(AiDraft).where(recent, AiDraft.grounded.is_(False)))

    return {
        "drafts_reviewed": reviewed,
        "outcomes": outcomes,
        "acceptance_rate": round(accepted / reviewed, 3) if reviewed else None,
        "approved_as_is_rate": round(outcomes.get("approved", 0) / reviewed, 3) if reviewed else None,
        "avg_edit_ratio": round(float(average_edit), 3) if average_edit is not None else None,
        "avg_latency_ms": int(average_latency) if average_latency is not None else None,
        "ungrounded_drafts": no_answer,
    }


def open_by_agent(db: Session):
    rows = db.execute(
        select(User.email, func.count(Ticket.id))
        .join(Ticket, Ticket.assignee_id == User.id)
        .where(Ticket.status != "resolved")
        .group_by(User.email)
    ).all()
    return [{"agent": email, "open": count} for email, count in rows]
