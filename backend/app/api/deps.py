from typing import Annotated
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from app.models import UserPublic

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/login/access-token",
    auto_error=False,
)


def get_user_for_role(role: str | None = None) -> UserPublic:
    """Returns dummy user details based on role ('admin', 'analyst', 'viewer')."""
    role_clean = role.lower() if role else "admin"
    if role_clean not in ["admin", "analyst", "viewer"]:
        role_clean = "admin"

    names = {
        "admin": "Demo Administrator",
        "analyst": "Demo Data Analyst",
        "viewer": "Demo Read-Only Viewer",
    }
    return UserPublic(
        id=f"demo-{role_clean}-id",
        email=f"{role_clean}@example.com",
        full_name=names[role_clean],
        role=role_clean,
        is_active=True,
        is_superuser=(role_clean == "admin"),
    )


async def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(reusable_oauth2)] = None,
) -> UserPublic:
    # Role can be dynamically switched via X-User-Role header or defaults to 'admin'
    role_header = request.headers.get("x-user-role", "admin")
    return get_user_for_role(role_header)


CurrentUser = Annotated[UserPublic, Depends(get_current_user)]
