'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { usePersona, type Persona } from '@/contexts/persona-context';

/**
 * Persona guard for the Copilot workspace. Founder pages are for the founder
 * persona, investor pages for the investor persona. An off-persona visit (or a
 * `general` user) is redirected to their dashboard so the two workspaces don't
 * leak into each other. Gating waits for `ready` so we never act on the
 * SSR-default persona before it resolves from the profile / localStorage.
 */
const ROUTE_PERSONA: Record<string, Persona> = {
	// Founder — Fundraising Copilot
	matches: 'founder',
	benchmarks: 'founder',
	market: 'founder',
	toolkit: 'founder',
	company: 'founder',
	// Investor — Dealflow Copilot
	sourcing: 'investor',
	'market-intel': 'investor',
	diligence: 'investor',
	thesis: 'investor',
	data: 'investor',
};

export default function CopilotLayout({ children }: { children: React.ReactNode }) {
	const { persona, ready } = usePersona();
	const pathname = usePathname();
	const router = useRouter();

	const seg = pathname.split('/')[2] ?? ''; // /copilot/<seg>
	const required = ROUTE_PERSONA[seg];
	// Unknown segment → no persona requirement (let it 404 normally).
	const allowed = !required || persona === required;

	useEffect(() => {
		if (ready && !allowed) router.replace('/dashboard');
	}, [ready, allowed, router]);

	if (!ready || !allowed) {
		return (
			<div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
				<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
			</div>
		);
	}
	return <>{children}</>;
}
