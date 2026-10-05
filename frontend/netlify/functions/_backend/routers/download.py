"""POST /api/download — analyse a link and return media info + formats."""

from __future__ import annotations

import re

from fastapi import APIRouter

from ..errors import ApiError
from ..models import DownloadRequest, MediaResult
from ..services import extractor

router = APIRouter()

# Cheap sanity check before we spend a worker thread on yt-dlp.
_URL_RE = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)


@router.post("/download", response_model=MediaResult)
async def download(req: DownloadRequest) -> MediaResult:
    """Analyse a social media URL.

    Returns title, thumbnail, duration, quality tiers (Normal/High/Original)
    with direct URLs + file sizes, plus an audio-only option.
    """
    url = (req.url or "").strip()
    if not url or not _URL_RE.match(url):
        raise ApiError("invalid_url", status_code=400)

    return await extractor.extract(url)
