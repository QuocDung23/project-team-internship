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

3. Create PostgreSQL database `drowsiness_safety_db` and apply:

   ```bash
   database/drowsiness_safety_db_schema.sql
   ```

4. Configure backend database access when defaults are not enough:

   ```bash
   DROWSINESS_DB_HOST=localhost
   DROWSINESS_DB_NAME=drowsiness_safety_db
   DROWSINESS_DB_USER=postgres
   DROWSINESS_DB_PASSWORD=<password>
   DROWSINESS_DB_PORT=5432
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
python -m py_compile backend/app.py backend/core/*.py backend/db/*.py backend/api/routes/*.py
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

`npm run test` depends on a Node version that supports the configured TypeScript stripping flag.
