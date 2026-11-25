.PHONY: models up down seed reindex test lint eval logs

LLM_MODEL ?= qwen2.5:7b
EMBED_MODEL ?= nomic-embed-text

models:  ## pull the local Ollama models (override: make models LLM_MODEL=llama3.1:8b)
	ollama pull $(LLM_MODEL)
	ollama pull $(EMBED_MODEL)

reindex:  ## re-embed the knowledge base after changing the embedding model
	docker compose run --rm api python -m scripts.reindex

up:
	docker compose up --build

down:
	docker compose down

seed:  ## admin user, KB articles and ~200 fake tickets
	docker compose run --rm api python -m scripts.seed

test:
	docker compose run --rm api pytest -q

lint:
	docker compose run --rm api ruff check .

eval:  ## triage accuracy against evals/sample_tickets.json (needs Ollama)
	docker compose run --rm api python -m evals.run_eval

logs:  ## follow the API log (requests, AI calls, errors)
	docker compose logs -f api
