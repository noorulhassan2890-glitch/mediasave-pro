import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { LANDING_PAGES } from '@/lib/landingPages';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ['', '/how-to-use', '/faq'].map((path) => ({
    url: absoluteUrl(path || '/'),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }));

  const landingRoutes = LANDING_PAGES.map((page) => ({
    url: absoluteUrl(page.slug),
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...landingRoutes];
}