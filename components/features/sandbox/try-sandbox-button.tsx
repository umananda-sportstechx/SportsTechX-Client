'use client';

import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { SANDBOX_DAYS, startSandbox, useSandbox } from '@/lib/sandbox/store';
import type { SandboxProduct } from '@/lib/sandbox/types';
import { hrefOf } from '@/lib/routes';
import './sandbox.css';

/**
 * "Try Sandbox For Free" — opens a working Raise or Scout UI with sample data
 * and gated features for SANDBOX_DAYS days (lib/sandbox). Shown to Explore
 * users on the plan chooser and the Plans page.
 *
 * `beforeStart` lets the post-signup plan chooser close itself first.
 */
export function TrySandboxButton({ product, beforeStart, className, style }: {
	product: SandboxProduct;
	beforeStart?: () => Promise<void>;
	className?: string;
	style?: React.CSSProperties;
}) {
	const { expired, daysLeft } = useSandbox();
	const [busy, setBusy] = useState(false);
	const ended = expired(product);
	const left = daysLeft(product);

	const go = async () => {
		if (ended || busy) return;
		setBusy(true);
		try {
			await beforeStart?.();
			// Full load: every tier reader and the SWR cache start fresh in sandbox mode.
			if (startSandbox(product)) window.location.assign(hrefOf('home'));
		} finally { setBusy(false); }
	};

	return (
		<button type="button" className={className ?? 'sandbox-try'} style={style} onClick={() => void go()} disabled={ended || busy}
			title={ended ? `Your ${SANDBOX_DAYS}-day sandbox has ended` : undefined}>
			{busy ? <Loader2 className="spin" size={13} /> : <FlaskConical size={13} aria-hidden="true" />}
			{ended ? 'Sandbox ended' : left < SANDBOX_DAYS ? `Back to sandbox · ${left} day${left === 1 ? '' : 's'} left` : 'Try Sandbox For Free'}
		</button>
	);
}
