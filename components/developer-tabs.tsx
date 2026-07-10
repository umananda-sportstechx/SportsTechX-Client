'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Shared sub-nav for the developer surface — one place to build on SportsTechX
 * data: an API key to pull from the API, and webhooks to receive events. Rendered
 * at the top of each developer page so they read as a single product.
 */
const TABS = [
	{ href: '/api-keys', label: 'API keys' },
	{ href: '/webhooks', label: 'Webhooks' },
	{ href: '/api-docs', label: 'API docs' },
];

export function DeveloperTabs() {
	const path = usePathname();
	return (
		<div className="border-b mb-6">
			<nav className="flex gap-1 -mb-px">
				{TABS.map((t) => {
					const active = path === t.href;
					return (
						<Link
							key={t.href}
							href={t.href}
							className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
						>
							{t.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
