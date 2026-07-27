'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Coins, Sparkles } from 'lucide-react';
import { CREDITS_EVENT, type CreditExhaustedDetail } from '@/lib/credit-events';
import { useCreditBalance } from '@/hooks/use-credit-balance';

/**
 * Global "out of AI credits" modal. Mounted once (app/providers.tsx); opens when
 * any AI feature hits a 402 INSUFFICIENT_CREDITS (the API layer dispatches
 * `stx:credits-exhausted`). The single CTA sends the user to /subscriptions —
 * which hosts both plan upgrades and one-off credit packs.
 *
 * In the chatbot the exhaustion is shown inline instead (the chat owns its own
 * error surface), so this modal is for everywhere else.
 */
export function CreditExhaustionHost() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [detail, setDetail] = useState<CreditExhaustedDetail>({});
	const isExport = detail.creditType === 'integration';
	const { balance: aiBalance } = useCreditBalance('ai');
	const { balance: exportBalance } = useCreditBalance('integration');

	useEffect(() => {
		const onEvent = (e: Event) => {
			setDetail((e as CustomEvent<CreditExhaustedDetail>).detail ?? {});
			setOpen(true);
		};
		window.addEventListener(CREDITS_EVENT, onEvent);
		return () => window.removeEventListener(CREDITS_EVENT, onEvent);
	}, []);

	// "export credits" = the integration pool; everything else is AI credits.
	const label = isExport ? 'export credits' : 'AI credits';
	const available = detail.available ?? (isExport ? exportBalance?.total_available : aiBalance?.total_available);

	return (
		<DialogPrimitive.Root open={open} onOpenChange={setOpen}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }}
				/>
				<DialogPrimitive.Content
					aria-describedby={undefined}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: 'min(92vw, 440px)', background: 'var(--surface, var(--bg-2))',
						border: '1px solid var(--border-strong)', borderRadius: 4, padding: 'var(--space-5)',
						boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201,
					}}
				>
					<div style={{
						width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center',
						background: 'color-mix(in oklab, var(--accent) 16%, transparent)', color: 'var(--accent)', marginBottom: 14,
					}}>
						<Coins size={20} />
					</div>
					<DialogPrimitive.Title style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>
						You&apos;re out of {label}
					</DialogPrimitive.Title>
					<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-2)', margin: '10px 0 0' }}>
						{detail.required != null && available != null
							? `This needs ${detail.required.toLocaleString()} ${label}, but you have ${available.toLocaleString()} left. `
							: `You don’t have enough ${label} for this. `}
						{isExport
							? 'Each exported row costs 1 export credit. Upgrade your plan or top up to export more.'
							: 'Top up with a credit pack or upgrade your plan for a larger monthly allowance.'}
					</p>
					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-5)' }}>
						<button type="button" className="btn ghost" onClick={() => setOpen(false)}>Maybe later</button>
						<button
							type="button"
							className="btn"
							onClick={() => { setOpen(false); router.push('/subscriptions'); }}
							style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
						>
							<Sparkles size={14} /> Get more credits
						</button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
