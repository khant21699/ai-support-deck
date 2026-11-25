# Support Desk

A support desk where AI helps but a human decides.

- A customer submits a ticket.
- The AI labels it (category, priority, mood) and drafts a reply using your knowledge base, with citations.
- An agent reads the draft and approves, edits or rejects it. Nothing is sent without that click.
- A dashboard shows ticket volume, response times, and how often agents accept the AI's drafts.

```
Next.js (web)  ──►  FastAPI (api)  ──►  Postgres (+ pgvector for search)
                        │
                        └──►  AI model (Ollama on your computer, or OpenAI / Groq / Claude ...)
```

## Features

**For customers**
- A public ticket form with validation (valid email, subject and message length limits).
- Spam protection: each IP address can submit 5 tickets per 10 minutes.

**For agents**
- Login with roles: `agent` (works tickets) and `admin` (also manages the knowledge base). The session is an httpOnly cookie.
- An inbox with filters (status, priority, category), subject search and paging.
- A ticket page with the full conversation, AI labels (category, priority, sentiment) and a manual reply box.
- A draft review panel: edit the AI draft, then approve and send, send your edited version, reject, or regenerate.
  Nothing is ever sent without an agent's click.
- The draft appears on its own: the page keeps checking with a growing delay and stops after 2 minutes
  with a clear message and a Regenerate button.

**AI**
- **Triage:** every ticket gets a category, priority and sentiment. The answer is validated, retried once, and
  falls back to safe defaults, so a ticket is never lost because of the AI.
- **Grounded drafts:** replies are written only from your knowledge base and cite their sources (`[E1]`).
  A draft with no valid citation is discarded, and if nothing relevant is found the draft says so instead of guessing.
- **Smart search:** finds knowledge base text by meaning and by keywords, then merges both rankings.
- **Prompt-injection safe:** ticket text is treated as untrusted data in every prompt.
- **Choose your model:** Ollama (local and free), any OpenAI-compatible service (OpenAI, Groq, OpenRouter, LM Studio...)
  or Claude. Chat and embedding models are set separately, and each draft records which model wrote it.
- An accuracy check (`make eval`) that scores the triage against sample tickets.

**Knowledge base**
- Admins create, edit and delete articles. Saving splits the article into pieces and embeds them for search.
- `make reindex` re-embeds everything after you change the embedding model.

**Dashboard**
- Ticket count and open tickets, median first-response time and median resolution time.
- AI quality: acceptance rate, drafts approved as-is, average edit size, average draft speed, and drafts with no answer.
- A volume chart (created and resolved per day), breakdowns by category, priority and sentiment, and open tickets per agent.
- 7, 30 or 90 day views.

**For developers**
- Logs for every API request (method, path, status, time), every AI call (model, time, failures) and every
  step of the ticket pipeline. `LOG_LEVEL=DEBUG` adds prompts and answers.
- One-command local setup with Docker Compose, demo data (`make seed`), 24 automated tests, and a GitHub Actions workflow.
- Secrets stay out of git: every `.env` file is ignored, and only the `.env.example` templates are committed.

## Run it

You need Docker and [Ollama](https://ollama.com).

```bash
make models      # once: downloads the two AI models (qwen2.5:7b and nomic-embed-text)
make up          # starts the database, api (:8000) and web (:3000)
make seed        # in a second terminal: demo users, knowledge base and 200 fake tickets
```

- App: http://localhost:3000 (customers use `/submit`, agents log in at `/login`)
- API docs: http://localhost:8000/docs
- Logins: `admin@example.com` / `admin12345` and `agent@example.com` / `agent12345`

Keep Ollama running while you use the app. If it is off, tickets are still saved, but the AI step fails
safely: you get default labels and a draft saying "we could not find an answer".

## Using a different AI model

Models are chosen with environment variables. Copy `.env.example` to `.env` in the project root, change
the values, and restart (`make up`). Chat and embeddings are separate settings.

```bash
# Use Claude for chat (embeddings stay on Ollama)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-5-5
LLM_API_KEY=sk-ant-...

# Or use Groq (any OpenAI-style service works the same way)
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-8b-instant
LLM_API_KEY=gsk_...
```

- `LLM_PROVIDER` is `ollama`, `openai_compatible` (OpenAI, Groq, OpenRouter, LM Studio...) or `anthropic`.
- `EMBED_PROVIDER` is `ollama` or `openai_compatible`.
- A wrong provider name stops the app at startup with a clear error.
- More examples are in `backend/.env.example`.

If you change the **embedding** model, also set `EMBED_DIM` to its vector size and run `make reindex`
(vectors from different models cannot be compared). Changing only the chat model needs nothing else.

## How a ticket moves through the app

1. `POST /tickets` saves the ticket and starts a background job.
2. **Triage** (`services/triage.py`): the model returns category, priority and sentiment as JSON.
   It is checked, retried once, and falls back to safe defaults.
3. **Search** (`services/retrieval.py`): finds the knowledge base text closest in meaning and in keywords.
   If nothing is close enough, the draft says it could not find an answer instead of guessing.
4. **Draft** (`services/drafting.py`): the model writes a reply using only that text and must cite it.
   A draft with no valid citations is thrown away.
5. **Review**: the agent approves, edits or rejects. Only then is the reply recorded.

Ticket text is treated as untrusted in every prompt, so a customer cannot give the AI instructions.

## Logs

The API prints one line for each thing that happens. Follow them with `make logs`.

```
17:02:11 INFO    app.api: POST /tickets -> 201 (38 ms)
17:02:11 INFO    app.routers.tickets: Ticket 4f1c... created by sam@example.com
17:02:14 INFO    app.llm: Chat call ok (ollama:qwen2.5:7b, 2.9s, prompt 612 chars)
17:02:14 INFO    app.jobs: Ticket 4f1c...: triaged as billing / high / negative
17:02:15 INFO    app.llm: Embedding call ok (ollama:nomic-embed-text, 0.2s, 1 texts)
17:02:19 INFO    app.llm: Chat call ok (ollama:qwen2.5:7b, 4.1s, prompt 1830 chars)
17:02:19 INFO    app.jobs: Ticket 4f1c...: draft ready (grounded=True, 4310 ms)
17:03:40 INFO    app.routers.drafts: Draft 9b2e... approved by admin@example.com (ticket 4f1c...)
```

- **Every API request:** method, path, status and time. Problems stand out: 4xx are `WARNING`, 5xx and crashes are `ERROR` with the full traceback. A failed login (`Failed login for ...`) and a hit on the ticket rate limit are warnings too.
- **Every AI call:** which provider and model, how long it took, and a clear `FAILED` error with the reason (for example `HTTP 429` or `connection refused`). Both the chat model and the embedding model are logged.
- **The ticket pipeline:** triage result, whether the knowledge base had an answer, whether the draft was kept or discarded, and what agents did with each draft.
- **Never logged:** passwords, API keys or request headers. Customer text is not logged either, unless you ask for it.

`LOG_LEVEL` (in `.env`) is `INFO` by default. `DEBUG` also prints the prompt sent to the model and its answer, which contains customer text, so use it only while debugging.

## Where things are

```
backend/app/
  main.py            the FastAPI app
  models.py          database tables
  schemas.py         the shapes of API requests and responses
  llm.py             talks to the AI models (ask_json and embed)
  jobs.py            the background job that runs after a ticket is created
  routers/           API endpoints: auth, tickets, drafts, kb, dashboard
  services/          triage, retrieval (search), drafting, chunking
  core/              settings, database connection, login helpers
backend/scripts/     seed.py (demo data), reindex.py
backend/evals/       checks how accurate triage is (make eval)
backend/tests/       automated tests (make test)
frontend/app/        pages: submit, login, inbox, tickets/[id], kb, dashboard
frontend/lib/        api.ts (calls the backend) and types.ts
```

## Handy commands

```bash
make test      # run the tests
make lint      # check the code style
make eval      # measure triage accuracy (needs Ollama running)
make reindex   # re-embed the knowledge base after changing the embedding model
```

## Deploy

Docker Compose is only for working on your own computer. For a public site:

| Part | Where |
|---|---|
| Frontend | Vercel (root directory `frontend/`, set `NEXT_PUBLIC_API_URL`) |
| Backend | Render or Fly.io, built from `backend/Dockerfile` (health check: `/health`) |
| Database | Neon or Supabase (run `CREATE EXTENSION vector;`) |

On the backend host set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (your Vercel address) and
`COOKIE_SECURE=true`, then run `alembic upgrade head` once. Ollama is not available there, so also set
`LLM_*` and `EMBED_*` to a hosted provider.

## Not built yet

Email in and out, multiple companies, SLAs, attachments, real-time updates.
