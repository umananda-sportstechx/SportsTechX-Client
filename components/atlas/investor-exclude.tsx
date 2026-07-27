'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { X } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Field } from '@/components/atlas/kit';

/**
 * Atlas Raise — "Are there investors Atlas should exclude?" (Notion Step 5 /
 * Settings). Search-to-exclude: type a name → pick investors → their ids are stored
 * in raise_investor_criteria.excluded_investor_ids (the match engine hard-filters them).
 */
interface Inv { id: string; name: string }

export function InvestorExclude({ label, value, onChange }: { label: string; value: string[] | undefined; onChange: (ids: string[]) => void }) {
	const ids = useMemo(() => value ?? [], [value]);
	const [q, setQ] = useState('');
	const dq = useDebouncedValue(q);
	const [chosen, setChosen] = useState<Inv[]>([]);

	// Resolve names for already-stored ids (e.g. returning to Settings) once.
	const seed = useSWR<{ data: Inv[] }>(ids.length ? qk.investors.list({ ids: ids.join(','), limit: 200 }) : null);
	useEffect(() => {
		if (seed.data?.data) setChosen((prev) => {
			const have = new Set(prev.map((x) => x.id));
			const add = seed.data!.data.filter((x) => ids.includes(x.id) && !have.has(x.id));
			return add.length ? [...prev, ...add] : prev;
		});
	}, [seed.data, ids]);

	const results = useSWR<{ data: Inv[] }>(dq.trim().length >= 2 ? qk.investors.list({ q: dq, limit: 6 }) : null);
	const add = (inv: Inv) => {
		if (ids.includes(inv.id)) return;
		setChosen((c) => (c.some((x) => x.id === inv.id) ? c : [...c, inv]));
		onChange([...ids, inv.id]);
		setQ('');
	};
	const remove = (id: string) => { onChange(ids.filter((x) => x !== id)); setChosen((c) => c.filter((x) => x.id !== id)); };

	return (
		<Field label={label}>
			{chosen.length > 0 && (
				<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
					{chosen.map((inv) => (
						<span key={inv.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--a-inset)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
							{inv.name}<button onClick={() => remove(inv.id)} aria-label={`Remove ${inv.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-faint)', display: 'inline-flex', padding: 0 }}><X size={12} /></button>
						</span>
					))}
				</div>
			)}
			<div style={{ position: 'relative' }}>
				<input className="atlas-input" placeholder="Search investors to exclude…" value={q} onChange={(e) => setQ(e.target.value)} />
				{dq.trim().length >= 2 && (results.data?.data.length ?? 0) > 0 && (
					<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
						{results.data!.data.filter((r) => !ids.includes(r.id)).map((r) => (
							<button key={r.id} onClick={() => add(r)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--a-ink)' }}>{r.name}</button>
						))}
					</div>
				)}
			</div>
		</Field>
	);
}
