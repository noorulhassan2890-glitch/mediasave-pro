"""yt-dlp extraction: URL -> clean, frontend-friendly JSON.

Flow:
  1. detect the platform
  2. run yt-dlp (in a worker thread, with a timeout)
  3. classify the media (video / image / carousel / audio)
  4. collapse yt-dlp's long format list into 1-3 quality tiers
     (Normal / High / Original) + an audio-only option
"""

from __future__ import annotations

import asyncio
from typing import Any

import yt_dlp

from ..config import settings
from ..errors import ApiError
from ..models import FormatOption, MediaResult
from .platforms import detect_platform, is_story_url

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp"}

# Options shared by every extraction. skip_download keeps it fast:
# we only ask yt-dlp for metadata + direct file URLs.
_BASE_OPTS: dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "skip_download": True,
    "socket_timeout": 20,
    "retries": 2,
    "nocheckcertificate": True,
}

_TIER_IDS = {
    1: ["original"],
    2: ["normal", "original"],
    3: ["normal", "high", "original"],
}
_TIER_LABELS = {
    1: ["Best available"],
    2: ["Normal", "Original"],
    3: ["Normal", "High", "Original"],
}


# --------------------------------------------------------------------------- #
# Error mapping (yt-dlp raises DownloadError with a plain string)
# --------------------------------------------------------------------------- #
def _map_error(message: str) -> ApiError:
    m = message.lower()

    if any(k in m for k in ("sign in", "log in", "login", "private", "confirm your age",
                            "members-only", "authentication", "cookies")):
        return ApiError("private_content", status_code=403)
    if "not available in your country" in m or "geo" in m and "restricted" in m:
        return ApiError("geo_restricted", status_code=451)
    if "unsupported url" in m or "no supported url" in m:
        return ApiError("unsupported_url", status_code=404)
    if any(k in m for k in ("unavailable", "does not exist", "not found",
                            "has been removed", "404")):
        return ApiError("link_not_found", status_code=404)
    return ApiError("extract_failed", f"Source said: {message[:200]}", status_code=502)


def _extract_sync(url: str) -> dict[str, Any]:
    opts = dict(_BASE_OPTS)
    if settings.COOKIE_FILE:
        opts["cookiefile"] = settings.COOKIE_FILE

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    if not isinstance(info, dict):
        raise ApiError("link_not_found", status_code=404)
    return info


# --------------------------------------------------------------------------- #
# Format helpers
# --------------------------------------------------------------------------- #
def _is_streaming(f: dict[str, Any]) -> bool:
    """m3u8/mpd are playlists, not single files — exclude them from tiers."""
    proto = str(f.get("protocol") or "")
    return proto.startswith("m3u8") or proto.startswith("http_dash")


def _pick_heights(heights: list[int]) -> list[int]:
    """Reduce available heights to at most 3 user-friendly tiers:
    Normal ~480p, High ~720p, Original = best available."""
    heights = sorted(set(h for h in heights if h > 0))
    if len(heights) <= 3:
        return heights
    best = heights[-1]
    # Normal: closest to 480p, but never the best quality itself.
    lower = heights[:-1]
    normal = min(lower, key=lambda h: abs(h - 480))
    # High: closest to 720p strictly between Normal and Original.
    mid_pool = [h for h in heights if normal < h < best]
    result = [normal]
    if mid_pool:
        result.append(min(mid_pool, key=lambda h: abs(h - 720)))
    if best not in result:
        result.append(best)
    return result


# yt-dlp reports codecs as ffmpeg strings ("avc1.640028", "vp09.00.10.08").
# The UI wants a short human name.
_CODEC_NAMES: dict[str, str] = {
    "avc": "H.264", "avc1": "H.264", "avc3": "H.264", "h264": "H.264",
    "vp8": "VP8", "vp08": "VP8", "vp9": "VP9", "vp09": "VP9",
    "av1": "AV1", "av01": "AV1",
    "hev1": "H.265", "hvc1": "H.265", "hevc": "H.265", "h265": "H.265",
}


def _codec_name(vcodec: str | None) -> str | None:
    if not vcodec or vcodec == "none":
        return None
    key = str(vcodec).split("/")[0].split(".")[0].lower()
    return _CODEC_NAMES.get(key) or key.upper()


def _byte_size(f: dict[str, Any], duration: float | None) -> tuple[int | None, bool]:
    """(bytes, is_estimate) for one format. Never raises — None when unknown.

    Priority: exact filesize → yt-dlp's filesize_approx → tbr * duration / 8.
    """
    try:
        explicit = f.get("filesize") or f.get("filesize_approx")
        if explicit and float(explicit) > 0:
            return int(explicit), not f.get("filesize")
        rate = f.get("tbr") or f.get("abr")
        if rate and duration and float(rate) > 0 and float(duration) > 0:
            return int(float(rate) * 1000 * float(duration) / 8), True
    except (TypeError, ValueError):
        pass
    return None, False


def _merge_size(
    video: tuple[int | None, bool], audio: tuple[int | None, bool]
) -> tuple[int | None, bool]:
    """Add video + audio sizes; anything partial becomes an estimate."""
    v, v_est = video
    a, a_est = audio
    if v is None and a is None:
        return None, False
    if v is None or a is None:
        return (v if v is not None else a), True
    return v + a, v_est or a_est


def _build_formats(info: dict[str, Any]) -> tuple[list[FormatOption], FormatOption | None]:
    """Split yt-dlp's format list into quality tiers + an audio option."""
    formats = [f for f in (info.get("formats") or []) if isinstance(f, dict) and f.get("url")]

    try:
        duration = float(info["duration"]) if info.get("duration") else None
    except (TypeError, ValueError):
        duration = None

    video = [f for f in formats
             if f.get("vcodec") not in (None, "none") and not _is_streaming(f)]
    audio_only = [f for f in formats
                  if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")]
    best_audio = max(audio_only, key=lambda f: f.get("abr") or f.get("tbr") or 0) if audio_only else None

    # Best variant per resolution (highest total bitrate wins). We pool BOTH
    # progressive (video+audio in one file) and video-only DASH streams:
    # preferring only progressive caps YouTube at 360p, because YouTube serves
    # 480p+ as separate video/audio streams (we mux them at download time).
    by_height: dict[int, dict[str, Any]] = {}
    for f in video:
        h = f.get("height") or 0
        if h <= 0:
            continue
        if h not in by_height or (f.get("tbr") or 0) > (by_height[h].get("tbr") or 0):
            by_height[h] = f

    tiers: list[FormatOption] = []
    heights = _pick_heights(sorted(by_height))
    ids, labels = _TIER_IDS[len(heights)], _TIER_LABELS[len(heights)]
    for tier_id, label, h in zip(ids, labels, heights):
        f = by_height[h]
        fps = f.get("fps")
        has_audio = f.get("acodec") not in (None, "none")
        ext = str(f.get("ext") or "mp4").lower()
        # DASH tiers deliver video+audio as ONE merged file, so their size is
        # the sum of both streams — that is what the user will actually save.
        size, approx = _byte_size(f, duration)
        if not has_audio and best_audio is not None:
            size, approx = _merge_size((size, approx), _byte_size(best_audio, duration))
        if size is None:
            approx = False
        tiers.append(
            FormatOption(
                id=tier_id,
                label=label,
                quality=f"{h}p" + (f"{int(fps)}" if fps and fps > 50 else ""),
                ext=ext,
                filesize=size,
                filesize_approx=approx,
                has_audio=has_audio,
                url=str(f["url"]),
                note=f"{int(fps)} fps" if fps and fps > 50 else None,
                bitrate=round(f["tbr"]) if f.get("tbr") else None,
                method="direct",
                height=h,
                fps=float(fps) if fps else None,
                codec=_codec_name(f.get("vcodec")),
                container=ext,
                size_bytes=size,
                size_is_estimate=approx,
            )
        )

    # Audio-only option ---------------------------------------------------- #
    audio: FormatOption | None = None
    if audio_only and best_audio is not None:
        size, approx = _byte_size(best_audio, duration)
        aext = str(best_audio.get("ext") or "m4a").lower()
        audio = FormatOption(
            id="audio",
            label="Audio",
            quality=f"Audio · {aext.upper()}",
            ext=aext,
            filesize=size,
            filesize_approx=approx,
            has_audio=True,
            url=str(best_audio["url"]),
            bitrate=round(best_audio["abr"]) if best_audio.get("abr") else None,
            method="direct",
            height=None,
            fps=None,
            codec=None,
            container=aext,
            size_bytes=size,
            size_is_estimate=approx,
        )
    elif tiers:
        # No separate audio track exposed → extract MP3 from the best
        # progressive file using the /api/convert endpoint (ffmpeg).
        best = next((t for t in tiers if t.has_audio), tiers[-1])
        # MP3 at ~160 kbps — clearly an estimate (the source is a video file).
        mp3_size = int(duration * 160_000 / 8) if duration else None
        audio = FormatOption(
            id="audio",
            label="Audio",
            quality="MP3 (converted)",
            ext="mp3",
            filesize=mp3_size,
            filesize_approx=mp3_size is not None,
            has_audio=True,
            url=best.url,
            bitrate=best.bitrate,
            method="convert",
            height=None,
            fps=None,
            codec=None,
            container="mp3",
            size_bytes=mp3_size,
            size_is_estimate=mp3_size is not None,
        )

    # Video-only tiers can be joined with the audio stream at download time.
    mergeable = audio is not None and audio.method == "direct"
    for t in tiers:
        if not t.has_audio and mergeable:
            t.has_audio_merge = True
            t.container = "mp4"  # the merged file is always an MP4

    return tiers, audio


# --------------------------------------------------------------------------- #
# Media classification
# --------------------------------------------------------------------------- #
def _images_from_entries(entries: list[dict[str, Any]]) -> list[str]:
    """Collect direct image URLs from playlist-style entries (carousels)."""
    urls: list[str] = []
    for e in entries:
        u = e.get("url")
        ext = str(e.get("ext") or "").lower()
        if u and str(u).startswith("http") and ext in IMAGE_EXTS:
            urls.append(str(u))
    return urls


def _build_result(info: dict[str, Any], url: str) -> MediaResult:
    platform, platform_name = detect_platform(url)

    # Playlists: image carousels are fine (multi_photo posts); anything else
    # with a single entry is unwrapped; true playlists are rejected.
    if info.get("_type") in ("playlist", "multi_video"):
        entries = [e for e in (info.get("entries") or []) if isinstance(e, dict)]
        if not entries:
            raise ApiError("link_not_found", status_code=404)

        images = _images_from_entries(entries)
        if images and len(images) == len(entries):
            first = entries[0]
            return MediaResult(
                platform=platform,
                platform_name=platform_name,
                title=str(info.get("title") or first.get("title") or f"{platform_name} post"),
                author=info.get("uploader") or info.get("channel") or first.get("uploader"),
                duration=None,
                thumbnail=info.get("thumbnail") or first.get("thumbnail"),
                media_type="carousel",
                is_story=is_story_url(url),
                webpage_url=url,
                formats=[],
                audio=None,
                images=images,
            )
        if len(entries) == 1:
            info = entries[0]  # unwrap (yt-dlp wraps single posts sometimes)
        else:
            raise ApiError("playlist_not_supported", status_code=400)

    title = str(info.get("title") or f"{platform_name} post")
    author = info.get("uploader") or info.get("channel") or info.get("creator")
    duration = int(info["duration"]) if info.get("duration") else None
    thumbnail = info.get("thumbnail")
    if not thumbnail and info.get("thumbnails"):
        thumbnail = info["thumbnails"][-1].get("url")

    tiers, audio = _build_formats(info)

    # Image / carousel detection ------------------------------------------ #
    ext = str(info.get("ext") or "").lower()
    has_video = bool(tiers)
    direct_url = info.get("url")
    if not has_video and ext in IMAGE_EXTS and info.get("vcodec") in (None, "none") and direct_url:
        return MediaResult(
            platform=platform,
            platform_name=platform_name,
            title=title,
            author=author,
            duration=None,
            thumbnail=thumbnail,
            media_type="image",
            is_story=is_story_url(url),
            webpage_url=url,
            formats=[],
            audio=None,
            images=[str(direct_url)],
        )

    # Audio-only media (no video stream at all) --------------------------- #
    if not has_video and audio:
        return MediaResult(
            platform=platform,
            platform_name=platform_name,
            title=title,
            author=author,
            duration=duration,
            thumbnail=thumbnail,
            media_type="audio",
            is_story=is_story_url(url),
            webpage_url=url,
            formats=[],
            audio=audio,
            images=[],
        )

    if not tiers and not audio:
        raise ApiError("extract_failed", "No downloadable file was exposed by the source.", status_code=502)

    return MediaResult(
        platform=platform,
        platform_name=platform_name,
        title=title,
        author=author,
        duration=duration,
        thumbnail=thumbnail,
        media_type="video",
        is_story=is_story_url(url),
        webpage_url=url,
        formats=tiers,
        audio=audio,
        images=[],
        requires_login=bool(info.get("age_limit")),
    )


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
async def extract(url: str) -> MediaResult:
    """Analyse a social media URL and return a MediaResult (raises ApiError)."""
    detect_platform(url)  # fail fast on unsupported hosts

    try:
        info = await asyncio.wait_for(
            asyncio.to_thread(_extract_sync, url),
            timeout=settings.EXTRACT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise ApiError("extract_failed", "The source took too long to respond. Please try again.", status_code=504)
    except ApiError:
        raise
    except Exception as exc:  # yt-dlp DownloadError and friends
        raise _map_error(str(exc))

    return _build_result(info, url)
