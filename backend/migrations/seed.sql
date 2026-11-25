-- Support Desk: seed data. Run table.sql first.
--
--   psql "$DATABASE_URL" \
--     -v admin_email=you@example.com -v admin_password='a long password' \
--     -f migrations/seed.sql
--
-- Variables:
--   admin_password   required. The admin login is created with this password, stored as a bcrypt hash.
--   admin_email      optional, default admin@example.com
--   agent_email,     optional. Creates a second login with the "agent" role (agent_email defaults to
--   agent_password   agent@example.com). Skipped when agent_password is not given.
--   demo_tickets=1   optional. Adds 60 fake tickets, with AI drafts and review outcomes, so the dashboard has data.
--                    Only runs when the tickets table is empty. Leave it out for a real deployment.
--
-- Always added: the admin login and five sample knowledge base articles.
-- Safe to run more than once: rows that already exist are left alone.
--
-- Knowledge base text is saved without embeddings (SQL cannot compute them). After seeding, run
-- `make reindex` (python -m scripts.reindex) with your embedding model reachable, so the AI can search it.

\set ON_ERROR_STOP on

\if :{?admin_password}
\else
  \echo 'Missing admin password. Run with: -v admin_password=...'
  \quit
\endif

\if :{?admin_email}
\else
  \set admin_email admin@example.com
\endif

BEGIN;

-- pgcrypto hashes the passwords (bcrypt, which the API's login check understands).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Logins ----------
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES (gen_random_uuid(), lower(:'admin_email'), crypt(:'admin_password', gen_salt('bf', 12)), 'admin', now())
ON CONFLICT (email) DO NOTHING;

\if :{?agent_password}
  \if :{?agent_email}
  \else
    \set agent_email agent@example.com
  \endif
  INSERT INTO users (id, email, password_hash, role, created_at)
  VALUES (gen_random_uuid(), lower(:'agent_email'), crypt(:'agent_password', gen_salt('bf', 12)), 'agent', now())
  ON CONFLICT (email) DO NOTHING;
\endif

-- ---------- Knowledge base ----------
-- Only seeded into an empty knowledge base, so it never duplicates articles you have written.
DO $$
DECLARE
  article record;
  new_id integer;
BEGIN
  IF EXISTS (SELECT 1 FROM kb_articles) THEN
    RAISE NOTICE 'Knowledge base is not empty, skipping sample articles.';
    RETURN;
  END IF;

  FOR article IN
    SELECT * FROM (VALUES
      ('Resetting your password',
       E'Go to Settings > Security and choose Reset password.\n\nWe email a reset link that expires after 30 minutes. If you do not receive it, check your spam folder and confirm the address on your account.'),
      ('Refund policy',
       E'You can request a full refund within 14 days of purchase.\n\nRefunds are returned to the original payment method and usually arrive in 5 to 10 business days. Annual plans are refunded pro rata after 14 days.'),
      ('Shipping times',
       E'Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days.\n\nYou receive a tracking number by email once your order ships. Orders placed after 2pm ship the next business day.'),
      ('Updating billing details',
       E'Open Settings > Billing to change your card or invoice address.\n\nChanges apply from the next billing cycle. Past invoices cannot be edited, but you can download a copy as PDF.'),
      ('Two-factor authentication',
       E'Enable two-factor authentication under Settings > Security.\n\nIf you lose your device, use one of your backup codes. Support can disable two-factor only after verifying your identity.')
    ) AS v(title, body)
  LOOP
    INSERT INTO kb_articles (title, body, updated_at)
    VALUES (article.title, article.body, now())
    RETURNING id INTO new_id;

    -- Each article is short, so it is a single chunk (the app builds chunks the same way: title, blank line, body).
    INSERT INTO kb_chunks (article_id, ordinal, content)
    VALUES (new_id, 0, article.title || E'\n\n' || article.body);
  END LOOP;
END
$$;

-- ---------- Demo tickets (optional) ----------
\if :{?demo_tickets}
  SELECT NOT EXISTS (SELECT 1 FROM tickets) AS tickets_empty \gset
  \if :tickets_empty
    -- Work table: one row per fake ticket, with its timeline and review outcome worked out once.
    CREATE TEMP TABLE demo AS
    SELECT
      base.*,
      -- Every fourth ticket is resolved; the rest are open with a draft waiting for review.
      CASE WHEN i % 4 = 3 THEN created_at + (i % 7 + 1) * interval '25 minutes' END AS replied_at,
      CASE
        WHEN i % 4 <> 3 THEN 'pending'
        WHEN i % 10 < 5 THEN 'approved'
        WHEN i % 10 < 8 THEN 'edited'
        ELSE 'rejected'
      END AS outcome,
      'Thanks for reaching out. Here is how to resolve this [E1].' AS draft_body
    FROM (
      SELECT
        gen_random_uuid() AS id,
        g AS i,
        t.category,
        t.subject,
        t.body,
        now() - g * interval '20 hours' AS created_at
      FROM generate_series(0, 59) AS g
      JOIN (VALUES
        (0, 'billing', 'I was charged twice this month', 'Hi, I see two charges on my card for this month''s subscription. Can you refund one of them?'),
        (1, 'billing', 'Need invoice with new address', 'Please update the address on my invoices. I changed offices and need the new one on file.'),
        (2, 'account', 'Cannot reset my password', 'I clicked reset password but never got the email. I checked spam. Can you help me get back in?'),
        (3, 'account', 'Lost my phone, locked out of 2FA', 'I replaced my phone and cannot pass two-factor. I do not have backup codes.'),
        (4, 'shipping', 'Where is my order?', 'I ordered a week ago and have no tracking number yet. Can you check the status?'),
        (5, 'technical', 'App crashes when I upload a file', 'Every time I upload a PDF over 10MB the app freezes and then shows an error page.'),
        (6, 'technical', 'API returns 500 errors', 'Since this morning our integration gets 500 responses from your API. This is blocking our production system.'),
        (7, 'feature_request', 'Dark mode please', 'Would love a dark mode option. Working late is hard on the eyes.'),
        (8, 'other', 'Partnership inquiry', 'We are interested in partnering with your team. Who should we speak to?')
      ) AS t(n, category, subject, body) ON t.n = g % 9
    ) AS base;

    INSERT INTO tickets (id, subject, body, customer_email, status, ai_status, category, priority, sentiment,
                         assignee_id, created_at, first_response_at, resolved_at)
    SELECT
      id, subject, body,
      'customer' || (i % 25 + 1) || '@example.com',
      CASE WHEN outcome = 'pending' THEN 'open' ELSE 'resolved' END,
      'done',
      category,
      (ARRAY['high', 'normal', 'low', 'urgent'])[i % 4 + 1],
      (ARRAY['negative', 'neutral', 'neutral', 'positive'])[i % 4 + 1],
      (SELECT id FROM users WHERE email = lower(:'admin_email')),
      created_at,
      replied_at,
      replied_at + (i % 5 + 1) * interval '3 hours'
    FROM demo;

    INSERT INTO messages (id, ticket_id, author_type, body, created_at)
    SELECT gen_random_uuid(), id, 'customer', body, created_at FROM demo;

    INSERT INTO ai_drafts (id, ticket_id, body, citations, grounded, status, final_body, edit_ratio,
                           model, latency_ms, created_at, reviewed_at)
    SELECT
      gen_random_uuid(), id, draft_body, '[]'::json,
      i % 8 <> 0,  -- a few drafts found nothing in the knowledge base
      outcome,
      CASE outcome WHEN 'approved' THEN draft_body WHEN 'edited' THEN draft_body || ' (edited)' END,
      CASE outcome WHEN 'approved' THEN 0 WHEN 'edited' THEN round((0.05 + (i % 11) * 0.05)::numeric, 3) END,
      'seed',
      800 + (i * 137) % 5200,
      created_at + interval '30 seconds',
      CASE WHEN outcome <> 'pending' THEN replied_at END
    FROM demo;

    -- The reply an agent sent for each resolved ticket.
    INSERT INTO messages (id, ticket_id, author_type, body, created_at)
    SELECT
      gen_random_uuid(), id, 'agent',
      CASE outcome WHEN 'approved' THEN draft_body WHEN 'edited' THEN draft_body || ' (edited)' ELSE 'Handled manually.' END,
      replied_at
    FROM demo
    WHERE outcome <> 'pending';

    DROP TABLE demo;
  \else
    \echo 'Tickets already exist, skipping demo tickets.'
  \endif
\endif

COMMIT;

\echo 'Seed finished. Next: run `make reindex` so the knowledge base can be searched.'
