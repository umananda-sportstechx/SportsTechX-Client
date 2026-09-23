import type { MetadataRoute } from 'next';
import { SITE_URL as BASE } from './layout';

/**
 * Public marketing surface only.
 *
 * Deliberately excluded: /w/[token] (shared watchlist links must never be
 * indexed), /login, /forgot-password, /reset-password, /auth and everything
 * under the authed app. See PUBLIC_PATHS in lib/supabase/middleware.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/terms-of-service`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
