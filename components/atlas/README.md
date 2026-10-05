# Atlas design system

The shared look and UI for every SportsTechX product: **Raise**, **Scout** and **Explore**. It's built from the *Atlas Product UX v3* Figma file.

The design system holds styles and presentational components only. It has no product logic and does no data fetching. Products bring their own pages, data and navigation, and plug into it.

```ts
import { Screen, PageHead, Card, Button, FilterBar, ComboBarLine } from '@/components/atlas';
```

Importing from `@/components/atlas` also loads all of its styles.

---

## Folder map

```
components/atlas/
  index.ts              ← the only import path products should use
  styles/
    tokens.css          ← colours, fonts, radii, chart colours (light + dark)
    base.css            ← root defaults, page layout, typography
    components.css      ← every UI piece, one section per component
    charts.css          ← chart styling (index.ts loads all four, in this order)
  ui/                   ← primitives: layout, card, button, form, badge, tabs, stat
  patterns/             ← composed pieces: filter-bar, entity-logo, staged-loader, catalog-ui
  charts/               ← combo-bar-line, donut, drilldown, palette
  brand/                ← Atlas wordmark (SVG, follows the text colour)
  shell/                ← AtlasShell (sidebar + top bar + collapse) and the theme toggle

components/features/    ← product-agnostic features built on Atlas (e.g. market/)
components/raise/       ← Raise-only parts (shell-config, home composer, chat, …)
hooks/use-catalog-options.ts  ← filter options from reference data
lib/catalog-options.ts        ← static filter option lists
public/fonts/atlas/           ← Satoshi + CommitMono (self-hosted, licences included)
```

**Where should new code go?**

| It is… | Put it in |
|---|---|
| A colour, font, radius or shadow | `styles/tokens.css` |
| A reusable visual piece (button, card, menu…) | `ui/` or `patterns/`, styled in `styles/components.css` |
| A chart | `charts/`, styled in `styles/charts.css` |
| A feature used by more than one product (e.g. Market) | `components/features/<name>/` |
| Something only one product uses | `components/<product>/` |

---

## Editing the look

| To change… | Edit |
|---|---|
| Any colour, light or dark | `styles/tokens.css`: the `.atlas { … }` block for light, `[data-theme="dark"] .atlas { … }` for dark |
| Fonts | `styles/tokens.css`: `--a-font` (Satoshi, titles/UI), `--a-body` (Inter, body), `--a-mono` (CommitMono, labels/numbers) |
| Card or button roundness | `--a-radius` (cards, 13px) and `--a-radius-pill` (buttons, 35px) in `tokens.css` |
| Chart colours | `--a-chart-*` in `tokens.css`, plus `charts/palette.ts` for series colours |
| One component's shape or spacing | Its section in `styles/components.css`. Each section header names the Figma layer it came from. |
| Sidebar layout | `shell/atlas-shell.css` |

**Rules**
- Never hardcode a colour in a component. Use a token, e.g. `var(--a-muted)`, so dark mode keeps working.
- Class names are prefixed `atlas-`, and child parts use `__`: `atlas-kpi`, `atlas-kpi__value`.
- Type roles:
  - Satoshi (`var(--a-font)`) for titles and navigation
  - Inter (`var(--a-body)`) for body text
  - CommitMono (`var(--a-mono)`), uppercase, for labels, buttons, numbers and tags

---

## Components at a glance

| Group | Pieces |
|---|---|
| Layout | `Screen`, `PageHead`, `H1`, `H2`, `Sub`, `Eyebrow`, `Loading`, `Empty` |
| Surfaces | `Card` (`glow="blue" \| "pink"`) |
| Actions | `Button` (`primary` / `outline` / `ghost` / `danger`, `size="sm"`, `href`), `Action` (icon pill + label) |
| Inputs | `Field`, `Input` (`className="atlas-input--search"` for a pill), `Select` (`atlas-select--pill`), `Textarea`, `ReadOnly` |
| Navigation | `Tabs`, `Seg` |
| Data | `Badge`, `Stat`, `Progress`, `Logo`, `Flag`, `Pager`, `CardGrid` |
| Filtering | `FilterBar`: search, applied-filter pills, black **+ Add filter** menu, **Sort by** |
| Charts | `ComboBarLine`, `PieDonut` (+ `PieLegend`), `HBarDrilldown`, palettes |
| Frame | `AtlasShell`, `AtlasLogo`, `NavSectionHeader` (section title + tabs from the nav) |
| Status | `PlaceholderTag` — "Backend Not Connected (Placeholders)" pill (SOON style) for screens with no backend yet; nav items take `placeholder: true` |

CSS-only patterns, applied with `className`:

| Class | What it is |
|---|---|
| `atlas-kpis` / `atlas-kpi` | KPI strip |
| `atlas-chart-card` | Card with a header strip |
| `atlas-section-head` / `atlas-section-title` / `atlas-section-note` | Section header |
| `atlas-table` | Ranked table |
| `atlas-entity-card` | Investor/company card |
| `atlas-rowlist` | Rows in one card |
| `atlas-eyebrow` | Section label |
| `atlas-divider` | Hairline rule |
| `atlas-caret-pill` | Expand chevron |

---

## Adding a product

Scout (`components/scout/*`, `app/(scout)/scout/**`) and Explore (`components/explore/*`, `app/(explore)/explore/**`) are worked examples after Raise. `AtlasShell` takes `railExtra` for sidebar content such as Explore's upgrade cards.

1. **Navigation.** Create `components/<product>/shell-config.ts` with its `ShellNavItem[]` lists. Copy `components/raise/shell-config.ts` as a starting point.
2. **Shell.** Render the frame:

   ```tsx
   <AtlasShell product="Scout" homePath="/scout" nav={SCOUT_NAV} bottomNav={SCOUT_BOTTOM_NAV}
     accountPath="/scout/account" accountName={profile?.full_name}>
     {children}
   </AtlasShell>
   ```

3. **Pages.** Build pages from `@/components/atlas`, starting each with `<Screen>` and then `<PageHead>`, or the product's section header — a one-line wrapper over `<NavSectionHeader nav={…} homePath={…} subs={…} />` (see `RaiseSectionHeader`, `ScoutSectionHeader`). Reuse shared features in `components/features/*` (market, company, watchlists, framework, deck-analysis, funding, resources, ecosystem, account) as they are.
4. **Product-only styles** go in `components/<product>/<product>.css`, imported by that product's shell. Only add them for things that genuinely belong to that product.
