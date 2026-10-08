'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useChat, AI_MD_CSS, type ConversationListItem } from '@/components/chat/chat-core';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	FOUNDER_GREETING, FOUNDER_INSUFFICIENT_CREDITS, SCOUT_GREETING, SCOUT_INSUFFICIENT_CREDITS,
	founderPageContext, founderActionFromTool, founderRewritePath, scoutRewritePath, FounderMessages,
} from '@/components/raise/chat/founder-chat';
import { RaiseSearch, RAISE_SUGGESTIONS, SCOUT_SUGGESTIONS } from '@/components/raise/raise-search';
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

export default function RaiseChatPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initRef = useRef(false);

	const { tier } = useNav();
	const isScout = tier === 'scout';

	// Memoized: `useChat` keeps this in its callback deps.
	const actionFromTool = useCallback(
		(tool: string, input: unknown) => founderActionFromTool(tool, input, tier),
		[tier],
	);

	const chat = useChat({
		greeting: isScout ? SCOUT_GREETING : FOUNDER_GREETING,
		actionFromTool,
		pageContext: () => founderPageContext(CHAT),
		insufficientCreditsMd: isScout ? SCOUT_INSUFFICIENT_CREDITS : FOUNDER_INSUFFICIENT_CREDITS,
	});
	const {
		messages, input, setInput, streaming, stage, conversationId,
		bodyRef, send, resetConversation, loadConversation, abort,
	} = chat;

	const { data: conversations } = useSWR<ConversationListItem[]>(qk.chat.conversations());

	// One-time init from the URL: open an existing conversation (?c=<id>) or seed a
	// new one from the home search (?q=…). initRef guards the StrictMode remount.
	useEffect(() => {
		if (initRef.current) return;
		initRef.current = true;
		const c = searchParams.get('c');
		const q = searchParams.get('q');
		if (c) void loadConversation(c);
		else if (q) void send(q);
	}, [searchParams, loadConversation, send]);

	// Reflect the active conversation in the URL so a refresh restores it, and
	// refresh the rail whenever a (new) conversation becomes active.
	useEffect(() => {
		if (!conversationId) return;
		router.replace(`${CHAT}?c=${conversationId}`);
		void mutate(qk.chat.conversations());
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
								{(isScout ? SCOUT_SUGGESTIONS : RAISE_SUGGESTIONS).map((s) => (
									<button key={s} type="button" className="atlas-composer-chip" onClick={() => void send(s)}>{s}</button>
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
						placeholder={isScout ? 'Ask about companies, deals, your thesis…' : 'Ask about investors, your market, your raise…'}
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
								onClick={() => void loadConversation(c.id)}
								title={c.title ?? 'Untitled conversation'}
							>
								<span className="raise-convo-title">{c.title || 'Untitled conversation'}</span>
								<span className="raise-convo-date">{new Date(c.last_message_at).toLocaleDateString()}</span>
							</button>
						))
					)}
				</div>
			</aside>
		</div>
	);
}
