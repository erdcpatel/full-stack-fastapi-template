from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from app.models import UserPublic

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/login/access-token",
    auto_error=False,
)


def get_dummy_user() -> UserPublic:
    """Returns dummy user details without requiring any database."""
    return UserPublic(
        id="demo-admin-id",
        email="admin@example.com",
        full_name="Demo Administrator",
        is_active=True,
        is_superuser=True,
    )


async def get_current_user(
    token: Annotated[str | None, Depends(reusable_oauth2)] = None,
) -> UserPublic:
    return get_dummy_user()


CurrentUser = Annotated[UserPublic, Depends(get_current_user)]
