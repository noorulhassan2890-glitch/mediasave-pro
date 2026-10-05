import Link from 'next/link';

/** Simple, quiet footer — no ads, just navigation + legal. */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {/* Brand column */}
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
                <path d="M5 18h14" />
              </svg>
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              MediaSave<span className="text-primary"> Pro</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A fast, private downloader for Instagram, TikTok, Facebook, X, Threads and
            Pinterest. No login, no watermark, no nonsense.
          </p>
        </div>

        {/* Link columns */}
        <FooterColumn
          title="Product"
          links={[
            { href: '/', label: 'Home' },
            { href: '/how-to-use', label: 'How to Use' },
            { href: '/faq', label: 'FAQ' },
          ]}
        />
        <FooterColumn
          title="Downloaders"
          links={[
            { href: '/how-to-use#youtube', label: 'YouTube' },
            { href: '/how-to-use#instagram', label: 'Instagram' },
            { href: '/how-to-use#tiktok', label: 'TikTok' },
            { href: '/how-to-use#facebook', label: 'Facebook' },
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            { href: '/faq#legal', label: 'Terms of Use' },
            { href: '/faq#legal', label: 'Privacy' },
            { href: '/faq#copyright', label: 'Copyright' },
          ]}
        />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {year} MediaSave Pro. All rights reserved.</p>
          <p>
            For personal use only · Respect creators and{' '}
            <Link href="/faq#copyright" className="underline transition hover:text-text">
              copyright holders
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-muted transition hover:text-text">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
