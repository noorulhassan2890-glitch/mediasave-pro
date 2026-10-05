"""Netlify Function entry point for the MediaSave Pro API.

Runs the real FastAPI app (copied into `_backend/` at build time by
`scripts/copy-backend.mjs`) inside AWS Lambda through Mangum, so
`/api/*` behaves exactly like it does behind uvicorn.

Netlify rewrites `/api/*` to this function (see netlify.toml), which also
means the browser talks to a single origin — no CORS, no separate API host.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("TMP_DIR", "/tmp")

from _backend.main import app  # noqa: E402
from mangum import Mangum  # noqa: E402

handler = Mangum(app, lifespan="auto")