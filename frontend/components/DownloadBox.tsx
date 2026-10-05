'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchMedia } from '@/lib/api';
import { detectPlatform, looksLikeUrl } from '@/lib/platforms';
import type { MediaResult } from '@/lib/types';
import { sleep } from '@/lib/utils';
import Results from './Results';

type Status = 'idle' | 'loading' | 'done' | 'error';

/** Fake-but-honest progress steps while the backend extracts the link. */
const STEPS = ['Checking the link', 'Talking to the platform', 'Finding the best quality'];

interface Props {
  /** Placeholder hint inside the field — set per platform page. */
  placeholder?: string;
  /** CTA label. */
  cta?: string;
  /** Fired after a successful fetch so the parent can record history. */
  onResult?: (result: MediaResult, url: string) => void;
  /** Push a URL from outside (e.g. a history item) to re-run the download. */
  submitUrl?: { url: string; nonce: number } | null;
}

/**
 * The interactive core: link input + platform badge + progress + results.
 * Shared by the home hero and every platform landing page so the download
 * box behaves identically everywhere.
 */
export default function DownloadBox({
  placeholder,
  cta = 'Download',
  onResult,
  submitUrl,
}: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [pasted, setPasted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const platform = detectPlatform(url);
  const canSubmit = looksLikeUrl(url) && status !== 'loading';

  /** Read the clipboard into the input (permission-friendly). */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setPasted(true);
        inputRef.current?.focus();
      }
    } catch {
      // Clipboard blocked → just focus so the user can paste manually.
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, []);

  /** Submit the link → call the backend → show results. */
  const handleSubmit = useCallback(
    async (overrideUrl?: string) => {
      const target = (overrideUrl ?? url).trim();
      if (!looksLikeUrl(target)) {
        setError('Please paste a valid link (it should start with https://).');
        setStatus('error');
        return;
      }

      setStatus('loading');
      setError(null);
      setResult(null);
      setStep(0);

      // Progress ticks while the real request runs — keeps the UI alive
      // without lying about a percentage we don't actually have.
      const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900);
      const minimumWait = sleep(900); // avoid a jarring instant flash

      try {
        const [data] = await Promise.all([fetchMedia(target), minimumWait]);
        setResult(data);
        setStatus('done');
        onResult?.(data, target);

        // Smoothly bring the preview into view (desktop + mobile).
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        );
        setStatus('error');
      } finally {
        clearInterval(ticker);
      }
    },
    [url, onResult],
  );

  // External request (history click) → run it once per new request.
  useEffect(() => {
    if (submitUrl) void handleSubmit(submitUrl.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitUrl?.nonce]);

  return (
    <>
      <div className="relative">
        <label htmlFor="media-url" className="sr-only">
          Paste a social media link
        </label>
        <input
          ref={inputRef}
          id="media-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPasted(false);
            if (status === 'error') setStatus('idle');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit();
          }}
          placeholder={placeholder ?? 'https://www.instagram.com/reel/...'}
          className="url-input pr-28"
          aria-describedby="url-hint"
        />

        {/* Paste button (inside the field, right side) */}
        <button
          type="button"
          onClick={() => void handlePaste()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-subtle px-3 py-2 text-xs font-semibold text-text transition hover:bg-card disabled:opacity-50 sm:right-3 sm:text-sm"
        >
          {pasted ? 'Pasted ✓' : 'Paste'}
        </button>
      </div>

      {/* Platform badge (instant feedback while typing) */}
      <div id="url-hint" className="mt-3 flex min-h-6 flex-wrap items-center justify-center gap-2 text-xs text-muted">
        {platform ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium text-text animate-fade-in">
            <span className={`h-2 w-2 rounded-full ${platform.dot}`} aria-hidden="true" />
            {platform.name} link detected
          </span>
        ) : (
          <span>Paste any public post, reel, story or video link.</span>
        )}
      </div>

      {/* Main CTA */}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="btn-primary mt-4 w-full py-4 text-base sm:py-4"
      >
        {status === 'loading' ? (
          <>
            <Spinner />
            Processing…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
              <path d="M5 18h14" />
            </svg>
            {cta}
          </>
        )}
      </button>

      {/* ---------------------- Progress ---------------------- */}
      {status === 'loading' && (
        <div
          className="mt-4 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 animate-fade-up"
          role="status"
          aria-live="polite"
        >
          <div className="relative h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="absolute inset-y-0 left-0 w-1/3 animate-indeterminate rounded-full bg-primary" />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-text">{STEPS[step]}…</span>
            <span className="text-muted">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
        </div>
      )}

      {/* ---------------------- Error ------------------------- */}
      {status === 'error' && error && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger animate-fade-up"
          role="alert"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Results render right under the box on every page that uses it. */}
      <div ref={resultsRef} className="scroll-mt-24">
        {result && status === 'done' && (
          <section aria-label="Download options" className="mt-8">
            <Results result={result} onGifError={setError} />
          </section>
        )}
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}