"""Talk to the AI models. This file does only two things:

    ask_json()  ask the chat model a question and get a JSON answer back
    embed()     turn text into numbers (vectors) so we can search by meaning

Which provider and model to use comes from environment variables (see backend/.env.example).

Every call is logged: one INFO line when it works, one ERROR line when it fails.
Set LOG_LEVEL=DEBUG to also see the prompt and the model's answer (this includes customer text).
"""
import json
import logging
import time

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

TIMEOUT_SECONDS = 120
TEMPERATURE = 0.2


class LLMError(Exception):
    """Raised when a call to a model fails."""


def ask_json(system: str, prompt: str, schema: dict):
    """Ask the chat model for an answer shaped like `schema`. Returns a dict."""
    model = f"{settings.llm_provider}:{settings.llm_model}"
    started = time.time()
    log.debug("Chat prompt to %s:\n%s", model, prompt[:2000])

    try:
        answer = _ask_json(system, prompt, schema)
    except LLMError as error:
        log.error("Chat call FAILED (%s, %.1fs): %s", model, time.time() - started, error)
        raise

    log.info("Chat call ok (%s, %.1fs, prompt %d chars)", model, time.time() - started, len(prompt))
    log.debug("Chat answer from %s: %s", model, json.dumps(answer)[:2000])
    return answer


def embed(texts: list[str]):
    """Turn each text into a vector (a list of numbers). Returns one vector per text."""
    model = f"{settings.embed_provider}:{settings.embed_model}"
    started = time.time()

    try:
        vectors = _embed(texts)
    except LLMError as error:
        log.error("Embedding call FAILED (%s, %.1fs): %s", model, time.time() - started, error)
        raise

    log.info("Embedding call ok (%s, %.1fs, %d texts)", model, time.time() - started, len(texts))
    return vectors


def parse_json(text: str):
    """Turn the model's reply into a dict. Models sometimes wrap JSON in ```json fences or extra words."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end < start:
        log.debug("Reply that was not JSON: %s", text[:500])
        raise LLMError("The model did not return JSON")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as error:
        log.debug("Reply with invalid JSON: %s", text[:500])
        raise LLMError("The model returned invalid JSON") from error


def _ask_json(system: str, prompt: str, schema: dict):
    provider = settings.llm_provider
    url = _url(provider, settings.llm_base_url)
    key = settings.llm_api_key
    model = settings.llm_model

    # Every provider gets the schema written into the prompt. Ollama can also enforce it.
    question = prompt + "\n\nReply with only a JSON object that matches this JSON Schema:\n" + json.dumps(schema)
    user_message = {"role": "user", "content": question}
    system_message = {"role": "system", "content": system}

    try:
        if provider == "ollama":
            data = _post(f"{url}/api/chat", {
                "model": model,
                "stream": False,
                "format": schema,
                "options": {"temperature": TEMPERATURE},
                "messages": [system_message, user_message],
            })
            text = data["message"]["content"]

        elif provider == "openai_compatible":  # OpenAI, Groq, OpenRouter, LM Studio, ...
            data = _post(f"{url}/chat/completions", {
                "model": model,
                "temperature": TEMPERATURE,
                "messages": [system_message, user_message],
            }, headers=_bearer(key))
            text = data["choices"][0]["message"]["content"]

        else:  # anthropic (Claude)
            if not key:
                raise LLMError("LLM_API_KEY is required when LLM_PROVIDER=anthropic")
            data = _post(f"{url}/v1/messages", {
                "model": model,
                "max_tokens": 1024,
                "temperature": TEMPERATURE,
                "system": system,
                "messages": [user_message],
            }, headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
            text = data["content"][0]["text"]

    except (KeyError, IndexError, TypeError) as error:
        raise LLMError(f"Unexpected response from {provider}") from error

    return parse_json(text)


def _embed(texts: list[str]):
    provider = settings.embed_provider
    url = _url(provider, settings.embed_base_url)
    body = {"model": settings.embed_model, "input": texts}

    try:
        if provider == "ollama":
            vectors = _post(f"{url}/api/embed", body)["embeddings"]
        else:  # openai_compatible
            items = _post(f"{url}/embeddings", body, headers=_bearer(settings.embed_api_key))["data"]
            vectors = [item["embedding"] for item in sorted(items, key=lambda item: item["index"])]
    except (KeyError, TypeError) as error:
        raise LLMError(f"Unexpected response from {provider}") from error

    for vector in vectors:
        if len(vector) != settings.embed_dim:
            raise LLMError(
                f"The embedding model returned {len(vector)} numbers per text but EMBED_DIM is "
                f"{settings.embed_dim}. Set EMBED_DIM={len(vector)} and run `make reindex`."
            )
    return vectors


def _url(provider: str, custom_url: str):
    default_urls = {
        "ollama": settings.ollama_url,
        "openai_compatible": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com",
    }
    return (custom_url or default_urls[provider]).rstrip("/")


def _bearer(api_key: str):
    # Local servers (LM Studio, vLLM) often need no key.
    return {"Authorization": f"Bearer {api_key}"} if api_key else {}


def _post(url: str, body: dict, headers: dict | None = None):
    # Never log `headers`: they contain the API key.
    try:
        response = httpx.post(url, json=body, headers=headers, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as error:
        detail = error.response.text[:300] if isinstance(error, httpx.HTTPStatusError) else repr(error)
        status = f" (HTTP {error.response.status_code})" if isinstance(error, httpx.HTTPStatusError) else ""
        raise LLMError(f"Request to {url} failed{status}: {detail}") from error
