'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/**
 * Atlas modal — the shell the global interrupt dialogs share.
 *
 * There was no dialog in the Atlas kit at all, which is why every overlay in
 * the app is bespoke legacy markup. This is the smallest version that two real
 * callers need (the credits and tier-required hosts); it is not trying to be a
 * general Dialog yet — no description slot, no controlled focus options, no
 * nesting. Those arrive with the drawer work, when there is something to
 * generalise *from*.
 *
 * Inline styles rather than a stylesheet: `components/atlas/index.ts` loads a
 * fixed four CSS files in cascade order, and a fifth would have to be inserted
 * into that order. The credits modal it replaces was inline too, so this is no
 * worse and is one place instead of two.
 */
export function Modal({ open, onOpenChange, icon, title, children, footer, width = 440, nonModal = false }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Small tinted glyph above the title. */
	icon?: ReactNode;
	title: ReactNode;
	children: ReactNode;
	/** Buttons, laid out bottom-right. */
	footer?: ReactNode;
	width?: number;
	/**
	 * Drop Radix's focus trap + scroll lock. Required when the modal hosts a
	 * portalled dropdown (Combobox/CityInput): a modal Dialog traps focus inside
	 * its content, so the dropdown's search input can't be focused and its list
	 * can't be scrolled. The overlay still blocks clicks to the page behind.
	 */
	nonModal?: boolean;
}) {
	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={!nonModal}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					// Keep the page behind visible through the scrim (a heavier black read as a flat void on the dark theme). 40% + blur, with the -webkit- prefix so Safari applies it.
					style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)', zIndex: 200 }}
				/>
				{/* `.atlas` because the portal renders outside the shell, so the
				    design-system scope would not otherwise apply to it. */}
				<DialogPrimitive.Content
					className="atlas"
					aria-describedby={undefined}
					onInteractOutside={(e) => {
						const t = e.target as HTMLElement;
						if (t.closest('.atlas-combo-panel')) e.preventDefault();
					}}
					style={{
						position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
						width: `min(92vw, ${width}px)`, background: 'var(--a-surface)',
						border: '1px solid var(--a-border)', borderRadius: 'var(--a-radius)', padding: '26px 28px',
						boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 201, color: 'var(--a-ink)',
					}}
				>
					{icon && (
						<div style={{
							width: 40, height: 40, borderRadius: 'var(--a-radius-sm)', display: 'grid', placeItems: 'center',
							background: 'var(--a-navy-soft)', color: 'var(--a-navy)', marginBottom: 14,
						}}>
							{icon}
						</div>
					)}
					<DialogPrimitive.Title
						style={{ fontFamily: 'var(--a-font)', fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--a-ink)' }}
					>
						{title}
					</DialogPrimitive.Title>
					<div style={{ fontFamily: 'var(--a-body)', fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', marginTop: 10 }}>
						{children}
					</div>
					{footer && (
						<div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
							{footer}
						</div>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
