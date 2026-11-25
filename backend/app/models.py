import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.core.config import settings

TZ = DateTime(timezone=True)


def utcnow():
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    password_hash: str
    role: str = "agent"  # admin | agent
    created_at: datetime = Field(default_factory=utcnow, sa_type=TZ)


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    subject: str = Field(max_length=300)
    body: str
    customer_email: str = Field(max_length=255)
    status: str = Field(default="new", index=True)  # new | open | resolved
    ai_status: str = "pending"  # pending | done | failed
    category: str | None = Field(default=None, index=True)
    priority: str | None = Field(default=None, index=True)
    sentiment: str | None = None
    assignee_id: uuid.UUID | None = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=utcnow, sa_type=TZ, index=True)
    first_response_at: datetime | None = Field(default=None, sa_type=TZ)
    resolved_at: datetime | None = Field(default=None, sa_type=TZ)

    messages: list["Message"] = Relationship(
        back_populates="ticket",
        sa_relationship_kwargs={"order_by": "Message.created_at", "cascade": "all, delete-orphan"},
    )
    drafts: list["AiDraft"] = Relationship(
        back_populates="ticket",
        sa_relationship_kwargs={"order_by": "AiDraft.created_at.desc()", "cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ticket_id: uuid.UUID = Field(foreign_key="tickets.id", index=True, ondelete="CASCADE")
    author_type: str  # customer | agent
    body: str
    created_at: datetime = Field(default_factory=utcnow, sa_type=TZ)

    ticket: Ticket = Relationship(back_populates="messages")


class KbArticle(SQLModel, table=True):
    __tablename__ = "kb_articles"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=300)
    body: str
    updated_at: datetime = Field(default_factory=utcnow, sa_type=TZ, sa_column_kwargs={"onupdate": utcnow})

    chunks: list["KbChunk"] = Relationship(
        back_populates="article",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class KbChunk(SQLModel, table=True):
    __tablename__ = "kb_chunks"

    id: int | None = Field(default=None, primary_key=True)
    article_id: int = Field(foreign_key="kb_articles.id", index=True, ondelete="CASCADE")
    ordinal: int
    content: str
    embedding: list[float] | None = Field(default=None, sa_column=Column(Vector(settings.embed_dim)))

    article: KbArticle = Relationship(back_populates="chunks")


class AiDraft(SQLModel, table=True):
    __tablename__ = "ai_drafts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ticket_id: uuid.UUID = Field(foreign_key="tickets.id", index=True, ondelete="CASCADE")
    body: str
    citations: list[dict] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    grounded: bool = True  # False = no relevant KB article found
    status: str = Field(default="pending", index=True)  # pending | approved | edited | rejected
    final_body: str | None = None
    edit_ratio: float | None = None  # 0 = identical, 1 = fully rewritten
    model: str | None = None
    latency_ms: int | None = None
    created_at: datetime = Field(default_factory=utcnow, sa_type=TZ)
    reviewed_at: datetime | None = Field(default=None, sa_type=TZ)

    ticket: Ticket = Relationship(back_populates="drafts")
