import httpx
from fastapi import APIRouter, Request

from app.config import get_settings

router = APIRouter(prefix="/api/drive", tags=["drive"])
settings = get_settings()


@router.post("/sync")
async def sync_drive():
    """Trigger n8n workflow to sync Google Drive resumes."""
    payload = {"action": "sync"}

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(settings.n8n_sync_url, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"error": str(e), "n8n_url": settings.n8n_sync_url}


@router.get("/status")
async def sync_status():
    """Return placeholder status."""
    return {"total_resumes": 0, "last_sync": None}