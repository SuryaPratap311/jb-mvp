import httpx
from fastapi import APIRouter

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
    """Return latest sync status from MongoDB, sorted by started_at descending."""
    from app.db import sync_status_collection, resumes_collection

    try:
        sync_coll = sync_status_collection()
        latest = await sync_coll.find_one(
            {},
            sort=[("started_at", -1)]
        )
        if latest:
            latest["_id"] = str(latest["_id"])
    except Exception:
        latest = None

    try:
        resume_coll = resumes_collection()
        total = await resume_coll.count_documents({})
    except Exception:
        total = 0

    if latest:
        return {
            "total_resumes": total,
            "sync_status": {
                "sync_id": latest.get("sync_id"),
                "status": latest.get("status"),
                "started_at": latest.get("started_at"),
                "files_total": latest.get("files_total"),
                "files_synced": latest.get("files_synced"),
                "message": latest.get("message"),
            }
        }
    return {"total_resumes": total, "sync_status": None}
