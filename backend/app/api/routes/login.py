from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import CurrentUser
from app.models import Token, UserPublic

router = APIRouter(tags=["login"])


@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()] = None,
) -> Token:
    """Accepts any login and returns a dummy access token without database dependency."""
    return Token(access_token="dummy-demo-token-123456", token_type="bearer")


@router.post("/login/test-token", response_model=UserPublic)
async def test_token(current_user: CurrentUser) -> UserPublic:
    """Test access token validity."""
    return current_user
