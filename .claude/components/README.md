# Components Index

```
components/
├── ui/                   ← shadcn primitives (Radix-wrapped, CVA variants)
├── shell/                ← AppShell, SidebarRail, Topbar, CommandPalette, AiPanel
├── companies/            ← list rows, detail-view widgets, filter chips
├── investors/            ← list rows, category chips
├── dashboard/            ← KPI cards, leaderboards, suggestions
├── funding/              ← deals table, KPI strip, deal-detail drawer
├── ma/                   ← acquisitions row + drawer
├── events/, programs/    ← entity cards
├── reports/              ← report card, poll widget, verified-report row
├── settings/             ← profile form, credits section, integrations section
├── subscriptions/        ← plan card
├── chat/                 ← message list, composer, tool-call block
├── app-header.tsx        ← global topbar
└── sidebar.tsx           ← legacy mobile sidebar (split with shell/sidebar-rail.tsx)
```

## Conventions

- shadcn primitives in [components/ui/](../../components/ui/). Don't import from `@radix-ui/*` directly — wrap there first.
- Domain components colocated by surface (e.g. companies/* renders companies — even if it's used on the dashboard too).
- Shell components in [components/shell/](../../components/shell/) — wrap the whole authenticated app.

## Top-level component docs

- [shell.md](shell.md) — AppShell, SidebarRail, Topbar, CommandPalette, AiPanel
- [ui-primitives.md](ui-primitives.md) — shadcn primitives in use
- [forms.md](forms.md) — react-hook-form + Zod + shadcn `<Form>` recipe
