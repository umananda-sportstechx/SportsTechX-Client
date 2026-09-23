import type { MetadataRoute } from 'next';
import { SITE_URL } from './layout';

/**
 * Everything outside PUBLIC_PATHS (lib/supabase/middleware.ts) sits behind auth
 * and 307s to /login, so crawling it wastes budget and indexes a login page.
 * /w/ is listed explicitly: those are tokenised share links, not public pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/raise/', '/w/', '/auth/', '/docs/', '/api/', '/confirm', '/reset-password', '/forgot-password'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
