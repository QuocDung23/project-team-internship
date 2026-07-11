import psycopg2

from backend.core.settings import get_settings


def get_connection():
    settings = get_settings()
    return psycopg2.connect(
        host=settings.db_host,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password,
        port=settings.db_port,
    )
