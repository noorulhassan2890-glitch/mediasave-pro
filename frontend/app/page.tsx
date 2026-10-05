import type { Metadata } from 'next';
import DownloadFlow from '@/components/DownloadFlow';
import AdSlot from '@/components/AdSlot';
import ToolsSection from '@/components/ToolsSection';
import HowToSteps from '@/components/HowToSteps';
import FaqSection from '@/components/FaqSection';
import JsonLd from '@/components/JsonLd';
import { FAQS, HOW_TO_STEPS } from '@/lib/content';
import { faqLd, howToLd, softwareApplicationLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'MediaSave Pro — Free Social Media Video Downloader',
  description:
    'Free online video downloader for YouTube, Instagram, TikTok, Facebook, X, Threads and Pinterest. Save reels, stories, photos and audio in HD — no watermark, no signup, no app.',
  alternates: { canonical: '/' },
};

/**
 * Home page layout (top → bottom):
 *   hero + input + results      ← interactive (client component)
 *   ad slot 1                   ← lower section only
 *   other tools                 ← "recently downloaded" appears inside DownloadFlow
 *   how to use
 *   ad slot 2
 *   FAQ
 *
 * No ads are rendered anywhere above the download box or its results.
 */
export default function HomePage() {
  return (
    <>
      {/* Rich-result data: app card, step-by-step guide and FAQ accordions. */}
      <JsonLd data={softwareApplicationLd()} />
      <JsonLd data={howToLd(HOW_TO_STEPS)} />
      <JsonLd data={faqLd(FAQS)} />

      <DownloadFlow />

      {/* ── Lower-page slots start here ─────────────────────────────── */}
      <div className="mt-12 space-y-14 pb-16">
        <AdSlot slot="home-after-results" />

        <ToolsSection />

        <HowToSteps />

        <AdSlot slot="home-before-footer" />

        <FaqSection />
      </div>
    </>
  );
}