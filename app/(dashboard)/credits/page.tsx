'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { refreshCredits } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { AccountTabs } from '@/components/features/account/account-tabs';
import { Screen, PageHead, Card, Button, Loading } from '@/components/atlas';

/**
 * STX credits — buy and track the one wallet that funds AI features and data
 * exports. This is its OWN authenticated page (every tier, incl. Explore) so a
 * free user who spends credits can actually top up; the buy UI used to live
 * only on the Subscription tab, which Explore never sees. Subscriptions stay on
 * /billing — plans and credits are different purchases.
 */
interface Pack { id: string; name: string; credit_amount: number; price_amount: number; currency_code: string }
interface LedgerRow { id: string; transaction_type: string; amount: number; description: string | null; display_name: string | null; occurred_at: string }

const PAGE_SIZE = 20;
const fmtMoney = (cents: number, ccy: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'eur').toUpperCase() }).format((cents ?? 0) / 100);
const fmtISO = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const CARD_TITLE: React.CSSProperties = { fontSize: 17, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)' };
const BODY: React.CSSProperties = { fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.55 };
const META: React.CSSProperties = { fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)', marginTop: 4 };
const ROW_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--a-ink)' };
const SECTION: React.CSSProperties = { margin: '32px 0 12px' };

export default function CreditsPage() {
	const { balance: bal } = useCreditBalance();
	const packs = useSWR<{ data: Pack[] }>(['/api/billing/credit-packs']);
	// Fresh on every visit: spends elsewhere (chat, exports, decks) can't reach an
	// infinite list's cache (SWR's prefix mutate skips them), so don't trust it.
	const ledger = useSWRInfinite<{ data: LedgerRow[]; nextCursor: string | null }>(
		(index, prev) => (prev && !prev.nextCursor) ? null : qk.credits.ledger('all', index === 0 ? undefined : (prev?.nextCursor ?? undefined), PAGE_SIZE),
		{ revalidateOnMount: true, dedupingInterval: 2_000 },
	);
	const [busy, setBusy] = useState<string | null>(null);
	// Back from a pack checkout: the top-up arrives by webhook a few seconds
	// later, so re-read the balance and history until it shows (up to ~30s).
	useEffect(() => {
		if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).has('purchased')) return;
		window.history.replaceState(null, '', window.location.pathname);
		toast.success('Payment received — adding your credits…');
		let n = 0;
		const t = setInterval(() => { void refreshCredits(); void ledger.mutate(); if (++n >= 15) clearInterval(t); }, 2_000);
		return () => clearInterval(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	// Page-based history: show one page at a time (fixed height) so the list
	// never grows the page the way an ever-appending "Load more" would.
	const [pageIdx, setPageIdx] = useState(0);

	const buyPack = async (packId: string) => {
		setBusy(packId);
		try {
			// Back to this page (not /billing/success, which waits for a plan change
			// that a credit pack never makes) — it then watches for the top-up.
			const res = await apiRequest('POST', '/api/billing/credit-packs/checkout', {
				pack_id: packId,
				success_url: `${window.location.origin}/credits?purchased=1`,
				cancel_url: `${window.location.origin}/credits`,
			});
			const body = (await res.json()) as { url?: string };
			if (body.url) { window.location.assign(body.url); return; }
			throw new Error('no url');
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setBusy(null);
		}
	};

	const packList = packs.data?.data ?? [];
	const pages = ledger.data ?? [];
	const current = pages[pageIdx]?.data ?? [];
	const curHasNext = !!pages[pageIdx]?.nextCursor;
	const canNext = curHasNext || pageIdx + 1 < pages.length;
	const next = () => {
		if (pageIdx + 1 < pages.length) { setPageIdx(pageIdx + 1); return; }
		if (curHasNext) void ledger.setSize(ledger.size + 1).then(() => setPageIdx((i) => i + 1));
	};

	return (
		<Screen>
			<PageHead title="Credits" />
			<AccountTabs />

			<Card focus glow="blue" style={{ marginBottom: 24, padding: '24px 26px' }}>
				<div className="atlas-eyebrow">STX credit balance</div>
				<div style={{ fontFamily: 'var(--a-font)', fontSize: 36, fontWeight: 500, lineHeight: 1.05, color: 'var(--a-ink)', marginTop: 10 }}>
					{(bal?.total_available ?? 0).toLocaleString()}
				</div>
				<p style={{ ...BODY, margin: '10px 0 0' }}>
					One wallet powers the AI co-pilot and data exports.
					{bal ? ` ${bal.monthly_balance.toLocaleString()}${bal.monthly_grant ? `/${bal.monthly_grant.toLocaleString()}` : ''} monthly${bal.topup_balance ? ` · ${bal.topup_balance.toLocaleString()} top-up` : ''}.` : ''}
				</p>
			</Card>

			<Card style={{ marginBottom: 8 }}>
				<div style={{ ...CARD_TITLE, marginBottom: 6 }}>Buy credits</div>
				<p style={{ ...BODY, margin: '0 0 20px' }}>Top-ups never expire. Monthly plan credits renew each month; top-ups stack on whatever is left.</p>
				{packs.isLoading ? <Loading />
					: packList.length === 0 ? <div style={{ fontSize: 12, color: 'var(--a-faint)' }}>No credit packs available right now.</div>
						: (
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
								{packList.map((pk) => {
									const perCredit = pk.price_amount / pk.credit_amount;
									return (
										<button key={pk.id} type="button" disabled={busy !== null} onClick={() => void buyPack(pk.id)}
											style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', background: 'linear-gradient(160deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)', border: '1px solid var(--a-border-strong)', borderRadius: 'var(--a-radius)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy && busy !== pk.id ? 0.5 : 1, transition: 'border-color .15s, background .15s' }}
											onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--a-ink)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(59,130,246,0.14) 0%, rgba(139,92,246,0.10) 100%)'; }}
											onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--a-border-strong)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)'; }}
										>
											{busy === pk.id
												? <Loader2 className="animate-spin" size={20} style={{ color: 'var(--a-ink)' }} />
												: <>
													<div style={{ fontFamily: 'var(--a-font)', fontSize: 24, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1 }}>{pk.credit_amount.toLocaleString()}</div>
													<div style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)' }}>credits</div>
													<div style={{ fontFamily: 'var(--a-font)', fontSize: 16, fontWeight: 600, color: 'var(--a-ink)', marginTop: 4 }}>{fmtMoney(pk.price_amount, pk.currency_code)}</div>
													<div style={{ fontFamily: 'var(--a-mono)', fontSize: 9, color: 'var(--a-muted)', letterSpacing: '0.04em' }}>{fmtMoney(Math.round(perCredit), pk.currency_code)} / credit</div>
												</>}
										</button>
									);
								})}
							</div>
						)}
			</Card>

			<div className="atlas-eyebrow" style={SECTION}>Credit history</div>
			{ledger.isLoading ? <Loading />
				: ledger.error ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>Couldn&apos;t load credit history.</div></Card>
					: current.length === 0 ? <Card><div style={{ fontSize: 13, color: 'var(--a-faint)' }}>No credit activity yet.</div></Card>
						: (
							<Card style={{ padding: 0, overflow: 'hidden' }}>
								{current.map((r, i) => (
									<div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 23px', borderTop: i ? '1px solid var(--a-border)' : 'none' }}>
										<div>
											<div style={ROW_TITLE}>{r.display_name ?? r.description ?? r.transaction_type.replace(/_/g, ' ')}</div>
											<div style={META}>{fmtISO(r.occurred_at)}</div>
										</div>
										<div style={{ fontFamily: 'var(--a-mono)', fontSize: 12, color: r.amount >= 0 ? 'var(--a-ok)' : 'var(--a-muted)' }}>{r.amount >= 0 ? '+' : ''}{r.amount.toLocaleString()}</div>
									</div>
								))}
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 23px', borderTop: '1px solid var(--a-border)' }}>
									<span style={{ fontFamily: 'var(--a-mono)', fontSize: 11, color: 'var(--a-muted)' }}>Page {pageIdx + 1}</span>
									<div style={{ display: 'flex', gap: 8 }}>
										<Button variant="outline" size="sm" disabled={pageIdx === 0} onClick={() => setPageIdx((i) => Math.max(0, i - 1))}>Previous</Button>
										<Button variant="outline" size="sm" disabled={!canNext || ledger.isValidating} onClick={next}>
											{ledger.isValidating ? <Loader2 className="animate-spin" size={13} /> : 'Next'}
										</Button>
									</div>
								</div>
							</Card>
						)}
		</Screen>
	);
}
