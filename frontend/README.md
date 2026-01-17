# Automobile Specs Frontend

Production-style React + TypeScript frontend for the Flask API (base path: `/api/v1`).

## Requirements

- Node.js 18+ and npm (or pnpm/yarn)
- Backend running (Flask) e.g. `http://127.0.0.1:5000`

> Note: This repo environment previously did not have `npm` installed. The codebase is still complete, but you must install Node tooling to run it.

## Configure

Copy `.env.example` to `.env` and set the API base URL:

- `VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1`

## Run

```bash
cd frontend
npm install
npm run dev
```

## Architecture (strict layering)

- `src/api/*`: 1:1 HTTP wrappers for backend endpoints (no UI logic)
- `src/services/*`: business logic + orchestration (used by pages)
- `src/pages/*`: route-level screens; uses React Query + services
- `src/components/*`: reusable UI/components (no API calls inside)

Auth:

- JWT token stored in `localStorage`
- `src/app/auth/AuthProvider.tsx` exposes `useAuth()`
- Admin endpoints automatically attach `Authorization: Bearer <token>` via `adminService`

## Implemented screens

- Search: finds cars and shows IDs
- Compare: compares multiple IDs and highlights winning metrics
- Browse: brands/series/years discovery
- Rankings: top cars by metric
- Auth: register/login
- Admin: create car (requires admin token)

## Backend endpoints used

- Public: `/cars`, `/cars/:id`, `/cars/search?q=…`, `/cars/compare`, `/cars/top/:metric`, `/browse/*`, `/available/*`
- Auth: `/auth/register`, `/auth/login`
- Admin: `/admin/cars` (create), `/admin/cars/:id` (update/delete)
