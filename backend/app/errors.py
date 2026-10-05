"""Custom API errors + a global handler that returns clean JSON.

Every error response looks like:
    {"success": false, "error": {"code": "...", "message": "..."}}
so the frontend can show a friendly, specific message.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """Raised anywhere in the app; converted to JSON by the handler below."""

    def __init__(self, code: str, message: str | None = None, status_code: int = 400):
        # message=None → fall back to the friendly copy in ERROR_MESSAGES.
        super().__init__(message or code)
        self.code = code
        self.message = message
        self.status_code = status_code


# Codes the frontend knows how to translate into helpful UI copy.
ERROR_MESSAGES: dict[str, str] = {
    "invalid_url": "That doesn't look like a valid link. Paste a full URL starting with https://.",
    "unsupported_platform": "This platform isn't supported yet.",
    "link_not_found": "We couldn't find anything at that link. It may have been deleted.",
    "private_content": "This content is private or requires login. Only public posts can be downloaded.",
    "geo_restricted": "This content isn't available in the server's region.",
    "rate_limited": "Too many requests. Please wait a moment and try again.",
    "playlist_not_supported": "Playlists aren't supported. Paste a link to a single post, reel or video.",
    "extract_failed": "We couldn't process this link. Please try again.",
    "unsupported_url": "This link isn't supported. Try an Instagram, TikTok, Facebook, X, Threads or Pinterest link.",
    "unsafe_url": "That URL isn't allowed.",
    "too_many_items": "Too many items selected for one ZIP. Please download in smaller batches.",
    "too_large": "The combined file size is too large for a single ZIP.",
    "ffmpeg_missing": "This feature needs ffmpeg installed on the server.",
    "source_too_long": "The video is too long to convert (limit applies to short clips only).",
    "download_failed": "The file couldn't be fetched from the source. It may have expired — re-analyse the link.",
    "process_too_large": "That file is too large to process. The limit is 300 MB.",
    "process_too_long": "That video is too long to process. The limit is 15 minutes.",
    "too_many_jobs": "Too many jobs right now. Please wait a minute and try again.",
    "job_not_found": "This job has expired or doesn't exist. Please start it again.",
    "job_failed": "Processing failed. Please try again.",
    "invalid_options": "That processing option isn't valid.",
}


def error_response(code: str, message: str | None = None, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"code": code, "message": message or ERROR_MESSAGES.get(code, "Something went wrong.")}},
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        # Never leak stack traces to the client; log server-side instead.
        print(f"[unhandled] {type(exc).__name__}: {exc}")
        return error_response("extract_failed", status_code=500)
