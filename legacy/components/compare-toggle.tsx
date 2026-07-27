'use client';

import { GitCompareArrows } from 'lucide-react';
import { useCompareSelection, type CompareKind } from '@/hooks/use-compare-selection';

/**
 * Compact "add to comparison" toggle to drop on list rows or cards. Stops
 * event propagation so clicking it inside a Link doesn't navigate.
 */
export function CompareToggle({ id, kind, size = 12 }: { id: string; kind: CompareKind; size?: number }) {
	const { has, toggle, count, max } = useCompareSelection(kind);
	const selected = has(id);
	const atCap = !selected && count >= max;
	return (
		<button
			type="button"
			className={`btn ghost ${selected ? 'primary' : ''}`}
			style={{ padding: '4px 8px', fontSize: 11, opacity: atCap ? 0.5 : 1 }}
			disabled={atCap}
			title={atCap ? `Max ${max} selected` : selected ? 'Remove from comparison' : 'Add to comparison'}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				toggle(id);
			}}
		>
			<GitCompareArrows size={size} /> {selected ? 'Selected' : 'Compare'}
		</button>
	);
}
