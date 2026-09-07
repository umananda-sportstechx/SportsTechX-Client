'use client';

import { ArrowUpRight } from 'lucide-react';
import {
	MarkdownMessage, ThinkingDots, currentFilters,
	type ChatAction, type ChatMessage, type PageContext, type RewritePath,
} from '@/components/chat/chat-core';
import './raise-chat.css';

/**
 * Shared founder-chat policy + transcript renderer, used by BOTH the FAB drawer
 * (raise-chat.tsx) and the full chat page (raise/chat/page.tsx) so route mapping,
 * greeting and the message render stay in one place.
 */

export const FOUNDER_GREETING =
	"I'm your fundraising co-pilot. Ask me to research investors, size your market, sanity-check your raise, or find your way around the workspace — e.g. “find seed investors in Germany” or “what does the Market page do?”";

export const FOUNDER_INSUFFICIENT_CREDITS =
	"_You're out of AI credits._ [Top up or upgrade](/billing) to keep chatting.";

/** Page context sent with each message. Only investor/pitch detail pages map to a
 *  known entity; everything else sends just the path (+ any active filters). */
export function founderPageContext(path: string | null): PageContext | undefined {
	if (!path) return undefined;
	const segs = path.split('?')[0]!.split('/').filter(Boolean); // ['raise','investors','id']
	const filters = currentFilters();
	if (segs[0] === 'raise' && segs[2]) {
		if (segs[1] === 'investors') return { path, entityType: 'investor', entityId: segs[2] };
		if (segs[1] === 'pitch') return { path, entityType: 'deck_analysis', entityId: segs[2] };
	}
	return filters ? { path, filters } : { path };
}

/** Turn a client-side nav tool call into a chip. Founders can navigate to
 *  investor profiles + the workspace pages; other intents are dropped. */
export function founderActionFromTool(tool: string, input: unknown): ChatAction | null {
	if (tool === 'open_entity') {
		const p = input as { entity_type?: string; id_or_slug?: string };
		if (p?.entity_type === 'investor' && p?.id_or_slug) {
			const name = p.id_or_slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
			return { kind: 'open_entity', label: `Open ${name}`, href: `/raise/investors/${encodeURIComponent(p.id_or_slug)}` };
		}
		return null;
	}
	if (tool === 'navigate_and_filter') {
		const p = input as { page?: string };
		const NAV: Record<string, { label: string; href: string }> = {
			home: { label: 'Open Home', href: '/raise' },
			pitch: { label: 'Open Pitch deck', href: '/raise/pitch' },
			market: { label: 'Open Market', href: '/raise/market' },
			investors: { label: 'View Investors', href: '/raise/investors' },
			pipeline: { label: 'Open Pipeline', href: '/raise/pipeline' },
			programs: { label: 'Open Programs & Events', href: '/raise/programs-events' },
			events: { label: 'Open Programs & Events', href: '/raise/programs-events' },
			resources: { label: 'Open Resources', href: '/raise/resources' },
		};
		const m = p?.page ? NAV[p.page] : undefined;
		return m ? { kind: 'navigate', label: m.label, href: m.href } : null;
	}
	return null;
}

/** Remap markdown in-app links for the founder shell: company pages don't exist
 *  here (flatten to text); investor links point at the raise workspace. */
export const founderRewritePath: RewritePath = (href) => {
	if (href.startsWith('/companies/')) return null;
	if (href.startsWith('/investors/')) return '/raise' + href;
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
								<button key={ai} className="raise-chat-chip" onClick={() => onAction(a.href)} title={a.href}>
									<ArrowUpRight size={13} /> {a.label}
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
					<ThinkingDots />
					<span>{stage || 'Thinking'}…</span>
				</div>
			)}
		</>
	);
}
