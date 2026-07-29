'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Send, X, Download, Plus, History, ArrowUpRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
	useChat, MarkdownMessage, ThinkingDots, AI_MD_CSS,
	currentFilters, type ChatAction, type PageContext,
} from '@/components/chat/chat-core';

/**
 * AI side panel (legacy market-intelligence shell) — the streaming chat agent
 * with RAG polish (inline citations, source badges, history, export). Chrome +
 * legacy route policy live here; all mechanics (SSE, markdown, state machine)
 * come from components/chat/chat-core.
 */

interface AiPanelProps {
	open: boolean;
	onClose: () => void;
}

const GREETING =
	'I can query the SportsTechX database — companies, deals, investors, programs — and pull live web results. Try a quick prompt below or ask anything.';

/** Accent colour name → oklch hue, matching the Settings → Appearance picker. */
const ACCENT_HUES: Record<string, number> = {
	crimson: 14, orange: 40, amber: 75, green: 150, teal: 180, blue: 250, indigo: 275, violet: 300, pink: 340,
};

/** Derive the page context the chat sends so the agent's page_insights tool can
 *  describe the current page / fetch the open entity (owner-scoped server-side). */
function pageContextFromPath(path: string | null): PageContext | undefined {
	if (!path) return undefined;
	const segs = path.split('?')[0]!.split('/').filter(Boolean);
	const top = segs[0];
	const id = segs[1];
	const filters = currentFilters();
	if (top === 'companies' && id) return { path, entityType: 'company', entityId: id };
	if (top === 'investors' && id) return { path, entityType: 'investor', entityId: id };
	if (top === 'ecosystem' && id) return { path, entityType: 'ecosystem_entity', entityId: id };
	if (top === 'pitch-analyzer' && id) return { path, entityType: 'deck_analysis', entityId: id };
	return filters ? { path, filters } : { path };
}

// The agent uses canonical page names (funding, ma, analytics, …); legacy
// logical names (deals, acquisitions) are kept as aliases.
const PAGE_ROUTES: Record<string, string> = {
	companies: 'companies', investors: 'investors', funding: 'funding', ma: 'ma',
	ecosystem: 'ecosystem', analytics: 'analytics', deals: 'funding', acquisitions: 'ma',
};
const PAGE_LABELS: Record<string, string> = {
	companies: 'Companies', investors: 'Investors', funding: 'Funding', ma: 'M&A',
	ecosystem: 'Ecosystem', analytics: 'Analytics', deals: 'Funding', acquisitions: 'M&A',
};
const ANALYTICS_TAB_LABELS: Record<string, string> = {
	overview: 'Overview', monthly: 'Monthly', funding: 'Funding', mna: 'M&A', investors: 'Investors',
};

function navActionLabel(page: string, filters?: Record<string, unknown>): string {
	if (page === 'analytics') {
		const tab = filters?.tab ? String(filters.tab) : '';
		return tab && ANALYTICS_TAB_LABELS[tab] ? `View ${ANALYTICS_TAB_LABELS[tab]} charts` : 'Open Analytics';
	}
	const name = PAGE_LABELS[page] ?? page;
	const hasFilters = filters && Object.keys(filters).some((k) => filters[k] != null && filters[k] !== '');
	return `View ${name}${hasFilters ? ' (filtered)' : ''}`;
}
function openEntityLabel(idOrSlug: string): string {
	return `Open ${idOrSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
}

function buildCatalogUrl(page: string, filters: Record<string, unknown> | undefined): string | null {
	const route = PAGE_ROUTES[page];
	if (!route) return null;
	const sp = new URLSearchParams();
	if (filters) {
		for (const [k, v] of Object.entries(filters)) {
			if (v === null || v === undefined) continue;
			const key = k.endsWith('_slugs') ? k.slice(0, -1) : k;
			const val = Array.isArray(v) ? v.join(',') : String(v);
			if (val) sp.set(key, val);
		}
	}
	const qs = sp.toString();
	return `/${route}${qs ? `?${qs}` : ''}`;
}
function entityUrl(entityType: string, idOrSlug: string): string | null {
	const seg: Record<string, string> = { company: 'companies', investor: 'investors', ecosystem_entity: 'ecosystem' };
	const base = seg[entityType];
	return base ? `/${base}/${encodeURIComponent(idOrSlug)}` : null;
}

function actionFromTool(tool: string, input: unknown): ChatAction | null {
	if (tool === 'navigate_and_filter') {
		const p = input as { page?: string; filters?: Record<string, unknown> };
		if (!p?.page) return null;
		const href = buildCatalogUrl(p.page, p.filters);
		return href ? { kind: 'navigate', label: navActionLabel(p.page, p.filters), href } : null;
	}
	if (tool === 'open_entity') {
		const p = input as { entity_type?: string; id_or_slug?: string };
		if (!p?.entity_type || !p?.id_or_slug) return null;
		const href = entityUrl(p.entity_type, p.id_or_slug);
		return href ? { kind: 'open_entity', label: openEntityLabel(p.id_or_slug), href } : null;
	}
	return null;
}

export function AiPanel({ open, onClose }: AiPanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { setTheme } = useTheme();

	// Client-side action tools that apply immediately: theme + accent toggles.
	const onClientAction = (tool: string, input: unknown) => {
		try {
			if (tool === 'set_theme') {
				const p = input as { theme?: string };
				if (p?.theme === 'light' || p?.theme === 'dark') setTheme(p.theme);
			} else if (tool === 'set_accent') {
				const p = input as { color?: string };
				const hue = p?.color ? ACCENT_HUES[p.color] : undefined;
				if (hue !== undefined && typeof document !== 'undefined') {
					document.documentElement.style.setProperty('--accent-hue', String(hue));
					try { localStorage.setItem('stx:accent-hue', String(hue)); } catch { /* ignore */ }
				}
			}
		} catch { /* UI actions are best-effort */ }
	};

	const {
		messages, input, setInput, streaming, stage, conversationId,
		showHistory, conversations, historyLoading, bodyRef,
		send, resetConversation, toggleHistory, loadConversation, exportConversation,
	} = useChat({
		greeting: GREETING,
		actionFromTool,
		pageContext: () => pageContextFromPath(pathname),
		onClientAction,
		insufficientCreditsMd: "_⚠️ You're out of AI credits._ Top up or upgrade on the [subscriptions page](/subscriptions) to keep chatting.",
	});

	if (!open) return null;

	return (
		<aside className="ai-panel-wrap">
			<div className="ai-panel" style={{ height: '100vh' }}>
				<style>{AI_MD_CSS}</style>
				<div className="ai-head">
					<div className="ai-mark">AI</div>
					<div style={{ flex: 1 }}>
						<h3>STX Intel</h3>
						<div className="ai-sub">
							<span className="live-dot" style={{ marginRight: 6 }} />
							{streaming ? `${stage || 'Thinking'}…` : 'Online'}
						</div>
					</div>
					<button className="topbar-btn" onClick={() => void toggleHistory()} style={{ padding: 8, color: showHistory ? 'var(--accent)' : undefined }} aria-label="Conversation history" title="Conversation history">
						<History size={14} />
					</button>
					{(conversationId || messages.length > 1) && (
						<button className="topbar-btn" onClick={resetConversation} style={{ padding: 8 }} aria-label="New conversation" title="New conversation">
							<Plus size={14} />
						</button>
					)}
					{conversationId && (
						<button className="topbar-btn" onClick={() => void exportConversation()} style={{ padding: 8 }} aria-label="Export">
							<Download size={14} />
						</button>
					)}
					<button className="topbar-btn" onClick={onClose} style={{ padding: 8 }} aria-label="Close">
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

				<div className="ai-body" ref={bodyRef}>
					{messages.map((m, i) => (
						<div key={i} className={`ai-msg ${m.role}`}>
							<MarkdownMessage text={m.content} sources={m.sources ?? []} />
							{m.role === 'assistant' && (m.actions?.length ?? 0) > 0 && (
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
									{m.actions!.map((a, ai) => (
										<button
											key={ai}
											onClick={() => { router.push(a.href); onClose(); }}
											title={a.href}
											style={{
												display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
												padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
												border: '1px solid var(--border-strong)', background: 'var(--bg-2)', color: 'var(--fg)',
											}}
										>
											<ArrowUpRight size={13} style={{ color: 'var(--accent)' }} /> {a.label}
										</button>
									))}
								</div>
							)}
							{m.role === 'assistant' && (m.sources?.length ?? 0) > 0 && (
								<div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
									<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
										Sources
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										{m.sources!.map((s) => (
											<a key={s.index} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--fg-2)', textDecoration: 'none' }}>
												<sup style={{ color: 'var(--accent)', fontWeight: 700 }}>[{s.index}]</sup>{' '}
												{s.title ?? s.url}
											</a>
										))}
									</div>
								</div>
							)}
						</div>
					))}
					{streaming && messages[messages.length - 1]?.content === '' && (
						<div className="ai-msg" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<ThinkingDots />
							<span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
								{stage || 'Thinking'}…
							</span>
						</div>
					)}
				</div>

				<div className="ai-input-row">
					<textarea
						className="ai-input"
						placeholder="Ask about deals, companies, trends…"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
						rows={1}
						disabled={streaming}
					/>
					<button className="ai-send" onClick={() => void send()} disabled={streaming} aria-label="Send">
						<Send size={16} />
					</button>
				</div>
			</div>
		</aside>
	);
}
