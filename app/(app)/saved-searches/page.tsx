'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Page, SectionHead, Tag, Empty } from '@/components/ui/atoms';

interface SavedSearch {
	id: string;
	name: string;
	entity_type: string;
	filters?: Record<string, unknown>;
	results_count?: number | null;
	updated_at?: string;
	created_at?: string;
}

interface SavedSearchesResponse {
	data: SavedSearch[];
}

const ENTITY_PATHS: Record<string, string> = {
	companies: '/companies',
	deals: '/funding',
	investors: '/investors',
	acquisitions: '/ma',
	reports: '/reports',
	programs: '/programs',
	events: '/events',
};

/**
 * Saved searches — design-token-styled list. Reads /api/saved-searches;
 * clicking a row re-runs the search by navigating to the entity page with the
 * stored filters serialized into query params.
 */
export default function SavedSearchesPage() {
	const router = useRouter();
	const { mutate } = useSWRConfig();
	const [removePending, setRemovePending] = useState(false);

	const { data, isLoading } = useSWR<SavedSearchesResponse>(
		qk.savedSearches.list(),
		{ dedupingInterval: 30_000 },
	);

	const removeSearch = async (id: string) => {
		setRemovePending(true);
		try {
			await apiRequest('DELETE', `/api/saved-searches/${id}`);
			toast.success('Saved search removed');
			void mutate(qk.savedSearches.list());
		} catch (e) {
			toast.error((e as Error).message ?? 'Could not remove');
		} finally {
			setRemovePending(false);
		}
	};

	const searches = data?.data ?? [];

	const open = (s: SavedSearch) => {
		const base = ENTITY_PATHS[s.entity_type] ?? '/companies';
		const sp = new URLSearchParams();
		for (const [k, v] of Object.entries(s.filters ?? {})) {
			if (v == null || v === '') continue;
			sp.set(k, String(v));
		}
		router.push(`${base}?${sp.toString()}`);
	};

	return (
		<Page>
			<div style={{ marginBottom: 'var(--space-5)' }}>
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 11,
						color: 'var(--fg-muted)',
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						marginBottom: 6,
					}}
				>
					Workspace · {searches.length.toLocaleString()} saved
				</div>
				<h1
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 38,
						fontWeight: 800,
						letterSpacing: '-0.02em',
						lineHeight: 1,
						margin: '0 0 6px',
					}}
				>
					Saved searches
				</h1>
				<p style={{ fontSize: 14, color: 'var(--fg-2)', maxWidth: 640, margin: 0 }}>
					Re-run a previously saved filter set against the live database.
				</p>
			</div>

			<div className="card">
				<SectionHead title="Your saved filters" meta={`${searches.length} total`} />
				{isLoading && searches.length === 0 ? (
					<Empty msg="Loading…" />
				) : searches.length === 0 ? (
					<Empty msg="Save a filter set from any database page to see it here" />
				) : (
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						{searches.map((s, i) => (
							<div
								key={s.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '14px var(--space-4)',
									borderTop: i === 0 ? 'none' : '1px solid var(--border)',
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 8,
											marginBottom: 4,
											flexWrap: 'wrap',
										}}
									>
										<div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
										<Tag>{s.entity_type}</Tag>
										{s.results_count != null && (
											<span
												style={{
													fontFamily: 'var(--font-mono)',
													fontSize: 11,
													color: 'var(--fg-muted)',
												}}
											>
												{s.results_count.toLocaleString()} matches
											</span>
										)}
									</div>
									<div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
										{Object.entries(s.filters ?? {})
											.filter(([, v]) => v != null && v !== '')
											.slice(0, 4)
											.map(([k, v]) => `${k}: ${String(v)}`)
											.join(' · ') || 'No filters'}
									</div>
								</div>
								<button
									className="btn ghost"
									onClick={() => void removeSearch(s.id)}
									disabled={removePending}
									aria-label="Remove"
								>
									<Trash2 size={14} />
								</button>
								<button className="btn" onClick={() => open(s)}>
									Run <ArrowRight size={12} />
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</Page>
	);
}
