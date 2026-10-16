'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cx } from './cx';

export type ViewMode = 'cards' | 'table';

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
	return (
		<div className="atlas-view-toggle" role="group" aria-label="View mode">
			<button type="button" className={cx('atlas-view-toggle__btn', value === 'cards' && 'active')} aria-pressed={value === 'cards'} onClick={() => onChange('cards')} title="Card view"><LayoutGrid size={15} /></button>
			<button type="button" className={cx('atlas-view-toggle__btn', value === 'table' && 'active')} aria-pressed={value === 'table'} onClick={() => onChange('table')} title="Table view"><List size={15} /></button>
		</div>
	);
}
