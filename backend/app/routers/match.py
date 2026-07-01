import httpx
from fastapi import APIRouter, Request

from app.config import get_settings

router = APIRouter(prefix="/api/match", tags=["match"])
settings = get_settings()


@router.post("")
async def match_candidates(request: Request):
    """Receive JD from frontend, send to n8n webhook, return ranked candidates."""
    
    # Try to get body as form data first (HTML form submission)
    body = {}
    try:
        form_data = await request.form()
        if form_data:
            body = dict(form_data)
    except:
        pass
    
    # If no form data, try JSON
    if not body:
        try:
            body = await request.json()
        except:
            pass
    
    # Get JD from body or query params
    jd_text = body.get("jd", "").strip()
    if not jd_text:
        # Try to get from query params
        jd_text = str(request.query_params.get("jd", "")).strip()
    
    if not jd_text:
        return {"error": "Job description is required"}

    payload = {
        "jd": jd_text,
        "filters": {
            "min_experience": body.get("min_experience"),
            "budget": body.get("budget"),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(settings.n8n_match_url, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"error": str(e), "n8n_url": settings.n8n_match_url}