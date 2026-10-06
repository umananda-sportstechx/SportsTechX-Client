'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLACEHOLDER_QUOTES, quoted, type Quote } from '@/lib/testimonial-quotes';

/**
 * The testimonial panel beside the sign-in form (team feedback "Atlas login
 * page", referencing app.trykondo.com/signin).
 *
 * Shaped after that reference: one card on the page's own background — not a
 * coloured block — with the person at the top and the quote under them, and a
 * round arrow either side to step through. Everything is drawn from the Atlas
 * auth tokens, so it follows the light/dark switch with the rest of the page.
 *
 * It reads the same admin-managed section the Atlas landing does, so a quote
 * added in Site assets → Atlas → Testimonials shows up in both places. The CMS
 * call goes straight to the public endpoint from the browser: next.config
 * rewrites /api/* to the backend, the route needs no session, and doing it this
 * way leaves the auth page a client component — restructuring the login route
 * around a decorative panel is not a trade worth making.
 *
 * A failure of any kind keeps the built-in set. The panel never blocks sign-in.
 */
const ROTATE_MS = 8000;

interface SiteItem {
  url: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
}

export function AuthQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>(PLACEHOLDER_QUOTES);
  const [i, setI] = useState(0);
  // Once someone drives it themselves, stop moving it under them.
  const manual = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/public/site-content?site=atlas', { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { sections?: { testimonials?: SiteItem[] } } | null) => {
        const items = json?.sections?.testimonials;
        if (!items?.length) return;
        setQuotes(
          items.map((it) => ({
            quote: quoted(it.body ?? ''),
            name: it.title ?? '',
            role: it.subtitle ?? '',
            img: it.url ?? '',
          })),
        );
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (quotes.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      if (!manual.current) setI((n) => (n + 1) % quotes.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [quotes.length]);

  const step = useCallback(
    (dir: 1 | -1) => {
      manual.current = true;
      setI((n) => (n + dir + quotes.length) % quotes.length);
    },
    [quotes.length],
  );

  const q = quotes[i % quotes.length];
  if (!q) return null;

  return (
    <aside aria-label="What members say" className="auth-panel auth-panel--center">
      <Arrow side="left" onClick={() => step(-1)} disabled={quotes.length < 2} />

      <div
        className="w-full max-w-[380px] rounded-xl border px-6 py-6"
        style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}
      >
        <div className="flex items-center gap-3">
          {q.img && (
            // eslint-disable-next-line @next/next/no-img-element -- a CMS URL or
            // a static file; next/image would add a wrapper for no gain at 40px.
            <img src={q.img} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          )}
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-[var(--a-ink)]">{q.name}</span>
            {q.role && (
              <span className="block truncate text-[12px] text-[var(--a-muted)]">{q.role}</span>
            )}
          </span>
        </div>

        <blockquote
          key={i}
          className="mt-5 text-[14px] leading-[1.6] text-[var(--a-muted)]"
        >
          {q.quote}
        </blockquote>
      </div>

      <Arrow side="right" onClick={() => step(1)} disabled={quotes.length < 2} />
    </aside>
  );
}

function Arrow({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous testimonial' : 'Next testimonial'}
      className="grid size-8 shrink-0 place-items-center rounded-full border text-[var(--a-muted)] transition-colors hover:text-[var(--a-ink)] disabled:opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-navy)]"
      style={{ background: 'var(--a-field)', borderColor: 'var(--a-border)' }}
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}
