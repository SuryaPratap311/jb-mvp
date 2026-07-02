import httpx
from fastapi import APIRouter, HTTPException

from app.config import get_settings

router = APIRouter(prefix="/api/drive", tags=["drive"])
settings = get_settings()


@router.post("/sync")
async def sync_drive():
    """Create a sync_status doc, then trigger n8n workflow with the sync_id."""
    from app.db import sync_status_collection
    from datetime import datetime

    sync_coll = sync_status_collection()

    # Check if a sync is already in progress
    existing = await sync_coll.find_one({"status": "in_progress"})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A sync is already in progress. Please wait for it to complete."
        )

    # Create sync_status doc with a unique sync_id
    sync_id = str(int(datetime.utcnow().timestamp() * 1000))
    doc = {
        "sync_id": sync_id,
        "status": "in_progress",
        "started_at": datetime.utcnow().isoformat(),
        "files_total": 0,
        "files_synced": 0,
        "message": "Sync started",
    }
    await sync_coll.insert_one(doc)

    # Trigger n8n with the sync_id so it can update the same doc
    payload = {"action": "sync", "sync_id": sync_id}

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(settings.n8n_sync_url, json=payload)
            resp.raise_for_status()
            return {"sync_id": sync_id, "status": "triggered"}
    except Exception as e:
        # Mark as failed
        await sync_coll.update_one(
            {"sync_id": sync_id},
            {"$set": {"status": "failed", "message": str(e)}}
        )
        raise HTTPException(status_code=502, detail=f"Sync trigger failed: {e}")


@router.get("/status")
async def sync_status():
    """Return latest sync status, or status for a specific sync_id."""
    from app.db import sync_status_collection, resumes_collection

    try:
        resume_coll = resumes_collection()
        total = await resume_coll.count_documents({})
    except Exception:
        total = 0

    try:
        sync_coll = sync_status_collection()
        latest = await sync_coll.find_one(
            {},
            sort=[("started_at", -1)]
        )
        if latest:
            latest["_id"] = str(latest["_id"])
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
    except Exception:
        pass

    return {"total_resumes": total, "sync_status": None}