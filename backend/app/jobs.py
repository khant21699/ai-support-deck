import logging
import uuid

from app.core.db import SessionLocal
from app.models import Ticket
from app.services.drafting import generate_draft
from app.services.triage import triage_ticket

log = logging.getLogger(__name__)


def process_ticket(ticket_id: uuid.UUID):
    """Background job that runs after a ticket is created: triage it, then write a draft reply.

    It opens its own database session because it runs after the request has finished.
    """
    db = SessionLocal()
    try:
        ticket = db.get(Ticket, ticket_id)
        log.info("Ticket %s: AI processing started", ticket_id)

        result = triage_ticket(ticket.subject, ticket.body)
        ticket.category = result.category
        ticket.priority = result.priority
        ticket.sentiment = result.sentiment
        if ticket.status == "new":
            ticket.status = "open"
        db.commit()  # save triage first, so it is kept even if drafting fails
        log.info("Ticket %s: triaged as %s / %s / %s", ticket_id, result.category, result.priority, result.sentiment)

        draft = generate_draft(db, ticket)
        ticket.ai_status = "done"
        db.commit()
        log.info("Ticket %s: draft ready (grounded=%s, %d ms)", ticket_id, draft.grounded, draft.latency_ms)
    except Exception:
        log.exception("Ticket %s: AI processing FAILED", ticket_id)
        db.rollback()
        ticket = db.get(Ticket, ticket_id)
        ticket.ai_status = "failed"
        db.commit()
    finally:
        db.close()
