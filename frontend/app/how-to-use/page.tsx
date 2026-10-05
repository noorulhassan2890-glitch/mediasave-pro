import type { Metadata } from 'next';
import HowToSteps from '@/components/HowToSteps';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Use',
  description:
    'Learn how to download videos, reels, stories and audio from Instagram, TikTok, Facebook, X, Threads and Pinterest with MediaSave Pro.',
  alternates: { canonical: '/how-to-use' },
};

const PLATFORM_GUIDES = [
  {
    id: 'youtube',
    name: 'YouTube',
    steps: [
      'Open the video and click Share (below the player).',
      'Copy the link (youtube.com/... or youtu.be/...).',
      'Paste it here and pick Normal, High or Original quality.',
    ],
    note: 'Shorts use the same flow; “Audio only” gives you the soundtrack.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    steps: [
      'Open the reel, post or story you want.',
      'Tap the ⋯ (or paper-plane) button and choose “Copy link”.',
      'Paste it into the box on the home page and press Download.',
    ],
    note: 'Carousels come back as individual images — tick them and download as ZIP.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    steps: [
      'Tap Share on the right side of the video.',
      'Choose “Copy link”.',
      'Paste it here — watermarks are not added to your file.',
    ],
    note: 'Use “Audio only” to grab just the sound.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    steps: [
      'Open the video or reel and click ⋯ → “Copy link”.',
      'For stories, open the story and copy its link from the address bar.',
      'Paste and download in Normal, High or Original quality.',
    ],
    note: 'Works for public posts only — private groups are not supported.',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    steps: [
      'Click the share icon under the post.',
      'Choose “Copy link to post”.',
      'Paste it into the downloader.',
    ],
    note: 'Photos and GIFs download individually.',
  },
  {
    id: 'threads',
    name: 'Threads',
    steps: [
      'Tap the ⋯ menu on the thread.',
      'Select “Copy link”.',
      'Paste it here and pick a quality.',
    ],
    note: 'Video threads are returned as a single file.',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    steps: [
      'Open the Pin and tap ⋯ → “Copy link”.',
      'Paste the link into the box.',
      'Download the video or image in one click.',
    ],
    note: 'Idea Pins with multiple frames are returned as a gallery.',
  },
];

export default function HowToUsePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <span className="section-kicker">Guide</span>
      <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
        How to use MediaSave Pro
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        The whole flow takes about ten seconds. This page also covers per-platform
        tips so you always get the best quality available.
      </p>

      <div className="mt-10">
        <HowToSteps compact />
      </div>

      {/* Per-platform guides */}
      <section aria-labelledby="platform-guides" className="mt-16">
        <h2 id="platform-guides" className="text-xl font-bold tracking-tight sm:text-2xl">
          Platform-by-platform guide
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PLATFORM_GUIDES.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <h3 className="text-base font-semibold tracking-tight">{guide.name}</h3>
              <ol className="mt-3 space-y-2">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-sm text-muted">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-xs text-muted">Tip: {guide.note}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mt-14 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold tracking-tight">Tips for best results</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li className="flex gap-2"><span className="text-primary">·</span>Always use public posts — private or members-only content cannot be fetched.</li>
          <li className="flex gap-2"><span className="text-primary">·</span>If a size shows “~”, the CDN didn&apos;t report one and we estimated it from duration × bitrate.</li>
          <li className="flex gap-2"><span className="text-primary">·</span>Use “Copy link” to keep a direct URL for your download manager.</li>
          <li className="flex gap-2"><span className="text-primary">·</span>GIF conversion is limited to 30-second clips.</li>
        </ul>
        <div className="mt-5">
          <Link href="/" className="btn-primary">Start downloading →</Link>
        </div>
      </section>
    </div>
  );
}
