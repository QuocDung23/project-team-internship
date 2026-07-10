import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes.system import router as system_router
from backend.core.exceptions import register_exception_handlers
from backend.core.logging import configure_logging
from backend.core.settings import get_settings

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(system_router)

logger.debug("FastAPI application initialized")
