import type { MetadataRoute } from 'next';
import { SITE_URL } from './layout';

/**
 * The private trees (PRIVATE_PREFIXES in lib/public-paths.ts) 307 to /login, so
 * crawling them wastes budget. `/w/` is listed explicitly: those are tokenised
 * share links, not public pages.
 *
 * `/login` is disallowed because every one of those redirects lands on it. It
 * was crawlable while also being the convergence point of every redirect on the
 * domain — the combination that produces duplicate-content and soft-404 signals
 * on the one page you least want ranking. Unknown URLs now return a real 404
 * rather than redirecting here, which is what lets the retired `/raise/*`,
 * `/explore/*`, `/scout/*` and `/dashboard` URLs drop out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/onboarding', '/billing', '/w/', '/auth/', '/docs/', '/api/', '/confirm', '/login', '/reset-password', '/forgot-password'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
