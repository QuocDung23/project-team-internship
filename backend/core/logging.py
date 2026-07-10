import logging
from logging.config import dictConfig
from pathlib import Path

from backend.core.settings import Settings


def configure_logging(settings: Settings) -> None:
    handlers: dict[str, dict[str, object]] = {
        "console": {
            "class": "logging.StreamHandler",
            "level": settings.log_level,
            "formatter": "standard",
        }
    }

    root_handlers = ["console"]

    if settings.log_file:
        log_path = Path(settings.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers["file"] = {
            "class": "logging.FileHandler",
            "level": settings.log_level,
            "formatter": "standard",
            "filename": str(log_path),
            "encoding": "utf-8",
        }
        root_handlers.append("file")

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s %(levelname)s %(name)s - %(message)s",
                }
            },
            "handlers": handlers,
            "root": {
                "level": settings.log_level,
                "handlers": root_handlers,
            },
            "loggers": {
                "uvicorn": {"level": settings.log_level, "propagate": True},
                "uvicorn.error": {"level": settings.log_level, "propagate": True},
                "uvicorn.access": {"level": settings.log_level, "propagate": True},
            },
        }
    )
    logging.getLogger(__name__).debug("Logging configured")

