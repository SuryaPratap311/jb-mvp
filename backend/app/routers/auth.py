from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
def google_login():
    return {"message": "Please connect your Google Drive in n8n workflow settings"}


@router.get("/status")
def auth_status():
    return {"connected": True, "message": "Drive sync via n8n"}