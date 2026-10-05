import { FAQS } from '@/lib/content';

/**
 * FAQ accordion built on native <details>/<summary> — works without JS,
 * keyboard-accessible, and screen-reader friendly by default.
 */
export default function FaqSection({ includeAnchors = false }: { includeAnchors?: boolean }) {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="text-center">
        <span className="section-kicker">FAQ</span>
        <h2 id="faq-heading" className="section-title mt-1.5">
          Frequently asked questions
        </h2>
      </div>

      <div className="mt-7 space-y-3">
        {FAQS.map((item, index) => (
          <details
            key={item.q}
            // Stagger the first few open by default on the dedicated page.
            open={includeAnchors && index < 2}
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
  );
}
