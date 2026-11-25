from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every setting can be overridden with an environment variable of the same name (LLM_MODEL, etc.)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # DEBUG also logs the text sent to and received from the AI model (this includes customer text)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Database and web
    database_url: str = "postgresql+psycopg://postgres:dev@localhost:5432/support"
    secret_key: str = "change-me"
    cors_origins: str = "http://localhost:3000"  # comma separated
    cookie_secure: bool = False  # set true in production (https)
    cookie_domain: str | None = None
    session_hours: int = 12

    # Chat model: writes replies and classifies tickets
    llm_provider: Literal["ollama", "openai_compatible", "anthropic"] = "ollama"
    llm_model: str = "qwen2.5:7b"
    llm_base_url: str = ""  # leave empty to use the provider's normal address
    llm_api_key: str = ""

    # Embedding model: powers knowledge base search (Anthropic has none)
    embed_provider: Literal["ollama", "openai_compatible"] = "ollama"
    embed_model: str = "nomic-embed-text"
    embed_dim: int = 768  # must match what the embedding model returns
    embed_base_url: str = ""
    embed_api_key: str = ""

    ollama_url: str = "http://localhost:11434"  # where Ollama runs (Docker overrides this)
    kb_min_score: float = 0.35  # below this similarity the knowledge base "has no answer"

    admin_email: str = "admin@example.com"
    admin_password: str = "admin12345"

    @property
    def cors_origin_list(self):
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
