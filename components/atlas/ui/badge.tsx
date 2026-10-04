'use client';

import type { ReactNode } from 'react';
import { cx } from './cx';

/** Badge — mono uppercase tag (Figma "Suggestion tag"), with status tones. */

type Tone = 'neutral' | 'navy' | 'ok' | 'warn' | 'danger';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
	return <span className={cx('atlas-badge', `atlas-badge--${tone}`)}>{children}</span>;
}
