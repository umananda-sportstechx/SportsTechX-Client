'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { VerifyButton, useVerifyState } from '@/components/features/verify/verify-cta';
import { useClaimSearch, type ClaimSearchResult } from '@/components/claim/use-claim-search';
import { openClaim } from '@/lib/claim-events';
import type { Thesis } from './sample-data';

/**
 * The fund identity on the thesis — a directory picker, not free text.
 *
 * You search the investor directory in the field itself: pick an existing fund
 * (which fills name/website/country), add a new one (→ admin approval), or use
 * what you typed as-is. Verifying ownership is a separate, optional step that
 * only gates submitting deals — the thesis saves either way.
 *
 * When you already hold a claim on a fund (pending or verified), that record IS
 * your fund: the capsule stands in for the picker, and its details are edited
 * through the verification modal rather than re-typed here.
 */
interface Props { t: Thesis; patch: (p: Partial<Thesis>) => void }

export function FundPicker({ t, patch }: Props) {
	const { state, claim } = useVerifyState();
	const linked = claim?.claim_type === 'investor' && (state === 'verified' || state === 'pending');

	if (linked) {
		return (
			<div className="scout-field">
				<div className="scout-field__label">Your fund / investor</div>
				<div className="fundpicker__linked"><VerifyButton role="investor" /></div>
				<div className="fundpicker__hint">Linked to the directory. Edit its details from the capsule above.</div>
			</div>
		);
	}
	return <FundSearch t={t} patch={patch} />;
}

function FundSearch({ t, patch }: Props) {
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<ClaimSearchResult | null>(null);
	const { results } = useClaimSearch('investor', q);
	const boxRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const away = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
		document.addEventListener('mousedown', away);
		return () => document.removeEventListener('mousedown', away);
	}, []);

	const pick = (r: ClaimSearchResult) => {
		setSelected(r);
		patch({ fundName: r.name, website: r.website ?? t.website, country: r.hq ?? t.country });
		setQ(''); setOpen(false);
	};
	const useTyped = () => { setSelected(null); patch({ fundName: q.trim() }); setQ(''); setOpen(false); };
	const clear = () => { setSelected(null); patch({ fundName: '' }); };
	const query = q.trim();
	const chosen = selected?.name ?? t.fundName;

	return (
		<div className="scout-field" ref={boxRef}>
			<div className="scout-field__label">Your fund / investor <span>· Search the directory, or add yours</span></div>

			{chosen ? (
				<div className="fundpicker__selected">
					{selected?.verified && <VerifiedBadge size={15} />}
					<span className="fundpicker__selname">{chosen}</span>
					{selected?.hq && <span className="fundpicker__selmeta">{selected.hq}</span>}
					<button type="button" className="fundpicker__change" onClick={clear}>Change</button>
				</div>
			) : (
				<div className="fundpicker__wrap">
					<span className="fundpicker__ico"><Search size={15} aria-hidden="true" /></span>
					<input
						className="atlas-input fundpicker__input"
						value={q}
						placeholder="Search your fund by name…"
						onChange={(e) => { setQ(e.target.value); setOpen(true); }}
						onFocus={() => setOpen(true)}
					/>
					{open && query.length >= 2 && (
						<div className="fundpicker__panel">
							{results.map((r) => (
								<button key={r.id} type="button" className="fundpicker__opt" onClick={() => pick(r)}>
									<span className="fundpicker__optname">{r.name}{r.verified && <VerifiedBadge size={12} />}</span>
									{r.hq && <span className="fundpicker__optmeta">{r.hq}{r.kind ? ` · ${r.kind}` : ''}</span>}
								</button>
							))}
							<button type="button" className="fundpicker__add" onClick={() => openClaim(null, 'investor', { name: query })}>
								<Plus size={15} aria-hidden="true" /> Add “{query}” to the directory — we’ll verify it
							</button>
							<button type="button" className="fundpicker__usetyped" onClick={useTyped}>
								Use “{query}” as entered
							</button>
						</div>
					)}
				</div>
			)}

			<div className="fundpicker__verify">
				<VerifyButton
					role="investor"
					target={selected ? { role: 'investor', id: selected.id, name: selected.name, website: selected.website } : null}
					label="Verify ownership"
				/>
				<span className="fundpicker__verifynote">Optional — required only to submit deals.</span>
			</div>
		</div>
	);
}
