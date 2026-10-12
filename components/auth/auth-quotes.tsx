'use client';

import { useEffect, useState } from 'react';
import { PLACEHOLDER_QUOTES, quoted, type Quote } from '@/lib/testimonial-quotes';

/**
 * The left panel shared by sign-in and sign-up, so both read the same.
 *
 * Top: the tagline. Below it, vertically centred in the remaining space, a
 * horizontal auto-scrolling testimonial carousel (fixed height, loops
 * seamlessly, no controls). The Atlas brand lockup lives on the form (right),
 * not here.
 *
 * Testimonials read the same admin-managed section the Atlas landing does (Site
 * assets → Atlas → Testimonials). The CMS call goes straight to the public
 * endpoint from the browser (next.config rewrites /api/* to the backend, no
 * session). Any failure keeps the built-in set; the panel never blocks auth.
 */
interface SiteItem { url: string | null; title: string | null; subtitle: string | null; body: string | null }

export function AuthSidePanel() {
	return (
		<aside className="auth-panel auth-panel--side">
			<h2 className="auth-panel__tagline">Market intelligence for the business of sports.</h2>
			<div className="auth-panel__mid">
				<AuthTestimonials />
			</div>
		</aside>
	);
}

/**
 * Horizontal auto-scrolling carousel. The track renders the list twice and
 * animates translateX from 0 to -50%, so copy two sits exactly where copy one
 * began when the loop restarts — no visible jump. `prefers-reduced-motion`
 * drops the animation.
 */
export function AuthTestimonials() {
	const [quotes, setQuotes] = useState<Quote[]>(PLACEHOLDER_QUOTES);

	useEffect(() => {
		const ac = new AbortController();
		fetch('/api/public/site-content?site=atlas', { signal: ac.signal })
			.then((r) => (r.ok ? r.json() : null))
			.then((json: { sections?: { testimonials?: SiteItem[] } } | null) => {
				const items = json?.sections?.testimonials;
				if (!items?.length) return;
				setQuotes(items.map((it) => ({
					quote: quoted(it.body ?? ''),
					name: it.title ?? '',
					role: it.subtitle ?? '',
					img: it.url ?? '',
				})));
			})
			.catch(() => undefined);
		return () => ac.abort();
	}, []);

	if (!quotes.length) return null;
	// ~6s on screen per card keeps the speed constant however many there are.
	const duration = `${quotes.length * 6}s`;
	const cards = (clone: boolean) =>
		quotes.map((q, n) => <QuoteCard key={`${clone ? 'b' : 'a'}-${n}`} q={q} clone={clone} />);

	return (
		<div className="auth-tcarousel" aria-label="What members say">
			<div className="auth-tcarousel__track" style={{ animationDuration: duration }}>
				{cards(false)}
				{cards(true)}
			</div>
		</div>
	);
}

function QuoteCard({ q, clone }: { q: Quote; clone?: boolean }) {
	return (
		<figure className="auth-tcard" aria-hidden={clone || undefined}>
			<blockquote className="auth-tcard__quote">{q.quote}</blockquote>
			<figcaption className="auth-tcard__by">
				{q.img && (
					// eslint-disable-next-line @next/next/no-img-element -- CMS URL or static file; 38px, no next/image gain.
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
