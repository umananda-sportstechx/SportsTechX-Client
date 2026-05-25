/**
 * Canonical SWR cache keys. Single source of truth — typo-proof.
 *
 * Conventions:
 *   - Each function returns a tuple `as const` so TypeScript can match
 *     against keys for prefix-invalidation via the global `mutate`.
 *   - First element is always the API path string (used by the fetcher
 *     in `lib/query-client.ts` to derive the URL).
 *   - Subsequent elements are search-param objects that participate in
 *     cache-key identity. Two queries with different params are different
 *     cache entries.
 *
 * Usage:
 *   useSWR(qk.companies.list({ page: 1, q: 'football' }))
 *   useSWRConfig().mutate(qk.profile())
 *   // prefix-invalidate every /api/companies cache entry:
 *   useSWRConfig().mutate((key) => Array.isArray(key) && key[0] === '/api/companies')
 */

export const qk = {
  // ── Identity ────────────────────────────────────────────────────────────
  profile: () => ['/api/profiles/me'] as const,
  features: () => ['/api/features'] as const,

  // ── Reference ──────────────────────────────────────────────────────────
  reference: {
    sports: () => ['/api/sports'] as const,
    sectors: () => ['/api/sectors'] as const,
    techTags: () => ['/api/tech-tags'] as const,
    currencies: () => ['/api/currencies'] as const,
    roundTypes: () => ['/api/round-types'] as const,
  },

  // ── Browsable collections ───────────────────────────────────────────────
  companies: {
    list: (params: Record<string, unknown> = {}) => ['/api/companies', params] as const,
    detail: (idOrSlug: string) => ['/api/companies', idOrSlug] as const,
  },
  investors: {
    list: (params: Record<string, unknown> = {}) => ['/api/investors', params] as const,
    detail: (idOrSlug: string) => ['/api/investors', idOrSlug] as const,
  },
  deals: {
    list: (params: Record<string, unknown> = {}) => ['/api/deals', params] as const,
  },
  acquisitions: {
    list: (params: Record<string, unknown> = {}) => ['/api/acquisitions', params] as const,
  },
  ecosystem: {
    list: (params: Record<string, unknown> = {}) => ['/api/ecosystem-entities', params] as const,
    listByType: (type: string, params: Record<string, unknown> = {}) =>
      ['/api/ecosystem-entities', { type, ...params }] as const,
  },

  // ── Search ──────────────────────────────────────────────────────────────
  search: {
    typeahead: (q: string, types?: string[]) => ['/api/search', { q, types }] as const,
  },

  // ── User-owned ──────────────────────────────────────────────────────────
  favorites: {
    list: (kind: string) => ['/api/favorites', kind] as const,
  },
  savedSearches: {
    list: () => ['/api/saved-searches'] as const,
    detail: (id: string) => ['/api/saved-searches', id] as const,
  },
  pinnedLists: {
    list: () => ['/api/pinned-lists'] as const,
    detail: (id: string) => ['/api/pinned-lists', id] as const,
  },
  claims: {
    mine: () => ['/api/claims/mine'] as const,
    detail: (id: string) => ['/api/claims', id] as const,
  },
  dataRequests: {
    changeMine: () => ['/api/data-change-requests/mine'] as const,
    editMine: () => ['/api/data-edit-requests/mine'] as const,
  },

  // ── Reports ─────────────────────────────────────────────────────────────
  // NOTE: detail/sections/sectionData/pollResults all interpolate the id into
  // the path string. `buildUrl` in lib/query-client.ts skips non-object key
  // parts (strings are treated as cache-identity only, not URL fragments), so
  // ['/api/reports', id] would build the wrong URL. Other detail-style keys
  // in this file have the same legacy bug — fix the ones you actually use as
  // you encounter them; don't refactor buildUrl globally because some keys
  // (e.g. credits.balance) deliberately rely on the strings-skipped behaviour.
  reports: {
    list: () => ['/api/reports'] as const,
    detail: (idOrSlug: string) => [`/api/reports/${idOrSlug}`] as const,
    sections: (idOrSlug: string, as?: 'free' | 'growth' | 'pro') =>
      [`/api/reports/${idOrSlug}/sections`, as ? { as } : {}] as const,
    sectionData: (sectionId: string) => [`/api/reports/sections/${sectionId}/data`] as const,
    pollResults: (pollId: string) => [`/api/reports/polls/${pollId}/results`] as const,
  },
  verifiedReports: {
    mine: () => ['/api/verified-reports/mine'] as const,
    detail: (id: string) => ['/api/verified-reports', id] as const,
  },

  // ── Recommendations ─────────────────────────────────────────────────────
  recommendations: () => ['/api/recommendations'] as const,

  // ── Newsletter (Beehiiv RSS proxy) ──────────────────────────────────────
  newsletter: {
    articles: () => ['/api/newsletter/articles'] as const,
  },

  // ── Analytics aggregations (10-min cache server-side) ───────────────────
  analytics: {
    dashboard: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/dashboard-stats', { period }] as const,
    fundingTotals: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/funding-totals', { period }] as const,
    maStats: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/ma-stats', { period }] as const,
    quarterly: (params: { from?: number; to?: number } = {}) => ['/api/analytics/quarterly-capital', params] as const,
    sectorHeat: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 12) => ['/api/analytics/sector-heat', { period, limit }] as const,
    worldFlow: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 30) => ['/api/analytics/world-flow', { period, limit }] as const,
    topFunded: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 10) => ['/api/analytics/top-funded-companies', { period, limit }] as const,
  },

  // ── Billing ─────────────────────────────────────────────────────────────
  billing: {
    plans: () => ['/api/billing/plans'] as const,
    subscription: () => ['/api/billing/subscription'] as const,
    invoices: () => ['/api/billing/invoices'] as const,
  },

  // ── Per-user feature overrides ─────────────────────────────────────────
  // Merged with `qk.features()` (the catalog) by the FeatureAccessProvider
  // to compute final access. Per-user, authenticated.
  me: {
    featureGrants: () => ['/api/me/feature-grants'] as const,
  },

  // ── Credits ─────────────────────────────────────────────────────────────
  credits: {
    balance: (type: 'ai' | 'integration' = 'ai') => ['/api/credits/balance', type] as const,
    ledger: (type: 'ai' | 'integration', cursor?: string, limit = 50) =>
      ['/api/credits/ledger', { type, cursor, limit }] as const,
  },

  // ── Chat ────────────────────────────────────────────────────────────────
  chat: {
    conversations: () => ['/api/chat/conversations'] as const,
    conversationDetail: (id: string) => ['/api/chat/conversations', id] as const,
    suggestions: () => ['/api/chat/suggestions'] as const,
  },

  // ── Developer (admin) ───────────────────────────────────────────────────
  apiKeys: {
    list: () => ['/api/me/api-keys'] as const,
  },
  integrations: {
    intercomHash: () => ['/api/integrations/intercom/hash'] as const,
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  admin: {
    claims: (status: string) => ['/api/admin/claims', { status }] as const,
    users: (params: Record<string, unknown>) => ['/api/admin/users', params] as const,
    sales: (params: Record<string, unknown>) => ['/api/admin/sales', params] as const,
    performance: (range: string) => ['/api/admin/performance', { range }] as const,
    dataChangeRequests: () => ['/api/admin/data-change-requests'] as const,
    userFeatureGrants: (profileId: string) => [`/api/admin/users/${profileId}/feature-grants`] as const,
  },
} as const;
