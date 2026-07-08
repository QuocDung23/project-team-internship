from fastapi import FastAPI
from routes.driver_routes import router as driver_router
from routes.trip_routes import router as trip_router
from routes.alert_routes import router as alert_router
from routes.setting_routes import router as setting_router
from routes.statistics_routes import router as statistics_router

app = FastAPI(
    title="Drowsiness Safety API"
)

app.include_router(driver_router)
app.include_router(trip_router)
app.include_router(alert_router)
app.include_router(setting_router)
app.include_router(statistics_router)
