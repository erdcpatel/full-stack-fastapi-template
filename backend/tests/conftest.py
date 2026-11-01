from collections.abc import Generator
from datetime import datetime, timezone, timedelta
import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import ALGORITHM
from app.main import app


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers() -> dict[str, str]:
    payload = {
        "sub": "user-test-123",
        "email": "testuser@example.com",
        "name": "Test User",
        "is_active": True,
        "is_superuser": False,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    secret = settings.SECRET_KEY or "testsecret"
    token = jwt.encode(payload, secret, algorithm=ALGORITHM)
    return {"Authorization": f"Bearer {token}"}
