from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.search import GlobalSearchResponse
from app.services.search import SearchService

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Search across contacts, emails, and activities with a single query."""
    svc = SearchService(db)
    return await svc.global_search(q, limit=limit)
