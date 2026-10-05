import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_NAME, SITE_URL, webSiteLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import './globals.css';

/**
 * Inter via next/font → self-hosted at build time (no render-blocking request
 * to Google Fonts, no layout shift).
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const DEFAULT_TITLE = 'MediaSave Pro — Free Video Downloader (Instagram, TikTok, YouTube)';

const DEFAULT_DESCRIPTION =
  'Free online video downloader for Instagram, TikTok, YouTube, Facebook, X, Threads and Pinterest. Download reels, stories, photos and audio in HD — no watermark, no signup, no app.';

/**
 * Backend origin — inlined at build time. Preconnecting warms the TLS
 * handshake so the first "Download" click is not waiting on a new connection.
 */
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw || raw.includes('localhost') || raw.includes('127.0.0.1')) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'video downloader',
    'social media video downloader',
    'instagram downloader',
    'instagram reels downloader',
    'instagram story saver',
    'tiktok downloader',
    'tiktok video downloader without watermark',
    'youtube video downloader',
    'facebook video downloader',
    'twitter video downloader',
    'threads downloader',
    'pinterest video downloader',
    'download video online',
    'save video no watermark',
    'video to mp3 online',
    'video to gif converter',
    'no watermark downloader',
  ],
  category: 'technology',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description:
      'Download videos, reels, stories and audio from 7 platforms — free, fast, no watermark and no login.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c10' },
  ],
};

/**
 * Theme bootstrap script — runs BEFORE first paint so there is no
 * light/dark flash. Kept inline deliberately (this is the standard Next.js
 * pattern for anti-FOUC theming).
 */
const themeScript = `(function(){try{var t=localStorage.getItem('mediasave.theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {apiOrigin ? <link rel="preconnect" href={apiOrigin} /> : null}
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <JsonLd data={webSiteLd()} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
