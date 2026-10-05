import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';
export const alt = `${SITE_NAME} — free social media video downloader`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social share card (used for both Open Graph and Twitter).
 * Rendered by Next at request time — no image tooling needed in CI.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0c0c10 0%, #111827 55%, #1d4ed8 130%)',
          padding: '72px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            ↓
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 900 }}>
            Download any social media video in one paste
          </div>
          <div style={{ fontSize: 30, color: '#c7d2fe' }}>
            YouTube · Instagram · TikTok · Facebook · X · Threads · Pinterest
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 24, color: '#e5e7eb' }}>
          {['Free', 'No login', 'No watermark', 'HD + audio'].map((chip) => (
            <div
              key={chip}
              style={{
                border: '2px solid rgba(255,255,255,0.35)',
                borderRadius: 999,
                padding: '10px 22px',
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}