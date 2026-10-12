'use client';

import { FlaskConical } from 'lucide-react';
import { useEffect } from 'react';
import { exitSandbox, takeSetupPrompt, useSandbox } from '@/lib/sandbox/store';
import { openRaiseSetup, openScoutThesis } from '@/lib/setup-events';
import { hrefOf } from '@/lib/routes';
import './sandbox.css';

const NAME = { raise: 'Raise', scout: 'Scout' } as const;

/** Persistent strip above the navbar while a sandbox is open: what it is, days left, upgrade, exit. */
export function SandboxBanner() {
	const { active, daysLeft } = useSandbox();

	// First entry: the same setup wizard a new paying customer gets after
	// checkout (app/billing/success) — skippable, never forced twice. Deferred a
	// tick so the globally mounted SetupModalHost is listening.
	useEffect(() => {
		if (!active || !takeSetupPrompt(active)) return;
		const t = setTimeout(() => (active === 'scout' ? openScoutThesis() : openRaiseSetup()), 400);
		return () => clearTimeout(t);
	}, [active]);

	if (!active) return null;
	const left = daysLeft(active);
	// Full load so the app drops sandbox data and reads the real plan again.
	const exit = (to: string) => { exitSandbox(); window.location.assign(to); };
	return (
		<div className="sandbox-banner" role="status">
			<span className="sandbox-banner__tag"><FlaskConical size={12} aria-hidden="true" /> Sandbox</span>
			<span className="sandbox-banner__text">
				You&apos;re exploring <b>Atlas {NAME[active]}</b> with sample data · {left} day{left === 1 ? '' : 's'} left. Some actions are locked.
			</span>
			<span className="sandbox-banner__actions">
				<button type="button" className="sandbox-banner__cta" onClick={() => exit(hrefOf('plans'))}>Get Atlas {NAME[active]}</button>
				<button type="button" className="sandbox-banner__exit" onClick={() => exit(hrefOf('home'))}>Exit sandbox</button>
			</span>
		</div>
	);
}
