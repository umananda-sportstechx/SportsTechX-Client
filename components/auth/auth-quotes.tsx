'use client';

import { useEffect, useState } from 'react';
import { PLACEHOLDER_QUOTES, quoted, type Quote } from '@/lib/testimonial-quotes';

/**
 * The testimonial panel beside the sign-in form.
 *
 * It used to be a single card with a left/right arrow either side — the "pointer"
 * navigation. Per the Atlas auth redesign that is now an auto-scrolling carousel:
 * the quotes ride a vertical marquee that loops seamlessly, with no controls to
 * operate. The rail background (rail colour + noise, set on `.auth-panel`) is
 * kept. A soft mask fades the cards in and out at the top and bottom edges.
 *
 * It reads the same admin-managed section the Atlas landing does, so a quote
 * added in Site assets → Atlas → Testimonials shows up in both places. The CMS
 * call goes straight to the public endpoint from the browser (next.config
 * rewrites /api/* to the backend, the route needs no session). A failure of any
 * kind keeps the built-in set, and the panel never blocks sign-in.
 *
 * The track renders the list twice and animates from 0 to -50%, so the second
 * copy is exactly under the first when the loop restarts — no visible jump.
 * `prefers-reduced-motion` drops the animation and shows a static stack.
 */
interface SiteItem {
  url: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
}

export function AuthQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>(PLACEHOLDER_QUOTES);

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

  if (!quotes.length) return null;
  // ~7s on screen per card keeps the speed constant however many there are.
  const duration = `${quotes.length * 7}s`;
  // Two copies flat in one track. Every card carries its own bottom spacing (no
  // flex gap), so translateY(-50%) — exactly one copy — loops with no seam.
  const cards = (clone: boolean) =>
    quotes.map((q, n) => <QuoteCard key={`${clone ? 'b' : 'a'}-${n}`} q={q} clone={clone} />);

  return (
    <aside aria-label="What members say" className="auth-panel auth-panel--quotes">
      <div className="auth-marquee">
        <div className="auth-marquee__track" style={{ animationDuration: duration }}>
          {cards(false)}
          {cards(true)}
        </div>
      </div>
    </aside>
  );
}

function QuoteCard({ q, clone }: { q: Quote; clone?: boolean }) {
  return (
    <figure className="auth-tcard" aria-hidden={clone || undefined}>
      <blockquote className="auth-tcard__quote">{q.quote}</blockquote>
      <figcaption className="auth-tcard__by">
        {q.img && (
          // eslint-disable-next-line @next/next/no-img-element -- CMS URL or static file; 40px, no next/image gain.
          <img src={q.img} alt="" className="auth-tcard__img" />
        )}
        <span className="auth-tcard__who">
          <span className="auth-tcard__name">{q.name}</span>
          {q.role && <span className="auth-tcard__role">{q.role}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
