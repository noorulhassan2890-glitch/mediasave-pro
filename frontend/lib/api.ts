/**
 * API client — the single place that talks to the FastAPI backend.
 *
 * Change NEXT_PUBLIC_API_URL in .env.local to point at another server.
 */

import type { ApiErrorBody, FormatOption, MediaResult } from './types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/** Error thrown for every failed API call — carries the backend's message. */
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    // fetch itself failed → backend not running
    throw new ApiError(
      'backend_offline',
      'Cannot reach the download server. Make sure the FastAPI backend is running.',
    );
  }

  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;

  if (!res.ok || (body && typeof body === 'object' && 'success' in body && body.success === false)) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? `http_${res.status}`, err?.message ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

/** POST /api/download — analyse a link and get media info + formats. */
export async function fetchMedia(url: string): Promise<MediaResult> {
  return request<MediaResult>('/api/download', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

/** GET /api/health — check the backend + ffmpeg availability (optional). */
export async function fetchHealth(): Promise<{
  status: string;
  gif_conversion: boolean;
  supported: string[];
}> {
  return request('/api/health');
}

/**
 * Build the proxied file URL for a normal download.
 * Proxied = goes through the backend so we get a proper filename,
 * no CORS issues, and no expired-CDN headaches.
 * `mergeAudioUrl` is passed for DASH sources (separate audio stream) —
 * the backend then muxes video+audio into one MP4 with ffmpeg.
 */
export function fileUrl(
  format: Pick<FormatOption, 'url'>,
  filename: string,
  mergeAudioUrl?: string | null,
): string {
  const params = new URLSearchParams({ url: format.url, filename });
  if (mergeAudioUrl) params.set('audio', mergeAudioUrl);
  return `${API_BASE}/api/file?${params.toString()}`;
}

/** POST /api/zip — download several files and return them as one ZIP. */
export async function downloadZip(
  name: string,
  items: { url: string; filename: string }[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, items }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error.code ?? 'zip_failed', body?.error.message ?? 'ZIP download failed.');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${name}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/** POST /api/convert — ffmpeg conversion: video→GIF or audio→MP3. */
export async function convertMedia(payload: {
  url: string;
  kind: 'gif' | 'mp3';
  filename?: string;
  start?: number;
  length?: number;
  fps?: number;
  width?: number;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error.code ?? 'convert_failed', body?.error.message ?? 'Conversion failed.');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${payload.filename ?? 'mediasave'}.${payload.kind === 'gif' ? 'gif' : 'mp3'}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}
