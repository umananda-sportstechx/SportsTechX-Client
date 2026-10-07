'use client';

import { ArrowUpRight } from 'lucide-react';
import {
	MarkdownMessage, ThinkingDots, currentFilters,
	type ChatAction, type ChatMessage, type PageContext, type RewritePath,
} from '@/components/chat/chat-core';
import { pathOf } from '@/lib/routes';
import './raise-chat.css';

/**
 * Shared founder-chat policy + transcript renderer, used by BOTH the FAB drawer
 * (raise-chat.tsx) and the full chat page (app/app/chat) so route mapping,
 * greeting and the message render stay in one place.
 */

export const FOUNDER_GREETING =
	"I'm your fundraising co-pilot. Ask me to research investors, size your market, sanity-check your raise, or find your way around the workspace — e.g. “find seed investors in Germany” or “what does the Market page do?”";

export const FOUNDER_INSUFFICIENT_CREDITS =
	"_You're out of AI credits._ [Top up or upgrade](/billing) to keep chatting.";

/** Detail routes whose `[id]` segment names an entity the model can be told about. */
const ENTITY_ROUTES: [routeId: string, entityType: 'investor' | 'deck_analysis'][] = [
	['investors', 'investor'],
	['deck', 'deck_analysis'],
];

/** Page context sent with each message. Only investor/deck detail pages map to a
 *  known entity; everything else sends just the path (+ any active filters).
 *
 *  Matched against the route manifest rather than by segment position, which is
 *  what this did before (`segs[0] === 'raise' && segs[1] === 'pitch'`). That
 *  broke silently the moment the routes moved: the model simply stopped being
 *  told which investor or deck the user was looking at, with nothing in the UI
 *  to say so. */
export function founderPageContext(path: string | null): PageContext | undefined {
	if (!path) return undefined;
	const clean = path.split('?')[0]!;
	for (const [routeId, entityType] of ENTITY_ROUTES) {
		const base = pathOf(routeId, 'raise');
		if (!clean.startsWith(base + '/')) continue;
		const entityId = clean.slice(base.length + 1).split('/')[0];
		if (entityId) return { path, entityType, entityId };
	}
	const filters = currentFilters();
	return filters ? { path, filters } : { path };
}

/** Turn a client-side nav tool call into a chip. Founders can navigate to
 *  investor profiles + the workspace pages; other intents are dropped. */
export function founderActionFromTool(tool: string, input: unknown): ChatAction | null {
	if (tool === 'open_entity') {
		const p = input as { entity_type?: string; id_or_slug?: string };
		if (p?.entity_type === 'investor' && p?.id_or_slug) {
			const name = p.id_or_slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
			return { kind: 'open_entity', label: `Open ${name}`, href: `${pathOf('investors', 'raise')}/${encodeURIComponent(p.id_or_slug)}` };
		}
		return null;
	}
	if (tool === 'navigate_and_filter') {
		const p = input as { page?: string };
		// The agent's page names mapped to route ids, so each URL comes from the
		// manifest. Hardcoding them is how three of these chips came to point at
		// routes that no longer existed.
		//
		// The key set must track the `page` enum in the server's
		// `chat.tools.ts` — that is the source of truth for what the model can
		// emit. `analytics`, `companies` and `funding` were missing, and the
		// system prompt explicitly tells the model to use `page:"analytics"` for
		// chart requests, so every chart ask produced a tool call this mapped to
		// `null`: the assistant said "open Analytics" and offered no button.
		//
		// `ma` and `ecosystem` are in the enum but deliberately absent here —
		// there is no M&A route and no single Ecosystem route, so they correctly
		// yield no chip rather than a dead link.
		const NAV: Record<string, { label: string; routeId: string }> = {
			home: { label: 'Open Home', routeId: 'home' },
			pitch: { label: 'Open Pitch deck', routeId: 'deck' },
			analytics: { label: 'Open Analytics', routeId: 'analytics' },
			// Legacy alias for analytics; the enum still carries `market`.
			market: { label: 'Open Analytics', routeId: 'analytics' },
			companies: { label: 'Browse Companies', routeId: 'companies' },
			funding: { label: 'Open Recently Funded', routeId: 'recently-funded' },
			investors: { label: 'View Investors', routeId: 'investors' },
			pipeline: { label: 'Open Watchlist', routeId: 'pipeline' },
			programs: { label: 'Open Programs', routeId: 'programs' },
			events: { label: 'Open Events', routeId: 'events' },
			resources: { label: 'Open Resources', routeId: 'guide' },
		};
		const m = p?.page ? NAV[p.page] : undefined;
		return m ? { kind: 'navigate', label: m.label, href: pathOf(m.routeId, 'raise') } : null;
	}
	return null;
}

/** Remap markdown in-app links for the founder shell: company pages don't exist
 *  here (flatten to text); investor links point at the raise workspace. */
export const founderRewritePath: RewritePath = (href) => {
	if (href.startsWith('/companies/')) return null;
	if (href.startsWith('/investors/')) return pathOf('investors', 'raise') + href.slice('/investors'.length);
	return href;
};

/**
 * The chat transcript — message bubbles, action chips, sources, and the thinking
 * indicator. The scroll container + ref is owned by the caller (drawer or page).
 * `onAction` navigates a chip (the drawer also closes itself there).
 */
export function FounderMessages({ messages, streaming, stage, onAction }: {
	messages: ChatMessage[]; streaming: boolean; stage: string; onAction: (href: string) => void;
}) {
	return (
		<>
			{messages.map((m, i) => (
				<div key={i} className={`raise-chat-msg ${m.role}`}>
					<MarkdownMessage text={m.content} sources={m.sources ?? []} rewritePath={founderRewritePath} />
					{m.role === 'assistant' && (m.actions?.length ?? 0) > 0 && (
						<div className="raise-chat-chips">
							{m.actions!.map((a, ai) => (
								<button key={ai} type="button" className="atlas-action raise-chat-chip" onClick={() => onAction(a.href)} title={a.href}>
									<span className="atlas-action__icon"><ArrowUpRight size={13} strokeWidth={1.25} /></span>
									{a.label}
								</button>
							))}
						</div>
					)}
					{m.role === 'assistant' && (m.sources?.length ?? 0) > 0 && (
						<div className="raise-chat-sources">
							<div className="raise-chat-sources-head">Sources</div>
							{m.sources!.map((s) => (
								<a key={s.index} href={s.url} target="_blank" rel="noopener noreferrer" className="raise-chat-source">
									<sup>[{s.index}]</sup> {s.title ?? s.url}
								</a>
							))}
						</div>
					)}
				</div>
			))}
			{streaming && messages[messages.length - 1]?.content === '' && (
				<div className="raise-chat-thinking">
					<span className="raise-chat-thinking-dots"><ThinkingDots /></span>
					<span className="raise-chat-thinking-label">{stage || 'Thinking'}…</span>
				</div>
			)}
		</>
	);
}
