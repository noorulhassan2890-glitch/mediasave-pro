"""File delivery endpoints:

  GET  /api/file    -> streams a direct CDN URL to the browser (proxy)
  POST /api/zip     -> bundles several URLs into one .zip
  POST /api/convert -> ffmpeg: short video -> GIF, or audio -> MP3

Why a proxy? CDN URLs are cross-origin and often block foreign origins or
expire quickly. Routing them through FastAPI gives the browser a normal,
downloadable response with a proper filename.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import shutil
import socket
import subprocess
import uuid
import zipfile
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import BackgroundTasks

from ..config import settings
from ..errors import ApiError
from ..models import ConvertRequest, ZipRequest

router = APIRouter()

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9 ._\-()\[\]]+")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _assert_safe_url(url: str) -> None:
    """Block SSRF: only public http(s) hosts may be fetched by the server."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("bad url")
        infos = socket.getaddrinfo(parsed.hostname, None, proto=socket.IPPROTO_TCP)
    except (ValueError, socket.gaierror) as exc:
        raise ApiError("unsafe_url", status_code=400) from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ApiError("unsafe_url", status_code=400)


def _filename_from_url(url: str) -> str:
    """Best-effort filename from the URL path (fallback: random id)."""
    name = unquote(Path(urlparse(url).path).name or "")
    name = _SAFE_NAME_RE.sub("_", name).strip("._ ")[:80]
    return name or f"mediasave-{uuid.uuid4().hex[:8]}.bin"


def _clean_name(name: str, default: str) -> str:
    name = _SAFE_NAME_RE.sub("_", (name or "").strip()).strip("._ ")
    return (name[:80] or default)


def _disposition(filename: str) -> str:
    """Content-Disposition header that is safe for non-ASCII filenames."""
    fallback = filename.encode("ascii", "replace").decode("ascii").replace('"', "")
    return f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(filename)}"


async def _fetch_head(url: str) -> tuple[str, int | None]:
    """Return (content_type, content_length) without downloading the body."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": _UA}) as client:
        resp = await client.head(url)
        if resp.status_code >= 400:  # some CDNs dislike HEAD â€” fall back to GET
            resp = await client.get(url, headers={"Range": "bytes=0-0"})
        return (
            resp.headers.get("content-type", "application/octet-stream").split(";")[0],
            int(resp["content-length"]) if resp.get("content-length", "").isdigit() else None,
        )


# --------------------------------------------------------------------------- #
# GET /api/file â€” stream one URL as an attachment
# --------------------------------------------------------------------------- #
async def _try_merge(
    video_url: str,
    audio_url: str,
    filename: str,
    background: BackgroundTasks,
) -> FileResponse | None:
    """Mux a DASH video+audio pair into a single MP4 with ffmpeg.

    YouTube (and some Facebook/Twitter variants) serve video and audio as two
    separate streams â€” downloading the video alone would give a silent file.
    Returns None on any failure so the caller can fall back to the plain
    video-only stream (download still works, just without sound).
    """
    if not _ffmpeg_available():
        return None

    workdir = settings.TMP_DIR / f"mg-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True, exist_ok=True)
    vsrc, asrc = workdir / "video.src", workdir / "audio.src"

    # 1) download both streams CONCURRENTLY. `Range` is essential: YouTube
    #    throttles plain (non-Range) requests to ~14 KB/s while Range requests
    #    run at multi-MB/s, so this single header is what makes downloads fast.
    async def _grab(client: httpx.AsyncClient, stream_url: str, target) -> None:
        async with client.stream("GET", stream_url, headers={"Range": "bytes=0-"}) as resp:
            if resp.status_code >= 400:
                raise RuntimeError(f"upstream {resp.status_code}")
            with target.open("wb") as fh:
                async for chunk in resp.aiter_bytes(1 << 16):
                    fh.write(chunk)

    try:
        async with httpx.AsyncClient(
            timeout=300,
            follow_redirects=True,
            headers={"User-Agent": _UA, "Accept-Encoding": "identity"},
        ) as client:
            await asyncio.gather(
                _grab(client, video_url, vsrc),
                _grab(client, audio_url, asrc),
            )
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        return None

    # 2) mux: copy video, re-encode audio to AAC (always valid in MP4)
    stem = _clean_name(filename, "mediasave").rsplit(".", 1)[0]
    out = workdir / f"{stem}.mp4"
    cmd = [
        settings.FFMPEG_BIN, "-y",
        "-i", str(vsrc), "-i", str(asrc),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(out),
    ]
    try:
        proc = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True, timeout=600
        )
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        return None

    if proc.returncode != 0 or not out.exists() or out.stat().st_size == 0:
        shutil.rmtree(workdir, ignore_errors=True)
        return None

    # 3) serve the merged file; delete the temp folder afterwards
    background.add_task(shutil.rmtree, workdir, ignore_errors=True)
    return FileResponse(out, media_type="video/mp4", filename=f"{stem}.mp4", background=background)


@router.get("/file")
async def serve_file(
    background: BackgroundTasks,
    request: Request,
    url: str = Query(..., description="Direct file URL returned by /api/download"),
    filename: str | None = Query(None, description="Download name shown to the user"),
    audio: str | None = Query(None, description="Audio stream URL to merge into the video (ffmpeg)"),
):
    _assert_safe_url(url)
    name = _clean_name(filename or "", _filename_from_url(url))

    # Separate audio stream â†’ try a merged MP4 first (better UX than video-only).
    if audio:
        _assert_safe_url(audio)
        merged = await _try_merge(url, audio, name, background)
        if merged is not None:
            return merged

    content_type, length = await _fetch_head(url)

    async def _stream():
        # identity encoding so the Content-Length we forwarded stays correct.
        async with httpx.AsyncClient(
            timeout=60,
            follow_redirects=True,
            headers={"User-Agent": _UA, "Accept-Encoding": "identity"},
        ) as client:
            async with client.stream("GET", url, headers={"Range": "bytes=0-"}) as resp:
                if resp.status_code >= 400:
                    yield b""
                    return
                async for chunk in resp.aiter_bytes(64 * 1024):
                    yield chunk

    headers = {
        "Content-Disposition": _disposition(name),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
    }
    if length:
        headers["Content-Length"] = str(length)  # type: ignore[assignment]

    return StreamingResponse(_stream(), media_type=content_type, headers=headers)


# --------------------------------------------------------------------------- #
# POST /api/zip â€” bulk download as a single ZIP
# --------------------------------------------------------------------------- #
@router.post("/zip")
async def download_zip(background: BackgroundTasks, payload: ZipRequest):
    items = payload.items
    if not items:
        raise ApiError("invalid_url", "No files selected.", status_code=400)
    if len(items) > settings.MAX_ZIP_ITEMS:
        raise ApiError("too_many_items", f"Maximum {settings.MAX_ZIP_ITEMS} files per ZIP.", status_code=413)

    workdir = settings.TMP_DIR / f"zip-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True, exist_ok=True)
    # Clean the temp folder once the response has been sent.
    background.add_task(shutil.rmtree, workdir, ignore_errors=True)

    zip_path = workdir / f"{_clean_name(payload.name, 'mediasave-download')}.zip"
    total_bytes = 0

    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers={"User-Agent": _UA}) as client:
            for index, item in enumerate(items, start=1):
                _assert_safe_url(item.url)
                target = workdir / _clean_name(item.filename, f"file-{index}.bin")
                # Avoid overwriting when two items share a name.
                if target.exists():
                    target = target.with_stem(f"{target.stem}-{index}")

                async with client.stream("GET", item.url, headers={"Range": "bytes=0-"}) as resp:
                    if resp.status_code >= 400:
                        continue  # skip broken items instead of failing the whole ZIP
                    with target.open("wb") as fh:
                        async for chunk in resp.aiter_bytes(64 * 1024):
                            fh.write(chunk)
                            total_bytes += len(chunk)
                            if total_bytes > settings.MAX_ZIP_MB * 1024 * 1024:
                                raise ApiError("too_large", f"ZIP would exceed {settings.MAX_ZIP_MB} MB.", status_code=413)

        # Build the archive in a worker thread so the event loop stays free.
        def _make_zip() -> None:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for file in sorted(workdir.iterdir()):
                    if file.suffix != ".zip" and file.is_file():
                        zf.write(file, file.name)

        await asyncio.to_thread(_make_zip)
    except ApiError:
        shutil.rmtree(workdir, ignore_errors=True)  # error path: clean up now
        raise
    except Exception as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        raise ApiError("download_failed", f"ZIP failed: {exc}", status_code=502)

    if not zip_path.exists() or zip_path.stat().st_size == 0:
        raise ApiError("download_failed", "No files could be downloaded for the ZIP.", status_code=502)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"{_clean_name(payload.name, 'mediasave-download')}.zip",
    )


# --------------------------------------------------------------------------- #
# POST /api/convert â€” GIF (video) or MP3 (audio) via ffmpeg
# --------------------------------------------------------------------------- #
def _ffmpeg_available() -> bool:
    return shutil.which(settings.FFMPEG_BIN) is not None


@router.post("/convert")
async def convert(background: BackgroundTasks, payload: ConvertRequest):
    if not _ffmpeg_available():
        raise ApiError("ffmpeg_missing", "Install ffmpeg and add it to PATH to enable GIF/MP3 conversion.", status_code=501)

    _assert_safe_url(payload.url)

    if payload.kind == "gif" and payload.length > settings.MAX_GIF_SECONDS:
        raise ApiError("source_too_long", f"GIF conversion is limited to {settings.MAX_GIF_SECONDS}s.", status_code=413)

    workdir = settings.TMP_DIR / f"cv-{uuid.uuid4().hex}"
    workdir.mkdir(parents=True, exist_ok=True)
    background.add_task(shutil.rmtree, workdir, ignore_errors=True)

    src = workdir / f"src-{uuid.uuid4().hex[:6]}.bin"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers={"User-Agent": _UA}) as client:
        async with client.stream("GET", payload.url, headers={"Range": "bytes=0-"}) as resp:
            if resp.status_code >= 400:
                raise ApiError("download_failed", status_code=502)
            with src.open("wb") as fh:
                async for chunk in resp.aiter_bytes(64 * 1024):
                    fh.write(chunk)

    stem = _clean_name(payload.filename or "", "mediasave")

    if payload.kind == "gif":
        out = workdir / f"{stem}.gif"
        # Trim -> scale -> palette (best-looking GIFs at small size).
        vf = (
            f"fps={max(5, min(payload.fps, 24))},"
            f"scale={max(120, min(payload.width, 1080))}:-2:flags=lanczos,"
            "split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer"
        )
        cmd = [
            settings.FFMPEG_BIN, "-y", "-ss", str(max(payload.start, 0)), "-t", str(payload.length),
            "-i", str(src), "-vf", vf, "-loop", "0", str(out),
        ]
        media_type, download_name = "image/gif", f"{stem}.gif"
    else:  # mp3
        out = workdir / f"{stem}.mp3"
        cmd = [
            settings.FFMPEG_BIN, "-y", "-i", str(src),
            "-vn", "-acodec", "libmp3lame", "-q:a", "2", str(out),
        ]
        media_type, download_name = "audio/mpeg", f"{stem}.mp3"

    proc = await asyncio.to_thread(
        subprocess.run, cmd, capture_output=True, text=True, timeout=300
    )
    if proc.returncode != 0 or not out.exists():
        tail = (proc.stderr or "").strip().splitlines()[-1:] or ["unknown error"]
        shutil.rmtree(workdir, ignore_errors=True)  # error path: clean up now
        raise ApiError("extract_failed", f"ffmpeg: {tail[0][:200]}", status_code=502)

    return FileResponse(out, media_type=media_type, filename=download_name)
