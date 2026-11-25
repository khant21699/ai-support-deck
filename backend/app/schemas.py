import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Category = Literal["billing", "technical", "account", "shipping", "feature_request", "other"]
Priority = Literal["low", "normal", "high", "urgent"]
Sentiment = Literal["positive", "neutral", "negative"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORM):
    id: uuid.UUID
    email: str
    role: str


# ---------- tickets ----------
class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=10, max_length=5000)
    customer_email: EmailStr


class TicketUpdate(BaseModel):
    status: Literal["new", "open", "resolved"] | None = None
    assignee_id: uuid.UUID | None = None
    category: Category | None = None
    priority: Priority | None = None


class MessageOut(ORM):
    id: uuid.UUID
    author_type: str
    body: str
    created_at: datetime


class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class Citation(BaseModel):
    marker: str
    article_id: int
    article_title: str
    snippet: str


class DraftOut(ORM):
    id: uuid.UUID
    body: str
    citations: list[Citation] = []
    grounded: bool
    status: str
    final_body: str | None = None
    model: str | None = None
    latency_ms: int | None = None
    created_at: datetime


class TicketListItem(ORM):
    id: uuid.UUID
    subject: str
    customer_email: str
    status: str
    ai_status: str
    category: str | None
    priority: str | None
    sentiment: str | None
    created_at: datetime


class TicketOut(TicketListItem):
    body: str
    assignee_id: uuid.UUID | None
    first_response_at: datetime | None
    resolved_at: datetime | None
    messages: list[MessageOut]
    drafts: list[DraftOut]


class TicketPage(BaseModel):
    items: list[TicketListItem]
    total: int


class DraftEdit(BaseModel):
    final_body: str = Field(min_length=1, max_length=5000)


# ---------- knowledge base ----------
class KbArticleIn(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=10)


class KbArticleOut(ORM):
    id: int
    title: str
    body: str
    updated_at: datetime


# ---------- LLM structured outputs ----------
class TriageResult(BaseModel):
    category: Category
    priority: Priority
    sentiment: Sentiment


class DraftResult(BaseModel):
    answer: str  # the reply text, with [E1]-style citation markers
