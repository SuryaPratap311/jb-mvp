# backend/app/routers/drive.py
import httpx
import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.db import sync_status_collection

router = APIRouter(prefix="/api/drive", tags=["drive"])
settings = get_settings()


async def _trigger_n8n_and_track(sync_id: str):
    """Runs in background — calls n8n and handles errors."""
    coll = sync_status_collection()
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(settings.n8n_sync_url, json={"action": "sync", "sync_id": sync_id})
            resp.raise_for_status()
    except Exception as e:
        # n8n failed to even start — mark as failed
        await coll.update_one(
            {"sync_id": sync_id},
            {"$set": {"status": "failed", "message": str(e), "completed_at": datetime.now(timezone.utc)}}
        )

@router.post("/sync/reset")
async def reset_sync():
    coll = sync_status_collection()
    await coll.update_many(
        {"status": {"$in": ["pending", "running"]}},
        {"$set": {"status": "failed", "message": "Manually reset"}}
    )
    return {"ok": True}

@router.post("/sync")
async def sync_drive():
    """Trigger n8n workflow. Returns immediately with a sync_id to poll."""
    coll = sync_status_collection()

    # Prevent duplicate concurrent syncs
    in_progress = await coll.find_one({"status": {"$in": ["pending", "running"]}})
    if in_progress:
        return {
            "message": "Sync already in progress",
            "sync_id": in_progress["sync_id"],
            "status": in_progress["status"],
            "already_running": True,
        }

    sync_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await coll.insert_one({
        "sync_id": sync_id,
        "status": "pending",
        "started_at": now,
        "files_total": None,
        "files_synced": 0,
        "message": "Waiting for pipeline to start...",
    })

    # Fire and forget — don't await
    asyncio.create_task(_trigger_n8n_and_track(sync_id))

    return {
        "message": "Sync started",
        "sync_id": sync_id,
        "status": "pending",
        "already_running": False,
    }


@router.get("/status")
async def sync_status():
    """Return latest sync status."""
    from app.db import resumes_collection

    coll = sync_status_collection()
    latest = await coll.find_one({}, sort=[("started_at", -1)])
    if latest:
        latest["_id"] = str(latest["_id"])

    try:
        total = await resumes_collection().count_documents({})
    except Exception:
        total = 0

    return {
        "total_resumes": total,
        "sync_status": {
            "sync_id": latest.get("sync_id") if latest else None,
            "status": latest.get("status") if latest else None,   # pending|running|completed|failed
            "started_at": latest.get("started_at") if latest else None,
            "files_total": latest.get("files_total") if latest else None,
            "files_synced": latest.get("files_synced") if latest else None,
            "message": latest.get("message") if latest else None,
        } if latest else None
    }

from pydantic import BaseModel
from typing import Optional

class SyncUpdatePayload(BaseModel):
    sync_id: str
    status: str
    message: Optional[str] = None
    files_total: Optional[int] = None
    files_synced: Optional[int] = None

@router.post("/sync/update")
async def update_sync_status(payload: SyncUpdatePayload):
    """Called by n8n to update pipeline progress."""
    coll = sync_status_collection()
    update_data = {"status": payload.status}
    if payload.message: update_data["message"] = payload.message
    if payload.files_total is not None: update_data["files_total"] = payload.files_total
    if payload.files_synced is not None: update_data["files_synced"] = payload.files_synced
    if payload.status in ("completed", "failed"):
        update_data["completed_at"] = datetime.now(timezone.utc)

    await coll.update_one({"sync_id": payload.sync_id}, {"$set": update_data})
    return {"ok": True}

