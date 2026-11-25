"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-11-24
"""
from sqlmodel import SQLModel

from alembic import op
from app import models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # First migration creates the whole baseline schema from the models.
    # Later changes should use `alembic revision --autogenerate`.
    SQLModel.metadata.create_all(bind=op.get_bind())
    op.execute(
        "CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks "
        "USING gin (to_tsvector('english', content))"
    )


def downgrade():
    SQLModel.metadata.drop_all(bind=op.get_bind())
