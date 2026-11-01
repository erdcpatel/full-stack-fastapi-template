from fastapi import APIRouter
from app.api.deps import CurrentUser
from app.models import UserPublic, UsersPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def read_user_me(current_user: CurrentUser) -> UserPublic:
    """Get current user details."""
    return current_user


@router.get("/", response_model=UsersPublic)
async def read_users(current_user: CurrentUser) -> UsersPublic:
    """Retrieve list of users."""
    return UsersPublic(data=[current_user], count=1)
