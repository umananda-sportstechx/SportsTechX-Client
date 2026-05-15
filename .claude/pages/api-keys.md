# `/api-keys`

**File:** [app/(app)/api-keys/page.tsx](<../../app/(app)/api-keys/page.tsx>)
**Purpose:** Developer API key management. Users on plus/pro tiers can create and revoke API keys that authenticate the `/api/v1/*` Developer API.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.apiKeys.list()` | `GET /api/me/api-keys` | user's keys (key value NOT returned — only metadata) |

## Mutations

- **Create:** `POST /api/me/api-keys` with `{ name }` → returns `{ key, client }`. The plaintext key is shown once in a modal; user must copy immediately. Backend stores only a hash.
- **Revoke:** `DELETE /api/me/api-keys/<id>`. After revoke, the key is invalid on next API call.

## Feature gates

Page-level: `tier === 'plus' || tier === 'pro'`. Free tier sees an "Upgrade to use the API" lock-state.

## Related components

Inline in page.tsx — `CreateKeyDialog`, `RevealedKeyModal`, key list rows.

## Gotchas

- **The full key is only returned ONCE on creation.** After the modal closes, the user can't see it again — only its prefix (`stx_live_abcd…`). Make the copy-button UX clear.
- The "show once" pattern means `revealedKey` is held in component state, not in SWR cache (no GET endpoint exists for the full key).
- Revoking is immediate; no soft-delete. Once revoked, the key can't be restored — user creates a fresh one.
- Keys aren't scoped to specific routes — they grant access to all `/api/v1/*` endpoints. Per-route scoping is a future feature.
