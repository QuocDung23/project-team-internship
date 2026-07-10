# Real-Time Driver Drowsiness Detection and Trip Safety Management

Production-focused full-stack system for detecting driver drowsiness in real time, publishing detector telemetry to a FastAPI backend, and displaying trip safety status in a React operations console.

## Runtime Components

- `integrate_cnn.py`: realtime detector and single runtime entrypoint.
- `detector_backend.py`: HTTP client for posting detector snapshots, frames, alerts, settings fetches, and queued alert retries.
- `backend/`: FastAPI service for drivers, trips, alerts, settings, and live monitoring stream endpoints.
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

## Run

Start the backend:

```bash
cd backend
uvicorn app:app --reload
```

Create a driver and active trip:

```bash
curl -X POST http://127.0.0.1:8000/drivers \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Driver\",\"license_number\":\"LICENSE-1\",\"status\":\"active\"}"

curl -X POST http://127.0.0.1:8000/trips/start \
  -H "Content-Type: application/json" \
  -d "{\"driver_id\":\"<driver_id>\",\"vehicle_plate\":\"51H-123.45\"}"
```

Start the frontend:

```bash
cd frontend
npm install
VITE_ACTIVE_TRIP_ID=<trip_id> npm run dev
```

Start realtime detection:

```bash
python integrate_cnn.py \
  --trip-id <trip_id> \
  --backend-url http://127.0.0.1:8000 \
  --sync-settings \
  --alert-frame-dir alert_frames
```

The detector defaults to `best_model_v2.h5` and `class_indices_v2.json`.

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
```

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

`npm run test` depends on a Node version that supports the configured TypeScript stripping flag.
