from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / "backend" / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_prefix="DROWSINESS_",
    )

    app_name: str = "AI-Powered Real-Time Trip Safety Management System"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    debug: bool = False

    db_host: str = "localhost"
    db_name: str = "drowsiness_safety_phase1"
    db_user: str = "postgres"
    db_password: str = ""
    db_port: int = 5432

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
    )
    log_level: str = "INFO"
    log_file: str | None = None
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    schema_path: Path = Field(
        default=BASE_DIR / "database" / "drowsiness_safety_db_schema.sql",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return [str(value).strip()]

    @field_validator("schema_path", mode="before")
    @classmethod
    def _normalize_schema_path(cls, value: Any) -> Path:
        if value in (None, ""):
            return BASE_DIR / "database" / "drowsiness_safety_db_schema.sql"
        return Path(value)

    @property
    def database_url(self) -> str:
        url = URL.create(
            "postgresql+psycopg2",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )
        return url.render_as_string(hide_password=False)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
