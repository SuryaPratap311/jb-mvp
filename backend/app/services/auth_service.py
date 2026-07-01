from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request
from google_auth_oauthlib.flow import Flow
from jose import JWTError, jwt

from app.config import get_settings
from app.db import users_collection
from app.models.user import User

settings = get_settings()
ALGORITHM = "HS256"
COOKIE_MAX_AGE = 7 * 86400  # 7 days


def create_google_flow():
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=settings.google_scopes,
        redirect_uri=settings.google_redirect_uri,
    )


def get_google_auth_url() -> str:
    flow = create_google_flow()
    url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true",
    )
    return url


def exchange_code(code: str):
    flow = create_google_flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")
    return flow.credentials


def create_session_cookie(google_id: str) -> str:
    expire = datetime.utcnow() + timedelta(seconds=COOKIE_MAX_AGE)
    return jwt.encode(
        {"sub": google_id, "exp": expire},
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_session_cookie(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    google_id = decode_session_cookie(token)
    if not google_id:
        raise HTTPException(status_code=401, detail="Session expired")

    doc = await users_collection().find_one({"google_id": google_id})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")

    return User(**doc)


async def save_user(user_info: dict, refresh_token: Optional[str] = None) -> User:
    google_id = user_info.get("sub")
    doc = {
        "google_id": google_id,
        "email": user_info.get("email", ""),
        "name": user_info.get("name", ""),
        "picture": user_info.get("picture", ""),
        "updated_at": datetime.utcnow(),
    }
    if refresh_token:
        doc["refresh_token"] = refresh_token

    await users_collection().update_one(
        {"google_id": google_id},
        {"$set": doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True,
    )

    updated = await users_collection().find_one({"google_id": google_id})
    return User(**updated)