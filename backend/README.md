# Backend API

FastAPI application with zero database dependency and external authentication integration.

---

## Run Locally

```bash
/Users/dhavalpatel/workspace/venv/py313/bin/uvicorn app.main:app --reload --app-dir backend --port 8000
```

- API Docs: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health Check: <http://localhost:8000/api/v1/utils/health-check/>

---

## Run Tests

```bash
PYTHONPATH=. /Users/dhavalpatel/workspace/venv/py313/bin/pytest tests
```
