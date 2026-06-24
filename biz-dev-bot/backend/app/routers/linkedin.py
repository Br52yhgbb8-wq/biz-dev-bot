from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.linkedin import (
    LinkedInSearchRequest,
    LinkedInSearchResult,
    LinkedInProfileRequest,
    LinkedInProfileResponse,
    LinkedInExportRequest,
    LinkedInExportResponse,
    LinkedInStatusResponse,
)
from app.services.linkedin import linkedin_browser, PLAYWRIGHT_AVAILABLE

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


@router.get("/status", response_model=LinkedInStatusResponse)
async def linkedin_status(_: str = Depends(get_current_user)):
    """Check LinkedIn browser and login status."""
    logged_in = False
    if linkedin_browser.is_running:
        try:
            logged_in = await linkedin_browser.is_logged_in
        except Exception:
            pass
    return LinkedInStatusResponse(
        browser_running=linkedin_browser.is_running,
        logged_in=logged_in,
        playwright_available=PLAYWRIGHT_AVAILABLE,
    )


@router.post("/connect")
async def linkedin_connect(_: str = Depends(get_current_user)):
    """Launch browser for LinkedIn. Opens a browser window to log in."""
    if not PLAYWRIGHT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Playwright is not installed. Run: pip install playwright && playwright install chromium",
        )
    try:
        msg = await linkedin_browser.start(headless=False)
        return {"message": msg}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to launch browser: {str(e)}",
        )


@router.post("/disconnect")
async def linkedin_disconnect(_: str = Depends(get_current_user)):
    """Close the LinkedIn browser."""
    await linkedin_browser.stop()
    return {"message": "Browser closed"}


@router.post("/search", response_model=list[LinkedInSearchResult])
async def linkedin_search(
    req: LinkedInSearchRequest,
    _: str = Depends(get_current_user),
):
    """Search LinkedIn for people matching criteria."""
    try:
        results = await linkedin_browser.search_people(
            keywords=req.keywords,
            location=req.location,
            limit=req.limit,
        )
        return [LinkedInSearchResult(**r) for r in results]
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.post("/profile", response_model=LinkedInProfileResponse)
async def linkedin_profile(
    req: LinkedInProfileRequest,
    _: str = Depends(get_current_user),
):
    """Get detailed profile data from a LinkedIn URL."""
    try:
        profile = await linkedin_browser.get_profile(req.profile_url)
        return LinkedInProfileResponse(**profile)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile extraction failed: {str(e)}",
        )


@router.post("/export", response_model=LinkedInExportResponse)
async def linkedin_export(
    req: LinkedInExportRequest,
    _: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export LinkedIn search results to CRM contacts."""
    try:
        results = [r.model_dump() for r in req.results]
        result = await linkedin_browser.export_to_crm(results, db)
        return LinkedInExportResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}",
        )
