'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { upgradeTarget, type Tier } from '@/lib/access';
import { hrefOf } from '@/lib/routes';
import { TIER_EVENT, type TierRequiredDetail } from '@/lib/tier-events';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { PRODUCT } from './tier-gate';

/**
 * Global "your plan doesn't include this" modal. Mounted once
 * (app/providers.tsx); opens when anything hits a 402 TIER_REQUIRED.
 *
 * `RouteGate` already stops a user *navigating* to a page their plan lacks, so
 * this fires on an action taken from a page they can legitimately see — an
 * advanced filter, an export, an API key. That is why it is a modal rather
 * than a full-page gate: the surrounding page is still theirs.
 *
 * It names the product using the same `PRODUCT` copy the full-page `TierGate`
 * uses, so the two never drift.
 */
export function TierRequiredHost() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [open, setOpen] = useState(false);
	const [detail, setDetail] = useState<TierRequiredDetail>({});

	useEffect(() => {
		const onEvent = (e: Event) => {
			setDetail((e as CustomEvent<TierRequiredDetail>).detail ?? {});
			setOpen(true);
		};
		window.addEventListener(TIER_EVENT, onEvent);
		return () => window.removeEventListener(TIER_EVENT, onEvent);
	}, []);

	// `requiredTiers` is the same shape `access()` takes, so the question "which
	// product do we pitch" is already answered — no second rule here.
	const viewer: Tier = detail.currentTier ?? getUserType(profile);
	const sell = upgradeTarget(detail.requiredTiers, viewer);
	const product = sell && sell !== 'explore' ? PRODUCT[sell] : null;

	return (
		<Modal
			open={open}
			onOpenChange={setOpen}
			icon={<Lock size={18} />}
			title={product ? `This is part of ${product.name}` : 'This needs a different plan'}
			footer={
				<>
					<Button variant="ghost" onClick={() => setOpen(false)}>Not now</Button>
					<Button onClick={() => { setOpen(false); router.push(hrefOf('billing')); }}>
						{product ? `Get ${product.name}` : 'See plans'}
					</Button>
				</>
			}
		>
			{/* Falls back to the server's own sentence when the tier can't be
			    named — better a plain message than a confidently wrong pitch. */}
			{product?.blurb ?? detail.message ?? 'Your current plan does not include this.'}
		</Modal>
	);
}
