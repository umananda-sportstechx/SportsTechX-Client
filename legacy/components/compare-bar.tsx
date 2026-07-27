'use client';

import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { useCompareSelection, type CompareKind } from '@/hooks/use-compare-selection';

const LABEL: Record<CompareKind, string> = {
	companies: 'companies',
	investors: 'investors',
	deals: 'deals',
};

/**
 * Sticky bar that appears at the bottom of list pages once the user has
 * picked 2 or more rows. Links to /compare/<kind>?ids=a,b,c. URL-driven —
 * the compare pages themselves don't read localStorage.
 */
export function CompareBar({ kind }: { kind: CompareKind }) {
	const { ids, count, clear, max } = useCompareSelection(kind);
	if (count < 2) return null;
	return (
		<div
			style={{
				position: 'fixed',
				bottom: 16,
				left: '50%',
				transform: 'translateX(-50%)',
				background: 'var(--bg-2)',
				border: '1px solid var(--border)',
				boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
				padding: '10px 14px',
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				zIndex: 50,
			}}
			role="region"
			aria-label={`Compare ${LABEL[kind]}`}
		>
			<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
				{count} of {max} {LABEL[kind]} selected
			</span>
			<button className="btn ghost" onClick={clear} aria-label="Clear selection">
				<X size={12} />
			</button>
			<Link
				href={`/compare/${kind}?ids=${ids.join(',')}`}
				className="btn"
			>
				Compare {count} <ArrowRight size={12} />
			</Link>
		</div>
	);
}
