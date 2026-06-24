'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Imperative confirmation modal — a themed replacement for `window.confirm()`.
 *
 * Mount <ConfirmProvider> once near the app root, then anywhere:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete?', description: '…', destructive: true }))) return;
 *
 * Returns true when the user confirms, false on cancel / dismiss. Styled with
 * the design-system tokens so it matches the app theme (light & dark).
 */
export interface ConfirmOptions {
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Renders the confirm button in the destructive (red) style. */
	destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
	return ctx;
}

const overlayStyle: React.CSSProperties = {
	position: 'fixed',
	inset: 0,
	background: 'rgba(0,0,0,0.6)',
	backdropFilter: 'blur(2px)',
	zIndex: 200,
};

const contentStyle: React.CSSProperties = {
	position: 'fixed',
	left: '50%',
	top: '50%',
	transform: 'translate(-50%, -50%)',
	width: 'min(92vw, 420px)',
	background: 'var(--surface, var(--bg-2))',
	border: '1px solid var(--border-strong)',
	borderRadius: 4,
	padding: 'var(--space-5)',
	boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
	zIndex: 201,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<ConfirmOptions & { open: boolean }>({ open: false, title: '' });
	const resolver = useRef<((v: boolean) => void) | null>(null);

	const confirm = useCallback<ConfirmFn>((opts) => {
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
			setState({ ...opts, open: true });
		});
	}, []);

	const settle = useCallback((result: boolean) => {
		resolver.current?.(result);
		resolver.current = null;
		setState((s) => ({ ...s, open: false }));
	}, []);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<DialogPrimitive.Root open={state.open} onOpenChange={(o) => { if (!o) settle(false); }}>
				<DialogPrimitive.Portal>
					<DialogPrimitive.Overlay style={overlayStyle} />
					<DialogPrimitive.Content
						style={contentStyle}
						aria-describedby={state.description ? undefined : undefined}
						onEscapeKeyDown={() => settle(false)}
					>
						<DialogPrimitive.Title
							style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--fg)' }}
						>
							{state.title}
						</DialogPrimitive.Title>
						{state.description && (
							<DialogPrimitive.Description
								style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-2)', margin: '10px 0 0' }}
							>
								{state.description}
							</DialogPrimitive.Description>
						)}
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-5)' }}>
							<button type="button" className="btn ghost" onClick={() => settle(false)}>
								{state.cancelLabel ?? 'Cancel'}
							</button>
							<button
								type="button"
								className="btn"
								style={state.destructive
									? { background: 'var(--neg)', borderColor: 'var(--neg)', color: '#fff' }
									: undefined}
								onClick={() => settle(true)}
							>
								{state.confirmLabel ?? 'Confirm'}
							</button>
						</div>
					</DialogPrimitive.Content>
				</DialogPrimitive.Portal>
			</DialogPrimitive.Root>
		</ConfirmContext.Provider>
	);
}
