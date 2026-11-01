import uuid
from typing import Any
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: str = "demo-admin-id"
    email: EmailStr = "admin@example.com"
    full_name: str | None = "Demo Administrator"
    role: str = "admin"  # "admin", "analyst", or "viewer"
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


# Analytics & Polars Grid Models
class AnalyticsRecord(BaseModel):
    id: str
    timestamp: str
    customer: str
    category: str
    region: str
    status: str
    amount: float
    duration_ms: int


class FacetCount(BaseModel):
    name: str
    count: int


class AnalyticsFacets(BaseModel):
    categories: list[FacetCount]
    regions: list[FacetCount]
    statuses: list[FacetCount]


class AnalyticsMetrics(BaseModel):
    total_volume: float
    avg_amount: float
    total_records: int
    success_rate: float


class AnalyticsGridResponse(BaseModel):
    items: list[AnalyticsRecord]
    total_count: int
    page: int
    total_pages: int
    facets: AnalyticsFacets
    metrics: AnalyticsMetrics


class AuditRecord(BaseModel):
    id: str
    timestamp: str
    actor: str
    role: str
    action: str
    target: str
    ip_address: str
    status: str
