import Link from 'next/link';
import { TOOLS } from '@/lib/content';

/**
 * "Other tools" grid — the section between the two ad slots.
 * Static (server-rendered) so it costs nothing to the interactive bundle.
 */
export default function ToolsSection() {
  return (
    <section aria-labelledby="tools-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="section-kicker">Other tools</span>
          <h2 id="tools-heading" className="section-title mt-1.5">
            Everything you need to save media
          </h2>
        </div>
        <Link
          href="/how-to-use"
          className="hidden shrink-0 text-sm font-medium text-primary transition hover:underline sm:block"
        >
          See how it works →
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((tool) => (
          <li key={tool.title}>
            <Link
              href={tool.href}
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-pop"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
                  <path d="M5 18h14" />
                </svg>
              </span>
              <h3 className="mt-3.5 text-[15px] font-semibold tracking-tight">{tool.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{tool.description}</p>
              <span className="mt-auto pt-3 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
