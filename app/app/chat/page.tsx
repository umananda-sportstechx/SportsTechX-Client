'use client';

import { useEffect, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useChat, AI_MD_CSS, type ConversationListItem } from '@/components/chat/chat-core';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { FOUNDER_GREETING, FOUNDER_INSUFFICIENT_CREDITS, founderPageContext, founderActionFromTool, FounderMessages } from '@/components/raise/chat/founder-chat';
import { RaiseSearch, RAISE_SUGGESTIONS } from '@/components/raise/raise-search';
import { Button } from '@/components/atlas';
import '@/components/raise/chat/raise-chatpage.css';

/**
 * Atlas Raise — full chat page (Claude/ChatGPT layout): transcript above, composer
 * pinned at the bottom, a right rail of past conversations. Reached from the home
 * search (which passes ?q=…). Reuses the same useChat + founder policy as the FAB
 * drawer; the drawer is hidden on this route (see raise-shell.tsx).
 */

const CHAT = hrefOf('chat');

export default function RaiseChatPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initRef = useRef(false);

	const chat = useChat({
		greeting: FOUNDER_GREETING,
		actionFromTool: founderActionFromTool,
		pageContext: () => founderPageContext(CHAT),
		insufficientCreditsMd: FOUNDER_INSUFFICIENT_CREDITS,
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
						<FounderMessages messages={messages} streaming={streaming} stage={stage} onAction={(href) => router.push(href)} />
						{!hasThread && (
							<div className="raise-chatpage-suggest">
								{RAISE_SUGGESTIONS.map((s) => (
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
						placeholder="Ask about investors, your market, your raise…"
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
