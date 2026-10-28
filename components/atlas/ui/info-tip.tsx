'use client';

import { useState, type ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

/**
 * A small (i) beside a label that explains it — "what's a data room?" — so a
 * form never assumes the reader knows the jargon. Opens on hover and keyboard
 * focus (Radix tooltip) and on tap, which Radix tooltips don't do on their own,
 * so it works on phones too. Portalled, so a scrolling modal can't clip it; the
 * bubble carries `.atlas` because the colour tokens are scoped to it.
 */
export function InfoTip({ children, label = 'More info' }: { children: ReactNode; label?: string }) {
	const [open, setOpen] = useState(false);
	return (
		<TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={120}>
			<TooltipPrimitive.Trigger asChild>
				<button type="button" className="atlas-infotip" aria-label={label}
					// Click / tap opens (preventDefault also stops Radix closing it on click).
					// Not a toggle: on touch the button is focused *after* the finger lifts,
					// which already opened it, so a toggle shut it again. Closing is Radix's:
					// pointer leave, blur (tap elsewhere) or Escape.
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
					<Info size={12} strokeWidth={2} aria-hidden="true" />
				</button>
			</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content className="atlas atlas-infotip__bubble" side="top" align="center" sideOffset={6} collisionPadding={12}
					onPointerDownOutside={() => setOpen(false)}>
					{children}
					<TooltipPrimitive.Arrow className="atlas-infotip__arrow" width={10} height={5} />
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}

/** Hover / focus explanation on an existing control (e.g. a chip), no icon. */
export function HoverTip({ tip, children }: { tip: ReactNode; children: ReactNode }) {
	return (
		<TooltipPrimitive.Root delayDuration={250}>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content className="atlas atlas-infotip__bubble" side="top" sideOffset={6} collisionPadding={12}>
					{tip}
					<TooltipPrimitive.Arrow className="atlas-infotip__arrow" width={10} height={5} />
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}
