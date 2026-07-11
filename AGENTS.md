# Repository Guidelines

## Project Structure & Module Organization

This repository combines a realtime drowsiness detector, a FastAPI backend, and a Vite/React frontend.

- `integrate_cnn.py` is the compatibility launcher; `integrate_cnn_with_events.py` contains the event-enabled detector runtime.
- `detector_backend.py` posts detector snapshots, frames, alerts, and settings requests to the API.
- `backend/` contains the FastAPI app, with routes in `backend/api/routes/`, domain services in `backend/services/`, repositories in `backend/repositories/`, and database helpers in `backend/db/`.
- `frontend/src/app/` contains the React app modules: `pages/`, `services/`, `auth/`, `types/`, `utils/`, and shared UI under `component/`.
- `tests/` holds Python unit/integration tests. `frontend/tests/` holds Node-based frontend tests.
- `database/drowsiness_safety_db_schema.sql` is the canonical PostgreSQL schema. Model and runtime assets live at the repo root and in `audio/`.

## Build, Test, and Development Commands

Install dependencies:

```bash
pip install -r requirements.txt -r backend/requirements.txt
cd frontend && npm install
```

Run services locally:

```bash
python -m uvicorn backend.app:app --reload
cd frontend && npm run dev
python integrate_cnn.py --camera 1 --model best_model_v2.h5 --class-json class_indices_v2.json
```

Validate database schema:

```bash
python -m backend.db.schema validate
```

Agent note: local instructions ask shell commands to be prefixed with `rtk`, for example `rtk git status`.

## Coding Style & Naming Conventions

Use Python 4-space indentation, snake_case modules/functions, and PascalCase for Pydantic-style models and classes. Keep backend logic layered: routes validate HTTP boundaries, services own business rules, repositories own SQL/database access. Frontend code uses TypeScript/React with PascalCase components, camelCase functions, and feature folders under `frontend/src/app/`.

## Testing Guidelines

Run Python tests from the repository root:

```bash
python -m unittest discover -s tests
```

Run frontend checks from `frontend/`:

```bash
npm run lint
npm run build
npm run test
```

Name Python tests `test_*.py` and frontend tests `*.test.mjs`. Add focused tests for new API routes, services, detector publishing behavior, and frontend API mapping.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, sometimes with conventional prefixes, such as `feat: implement detection camera` or `Fix integration detector CLI help test`. Keep subjects concise and explain the behavior change.

Pull requests should include a summary, test results, database/configuration notes, linked issues when relevant, and screenshots for frontend UI changes. Never commit `.env`, generated logs, local virtual environments, or dependency folders.

[[RTK.md]]
