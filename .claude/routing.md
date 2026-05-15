# Routing

Next.js App Router conventions used in this client.

## Route groups

```
app/
├── layout.tsx           ← root html/body, mounts <Providers>
├── (app)/               ← protected: needs sign-in
│   ├── layout.tsx       ← AppShell (sidebar + topbar)
│   └── <route>/page.tsx
├── (auth)/              ← unprotected: pre-auth screens
│   ├── layout.tsx       ← centered card frame, no sidebar
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── auth/callback/route.ts   ← server route handler for Supabase OAuth code exchange
├── privacy-policy/page.tsx  ← public static
└── terms-of-service/page.tsx← public static
```

**Route groups are organisational only.** `(app)/companies/page.tsx` resolves to `/companies` — the parens never appear in URLs. They scope a layout to a subset of routes.

## `(app)` layout — protected shell

[app/(app)/layout.tsx](<../app/(app)/layout.tsx>) does three things:

1. `export const dynamic = 'force-dynamic'` — without this, Next.js statically renders the layout at build time, which freezes the empty-cookies state and breaks auth.
2. Reads server-side Supabase session (via [lib/supabase/server.ts](../lib/supabase/server.ts)). If no session, redirects to `/login`.
3. Wraps children in the `AppShell` component ([components/shell/app-shell.tsx](../components/shell/app-shell.tsx)) — sidebar + topbar + main content area.

The actual auth check happens server-side via middleware ([middleware.ts](../middleware.ts)) and layout-side via the SSR Supabase client. Client-side checks via `useAuthSession()` are a UX layer — they show "loading" instead of flashing protected content.

## `(auth)` layout — unprotected

[app/(auth)/layout.tsx](<../app/(auth)/layout.tsx>) is the centered-card frame for login / forgot-password / reset-password. No sidebar, no topbar, no auth check. Pages handle their own auth redirects (e.g. login page kicks logged-in users to `/dashboard`).

## Middleware

[middleware.ts](../middleware.ts) runs on every request. It:

1. Refreshes the Supabase auth cookie if near expiry.
2. Redirects unauthenticated users away from `(app)/*` to `/login`.
3. Redirects already-authenticated users from `/login` to `/dashboard`.

Matcher excludes static assets (`_next/static`, images, favicon) and the `/auth/callback` route (which has its own logic).

## Dynamic routes

```
companies/[slug]/page.tsx   ← /companies/axe-bat
chat/[id]/page.tsx          ← /chat/<uuid>
```

In the page component:

```ts
import { useParams } from 'next/navigation';
const { slug } = useParams<{ slug: string }>();
```

`useParams` is client-side. For server components (none in this codebase), pass `params` as a prop instead.

## Route handlers (server-side)

Only one in this codebase: [app/auth/callback/route.ts](../app/auth/callback/route.ts). Handles Supabase's OAuth PKCE code exchange:

```ts
const code = searchParams.get('code');
const supabase = await createClient();
await supabase.auth.exchangeCodeForSession(code);
return NextResponse.redirect(`${origin}${next}`);
```

**Don't add route handlers for data fetching.** Use the NestJS backend; route handlers are reserved for things that genuinely need to run on the Next.js server (cookie writes, OAuth callbacks, future webhook receivers).

## Force-dynamic flag

Add `export const dynamic = 'force-dynamic'` to:

- Any layout that reads cookies (auth check, theme).
- Any page that renders user-specific content at request time.

This client has it on `(app)/layout.tsx` and on individual pages where Next.js's static analysis can't prove the page is dynamic.

## Navigation

- **`useRouter()`** from `next/navigation` for programmatic navigation: `router.push('/path')`, `router.replace('/path')`, `router.back()`.
- **`<Link>`** from `next/link` for in-app navigation. Prefetches by default.
- **`<a href="">`** only for external links or downloads (`target="_blank"` etc).

Search params:

```ts
import { useSearchParams, usePathname } from 'next/navigation';
const sp = useSearchParams();
const q = sp.get('q');
router.push(`${pathname}?${new URLSearchParams({ q: nextQ }).toString()}`, { scroll: false });
```

The `scroll: false` keeps the scroll position when only query params change (e.g. filter chip selection in `/companies`).

## Page-level options

```ts
export const dynamic = 'force-dynamic';        // always render at request time
export const fetchCache = 'force-no-store';    // never cache underlying fetches
export const revalidate = 0;                   // disable ISR
```

Most pages don't need to set these — defaults are fine because `'use client'` components don't get statically rendered anyway.

## Adding a new page

1. Create `app/(app)/<route>/page.tsx`.
2. Start with `'use client';` at the top.
3. Default-export the component.
4. If the route needs different breadcrumbs / topbar variants, edit `components/shell/topbar.tsx`.
5. If the page is gated by tier, wrap its content in a `useFeatureAccess(slug)` check.

Skill: [skills/new-page/SKILL.md](skills/new-page/SKILL.md).

## Don't do this

- Don't put data-fetching pages in `app/auth/<...>/route.ts`. Use the backend.
- Don't omit `'use client'` on a page that uses hooks. The build will fail, but with a confusing error.
- Don't add new route groups unless you also need a distinct layout. The current `(app)` / `(auth)` split is enough.
