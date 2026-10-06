import type { NextConfig } from "next";

/**
 * Where `/api/*` is proxied. No fallback, on purpose.
 *
 * This used to default to `http://localhost:3001`, which meant an unset
 * BACKEND_URL produced a *successful* production build: the marketing page
 * rendered fine and every authenticated API call 502'd against the deploy
 * host's own localhost. The port was wrong everywhere too — .env.example
 * documents 5000 and the server defaults to 3000.
 *
 * `lib/site-content.ts` already refuses a fallback for the same reason. Failing
 * the build is the loud, early version of that failure.
 */
const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error(
    'BACKEND_URL is not set. It is required to proxy /api/* to the API server — ' +
      'without it every authenticated request fails at runtime. Set it in .env.local ' +
      'for development (see .env.example) and in the hosting environment for deploys.',
  );
}

const nextConfig: NextConfig = {
  // Dev only: let Cloudflare quick-tunnel links (cloudflared) load dev assets/HMR.
  allowedDevOrigins: ['*.trycloudflare.com'],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "*.apollo.io" },
    ],
  },
};

export default nextConfig;
