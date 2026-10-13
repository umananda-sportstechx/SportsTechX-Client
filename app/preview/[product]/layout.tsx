'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { PreviewShell } from '@/components/shell/preview-shell';
import type { SandboxProduct } from '@/lib/sandbox/types';

const PRODUCTS: SandboxProduct[] = ['raise', 'scout'];

/**
 * Public, pre-signup "Walk the Pitch" — deliberately NOT under app/(dashboard):
 * no auth gate, no entitlement gate, no real session anywhere in this tree.
 *
 * Rendered client-only, not server-rendered. `lib/preview-mode.ts` derives
 * "are we in preview" from `window.location`, which does not exist during SSR
 * — a server render falls back to canonical (unprefixed) links, e.g.
 * `href="/home"` instead of `href="/preview/raise/home"`. React never patches
 * that mismatch up, so a click before hydration catches up follows the stale
 * server-rendered href straight to the real, gated page. Nothing under this
 * layout needs SSR (same reasoning as WalkthroughCoach already being
 * `next/dynamic(..., { ssr: false })`): skipping it removes the race
 * entirely instead of chasing each place a link could be clicked too soon.
 */
export default function PreviewProductLayout({ children }: { children: React.ReactNode }) {
	const params = useParams<{ product: string }>();
	const product = PRODUCTS.includes(params.product as SandboxProduct) ? (params.product as SandboxProduct) : null;
	if (!product) notFound();

	const [mounted, setMounted] = useState(false);
	// The intentional SSR-skip itself, not a derived-state anti-pattern: this
	// is the one render this tree needs to not match the server's.
	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return <PreviewShell product={product}>{children}</PreviewShell>;
}
