from fastapi import APIRouter

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("")
async def list_resumes():
    """Placeholder: list synced resumes."""
    return []