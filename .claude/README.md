# `.claude/` — Client Docs Index

How to navigate this folder. Mirrors `server/.claude/` so working on either side feels the same.

```
client/
├── CLAUDE.md            ← auto-loaded entry; high-level overview + commands
└── .claude/
    ├── README.md        ← you are here
    ├── stack.md         ← one-page tech stack
    ├── domain.md        ← business glossary, client-side lens
    ├── architecture.md  ← provider stack, App Router layout, request lifecycle
    ├── conventions.md   ← how to write code here
    ├── rules.md         ← hard guardrails — never violate
    ├── data-fetching.md ← qk + SWR + apiRequest + 401-retry contract
    ├── auth.md          ← AuthSessionProvider, refresh lock, hard-logout sequence
    ├── feature-gating.md← FeatureAccessProvider, tier checks, admin bypass
    ├── routing.md       ← (app)/(auth) groups, ProtectedRoute, dynamic='force-dynamic'
    ├── pages/           ← one .md per top-level route
    │   ├── README.md    ← page index
    │   ├── login.md
    │   ├── dashboard.md
    │   ├── companies.md
    │   ├── investors.md
    │   ├── funding.md
    │   ├── ma.md
    │   ├── ecosystem.md
    │   ├── reports.md
    │   ├── settings.md
    │   ├── subscriptions.md
    │   ├── api-keys.md
    │   ├── admin.md
    │   └── chat.md
    ├── components/
    │   ├── README.md    ← index
    │   ├── shell.md     ← AppShell, SidebarRail, Topbar, CommandPalette, AiPanel
    │   ├── ui-primitives.md
    │   └── forms.md     ← react-hook-form + Zod recipe
    └── skills/
        ├── new-page/SKILL.md
        ├── new-swr-query/SKILL.md
        ├── new-swr-mutation/SKILL.md
        └── new-form/SKILL.md
```

## Reading order for a fresh session

1. **[stack.md](stack.md)** — what tech is in play (≤ 1 min).
2. **[domain.md](domain.md)** — what the recurring nouns (claim, deal, tier, feature, …) mean.
3. **[architecture.md](architecture.md)** — provider stack, route groups, where state lives.
4. **[rules.md](rules.md)** — the non-negotiables.
5. **[data-fetching.md](data-fetching.md)** — pull this up before writing any `useSWR` / `apiRequest` call.
6. **[pages/README.md](pages/README.md)** — find the page(s) relevant to your task; read those.
7. **[skills/](skills/)** — when adding new code, follow the recipe instead of inventing patterns.

## When to update these docs

- **A new page is added/renamed/removed** → update [pages/README.md](pages/README.md) and add/edit/delete the matching `.md`.
- **A new global pattern arrives** (a new provider, a new shared lib) → update [architecture.md](architecture.md).
- **A convention changes** → edit [conventions.md](conventions.md).
- **A hard rule is added** → edit [rules.md](rules.md).
- **A new skill becomes a frequent task** → add a `skills/<name>/SKILL.md`.
