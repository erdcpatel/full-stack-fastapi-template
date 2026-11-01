from fastapi import APIRouter
from app.models import Message

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check() -> bool:
    return True


@router.get("/ping", response_model=Message)
async def ping() -> Message:
    return Message(message="pong")
