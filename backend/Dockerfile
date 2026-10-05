# Backend image: FastAPI + yt-dlp + ffmpeg (+ Deno for YouTube's JS challenge).
# Deployable on Render / Fly / Railway / any Docker host.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg  → GIF/MP3 conversion, DASH audio+video merge, processing jobs
# deno   → yt-dlp's JS runtime, required by YouTube since 2024
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        ca-certificates \
        curl \
        bzip2 \
        unzip \
    && curl -fsSL https://deno.land/install.sh | sh -s -- -y \
    && ln -s /root/.deno/bin/deno /usr/local/bin/deno \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY app ./app

# Jobs and ZIPs are written here; keep it off the image filesystem.
ENV TMP_DIR=/tmp/mediasave
RUN mkdir -p "$TMP_DIR"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status==200 else 1)"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]