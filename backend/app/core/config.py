from typing import Literal

from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FastAPI Project"
    FRONTEND_HOST: str = "http://localhost:5173"
    FASTAPI_ENV: Literal["development", "staging", "production"] | str = "development"

    # Optional external auth / JWT settings
    AUTH_API_URL: str | None = None
    SECRET_KEY: str | None = None
    SENTRY_DSN: HttpUrl | None = None


settings = Settings()
