from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.routers import auth, drive, match, resumes

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="GetDeveloper AI Match MVP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health():
    return {"status": "ok"}

# API Routers
app.include_router(auth.router)
app.include_router(drive.router)
app.include_router(resumes.router)
app.include_router(match.router)

# HTML page routes
@app.get("/")
async def root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "..", "recruiter-search.html"))

@app.get("/search")
async def search_page():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "..", "recruiter-search.html"))

@app.get("/results")
async def results_page():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "..", "recruiter-results.html"))

@app.get("/resume")
async def resume_page():
    return FileResponse(os.path.join(os.path.dirname(__file__), "..", "..", "recruiter-resume-detail.html"))

# Static assets — MUST be last
frontend_path = os.path.join(os.path.dirname(__file__), "..", "..")
if os.path.isdir(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")