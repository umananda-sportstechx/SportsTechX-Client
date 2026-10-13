'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Search } from 'lucide-react';
import { useClaimSearch, type ClaimSearchResult } from '@/components/claim/use-claim-search';
import type { Draft } from './deal-draft-codec';

/**
 * Company picker for Share-a-deal — a directory search, not free text.
 *
 * Pick an existing Atlas company (sets company_id, fills website/HQ) so the deal
 * links the real profile; or "use as a new company", which keeps the name with
 * no company_id. On submit the server routes a new company into the
 * startups-to-add pipeline, and the deal can't go live until an admin researches
 * and adds it to the directory.
 *
 * Shares the fund-picker's panel styling and its portalled, keyboard-navigable
 * dropdown (never clipped by a card or scroll container).
 */
interface Props { d: Draft; patch: (p: Partial<Draft>) => void }

export function CompanyPicker({ d, patch }: Props) {
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
	const { results } = useClaimSearch('founder', q);
	const wrapRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const query = q.trim();
	const chosen = d.company;
	const showPanel = open && !chosen && query.length >= 2;
	const navCount = results.length + 1; // results, then "use as a new company"

	const pick = (r: ClaimSearchResult) => {
		patch({ company: r.name, companyId: r.id, website: r.website ?? d.website, hq: r.hq ?? d.hq });
		setQ(''); setOpen(false);
	};
	const useNew = () => { patch({ company: query, companyId: '' }); setQ(''); setOpen(false); };
	const clear = () => { patch({ company: '', companyId: '' }); };
	const activate = (i: number) => { if (i < results.length) pick(results[i]); else useNew(); };

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

	if (chosen) {
		return (
			<div className="fundpicker__selected">
				<Building2 size={15} aria-hidden="true" />
				<span className="fundpicker__selname">{chosen}</span>
				<span className="fundpicker__selmeta">{d.companyId ? 'In Atlas' : 'New — we’ll add it'}</span>
				<button type="button" className="fundpicker__change" onClick={clear}>Change</button>
			</div>
		);
	}
	return (
		<div className="fundpicker__wrap" ref={wrapRef}>
			<span className="fundpicker__ico"><Search size={15} aria-hidden="true" /></span>
			<input
				className="atlas-input fundpicker__input"
				value={q}
				placeholder="Search the company by name…"
				role="combobox"
				aria-expanded={showPanel}
				aria-autocomplete="list"
				onChange={(e) => { setQ(e.target.value); setOpen(true); }}
				onFocus={() => setOpen(true)}
			/>
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
								<span className="fundpicker__optname">{r.name}</span>
								{r.hq && <span className="fundpicker__optmeta">{r.hq}{r.kind ? ` · ${r.kind}` : ''}</span>}
							</button>
						))}
						<button type="button" data-ci={results.length} className={`fundpicker__add${active === results.length ? ' is-active' : ''}`}
							onMouseEnter={() => setActive(results.length)} onClick={useNew}>
							<Building2 size={15} aria-hidden="true" /> Use “{query}” as a new company — we’ll add it to Atlas
						</button>
					</div>
				</div>,
				document.body,
			)}
		</div>
	);
}
