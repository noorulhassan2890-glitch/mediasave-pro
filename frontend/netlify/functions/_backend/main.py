"""MediaSave Pro API — FastAPI application entry point.

Run locally:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import shutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_error_handlers
from .routers import download, media, process
from .services.jobs import manager

app = FastAPI(
    title="MediaSave Pro API",
    description="Free multi-platform social media downloader (Instagram, TikTok, Facebook, X, Threads, Pinterest).",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# CORS — lets the Next.js frontend (port 3000) call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(download.router, prefix="/api", tags=["download"])
app.include_router(media.router, prefix="/api", tags=["media"])
app.include_router(process.router, prefix="/api", tags=["process"])


@app.on_event("startup")
async def _start_jobs() -> None:
    manager.start()


@app.on_event("shutdown")
async def _stop_jobs() -> None:
    await manager.stop()


@app.get("/api/health", tags=["meta"])
async def health() -> dict:
    """Liveness check + feature availability (used by the frontend banner)."""
    return {
        "status": "ok",
        "gif_conversion": shutil.which(settings.FFMPEG_BIN) is not None,
        "supported": ["youtube", "instagram", "tiktok", "facebook", "twitter", "threads", "pinterest"],
    }


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "mediasave-pro-api", "docs": "/docs"}

