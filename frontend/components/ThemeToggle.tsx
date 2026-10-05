'use client';

import { useEffect, useState } from 'react';
import type { Theme } from '@/lib/storage';
import { getStoredTheme, storeTheme } from '@/lib/storage';

/**
 * Dark/light toggle.
 * The initial class is set by the inline script in app/layout.tsx, so this
 * component only handles *changes* (avoids hydration mismatch).
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Read the resolved theme after mount (client-only).
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    storeTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-text transition hover:bg-subtle"
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        viewBox="0 0 24 24"
        className={`h-[18px] w-[18px] ${theme === 'dark' ? 'block' : 'hidden'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
      </svg>
      {/* Moon icon (shown in light mode) */}
      <svg
        viewBox="0 0 24 24"
        className={`h-[18px] w-[18px] ${theme !== 'dark' ? 'block' : 'hidden'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
