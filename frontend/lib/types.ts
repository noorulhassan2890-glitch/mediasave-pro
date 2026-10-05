/**
 * Shared TypeScript types.
 * These mirror the FastAPI response models in backend/app/models.py —
 * keep both files in sync when you change the API contract.
 */

export type PlatformId =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'threads'
  | 'pinterest'
  | 'unknown';

export type MediaType = 'video' | 'image' | 'carousel' | 'audio';

/** One selectable quality tier (or the audio-only option). */
export interface FormatOption {
  id: string; // "normal" | "high" | "original" | "audio"
  label: string; // "Normal" | "High" | "Original" | "Audio"
  quality: string; // "720p", "MP3 (converted)", ...
  ext: string; // "mp4" | "m4a" | "mp3" | ...
  filesize: number | null; // bytes (null → estimated client-side)
  filesize_approx: boolean;
  has_audio: boolean;
  url: string; // direct CDN URL
  note?: string | null;
  bitrate?: number | null; // kbps
  method: 'direct' | 'convert'; // convert = run through /api/convert (ffmpeg)
  // --- size / quality preview ---
  height?: number | null; // pixels (null for the audio-only option)
  fps?: number | null;
  codec?: string | null; // short name: "H.264" | "VP9" | "AV1"
  container?: string | null; // container the user actually gets ("mp4" after merge)
  size_bytes?: number | null; // total delivered size (video + audio for merged tiers)
  size_is_estimate?: boolean; // true when computed from bitrate instead of reported
  has_audio_merge?: boolean; // backend will join a separate audio stream
}

/** POST /api/download response body. */
export interface MediaResult {
  platform: PlatformId;
  platform_name: string;
  title: string;
  author: string | null;
  duration: number | null; // seconds
  thumbnail: string | null;
  media_type: MediaType;
  is_story: boolean;
  webpage_url: string;
  formats: FormatOption[];
  audio: FormatOption | null;
  images: string[];
  requires_login: boolean;
}

/** Uniform error shape returned by every backend endpoint. */
export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

/** One entry of the localStorage download history. */
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  platform: PlatformId;
  platform_name: string;
  thumbnail: string | null;
  media_type: MediaType;
  quality?: string;
  savedAt: number; // epoch ms
}
