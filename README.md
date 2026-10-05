# MediaSave Pro — Social Media Video Downloader

A full-stack, production-ready downloader:

| Layer     | Tech                                              |
| --------- | ------------------------------------------------- |
| Frontend  | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS |
| Backend   | Python FastAPI + **yt-dlp** (+ optional **ffmpeg** for merge/GIF/MP3/post-processing) |
| Storage   | `localStorage` (download history, theme) — no database |

Supported platforms (7): **YouTube · Instagram · TikTok · Facebook · X (Twitter) ·
Threads · Pinterest**

Features: single paste-box with live platform detection, quality tiers
(Normal / High / Original) with real-or-estimated file sizes, codec/fps/container
labels, automatic **video+audio merge** for DASH sources (YouTube), photo carousel
support, audio-only extraction, multi-select → **ZIP** bulk download, **GIF**
converter, **MP3** conversion, copy-direct-link, progress indicator, download
history, dark/light mode, FAQ — and ad slots placed **only** in the lower sections.

Backend-only (API ready, not yet wired into the UI): **POST /api/process** jobs —
"Status Ready" (1080×1920 vertical re-frame + 15/30/60 s trim) and
"Make it smaller" (target-MB two-pass x264 compress), with a queue, per-IP rate
limit, live progress, cancel and TTL cleanup. See §3.1 and §9.

---

## 1. Project structure

```
downloader/
├── frontend/                  # Next.js 14 app
│   ├── app/
│   │   ├── layout.tsx         # Fonts, metadata, theme script, header/footer
│   │   ├── globals.css        # Design tokens (light/dark CSS variables)
│   │   ├── page.tsx           # Home: hero + results + ads + tools + FAQ
│   │   ├── how-to-use/page.tsx
│   │   ├── faq/page.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── Header.tsx         # Sticky nav + mobile menu + theme toggle
│   │   ├── ThemeToggle.tsx
│   │   ├── DownloadFlow.tsx   # ★ Hero input, progress, results, history
│   │   ├── Results.tsx        # ★ Thumbnail, quality tiers, all actions
│   │   ├── AdSlot.tsx         # Lower-page ad placeholders (no popups)
│   │   ├── ToolsSection.tsx   # "Other tools" grid
│   │   ├── HowToSteps.tsx
│   │   ├── FaqSection.tsx
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── types.ts           # API contract (mirrors backend models)
│   │   ├── api.ts             # All backend calls live here
│   │   ├── platforms.ts       # Client-side URL → platform detection
│   │   ├── storage.ts         # localStorage helpers (history + theme)
│   │   ├── utils.ts           # formatBytes, size estimation, filenames
│   │   └── content.ts         # FAQ copy + how-to steps (edit text here)
│   └── .env.local             # NEXT_PUBLIC_API_URL
│
└── backend/                   # FastAPI + yt-dlp
    ├── app/
    │   ├── main.py            # App entry: CORS, routers, /api/health
    │   ├── config.py          # All settings (reads .env)
    │   ├── errors.py          # ApiError + clean JSON error responses
    │   ├── models.py          # Pydantic request/response models
    │   ├── routers/
    │   │   ├── download.py    # POST /api/download  (analyse a link)
    │   │   ├── media.py       # GET  /api/file (proxy + DASH video/audio merge),
    │   │   │                  # POST /api/zip, POST /api/convert (GIF/MP3)
    │   │   └── process.py     # POST/GET/DELETE /api/process (job queue)
    │   └── services/
    │       ├── platforms.py   # Platform detection + story detection
    │       ├── extractor.py   # ★ yt-dlp extraction + quality tiers
    │       └── jobs.py        # ★ background jobs (status / compress)
    ├── requirements.txt
    └── .env.example
```

---

## 2. Run locally (two terminals)

### Prerequisites

- **Node.js 18.17+** (20 LTS recommended)
- **Python 3.10+**
- **ffmpeg** *(optional)* — needed for GIF/MP3 conversion, DASH video+audio merge,
  and all `/api/process` jobs.
  - Windows: `winget install ffmpeg` (or scoop/choco)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- **Deno** *(optional)* — YouTube only. Recent yt-dlp needs a JavaScript runtime;
  if Deno isn't on your `PATH`, `backend/app/config.py` auto-appends the
  winget `DenoLand.Deno*` folder.

### Terminal A — backend (port 8000)

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # optional — defaults work for local dev

uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>
Health check: <http://localhost:8000/api/health>

### Terminal B — frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

> `.env.local` already points at `http://localhost:8000`.
> In production set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`.

---

## 3. API contract

### `POST /api/download`
```json
{ "url": "https://www.instagram.com/reel/ABC/" }
```
→
```json
{
  "platform": "instagram",
  "platform_name": "Instagram",
  "title": "Sunset ride",
  "author": "creator",
  "duration": 31,
  "thumbnail": "https://...",
  "media_type": "video",
  "is_story": false,
  "webpage_url": "https://...",
  "formats": [
    { "id": "normal",  "label": "Normal",  "quality": "480p",  "ext": "mp4", "filesize": 1834422,  "has_audio": true, "url": "https://cdn..." },
    { "id": "high",    "label": "High",    "quality": "720p",  "ext": "mp4", "filesize": 4521998,  "has_audio": true, "url": "https://cdn..." },
    { "id": "original","label": "Original","quality": "1080p", "ext": "mp4", "filesize": 11482665, "has_audio": true, "url": "https://cdn..." }
  ],
  "audio": { "id": "audio", "label": "Audio", "quality": "Audio · M4A", "ext": "m4a", "method": "direct", "url": "https://cdn..." },
  "images": [],
  "requires_login": false
}
```

Errors always come back as:
```json
{ "success": false, "error": { "code": "private_content", "message": "This content is private..." } }
```

### Other endpoints
| Method | Path           | Purpose                                        |
| ------ | -------------- | ---------------------------------------------- |
| GET    | `/api/file`    | Proxy a direct URL as an attachment (filename, `audio` = merge track) |
| POST   | `/api/zip`     | Bundle N files into one ZIP                    |
| POST   | `/api/convert` | `{url, kind:"gif"|"mp3", start, length, fps, width}` (ffmpeg) |
| GET    | `/api/health`  | Status + `gif_conversion` availability         |

### 3.1 Processing jobs — `/api/process` (backend only)

The UI does not call these yet; they are ready to be wired up
(see §5 "Where to customize").

| Method | Path                     | Purpose                                  |
| ------ | ------------------------ | ---------------------------------------- |
| POST   | `/api/process`           | Queue a `status` or `compress` job       |
| GET    | `/api/process/{job_id}`  | Poll state / progress / queue position   |
| GET    | `/api/process/{job_id}/file` | Download the finished file          |
| DELETE | `/api/process/{job_id}`  | Cancel a queued or running job           |

Request:
```json
{
  "source": { "url": "https://cdn...", "filename": "reel.mp4", "audio": "https://cdn..." },
  "mode": "status",
  "options": { "max_seconds": 30 }
}
```
- `mode: "status"` → 1080×1920 vertical re-frame; portrait is scaled + padded,
  landscape gets a blurred background with the video overlaid. Optional trim
  with `max_seconds: 15 | 30 | 60`.
- `mode: "compress"` → two-pass x264 targeting `options.target_mb` (>= 1). Returns
  `too_small` if the target is below what the clip can reach.

Response:
```json
{ "success": true, "job_id": "a1b2c3", "state": "queued", "queue_position": 0 }
```

Poll response:
```json
{
  "success": true,
  "state": "running",
  "progress": 42,
  "queue_position": 0,
  "output_size_bytes": null,
  "error_message": null
}
```
`state` is `queued | running | done | failed | cancelled`. A finished job's
file is served from `/api/process/{job_id}/file` and is deleted after `JOB_TTL_SEC`.

Guards: `MAX_CONCURRENT_JOBS` workers, `JOB_RATE_LIMIT` jobs per
`JOB_RATE_WINDOW_SEC` per IP, `MAX_INPUT_MB` / `MAX_DURATION_MIN` source limits,
`JOB_TIMEOUT_SEC` hard timeout, SSRF-checked source URLs.

---

## 4. Configuration

**backend/.env**

| Key               | Default                              | Meaning |
| ----------------- | ------------------------------------ | ------- |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...`          | CORS allow-list (comma separated) |
| `COOKIE_FILE`     | *(empty)*                            | Path to a `cookies.txt` for platforms that require login |
| `EXTRACT_TIMEOUT` | `30`                                 | yt-dlp timeout (seconds) |
| `MAX_ZIP_ITEMS`   | `20`                                 | Files per ZIP |
| `MAX_ZIP_MB`      | `500`                                | Max ZIP size |
| `MAX_GIF_SECONDS` | `30`                                 | GIF length limit |
| `FFMPEG_BIN`      | *(ffmpeg on PATH)*                   | Absolute path to ffmpeg (Windows) — enables merge / GIF / MP3 / jobs |
| `TMP_DIR`         | `backend/tmp`                        | Scratch dir for jobs + ZIPs (wiped on startup) |

**Jobs (`/api/process`)**

| Key                  | Default | Meaning |
| -------------------- | ------- | ------- |
| `MAX_CONCURRENT_JOBS`| `1`     | Worker threads processing jobs |
| `MAX_INPUT_MB`       | `300`   | Max source download size |
| `MAX_DURATION_MIN`   | `15`    | Reject clips longer than this |
| `JOB_TIMEOUT_SEC`    | `600`   | Hard timeout per job |
| `JOB_RATE_LIMIT`     | `5`     | Jobs allowed per IP… |
| `JOB_RATE_WINDOW_SEC`| `600`   | …per this many seconds |
| `JOB_TTL_SEC`        | `900`   | Delete finished output after this |

**frontend/.env.local**

| Key                  | Default                | Meaning |
| -------------------- | ---------------------- | ------- |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8000` | Backend base URL |
| `NEXT_PUBLIC_SITE_URL` (optional) | — | Canonical URL used in SEO metadata |

---

## 5. Where to customize

| Want to…                              | Edit |
| ------------------------------------- | ---- |
| Change colours / brand                | `frontend/app/globals.css` (`:root` + `.dark` tokens) and `tailwind.config.ts` |
| Reword FAQ / how-to text              | `frontend/lib/content.ts` |
| Change hero copy                      | `frontend/components/DownloadFlow.tsx` |
| Adjust quality-tier logic             | `backend/app/services/extractor.py` → `_build_formats`, `_pick_heights` |
| Add a platform                        | `backend/app/services/platforms.py` **and** `frontend/lib/platforms.ts` |
| Enable real ads                       | `frontend/components/AdSlot.tsx` (paste your ad markup in the marked block) |
| Hook up login-required content        | set `COOKIE_FILE` in `backend/.env` |
| Add the processing UI (Status Ready / Make it smaller) | add calls in `frontend/lib/api.ts`, render them in `frontend/components/Results.tsx` |
| Change re-frame / compress output      | `backend/app/services/jobs.py` → `_run_status`, `_run_compress`, `_pick_height` |
| Change the processing queue            | `backend/app/services/jobs.py` → `_loop`, `check_rate`, `_schedule_ttl` |

---

## 6. Ad policy (by design)

- Ads render **only** in `AdSlot` components at the bottom of the page
  (after results / before footer).
- **Never** above the input box or between a result and its download buttons.
- No pop-ups, interstitials, auto-clicks, or forced redirects — ever.

---

## 7. Production deployment notes

**Frontend** — deploy to Vercel/Netlify/any Node host:
```bash
cd frontend && npm run build && npm start
```
Set `NEXT_PUBLIC_API_URL` to your API origin.

**Backend** — deploy to any Python host (Railway, Fly.io, Render, a VPS):
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
- Install **ffmpeg** on the server — required for GIF/MP3, DASH merge, and jobs.
- `TMP_DIR` needs a few GB of scratch space, and one worker per
  `MAX_CONCURRENT_JOBS` (ffmpeg is CPU-bound).
- Set `ALLOWED_ORIGINS` to your real frontend domain.
- Put it behind HTTPS; consider rate limiting (e.g. `slowapi`) for public use.
- Update yt-dlp regularly (`pip install -U yt-dlp`) — platforms change often.

---

## 8. Legal

For **personal, non-commercial** use only. Respect creators and copyright
holders; you are responsible for what you download. Only public content can be
fetched — private/members-only posts are rejected by design.

---

## 9. Project status

- **Working end-to-end**: paste link → detect platform → quality tiers → preview →
  download / ZIP / GIF / MP3 / copy link, with history and theme toggle.
- **YouTube** is supported (7 platforms), including automatic video+audio merge for
  DASH-only sources; it needs **Deno** on `PATH`.
- **Backend-only for now**: `/api/process` (Status Ready / Make it smaller) ships as
  working API + job queue but has **no UI yet** — the wire-up points are in §5.
- **No automated tests** in either app. The only automated check is
  `cd frontend && npm run typecheck` (`tsc --noEmit`). Backend is verified manually
  via <http://localhost:8000/docs>.
