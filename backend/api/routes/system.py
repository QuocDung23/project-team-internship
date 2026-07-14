from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from backend.core.settings import get_settings
from backend.db.connection import check_connection
from backend.db.schema import schema_is_initialized


router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: datetime


class DatabaseHealthResponse(BaseModel):
    status: str
    database_name: str
    database_user: str
    server_version: str
    schema_initialized: bool


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/health/db", response_model=DatabaseHealthResponse)
def database_health_check() -> DatabaseHealthResponse:
    connection_data = check_connection()
    return DatabaseHealthResponse(
        status="ok",
        database_name=connection_data["database_name"],
        database_user=connection_data["database_user"],
        server_version=connection_data["server_version"],
        schema_initialized=schema_is_initialized(),
    )

