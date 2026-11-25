import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def default_settings(monkeypatch):
    """Tests must not depend on your own .env file, so every test starts from the default model settings."""
    defaults = {
        "llm_provider": "ollama",
        "llm_model": "qwen2.5:7b",
        "llm_base_url": "",
        "llm_api_key": "",
        "embed_provider": "ollama",
        "embed_model": "nomic-embed-text",
        "embed_base_url": "",
        "embed_api_key": "",
        "embed_dim": 768,
        "ollama_url": "http://localhost:11434",
    }
    for name, value in defaults.items():
        monkeypatch.setattr(settings, name, value)
