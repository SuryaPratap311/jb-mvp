from fastapi import APIRouter, HTTPException
from bson import ObjectId

from app.db import resumes_collection

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("")
async def list_resumes():
    """Placeholder: list synced resumes."""
    return []


@router.get("/{resume_id}")
async def get_resume(resume_id: str):
    """Fetch a single resume by drive_file_id or MongoDB _id. Excludes embedding."""
    coll = resumes_collection()
    try:
        resume = await coll.find_one({"_id": ObjectId(resume_id)})
    except Exception:
        resume = await coll.find_one({"drive_file_id": resume_id})

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Exclude embedding from response
    resume.pop("embedding", None)
    resume["_id"] = str(resume["_id"])
    return resume