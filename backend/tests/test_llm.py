import logging

import pytest
from pydantic import ValidationError

from app import llm
from app.core.config import Settings, settings


def fake_post(reply):
    """A stand-in for llm._post that remembers the URL it was called with and returns `reply`."""
    calls = []

    def fake(url, body, headers=None):
        calls.append(url)
        return reply

    fake.calls = calls
    return fake


def test_parse_json_handles_fences_and_extra_words():
    assert llm.parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert llm.parse_json('Sure! Here you go: {"a": 1} Hope that helps.') == {"a": 1}


def test_parse_json_rejects_text_without_json():
    with pytest.raises(llm.LLMError):
        llm.parse_json("I cannot help with that")


def test_ollama(monkeypatch):
    post = fake_post({"message": {"content": '{"a": 1}'}})
    monkeypatch.setattr(llm, "_post", post)
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    assert llm.ask_json("system", "prompt", {}) == {"a": 1}
    assert post.calls == [f"{settings.ollama_url}/api/chat"]


def test_openai_compatible(monkeypatch):
    post = fake_post({"choices": [{"message": {"content": '```json\n{"a": 2}\n```'}}]})
    monkeypatch.setattr(llm, "_post", post)
    monkeypatch.setattr(settings, "llm_provider", "openai_compatible")
    monkeypatch.setattr(settings, "llm_base_url", "")
    assert llm.ask_json("system", "prompt", {}) == {"a": 2}
    assert post.calls == ["https://api.openai.com/v1/chat/completions"]


def test_custom_base_url_is_used(monkeypatch):
    post = fake_post({"choices": [{"message": {"content": "{}"}}]})
    monkeypatch.setattr(llm, "_post", post)
    monkeypatch.setattr(settings, "llm_provider", "openai_compatible")
    monkeypatch.setattr(settings, "llm_base_url", "https://api.groq.com/openai/v1/")
    llm.ask_json("system", "prompt", {})
    assert post.calls == ["https://api.groq.com/openai/v1/chat/completions"]


def test_anthropic(monkeypatch):
    monkeypatch.setattr(llm, "_post", fake_post({"content": [{"type": "text", "text": '{"a": 3}'}]}))
    monkeypatch.setattr(settings, "llm_provider", "anthropic")
    monkeypatch.setattr(settings, "llm_api_key", "sk-test")
    assert llm.ask_json("system", "prompt", {}) == {"a": 3}


def test_anthropic_needs_an_api_key(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "anthropic")
    monkeypatch.setattr(settings, "llm_api_key", "")
    with pytest.raises(llm.LLMError):
        llm.ask_json("system", "prompt", {})


def test_unexpected_reply_shape_is_an_llm_error(monkeypatch):
    monkeypatch.setattr(llm, "_post", fake_post({}))
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    with pytest.raises(llm.LLMError):
        llm.ask_json("system", "prompt", {})


def test_embedding_size_must_match_embed_dim(monkeypatch):
    monkeypatch.setattr(llm, "_post", fake_post({"embeddings": [[0.0] * 10]}))
    monkeypatch.setattr(settings, "embed_provider", "ollama")
    monkeypatch.setattr(settings, "embed_dim", 768)
    with pytest.raises(llm.LLMError, match="EMBED_DIM"):
        llm.embed(["hello"])


def test_a_successful_call_is_logged_with_model_and_time(monkeypatch, caplog):
    monkeypatch.setattr(llm, "_post", fake_post({"message": {"content": "{}"}}))
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    monkeypatch.setattr(settings, "llm_model", "test-model")
    with caplog.at_level(logging.INFO, logger="app.llm"):
        llm.ask_json("system", "prompt", {})
    assert "Chat call ok (ollama:test-model" in caplog.text


def test_a_failed_call_is_logged_as_an_error(monkeypatch, caplog):
    def broken_post(url, body, headers=None):
        raise llm.LLMError("connection refused")

    monkeypatch.setattr(llm, "_post", broken_post)
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    with caplog.at_level(logging.INFO, logger="app.llm"), pytest.raises(llm.LLMError):
        llm.ask_json("system", "prompt", {})
    errors = [record for record in caplog.records if record.levelno == logging.ERROR]
    assert len(errors) == 1
    assert "FAILED" in errors[0].message and "connection refused" in errors[0].message


def test_the_api_key_is_never_logged(monkeypatch, caplog):
    monkeypatch.setattr(llm, "_post", fake_post({"content": [{"type": "text", "text": "{}"}]}))
    monkeypatch.setattr(settings, "llm_provider", "anthropic")
    monkeypatch.setattr(settings, "llm_api_key", "sk-secret-value")
    with caplog.at_level(logging.DEBUG, logger="app.llm"):
        llm.ask_json("system", "prompt", {})
    assert "sk-secret-value" not in caplog.text


def test_unknown_provider_stops_the_app_from_starting():
    with pytest.raises(ValidationError):
        Settings(llm_provider="gemini")
