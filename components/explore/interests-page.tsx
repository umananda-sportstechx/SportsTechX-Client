'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, PageHead, PlaceholderTag } from '@/components/atlas';
import { InterestFields, NO_INTERESTS, useInterests, type Interests } from './interests';

/** Interests (Claude Design "Interests") — what Atlas prioritises on Home. Backend Not Connected. */
export function InterestsPage() {
	const [saved, save] = useInterests();
	const [draft, setDraft] = useState<Interests | null>(null);
	const value = draft ?? saved;
	return (
		<>
			<PageHead title={<>Interests<PlaceholderTag /></>} sub="Control what Atlas prioritises. Changes take effect immediately across your homepage." />
			<Card className="explore-card">
				<InterestFields value={value} onChange={setDraft} keys={['sectors', 'subs', 'sports', 'geos', 'goals']} />
			</Card>
			<div className="explore-actions">
				<Button disabled={!draft} onClick={() => { save(value); setDraft(null); toast.success('Interests saved'); }}>{draft ? 'Save interests' : 'Saved'}</Button>
				<Button variant="outline" onClick={() => setDraft(NO_INTERESTS)}>Reset to the entire market</Button>
				<span className="explore-muted">Interests shape your homepage. They never limit what you can explore.</span>
			</div>
		</>
	);
}
