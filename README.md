# Automobile Specs (Flask API + React Frontend)

A production-style full-stack app for browsing, searching, comparing, and ranking car specifications.

- **Backend**: Flask + SQLAlchemy + JWT + Swagger (Flasgger)
- **Frontend**: React + TypeScript + Vite + React Query
- **Dataset flow**: raw CSV → processed JSON/CSV → imported into SQLite (`cars.db`)

## What’s in this repo

- **Browse** by brand → series → year
- **Search** by text query (`/cars/search`) and filter/sort cars (`/cars`)
- **Compare** cars side-by-side with “winning” metrics highlighted
- **Rankings** (top cars by horsepower, mpg, 0–100, top speed, torque, year)
- **Similar cars** recommendations for a given car
- **Auth** (register/login) + **Admin** create/update/delete cars
- **Frontend “AI Search”**: client-side natural-language parsing into filters + sort (no external LLM)

## Quickstart (Backend)

### 1) Create a venv + install deps

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2) (Optional) Configure environment variables

These are all optional for local development:

- `FLASK_ENV` = `development` or `production` (default: `development`)
- `DATABASE_URL` (default: `sqlite:///cars.db`)
- `SECRET_KEY` (default: dev value)
- `JWT_SECRET_KEY` (default: `SECRET_KEY`)
- `SWAGGER_HOST` (default: `127.0.0.1:5000`) – helps Swagger UI fetch the spec from the correct origin
- `ADMIN_USER` and `ADMIN_PASSWORD` – if set, an initial admin user is created on first run

Windows PowerShell example:

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASSWORD="secret"
$env:SWAGGER_HOST="127.0.0.1:5000"
```

### 3) Run the backend

```bash
python app.py
```

- API base path: `http://127.0.0.1:5000/api/v1`
- Swagger UI: `http://127.0.0.1:5000/apidocs/`

## (Backend API)

### Build + run with Docker Compose (recommended)

```bash
docker compose up --build
```

- API base path: `http://127.0.0.1:5000/api/v1`
- Swagger UI: `http://127.0.0.1:5000/apidocs/`

Notes:

- SQLite is persisted to `./instance/cars.db` via the `docker-compose.yml` volume.
- To create an initial admin user, set `ADMIN_USER` and `ADMIN_PASSWORD` in `docker-compose.yml` (or via your environment).

## Docker (Frontend Dev Server)

This repo includes a separate Docker container for the Vite dev server so you can start/stop backend and frontend independently in Docker Desktop.

Run only the backend:

```bash
docker compose up --build api
```

Run only the frontend:

```bash
docker compose up --build frontend
```

Run both:

```bash
docker compose up --build
```

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:5000/api/v1`
- Swagger UI: `http://127.0.0.1:5000/apidocs/`

### Build + run with plain Docker

```bash
docker build -t automobile-specs-api .
docker run --rm -p 5000:5000 \
   -e FLASK_ENV=production \
   -e DATABASE_URL=sqlite:////app/instance/cars.db \
   -e SWAGGER_HOST=localhost:5000 \
   -v "%cd%/instance:/app/instance" \
   automobile-specs-api
```

## Dataset pipeline

### Process raw CSV → processed dataset

Raw input lives at `data/raw/cars-dataset.csv`.

To regenerate the processed outputs:

```bash
python scripts/process_dataset.py
```

This writes:

- `data/processed/processed-dataset.csv`
- `data/processed/processed-dataset.json`

### Import processed dataset into the DB

```bash
python import_dataset.py
```

For a small test import:

```bash
python import_dataset.py --limit 100
```

Notes:

- Import writes into `cars.db` (SQLite) by default.
- The importer performs a lightweight “migration” on SQLite by adding any missing processed columns.
- The API uses a stored `raw_spec` JSON field for provenance; attendee-facing responses merge canonical DB columns over the raw spec.

## Quickstart (Frontend)

See the frontend README for full details: `frontend/README.md`.

Minimum steps:

1) Start the backend (`python app.py`)
2) Configure `frontend/.env` (or `frontend/.env.local`) with:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

3) Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Auth model

- `POST /api/v1/auth/register` → create user (`is_admin` optional)
- `POST /api/v1/auth/login` → returns `access_token`
- Send JWT with: `Authorization: Bearer <token>`

Admin routes require the JWT claim `is_admin=true`.

## API overview

All endpoints are under `/api/v1`.

### Cars (public)

- `GET /cars` – list cars (pagination + filtering + sorting)
   - Filters include: `q`, `brand`, `model`, `min_year`, `max_year`, `fuel_type`, `transmission`, `drive_type`, `cylinders`, `min_horsepower`, `max_horsepower`, `min_combined_mpg`, `max_combined_mpg`, `max_acceleration_0_100`, `min_vitesse_max`, `max_vitesse_max`, `min_torque_nm`, `max_torque_nm`
   - Pagination: `page`, `per_page`
   - Sorting: `sort_by` (default `id`), `order` (`asc`/`desc`)
- `GET /cars/<id>` – car details
- `GET /cars/search?q=...` – text search
- `POST /cars/compare` – compare cars
   - Provide `?ids=1,2,3` or JSON body `{"car_ids": [1,2,3]}`
- `GET /cars/stats` – dataset statistics
- `GET /cars/top/<metric>?limit=10` – rankings (metric examples: `horsepower`, `combined_mpg`, `acceleration_0_100`, `vitesse_max`, `torque_nm`, `year`)
- `GET /cars/<id>/similar?limit=10` – similar cars

### Browse + filter helpers (public)

- `GET /browse/brands`
- `GET /browse/brands/<brand>/series`
- `GET /browse/years`
- `GET /filter/by-brand/<brand>`
- `GET /filter/by-serie/<serie>`
- `GET /filter/by-year/<year>`
- `GET /cars/compare/by-brand/<brand>`
- `GET /cars/compare/by-serie/<serie>`
- `GET /cars/compare/by-year/<year>`

### Discovery metadata (public)

- `GET /available/metrics`
- `GET /available/brands`
- `GET /available/series`
- `GET /available/years`

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Admin (JWT required)

- `POST /admin/cars`
- `PUT /admin/cars/<id>`
- `DELETE /admin/cars/<id>`

## Project layout

- `app.py` – app factory + Flask setup + Swagger + JWT
- `routes/` – API blueprints (`auth`, `admin`, attendee/public)
- `services/` – business logic used by routes
- `models.py` – SQLAlchemy models
- `scripts/` – dataset processing + verification helpers
- `data/` – raw + processed datasets
- `frontend/` – React app

## Manual test scripts

The `tests/` directory contains runnable scripts (not a pytest suite).

Note: a couple scripts use the third-party `requests` package. If you want to run those, install it with `pip install requests`.

- `python tests/test_auth_admin.py` – end-to-end auth + admin create flow (starts a server on a test port)
- `python tests/test_search_endpoint.py` – quick search endpoint check
- `python tests/test_winning_metrics.py` – compare-by-serie winner metrics output

## Troubleshooting

- If Swagger UI loads but “Try it out” fails, set `SWAGGER_HOST` to match your server host/port.
- To reset local data, stop the server and delete `cars.db`, then re-run `python import_dataset.py`.
- If the frontend shows CORS/network errors, ensure `VITE_API_BASE_URL` points to `/api/v1` and the backend is running.
