import { HOW_TO_STEPS } from '@/lib/content';

/**
 * 3-step "How to use" explainer (rendered on the home page below the tools,
 * and reused on /how-to-use).
 */
export default function HowToSteps({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="how-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="max-w-2xl">
        <span className="section-kicker">How to use</span>
        <h2 id="how-heading" className="section-title mt-1.5">
          Three steps, zero setup
        </h2>
        <p className="mt-2 text-muted">
          No extension, no account, no waiting rooms. Copy → paste → download.
        </p>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {HOW_TO_STEPS.map((item) => (
          <li
            key={item.step}
            className="relative rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <span className="text-4xl font-extrabold tracking-tight text-primary/15">{item.step}</span>
            <h3 className="mt-2 text-base font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
          </li>
        ))}
      </ol>

      {!compact && (
        <p className="mt-6 text-sm text-muted">
          Supported:{' '}
          <span className="font-medium text-text">
            Instagram · TikTok · Facebook · X (Twitter) · Threads · Pinterest
          </span>
        </p>
      )}
    </section>
  );
}
