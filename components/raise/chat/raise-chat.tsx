'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUp, ArrowUpRight, X, Download, Plus, History } from 'lucide-react';
import { useChat, AI_MD_CSS } from '@/components/chat/chat-core';
import { AtlasMark } from '@/components/atlas/brand/atlas-logo';
import {
	chatCopy, founderPageContext, founderActionFromTool, founderRewritePath, scoutRewritePath,
	FounderMessages,
} from './founder-chat';
import { RAISE_SUGGESTIONS, SCOUT_SUGGESTIONS, EXPLORE_SUGGESTIONS } from '@/components/raise/raise-search';
import { useNav } from '@/hooks/use-nav';
import './raise-chat.css';

/**
 * Atlas chat — the streaming agent as a right-side drawer opened by a
 * bottom-right launcher on every page except the full chat page. Route policy +
 * transcript render are shared with the chat page via founder-chat.tsx.
 *
 * Mounted for every product (see app-shell): the component is identical, only
 * the copy, the suggested prompts and the route policy differ, and all three
 * follow the viewer's tier.
 *
 * There is no Figma frame for this panel, so it borrows the parts of the
 * system that already have one: the sidebar's textured rail for its header,
 * the Atlas mark for its identity (a generic sparkle said "some AI", not
 * "Atlas"), mono uppercase labels, and the command palette's row for prompts.
 */

export function RaiseChat() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { tier } = useNav();
	const isScout = tier === 'scout';
	const copy = chatCopy(tier);
	const suggestions = isScout ? SCOUT_SUGGESTIONS : tier === 'raise' ? RAISE_SUGGESTIONS : EXPLORE_SUGGESTIONS;
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Memoized: `useChat` keeps this in its callback deps, so a fresh closure on
	// every render would rebuild them for nothing.
	const actionFromTool = useCallback(
		(tool: string, input: unknown) => founderActionFromTool(tool, input, tier),
		[tier],
	);

	const chat = useChat({
		greeting: copy.greeting,
		actionFromTool,
		pageContext: () => founderPageContext(pathname),
		insufficientCreditsMd: copy.insufficient,
	});

	const {
		messages, input, setInput, streaming, stage, conversationId,
		showHistory, conversations, historyLoading, bodyRef,
		send, resetConversation, toggleHistory, loadConversation, exportConversation, abort,
	} = chat;

	const close = () => { abort(); setOpen(false); };
	// A fresh conversation is just the greeting. That state gets the intro and
	// the suggested prompts instead of one lonely paragraph at the top of an
	// otherwise empty panel.
	const fresh = messages.length <= 1 && !streaming;

	// The composer grows with what is typed, then shrinks back once a message
	// is sent and the field empties.
	useEffect(() => {
		if (!input && inputRef.current) inputRef.current.style.height = '';
	}, [input]);
	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	return (
		<>
			<style>{AI_MD_CSS}</style>

			{!open && (
				<button className="raise-chat-fab" onClick={() => setOpen(true)} aria-label={copy.fabLabel}>
					<span className="raise-chat-fab__mark"><AtlasMark size={14} /></span>
					<span className="raise-chat-fab__label">Ask Atlas</span>
				</button>
			)}

			{/* Desktop only (hidden ≤720px, where the panel is full-screen). Gives
			    the drawer depth over the page and a click-away to close it. */}
			{open && <div className="raise-chat-scrim" onClick={close} aria-hidden="true" />}

			{/* Panel stays mounted (for the slide animation + to keep the thread on
			    close); `inert` when closed removes its off-screen controls from tab
			    order and the a11y tree. */}
			<aside className={`raise-chat-panel ${open ? 'open' : ''}`} inert={!open ? true : undefined} aria-label="Atlas co-pilot">
				<header className="raise-chat-head">
					<div className="raise-chat-mark"><AtlasMark size={17} /></div>
					<div className="raise-chat-titles">
						<h3>Co-pilot</h3>
						<div className="raise-chat-status">
							<span className={`raise-chat-dot ${streaming ? 'busy' : ''}`} />
							{streaming ? `${stage || 'Thinking'}…` : 'Online'}
						</div>
					</div>
					<div className="raise-chat-tools">
						{(conversationId || messages.length > 1) && (
							<button className="raise-chat-iconbtn" onClick={resetConversation} aria-label="New conversation" title="New chat">
								<Plus size={15} strokeWidth={1.5} />
							</button>
						)}
						{conversationId && (
							<button className="raise-chat-iconbtn" onClick={() => void exportConversation()} aria-label="Export conversation" title="Export">
								<Download size={14} strokeWidth={1.5} />
							</button>
						)}
						<button className="raise-chat-iconbtn" onClick={() => void toggleHistory()} aria-label="Conversation history" title="History" data-active={showHistory}>
							<History size={14} strokeWidth={1.5} />
						</button>
						<button className="raise-chat-iconbtn" onClick={close} aria-label="Close co-pilot" title="Close">
							<X size={16} strokeWidth={1.5} />
						</button>
					</div>
				</header>

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
					{fresh ? (
						<div className="raise-chat-intro">
							<div className="raise-chat-intro__eyebrow">Atlas co-pilot</div>
							<h2 className="raise-chat-intro__title">What can I help with?</h2>
							<p className="raise-chat-intro__lede">{copy.greeting}</p>

							<div className="raise-chat-intro__label">Try asking</div>
							<div className="raise-chat-prompts">
								{suggestions.map((s) => (
									<button key={s} type="button" className="raise-chat-prompt" onClick={() => void send(s)}>
										<span>{s}</span>
										<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
									</button>
								))}
							</div>
						</div>
					) : (
						<FounderMessages
							messages={messages} streaming={streaming} stage={stage}
							onAction={(href) => { router.push(href); close(); }}
							rewritePath={isScout ? scoutRewritePath : founderRewritePath}
						/>
					)}
				</div>

				<footer className="raise-chat-foot">
					<div className="raise-chat-input-row">
						<textarea
							ref={inputRef}
							className="raise-chat-input"
							placeholder={copy.placeholder}
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								e.target.style.height = 'auto';
								e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
							}}
							onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
							rows={1}
							disabled={streaming}
							aria-label="Message the co-pilot"
						/>
						<button className="raise-chat-send" onClick={() => void send()} disabled={streaming || !input.trim()} aria-label="Send">
							<ArrowUp size={15} strokeWidth={2} />
						</button>
					</div>
					<div className="raise-chat-hint">
						<span><kbd>↵</kbd> send</span>
						<span><kbd>⇧</kbd><kbd>↵</kbd> new line</span>
					</div>
				</footer>
			</aside>
		</>
	);
}
