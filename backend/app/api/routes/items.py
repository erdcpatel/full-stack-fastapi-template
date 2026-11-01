import uuid
from fastapi import APIRouter
from app.api.deps import CurrentUser
from app.models import ItemCreate, ItemPublic, ItemsPublic

router = APIRouter(prefix="/items", tags=["items"])

# In-memory store for demonstration
_ITEMS: list[ItemPublic] = [
    ItemPublic(
        id=str(uuid.uuid4()),
        title="Welcome to your new project",
        description="This is a lightweight in-memory item without any database dependency.",
        owner_id="demo-admin-id",
    ),
    ItemPublic(
        id=str(uuid.uuid4()),
        title="External Auth Ready",
        description="Authentication is delegated to dummy/external auth providers.",
        owner_id="demo-admin-id",
    ),
]


@router.get("/", response_model=ItemsPublic)
async def read_items(current_user: CurrentUser) -> ItemsPublic:
    """Retrieve items."""
    return ItemsPublic(data=_ITEMS, count=len(_ITEMS))


@router.post("/", response_model=ItemPublic)
async def create_item(item_in: ItemCreate, current_user: CurrentUser) -> ItemPublic:
    """Create new item."""
    item = ItemPublic(
        id=str(uuid.uuid4()),
        title=item_in.title,
        description=item_in.description,
        owner_id=current_user.id,
    )
    _ITEMS.append(item)
    return item
