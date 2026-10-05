import Link from 'next/link';

/** Friendly 404. */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="text-6xl font-extrabold tracking-tight text-primary/20">404</span>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="btn-primary mt-6">Back to the downloader</Link>
    </div>
  );
}
