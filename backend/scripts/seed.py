"""Fill the database with demo data: two users, a small knowledge base and 200 fake tickets.

Run from the backend folder:   python -m scripts.seed
It works without an AI model. Knowledge base text is only embedded if the embedding model is reachable
(otherwise run `make reindex` later).
"""
import random
from datetime import timedelta

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.llm import LLMError, embed
from app.models import AiDraft, KbArticle, KbChunk, Message, Ticket, User, utcnow
from app.services.chunking import chunk_text

KB_ARTICLES = [
    ("Resetting your password",
     "Go to Settings > Security and choose Reset password.\n\n"
     "We email a reset link that expires after 30 minutes. If you do not receive it, check your spam folder "
     "and confirm the address on your account."),
    ("Refund policy",
     "You can request a full refund within 14 days of purchase.\n\n"
     "Refunds are returned to the original payment method and usually arrive in 5 to 10 business days. "
     "Annual plans are refunded pro rata after 14 days."),
    ("Shipping times",
     "Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days.\n\n"
     "You receive a tracking number by email once your order ships. Orders placed after 2pm ship the next business day."),
    ("Updating billing details",
     "Open Settings > Billing to change your card or invoice address.\n\n"
     "Changes apply from the next billing cycle. Past invoices cannot be edited, but you can download a copy as PDF."),
    ("Two-factor authentication",
     "Enable two-factor authentication under Settings > Security.\n\n"
     "If you lose your device, use one of your backup codes. Support can disable two-factor only after verifying your identity."),
]

# (category, subject, body)
TICKET_TEMPLATES = [
    ("billing", "I was charged twice this month", "Hi, I see two charges on my card for this month's subscription. Can you refund one of them?"),
    ("billing", "Need invoice with new address", "Please update the address on my invoices. I changed offices and need the new one on file."),
    ("account", "Cannot reset my password", "I clicked reset password but never got the email. I checked spam. Can you help me get back in?"),
    ("account", "Lost my phone, locked out of 2FA", "I replaced my phone and cannot pass two-factor. I do not have backup codes."),
    ("shipping", "Where is my order?", "I ordered a week ago and have no tracking number yet. Can you check the status?"),
    ("technical", "App crashes when I upload a file", "Every time I upload a PDF over 10MB the app freezes and then shows an error page."),
    ("technical", "API returns 500 errors", "Since this morning our integration gets 500 responses from your API. This is blocking our production system."),
    ("feature_request", "Dark mode please", "Would love a dark mode option. Working late is hard on the eyes."),
    ("other", "Partnership inquiry", "We are interested in partnering with your team. Who should we speak to?"),
]

# The priority a category usually gets.
USUAL_PRIORITY = {
    "billing": "high", "account": "high", "shipping": "normal",
    "technical": "normal", "feature_request": "low", "other": "low",
}


def create_users(db):
    if db.scalar(select(User).where(User.email == settings.admin_email)):
        return
    db.add(User(email=settings.admin_email, password_hash=hash_password(settings.admin_password), role="admin"))
    db.add(User(email="agent@example.com", password_hash=hash_password("agent12345"), role="agent"))
    db.commit()
    print(f"Created users: {settings.admin_email} (admin) and agent@example.com (agent)")


def create_knowledge_base(db):
    if db.scalar(select(KbArticle)):
        return

    try:
        embed(["test"])
        can_embed = True
    except LLMError:
        can_embed = False
        print("The embedding model is not reachable: saving articles without embeddings (run `make reindex` later)")

    for title, body in KB_ARTICLES:
        pieces = chunk_text(f"{title}\n\n{body}")
        vectors = embed(pieces) if can_embed else [None] * len(pieces)
        article = KbArticle(title=title, body=body)
        article.chunks = [
            KbChunk(ordinal=number, content=piece, embedding=vector)
            for number, (piece, vector) in enumerate(zip(pieces, vectors, strict=False))
        ]
        db.add(article)
    db.commit()
    print(f"Created {len(KB_ARTICLES)} knowledge base articles")


def fake_ticket(agents):
    """Make one ticket with a message and an AI draft, with random times and outcomes."""
    category, subject, body = random.choice(TICKET_TEMPLATES)
    created = utcnow() - timedelta(days=random.random() * 60, hours=random.random() * 8)
    is_resolved = random.random() < 0.75

    ticket = Ticket(
        subject=subject,
        body=body,
        customer_email=f"customer{random.randint(1, 80)}@example.com",
        status="resolved" if is_resolved else "open",
        ai_status="done",
        category=category,
        priority=random.choices([USUAL_PRIORITY[category], "normal", "urgent"], weights=[6, 3, 1])[0],
        sentiment=random.choice(["negative", "neutral", "neutral", "positive"]),
        assignee_id=random.choice(agents).id,
        created_at=created,
    )
    ticket.messages.append(Message(author_type="customer", body=body, created_at=created))

    draft = AiDraft(
        ticket_id=ticket.id,
        body="Thanks for reaching out. Here is how to resolve this [E1].",
        grounded=random.random() > 0.12,
        model="seed",
        latency_ms=random.randint(800, 6000),
        created_at=created + timedelta(seconds=30),
    )
    ticket.drafts.append(draft)

    if is_resolved:
        replied = created + timedelta(minutes=random.randint(3, 240))
        outcome = random.choices(["approved", "edited", "rejected"], weights=[55, 33, 12])[0]
        draft.status = outcome
        draft.reviewed_at = replied
        if outcome == "approved":
            draft.final_body = draft.body
            draft.edit_ratio = 0.0
        elif outcome == "edited":
            draft.final_body = draft.body + " (edited)"
            draft.edit_ratio = round(random.uniform(0.05, 0.6), 3)
        ticket.first_response_at = replied
        ticket.resolved_at = replied + timedelta(hours=random.randint(0, 36))
        ticket.messages.append(Message(author_type="agent", body=draft.final_body or "Handled manually.", created_at=replied))

    return ticket


def create_tickets(db):
    if db.scalar(select(Ticket).limit(1)):
        print("Tickets already exist, skipping.")
        return
    agents = db.scalars(select(User)).all()
    db.add_all([fake_ticket(agents) for _ in range(200)])
    db.commit()
    print("Created 200 fake tickets spread over the last 60 days")


def main():
    random.seed(7)  # same fake data every time
    db = SessionLocal()
    try:
        create_users(db)
        create_knowledge_base(db)
        create_tickets(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
