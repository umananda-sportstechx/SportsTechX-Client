'use client';

import { useEffect, useState } from 'react';
import { PLACEHOLDER_QUOTES, quoted, type Quote } from '@/lib/testimonial-quotes';

/**
 * The testimonial panel beside the sign-in form (team feedback "Atlas login
 * page", referencing app.trykondo.com/signin).
 *
 * It reads the same admin-managed section the Atlas landing does, so a quote
 * added in Site assets → Atlas → Testimonials shows up in both places. The CMS
 * call goes straight to the public endpoint from the browser rather than being
 * fetched on the server: next.config rewrites /api/* to the backend, the route
 * needs no session, and doing it this way leaves the auth page itself a client
 * component — restructuring the login route around a decorative panel is not a
 * trade worth making.
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
    const t = window.setInterval(() => setI((n) => (n + 1) % quotes.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [quotes.length]);

  const q = quotes[i % quotes.length];
  if (!q) return null;

  return (
    <aside
      aria-label="What members say"
      className="hidden w-[46%] max-w-[560px] shrink-0 flex-col justify-center rounded-xl px-12 py-14 lg:flex"
      style={{ background: 'var(--atlas-quote-panel)' }}
    >
      <p className="text-[11px] tracking-[0.16em] text-white/55 uppercase">Atlas testimonials</p>

      <blockquote
        key={i}
        className="atlas-quote-in mt-7 text-[22px] leading-[1.45] font-medium text-white"
      >
        {q.quote}
      </blockquote>

      <figcaption className="mt-8 flex items-center gap-3">
        {q.img && (
          // eslint-disable-next-line @next/next/no-img-element -- a CMS URL or a
          // static file; next/image would add a wrapper for no gain at 40px.
          <img src={q.img} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        )}
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-white">{q.name}</span>
          {q.role && <span className="block text-[12px] text-white/60">{q.role}</span>}
        </span>
      </figcaption>

      {quotes.length > 1 && (
        <div className="mt-9 flex gap-1.5" aria-hidden>
          {quotes.map((_, n) => (
            <span
              key={n}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: n === i % quotes.length ? 20 : 8,
                background: n === i % quotes.length ? 'rgb(255 255 255 / 0.85)' : 'rgb(255 255 255 / 0.25)',
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
