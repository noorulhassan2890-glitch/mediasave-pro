import type { Metadata } from 'next';
import LandingPageView from '@/components/LandingPageView';
import { getLandingPage } from '@/lib/landingPages';
import { pageMetadata } from '@/lib/seo';

const SLUG = '/twitter-downloader';
const page = getLandingPage(SLUG)!;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  description: page.metaDescription,
  path: page.slug,
  keywords: page.keywords,
});

export default function Page() {
  return <LandingPageView page={page} />;
}