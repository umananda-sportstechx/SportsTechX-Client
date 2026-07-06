'use client';

import { useEffect, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { qk } from '@/lib/query-keys';
import { Page, PageTitle, SectionHead, Empty, Tag } from '@/components/ui/atoms';
import { CreditMeter } from '@/components/shell/credit-meter';

/**
 * Credit expenditure history — every credit the user has spent (direct exports,
 * CRM syncs, AI features) plus grants/top-ups/refunds, itemized from the
 * `credit_transactions` ledger. Balances up top; a filterable, cursor-paginated
 * activity feed below (All / AI / Export & sync).
 */

type Filter = 'all' | 'ai' | 'integration';

interface LedgerRow {
	id: string;
	credit_type: string;
	transaction_type: string;
	amount: number;
	balance_after: number;
	description: string | null;
	operation_key: string | null;
	display_name: string | null;
	reference_entity_type: string | null;
	metadata: Record<string, unknown> | null;
	occurred_at: string;
}
interface LedgerPage { data: LedgerRow[]; nextCursor: string | null }

const FILTERS: Array<{ key: Filter; label: string }> = [
	{ key: 'all', label: 'All' },
	{ key: 'ai', label: 'AI' },
	{ key: 'integration', label: 'Export & sync' },
];

const TXN_LABEL: Record<string, string> = {
	monthly_grant: 'Monthly credit grant',
	topup_purchase: 'Credit top-up',
	refund: 'Refund',
	expiry: 'Expired credits',
	adjustment: 'Adjustment',
	spend: 'Usage',
};

function humanize(s: string | null | undefined): string | null {
	if (!s) return null;
	const t = s.replace(/^ai\./, '').replace(/[._]/g, ' ').trim();
	return t ? t.charAt(0).toUpperCase() + t.slice(1) : null;
}

// Export/CRM descriptions are already human sentences ("CRM sync (attio) — 2
// companies row(s)"); AI descriptions are bare slugs ("chat") so prefer the
// catalog display_name there.
function rowLabel(r: LedgerRow): string {
	const d = r.description?.trim();
	if (d && /\s/.test(d)) return d;
	return r.display_name ?? humanize(d) ?? TXN_LABEL[r.transaction_type] ?? r.transaction_type;
}

function fmtWhen(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CreditsPage() {
	const [filter, setFilter] = useState<Filter>('all');

	const getKey = (index: number, prev: LedgerPage | null) => {
		if (prev && !prev.nextCursor) return null;
		const cursor = index === 0 ? undefined : (prev?.nextCursor ?? undefined);
		return qk.credits.ledger(filter, cursor, 30);
	};
	const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<LedgerPage>(getKey, {
		revalidateFirstPage: false,
	});

	// Collapse back to page 1 whenever the filter changes.
	useEffect(() => { setSize(1); }, [filter, setSize]);

	const rows = data ? data.flatMap((p) => p.data) : [];
	const last = data?.[data.length - 1];
	const hasMore = last ? Boolean(last.nextCursor) : false;
	const loadingMore = isValidating && size > (data?.length ?? 0);

	return (
		<Page>
			<PageTitle
				kicker="Usage & billing"
				title="Credits"
				sub="Your AI and export credit balances, and a full history of every credit you've spent — direct exports, CRM syncs, and AI features."
			/>

			<div style={{ marginBottom: 'var(--space-5)', maxWidth: 540 }}>
				<CreditMeter variant="card" />
			</div>

			<div className="card">
				<SectionHead
					title="Activity"
					action={
						<div className="flt-view-toggle" role="group" aria-label="Filter activity">
							{FILTERS.map((f) => (
								<button
									key={f.key}
									className={`flt-view-btn ${filter === f.key ? 'on' : ''}`}
									style={{ width: 'auto', padding: '0 12px', fontSize: 12 }}
									onClick={() => setFilter(f.key)}
								>
									{f.label}
								</button>
							))}
						</div>
					}
				/>
				<div style={{ padding: '4px var(--space-4) var(--space-4)' }}>
					{isLoading && rows.length === 0 ? (
						<Empty msg="Loading…" />
					) : rows.length === 0 ? (
						<Empty msg="No credit activity yet." />
					) : (
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							{rows.map((r) => {
								const spend = r.amount < 0;
								const pool = r.credit_type === 'ai' ? 'AI' : 'Export';
								return (
									<div
										key={r.id}
										style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}
									>
										<div style={{ minWidth: 0, flex: 1 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
												<span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
													{rowLabel(r)}
												</span>
												<Tag variant={r.credit_type === 'ai' ? 'pill' : ''}>{pool}</Tag>
												{r.transaction_type !== 'spend' && (
													<Tag variant={spend ? 'neg' : 'pos'}>{TXN_LABEL[r.transaction_type] ?? r.transaction_type}</Tag>
												)}
											</div>
											<div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>{fmtWhen(r.occurred_at)}</div>
										</div>
										<div style={{ textAlign: 'right', flexShrink: 0 }}>
											<div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: spend ? 'var(--neg)' : 'var(--pos)' }}>
												{spend ? '' : '+'}{r.amount.toLocaleString()}
											</div>
											<div style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
												{r.balance_after.toLocaleString()} left
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{hasMore && (
						<div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
							<button className="btn ghost" disabled={loadingMore} onClick={() => setSize(size + 1)}>
								{loadingMore ? 'Loading…' : 'Load more'}
							</button>
						</div>
					)}
				</div>
			</div>
		</Page>
	);
}
