from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from backend.core.settings import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        settings.database_url,
        future=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,
    )


def check_connection() -> dict[str, str]:
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text(
                """
                SELECT
                    current_database() AS database_name,
                    current_user AS database_user,
                    version() AS server_version
                """
            )
        ).mappings().one()
    return dict(row)

