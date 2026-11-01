from typing import Any
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings

ALGORITHM = "HS256"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token if SECRET_KEY is configured,
    or decode payload without verification if validating elsewhere."""
    try:
        if settings.SECRET_KEY:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        # If no secret key is provided, decode unverified payload claims
        return jwt.decode(token, options={"verify_signature": False})
    except InvalidTokenError:
        return None
