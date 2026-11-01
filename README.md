# Lightweight FastAPI + Vite Starter (No Database / External Auth)

A clean, lightweight starter template with **FastAPI** on the backend and **React + Vite** on the frontend, completely free of Docker, database, and local password/user management dependencies.

Authentication is designed to be delegated to an **external Auth API / Identity Provider** (e.g. Auth0, Clerk, Cognito, Firebase, or your own auth microservice).

---

## Architecture & Features

- ⚡ **FastAPI Backend**:
  - **Zero Database Dependency**: No PostgreSQL, SQLite, SQLAlchemy, SQLModel, or Alembic migrations.
  - **Pure Pydantic v2**: Clean data validation and settings schemas.
  - **External Auth Ready**: Dependency in `backend/app/api/deps.py` verifies Bearer tokens via your external Auth service URL or JWT signature.
  - **Interactive API Documentation**: Swagger UI at `/docs` and ReDoc at `/redoc`.
- 🚀 **React + Vite Frontend**:
  - TypeScript, Tailwind CSS, TanStack Router & Query.
  - Can be served directly by FastAPI or run with hot-reload via Vite.
- 🧪 **Pytest Suite**: Fast unit and integration tests (`pytest backend/tests`).

---

## Quickstart

### 1. Run the Backend API

From the project root using your Python interpreter:

```bash
/Users/dhavalpatel/workspace/venv/py313/bin/uvicorn app.main:app --reload --app-dir backend --port 8000
```

- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/v1/utils/health-check/](http://localhost:8000/api/v1/utils/health-check/)

---

### 2. Run the Frontend

#### Development with Hot Reload:
```bash
npm --prefix frontend run dev
```
Open [http://localhost:5173](http://localhost:5173).

#### Production Build (Served by FastAPI):
```bash
npm --prefix frontend run build
```
Once built, open [http://localhost:8000](http://localhost:8000) directly.

---

### 3. Run Tests

```bash
PYTHONPATH=backend /Users/dhavalpatel/workspace/venv/py313/bin/pytest backend/tests
```

---

## Configuration (`.env`)

- `PROJECT_NAME`: Title shown in API docs.
- `FRONTEND_HOST`: Allowed CORS origin for the Vite dev server.
- `AUTH_API_URL`: (Optional) URL of your external auth verification endpoint. When provided, incoming tokens are verified against this URL.
- `SECRET_KEY`: (Optional) Secret key if verifying HMAC JWT tokens locally.
