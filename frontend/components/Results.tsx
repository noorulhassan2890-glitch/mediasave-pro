'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { convertMedia, downloadZip, fileUrl } from '@/lib/api';
import { PLATFORMS } from '@/lib/platforms';
import type { FormatOption, MediaResult } from '@/lib/types';
import { formatBytes, formatDuration, formatSizeText, safeFilename, triggerDownload } from '@/lib/utils';

interface Props {
  result: MediaResult;
  onGifError: (message: string) => void;
}

type BusyKey = string | null;

/**
 * The results card: preview + quality tiers + every download action.
 *
 * Actions implemented:
 *  · per-quality Download (proxied through /api/file for a clean filename)
 *  · copy direct link
 *  · audio only (direct or MP3 conversion)
 *  · GIF conversion (short clips)
 *  · multi-select → single ZIP
 */
export default function Results({ result, onGifError }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BusyKey>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The row currently highlighted / picked by a preset (radio semantics).
  const [activeId, setActiveId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const platform = PLATFORMS[result.platform as keyof typeof PLATFORMS] ?? null;
  const baseName = useMemo(() => safeFilename(result.title, 'mediasave'), [result.title]);
  // DASH sources (e.g. YouTube) expose a separate audio stream — pass its URL
  // so the backend can merge video+audio into one playable MP4.
  const mergeAudio =
    result.audio && result.audio.method === 'direct' ? result.audio.url : null;
  // DASH tier → the backend muxes the audio stream in, so the delivered file
  // (and its advertised size) already contains sound.
  const needsMerge = (f: FormatOption) =>
    !f.has_audio && (Boolean(mergeAudio) || f.has_audio_merge === true);

  // Tiers sorted low → high, so "the best" is always the last entry.
  const tiers = useMemo(
    () => [...result.formats].sort((a, b) => (a.height ?? 0) - (b.height ?? 0)),
    [result.formats],
  );
  const bestTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
  // Smallest file that still plays with sound: the lowest tier that has audio
  // built in or will get audio joined by the backend.
  const smallestTier = tiers.find((f) => f.has_audio || needsMerge(f)) ?? tiers[0] ?? null;
  const audioOption = result.audio;

  // A fresh result must not keep the previous pick highlighted.
  useEffect(() => {
    setActiveId(bestTier ? bestTier.id : null);
  }, [bestTier]);

  /** Preset: pick a tier, mark the row and scroll/focus it. */
  const applyPreset = (tier: FormatOption | null) => {
    if (!tier) return;
    setActiveId(tier.id);
    const row = rowRefs.current[tier.id];
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    row?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });
  };

  // Everything tickable: quality tiers + audio + carousel images.
  const selectable = useMemo(() => {
    const items: { key: string; label: string; url: string; filename: string }[] = [];
    for (const f of result.formats) {
      items.push({ key: f.id, label: `${f.label} (${f.quality})`, url: f.url, filename: `${baseName}-${f.quality}.${f.ext}` });
    }
    if (result.audio) {
      items.push({ key: 'audio', label: result.audio.quality, url: result.audio.url, filename: `${baseName}-audio.${result.audio.ext}` });
    }
    result.images.forEach((src, i) => {
      const ext = src.split('?')[0].split('.').pop() || 'jpg';
      items.push({ key: `img-${i}`, label: `Image ${i + 1}`, url: src, filename: `${baseName}-${i + 1}.${ext}` });
    });
    return items;
  }, [result, baseName]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --------------------------------------------------------------------- //
  // Actions
  // --------------------------------------------------------------------- //
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed.';
      setNotice(message);
      onGifError(message);
    } finally {
      setBusy(null);
    }
  };

  /** Normal/High/Original download (or ffmpeg conversion for audio). */
  const downloadFormat = (format: FormatOption) =>
    run(format.id, async () => {
      if (format.method === 'convert') {
        await convertMedia({ url: format.url, kind: 'mp3', filename: baseName });
      } else {
        triggerDownload(
          fileUrl(format, `${baseName}-${format.quality}.${needsMerge(format) ? 'mp4' : format.ext}`, needsMerge(format) ? mergeAudio : null),
        );
      }
    });

  /** Audio-only option. */
  const downloadAudio = () =>
    run('audio', async () => {
      const audio = result.audio!;
      if (audio.method === 'convert') {
        await convertMedia({ url: audio.url, kind: 'mp3', filename: baseName });
      } else {
        triggerDownload(fileUrl(audio, `${baseName}-audio.${audio.ext}`));
      }
    });

  /** Copy the proxied download URL of a format to the clipboard. */
  const copyLink = async (format: FormatOption) => {
    const link = fileUrl(
      format,
      `${baseName}-${format.quality}.${needsMerge(format) ? 'mp4' : format.ext}`,
      needsMerge(format) ? mergeAudio : null,
    );
    try {
      await navigator.clipboard.writeText(link);
      setCopied(format.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setNotice('Clipboard is blocked by the browser — long-press to copy instead.');
    }
  };

  /** Convert the best quality video into a GIF (server-side ffmpeg). */
  const convertToGif = () =>
    run('gif', async () => {
      const best = result.formats[result.formats.length - 1] ?? result.audio;
      if (!best) throw new Error('No video found for GIF conversion.');
      await convertMedia({ url: best.url, kind: 'gif', filename: baseName, length: 6, fps: 12, width: 480 });
    });

  /** Download every ticked item as one ZIP. */
  const downloadZipAll = () =>
    run('zip', async () => {
      const items = selectable.filter((s) => selected.has(s.key));
      if (items.length === 0) throw new Error('Select at least one file first.');
      await downloadZip(baseName, items.map(({ url, filename }) => ({ url, filename })));
    });

  const selectedItems = selectable.filter((s) => selected.has(s.key));
  const duration = result.duration ?? null;

  // --------------------------------------------------------------------- //
  // Render
  // --------------------------------------------------------------------- //
  return (
    <div className="surface overflow-hidden animate-fade-up">
      {/* ------------------------- Preview -------------------------- */}
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-subtle sm:aspect-[4/3] sm:w-56">
          {result.thumbnail ? (
            // Plain <img>: thumbnails come from many different CDNs,
            // so next/image remotePatterns would be brittle here.
            <img
              src={result.thumbnail}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m10 9 5 3-5 3V9Z" />
              </svg>
            </div>
          )}

          {/* Duration badge */}
          {duration !== null && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {formatDuration(duration)}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-subtle px-2.5 py-1 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${platform?.dot ?? 'bg-primary'}`} aria-hidden="true" />
              {result.platform_name}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium capitalize text-muted">
              {result.is_story ? 'Story' : result.media_type}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight">{result.title}</h3>
          {result.author && <p className="mt-1 text-sm text-muted">by {result.author}</p>}

          {result.requires_login && (
            <p className="mt-2 text-xs text-muted">
              Tip: if this download fails, the post may be restricted — only public content is supported.
            </p>
          )}

          {/* Quick actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {result.audio && (
              <button type="button" onClick={downloadAudio} disabled={busy !== null} className="btn-ghost !py-2 text-xs">
                {busy === 'audio' ? <Spinner /> : <MusicIcon />}
                {result.audio.method === 'convert' ? 'MP3' : 'Audio only'}
              </button>
            )}
            {result.media_type === 'video' && (
              <button type="button" onClick={convertToGif} disabled={busy !== null} className="btn-ghost !py-2 text-xs">
                {busy === 'gif' ? <Spinner /> : <SparkIcon />}
                GIF
              </button>
            )}
            <button
              type="button"
              onClick={() => void downloadZipAll()}
              disabled={busy !== null || selectedItems.length === 0}
              className="btn-ghost !py-2 text-xs"
            >
              {busy === 'zip' ? <Spinner /> : <ZipIcon />}
              ZIP {selectedItems.length > 0 && `(${selectedItems.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------- Quality options list -------------------- */}
      {(result.formats.length > 0 || result.images.length > 0) && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {result.images.length > 0 ? 'Images' : 'Quality options'}
            </h4>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[rgb(var(--primary))]"
                checked={selectedItems.length === selectable.length && selectable.length > 0}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(selectable.map((s) => s.key)) : new Set())
                }
              />
              Select all
            </label>
          </div>

          {/* Preset picks — highlight + scroll to the matching row */}
          {tiers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-5">
              <button
                type="button"
                onClick={() => applyPreset(bestTier)}
                aria-pressed={Boolean(bestTier && activeId === bestTier.id)}
                className={`btn-ghost !py-2 text-xs ${
                  bestTier && activeId === bestTier.id ? '!border-primary !text-primary' : ''
                }`}
              >
                <CrownIcon />
                Best quality
              </button>
              <button
                type="button"
                onClick={() => applyPreset(smallestTier)}
                aria-pressed={Boolean(smallestTier && activeId === smallestTier.id)}
                className={`btn-ghost !py-2 text-xs ${
                  smallestTier && activeId === smallestTier.id ? '!border-primary !text-primary' : ''
                }`}
              >
                <ShrinkIcon />
                Smallest file
              </button>
              <span className="hidden text-[11px] text-muted sm:inline">
                Picks highlight the matching row below.
              </span>
            </div>
          )}

          <ul className="space-y-2 p-4 sm:p-5">
            {/* Quality tiers */}
            {tiers.map((format) => {
              const checked = selected.has(format.id);
              const active = activeId === format.id;
              const merge = needsMerge(format);
              const resLabel = format.height ? `${format.height}p` : format.quality;
              const fpsLabel = format.fps ? `${Math.round(format.fps)}fps` : null;
              const container = (format.container || format.ext || '').toUpperCase();
              const sizeText = formatSizeText(
                format.size_bytes ?? format.filesize ?? null,
                format.size_is_estimate ?? format.filesize_approx ?? false,
              );
              return (
                <li
                  key={format.id}
                  ref={(el) => {
                    rowRefs.current[format.id] = el;
                  }}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                      : checked
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality-row"
                    aria-label={`Select ${format.label} quality`}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
                    checked={active}
                    onChange={() => setActiveId(format.id)}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{format.label}</span>
                      <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium text-muted">
                        {resLabel}
                        {fpsLabel ? ` ${fpsLabel}` : ''}
                        {format.codec ? ` · ${format.codec}` : ''}
                        {container ? ` · ${container}` : ''}
                      </span>
                      {active && (
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          Selected
                        </span>
                      )}
                      {!format.has_audio && !merge && (
                        <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs text-muted">
                          no audio
                        </span>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted">
                        <input
                          type="checkbox"
                          aria-label={`Add ${format.label} to ZIP`}
                          className="h-3.5 w-3.5 accent-[rgb(var(--primary))]"
                          checked={checked}
                          onChange={() => toggle(format.id)}
                        />
                        ZIP
                      </label>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {sizeText}
                      {format.note && !fpsLabel ? ` · ${format.note}` : ''}
                    </p>
                    {merge && (
                      <p className="mt-1 text-[11px] leading-snug text-muted">
                        Video and audio are separate on this quality. We join them for you.
                      </p>
                    )}
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => void copyLink(format)}
                      className="btn-ghost flex-1 !px-3 !py-2 text-xs sm:flex-none"
                      aria-label={`Copy link for ${format.label}`}
                    >
                      {copied === format.id ? 'Copied ✓' : 'Copy link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadFormat(format)}
                      disabled={busy !== null}
                      className="btn-primary flex-[2] !py-2 text-sm sm:flex-none"
                    >
                      {busy === format.id ? <Spinner /> : <DownIcon />}
                      Download
                    </button>
                  </div>
                </li>
              );
            })}

            {/* Audio-only option (with its size) */}
            {audioOption && (
              <li
                ref={(el) => {
                  rowRefs.current[audioOption.id] = el;
                }}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${
                  activeId === audioOption.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : selected.has(audioOption.id)
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <input
                  type="radio"
                  name="quality-row"
                  aria-label="Select audio only"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
                  checked={activeId === audioOption.id}
                  onChange={() => setActiveId(audioOption.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">Audio</span>
                    <span className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium text-muted">
                      {audioOption.quality}
                      {audioOption.bitrate ? ` · ${audioOption.bitrate} kbps` : ''}
                    </span>
                    {activeId === audioOption.id && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        Selected
                      </span>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted">
                      <input
                        type="checkbox"
                        aria-label="Add audio to ZIP"
                        className="h-3.5 w-3.5 accent-[rgb(var(--primary))]"
                        checked={selected.has(audioOption.id)}
                        onChange={() => toggle(audioOption.id)}
                      />
                      ZIP
                    </label>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatSizeText(
                      audioOption.size_bytes ?? audioOption.filesize ?? null,
                      audioOption.size_is_estimate ?? audioOption.filesize_approx ?? false,
                    )}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={downloadAudio}
                    disabled={busy !== null}
                    className="btn-primary w-full !py-2 text-sm sm:w-auto"
                  >
                    {busy === 'audio' ? <Spinner /> : <DownIcon />}
                    Download
                  </button>
                </div>
              </li>
            )}

            {/* Carousel / photo images */}
            {result.images.map((src, index) => {
              const key = `img-${index}`;
              const checked = selected.has(key);
              const ext = src.split('?')[0].split('.').pop() || 'jpg';
              return (
                <li
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    checked ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select image ${index + 1}`}
                    className="h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
                    checked={checked}
                    onChange={() => toggle(key)}
                  />
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-subtle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Image {index + 1}</p>
                    <p className="text-xs text-muted">.{ext.toUpperCase()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDownload(fileUrl({ url: src }, `${baseName}-${index + 1}.${ext}`))
                    }
                    disabled={busy !== null}
                    className="btn-primary !py-2 text-sm"
                  >
                    <DownIcon />
                    Download
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Notice / error line */}
      {notice && (
        <p className="border-t border-border px-4 py-3 text-sm text-danger sm:px-5" role="alert">
          {notice}
        </p>
      )}

      {/* Legal whisper */}
      <p className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted sm:px-5">
        Download only content you own or have permission to use. Estimated sizes are
        approximations when the source doesn&apos;t publish one.{' '}
        {formatBytes(result.formats[0]?.filesize ?? null) !== '—' && 'Actual sizes come straight from the source.'}
      </p>
    </div>
  );
}

// ------------------------------- icons ---------------------------------- //
const svgProps = { viewBox: '0 0 24 24', className: 'h-4 w-4', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const DownIcon = () => (
  <svg {...svgProps}><path d="M12 4v10m0 0 4-4m-4 4-4-4" /><path d="M5 18h14" /></svg>
);
const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const MusicIcon = () => (
  <svg {...svgProps}><path d="M9 18V6l10-2v12" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="16" r="2" /></svg>
);
const SparkIcon = () => (
  <svg {...svgProps}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
);
const ZipIcon = () => (
  <svg {...svgProps}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><path d="M12 5v4m0 0v4m0-4h2.5M12 9H9.5" /></svg>
);
const CrownIcon = () => (
  <svg {...svgProps}><path d="M4 17h16M4 17 3 7l5 4 4-6 4 6 5-4-1 10" /></svg>
);
const ShrinkIcon = () => (
  <svg {...svgProps}><path d="M8 3v4H4M16 21v-4h4M4 7l5 5M20 17l-5-5" /></svg>
);
