'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Badge, Button } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';

/**
 * Share your round with the Investor Circle.
 *
 * Raise Home already emits an attention card for this — *"Share your round with
 * the Investor Circle"*, pointing at `/app/settings` — and until now it landed
 * on a page with no such control. The endpoints existed and nothing called them.
 *
 * Opting in **never publishes**. It creates a `pending` listing for review,
 * because "Verified Raises" tells investors the key facts were independently
 * checked, which is only true once a human has checked them. The copy here says
 * so, or founders will expect to appear immediately.
 *
 * One wrinkle worth knowing: the founder-side status enum is only
 * `pending | live | withdrawn`, so when an admin asks for changes the founder
 * still reads `pending`. `review_notes` is the only signal that something is
 * wanted, so it is surfaced whenever it is set.
 */
interface OptInState {
	opted_in: boolean;
	status: 'pending' | 'live' | 'withdrawn' | null;
	review_notes: string | null;
	submitted_at: string | null;
	has_raise: boolean;
}

const BODY: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: 'var(--a-muted)', margin: 0 };

export function DealflowOptIn() {
	const { data, isLoading, mutate } = useSWR<OptInState>(qk.raise.dealflow());
	const [busy, setBusy] = useState(false);

	const act = async (method: 'POST' | 'DELETE', okMsg: string) => {
		setBusy(true);
		try {
			const res = await apiRequest(method, '/api/raise/dealflow/opt-in');
			if (!res.ok) throw new Error(String(res.status));
			toast.success(okMsg);
			void mutate();
		} catch {
			toast.error('That did not go through. Please try again.');
		} finally { setBusy(false); }
	};

	if (isLoading || !data) return <p style={BODY}>Loading…</p>;

	// Not having a raise yet is an ordinary state, not an error — the server
	// answers has_raise:false rather than 404 so this can say the useful thing.
	if (!data.has_raise) {
		return (
			<p style={BODY}>
				Set up your raise first and you can share it with the Investor Circle from here.{' '}
				<a href={hrefOf('setup')} style={{ color: 'var(--a-accent)' }}>Set up your raise</a>
			</p>
		);
	}

	const live = data.status === 'live';
	const pending = data.status === 'pending';

	return (
		<div style={{ display: 'grid', gap: 12 }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
				<Users size={14} aria-hidden="true" style={{ color: 'var(--a-muted)' }} />
				{live && <Badge tone="ok">Live with the Investor Circle</Badge>}
				{pending && <Badge tone="neutral">Submitted for review</Badge>}
				{!live && !pending && <Badge tone="neutral">Not shared</Badge>}
			</div>

			<p style={BODY}>
				{live
					? 'Investors in the Circle can see your round and request an introduction. We pass on their interest to you — your contact details are never released without us asking you first.'
					: pending
						? 'The SportsTechX team is checking the key facts before investors see it. That check is what "Verified Raise" means, so it never goes live automatically.'
						: 'Share your round with SportsTechX’s investor network. We review it first — it is an eligibility check that the round is real, not an endorsement — and then Circle members can ask for an introduction.'}
			</p>

			{/* An admin asking for changes shows as `pending` to the founder, so the
			    note is the only thing that explains what is wanted. */}
			{data.review_notes && (
				<div style={{ padding: 10, border: '1px solid var(--a-border)', borderRadius: 8, background: 'var(--a-surface-2, transparent)' }}>
					<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--a-faint)', marginBottom: 4 }}>
						Note from the review team
					</div>
					<div style={{ fontSize: 13, color: 'var(--a-ink)' }}>{data.review_notes}</div>
				</div>
			)}

			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				{live || pending ? (
					<Button variant="outline" disabled={busy} onClick={() => void act('DELETE', 'Withdrawn from the Investor Circle')}>
						{busy ? 'Working…' : 'Withdraw'}
					</Button>
				) : (
					<Button disabled={busy} onClick={() => void act('POST', 'Sent for review')}>
						{busy ? 'Working…' : 'Share my round'}
					</Button>
				)}
			</div>

			{(live || pending) && (
				<p style={{ ...BODY, fontSize: 12, color: 'var(--a-faint)' }}>
					Withdrawing takes the listing down straight away.
					{data.submitted_at && ` Shared on ${new Date(data.submitted_at).toLocaleDateString()}.`}
				</p>
			)}
		</div>
	);
}
