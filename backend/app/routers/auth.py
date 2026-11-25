import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import COOKIE_NAME, get_current_user
from app.core.security import create_session_token, verify_password
from app.models import User
from app.schemas import LoginIn, UserOut

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        log.warning("Failed login for %s", data.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    log.info("Login: %s (%s)", user.email, user.role)
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(str(user.id), user.role),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        max_age=settings.session_hours * 3600,
        path="/",
    )
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", domain=settings.cookie_domain)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
