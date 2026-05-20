# Conventions

How code is structured in this client. Where the codebase already follows a pattern, mirror it; don't invent new ones.

## File layout

- **Pages** live in `app/(app)/<route>/page.tsx`. Server-side routes only inside `app/auth/callback/route.ts`. Auth pages in `app/(auth)/<route>/page.tsx`.
- **Layouts** are at `app/<group>/layout.tsx`. Add `export const dynamic = 'force-dynamic'` to any layout that consumes cookies or wraps protected routes.
- **Shared components**: shadcn primitives in [components/ui/](../components/ui/), domain components colocated by surface in [components/](../components/) (e.g. `components/shell/`, `components/companies/`).
- **Hooks** in [hooks/](../hooks/) — `use-*.ts` naming. One hook per file unless they're trivially related.
- **Contexts** in [contexts/](../contexts/) — Provider component + `useXContext` hook in the same file.
- **Utilities** in [lib/](../lib/). Side-effecting modules (auth, analytics) own their own filename; pure helpers go in `lib/utils.ts`.
- **Types** colocated with the file that defines them; cross-cutting shapes (`Profile`, `UserType`) live with the hook that loads them.

## Imports

- Path alias: `@/*` → repo root. Use it instead of relative paths beyond one segment (`@/components/ui/button`, not `../../components/ui/button`).
- Order:
  1. React + Next built-ins
  2. Third-party (`swr`, `framer-motion`, `lucide-react`, …)
  3. `@/components/ui/*`
  4. `@/lib/*`, `@/hooks/*`, `@/contexts/*`
  5. Sibling files (`./something`)
  6. Types (`import type { … }`)

ESLint enforces no unused imports — keep the list clean.

## Data fetching

See [data-fetching.md](data-fetching.md) for the full pattern. The two-second version:

- Reads: `useSWR(qk.<area>.<thing>(params))` — fetcher is global.
- Writes: `apiRequest('POST' | 'PATCH' | 'DELETE', url, body)` directly. Wrap the call site in a local `useState` for the pending flag.
- Invalidations: `useSWRConfig().mutate(qk.<area>.<thing>(params))` for a single key, or `mutate((key) => Array.isArray(key) && key[0] === '/api/<path>')` for prefix-match.

## Forms

- React Hook Form + Zod. Schema colocated:
  ```ts
  const schema = z.object({ name: z.string().min(1) });
  type FormValues = z.infer<typeof schema>;
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  ```
- Use the shadcn `<Form>` wrappers in [components/ui/form.tsx](../components/ui/form.tsx) for accessible labels + errors.
- On submit, call `apiRequest` inside the `onSubmit` handler. `form.formState.isSubmitting` covers the loading flag — don't add a parallel `useState`. Don't use server actions; they're not wired here.

## Styling

- Tailwind 4. No CSS Modules.
- Variants via `class-variance-authority`. Wrap variant logic in `cva()` + use `cn()` from [lib/utils.ts](../lib/utils.ts) for merge.
- Design tokens are CSS variables defined in [app/globals.css](../app/globals.css). Reference via `var(--fg-muted)`, `var(--border)`, etc. — don't hardcode hex.
- Spacing scale: stick to the standard Tailwind one. Custom values only for one-offs that don't fit (e.g., `[0.6875rem]`).
- Dark mode: `data-theme="dark"` on `<html>`. Use `dark:` variants only when the design token system can't express the change.

## Naming

- Components: `PascalCase` (`CompanyCard.tsx`).
- Hooks: `use-kebab-case.ts`, named `useKebabCase` inside.
- Contexts: `<Name>Provider` + `use<Name>Context` (or just `use<Name>()` if there's only one hook).
- Server-style files: `kebab-case.ts` (e.g. `query-keys.ts`).
- Booleans: `is*`, `has*`, `can*`.
- Event handlers: `handleX` (function), `onX` (prop name).

## Pagination

- Backend supports `page + limit` and `cursor` modes (see [server/.claude/conventions.md](../../server/.claude/conventions.md)).
- Client uses `page + limit` everywhere except where the list is too deep to count efficiently.
- Standard envelope: `{ data, total, page, limit, offset, totalPages, nextCursor }`. Read `data` + `totalPages`.

## Errors & loading

- `data, error, isLoading` from `useSWR`. **`isLoading` is true on first load only** — subsequent revalidations expose `isValidating`. Don't conflate the two when rendering spinners.
- For mutations, show inline error state (`toast.error(err.message)`), not error boundaries.
- Hard auth errors (401/403) are handled centrally — the fetcher redirects to `/login?reason=session_expired`. Don't catch these per-component.

## Logging

- Browser logger: `console.error`. Mixpanel for product events.
- Do not console-log session tokens, JWTs, or PII (email/name) in production. Mixpanel's `identify()` is the only sanctioned PII path.

## Env

- Client-readable env vars must be prefixed `NEXT_PUBLIC_` (Next.js requirement).
- `BACKEND_URL` (server-side only in [next.config.ts](../next.config.ts)) controls the rewrite target.
- No ad-hoc `process.env.*` reads outside config — anything client-visible should be exposed via a typed module like `lib/config.ts` if it grows.
