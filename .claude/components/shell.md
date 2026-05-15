# Shell Components

The chrome that wraps every authenticated page. Lives in [components/shell/](../../components/shell/).

## Composition

```
AppShell (components/shell/app-shell.tsx)
├── SidebarRail   ← left rail (navigation tree, collapsible)
├── Topbar        ← search, ticker, tier badge, profile menu
├── <main>{children}</main>
├── CommandPalette ← Cmd-K modal
├── AiPanel        ← right-edge AI chat slide-over
└── TickerStrip    ← bottom strip (recent deals scroll)
```

Mounted by [app/(app)/layout.tsx](<../../app/(app)/layout.tsx>) — every protected route gets it.

## SidebarRail

[components/shell/sidebar-rail.tsx](../../components/shell/sidebar-rail.tsx).

- `NAV_GROUPS` (exported) — the canonical nav structure. Each group has `items: { id, name, path, icon, gate? }`. The command palette imports this to surface nav matches.
- Each item can have an optional `gate` (a feature slug). If `useFeatureAccess(gate).isLocked`, render the item dimmed with a lock icon.
- Collapsing handled via `MobileNavContext`.

## Topbar

[components/app-header.tsx](../../components/app-header.tsx) (legacy; will move into shell/).

- Search input wires to the command palette.
- Tier badge (`free | plus | pro | admin`) — pulled from `useUserProfile()`.
- Credits pill — `qk.credits.balance('ai')` + `qk.credits.balance('integration')`.
- Profile menu — sign out button (calls the documented logout sequence; see [../auth.md](../auth.md)).

## CommandPalette

[components/shell/command-palette.tsx](../../components/shell/command-palette.tsx).

- Triggered by Cmd-K / Ctrl-K (mounted-once global keydown).
- Layered results: AI suggestion (if `q.length > 3`), nav matches, companies (`qk.search.typeahead(q, ['companies', 'investors'])`), investors.
- Backend search fires at `q.length >= 3` — see Bug #14 in [server/api-test-findings-log.docx](../../../server/api-test-findings-log.docx) about the bucket-filter default. Currently only `companies + investors` buckets show; the rest are silently skipped by the default server response.

## AiPanel

[components/shell/ai-panel.tsx](../../components/shell/ai-panel.tsx).

- Slide-over from the right edge. Variant of the `/chat` UI without the full page chrome.
- Same SSE stream pattern as `/chat/[id]` — see [pages/chat.md](../pages/chat.md).
- Tier-gated: `useFeatureAccess('ai_chat')` (plus+).

## TickerStrip

[components/shell/ticker-strip.tsx](../../components/shell/ticker-strip.tsx).

- Auto-scrolling horizontal strip at the bottom showing recent deals.
- Fetches `qk.deals.list({ limit: 30, sort: '-announced_date' })`.
- Pauses scroll on hover.

## Gotchas

- The shell mounts ONCE per app-route navigation (not per page load). React's component reuse keeps it stable — no flicker on route change.
- `NAV_GROUPS` is the single source of truth for navigation. Don't hardcode paths in topbar/footer; reference the group + item.
- Topbar credits pill is the only place that fetches credits on every protected page. Don't add a second credits-balance fetcher elsewhere — it'll dedup via SWR but it's also noise.
- AI panel + page chat share SSE-stream logic. Refactor into a hook if a third caller appears.
