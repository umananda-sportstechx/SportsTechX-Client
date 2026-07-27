'use client';

import { Page } from '@/components/ui/atoms';
import { WorkspaceHeader } from './workspace-ui';

/**
 * Shared placeholder for persona Copilot sub-screens that are scaffolded but
 * not yet built out. Renders the real design header (so the route is styled and
 * navigable) plus a short note. Each screen replaces this with its full port.
 */
export function WorkspacePlaceholder({
	eyebrow, title, sub,
}: {
	eyebrow: string;
	title: string;
	sub: string;
}) {
	return (
		<Page>
			<WorkspaceHeader eyebrow={eyebrow} title={title} sub={sub} />
			<div
				className="card"
				style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}
			>
				This Copilot view is being built out. The persona home dashboard is live now —
				use the sidebar “Home” to return to it.
			</div>
		</Page>
	);
}
