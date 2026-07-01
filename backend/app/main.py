from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import auth, drive, match, resumes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="GetDeveloper AI Match MVP",
    description="Proxy backend: serves frontend and forwards to n8n webhooks",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: allow all origins for MVP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check (must be before static files mount)
@app.get("/health")
def health():
    return {"status": "ok"}

# API Routers
app.include_router(auth.router)
app.include_router(drive.router)
app.include_router(resumes.router)
app.include_router(match.router)

# Serve frontend static files (must be last)
import os

frontend_path = os.path.join(os.path.dirname(__file__), "..", "..")
if os.path.isdir(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")