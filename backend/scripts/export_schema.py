"""Write migrations/table.sql from the models, so the SQL file never drifts from the code.

Run from the backend folder:   python -m scripts.export_schema      (or: make schema)
"""
from pathlib import Path

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable
from sqlmodel import SQLModel

from app import models  # noqa: F401  (registers the tables)
from app.core.config import settings

OUTPUT = Path(__file__).parent.parent / "migrations" / "table.sql"

HEADER = f"""\
-- Support Desk: all tables.
--
-- Generated from the models by `python -m scripts.export_schema` (make schema). Do not edit by hand.
-- Safe to run more than once: every statement uses IF NOT EXISTS.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/table.sql
--
-- The embedding column is vector({settings.embed_dim}) because EMBED_DIM={settings.embed_dim}. If you use an
-- embedding model with a different size, change EMBED_DIM, run `make schema`, and use the new file on a fresh database
-- (or run `make reindex`, which resizes the column on an existing one).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
"""

FOOTER = """
-- Keyword search on knowledge base text (used together with the vector search).
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING gin (to_tsvector('english', content));

-- Tell Alembic this schema already matches migration 0001, so `alembic upgrade head` only applies later migrations.
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('0001') ON CONFLICT DO NOTHING;

COMMIT;
"""


def main():
    dialect = postgresql.dialect()
    parts = [HEADER]
    for table in SQLModel.metadata.sorted_tables:  # parents before children
        parts.append(f"-- {table.name}")
        parts.append(str(CreateTable(table, if_not_exists=True).compile(dialect=dialect)).strip() + ";")
        for index in sorted(table.indexes, key=lambda i: i.name):
            parts.append(str(CreateIndex(index, if_not_exists=True).compile(dialect=dialect)).strip() + ";")
        parts.append("")
    parts.append(FOOTER)

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text("\n".join(parts))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
