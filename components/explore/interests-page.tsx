'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, PageHead } from '@/components/atlas';
import { InterestFields, NO_INTERESTS, useInterests, type Interests } from './interests';

/**
 * Interests — what Atlas prioritises on Home.
 *
 * Sectors, sub-sectors and sports persist to the account via
 * `PUT /api/explore/interests`. Geographies and goals are still local and
 * say so on their own group label; see `interests.tsx` for why.
 */
export function InterestsPage() {
	const { value: saved, save } = useInterests();
	const [draft, setDraft] = useState<Interests | null>(null);
	const [busy, setBusy] = useState(false);
	const value = draft ?? saved;
	return (
		<>
			<PageHead title="Interests" sub="Control what Atlas prioritises. Changes take effect immediately across your homepage." />
			<Card className="explore-card">
				<InterestFields value={value} onChange={setDraft} keys={['sectors', 'subs', 'sports', 'geos', 'goals']} />
			</Card>
			<div className="explore-actions">
				<Button
					disabled={!draft || busy}
					onClick={async () => {
						setBusy(true);
						try { await save(value); setDraft(null); toast.success('Interests saved'); }
						// A failed save used to clear the draft and claim success, so the
						// user lost their edits and was told they were kept.
						catch { toast.error('Could not save your interests. Try again.'); }
						finally { setBusy(false); }
					}}
				>{busy ? 'Saving…' : draft ? 'Save interests' : 'Saved'}</Button>
				<Button variant="outline" onClick={() => setDraft(NO_INTERESTS)}>Reset to the entire market</Button>
				<span className="explore-muted">Interests shape your homepage. They never limit what you can explore.</span>
			</div>
		</>
	);
}
