"""Supported platforms + URL → platform detection."""

from __future__ import annotations

from urllib.parse import urlparse

from ..errors import ApiError

# key -> (display name, accepted hostnames)
PLATFORMS: dict[str, tuple[str, tuple[str, ...]]] = {
    "youtube": ("YouTube", ("youtube.com", "youtu.be", "m.youtube.com", "youtube-nocookie.com")),
    "instagram": ("Instagram", ("instagram.com", "instagr.am")),
    "tiktok": ("TikTok", ("tiktok.com",)),
    "facebook": ("Facebook", ("facebook.com", "fb.watch", "fb.com")),
    "twitter": ("X (Twitter)", ("twitter.com", "x.com", "t.co")),
    "threads": ("Threads", ("threads.net", "threads.com")),
    "pinterest": ("Pinterest", ("pinterest.com", "pin.it", "pinterest.pt")),
}

# Path markers that mean "story / highlight" (used for a UI badge only).
_STORY_MARKERS = ("/stories/", "/story/", "/highlight", "/highlights/")


def detect_platform(url: str) -> tuple[str, str]:
    """Return (platform_key, display_name) for a URL.

    Raises ApiError("unsupported_platform") for anything we don't support —
    this keeps extraction fast and error messages clear.
    """
    try:
        host = (urlparse(url).hostname or "").lower().lstrip("www.")
    except ValueError:
        raise ApiError("invalid_url", status_code=400)

    if not host:
        raise ApiError("invalid_url", status_code=400)

    for key, (name, hosts) in PLATFORMS.items():
        for allowed in hosts:
            if host == allowed or host.endswith("." + allowed):
                return key, name

    raise ApiError(
        "unsupported_platform",
        "Supported platforms: Instagram, TikTok, Facebook, X (Twitter), Threads and Pinterest.",
        status_code=400,
    )


def is_story_url(url: str) -> bool:
    """True when the URL points at a story/highlight (badge in the UI)."""
    try:
        path = urlparse(url).path.lower()
    except ValueError:
        return False
    return any(marker in path for marker in _STORY_MARKERS)
