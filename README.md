# Real-Time Driver Drowsiness Detection and Trip Safety Management

Production-focused trip safety system. This repository now includes a phase-1 FastAPI backend foundation, the validated PostgreSQL schema, the realtime detector runtime, and the frontend shell.

## Runtime Components

- `integrate_cnn.py`: realtime detector and single runtime entrypoint.
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

4. Configure backend database access when defaults are not enough:

   ```bash
   DROWSINESS_DB_HOST=localhost
   DROWSINESS_DB_NAME=drowsiness_safety_phase1
   DROWSINESS_DB_USER=postgres
   DROWSINESS_DB_PASSWORD=<password>
   DROWSINESS_DB_PORT=5432
   DROWSINESS_JWT_SECRET=<long-random-secret>
   DROWSINESS_ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

   Optional settings are documented in `backend/.env.example`.

## Run

Start the backend from the project root:

```bash
python -m uvicorn backend.app:app --reload
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

## Authentication

Authentication endpoints:

```bash
POST /api/v1/auth/login
GET /api/v1/auth/me
```

The API and PostgreSQL schema both use the same domain roles: `admin`, `dispatcher`, and `driver`.

For the current demo scope, a `driver` user is linked to a driver profile by matching `users.email` to `drivers.email`. Keep this as an application-level convention; do not change the database schema for this linkage.

If the database was created before authentication was added, apply the required schema fix once:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TYPE user_role RENAME VALUE 'operator' TO 'dispatcher';
ALTER TYPE user_role RENAME VALUE 'viewer' TO 'driver';
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'dispatcher'::user_role;
```

Create or update a seed admin user:

```bash
$env:DROWSINESS_SEED_ADMIN_PASSWORD = "choose-a-long-admin-password"
python -m backend.auth.seed_admin --email admin@example.com --full-name "System Admin"
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

`integrate_cnn.py` captures camera frames, runs landmark/CNN detection, plays local audio alerts, and publishes:

- `/monitoring/snapshot`: live EAR/MAR/head-pose/drowsiness metrics.
- `/monitoring/frame`: latest detector frame.
- `/alerts`: persisted trip safety alerts.

The frontend reads only backend data. It does not include mock telemetry, seeded drivers, fake alerts, or fallback demo state.

## Verification

Backend and detector:

```bash
python -m unittest discover -s tests
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
