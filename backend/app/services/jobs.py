"""Background job system for post-download processing (status / compress)."""
from __future__ import annotations

import asyncio
import json
import math
import os
import shutil
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Deque, Dict, List, Optional

import httpx

from ..config import settings
from ..errors import ERROR_MESSAGES, ApiError
from ..models import ProcessRequest
from ..routers.media import (
    _UA,
    _assert_safe_url,
    _clean_name,
    _filename_from_url,
)


class _Cancelled(Exception):
    pass


@dataclass
class ProbeInfo:
    duration: float
    width: int
    height: int
    has_audio: bool


@dataclass
class Job:
    id: str
    mode: str
    ip: str
    source_url: str
    filename: str
    audio_url: Optional[str] = None
    max_seconds: Optional[int] = None
    target_mb: Optional[float] = None
    state: str = "queued"
    progress: int = 0
    error_message: Optional[str] = None
    output_size_bytes: Optional[int] = None
    workdir: Optional[Path] = None
    output: Optional[Path] = None
    out_name: str = "output.mp4"
    proc: Optional[asyncio.subprocess.Process] = None
    cancel_requested: bool = False
    finished_at: Optional[float] = None


class JobManager:
    def __init__(self) -> None:
        self.jobs: Dict[str, Job] = {}
        self._pending: Deque[str] = deque()
        self._active: Dict[str, asyncio.Task] = {}
        self._hits: Dict[str, Deque[float]] = {}
        self._loop_task: Optional[asyncio.Task] = None
        self._ttl_tasks: Dict[str, asyncio.Task] = {}
        self._stopping = False

    # ---------- lifecycle ----------

    def start(self) -> None:
        self._stopping = False
        # startup wipe: remove leftover temp dirs/files from a previous run
        tmp = settings.TMP_DIR
        try:
            for child in tmp.iterdir():
                try:
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink(missing_ok=True)
                except OSError:
                    pass
        except OSError:
            pass
        if self._loop_task is None or self._loop_task.done():
            self._loop_task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._stopping = True
        for job in self.jobs.values():
            if job.state == "running" and job.proc and job.proc.returncode is None:
                try:
                    job.proc.kill()
                except OSError:
                    pass
        for task in list(self._active.values()):
            task.cancel()
        if self._loop_task:
            self._loop_task.cancel()
        for task in list(self._ttl_tasks.values()):
            task.cancel()

    # ---------- rate limit ----------

    def check_rate(self, ip: str) -> None:
        now = time.time()
        window = settings.JOB_RATE_WINDOW_SEC
        hits = self._hits.setdefault(ip, deque())
        while hits and now - hits[0] > window:
            hits.popleft()
        if len(hits) >= settings.JOB_RATE_LIMIT:
            raise ApiError(
                "rate_limited",
                f"Too many jobs from this device. Try again in a few minutes "
                f"({settings.JOB_RATE_LIMIT} jobs per {window // 60} minutes).",
                status_code=429,
            )
        hits.append(now)

    # ---------- crud ----------

    def create(self, payload: ProcessRequest, ip: str) -> Job:
        job = Job(
            id=uuid.uuid4().hex,
            mode=payload.mode,
            ip=ip,
            source_url=payload.source.url,
            filename=payload.source.filename or _filename_from_url(payload.source.url),
            audio_url=payload.source.audio,
            max_seconds=payload.options.max_seconds,
            target_mb=payload.options.target_mb,
        )
        self.jobs[job.id] = job
        self._pending.append(job.id)
        return job

    def get(self, job_id: str) -> Job:
        job = self.jobs.get(job_id)
        if job is None:
            raise ApiError("job_not_found", status_code=404)
        return job

    def queue_position(self, job: Job) -> Optional[int]:
        if job.state != "queued":
            return None
        try:
            idx = list(self._pending).index(job.id)
        except ValueError:
            return None
        return len(self._active) + idx + 1

    async def cancel(self, job: Job) -> None:
        if job.state == "queued":
            try:
                self._pending.remove(job.id)
            except ValueError:
                pass
            job.state = "error"
            job.error_message = "Cancelled."
            job.finished_at = time.time()
            self._schedule_ttl(job)
        elif job.state == "running":
            job.cancel_requested = True
            if job.proc and job.proc.returncode is None:
                try:
                    job.proc.kill()
                except OSError:
                    pass
            for _ in range(20):
                if job.state != "running":
                    break
                await asyncio.sleep(0.1)
        elif job.state == "done":
            self._cleanup_files(job)

    # ---------- worker ----------

    async def _loop(self) -> None:
        while not self._stopping:
            if len(self._active) < settings.MAX_CONCURRENT_JOBS and self._pending:
                job_id = self._pending.popleft()
                job = self.jobs.get(job_id)
                if job is None or job.cancel_requested:
                    continue
                job.state = "running"
                task = asyncio.create_task(self._run_job(job))
                self._active[job_id] = task
                task.add_done_callback(lambda _t, jid=job_id: self._active.pop(jid, None))
            else:
                await asyncio.sleep(0.2)

    async def _run_job(self, job: Job) -> None:
        try:
            await asyncio.wait_for(self._execute(job), timeout=settings.JOB_TIMEOUT_SEC)
            job.state = "done"
            job.progress = 100
            job.finished_at = time.time()
            self._schedule_ttl(job)
        except asyncio.TimeoutError:
            self._kill(job)
            job.state = "error"
            job.error_message = "Processing took too long. Try a shorter clip or smaller file."
            job.finished_at = time.time()
            self._cleanup_files(job)
            self._schedule_ttl(job)
        except asyncio.CancelledError:
            self._kill(job)
            job.state = "error"
            job.error_message = "Cancelled."
            job.finished_at = time.time()
            self._cleanup_files(job)
            self._schedule_ttl(job)
        except ApiError as exc:
            job.state = "error"
            job.error_message = exc.message or ERROR_MESSAGES.get(
                exc.code, "Processing failed."
            )
            job.finished_at = time.time()
            self._cleanup_files(job)
            self._schedule_ttl(job)
        except _Cancelled:
            job.state = "error"
            job.error_message = "Cancelled."
            job.finished_at = time.time()
            self._cleanup_files(job)
            self._schedule_ttl(job)
        except Exception:
            import traceback as _tb

            print(f"[job {job.id}] unexpected error:\n{_tb.format_exc()}", flush=True)
            job.state = "error"
            job.error_message = "Processing failed. Please try again."
            job.finished_at = time.time()
            self._cleanup_files(job)
            self._schedule_ttl(job)

    # ---------- execution ----------

    async def _execute(self, job: Job) -> None:
        workdir = settings.TMP_DIR / f"job-{job.id[:8]}"
        workdir.mkdir(parents=True, exist_ok=True)
        job.workdir = workdir

        source = await self._acquire_source(job, workdir)
        probe = await _ffprobe_info(source)
        if probe.duration <= 0:
            raise ApiError("job_failed", "Could not read this video's duration.", status_code=502)
        if probe.duration > settings.MAX_DURATION_MIN * 60:
            raise ApiError("process_too_long")

        if job.mode == "status":
            out = await self._run_status(job, workdir, source, probe)
        else:
            out = await self._run_compress(job, workdir, source, probe)

        if job.cancel_requested:
            raise _Cancelled()
        job.output = out
        job.output_size_bytes = out.stat().st_size

    async def _acquire_source(self, job: Job, workdir: Path) -> Path:
        _assert_safe_url(job.source_url)
        if job.audio_url:
            _assert_safe_url(job.audio_url)
        job.progress = 1
        timeout = httpx.Timeout(30.0, read=120.0)
        limits = httpx.Limits(max_connections=4)
        async with httpx.AsyncClient(
            timeout=timeout, follow_redirects=True, limits=limits, headers={"User-Agent": _UA}
        ) as client:
            if job.audio_url:
                vdst = workdir / "video.src"
                adst = workdir / "audio.src"
                await asyncio.gather(
                    _grab(client, job.source_url, vdst, job, main=True),
                    _grab(client, job.audio_url, adst, job),
                )
                src = workdir / "source.mp4"
                cmd = [
                    settings.FFMPEG_BIN, "-y",
                    "-i", str(vdst), "-i", str(adst),
                    "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(src),
                ]
                rc, err = await asyncio.to_thread(_run_proc, cmd, str(workdir))
                vdst.unlink(missing_ok=True)
                adst.unlink(missing_ok=True)
                if rc != 0:
                    raise ApiError("job_failed", f"ffmpeg: {_last_line(err)}", status_code=502)
                return src
            src = workdir / "source.mp4"
            await _grab(client, job.source_url, src, job, main=True)
            return src

    async def _run_status(
        self, job: Job, workdir: Path, source: Path, probe: ProbeInfo
    ) -> Path:
        out = workdir / "out.mp4"
        total_sec = probe.duration
        if job.max_seconds:
            total_sec = min(total_sec, float(job.max_seconds))

        if probe.height > probe.width:
            vf = (
                "scale=1080:1920:force_original_aspect_ratio=decrease,"
                "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p"
            )
            cmd = [settings.FFMPEG_BIN, "-y", "-i", str(source), "-vf", vf]
        else:
            fc = (
                "[0:v]split[a][b];"
                "[a]scale=1080:1920:force_original_aspect_ratio=increase,"
                "crop=1080:1920,boxblur=25:5[bg];"
                "[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
                "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
            )
            cmd = [settings.FFMPEG_BIN, "-y", "-i", str(source), "-filter_complex", fc]
        cmd += [
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-sn", "-movflags", "+faststart",
        ]
        if job.max_seconds:
            cmd += ["-t", str(job.max_seconds)]
        cmd.append(str(out))

        await self._run_ffmpeg(job, cmd, span=(10, 99), total_sec=total_sec, cwd=workdir)
        return out

    async def _run_compress(
        self, job: Job, workdir: Path, source: Path, probe: ProbeInfo
    ) -> Path:
        if job.target_mb is None or job.target_mb < 1:
            raise ApiError("invalid_options")
        target_bytes = int(job.target_mb * 1024 * 1024)
        source_bytes = source.stat().st_size

        # already smaller than requested limit: no encoding needed
        if target_bytes >= source_bytes:
            out = workdir / "out.mp4"
            await asyncio.to_thread(shutil.copyfile, source, out)
            return out

        duration = probe.duration
        total_kbps = job.target_mb * 8192 / duration
        audio_kbps = 64 if total_kbps < 256 else 96
        video_kbps = (total_kbps - audio_kbps) * 0.95
        if video_kbps < 80:
            min_mb = _min_target_mb(duration)
            raise ApiError(
                "target_too_small",
                "That size is too small for this video's length. "
                f"Try at least {min_mb} MB.",
            )

        height = _pick_height(video_kbps, probe.height)
        out = await self._two_pass(
            job, workdir, source, probe, video_kbps, audio_kbps, height, target_bytes, duration
        )
        return out

    async def _two_pass(
        self,
        job: Job,
        workdir: Path,
        source: Path,
        probe: ProbeInfo,
        video_kbps: float,
        audio_kbps: int,
        height: int,
        target_bytes: int,
        duration: float,
    ) -> Path:
        out = workdir / "out.mp4"
        passlog = workdir / "pass"
        attempts = 0
        while True:
            attempts += 1
            common = [
                "-c:v", "libx264",
                "-b:v", f"{video_kbps:.0f}k",
                "-preset", "veryfast",
                "-pix_fmt", "yuv420p",
            ]
            if height:
                common += ["-vf", f"scale=-2:{height}"]

            pass1 = [
                settings.FFMPEG_BIN, "-y",
                "-i", str(source),
                *common,
                "-pass", "1",
                "-passlogfile", str(passlog),
                "-an",
                "-f", "null",
                os.devnull,
            ]
            await self._run_ffmpeg(job, pass1, span=(10, 45), total_sec=duration, cwd=workdir)

            pass2 = [
                settings.FFMPEG_BIN, "-y",
                "-i", str(source),
                *common,
                "-pass", "2",
                "-passlogfile", str(passlog),
                "-c:a", "aac", "-b:a", f"{audio_kbps}k",
                "-movflags", "+faststart",
                str(out),
            ]
            await self._run_ffmpeg(job, pass2, span=(45, 99), total_sec=duration, cwd=workdir)

            size = out.stat().st_size
            if size <= target_bytes * 1.03 or attempts >= 2:
                break
            # overshot by more than 3%: retry once with bitrate scaled down
            ratio = target_bytes / size
            video_kbps = max(80.0, video_kbps * ratio)
            out.unlink(missing_ok=True)

        for suffix in (".0.mbtree", ".0.log", ".log", ".mbtree"):
            Path(str(passlog) + suffix).unlink(missing_ok=True)
        for extra in workdir.glob("pass*"):
            extra.unlink(missing_ok=True)
        return out

    # ---------- ffmpeg runner with progress ----------

    async def _run_ffmpeg(
        self, job: Job, cmd: List[str], span: tuple[int, int], total_sec: float, cwd: Path
    ) -> None:
        if job.cancel_requested:
            raise _Cancelled()
        full = cmd[:-1] + ["-progress", "pipe:1", "-nostats", cmd[-1]]
        proc = await asyncio.create_subprocess_exec(
            *full,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(cwd),
        )
        job.proc = proc
        err_tail: Deque[str] = deque(maxlen=40)

        async def _read_out() -> None:
            assert proc.stdout is not None
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                text = line.decode("utf-8", "replace").strip()
                if text.startswith("out_time_us=") or text.startswith("out_time_ms="):
                    try:
                        us = int(text.split("=", 1)[1])
                        frac = min(1.0, max(0.0, (us / 1_000_000) / max(total_sec, 0.001)))
                        span0, span1 = span
                        job.progress = int(span0 + frac * (span1 - span0))
                    except ValueError:
                        pass

        async def _read_err() -> None:
            assert proc.stderr is not None
            while True:
                line = await proc.stderr.readline()
                if not line:
                    break
                err_tail.append(line.decode("utf-8", "replace").strip())

        await asyncio.gather(_read_out(), _read_err())
        rc = await proc.wait()
        job.proc = None
        if job.cancel_requested:
            raise _Cancelled()
        if rc != 0:
            raise ApiError("job_failed", f"ffmpeg: {_last_line(list(err_tail))}", status_code=502)

    # ---------- cleanup / ttl ----------

    def _kill(self, job: Job) -> None:
        if job.proc and job.proc.returncode is None:
            try:
                job.proc.kill()
            except OSError:
                pass

    def _cleanup_files(self, job: Job) -> None:
        if job.workdir and job.workdir.exists():
            shutil.rmtree(job.workdir, ignore_errors=True)
        job.workdir = None
        job.output = None

    def _schedule_ttl(self, job: Job) -> None:
        async def _expire() -> None:
            try:
                await asyncio.sleep(settings.JOB_TTL_SEC)
            except asyncio.CancelledError:
                return
            self._cleanup_files(job)
            self.jobs.pop(job.id, None)
            self._ttl_tasks.pop(job.id, None)

        old = self._ttl_tasks.pop(job.id, None)
        if old:
            old.cancel()
        self._ttl_tasks[job.id] = asyncio.create_task(_expire())


# ---------- module helpers ----------


manager = JobManager()


def _last_line(lines: List[str]) -> str:
    for line in reversed([ln for ln in lines if ln]):
        return line[:200]
    return "unknown error"


def _run_proc(cmd: List[str], cwd: str) -> tuple[int, str]:
    import subprocess

    proc = subprocess.run(
        cmd, capture_output=True, text=True, errors="replace", cwd=cwd, timeout=600
    )
    return proc.returncode, proc.stderr or ""


async def _grab(
    client: httpx.AsyncClient, url: str, dst: Path, job: Job, main: bool = False
) -> None:
    _assert_safe_url(url)
    limit = settings.MAX_INPUT_MB * 1024 * 1024
    got = 0
    async with client.stream("GET", url, headers={"Range": "bytes=0-"}) as resp:
        if resp.status_code >= 400:
            raise ApiError("download_failed", status_code=502)
        total = 0
        crange = resp.headers.get("Content-Range", "")
        if "/" in crange:
            try:
                total = int(crange.rsplit("/", 1)[1])
            except ValueError:
                total = 0
        if total and total > limit:
            raise ApiError("process_too_large")
        with dst.open("wb") as fh:
            async for chunk in resp.aiter_bytes(1024 * 256):
                if job.cancel_requested:
                    raise _Cancelled()
                got += len(chunk)
                if got > limit:
                    raise ApiError("process_too_large")
                fh.write(chunk)
                if main:
                    if total > 0:
                        job.progress = 1 + min(8, int(8 * got / total))
                    else:
                        job.progress = 2


def _ffprobe_bin() -> str:
    ffmpeg = Path(settings.FFMPEG_BIN)
    for name in ("ffprobe.exe", "ffprobe"):
        candidate = ffmpeg.with_name(name)
        if candidate.exists():
            return str(candidate)
    found = shutil.which("ffprobe")
    if found:
        return found
    raise ApiError("ffmpeg_missing", status_code=501)


async def _ffprobe_info(source: Path) -> ProbeInfo:
    cmd = [
        _ffprobe_bin(), "-v", "error",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(source),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    out, _ = await proc.communicate()
    try:
        data = json.loads(out.decode("utf-8", "replace") or "{}")
    except ValueError:
        data = {}
    streams = data.get("streams") or []
    fmt = data.get("format") or {}
    duration = 0.0
    try:
        duration = float(fmt.get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0

    width = height = 0
    has_audio = False
    for st in streams:
        ctype = st.get("codec_type")
        if ctype == "video" and not width:
            try:
                width = int(st.get("width") or 0)
                height = int(st.get("height") or 0)
            except (TypeError, ValueError):
                width = height = 0
            for sd in st.get("side_data_list") or []:
                if sd.get("side_data_type") == "Display Matrix":
                    try:
                        rot = abs(int(float(sd.get("rotation", 0)))) % 360
                    except (TypeError, ValueError):
                        rot = 0
                    if rot in (90, 270):
                        width, height = height, width
            if not duration:
                try:
                    duration = float(st.get("duration") or 0)
                except (TypeError, ValueError):
                    pass
        elif ctype == "audio":
            has_audio = True
    if not duration:
        try:
            duration = float(data.get("format", {}).get("duration") or 0)
        except (TypeError, ValueError):
            duration = 0.0
    return ProbeInfo(duration=duration, width=width, height=height, has_audio=has_audio)


def _pick_height(video_kbps: float, orig_height: int) -> int:
    if video_kbps < 250:
        bucket = 240
    elif video_kbps < 600:
        bucket = 360
    elif video_kbps < 1200:
        bucket = 480
    elif video_kbps < 2500:
        bucket = 720
    else:
        bucket = 1080
    target = min(bucket, orig_height or bucket)
    if target % 2:
        target -= 1
    if target < 2:
        return 0
    # only scale when we are actually reducing height
    if orig_height and target >= orig_height:
        return 0
    return target


def _min_target_mb(duration: float) -> float:
    # smallest total bitrate that still leaves video_kbps >= 80
    # (at that point total < 256 kbps, so audio is 64 kbps)
    mb = ((80 / 0.95) + 64) * duration / 8192
    return math.ceil(mb * 10) / 10
