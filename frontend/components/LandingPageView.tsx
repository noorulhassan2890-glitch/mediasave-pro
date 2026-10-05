import Link from 'next/link';
import { LANDING_PAGES, type LandingPage } from '@/lib/landingPages';
import { breadcrumbLd, faqLd, howToLd, pageMetadata } from '@/lib/seo';
import DownloadBox from './DownloadBox';
import JsonLd from './JsonLd';
import AdSlot from './AdSlot';

/**
 * Shared template for every platform / tool landing page.
 *
 * Each page is a real indexable route with its own title, description and
 * JSON-LD, and it embeds the working download box so visitors can convert
 * without bouncing back to the home page.
 */
export default function LandingPageView({ page }: { page: LandingPage }) {
  const others = LANDING_PAGES.filter((p) => p.slug !== page.slug).slice(0, 6);

  return (
    <>
      <JsonLd data={breadcrumbLd(page.slug, page.title)} />
      <JsonLd data={howToLd(page.steps)} />
      <JsonLd data={faqLd(page.faqs)} />

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
          <ol className="flex flex-wrap items-center justify-center gap-1.5">
            <li>
              <Link href="/" className="transition hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-text">{page.name}</li>
          </ol>
        </nav>

        <span className="section-kicker">Free · No login · No watermark</span>
        <h1 className="mt-3 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          {page.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          {page.tagline}
        </p>

        <div className="mt-8 text-left">
          <DownloadBox
            placeholder={`https://${domainHint(page.slug)}`}
            cta={`Download from ${page.name}`}
          />
        </div>
      </section>

      {/* --------------------------- Long copy --------------------------- */}
      <section className="mx-auto mt-14 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="section-title">How the {page.name} downloader works</h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted">{page.intro}</p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {page.steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <span className="text-xs font-bold tracking-wide text-primary">
                STEP {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold text-text">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------- Features ---------------------------- */}
      <section className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6">
        <div className="surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text">What you can save</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {page.supports.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------ FAQ ------------------------------ */}
      <section className="mx-auto mt-12 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="section-title">{page.name} downloader FAQ</h2>
        <div className="mt-5 space-y-3">
          {page.faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-card shadow-card open:border-primary/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-subtle text-muted transition group-open:rotate-45 group-open:bg-primary group-open:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Ads stay in the lower half only (project ad policy). */}
      <div className="mt-12">
        <AdSlot slot={`lp-${page.slug.replace(/\W+/g, '')}`} />
      </div>

      {/* ----------------------- Internal linking ------------------------- */}
      <section className="mx-auto mt-12 w-full max-w-3xl px-4 pb-14 sm:px-6">
        <h2 className="text-base font-semibold text-text">Other downloaders</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={other.slug}
                className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted transition hover:border-primary/40 hover:text-text"
              >
                {other.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Looking for something else? The{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            main downloader
          </Link>{' '}
          handles all 7 platforms in one box, and the{' '}
          <Link href="/faq" className="font-medium text-primary hover:underline">
            FAQ
          </Link>{' '}
          covers privacy, legal use and troubleshooting.
        </p>
      </section>
    </>
  );
}

/** Placeholder domain shown in the input on each platform page. */
function domainHint(slug: string): string {
  if (slug.includes('twitter')) return 'x.com/...';
  if (slug.includes('youtube')) return 'youtube.com/watch?v=...';
  if (slug.includes('pinterest')) return 'pinterest.com/pin/...';
  if (slug.includes('threads')) return 'threads.net/@user/post/...';
  if (slug.includes('facebook')) return 'facebook.com/reel/...';
  if (slug.includes('tiktok')) return 'tiktok.com/@user/video/...';
  if (slug.includes('instagram')) return 'instagram.com/reel/...';
  return 'paste a public link…';
}