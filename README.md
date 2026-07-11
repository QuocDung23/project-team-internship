# Real-Time Driver Drowsiness Detection and Trip Safety Management

Production-focused trip safety system. This repository now includes a phase-1 FastAPI backend foundation, the validated PostgreSQL schema, the realtime detector runtime, and the frontend shell.

## Runtime Components

- `integrate_cnn.py`: compatibility launcher for the event-enabled realtime detector.
- `integrate_cnn_with_events.py`: detector runtime with local JSONL SafetyEvent logging and optional backend publishing.
- `detector_backend.py`: HTTP client for posting detector snapshots, frames, alerts, settings fetches, and queued alert retries.
- `backend/`: FastAPI backend foundation with configuration, logging, PostgreSQL connection setup, schema bootstrap support, and health endpoints.
- `frontend/`: React/Vite operations console backed only by live backend data.
- `database/drowsiness_safety_db_schema.sql`: PostgreSQL schema.
- `best_model_v2.h5` and `class_indices_v2.json`: production CNN model and label mapping.
- `shape_predictor_68_face_landmarks.dat`: dlib landmark model used by the detector.
- `audio/alert.wav`: local detector alarm sound.

## Local Setup

1. Create and activate a Python environment.
2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt -r backend/requirements.txt
   ```

3. Create PostgreSQL database `drowsiness_safety_phase1` and apply:

   ```bash
   database/drowsiness_safety_db_schema.sql
   ```

4. Configure backend database access when defaults are not enough. The backend reads `DROWSINESS_*` variables, either from the environment or `backend/.env`:

   ```bash
   DROWSINESS_API_PREFIX=/api/v1
   DROWSINESS_DB_HOST=localhost
   DROWSINESS_DB_NAME=drowsiness_safety_phase1
   DROWSINESS_DB_USER=postgres
   DROWSINESS_DB_PASSWORD=<password>
   DROWSINESS_DB_PORT=5432
   DROWSINESS_JWT_SECRET=<long-random-secret>
   DROWSINESS_ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

   Optional settings are documented in `backend/.env.example`.

5. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

6. Configure the frontend in `frontend/.env`:

   ```bash
   VITE_API_BASE_URL=/api/v1
   VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:8000
   VITE_API_BEARER_TOKEN=<access_token>
   VITE_ACTIVE_TRIP_ID=<trip_id>
   VITE_ALERT_POLL_MS=2200
   ```

   `VITE_API_BEARER_TOKEN` is optional if the app stores a token in `localStorage.drowsiness_access_token`.

## Run

Start the backend from the project root:

```bash
python -m uvicorn backend.app:app --reload
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the API docs:

```bash
http://127.0.0.1:8000/docs
```

Check service health:

```bash
curl http://127.0.0.1:8000/health
```

Check database connectivity:

```bash
curl http://127.0.0.1:8000/health/db
```

Initialize or validate the schema:

```bash
python -m backend.db.schema init
python -m backend.db.schema validate
```

The schema utility reads `database/drowsiness_safety_db_schema.sql` and does not modify it.

Run the detector with the existing CLI:

```bash
python integrate_cnn.py --camera 1 --model best_model_v2.h5 --class-json class_indices_v2.json
```

By default, the detector publishes live monitoring snapshots and frames to `http://127.0.0.1:8000/api/v1` so the frontend Monitoring page can show the camera stream. Use `--disable-monitoring-publish` only when running the detector without the backend UI.

Publish AI SafetyEvents to the backend while keeping local JSONL logging enabled:

```bash
python integrate_cnn.py --camera 1 ^
  --model best_model_v2.h5 ^
  --class-json class_indices_v2.json ^
  --publish-safety-events-backend ^
  --safety-backend-url http://127.0.0.1:8000/api/v1 ^
  --safety-backend-token <access_token>
```

Local event logging remains enabled by default at `logs/ai_safety_events.jsonl`. Use `--disable-safety-events` only for old-runtime performance comparisons.

## Authentication

Authentication endpoints:

```bash
POST /api/v1/auth/login
GET /api/v1/auth/me
```

The API and PostgreSQL schema both use the same domain roles: `admin` and `driver`.

For the current demo scope, a `driver` user is linked to a driver profile by matching `users.email` to `drivers.email`. Keep this as an application-level convention; do not change the database schema for this linkage.

If the database was created before authentication was added, apply the required schema fix once:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
UPDATE users SET role = 'driver'::user_role WHERE role::text NOT IN ('admin', 'driver');
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'driver'::user_role;
```

Create or update a seed admin user:

```bash
$env:DROWSINESS_SEED_ADMIN_PASSWORD = "choose-a-long-admin-password"
python -m backend.auth.seed_admin --email admin@example.com --full-name "System Admin"
```

Create or update three basic seed driver users and matching driver profiles:

```bash
python -m backend.auth.seed_drivers
```

Default driver accounts use password `driver123456`:

```text
driver1@example.com
driver2@example.com
driver3@example.com
```

Manual login test:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"choose-a-long-admin-password\"}"
```

Use the returned token:

```bash
curl http://127.0.0.1:8000/api/v1/auth/me ^
  -H "Authorization: Bearer <access_token>"
```

## Data Flow

The end-to-end workflow uses one API prefix everywhere: `/api/v1`.

`integrate_cnn.py` launches the event-enabled detector, which captures camera frames, runs the existing landmark/CNN detection, plays local audio alerts, writes JSONL SafetyEvents, and can publish high-severity AI events to:

- `POST /api/v1/safety-events/ingest`: AI SafetyEvent ingestion.
- `POST /api/v1/trips/start-my-trip`: driver starts the simplified trip workflow.
- `POST /api/v1/trips/{trip_id}/complete`: trip completion and safety score generation.
- `GET /api/v1/trips/{trip_id}/alerts`: compatibility alert retrieval.
- `GET /api/v1/trips/{trip_id}/safety-score`: stored safety score and grade.
- `GET /api/v1/monitoring/snapshot`, `/frame`, and `/stream`: live monitoring state.
- `GET /api/v1/settings`: detector/frontend settings.

The frontend reads only backend data. It does not include mock telemetry, seeded drivers, fake alerts, or fallback demo state.

Canonical backend alert types created from SafetyEvents are `drowsiness`, `driver_inattention`, and `camera_issue`. The frontend also keeps compatibility with detector-native alert types such as `drowsy_cnn`, `eyes_closed`, `yawning`, `head_nod`, and `no_face_detected`.

## Verification

Backend and detector:

```bash
.venv\Scripts\python.exe -m unittest discover -s tests
python -m py_compile integrate_cnn.py detector_backend.py backend/models/schemas.py backend/services/*.py backend/routes/*.py
python -m py_compile backend/app.py backend/core/*.py backend/db/*.py backend/auth/*.py backend/repositories/*.py backend/api/routes/*.py
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

`npm run test` depends on a Node version that supports the configured TypeScript stripping flag.
