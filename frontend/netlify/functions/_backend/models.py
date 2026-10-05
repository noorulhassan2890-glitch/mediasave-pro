"""Pydantic request/response models — the JSON contract with the frontend."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class DownloadRequest(BaseModel):
    url: str = Field(..., description="Full social media post/reel/video URL")


class FormatOption(BaseModel):
    """One selectable download option (a quality tier, or the audio track)."""

    id: str                      # "normal" | "high" | "original" | "audio"
    label: str                   # "Normal" | "High" | "Original" | "Audio"
    quality: str                 # "480p", "720p", "1080p", "MP3 / best audio"
    ext: str                     # "mp4", "m4a", "mp3", ...
    filesize: Optional[int] = None       # bytes (null when the CDN doesn't say)
    filesize_approx: bool = False        # true when yt-dlp estimated the size
    has_audio: bool = True               # false for video-only (DASH) streams
    url: str                     # direct CDN URL (frontend proxies via /api/file)
    note: Optional[str] = None   # optional extra hint shown in the UI
    bitrate: Optional[int] = None        # kbps — used for size estimation
    method: Literal["direct", "convert"] = "direct"
    # "direct"  -> serve url as-is through /api/file
    # "convert" -> pass through /api/convert (ffmpeg: MP3 / GIF)
    # --- size / quality preview (kept separate from the fields above so older
    #     clients that only read filesize/has_audio keep working) ---
    height: Optional[int] = None         # pixels (None for audio-only options)
    fps: Optional[float] = None          # frames per second
    codec: Optional[str] = None          # short display name: "H.264", "VP9", "AV1"
    container: Optional[str] = None      # container the user actually gets ("mp4" after merge)
    size_bytes: Optional[int] = None     # total size of the delivered file (merged video+audio for DASH)
    size_is_estimate: bool = False       # true when computed (tbr*duration) instead of reported
    has_audio_merge: bool = False        # true when the backend joins a separate audio stream


class MediaResult(BaseModel):
    platform: str                          # instagram | tiktok | facebook | twitter | threads | pinterest | other
    platform_name: str                     # "Instagram", "TikTok", ...
    title: str
    author: Optional[str] = None
    duration: Optional[int] = None         # seconds
    thumbnail: Optional[str] = None
    media_type: Literal["video", "image", "carousel", "audio"] = "video"
    is_story: bool = False                 # true when the URL points at a story/highlight
    webpage_url: str
    formats: list[FormatOption]            # quality tiers (video)
    audio: Optional[FormatOption] = None   # audio-only option
    images: list[str] = []                 # direct URLs for carousels / photo posts
    requires_login: bool = False           # hint shown when content looks restricted


class ZipItem(BaseModel):
    url: str
    filename: str


class ZipRequest(BaseModel):
    name: str = "mediasave-download"
    items: list[ZipItem]


class ConvertRequest(BaseModel):
    url: str
    kind: Literal["gif", "mp3"]
    filename: Optional[str] = None
    # GIF tuning (all optional, sensible defaults applied server-side)
    start: float = 0            # seconds into the clip
    length: float = 6           # seconds of the clip to convert
    fps: int = 12
    width: int = 480


class ProcessSource(BaseModel):
    """Same params GET /api/file takes — the file to process."""

    url: str
    filename: Optional[str] = None
    audio: Optional[str] = None   # separate DASH audio stream to merge first


class ProcessOptions(BaseModel):
    # status mode: trim length from the start (None = full length)
    max_seconds: Optional[Literal[15, 30, 60]] = None
    # compress mode: target output size in MB
    target_mb: Optional[float] = None


class ProcessRequest(BaseModel):
    source: ProcessSource
    mode: Literal["status", "compress"]
    options: ProcessOptions = ProcessOptions()
