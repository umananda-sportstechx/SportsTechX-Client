'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Send, X, Download, Plus, History, Sparkles } from 'lucide-react';
import { useChat, AI_MD_CSS } from '@/components/chat/chat-core';
import {
	FOUNDER_GREETING, FOUNDER_INSUFFICIENT_CREDITS, SCOUT_GREETING, SCOUT_INSUFFICIENT_CREDITS,
	founderPageContext, founderActionFromTool, founderRewritePath, scoutRewritePath, FounderMessages,
} from './founder-chat';
import { useNav } from '@/hooks/use-nav';
import './raise-chat.css';

/**
 * Atlas chat — the streaming agent as a right-side drawer opened by a
 * bottom-right FAB on every page except the full chat page. Route policy +
 * transcript render are shared with the chat page via founder-chat.tsx.
 *
 * Mounted for **both paid products** (see app-shell): the component is identical,
 * only the copy and the route policy differ, and both follow the viewer's tier.
 */

export function RaiseChat() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { tier } = useNav();
	const isScout = tier === 'scout';

	// Memoized: `useChat` keeps this in its callback deps, so a fresh closure on
	// every render would rebuild them for nothing.
	const actionFromTool = useCallback(
		(tool: string, input: unknown) => founderActionFromTool(tool, input, tier),
		[tier],
	);

	const chat = useChat({
		greeting: isScout ? SCOUT_GREETING : FOUNDER_GREETING,
		actionFromTool,
		pageContext: () => founderPageContext(pathname),
		insufficientCreditsMd: isScout ? SCOUT_INSUFFICIENT_CREDITS : FOUNDER_INSUFFICIENT_CREDITS,
	});

	const {
		messages, input, setInput, streaming, stage, conversationId,
		showHistory, conversations, historyLoading, bodyRef,
		send, resetConversation, toggleHistory, loadConversation, exportConversation, abort,
	} = chat;

	const close = () => { abort(); setOpen(false); };

	return (
		<>
			<style>{AI_MD_CSS}</style>

			{!open && (
				<button className="raise-chat-fab" onClick={() => setOpen(true)} aria-label={isScout ? 'Open deal-flow co-pilot' : 'Open fundraising co-pilot'}>
					<Sparkles size={18} strokeWidth={1.25} />
				</button>
			)}

			{/* Panel stays mounted (for the slide animation + to keep the thread on
			    close); `inert` when closed removes its off-screen controls from tab
			    order and the a11y tree. */}
			<aside className={`raise-chat-panel ${open ? 'open' : ''}`} inert={!open ? true : undefined}>
				<div className="raise-chat-head">
					<div className="raise-chat-mark"><Sparkles size={13} strokeWidth={1.25} /></div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<h3>Co-pilot</h3>
						<div className="raise-chat-status">
							<span className={`raise-chat-dot ${streaming ? 'busy' : ''}`} />
							{streaming ? `${stage || 'Thinking'}…` : 'Online'}
						</div>
					</div>
					<button className="raise-chat-iconbtn" onClick={() => void toggleHistory()} aria-label="Conversation history" title="History" data-active={showHistory}>
						<History size={14} strokeWidth={1.25} />
					</button>
					{(conversationId || messages.length > 1) && (
						<button className="raise-chat-iconbtn" onClick={resetConversation} aria-label="New conversation" title="New chat">
							<Plus size={14} strokeWidth={1.25} />
						</button>
					)}
					{conversationId && (
						<button className="raise-chat-iconbtn" onClick={() => void exportConversation()} aria-label="Export" title="Export">
							<Download size={14} strokeWidth={1.25} />
						</button>
					)}
					<button className="raise-chat-iconbtn" onClick={close} aria-label="Close">
						<X size={15} strokeWidth={1.25} />
					</button>
				</div>

				{showHistory && (
					<div className="ai-history">
						<div className="ai-history-head">Past conversations</div>
						{historyLoading ? (
							<div className="ai-history-empty">Loading…</div>
						) : (conversations?.length ?? 0) === 0 ? (
							<div className="ai-history-empty">No past conversations yet.</div>
						) : (
							conversations!.map((c) => (
								<button key={c.id} className="ai-history-item" onClick={() => void loadConversation(c.id)} title={c.title ?? 'Untitled conversation'}>
									<span className="ai-history-title">{c.title || 'Untitled conversation'}</span>
									<span className="ai-history-date">{new Date(c.last_message_at).toLocaleDateString()}</span>
								</button>
							))
						)}
					</div>
				)}

				<div className="raise-chat-body" ref={bodyRef}>
					<FounderMessages
						messages={messages} streaming={streaming} stage={stage}
						onAction={(href) => { router.push(href); close(); }}
						rewritePath={isScout ? scoutRewritePath : founderRewritePath}
					/>
				</div>

				<div className="raise-chat-input-row">
					<textarea
						className="raise-chat-input"
						placeholder={isScout ? 'Ask about companies, deals, your thesis…' : 'Ask about investors, your market, your raise…'}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
						rows={1}
						disabled={streaming}
					/>
					<button className="raise-chat-send" onClick={() => void send()} disabled={streaming || !input.trim()} aria-label="Send">
						<Send size={13} strokeWidth={1.5} />
					</button>
				</div>
			</aside>
		</>
	);
}
