import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Free Video Downloader`,
    short_name: SITE_NAME,
    description:
      'Download videos, reels, stories and audio from Instagram, TikTok, YouTube, Facebook, X, Threads and Pinterest.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0c10',
    theme_color: '#0c0c10',
  };
}