import type { Metadata } from 'next';
import Link from 'next/link';
import FaqSection from '@/components/FaqSection';
import AdSlot from '@/components/AdSlot';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about supported platforms, privacy, file sizes, copyright and how the MediaSave Pro downloader works.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <span className="section-kicker">Support</span>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-muted">
          Everything about platforms, privacy, sizes and limits. Still stuck? The
          answers below cover 95% of cases.
        </p>

        <div className="mt-9">
          <FaqSection includeAnchors />
        </div>

        {/* Legal / copyright block (linked from the footer) */}
        <section id="legal" className="mt-12 scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-card">
          <span id="copyright" className="block scroll-mt-24" />
          <h2 className="text-lg font-bold tracking-tight">Copyright &amp; acceptable use</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            MediaSave Pro is a personal-use tool. Downloading content you own, content
            released under an open licence, or content you have explicit permission to
            save is fine. Redistributing other people&apos;s work, re-uploading it, or
            using it commercially without rights may infringe copyright law — that is
            your responsibility as the downloader.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            We store nothing on our servers: files are streamed from the source to your
            device, and your history lives only in your browser&apos;s localStorage.
          </p>
        </section>

        <div className="mt-8 text-center">
          <Link href="/" className="btn-primary">Back to the downloader</Link>
        </div>
      </div>

      {/* Single lower-page ad slot */}
      <div className="pb-16">
        <AdSlot slot="faq-before-footer" />
      </div>
    </>
  );
}
