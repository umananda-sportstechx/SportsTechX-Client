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

  // ── Atlas Raise (founder workspace) ────────────────────────
  raise: {
    current: () => ['/api/raise'] as const,
    home: () => ['/api/raise/home'] as const,
    criteria: () => ['/api/raise/criteria'] as const,
  },
  features: () => ['/api/features'] as const,

  // ── Reference ──────────────────────────────────────────────────────────
  reference: {
    sports: () => ['/api/sports'] as const,
    sectors: () => ['/api/sectors'] as const,
    techTags: () => ['/api/tech-tags'] as const,
    currencies: () => ['/api/currencies'] as const,
    roundTypes: () => ['/api/round-types'] as const,
    locationFacets: () => ['/api/locations/facets'] as const,
  },

  // ── Browsable collections ───────────────────────────────────────────────
  companies: {
    list: (params: Record<string, unknown> = {}) => ['/api/companies', params] as const,
    // Path-interpolated form so `buildUrl` actually hits /api/companies/:idOrSlug.
    // The previous `['/api/companies', idOrSlug]` shape made `buildUrl` treat the
    // string as cache identity and dropped it from the URL, so the detail fetch
    // resolved to the list endpoint and the drawer/detail page were empty.
    detail: (idOrSlug: string) => [`/api/companies/${idOrSlug}`] as const,
    news: (idOrSlug: string) => [`/api/companies/${idOrSlug}/news`] as const,
    team: (idOrSlug: string) => [`/api/companies/${idOrSlug}/team`] as const,
    contacts: (idOrSlug: string) => [`/api/companies/${idOrSlug}/contacts`] as const,
    similar: (idOrSlug: string) => [`/api/companies/${idOrSlug}/similar`] as const,
  },
  investors: {
    list: (params: Record<string, unknown> = {}) => ['/api/investors', params] as const,
    detail: (idOrSlug: string) => [`/api/investors/${idOrSlug}`] as const,
    thesis: (idOrSlug: string) => [`/api/investors/${idOrSlug}/thesis`] as const,
    funds: (idOrSlug: string) => [`/api/investors/${idOrSlug}/funds`] as const,
  },
  deals: {
    list: (params: Record<string, unknown> = {}) => ['/api/deals', params] as const,
    detail: (id: string) => [`/api/deals/${id}`] as const,
    investors: (id: string) => [`/api/deals/${id}/investors`] as const,
    // Distinct investors appearing in deals, ranked by deal count — Funding
    // investor filter dropdown (only investors you can actually filter by).
    investorOptions: (limit = 300) => ['/api/deals/investors', { limit }] as const,
  },
  acquisitions: {
    list: (params: Record<string, unknown> = {}) => ['/api/acquisitions', params] as const,
    detail: (id: string) => [`/api/acquisitions/${id}`] as const,
  },
  ecosystem: {
    list: (params: Record<string, unknown> = {}) => ['/api/ecosystem-entities', params] as const,
    listByType: (type: string, params: Record<string, unknown> = {}) =>
      ['/api/ecosystem-entities', { type, ...params }] as const,
    detail: (idOrSlug: string) => [`/api/ecosystem-entities/${idOrSlug}`] as const,
  },

  // ── Search ──────────────────────────────────────────────────────────────
  search: {
    typeahead: (q: string, types?: string[]) => ['/api/search', { q, types }] as const,
  },

  // ── User-owned ──────────────────────────────────────────────────────────
  favorites: {
    // kind is a PATH segment (GET /api/favorites/:kind), not a query param —
    // it must live in the URL string, since buildUrl only serializes object
    // parts of the key into the query string and drops bare strings.
    list: (kind: string) => [`/api/favorites/${kind}`] as const,
  },
  savedSearches: {
    list: () => ['/api/saved-searches'] as const,
    detail: (id: string) => [`/api/saved-searches/${id}`] as const,
  },
  pinnedLists: {
    list: () => ['/api/pinned-lists'] as const,
    detail: (id: string) => [`/api/pinned-lists/${id}`] as const,
  },
  userWatchlists: {
    list: () => ['/api/user-watchlists'] as const,
    detail: (id: string) => [`/api/user-watchlists/${id}`] as const,
    companies: (id: string) => [`/api/user-watchlists/${id}/companies`] as const,
    containing: (companyId: string) => [`/api/user-watchlists/containing/${companyId}`] as const,
  },
  publicWatchlists: {
    byToken: (token: string) => [`/api/public/watchlists/${token}`] as const,
  },
  claims: {
    mine: () => ['/api/claims/mine'] as const,
    detail: (id: string) => [`/api/claims/${id}`] as const,
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
    list: (params: Record<string, unknown> = {}) => ['/api/reports', params] as const,
    detail: (idOrSlug: string) => [`/api/reports/${idOrSlug}`] as const,
    sections: (idOrSlug: string, as?: 'free' | 'growth' | 'pro') =>
      [`/api/reports/${idOrSlug}/sections`, as ? { as } : {}] as const,
    sectionData: (sectionId: string) => [`/api/reports/sections/${sectionId}/data`] as const,
    pollResults: (pollId: string) => [`/api/reports/polls/${pollId}/results`] as const,
    // Fresh (tier-gated) PDF URL for a version. `download` uses a short TTL +
    // Content-Disposition; inline view uses a multi-hour TTL.
    pdfUrl: (versionId: string, download = false) =>
      [`/api/reports/versions/${versionId}/pdf-url`, download ? { download: 1 } : {}] as const,
  },
  verifiedReports: {
    mine: () => ['/api/verified-reports/mine'] as const,
    detail: (id: string) => [`/api/verified-reports/${id}`] as const,
  },

  // ── Recommendations ─────────────────────────────────────────────────────
  recommendations: () => ['/api/recommendations'] as const,
  // Founder → investor matches (computed live from the founder's claimed company).
  investorMatches: (limit = 12) => ['/api/recommendations/investors', { limit }] as const,
  // Founder cohort benchmarks (computed live from the founder's claimed company).
  benchmarks: () => ['/api/recommendations/benchmarks'] as const,
  // Underfunded / whitespace sectors (market intelligence).
  whitespace: () => ['/api/recommendations/whitespace'] as const,
  // Founder → investor warm-intro requests.
  introRequests: () => ['/api/intro-requests'] as const,

  // ── Newsletter (Beehiiv RSS proxy) ──────────────────────────────────────
  newsletter: {
    articles: () => ['/api/newsletter/articles'] as const,
    detail: (slug: string) => [`/api/newsletter/articles/${slug}`] as const,
  },

  // ── Analytics aggregations (10-min cache server-side) ───────────────────
  analytics: {
    dashboard: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/dashboard-stats', { period }] as const,
    fundingTotals: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/funding-totals', { period }] as const,
    maStats: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/ma-stats', { period }] as const,
    quarterly: (params: { from?: number; to?: number } = {}) => ['/api/analytics/quarterly-capital', params] as const,
    maQuarterly: (params: { from?: number; to?: number } = {}) => ['/api/analytics/ma-quarterly', params] as const,
    sectorHeat: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 12) => ['/api/analytics/sector-heat', { period, limit }] as const,
    sectorHeatTree: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 8) => ['/api/analytics/sector-heat-tree', { period, limit }] as const,
    maSectorHeatTree: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 8) => ['/api/analytics/ma-sector-heat-tree', { period, limit }] as const,
    worldFlow: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 30) => ['/api/analytics/world-flow', { period, limit }] as const,
    topFundedCities: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 30) => ['/api/analytics/top-funded-cities', { period, limit }] as const,
    topFunded: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 10, audience?: 'athletes' | 'fans' | 'executives') =>
      ['/api/analytics/top-funded-companies', audience ? { period, limit, audience } : { period, limit }] as const,
    annualFunding: (params: { from?: number; to?: number } = {}) => ['/api/analytics/annual-funding', params] as const,
    annualMa: (params: { from?: number; to?: number } = {}) => ['/api/analytics/annual-ma', params] as const,
    investorsByType: () => ['/api/analytics/investors-by-type'] as const,
    topAcquirers: (period: 'ytd' | '12m' | 'all' = 'ytd', limit = 10) => ['/api/analytics/top-acquirers', { period, limit }] as const,
    bizModel: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/business-model-breakdown', { period }] as const,
    maTypeBreakdown: (period: 'ytd' | '12m' | 'all' = 'ytd') => ['/api/analytics/ma-type-breakdown', { period }] as const,
  },

  // ── Comparison (URL-driven, stateless `?ids=a,b,c`) ─────────────────────
  // Wraps existing list endpoints with a fixed `?ids=` filter. The server
  // already supports `ids` on /api/companies; the investors/deals endpoints
  // accept the same param.
  compare: {
    companies: (ids: string[]) => ['/api/companies', { ids: ids.join(',') }] as const,
    investors: (ids: string[]) => ['/api/investors', { ids: ids.join(',') }] as const,
    deals: (ids: string[]) => ['/api/deals', { ids: ids.join(',') }] as const,
  },

  // ── Billing ─────────────────────────────────────────────────────────────
  billing: {
    plans: () => ['/api/billing/plans'] as const,
    subscription: () => ['/api/billing/subscription'] as const,
    invoices: () => ['/api/billing/invoices'] as const,
    creditPacks: () => ['/api/billing/credit-packs'] as const,
  },

  // ── Per-user feature overrides + inbox ─────────────────────────────────
  // Merged with `qk.features()` (the catalog) by the FeatureAccessProvider
  // to compute final access. Per-user, authenticated.
  me: {
    featureGrants: () => ['/api/me/feature-grants'] as const,
    downloads: () => ['/api/me/downloads'] as const,
    notifications: (unread?: boolean) =>
      unread ? ['/api/me/notifications', { unread: true }] as const : ['/api/me/notifications'] as const,
  },

  // ── Credits ─────────────────────────────────────────────────────────────
  credits: {
    // type MUST go through as an object so buildUrl emits `?type=…`; a bare
    // string is dropped by buildUrl, which made every call resolve to the
    // default ('ai') — so integration ("export") balances never loaded.
    balance: (type: 'ai' | 'integration' = 'ai') => ['/api/credits/balance', { type }] as const,
    // `all` merges both pools into one time-ordered feed (credit history page).
    ledger: (type: 'ai' | 'integration' | 'all', cursor?: string, limit = 50) =>
      ['/api/credits/ledger', { type, cursor, limit }] as const,
  },

  // ── Chat ────────────────────────────────────────────────────────────────
  chat: {
    conversations: () => ['/api/chat/conversations'] as const,
    conversationDetail: (id: string) => ['/api/chat/conversations', id] as const,
    suggestions: () => ['/api/chat/suggestions'] as const,
  },

  // ── Uploads (user RAG documents / images) ───────────────────────────────
  uploads: {
    list: () => ['/api/uploads'] as const,
  },

  // ── Pitch deck analyzer (founder-facing) ────────────────────────────────
  deckAnalysis: {
    list: () => ['/api/deck-analysis'] as const,
    detail: (id: string) => [`/api/deck-analysis/${id}`] as const,
  },

  // ── Data export (CSV/XLSX + CRM) ────────────────────────────────────────
  exports: {
    columns: (entity: string) => [`/api/exports/${entity}/columns`] as const,
    count: (entity: string, search?: string | null, columns?: string[], filters?: Record<string, unknown> | null) =>
      [
        `/api/exports/${entity}/count`,
        { search: search || undefined, columns: columns && columns.length ? columns.join(',') : undefined },
        // Current-page facet filters (companies) — serialized as extra query params.
        filters && Object.keys(filters).length ? filters : undefined,
      ] as const,
  },

  // ── Developer (admin) ───────────────────────────────────────────────────
  apiKeys: {
    list: () => ['/api/me/api-keys'] as const,
  },
  webhooks: {
    list: () => ['/api/me/webhooks'] as const,
    deliveries: (id: string) => [`/api/me/webhooks/${id}/deliveries`] as const,
  },
  integrations: {
    intercomHash: () => ['/api/integrations/intercom/hash'] as const,
    crm: () => ['/api/integrations/crm'] as const,
    crmMappings: (id: string) => [`/api/integrations/crm/${id}/mappings`] as const,
    // Phase 3 — provider-subscription wizard.
    crmProviderObjects: (id: string) => [`/api/integrations/crm/${id}/provider/objects`] as const,
    crmProviderFields: (id: string, object: string) => [`/api/integrations/crm/${id}/provider/objects/${object}/fields`] as const,
    crmSubscriptions: (id: string) => [`/api/integrations/crm/${id}/subscriptions`] as const,
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
