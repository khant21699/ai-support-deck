import difflib
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import AiDraft, Message, User, utcnow
from app.schemas import DraftEdit, DraftOut

log = logging.getLogger(__name__)
router = APIRouter(prefix="/drafts", tags=["drafts"])


def _pending_draft(db: Session, draft_id: uuid.UUID) -> AiDraft:
    draft = db.get(AiDraft, draft_id)
    if not draft:
        raise HTTPException(404, "Draft not found")
    if draft.status != "pending":
        raise HTTPException(409, f"Draft already {draft.status}")
    return draft


def _send(db: Session, draft: AiDraft, body: str) -> None:
    """Human approved: the reply is recorded as an agent message and the ticket is resolved."""
    ticket = draft.ticket
    db.add(Message(ticket_id=ticket.id, author_type="agent", body=body))
    now = utcnow()
    ticket.first_response_at = ticket.first_response_at or now
    ticket.status = "resolved"
    ticket.resolved_at = now
    draft.reviewed_at = now


@router.post("/{draft_id}/approve", response_model=DraftOut)
def approve(draft_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    draft = _pending_draft(db, draft_id)
    draft.status, draft.final_body, draft.edit_ratio = "approved", draft.body, 0.0
    _send(db, draft, draft.body)
    db.commit()
    log.info("Draft %s approved by %s (ticket %s)", draft.id, user.email, draft.ticket_id)
    return draft


@router.post("/{draft_id}/edit", response_model=DraftOut)
def edit(
    draft_id: uuid.UUID,
    data: DraftEdit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    draft = _pending_draft(db, draft_id)
    similarity = difflib.SequenceMatcher(None, draft.body, data.final_body).ratio()
    draft.status, draft.final_body, draft.edit_ratio = "edited", data.final_body, round(1 - similarity, 3)
    _send(db, draft, data.final_body)
    db.commit()
    log.info("Draft %s edited and sent by %s (changed %.0f%%)", draft.id, user.email, draft.edit_ratio * 100)
    return draft


@router.post("/{draft_id}/reject", response_model=DraftOut)
def reject(draft_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    draft = _pending_draft(db, draft_id)
    draft.status, draft.reviewed_at = "rejected", utcnow()
    db.commit()
    log.info("Draft %s rejected by %s (ticket %s)", draft.id, user.email, draft.ticket_id)
    return draft
