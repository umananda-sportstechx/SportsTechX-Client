'use client';

/**
 * Right-side quick-peek drawer — slides in, click-outside-to-close, Escape-to-close,
 * body-scroll lock while open. Composable parts:
 *
 *   <Drawer open onClose>
 *     <DrawerHead> …header… </DrawerHead>
 *     <DrawerTabs tab="general" onTab={setTab}> {tabs list} </DrawerTabs>
 *     <DrawerBody> …body… </DrawerBody>
 *     <DrawerFoot> …CTA… </DrawerFoot>
 *   </Drawer>
 *
 * Uses the existing `.co-drawer*` CSS classes in `app/company-detail.css`.
 */

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	ariaLabel?: string;
}

export function Drawer({ open, onClose, children, ariaLabel = 'Details' }: DrawerProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="co-drawer-overlay" onClick={onClose}>
			<aside
				className="co-drawer"
				onClick={(e) => e.stopPropagation()}
				aria-label={ariaLabel}
				role="dialog"
				aria-modal="true"
			>
				{children}
			</aside>
		</div>
	);
}

export function DrawerHead({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
	return (
		<header className="co-drawer-head">
			{children}
			{onClose && (
				<div style={{ display: 'flex', gap: 4 }}>
					<button className="icon-btn" onClick={onClose} title="Close">
						<X size={14} />
					</button>
				</div>
			)}
		</header>
	);
}

export interface DrawerTab {
	key: string;
	label: string;
	count?: number;
}

export function DrawerTabs({
	tabs, current, onTab,
}: {
	tabs: DrawerTab[];
	current: string;
	onTab: (k: string) => void;
}) {
	return (
		<nav className="co-drawer-tabs" role="tablist">
			{tabs.map((t) => (
				<button
					key={t.key}
					role="tab"
					aria-selected={current === t.key}
					className={`co-drawer-tab ${current === t.key ? 'on' : ''}`}
					onClick={() => onTab(t.key)}
				>
					{t.label}
					{t.count != null && t.count > 0 && <span className="co-drawer-tab-count">{t.count}</span>}
				</button>
			))}
		</nav>
	);
}

export function DrawerBody({ children }: { children: ReactNode }) {
	return <div className="co-drawer-body">{children}</div>;
}

export function DrawerFoot({ children }: { children: ReactNode }) {
	return <footer className="co-drawer-foot">{children}</footer>;
}
