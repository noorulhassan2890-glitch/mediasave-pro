'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HistoryItem, MediaResult } from '@/lib/types';
import { addHistory, getHistory } from '@/lib/storage';
import DownloadBox from './DownloadBox';

/**
 * Home hero: the marketing copy plus the download box. Everything below the
 * hero (ads, history, tools, FAQ) is static and lives in app/page.tsx.
 */
export default function DownloadFlow() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rerun, setRerun] = useState<{ url: string; nonce: number } | null>(null);

  // History is client-only storage.
  useEffect(() => setHistory(getHistory()), []);

  /** Record a finished download in the local history list. */
  const handleResult = useCallback((result: MediaResult, url: string) => {
    const item: HistoryItem = {
      id: `${Date.now()}`,
      url,
      title: result.title,
      platform: result.platform,
      platform_name: result.platform_name,
      thumbnail: result.thumbnail,
      media_type: result.media_type,
      savedAt: Date.now(),
    };
    setHistory(addHistory(item));
  }, []);

  /** Re-run a link from the history list. */
  const handleHistoryOpen = useCallback((item: HistoryItem) => {
    setRerun({ url: item.url, nonce: Date.now() });
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Soft radial glow — pure decoration, no images to keep it fast. */}
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
      />
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20">
        <span className="section-kicker">Free · No login · No watermark</span>
        <h1 className="mt-3 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Download social media videos in{' '}
          <span className="text-primary">one paste</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Videos, reels, stories, carousels, photos and audio from YouTube, Instagram,
          TikTok, Facebook, X, Threads and Pinterest — in the best quality available.
        </p>

        {/* ------------------------- Input box ------------------------- */}
        <div className="mt-8 text-left">
          <DownloadBox onResult={handleResult} submitUrl={rerun} />

          {/* Trust row — under the CTA, no ads up here. */}
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
            <TrustItem>Works on 7 platforms</TrustItem>
            <TrustItem>100% browser-private history</TrustItem>
            <TrustItem>No account needed</TrustItem>
          </ul>
        </div>
      </div>

      {/* Recently downloaded — rendered inline right after results */}
      {history.length > 0 && (
        <section
          aria-label="Recently downloaded"
          className="mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Recently downloaded</h2>
            <span className="text-xs text-muted">Stored only in this browser</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {history.slice(0, 4).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleHistoryOpen(item)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition hover:border-primary/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle text-xs font-bold uppercase text-muted">
                    {item.platform_name.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.platform_name}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted transition group-hover:text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
                    <path d="M5 18h14" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 13 4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}