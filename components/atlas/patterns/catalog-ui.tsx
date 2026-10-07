'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '../ui/button';

/** Catalog page furniture: pager, card grid and the "advanced filters locked" teaser. */

/** Locked teaser shown in place of the advanced filters when the user's tier
 *  doesn't include them (feature slug `advanced_filters`). */
export function lockedFiltersNote(requiredTier?: string | null): string {
	// 'Raise' is the cheapest tier that unlocks advanced filters. The old default
	// said 'Growth', a tier retired in the explore/raise/scout rename.
	const tier = requiredTier ? requiredTier[0].toUpperCase() + requiredTier.slice(1) : 'Raise';
	return `Advanced filters (sector tiers, location, tech tags) · ${tier}+`;
}
export function LockedFilters({ requiredTier }: { requiredTier?: string | null }) {
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-faint)', border: '1px dashed var(--a-border-strong)', borderRadius: 'var(--a-radius-pill)', padding: '7px 13px' }}>
			<Lock size={13} /> {lockedFiltersNote(requiredTier)}
		</span>
	);
}

/** Prev / "Page X of Y" / Next. Renders nothing when there's a single page. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
	if (totalPages <= 1) return null;
	return (
		<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 22 }}>
			<span style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)', marginRight: 6 }}>Page {page} of {totalPages}</span>
			<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /></Button>
			<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={14} /></Button>
		</div>
	);
}

/** Standard auto-fill card grid used across the catalogs. */
export function CardGrid({ children }: { children: ReactNode }) {
	return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 252px), 1fr))', gap: 16 }}>{children}</div>;
}
