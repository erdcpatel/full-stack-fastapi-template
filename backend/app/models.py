import uuid
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: str = "demo-admin-id"
    email: EmailStr = "admin@example.com"
    full_name: str | None = "Demo Administrator"
    is_active: bool = True
    is_superuser: bool = True


class UsersPublic(BaseModel):
    data: list[UserPublic]
    count: int


class Message(BaseModel):
    message: str


class ItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class ItemPublic(ItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str = "demo-admin-id"


class ItemsPublic(BaseModel):
    data: list[ItemPublic]
    count: int
