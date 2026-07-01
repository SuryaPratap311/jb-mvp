from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

_settings = get_settings()
_client: AsyncIOMotorClient = None
_database = None


def _get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(_settings.MONGODB_URI)
    return _client


def get_db():
    global _database
    if _database is None:
        _database = _get_client().get_default_database()
    return _database


def users_collection():
    return get_db().get_collection("users")


def resumes_collection():
    return get_db().get_collection("resumes")


def matches_collection():
    return get_db().get_collection("matches")


async def ensure_indexes():
    try:
        await users_collection().create_index("google_id", unique=True)
        await users_collection().create_index("email", unique=True)
        await resumes_collection().create_index("drive_file_id")
        await resumes_collection().create_index("user_id")
        await resumes_collection().create_index([("user_id", 1), ("updated_at", -1)])
        await matches_collection().create_index("user_id")
        await matches_collection().create_index([("user_id", 1), ("created_at", -1)])
    except Exception as e:
        print(f"[WARN] Could not ensure indexes: {e}")