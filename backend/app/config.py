from pathlib import Path
from uuid import UUID

from pydantic_settings import BaseSettings, SettingsConfigDict

# Корень backend/ (рядом с app/) — чтобы .env подхватывался при любом cwd (uvicorn из корня репо и т.д.)
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_DOTENV = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_DOTENV),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    default_user_id: UUID = UUID("00000000-0000-0000-0000-000000000001")
    jwt_secret_key: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    allow_anonymous_default_user: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
