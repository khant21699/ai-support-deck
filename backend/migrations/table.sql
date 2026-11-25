-- Support Desk: all tables.
--
-- Generated from the models by `python -m scripts.export_schema` (make schema). Do not edit by hand.
-- Safe to run more than once: every statement uses IF NOT EXISTS.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/table.sql
--
-- The embedding column is vector(768) because EMBED_DIM=768. If you use an
-- embedding model with a different size, change EMBED_DIM, run `make schema`, and use the new file on a fresh database
-- (or run `make reindex`, which resizes the column on an existing one).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- kb_articles
CREATE TABLE IF NOT EXISTS kb_articles (
	id SERIAL NOT NULL, 
	title VARCHAR(300) NOT NULL, 
	body VARCHAR NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

-- users
CREATE TABLE IF NOT EXISTS users (
	id UUID NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR NOT NULL, 
	role VARCHAR NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- kb_chunks
CREATE TABLE IF NOT EXISTS kb_chunks (
	id SERIAL NOT NULL, 
	article_id INTEGER NOT NULL, 
	ordinal INTEGER NOT NULL, 
	content VARCHAR NOT NULL, 
	embedding VECTOR(768), 
	PRIMARY KEY (id), 
	FOREIGN KEY(article_id) REFERENCES kb_articles (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_kb_chunks_article_id ON kb_chunks (article_id);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
	id UUID NOT NULL, 
	subject VARCHAR(300) NOT NULL, 
	body VARCHAR NOT NULL, 
	customer_email VARCHAR(255) NOT NULL, 
	status VARCHAR NOT NULL, 
	ai_status VARCHAR NOT NULL, 
	category VARCHAR, 
	priority VARCHAR, 
	sentiment VARCHAR, 
	assignee_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	first_response_at TIMESTAMP WITH TIME ZONE, 
	resolved_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(assignee_id) REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS ix_tickets_category ON tickets (category);
CREATE INDEX IF NOT EXISTS ix_tickets_created_at ON tickets (created_at);
CREATE INDEX IF NOT EXISTS ix_tickets_priority ON tickets (priority);
CREATE INDEX IF NOT EXISTS ix_tickets_status ON tickets (status);

-- ai_drafts
CREATE TABLE IF NOT EXISTS ai_drafts (
	id UUID NOT NULL, 
	ticket_id UUID NOT NULL, 
	body VARCHAR NOT NULL, 
	citations JSON NOT NULL, 
	grounded BOOLEAN NOT NULL, 
	status VARCHAR NOT NULL, 
	final_body VARCHAR, 
	edit_ratio FLOAT, 
	model VARCHAR, 
	latency_ms INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	reviewed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_ai_drafts_status ON ai_drafts (status);
CREATE INDEX IF NOT EXISTS ix_ai_drafts_ticket_id ON ai_drafts (ticket_id);

-- messages
CREATE TABLE IF NOT EXISTS messages (
	id UUID NOT NULL, 
	ticket_id UUID NOT NULL, 
	author_type VARCHAR NOT NULL, 
	body VARCHAR NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_messages_ticket_id ON messages (ticket_id);


-- Keyword search on knowledge base text (used together with the vector search).
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING gin (to_tsvector('english', content));

-- Tell Alembic this schema already matches migration 0001, so `alembic upgrade head` only applies later migrations.
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('0001') ON CONFLICT DO NOTHING;

COMMIT;
