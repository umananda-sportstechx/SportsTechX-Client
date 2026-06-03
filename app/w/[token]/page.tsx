'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';

/**
 * `/w/[token]` — public, unauthenticated read-only view of a shared watchlist.
 *
 * Lives OUTSIDE the (app) route group so it has no AppShell / auth gate, and
 * `/w` is in middleware PUBLIC_PATHS so the edge proxy lets it through without
 * a session cookie. Fetches the PUBLIC endpoint directly (no bearer token) so
 * we don't depend on the authed SWR fetcher.
 */

interface PublicCompany {
	id: string;
	name: string;
	slug?: string;
	description?: string | null;
	primary_sector?: string | null;
	hq_city?: string | null;
	hq_country?: string | null;
	founded_year?: number | null;
}
interface PublicWatchlistResponse {
	data: {
		watchlist: { name: string; description: string | null; color: string | null };
		companies: PublicCompany[];
	};
}

const publicFetcher = async (key: readonly unknown[]): Promise<PublicWatchlistResponse> => {
	const url = key[0] as string;
	const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
	if (!res.ok) throw new Error(`${res.status}`);
	return (await res.json()) as PublicWatchlistResponse;
};

export default function SharedWatchlistPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = use(params);
	const { data, error, isLoading } = useSWR<PublicWatchlistResponse>(
		qk.publicWatchlists.byToken(token),
		publicFetcher,
		{ shouldRetryOnError: false },
	);

	const wl = data?.data?.watchlist;
	const companies = data?.data?.companies ?? [];

	return (
		<main className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-3xl mx-auto">
				<header className="mb-8">
					<Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
						SportsTechX
					</Link>
					{isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
					{error && (
						<div className="mt-6">
							<h1 className="text-2xl font-bold mb-2">Watchlist not found</h1>
							<p className="text-sm text-muted-foreground">
								This share link is invalid or has been revoked by its owner.
							</p>
						</div>
					)}
					{wl && (
						<div className="mt-6 flex items-start gap-3">
							<span
								aria-hidden
								className="mt-2 inline-block rounded-full"
								style={{ width: 12, height: 12, background: wl.color ?? 'var(--accent)' }}
							/>
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">Shared watchlist</p>
								<h1 className="text-3xl font-bold mt-1 mb-1">{wl.name}</h1>
								{wl.description && (
									<p className="text-sm text-muted-foreground max-w-xl">{wl.description}</p>
								)}
								<p className="text-xs text-muted-foreground mt-2">
									{companies.length} {companies.length === 1 ? 'company' : 'companies'}
								</p>
							</div>
						</div>
					)}
				</header>

				{wl && companies.length === 0 && (
					<p className="text-sm text-muted-foreground">This watchlist has no companies yet.</p>
				)}

				{companies.length > 0 && (
					<ul className="space-y-2">
						{companies.map((c) => (
							<li
								key={c.id}
								className="rounded-lg border border-border bg-card p-4"
							>
								<div className="flex items-center justify-between gap-3">
									<span className="font-semibold">{c.name}</span>
									{c.primary_sector && (
										<span className="text-xs text-muted-foreground">{c.primary_sector}</span>
									)}
								</div>
								{c.description && (
									<p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
								)}
								<p className="text-xs text-muted-foreground mt-2">
									{[c.hq_city, c.hq_country].filter(Boolean).join(', ') || '—'}
									{c.founded_year ? ` · Founded ${c.founded_year}` : ''}
								</p>
							</li>
						))}
					</ul>
				)}

				<footer className="mt-12 border-t border-border pt-6">
					<p className="text-xs text-muted-foreground">
						Want to build your own watchlists?{' '}
						<Link href="/signup" className="underline hover:text-foreground">
							Join SportsTechX
						</Link>
						.
					</p>
				</footer>
			</div>
		</main>
	);
}
