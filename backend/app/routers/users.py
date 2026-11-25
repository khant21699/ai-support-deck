import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_admin
from app.core.security import hash_password
from app.models import Ticket, User
from app.schemas import UserCreate, UserListItem

log = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["team"])

# Three kinds of people use the app:
#   anonymous  can only submit a ticket
#   agent      works tickets, reviews AI drafts, reads the knowledge base
#   admin      everything an agent does, plus managing the team and the knowledge base
# Everything in this file is admin only.


@router.get("", response_model=list[UserListItem])
def list_team(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.scalars(select(User).order_by(User.role, User.created_at)).all()


@router.post("", response_model=UserListItem, status_code=201)
def add_person(data: UserCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "That email already has an account")

    user = User(email=email, password_hash=hash_password(data.password), role=data.role)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # two admins added the same email at the same moment
        db.rollback()
        raise HTTPException(409, "That email already has an account") from None

    log.info("%s %s added by %s", user.role.capitalize(), user.email, admin.email)
    return user


@router.delete("/{user_id}", status_code=204)
def remove_agent(user_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Remove an agent. Admins cannot be removed, so the app can never be left without one."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Person not found")
    if user.role != "agent":
        raise HTTPException(403, "Admins can't be removed. Only agents can.")

    # Their tickets stay; they just become unassigned.
    db.execute(update(Ticket).where(Ticket.assignee_id == user.id).values(assignee_id=None))
    db.delete(user)
    db.commit()

    # The removed agent is signed out immediately: their login cookie is checked against this table on every request.
    log.info("Agent %s removed by %s", user.email, admin.email)
