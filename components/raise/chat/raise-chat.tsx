'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUp, ArrowUpRight, X, Download, Plus, History, Maximize2 } from 'lucide-react';
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

/** Which corner the launcher is parked in. Dropped wherever you let go. */
type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNER_OFFSET: Record<Corner, React.CSSProperties> = {
	br: { right: 24, bottom: 24, left: 'auto', top: 'auto' },
	bl: { left: 24, bottom: 24, right: 'auto', top: 'auto' },
	tr: { right: 24, top: 24, left: 'auto', bottom: 'auto' },
	tl: { left: 24, top: 24, right: 'auto', bottom: 'auto' },
};
const CORNER_KEY = 'atlas:alphy-corner';
const isCorner = (v: unknown): v is Corner => v === 'tl' || v === 'tr' || v === 'bl' || v === 'br';

export function RaiseChat() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const { tier } = useNav();
	const isScout = tier === 'scout';
	const copy = chatCopy(tier);
	const suggestions = isScout ? SCOUT_SUGGESTIONS : tier === 'raise' ? RAISE_SUGGESTIONS : EXPLORE_SUGGESTIONS;
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Draggable launcher. The FAB was fixed bottom-right and sat on top of the
	// pagination "next" control (feedback: "Unable to go to next page because of
	// Ask Atlas icon"). Drag it to any corner; the choice is a per-viewer
	// convenience kept in localStorage. A drop under the move threshold counts as
	// a click and opens the panel, so keyboard/tap users are unaffected.
	const [corner, setCorner] = useState<Corner>(() => {
		if (typeof window === 'undefined') return 'br';
		try { const c = localStorage.getItem(CORNER_KEY); return isCorner(c) ? c : 'br'; } catch { return 'br'; }
	});
	const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
	const dragStart = useRef<{ x: number; y: number } | null>(null);
	const moved = useRef(false);
	const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		dragStart.current = { x: e.clientX, y: e.clientY };
		moved.current = false;
	};
	const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
		if (!dragStart.current) return;
		const dx = e.clientX - dragStart.current.x, dy = e.clientY - dragStart.current.y;
		if (!moved.current && Math.hypot(dx, dy) < 5) return; // below threshold = still a click
		moved.current = true;
		setDrag({ x: e.clientX, y: e.clientY });
	};
	const onFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
		if (!dragStart.current) return;
		dragStart.current = null;
		if (!moved.current) return; // a tap — let onClick open the panel
		const next = `${e.clientY < window.innerHeight / 2 ? 't' : 'b'}${e.clientX < window.innerWidth / 2 ? 'l' : 'r'}` as Corner;
		setCorner(next);
		setDrag(null);
		try { localStorage.setItem(CORNER_KEY, next); } catch { /* private mode / blocked */ }
	};
	// If the gesture is interrupted (pointercancel, e.g. the OS takes over), snap
	// the button back to its parked corner and clear the drag flags so the next
	// click opens the panel normally and the button isn't left stuck mid-drag.
	const onFabPointerCancel = () => { dragStart.current = null; moved.current = false; setDrag(null); };

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
	// Move the current thread to the full chat page. The page renders the same
	// shared session, so the thread is there at once and a reply that is still
	// streaming carries on — nothing to abort or refetch.
	const expand = () => {
		setOpen(false);
		router.push(conversationId ? `/chat/${conversationId}` : '/chat');
	};
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
				<button
					className="raise-chat-fab"
					style={drag
						? { left: drag.x, top: drag.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)', transition: 'none', cursor: 'grabbing' }
						: CORNER_OFFSET[corner]}
					onPointerDown={onFabPointerDown}
					onPointerMove={onFabPointerMove}
					onPointerUp={onFabPointerUp}
					onPointerCancel={onFabPointerCancel}
					onClick={() => { if (moved.current) { moved.current = false; return; } setOpen(true); }}
					aria-label={copy.fabLabel}
					title="Drag to move • click to open"
				>
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
						<button className="raise-chat-iconbtn" onClick={expand} aria-label="Open full chat page" title="Expand">
							<Maximize2 size={14} strokeWidth={1.5} />
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
