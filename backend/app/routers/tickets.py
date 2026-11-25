import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.core.deps import get_current_user
from app.jobs import process_ticket
from app.models import Message, Ticket, User, utcnow
from app.schemas import MessageIn, MessageOut, TicketCreate, TicketOut, TicketPage, TicketUpdate

log = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])

# Naive in-memory rate limit for the public endpoint: 5 tickets / 10 min / IP.
# Fine for a single instance; use Redis if you scale out.
_hits: dict[str, deque] = defaultdict(deque)
WINDOW_SECONDS, MAX_HITS = 600, 5


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    q = _hits[ip]
    while q and now - q[0] > WINDOW_SECONDS:
        q.popleft()
    if len(q) >= MAX_HITS:
        log.warning("Rate limit hit by %s", ip)
        raise HTTPException(429, "Too many tickets submitted. Please try again later.")
    q.append(now)


@router.post("", status_code=201, dependencies=[Depends(_rate_limit)])
def create_ticket(data: TicketCreate, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Public endpoint used by the customer form."""
    ticket = Ticket(subject=data.subject.strip(), body=data.body.strip(), customer_email=data.customer_email.lower())
    ticket.messages.append(Message(author_type="customer", body=ticket.body))
    db.add(ticket)
    db.commit()
    log.info("Ticket %s created by %s", ticket.id, ticket.customer_email)
    background.add_task(process_ticket, ticket.id)
    return {"id": ticket.id, "status": ticket.status}


@router.get("", response_model=TicketPage)
def list_tickets(
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    q: str | None = None,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Ticket)
    if status:
        stmt = stmt.where(Ticket.status == status)
    if priority:
        stmt = stmt.where(Ticket.priority == priority)
    if category:
        stmt = stmt.where(Ticket.category == category)
    if q:
        stmt = stmt.where(Ticket.subject.ilike(f"%{q}%"))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(Ticket.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": items, "total": total}


def _get_ticket(db: Session, ticket_id: uuid.UUID) -> Ticket:
    ticket = db.scalar(
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .options(selectinload(Ticket.messages), selectinload(Ticket.drafts))
    )
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return ticket


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _get_ticket(db, ticket_id)


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: uuid.UUID,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ticket = _get_ticket(db, ticket_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    if data.status == "resolved" and not ticket.resolved_at:
        ticket.resolved_at = utcnow()
    db.commit()
    return ticket


@router.post("/{ticket_id}/messages", response_model=MessageOut, status_code=201)
def add_agent_message(
    ticket_id: uuid.UUID,
    data: MessageIn,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ticket = _get_ticket(db, ticket_id)
    message = Message(ticket_id=ticket.id, author_type="agent", body=data.body)
    db.add(message)
    if not ticket.first_response_at:
        ticket.first_response_at = utcnow()
    db.commit()
    return message


@router.post("/{ticket_id}/draft/regenerate", status_code=202)
def regenerate_draft(
    ticket_id: uuid.UUID,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ticket = _get_ticket(db, ticket_id)
    ticket.ai_status = "pending"
    db.commit()
    background.add_task(process_ticket, ticket.id)
    return {"status": "queued"}
