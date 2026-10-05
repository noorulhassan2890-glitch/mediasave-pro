/**
 * Small pure helpers: formatting, filenames, size estimation.
 */

/** 1_572_864 → "1.5 MB" */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}

/** 83 → "1:23", 3725 → "1:02:05" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Approximate bitrates (kbps) per height, used when the API returns no size.
 * Good enough for a size *estimate* — clearly labelled in the UI.
 */
const ESTIMATED_BITRATE: Record<number, number> = {
  0: 400,
  144: 400,
  240: 700,
  360: 1000,
  480: 1500,
  600: 2200,
  720: 3000,
  1080: 5000,
  1440: 10000,
  2160: 20000,
};

/** Estimate bytes for a tier when the CDN did not report a filesize. */
export function estimateSize(quality: string, duration: number | null): number | null {
  if (!duration) return null;
  const height = parseInt(quality, 10);
  if (!Number.isFinite(height)) return null;
  const kbps =
    ESTIMATED_BITRATE[height] ??
    ESTIMATED_BITRATE[
      Object.keys(ESTIMATED_BITRATE)
        .map(Number)
        .reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a))
    ];
  return Math.round((kbps * 1000 * duration) / 8);
}

/** Resolve the size to display: real size first, estimate second. */
export function displaySize(
  filesize: number | null,
  approx: boolean,
  quality: string,
  duration: number | null,
): { text: string; estimated: boolean } {
  if (filesize) {
    return { text: formatBytes(filesize) + (approx ? ' (approx.)' : ''), estimated: approx };
  }
  const est = estimateSize(quality, duration);
  if (est) return { text: `~${formatBytes(est)}`, estimated: true };
  return { text: '—', estimated: false };
}

/**
 * Size line for a quality row. Uses the server-provided size first
 * (already includes the audio stream for merged tiers) and falls back to
 * a bitrate-based estimate. Never throws — "Size unknown" is a valid answer.
 */
export function formatSizeText(
  sizeBytes: number | null | undefined,
  isEstimate: boolean | undefined,
): string {
  if (sizeBytes === null || sizeBytes === undefined || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return 'Size unknown';
  }
  return `${isEstimate ? '~' : ''}${formatBytes(sizeBytes)}`;
}

/** Make a string safe to use as a download filename. */
export function safeFilename(input: string, fallback = 'download'): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

/** Trigger a browser download for a URL (works cross-origin: it's an <a>). */
export function triggerDownload(url: string, filename?: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  if (filename) anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Wait n ms — used to keep the progress UI visible for a beat. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
