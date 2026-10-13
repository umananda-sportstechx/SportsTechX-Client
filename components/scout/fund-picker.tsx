'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
	const [active, setActive] = useState(0);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
	const { results } = useClaimSearch('investor', q);
	const wrapRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const query = q.trim();
	const chosen = selected?.name ?? t.fundName;
	const showPanel = open && !chosen && query.length >= 2;
	// Nav items: each result, then "Add" and "Use as entered".
	const navCount = results.length + 2;

	const pick = (r: ClaimSearchResult) => {
		setSelected(r);
		patch({ fundName: r.name, website: r.website ?? t.website, country: r.hq ?? t.country });
		setQ(''); setOpen(false);
	};
	const useTyped = () => { setSelected(null); patch({ fundName: q.trim() }); setQ(''); setOpen(false); };
	const clear = () => { setSelected(null); patch({ fundName: '' }); };
	const addNew = () => { openClaim(null, 'investor', { name: query }); setOpen(false); };
	const activate = (i: number) => {
		if (i < results.length) pick(results[i]);
		else if (i === results.length) addNew();
		else useTyped();
	};

	// Position the portalled panel under the input, flipping up when there's no
	// room below, so it is never clipped by a card or scroll container.
	const place = () => {
		const r = wrapRef.current?.getBoundingClientRect();
		if (!r) return;
		const gap = 4, margin = 8, want = 320;
		const below = window.innerHeight - r.bottom - margin;
		const above = r.top - margin;
		if (below >= Math.min(want, 180) || below >= above) setPos({ left: r.left, width: r.width, top: r.bottom + gap, maxH: Math.min(want, below) });
		else setPos({ left: r.left, width: r.width, bottom: window.innerHeight - r.top + gap, maxH: Math.min(want, above) });
	};
	useLayoutEffect(() => { if (showPanel) { place(); setActive(0); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showPanel]);
	useEffect(() => {
		if (!showPanel) return;
		const reflow = () => place();
		const away = (e: MouseEvent) => {
			const tgt = e.target as Node;
			if (!wrapRef.current?.contains(tgt) && !panelRef.current?.contains(tgt)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
			else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(navCount - 1, i + 1)); }
			else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
			else if (e.key === 'Enter') { e.preventDefault(); activate(active); }
		};
		window.addEventListener('scroll', reflow, true);
		window.addEventListener('resize', reflow);
		document.addEventListener('mousedown', away);
		document.addEventListener('keydown', onKey, true);
		return () => {
			window.removeEventListener('scroll', reflow, true);
			window.removeEventListener('resize', reflow);
			document.removeEventListener('mousedown', away);
			document.removeEventListener('keydown', onKey, true);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showPanel, navCount, active, results]);
	useEffect(() => {
		if (showPanel) panelRef.current?.querySelector<HTMLElement>(`[data-ci="${active}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [active, showPanel]);

	return (
		<div className="scout-field">
			<div className="scout-field__label">Your fund / investor <span>· Search the directory, or add yours</span></div>

			{chosen ? (
				<div className="fundpicker__selected">
					{selected?.verified && <VerifiedBadge size={15} />}
					<span className="fundpicker__selname">{chosen}</span>
					{selected?.hq && <span className="fundpicker__selmeta">{selected.hq}</span>}
					<button type="button" className="fundpicker__change" onClick={clear}>Change</button>
				</div>
			) : (
				<div className="fundpicker__wrap" ref={wrapRef}>
					<span className="fundpicker__ico"><Search size={15} aria-hidden="true" /></span>
					<input
						className="atlas-input fundpicker__input"
						value={q}
						placeholder="Search your fund by name…"
						role="combobox"
						aria-expanded={showPanel}
						aria-autocomplete="list"
						onChange={(e) => { setQ(e.target.value); setOpen(true); }}
						onFocus={() => setOpen(true)}
					/>
				</div>
			)}

			{showPanel && pos && createPortal(
				<div className="atlas">
					<div
						ref={panelRef}
						className="fundpicker__panel"
						style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
						role="listbox"
					>
						{results.map((r, i) => (
							<button key={r.id} type="button" data-ci={i} role="option" aria-selected={i === active}
								className={`fundpicker__opt${i === active ? ' is-active' : ''}`}
								onMouseEnter={() => setActive(i)} onClick={() => pick(r)}>
								<span className="fundpicker__optname">{r.name}{r.verified && <VerifiedBadge size={12} />}</span>
								{r.hq && <span className="fundpicker__optmeta">{r.hq}{r.kind ? ` · ${r.kind}` : ''}</span>}
							</button>
						))}
						<button type="button" data-ci={results.length} className={`fundpicker__add${active === results.length ? ' is-active' : ''}`}
							onMouseEnter={() => setActive(results.length)} onClick={addNew}>
							<Plus size={15} aria-hidden="true" /> Add “{query}” to the directory — we’ll verify it
						</button>
						<button type="button" data-ci={results.length + 1} className={`fundpicker__usetyped${active === results.length + 1 ? ' is-active' : ''}`}
							onMouseEnter={() => setActive(results.length + 1)} onClick={useTyped}>
							Use “{query}” as entered
						</button>
					</div>
				</div>,
				document.body,
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
