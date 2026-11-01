# Project Development Guide

A clean local development setup with **FastAPI** on the backend and **React + Vite** on the frontend. No Docker, no database servers, and purely npm-driven.

---

## 1. Local Development

### Start the Backend
From the repository root:

```bash
/Users/dhavalpatel/workspace/venv/py313/bin/uvicorn app.main:app --reload --app-dir backend --port 8000
```

- Backend API: <http://localhost:8000>
- Swagger UI Documentation: <http://localhost:8000/docs>
- Health Check: <http://localhost:8000/api/v1/utils/health-check/>

---

### Start the Frontend (Vite Dev Server)
In a separate terminal, run:

```bash
npm run dev
```

- Frontend App: <http://localhost:5173>
- Hot reload is enabled automatically.

---

### Frontend Build (Pure npm)
To build the frontend for production:

```bash
npm run build
```

This compiles the React application into `backend/app/frontend`. When you run the FastAPI backend, it serves this built application directly at <http://localhost:8000>.

---

## 2. Running Tests

```bash
PYTHONPATH=backend /Users/dhavalpatel/workspace/venv/py313/bin/pytest backend/tests
```

---

## 3. Configuration (`.env`)

The `.env` file at the root holds local settings:
- `PROJECT_NAME`: Display name of your project.
- `FRONTEND_HOST`: Allowed CORS origin for Vite dev server (`http://localhost:5173`).
- `AUTH_API_URL`: (Optional) URL of your external auth verification endpoint.
- `SECRET_KEY`: (Optional) Secret key for JWT verification.
