from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    demo_mode: bool = True
    environment: str = "development"

    # Database
    database_url: str = "postgresql+psycopg://gci:gci@localhost:5432/gci"

    # GDACS
    gdacs_base_url: str = "https://www.gdacs.org/gdacsapi/api"
    gdacs_poll_seconds: int = 600

    # GDELT Cloud
    gdelt_cloud_base_url: str = "https://api.gdeltcloud.com"
    gdelt_cloud_api_key: str | None = None
    gdelt_poll_seconds: int = 900

    # AI
    llm_api_key: str | None = None
    llm_model: str = "claude-sonnet-5"

    # CORS / frontend — comma-separated list so a deployed frontend origin
    # (e.g. a Vercel domain) can be added alongside localhost for dev.
    frontend_origin: str = "http://localhost:3000"

    # Cache
    cache_ttl_seconds: int = 300

    @property
    def cors_origins(self) -> list[str]:
        origins = {o.strip() for o in self.frontend_origin.split(",") if o.strip()}
        origins.add("http://localhost:3000")
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
