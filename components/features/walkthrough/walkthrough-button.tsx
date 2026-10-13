'use client';

import { useState } from 'react';
import { Footprints, Loader2 } from 'lucide-react';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { enterPractice } from './practice-actions';
import { usePracticeAccess } from './use-practice-access';
import './walkthrough.css';

/**
 * "Walk the pitch →" — starts the guided Raise or Scout tour on sample data
 * (lib/sandbox). Renders nothing unless the viewer is a real Explore user
 * outside practice.
 *
 * `beforeStart` lets the post-signup plan chooser settle the account on Explore first.
 */
export function WalkthroughButton({ product, source, beforeStart, label = 'Walk the pitch →', className, style }: {
	product: SandboxProduct;
	/** Where the click came from, for analytics (e.g. "plans", "tier-gate"). */
	source: string;
	beforeStart?: () => Promise<void>;
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}) {
	const { canEnter } = usePracticeAccess();
	const [busy, setBusy] = useState(false);
	if (!canEnter) return null;

	const go = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await beforeStart?.();
			enterPractice(product, source);
		} catch {
			// beforeStart reports its own error (the plan chooser shows it inline).
			setBusy(false);
		}
	};

	return (
		<button type="button" className={className ?? 'wt-try'} style={style} onClick={() => void go()} disabled={busy}>
			{busy ? <Loader2 className="animate-spin" size={13} aria-hidden="true" /> : <Footprints size={13} aria-hidden="true" />}
			{label}
		</button>
	);
}
