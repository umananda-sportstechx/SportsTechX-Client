'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Wallet, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { NAV_GROUPS } from './sidebar-rail';
import { Logo } from '@/components/ui/atoms';

/**
 * Command palette (Cmd+K).
 *
 * Layered results:
 *   1. AI-question shortcut (when query > 3 chars)
 *   2. Navigation matches across NAV_GROUPS (literal name match)
 *   3. Companies via /api/search (backend handles tsvector + pg_trgm)
 *   4. Investors via /api/search
 *
 * Search is debounced 200ms — fast feedback without firing per keystroke.
 */

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

interface BackendSearchResponse {
	q: string;
	results: {
		companies?: Array<{ id: string; name: string; slug?: string; sector?: string; subtitle?: string; website?: string }>;
		investors?: Array<{ id: string; name: string; slug?: string; type?: string; subtitle?: string; website?: string }>;
	};
}

interface PaletteRow {
	id: string;
	name: string;
	sub?: string;
	cat: string;
	kind: 'nav' | 'co' | 'inv' | 'ai';
	href?: string;
	icon?: LucideIcon;
	website?: string;
}

interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [q, setQ] = useState('');
	const [sel, setSel] = useState(0);
	const debouncedQ = useDebouncedValue(q, 200);

	// Reset state on open + focus the input.
	useEffect(() => {
		if (!open) return;
		setQ('');
		setSel(0);
		const t = setTimeout(() => inputRef.current?.focus(), 30);
		return () => clearTimeout(t);
	}, [open]);

	// Navigation matches (instant, no backend hit).
	const navResults: PaletteRow[] = ALL_NAV_ITEMS
		.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()))
		.map((i) => ({ id: i.id, name: i.name, cat: 'Navigate', kind: 'nav' as const, href: i.path, icon: i.icon }));

	// Backend search — only fires at 3+ chars. /api/search rejects shorter
	// queries with VALIDATION_ERROR because at 1-2 chars the GIN trigram scan
	// returns too many candidates to be useful.
	const enabled = open && debouncedQ.trim().length >= 3;
	const { data: searchData } = useSWR<BackendSearchResponse>(
		enabled ? qk.search.typeahead(debouncedQ, ['companies', 'investors']) : null,
		{ dedupingInterval: 30_000 },
	);

	const coResults: PaletteRow[] = (searchData?.results.companies ?? []).slice(0, 5).map((c) => ({
		id: c.id,
		name: c.name,
		sub: c.sector,
		cat: 'Company',
		kind: 'co',
		href: `/companies/${c.slug ?? c.id}`,
		website: c.website ?? c.subtitle,
	}));

	const invResults: PaletteRow[] = (searchData?.results.investors ?? []).slice(0, 4).map((i) => ({
		id: i.id,
		name: i.name,
		sub: i.type,
		cat: 'Investor',
		kind: 'inv',
		href: `/investors/${i.slug ?? i.id}`,
	}));

	// Ask-AI shortcut at the top once query is meaningful.
	const aiResults: PaletteRow[] = q.length > 3
		? [{ id: `ai-${q}`, name: `Ask AI: "${q}"`, cat: 'AI', kind: 'ai' }]
		: [];

	const items: PaletteRow[] = [...aiResults, ...navResults, ...coResults, ...invResults];

	useEffect(() => { setSel(0); }, [q]);

	const handleSelect = (item: PaletteRow | undefined) => {
		if (!item) return;
		if (item.kind === 'ai') {
			window.dispatchEvent(new CustomEvent('stx:open-ai', { detail: { query: q } }));
		} else if (item.href) {
			router.push(item.href);
		}
		onClose();
	};

	const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') onClose();
		if (e.key === 'ArrowDown') {
			setSel((s) => Math.min(items.length - 1, s + 1));
			e.preventDefault();
		}
		if (e.key === 'ArrowUp') {
			setSel((s) => Math.max(0, s - 1));
			e.preventDefault();
		}
		if (e.key === 'Enter') {
			handleSelect(items[sel]);
			e.preventDefault();
		}
	};

	if (!open) return null;

	return (
		<div className="cmd-overlay" onClick={onClose}>
			<div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
				<input
					ref={inputRef}
					className="cmd-input"
					placeholder="Search or jump to…"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={onKey}
				/>
				<div className="cmd-list">
					{items.length === 0 && (
						<div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
							{!q
								? 'Type to search across companies, investors, and pages'
								: q.trim().length < 3
									? 'Keep typing — search needs at least 3 characters'
									: 'No matches'}
						</div>
					)}
					{items.map((item, i) => (
						<div
							key={`${item.kind}-${item.id}-${i}`}
							className={`cmd-row ${i === sel ? 'sel' : ''}`}
							onMouseEnter={() => setSel(i)}
							onClick={() => handleSelect(item)}
						>
							{item.kind === 'co' && <Logo co={{ name: item.name, website: item.website }} size={22} />}
							{item.kind === 'inv' && <Wallet size={16} />}
							{item.kind === 'ai' && <Sparkles size={16} />}
							{item.kind === 'nav' && item.icon && <item.icon size={16} />}
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								<span style={{ fontWeight: 500 }}>{item.name}</span>
								{item.sub && <span style={{ fontSize: 11, opacity: 0.7 }}>{item.sub}</span>}
							</div>
							<span className="cmd-cat">{item.cat}</span>
						</div>
					))}
				</div>
				<div
					style={{
						padding: '8px 14px',
						borderTop: '1px solid var(--border)',
						display: 'flex',
						gap: 16,
						fontSize: 10,
						color: 'var(--fg-muted)',
						fontFamily: 'var(--font-mono)',
						letterSpacing: '0.08em',
					}}
				>
					<span>↑↓ navigate</span>
					<span>↵ select</span>
					<span>esc close</span>
				</div>
			</div>
		</div>
	);
}
