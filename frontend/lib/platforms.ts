/**
 * Client-side platform detection.
 *
 * Used for *instant* feedback while the user types (badge under the input)
 * and for history labels. The backend does its own authoritative detection.
 */

import type { PlatformId } from './types';

export interface Platform {
  id: PlatformId;
  name: string;
  /** Tailwind classes for the brand-colored badge dot. */
  dot: string;
  /** SVG path for the brand glyph (24x24 viewport). */
  path: string;
  /** Fill-mode glyph? (some brand marks are solid, some stroked). */
  fill?: boolean;
}

export const PLATFORMS: Record<Exclude<PlatformId, 'unknown'>, Platform> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    dot: 'bg-[#FF0000]',
    fill: true,
    path: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    dot: 'bg-[#E1306C]',
    fill: false,
    // Rounded square + lens + flash dot
    path: 'M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9A2.7 2.7 0 0 0 7.5 19.2h9a2.7 2.7 0 0 0 2.7-2.7v-9A2.7 2.7 0 0 0 16.5 4.8h-9ZM12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.9-3.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    dot: 'bg-black dark:bg-white',
    fill: true,
    path: 'M16.6 3h-3.1v12.1a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.4a5.8 5.8 0 1 0 5 5.7V9.6a7.5 7.5 0 0 0 4.3 1.4V7.8a4.5 4.5 0 0 1-4.4-4.8Z',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    dot: 'bg-[#1877F2]',
    fill: true,
    path: 'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.7v8h3.2Z',
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    dot: 'bg-black dark:bg-white',
    fill: true,
    path: 'M17.5 3h3l-6.6 7.6L21.7 21h-6.1l-4.8-6.3L5.3 21h-3l7.1-8.1L2.5 3h6.2l4.3 5.7L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z',
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    dot: 'bg-black dark:bg-white',
    fill: false,
    path: 'M12.2 21c-5 0-8.2-3.6-8.2-9S7.2 3 12.2 3c3.4 0 5.9 1.5 7.1 4.3l-2 .7c-.8-1.9-2.5-3-5.1-3-3.8 0-6.2 2.7-6.2 7s2.4 7 6.3 7c3.1 0 4.9-1.5 4.9-3.5 0-1.7-1.3-2.7-3.4-2.9-.6 0-1.2-.1-1.8-.1 1.7-1.3 3.5-2.4 5.9-3.1l1 1.9c-2.7.8-4.8 2.4-6.4 4.5-1.1 1.4-1.7 2.9-1.7 4.3 0 .6.1 1.2.2 1.6l-1.9.2c-.1-.5-.2-1-.2-1.6 0-1.5.6-3 1.8-4.4Zm2-6.3c-.9.5-1.9 1.1-2.9 1.7 1.4.4 2.4 1.3 2.4 2.6 0 1.6-1.4 2.7-3.7 2.7-.5 0-1 0-1.5-.1.4-.6.7-1.3.8-2 0-.1.1-.3.1-.4 0-1.6-1.3-2.7-3.3-3.4l.6-1.8c3.4 1.1 5.6 3 7.5 5.5l1-1.6c-1.2-1.5-2.3-2.6-3.6-3.4l-.4 1.5Z',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    dot: 'bg-[#E60023]',
    fill: true,
    path: 'M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.2-1.8 0-2.6l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.6 2 1.7 2 2 0 3.4-2.6 3.4-5.6 0-2.3-1.6-4-4.4-4-3.2 0-5.2 2.4-5.2 5 0 .9.3 1.6.7 2.1.2.2.2.3.1.6l-.2.8c-.1.3-.3.4-.5.3-1.4-.6-2.1-2.2-2.1-4 0-3 2.2-5.9 6.5-5.9 3.4 0 5.7 2.5 5.7 5.2 0 3.6-2 6.2-4.9 6.2-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.7 1.8-1.1 2.4A9 9 0 1 0 12 3Z',
  },
};

/** Detect the platform for a pasted URL (returns null when unknown). */
export function detectPlatform(url: string): Platform | null {
  let host = '';
  try {
    host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  const map: [Exclude<PlatformId, 'unknown'>, string[]][] = [
    ['youtube', ['youtube.com', 'youtu.be', 'youtube-nocookie.com']],
    ['instagram', ['instagram.com', 'instagr.am']],
    ['tiktok', ['tiktok.com']],
    ['facebook', ['facebook.com', 'fb.watch', 'fb.com']],
    ['twitter', ['twitter.com', 'x.com', 't.co']],
    ['threads', ['threads.net', 'threads.com']],
    ['pinterest', ['pinterest.com', 'pin.it']],
  ];

  for (const [id, hosts] of map) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return PLATFORMS[id];
  }
  return null;
}

/** Quick "does this look like a URL" test for enabling the Download button. */
export function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+\.\S+/i.test(value.trim());
}
