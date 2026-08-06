'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Send, X, Download, Plus, History, ArrowUpRight, Sparkles, MessageSquare } from 'lucide-react';
import {
	useChat, MarkdownMessage, ThinkingDots, AI_MD_CSS,
	currentFilters, type ChatAction, type PageContext, type RewritePath,
} from '@/components/chat/chat-core';
import './raise-chat.css';

/**
 * Atlas founder chat — the streaming agent, restyled for the raise workspace.
 * Desktop: a right-side drawer (~400px). Mobile (≤720px): a full-screen modal.
 * A launcher FAB (bottom-right) opens it on every `/raise` page. Mechanics
 * (SSE, markdown, history, export) come from components/chat/chat-core.
 */

const GREETING =
	"I'm your fundraising co-pilot. Ask me to research investors, size your market, sanity-check your raise, or find your way around the workspace — e.g. “find seed investors in Germany” or “what does the Market page do?”";

/* ── Founder route policy ────────────────────────────────────────────────── */

/** Page context sent with each message. Only the investor detail page maps to a
 *  known entity; everything else sends just the path (+ any active filters). */
function founderPageContext(path: string | null): PageContext | undefined {
	if (!path) return undefined;
	const segs = path.split('?')[0]!.split('/').filter(Boolean); // ['raise','investors','id']
	const filters = currentFilters();
	if (segs[0] === 'raise' && segs[2]) {
		if (segs[1] === 'investors') return { path, entityType: 'investor', entityId: segs[2] };
		if (segs[1] === 'pitch') return { path, entityType: 'deck_analysis', entityId: segs[2] };
	}
	return filters ? { path, filters } : { path };
}

/** Turn a client-side nav tool call into a chip. Founders only have investor
 *  profiles + the investors list as navigable targets; other intents are dropped. */
function founderActionFromTool(tool: string, input: unknown): ChatAction | null {
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
		if (p?.page === 'investors') return { kind: 'navigate', label: 'View Investors', href: '/raise/investors' };
		return null;
	}
	return null;
}

/** Remap markdown in-app links for the founder shell: company pages don't exist
 *  here (flatten to text); investor links point at the raise workspace. */
const founderRewritePath: RewritePath = (href) => {
	if (href.startsWith('/companies/')) return null;
	if (href.startsWith('/investors/')) return '/raise' + href;
	return href;
};

/* ── Component ───────────────────────────────────────────────────────────── */

export function RaiseChat() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();

	const chat = useChat({
		greeting: GREETING,
		actionFromTool: founderActionFromTool,
		pageContext: () => founderPageContext(pathname),
		insufficientCreditsMd: "_You're out of AI credits._ [Top up or upgrade](/billing) to keep chatting.",
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
				<button className="raise-chat-fab" onClick={() => setOpen(true)} aria-label="Open fundraising co-pilot">
					<Sparkles size={20} />
				</button>
			)}

			{/* Panel stays mounted (for the slide animation + to keep the thread on
			    close); `inert` when closed removes its off-screen controls from tab
			    order and the a11y tree. */}
			<aside className={`raise-chat-panel ${open ? 'open' : ''}`} inert={!open ? true : undefined}>
				<div className="raise-chat-head">
					<div className="raise-chat-mark"><MessageSquare size={15} /></div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<h3>Co-pilot</h3>
						<div className="raise-chat-status">
							<span className={`raise-chat-dot ${streaming ? 'busy' : ''}`} />
							{streaming ? `${stage || 'Thinking'}…` : 'Online'}
						</div>
					</div>
					<button className="raise-chat-iconbtn" onClick={() => void toggleHistory()} aria-label="Conversation history" title="History" data-active={showHistory}>
						<History size={15} />
					</button>
					{(conversationId || messages.length > 1) && (
						<button className="raise-chat-iconbtn" onClick={resetConversation} aria-label="New conversation" title="New chat">
							<Plus size={15} />
						</button>
					)}
					{conversationId && (
						<button className="raise-chat-iconbtn" onClick={() => void exportConversation()} aria-label="Export" title="Export">
							<Download size={15} />
						</button>
					)}
					<button className="raise-chat-iconbtn" onClick={close} aria-label="Close">
						<X size={16} />
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
					{messages.map((m, i) => (
						<div key={i} className={`raise-chat-msg ${m.role}`}>
							<MarkdownMessage text={m.content} sources={m.sources ?? []} rewritePath={founderRewritePath} />
							{m.role === 'assistant' && (m.actions?.length ?? 0) > 0 && (
								<div className="raise-chat-chips">
									{m.actions!.map((a, ai) => (
										<button key={ai} className="raise-chat-chip" onClick={() => { router.push(a.href); close(); }} title={a.href}>
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
				</div>

				<div className="raise-chat-input-row">
					<textarea
						className="raise-chat-input"
						placeholder="Ask about investors, your market, your raise…"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
						rows={1}
						disabled={streaming}
					/>
					<button className="raise-chat-send" onClick={() => void send()} disabled={streaming || !input.trim()} aria-label="Send">
						<Send size={16} />
					</button>
				</div>
			</aside>
		</>
	);
}
