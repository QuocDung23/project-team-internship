import argparse
import logging
import sys
from pathlib import Path

from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from backend.core.settings import get_settings
from backend.db.connection import get_engine


logger = logging.getLogger(__name__)
CORE_TABLES = {"users", "settings"}


def _friendly_connection_message(exc: OperationalError) -> str:
    detail = str(exc.orig).strip() if getattr(exc, "orig", None) else str(exc).strip()
    if not detail:
        detail = "database connection failed"
    return (
        "Database connection failed while initializing the schema. "
        "Check DROWSINESS_DB_HOST, DROWSINESS_DB_NAME, DROWSINESS_DB_USER, "
        "DROWSINESS_DB_PASSWORD, DROWSINESS_DB_PORT, or DATABASE_URL. "
        f"PostgreSQL reported: {detail}"
    )


def schema_is_initialized() -> bool:
    engine = get_engine()
    with engine.connect() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names(schema="public"))
        return CORE_TABLES.issubset(existing_tables)


def existing_public_tables() -> set[str]:
    engine = get_engine()
    with engine.connect() as connection:
        inspector = inspect(connection)
        return set(inspector.get_table_names(schema="public"))


def initialize_schema(schema_path: Path | None = None) -> bool:
    settings = get_settings()
    target_path = Path(schema_path or settings.schema_path)
    if not target_path.exists():
        raise FileNotFoundError(f"Schema file not found: {target_path}")

    try:
        if schema_is_initialized():
            logger.info("Database schema already initialized; skipping bootstrap")
            return False

        existing_tables = existing_public_tables()
        if existing_tables:
            table_list = ", ".join(sorted(existing_tables))
            raise RuntimeError(
                "Database is not empty, but the approved schema is not fully initialized. "
                "Use an empty database or reset the existing database before running init. "
                f"Existing public tables: {table_list}"
            )

        schema_sql = target_path.read_text(encoding="utf-8")
        engine = get_engine()
        raw_connection = engine.raw_connection()
        try:
            cursor = raw_connection.cursor()
            cursor.execute(schema_sql)
            raw_connection.commit()
            logger.info("Database schema initialized from %s", target_path)
            return True
        except Exception:
            raw_connection.rollback()
            logger.exception("Failed to initialize database schema")
            raise
        finally:
            raw_connection.close()
    except OperationalError as exc:
        raise RuntimeError(_friendly_connection_message(exc)) from exc


def validate_schema() -> dict[str, bool]:
    try:
        return {
            "core_tables_present": schema_is_initialized(),
        }
    except OperationalError as exc:
        raise RuntimeError(_friendly_connection_message(exc)) from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Database schema utility")
    parser.add_argument(
        "command",
        choices=("init", "validate"),
        help="Initialize the database schema or validate that the core tables exist.",
    )
    args = parser.parse_args()

    try:
        if args.command == "init":
            initialized = initialize_schema()
            print("initialized" if initialized else "already_initialized")
        else:
            result = validate_schema()
            print(result)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2) from exc
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
