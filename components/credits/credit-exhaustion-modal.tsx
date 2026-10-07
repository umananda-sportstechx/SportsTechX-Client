'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { CREDITS_EVENT, type CreditExhaustedDetail } from '@/lib/credit-events';
import { useCreditBalance } from '@/hooks/use-credit-balance';
import { hrefOf } from '@/lib/routes';

/**
 * Global "out of STX credits" modal. Mounted once (app/providers.tsx); opens
 * when anything hits a 402 INSUFFICIENT_CREDITS (the API layer dispatches
 * `stx:credits-exhausted`). The CTA goes to /billing, which hosts both plan
 * upgrades and one-off credit packs.
 *
 * In the chatbot the exhaustion is shown inline instead (the chat owns its own
 * error surface), so this modal is for everywhere else.
 *
 * Was raw Radix with inline styles on the *legacy* token set (`--fg`, `--bg-2`,
 * `--accent`, `className="btn"`), which left it looking nothing like the rest
 * of the app — and nothing like the tier modal that now sits beside it. Both
 * share `Modal` so there is one dialog shape, not two.
 */
export function CreditExhaustionHost() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [detail, setDetail] = useState<CreditExhaustedDetail>({});
	const isExport = detail.creditType === 'integration';
	// Only once the dialog is open: this host is mounted on every page.
	const { balance } = useCreditBalance(open);

	useEffect(() => {
		const onEvent = (e: Event) => {
			setDetail((e as CustomEvent<CreditExhaustedDetail>).detail ?? {});
			setOpen(true);
		};
		window.addEventListener(CREDITS_EVENT, onEvent);
		return () => window.removeEventListener(CREDITS_EVENT, onEvent);
	}, []);

	// One wallet funds both, so the balance is the same either way — only the
	// wording changes, to name what the user was trying to do.
	const label = 'STX credits';
	const available = detail.available ?? balance?.total_available;

	return (
		<Modal
			open={open}
			onOpenChange={setOpen}
			icon={<Coins size={18} />}
			title={<>You&apos;re out of {label}</>}
			footer={
				<>
					<Button variant="ghost" onClick={() => setOpen(false)}>Maybe later</Button>
					<Button onClick={() => { setOpen(false); router.push(hrefOf('billing')); }}>
						<Sparkles size={14} /> Get more credits
					</Button>
				</>
			}
		>
			{detail.required != null && available != null
				? `This needs ${detail.required.toLocaleString()} ${label}, but you have ${available.toLocaleString()} left. `
				: `You don’t have enough ${label} for this. `}
			{isExport
				? 'Each exported row costs 1 credit. Top up with a credit pack or upgrade your plan for a larger monthly allowance.'
				: 'Top up with a credit pack or upgrade your plan for a larger monthly allowance.'}
		</Modal>
	);
}
