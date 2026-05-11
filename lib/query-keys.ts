/**
 * Canonical TanStack Query keys. Single source of truth — typo-proof.
 *
 * Conventions:
 *   - Each function returns a tuple `as const` so TypeScript can match
 *     prefixes for `invalidateQueries({ queryKey: qk.companies.list._def })`
 *     style invalidations later.
 *   - First element is always the API path string (used by the default
 *     queryFn in `lib/query-client.ts` to derive the URL).
 *   - Subsequent elements are search-param objects that participate in
 *     cache-key identity. Two queries with different params are different
 *     cache entries.
 *
 * Usage:
 *   useQuery({ queryKey: qk.companies.list({ page: 1, q: 'football' }), ... })
 *   queryClient.invalidateQueries({ queryKey: qk.profile() });
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
    semantic: (entityType: string, q: string) => ['/api/search/semantic', { entity_type: entityType, q }] as const,
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
  reports: {
    list: () => ['/api/reports'] as const,
    detail: (idOrSlug: string) => ['/api/reports', idOrSlug] as const,
  },
  verifiedReports: {
    mine: () => ['/api/verified-reports/mine'] as const,
    detail: (id: string) => ['/api/verified-reports', id] as const,
  },

  // ── Recommendations ─────────────────────────────────────────────────────
  recommendations: () => ['/api/recommendations'] as const,

  // ── Billing ─────────────────────────────────────────────────────────────
  billing: {
    subscription: () => ['/api/billing/subscription'] as const,
    invoices: () => ['/api/billing/invoices'] as const,
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
  },
} as const;
