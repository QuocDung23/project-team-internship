import psycopg2
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.driver_routes import router as driver_router
from routes.trip_routes import router as trip_router
from routes.alert_routes import router as alert_router
from routes.monitoring_routes import router as monitoring_router
from routes.setting_routes import router as setting_router

app = FastAPI(
    title="Drowsiness Safety API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(psycopg2.OperationalError)
async def database_connection_error(_request: Request, exc: psycopg2.OperationalError):
    detail = str(exc).strip().splitlines()[0] if str(exc).strip() else "database connection failed"
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database connection failed. Check DROWSINESS_DB_HOST, DROWSINESS_DB_NAME, "
            "DROWSINESS_DB_USER, DROWSINESS_DB_PASSWORD, and DROWSINESS_DB_PORT.",
            "error": detail,
        },
    )


app.include_router(driver_router)
app.include_router(trip_router)
app.include_router(alert_router)
app.include_router(monitoring_router)
app.include_router(setting_router)
