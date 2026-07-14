import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes.auth import router as auth_router
from backend.api.routes.drivers import router as drivers_router
from backend.api.routes.safety_events import router as safety_events_router
from backend.api.routes.system import router as system_router
from backend.api.routes.trips import router as trips_router
from backend.api.routes.vehicles import router as vehicles_router
from backend.core.exceptions import register_exception_handlers
from backend.core.logging import configure_logging
from backend.core.settings import get_settings
from backend.routes.alert_routes import router as legacy_alerts_router
from backend.routes.monitoring_routes import router as monitoring_router
from backend.routes.setting_routes import router as settings_router

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
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(drivers_router, prefix=settings.api_prefix)
app.include_router(vehicles_router, prefix=settings.api_prefix)
app.include_router(trips_router, prefix=settings.api_prefix)
app.include_router(safety_events_router, prefix=settings.api_prefix)
app.include_router(legacy_alerts_router, prefix=settings.api_prefix)
app.include_router(monitoring_router, prefix=settings.api_prefix)
app.include_router(settings_router, prefix=settings.api_prefix)

logger.debug("FastAPI application initialized")
