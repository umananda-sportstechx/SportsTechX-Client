'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useChat, AI_MD_CSS, type ConversationListItem } from '@/components/chat/chat-core';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	chatCopy, founderPageContext, founderActionFromTool, founderRewritePath, scoutRewritePath,
	FounderMessages,
} from '@/components/raise/chat/founder-chat';
import { RaiseSearch, RAISE_SUGGESTIONS, SCOUT_SUGGESTIONS, EXPLORE_SUGGESTIONS } from '@/components/raise/raise-search';
import { useNav } from '@/hooks/use-nav';
import { Button } from '@/components/atlas';
import '@/components/raise/chat/raise-chatpage.css';

/**
 * Atlas — full chat page (Claude/ChatGPT layout): transcript above, composer
 * pinned at the bottom, a right rail of past conversations. Reached from the home
 * search of either paid product (which passes ?q=…). Reuses the same useChat +
 * policy as the FAB drawer; the drawer is hidden on this route (see app-shell).
 *
 * Serves Raise and Scout both. Only the copy and the route policy differ, and
 * both follow the viewer's tier — the route itself is `tier: ['raise','scout']`
 * and `/api/chat` is gated to the same pair server-side.
 */

const CHAT = hrefOf('chat');

/*
 * Why this is a LAYOUT, with empty pages under it.
 *
 * A conversation lives at `/chat/<id>`. The id only exists once the first
 * reply starts streaming, so a new chat moves from `/chat` to `/chat/<id>`
 * mid-stream. Those are different route segments: if this UI were a page,
 * that navigation would unmount it and abort the very reply that created the
 * conversation. A layout persists across its children, so the thread, the
 * stream and the composer survive the URL change.
 */

export default function ChatLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const routeId = useParams<{ id?: string }>().id;
	const initRef = useRef(false);

	const { tier } = useNav();
	const isScout = tier === 'scout';
	const copy = chatCopy(tier);

	// Memoized: `useChat` keeps this in its callback deps.
	const actionFromTool = useCallback(
		(tool: string, input: unknown) => founderActionFromTool(tool, input, tier),
		[tier],
	);

	const chat = useChat({
		greeting: copy.greeting,
		actionFromTool,
		pageContext: () => founderPageContext(CHAT),
		insufficientCreditsMd: copy.insufficient,
	});
	const {
		messages, input, setInput, streaming, stage, conversationId,
		bodyRef, send, resetConversation, loadConversation, abort,
	} = chat;

	const { data: conversations } = useSWR<ConversationListItem[]>(qk.chat.conversations());

	// One-time init: seed a new conversation from the home search (`?q=…`), or
	// forward an old `?c=<id>` link to its `/chat/<id>` home. initRef guards the
	// StrictMode remount.
	useEffect(() => {
		if (initRef.current) return;
		initRef.current = true;
		const legacy = searchParams.get('c');
		if (legacy && !routeId) { router.replace(`${CHAT}/${encodeURIComponent(legacy)}`); return; }
		const q = searchParams.get('q');
		if (!routeId && q) void send(q);
	}, [searchParams, routeId, router, send]);

	// URL → thread: opening `/chat/<id>` (a link, the rail, back/forward)
	// loads that conversation unless it is already the one on screen.
	useEffect(() => {
		if (routeId && routeId !== conversationId) void loadConversation(routeId);
		// Back to bare `/chat` (browser back, a nav link) means a fresh thread.
		// Only fires when the ROUTE changes, so a new chat getting its id while
		// still on `/chat` cannot trip it.
		else if (!routeId && conversationId) resetConversation();
		// conversationId is deliberately not a dependency: when a new chat gets
		// its id, the effect below moves the URL to match, and re-running this
		// one in between would reload the conversation that is still streaming.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [routeId, loadConversation, resetConversation]);

	// Thread → URL: a conversation that has an id lives at `/chat/<id>`, so a
	// refresh or a shared link restores it. Also refreshes the rail.
	useEffect(() => {
		if (!conversationId) return;
		if (conversationId !== routeId) router.replace(`${CHAT}/${encodeURIComponent(conversationId)}`);
		void mutate(qk.chat.conversations());
		// routeId is read, not tracked: tracking it would re-fire on every
		// navigation and fight the effect above.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, router]);

	const newChat = () => { resetConversation(); router.replace(CHAT); };
	const hasThread = messages.length > 1 || streaming;

	return (
		<div className="raise-chatpage">
			<style>{AI_MD_CSS}</style>

			<div className="raise-chatpage-main">
				<div className="raise-chatpage-transcript" ref={bodyRef}>
					<div className="raise-chatpage-thread">
						<FounderMessages
							messages={messages} streaming={streaming} stage={stage}
							onAction={(href) => router.push(href)}
							rewritePath={isScout ? scoutRewritePath : founderRewritePath}
						/>
						{!hasThread && (
							<div className="raise-chatpage-suggest">
								{(isScout ? SCOUT_SUGGESTIONS : tier === 'raise' ? RAISE_SUGGESTIONS : EXPLORE_SUGGESTIONS).map((s, i) => (
									<button key={s} type="button" className="atlas-composer-chip" data-tour={i === 0 ? 'chat-suggestion' : undefined} onClick={() => void send(s)}>{s}</button>
								))}
							</div>
						)}
					</div>
				</div>
				<div className="raise-chatpage-composer">
					<RaiseSearch
						value={input}
						onChange={setInput}
						onSubmit={() => void send()}
						disabled={streaming}
						autoFocus
						streaming={streaming}
						onStop={abort}
						placeholder={copy.placeholder}
					/>
				</div>
			</div>

			<aside className="raise-chatpage-rail">
				<div className="raise-chatpage-railhead">
					<Button variant="primary" className="raise-chatpage-new" onClick={newChat}>
						<Plus strokeWidth={1.5} /> New chat
					</Button>
				</div>
				<div className="raise-chatpage-convos">
					{(conversations?.length ?? 0) === 0 ? (
						<div className="raise-chatpage-empty">No conversations yet.</div>
					) : (
						conversations!.map((c) => (
							<button
								key={c.id}
								className={`raise-convo-item ${c.id === conversationId ? 'active' : ''}`}
								onClick={() => router.push(`${CHAT}/${encodeURIComponent(c.id)}`)}
								title={c.title ?? 'Untitled conversation'}
							>
								<span className="raise-convo-title">{c.title || 'Untitled conversation'}</span>
								<span className="raise-convo-date">{new Date(c.last_message_at).toLocaleDateString()}</span>
							</button>
						))
					)}
				</div>
			</aside>
			{children}
		</div>
	);
}
