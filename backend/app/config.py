"""Application settings loaded from environment variables (.env supported)."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend folder (if present).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _ensure_deno_on_path() -> None:
    """yt-dlp needs Deno as its JS runtime for full YouTube support.

    The server process may have been started before Deno was installed, so its
    inherited PATH won't contain it. Find the winget install and append it.
    """
    if shutil.which("deno"):
        return
    packages = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    for candidate in packages.glob("DenoLand.Deno*"):
        if (candidate / "deno.exe").exists():
            os.environ["PATH"] = os.environ.get("PATH", "") + os.pathsep + str(candidate)
            return


_ensure_deno_on_path()


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


class Settings:
    """Central place for every tunable value — edit here or via .env."""

    # CORS: which origins may call this API (the Next.js dev/prod server).
    ALLOWED_ORIGINS: list[str] = _split(
        os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    )

    # Optional cookies.txt for platforms that block anonymous extraction.
    COOKIE_FILE: str = os.getenv("COOKIE_FILE", "").strip()

    # ffmpeg binary: "ffmpeg" (PATH) or an absolute path (FFMPEG_BIN in .env).
    FFMPEG_BIN: str = os.getenv("FFMPEG_BIN", "ffmpeg").strip() or "ffmpeg"

    # Extraction + bulk download limits.
    EXTRACT_TIMEOUT: int = _int("EXTRACT_TIMEOUT", 30)
    MAX_ZIP_ITEMS: int = _int("MAX_ZIP_ITEMS", 20)
    MAX_ZIP_MB: int = _int("MAX_ZIP_MB", 500)
    MAX_GIF_SECONDS: int = _int("MAX_GIF_SECONDS", 30)

    # "After download" job processing (Status Ready / Make it smaller).
    MAX_CONCURRENT_JOBS: int = _int("MAX_CONCURRENT_JOBS", 1)
    MAX_INPUT_MB: int = _int("MAX_INPUT_MB", 300)
    MAX_DURATION_MIN: int = _int("MAX_DURATION_MIN", 15)
    JOB_TIMEOUT_SEC: int = _int("JOB_TIMEOUT_SEC", 600)
    JOB_RATE_LIMIT: int = _int("JOB_RATE_LIMIT", 5)
    JOB_RATE_WINDOW_SEC: int = _int("JOB_RATE_WINDOW_SEC", 600)
    JOB_TTL_SEC: int = _int("JOB_TTL_SEC", 900)

    # Folder used for temporary files (ZIP / GIF conversion).
    TMP_DIR: Path = Path(os.getenv("TMP_DIR", Path(__file__).resolve().parent.parent / "tmp"))


settings = Settings()
settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
