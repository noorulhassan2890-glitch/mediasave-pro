"""POST /api/process — create status/compress jobs, poll, fetch, cancel."""
from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

from ..errors import ApiError
from ..models import ProcessRequest
from ..services.jobs import manager
from .media import _assert_safe_url, _ffmpeg_available

router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "local"


@router.post("/process")
async def start_process(payload: ProcessRequest, request: Request) -> dict:
    if not _ffmpeg_available():
        raise ApiError("ffmpeg_missing", status_code=501)
    if payload.mode == "compress":
        target = payload.options.target_mb
        if target is None or target < 1:
            raise ApiError("invalid_options")
    _assert_safe_url(payload.source.url)
    if payload.source.audio:
        _assert_safe_url(payload.source.audio)
    manager.check_rate(_client_ip(request))
    job = manager.create(payload, _client_ip(request))
    return {"job_id": job.id}


@router.get("/process/{job_id}")
async def process_status(job_id: str) -> dict:
    job = manager.get(job_id)
    return {
        "state": job.state,
        "progress": job.progress,
        "queue_position": manager.queue_position(job),
        "output_size_bytes": job.output_size_bytes,
        "error_message": job.error_message,
    }


@router.get("/process/{job_id}/file")
async def process_file(job_id: str) -> FileResponse:
    job = manager.get(job_id)
    if job.state == "error":
        raise ApiError("job_failed", job.error_message, status_code=409)
    if job.state != "done" or not job.output or not job.output.exists():
        raise ApiError("job_failed", "This job is still processing.", status_code=409)
    return FileResponse(job.output, media_type="video/mp4", filename=job.out_name)


@router.delete("/process/{job_id}")
async def cancel_process(job_id: str) -> dict:
    job = manager.get(job_id)
    await manager.cancel(job)
    return {"state": job.state, "error_message": job.error_message}
