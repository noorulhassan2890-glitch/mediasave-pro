/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compression is on by default in production; kept explicit for clarity.
  compress: true,
  async headers() {
    return [
      {
        // Aggressive caching for static assets (Next handles hashed files).
        source: '/:path*.(svg|png|jpg|jpeg|webp|ico|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
