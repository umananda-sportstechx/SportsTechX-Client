'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Send, X, Download, Plus, History } from 'lucide-react';
import useSWR from 'swr';
import { getAuthHeaders } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * AI side panel — wraps the streaming chat agent with the Wave 3 RAG polish:
 *   - inline citation chips: [N] markers in the streamed text render as
 *     superscript pills linking to the source URL captured from web_search
 *     tool results
 *   - source-type badges per assistant message: 🌐 Web / 📊 Database / 🔀
 *     Hybrid based on which tools fired during the turn
 *   - dynamic starter prompts pulled from GET /api/chat/suggestions (tier-
 *     aware on the server side)
 *   - markdown export via GET /api/chat/conversations/:id/export
 */

interface CitationSource {
	index: number;
	/** Absolute URL or in-app path. Absent for knowledge hits with no linkable location. */
	url?: string;
	title?: string;
}

interface ToolEntry {
	/** Anthropic-issued tool_use id. Both `tool_call` and `tool_result` SSE
	 *  events carry this; we match by id so two concurrent calls of the same
	 *  tool name don't collide. */
	id: string;
	tool: string;
	ok: boolean;
	preview: string;
}

interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	tools?: ToolEntry[];
	sources?: CitationSource[];
	plan?: { strategy: string; steps: string[] };
}

interface ConversationListItem {
	id: string;
	title: string | null;
	last_message_at: string;
}

interface AiPanelProps {
	open: boolean;
	onClose: () => void;
}

const FALLBACK_PROMPTS = [
	'Show me top funded startups in 2026',
	'Compare wearables vs analytics funding',
	'Who invested in Teamworks?',
	'Latest M&A in fan engagement',
	'Map of European deals 2026',
];

const GREETING: ChatMessage = {
	role: 'assistant',
	content:
		'I can query the SportsTechX database — companies, deals, investors, programs — and pull live web results. Try a quick prompt below or ask anything.',
};

/** Derive the page context the chat sends so the agent's page_insights tool can
 *  describe the current page / fetch the open entity (owner-scoped server-side). */
function pageContextFromPath(path: string | null): { path: string; entityType?: string; entityId?: string } | undefined {
	if (!path) return undefined;
	const segs = path.split('?')[0]!.split('/').filter(Boolean);
	const top = segs[0];
	const id = segs[1];
	if (top === 'companies' && id) return { path, entityType: 'company', entityId: id };
	if (top === 'investors' && id) return { path, entityType: 'investor', entityId: id };
	if (top === 'ecosystem' && id) return { path, entityType: 'ecosystem_entity', entityId: id };
	if (top === 'pitch-analyzer' && id) return { path, entityType: 'deck_analysis', entityId: id };
	return { path };
}

export function AiPanel({ open, onClose }: AiPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
	const [input, setInput] = useState('');
	const [streaming, setStreaming] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [iteration, setIteration] = useState(0);
	const [showHistory, setShowHistory] = useState(false);
	const [conversations, setConversations] = useState<ConversationListItem[] | null>(null);
	const [historyLoading, setHistoryLoading] = useState(false);
	const bodyRef = useRef<HTMLDivElement>(null);
	// Track the in-flight fetch so we can abort it on close/unmount/new-convo.
	// Without this, closing the panel mid-stream still drains the Anthropic
	// response on the backend — charging the user for tokens they never see.
	const abortRef = useRef<AbortController | null>(null);
	// Running citation counter for the current turn. Each tool_result event
	// that includes web-search results gets indices [n .. n+results.length-1],
	// so the second web_search of a turn doesn't overwrite the first's [1].
	const nextSourceIndexRef = useRef(1);
	const router = useRouter();
	const pathname = usePathname();

	const { data: suggestions } = useSWR<{ prompts: string[] }>(
		open ? qk.chat.suggestions() : null,
		{ dedupingInterval: 60 * 60_000 },
	);
	const prompts = suggestions?.prompts ?? FALLBACK_PROMPTS;

	useEffect(() => {
		if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
	}, [messages, streaming]);

	// Abort any in-flight stream on unmount (covers panel close, route
	// change, hot reload). The backend's res.on('close') handler cleans up
	// server-side once the socket closes.
	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const resetConversation = () => {
		abortRef.current?.abort();
		setStreaming(false);
		setConversationId(null);
		setMessages([GREETING]);
		setIteration(0);
		setShowHistory(false);
		nextSourceIndexRef.current = 1;
	};

	// Load the list of the user's past conversations (lazily, when opened).
	const toggleHistory = async () => {
		const next = !showHistory;
		setShowHistory(next);
		if (!next) return;
		setHistoryLoading(true);
		try {
			const auth = await getAuthHeaders();
			const res = await fetch('/api/chat/conversations', { headers: { ...auth }, credentials: 'include' });
			if (res.ok) setConversations((await res.json()) as ConversationListItem[]);
		} catch {
			/* best-effort */
		} finally {
			setHistoryLoading(false);
		}
	};

	// Open a past conversation: replace the thread with its persisted messages.
	const loadConversation = async (id: string) => {
		abortRef.current?.abort();
		setStreaming(false);
		setShowHistory(false);
		try {
			const auth = await getAuthHeaders();
			const res = await fetch(`/api/chat/conversations/${id}`, { headers: { ...auth }, credentials: 'include' });
			if (!res.ok) return;
			const data = (await res.json()) as {
				messages: Array<{ role: 'user' | 'assistant'; content: string; tool_calls?: Array<{ tool: string; ok: boolean; preview: string }> | null }>;
			};
			const msgs: ChatMessage[] = data.messages.map((m, idx) => ({
				role: m.role,
				content: m.content,
				tools:
					m.role === 'assistant' && m.tool_calls
						? m.tool_calls.map((t, ti) => ({ id: `${idx}-${ti}`, tool: t.tool, ok: t.ok, preview: t.preview }))
						: undefined,
			}));
			setMessages(msgs.length > 0 ? msgs : [GREETING]);
			setConversationId(id);
			setIteration(0);
			nextSourceIndexRef.current = 1;
		} catch {
			/* best-effort */
		}
	};

	const send = async (text?: string) => {
		const message = (text ?? input).trim();
		if (!message || streaming) return;
		setInput('');
		setMessages((prev) => [
			...prev,
			{ role: 'user', content: message },
			{ role: 'assistant', content: '', tools: [], sources: [] },
		]);
		setStreaming(true);
		setIteration(0);
		// Reset per-turn citation counter so [1] always refers to the first
		// source surfaced in THIS turn, never one from a prior turn.
		nextSourceIndexRef.current = 1;

		// Fresh AbortController per turn. If the previous turn left one
		// dangling (shouldn't happen, but defense-in-depth), abort it.
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;

		try {
			const auth = await getAuthHeaders();
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...auth },
				body: JSON.stringify({ conversation_id: conversationId, message, page: pageContextFromPath(pathname) }),
				credentials: 'include',
				signal: ac.signal,
			});
			if (!res.ok || !res.body) {
				const errText = await res.text().catch(() => 'request failed');
				patchLastAssistant(`⚠️ ${errText}`);
				return;
			}
			await consumeSse(res.body, {
				onConversation: (id) => setConversationId(id),
				onThinking: (n) => setIteration(n),
				onPlan: (strategy, steps) => setPlanOnLastAssistant(strategy, steps),
				onText: (delta) => appendToLastAssistant(delta),
				onToolCall: (id, tool, input) => {
					addToolToLastAssistant({ id, tool, ok: false, preview: '…' });
					maybeHandleAction(tool, input);
				},
				onToolResult: (id, ok, preview, parsed) => {
					updateLastTool(id, ok, preview);
					// Allocate globally-unique citation indices for THIS turn so
					// the second web_search's results don't collide with the
					// first's [1], [2]…
					const webSources = extractCitations(parsed, nextSourceIndexRef.current) ?? [];
					const knowledgeSources = extractKnowledgeCitations(parsed, nextSourceIndexRef.current + webSources.length) ?? [];
					const sources = [...webSources, ...knowledgeSources];
					if (sources.length > 0) {
						nextSourceIndexRef.current += sources.length;
						appendSourcesToLastAssistant(sources);
					}
				},
				onError: (msg) => patchLastAssistant(`\n\n_⚠️ ${msg}_`),
			}, ac.signal);
		} catch (err) {
			// AbortError on user-initiated cancel is expected; swallow.
			if ((err as Error).name === 'AbortError') return;
			patchLastAssistant(`\n\n_⚠️ ${(err as Error).message}_`);
		} finally {
			setStreaming(false);
			abortRef.current = null;
			setIteration(0);
		}
	};

	const appendToLastAssistant = (delta: string) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') {
				next[next.length - 1] = { ...last, content: last.content + delta };
			}
			return next;
		});
	};

	const patchLastAssistant = (text: string) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') {
				next[next.length - 1] = { ...last, content: last.content + text };
			}
			return next;
		});
	};

	const addToolToLastAssistant = (entry: ToolEntry) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') {
				next[next.length - 1] = { ...last, tools: [...(last.tools ?? []), entry] };
			}
			return next;
		});
	};

	const updateLastTool = (id: string, ok: boolean, preview: string) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant' && last.tools) {
				const idx = last.tools.findIndex((t) => t.id === id);
				if (idx === -1) return prev;
				const tools = [...last.tools];
				tools[idx] = { ...tools[idx]!, ok, preview };
				next[next.length - 1] = { ...last, tools };
			}
			return next;
		});
	};

	const appendSourcesToLastAssistant = (newSources: CitationSource[]) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') {
				next[next.length - 1] = {
					...last,
					sources: mergeSources(last.sources ?? [], newSources),
				};
			}
			return next;
		});
	};

	const setPlanOnLastAssistant = (strategy: string, steps: string[]) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') next[next.length - 1] = { ...last, plan: { strategy, steps } };
			return next;
		});
	};

	// Client-side action tools: the agent dispatches a navigation/filter intent
	// and the panel drives the Next router. The main app view updates beneath the
	// overlay panel. Best-effort — a bad intent never breaks the chat.
	const maybeHandleAction = (tool: string, input: unknown) => {
		try {
			if (tool === 'navigate_and_filter') {
				const p = input as { page?: string; filters?: Record<string, unknown> };
				if (p?.page) router.push(buildCatalogUrl(p.page, p.filters));
			} else if (tool === 'open_entity') {
				const p = input as { entity_type?: string; id_or_slug?: string };
				if (p?.entity_type && p?.id_or_slug) {
					const url = entityUrl(p.entity_type, p.id_or_slug);
					if (url) router.push(url);
				}
			}
		} catch {
			/* navigation is best-effort */
		}
	};

	const exportConversation = async () => {
		if (!conversationId) return;
		const auth = await getAuthHeaders();
		const res = await fetch(`/api/chat/conversations/${conversationId}/export`, {
			headers: { ...auth },
			credentials: 'include',
		});
		if (!res.ok) return;
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `conversation-${conversationId.slice(0, 8)}.md`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

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
							{streaming
								? iteration > 1
									? `Thinking… (step ${iteration})`
									: 'Thinking…'
								: 'Online'}
						</div>
					</div>
					<button
						className="topbar-btn"
						onClick={() => void toggleHistory()}
						style={{ padding: 8, color: showHistory ? 'var(--accent)' : undefined }}
						aria-label="Conversation history"
						title="Conversation history"
					>
						<History size={14} />
					</button>
					{(conversationId || messages.length > 1) && (
						<button
							className="topbar-btn"
							onClick={resetConversation}
							style={{ padding: 8 }}
							aria-label="New conversation"
							title="New conversation"
						>
							<Plus size={14} />
						</button>
					)}
					{conversationId && (
						<button className="topbar-btn" onClick={exportConversation} style={{ padding: 8 }} aria-label="Export">
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
								<button
									key={c.id}
									className="ai-history-item"
									onClick={() => void loadConversation(c.id)}
									title={c.title ?? 'Untitled conversation'}
								>
									<span className="ai-history-title">{c.title || 'Untitled conversation'}</span>
									<span className="ai-history-date">{new Date(c.last_message_at).toLocaleDateString()}</span>
								</button>
							))
						)}
					</div>
				)}

				<div className="ai-body" ref={bodyRef}>
					{messages.map((m, i) => {
						const isLast = i === messages.length - 1;
						const live = streaming && isLast; // the turn currently being generated
						const hasPlan = !!m.plan && (m.plan.strategy !== '' || m.plan.steps.length > 0);
						const hasTools = !!m.tools && m.tools.length > 0;
						return (
						<div key={i} className={`ai-msg ${m.role}`}>
							{/* Plan + tools live in ONE collapsible: open while the turn streams
							    (so the user watches progress), collapsed once done so only the
							    final answer shows until they expand it. */}
							{m.role === 'assistant' && (hasPlan || hasTools) && (
								<details open={live || undefined} style={{ marginBottom: 6 }}>
									<summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
										Plan &amp; activity
									</summary>
									<div style={{ marginTop: 4 }}>
										{hasPlan && (
											<div style={{ fontSize: 11, color: 'var(--fg-2)' }}>
												{m.plan!.strategy && <div style={{ marginBottom: 4, fontStyle: 'italic' }}>{m.plan!.strategy}</div>}
												{m.plan!.steps.map((s, si) => (
													<div key={si} style={{ display: 'flex', gap: 6 }}>
														<span style={{ color: 'var(--accent)' }}>{si + 1}.</span>
														<span>{s}</span>
													</div>
												))}
											</div>
										)}
										{hasTools && (
											<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
												<SourceBadge tools={m.tools!} />
												{m.tools!.map((t, ti) => (
													<span
														key={ti}
														className="tag"
														style={{ background: t.ok ? 'var(--bg-2)' : 'transparent', borderColor: 'var(--border)' }}
														title={t.preview}
													>
														{toolIcon(t.tool)}
														{t.tool}
													</span>
												))}
											</div>
										)}
									</div>
								</details>
							)}
							<MarkdownMessage text={m.content} sources={m.sources ?? []} router={router} />
							{m.role === 'assistant' && (m.sources?.length ?? 0) > 0 && (
								<div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
									<div
										style={{
											fontFamily: 'var(--font-mono)',
											fontSize: 10,
											color: 'var(--fg-muted)',
											textTransform: 'uppercase',
											letterSpacing: '0.08em',
											marginBottom: 4,
										}}
									>
										Sources
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										{m.sources!.map((s) => (
											<a
												key={s.index}
												href={s.url}
												target="_blank"
												rel="noopener noreferrer"
												style={{ fontSize: 11, color: 'var(--fg-2)', textDecoration: 'none' }}
											>
												<sup style={{ color: 'var(--accent)', fontWeight: 700 }}>[{s.index}]</sup>{' '}
												{s.title ?? s.url}
											</a>
										))}
									</div>
								</div>
							)}
						</div>
						);
					})}
					{streaming && messages[messages.length - 1]?.content === '' && (
						<div className="ai-msg" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
							<ThinkingDots />
						</div>
					)}
				</div>

				{messages.length <= 1 && !streaming && (
					<div className="ai-quick">
						{prompts.map((q) => (
							<button key={q} className="qchip" onClick={() => send(q)} disabled={streaming}>
								{q}
							</button>
						))}
					</div>
				)}

				<div className="ai-input-row">
					<textarea
						className="ai-input"
						placeholder="Ask about deals, companies, trends…"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
						rows={1}
						disabled={streaming}
					/>
					<button className="ai-send" onClick={() => send()} disabled={streaming} aria-label="Send">
						<Send size={16} />
					</button>
				</div>
			</div>
		</aside>
	);
}

/**
 * Pill that summarises which classes of tools the agent used: web search,
 * database, or both. Renders before the per-tool chips for quick orientation.
 */
function SourceBadge({ tools }: { tools: NonNullable<ChatMessage['tools']> }) {
	const hasWeb = tools.some((t) => t.tool === 'web_search');
	const hasDb = tools.some(
		(t) => t.tool.startsWith('find_') || t.tool === 'get_entity_details' || t.tool === 'search_by_name',
	);
	const hasKnowledge = tools.some((t) => t.tool === 'search_knowledge');
	const count = [hasWeb, hasDb, hasKnowledge].filter(Boolean).length;
	if (count === 0) return null;
	if (count > 1) return <span className="tag pos">🔀 Hybrid</span>;
	if (hasWeb) return <span className="tag">🌐 Web</span>;
	if (hasDb) return <span className="tag pos">📊 Database</span>;
	return <span className="tag pos">📚 Knowledge</span>;
}

function mergeSources(prev: CitationSource[], next: CitationSource[]): CitationSource[] {
	if (next.length === 0) return prev;
	const byIndex = new Map<number, CitationSource>();
	for (const s of prev) byIndex.set(s.index, s);
	for (const s of next) byIndex.set(s.index, s);
	return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/* ─── Client-side action tools ───────────────────────────────────────────── */

/**
 * Map an agent `navigate_and_filter` intent to a catalog URL. The agent emits
 * the find_* plural slug keys (sector_slugs); catalog pages read singular,
 * comma-separated params (sector_slug), so we de-pluralize and join arrays.
 */
function buildCatalogUrl(page: string, filters: Record<string, unknown> | undefined): string {
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
	return `/${page}${qs ? `?${qs}` : ''}`;
}

/** Map an `open_entity` intent to a detail-page URL. */
function entityUrl(entityType: string, idOrSlug: string): string | null {
	const seg: Record<string, string> = { company: 'companies', investor: 'investors', ecosystem_entity: 'ecosystem' };
	const base = seg[entityType];
	return base ? `/${base}/${encodeURIComponent(idOrSlug)}` : null;
}

/** Icon for a tool chip. */
function toolIcon(tool: string): string {
	if (tool === 'web_search') return '🌐';
	if (tool === 'search_knowledge') return '📚';
	if (tool === 'navigate_and_filter') return '🧭';
	if (tool === 'open_entity') return '🔗';
	if (tool.startsWith('find_') || tool === 'get_entity_details' || tool === 'search_by_name') return '📊';
	return '🔧';
}

/* ─── SSE consumption ───────────────────────────────────────────────────── */

interface SseHandlers {
	onConversation: (id: string) => void;
	onThinking: (iteration: number) => void;
	onPlan: (strategy: string, steps: string[]) => void;
	onText: (delta: string) => void;
	/** `id` is the Anthropic tool_use id — pass it back on tool_result so the
	 *  caller can update the matching entry deterministically. */
	onToolCall: (id: string, tool: string, input: unknown) => void;
	onToolResult: (id: string, ok: boolean, preview: string, parsedPayload: unknown) => void;
	onError: (msg: string) => void;
}

async function consumeSse(
	stream: ReadableStream<Uint8Array>,
	handlers: SseHandlers,
	signal: AbortSignal,
): Promise<void> {
	const reader = stream.getReader();
	// Abort → release the reader so the awaited read() unblocks. The fetch
	// itself was already cancelled by the AbortController signal; this just
	// stops the consumer loop too.
	signal.addEventListener('abort', () => { void reader.cancel().catch(() => { /* swallowed */ }); });

	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		if (signal.aborted) return;
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		let sep: number;
		while ((sep = buffer.indexOf('\n\n')) !== -1) {
			const rawEvent = buffer.slice(0, sep);
			buffer = buffer.slice(sep + 2);
			let eventName = 'message';
			let dataLine = '';
			for (const line of rawEvent.split('\n')) {
				if (line.startsWith('event:')) eventName = line.slice(6).trim();
				else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
			}
			if (!dataLine) continue;
			try {
				const parsed = JSON.parse(dataLine);
				switch (eventName) {
					case 'conversation':
						if (parsed.id) handlers.onConversation(parsed.id);
						break;
					case 'thinking':
						if (typeof parsed.iteration === 'number') handlers.onThinking(parsed.iteration);
						break;
					case 'plan':
						if (typeof parsed.strategy === 'string' && Array.isArray(parsed.steps)) {
							handlers.onPlan(parsed.strategy, parsed.steps.filter((s: unknown): s is string => typeof s === 'string'));
						}
						break;
					case 'content_delta':
						if (typeof parsed.text === 'string') handlers.onText(parsed.text);
						break;
					case 'tool_call':
						if (parsed.tool && typeof parsed.id === 'string') {
							handlers.onToolCall(parsed.id, parsed.tool, parsed.input);
						}
						break;
					case 'tool_result': {
						if (typeof parsed.id !== 'string') break;
						handlers.onToolResult(parsed.id, !!parsed.ok, parsed.preview ?? '', parsed);
						break;
					}
					case 'error':
						handlers.onError(parsed.message ?? 'unknown error');
						break;
					case 'done':
						break;
				}
			} catch {
				/* skip malformed events */
			}
		}
	}
}

/**
 * Pull URLs out of tool_result payloads. The server's web_search tool returns
 * an array of `{title, url, snippet}` results in `parsed.results`. Each call
 * site passes the next free index so citation numbers are unique across an
 * entire turn — otherwise two web_search calls in one turn would both produce
 * [1], [2]… and their sources would collide via `mergeSources`'s by-index
 * dedup.
 */
/** True only for links the browser can actually open: absolute URLs or in-app paths. */
function linkable(uri: string | undefined | null): string | undefined {
	if (!uri) return undefined;
	return /^https?:\/\//i.test(uri) || uri.startsWith('/') ? uri : undefined;
}

/**
 * Pull citations out of a `search_knowledge` tool result. Unlike web_search
 * (`results` with `url`), knowledge hits live under `text` / `images` and carry
 * `uri` (often an internal slug, not a linkable URL) — so these render as
 * numbered sources, linked only when the uri is actually openable.
 */
function extractKnowledgeCitations(parsed: unknown, startIndex: number): CitationSource[] | undefined {
	if (!parsed || typeof parsed !== 'object') return undefined;
	const obj = parsed as {
		text?: Array<{ title?: string | null; uri?: string | null }>;
		images?: Array<{ title?: string | null; uri?: string | null }>;
	};
	const hits = [
		...(Array.isArray(obj.text) ? obj.text : []),
		...(Array.isArray(obj.images) ? obj.images : []),
	];
	if (hits.length === 0) return undefined;
	const out: CitationSource[] = [];
	let i = startIndex;
	for (const h of hits) {
		const title = h.title ?? undefined;
		if (!title && !h.uri) continue;
		out.push({ index: i, title: title ?? 'Source', url: linkable(h.uri) });
		i += 1;
	}
	return out.length > 0 ? out : undefined;
}

function extractCitations(parsed: unknown, startIndex: number): CitationSource[] | undefined {
	if (!parsed || typeof parsed !== 'object') return undefined;
	const obj = parsed as { results?: Array<{ url?: string; title?: string }> };
	if (!Array.isArray(obj.results)) return undefined;
	const out: CitationSource[] = [];
	let i = startIndex;
	for (const r of obj.results) {
		if (r.url) {
			out.push({ index: i, url: r.url, title: r.title });
			i += 1;
		}
	}
	return out.length > 0 ? out : undefined;
}

/* ─── Markdown rendering ─────────────────────────────────────────────────── */

type AppRouter = ReturnType<typeof useRouter>;

type Block =
	| { type: 'heading'; level: number; text: string }
	| { type: 'hr' }
	| { type: 'quote'; lines: string[] }
	| { type: 'ul'; items: string[] }
	| { type: 'ol'; items: Array<{ n: number; text: string }> }
	| { type: 'table'; header: string[]; rows: string[][] }
	| { type: 'code'; text: string }
	| { type: 'p'; text: string };

/** A GFM table separator row, e.g. `|---|:--:|`. */
function isTableSep(s: string): boolean {
	const t = s.trim();
	return t.includes('|') && t.includes('-') && /^\|?[\s:|-]+\|?$/.test(t);
}

function splitRow(s: string): string[] {
	let t = s.trim();
	if (t.startsWith('|')) t = t.slice(1);
	if (t.endsWith('|')) t = t.slice(0, -1);
	return t.split('|').map((c) => c.trim());
}

/** Parse a markdown string into block-level elements (headings, tables, lists, …). */
function parseBlocks(src: string): Block[] {
	const lines = src.replace(/\r\n/g, '\n').split('\n');
	const blocks: Block[] = [];
	const isSpecial = (t: string): boolean =>
		/^#{1,6}\s+/.test(t) || t.startsWith('>') || t.startsWith('```') || /^[-*+•▸]\s+/.test(t) || /^\d+[.)]\s+/.test(t);
	let i = 0;
	while (i < lines.length) {
		const line = lines[i] ?? '';
		const t = line.trim();
		if (!t) { i++; continue; }

		// fenced code
		if (t.startsWith('```')) {
			const buf: string[] = [];
			i++;
			while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) { buf.push(lines[i] ?? ''); i++; }
			i++;
			blocks.push({ type: 'code', text: buf.join('\n') });
			continue;
		}
		// horizontal rule (--- / *** / ___), no pipes
		if (/^([-*_])\1{2,}$/.test(t.replace(/\s+/g, ''))) { blocks.push({ type: 'hr' }); i++; continue; }
		// heading
		const h = /^(#{1,6})\s+(.*)$/.exec(t);
		if (h) { blocks.push({ type: 'heading', level: h[1]!.length, text: h[2]! }); i++; continue; }
		// table: header row followed by a separator row
		if (t.includes('|') && isTableSep(lines[i + 1] ?? '')) {
			const header = splitRow(t);
			i += 2;
			const rows: string[][] = [];
			while (i < lines.length && (lines[i] ?? '').trim().includes('|')) {
				rows.push(splitRow((lines[i] ?? '').trim()));
				i++;
			}
			blocks.push({ type: 'table', header, rows });
			continue;
		}
		// blockquote
		if (t.startsWith('>')) {
			const buf: string[] = [];
			while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
				buf.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
				i++;
			}
			blocks.push({ type: 'quote', lines: buf });
			continue;
		}
		// unordered list
		if (/^[-*+•▸]\s+/.test(t)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*+•▸]\s+/.test((lines[i] ?? '').trim())) {
				items.push((lines[i] ?? '').trim().replace(/^[-*+•▸]\s+/, ''));
				i++;
			}
			blocks.push({ type: 'ul', items });
			continue;
		}
		// ordered list — keep the model's own numbers (items are often blank-line
		// separated, so each lands in its own block; using the parsed number keeps
		// 1, 2, 3 instead of restarting at 1 every block).
		if (/^\d+[.)]\s+/.test(t)) {
			const items: Array<{ n: number; text: string }> = [];
			while (i < lines.length) {
				const om = /^(\d+)[.)]\s+(.*)$/.exec((lines[i] ?? '').trim());
				if (!om) break;
				items.push({ n: Number(om[1]), text: om[2]! });
				i++;
			}
			blocks.push({ type: 'ol', items });
			continue;
		}
		// paragraph (gather consecutive plain lines)
		const buf: string[] = [];
		while (i < lines.length) {
			const pt = (lines[i] ?? '').trim();
			if (!pt || isSpecial(pt) || (pt.includes('|') && isTableSep(lines[i + 1] ?? ''))) break;
			buf.push(pt);
			i++;
		}
		if (buf.length) blocks.push({ type: 'p', text: buf.join('\n') });
	}
	return blocks;
}

const HEADING_SIZE: Record<number, number> = { 1: 18, 2: 16, 3: 14, 4: 13, 5: 12, 6: 12 };

function MarkdownMessage({ text, sources, router }: { text: string; sources: CitationSource[]; router: AppRouter }) {
	if (!text) return null;
	const blocks = parseBlocks(text);
	return <div className="ai-md">{blocks.map((b, i) => renderBlock(b, i, sources, router))}</div>;
}

function renderBlock(b: Block, i: number, sources: CitationSource[], router: AppRouter): ReactNode {
	const key = `b${i}`;
	switch (b.type) {
		case 'heading':
			return (
				<div key={key} style={{ fontWeight: 700, fontSize: HEADING_SIZE[b.level] ?? 13, margin: '10px 0 4px', lineHeight: 1.3 }}>
					{renderInline(b.text, sources, router, key)}
				</div>
			);
		case 'hr':
			return <hr key={key} style={{ border: 0, borderTop: '1px solid var(--border)', margin: '10px 0' }} />;
		case 'quote':
			return (
				<blockquote key={key} className="ai-quote">
					{b.lines.map((l, li) => <div key={li}>{renderInline(l, sources, router, `${key}-${li}`)}</div>)}
				</blockquote>
			);
		case 'ul':
			return (
				<div key={key} style={{ margin: '4px 0' }}>
					{b.items.map((it, ii) => (
						<div key={ii} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
							<span style={{ color: 'var(--accent)' }}>▸</span>
							<span>{renderInline(it, sources, router, `${key}-${ii}`)}</span>
						</div>
					))}
				</div>
			);
		case 'ol':
			return (
				<div key={key} style={{ margin: '4px 0' }}>
					{b.items.map((it, ii) => (
						<div key={ii} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
							<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{it.n}.</span>
							<span>{renderInline(it.text, sources, router, `${key}-${ii}`)}</span>
						</div>
					))}
				</div>
			);
		case 'code':
			return <pre key={key} className="ai-pre"><code>{b.text}</code></pre>;
		case 'table':
			return (
				<div key={key} style={{ overflowX: 'auto', margin: '8px 0' }}>
					<table className="ai-table">
						<thead>
							<tr>{b.header.map((c, ci) => <th key={ci}>{renderInline(c, sources, router, `${key}-h${ci}`)}</th>)}</tr>
						</thead>
						<tbody>
							{b.rows.map((r, ri) => (
								<tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, sources, router, `${key}-${ri}-${ci}`)}</td>)}</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case 'p':
		default:
			return (
				<div key={key} style={{ margin: '4px 0', lineHeight: 1.5 }}>
					{b.text.split('\n').map((l, li) => <div key={li}>{renderInline(l, sources, router, `${key}-${li}`)}</div>)}
				</div>
			);
	}
}

/** Inline markdown: links (in-app → router, external → new tab), **bold**, *italic*, `code`, and [N] citations. */
function renderInline(text: string, sources: CitationSource[], router: AppRouter, keyBase: string): ReactNode[] {
	const sourceMap = new Map(sources.map((s) => [s.index, s]));
	const nodes: ReactNode[] = [];
	const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\[(\d+)\]|\*([^*]+)\*|_([^_]+)_/g;
	let last = 0;
	let k = 0;
	let m: RegExpExecArray | null;
	while ((m = TOKEN.exec(text)) !== null) {
		if (m.index > last) nodes.push(text.slice(last, m.index));
		const kk = `${keyBase}-i${k}`;
		if (m[1] != null && m[2] != null) {
			nodes.push(<MdLink key={kk} href={m[2]} label={m[1]} router={router} />);
		} else if (m[3] != null) {
			nodes.push(<strong key={kk}>{m[3]}</strong>);
		} else if (m[4] != null) {
			nodes.push(<code key={kk} className="ai-code">{m[4]}</code>);
		} else if (m[5] != null) {
			const idx = Number(m[5]);
			const src = sourceMap.get(idx);
			nodes.push(
				src && src.url ? (
					<a key={kk} href={src.url} target="_blank" rel="noopener noreferrer" title={src.title ?? src.url} style={{ textDecoration: 'none' }}>
						<sup style={{ color: 'var(--accent)', fontWeight: 700, padding: '0 2px' }}>[{idx}]</sup>
					</a>
				) : (
					<sup key={kk} style={{ color: 'var(--fg-muted)' }}>[{idx}]</sup>
				),
			);
		} else if (m[6] != null || m[7] != null) {
			nodes.push(<em key={kk}>{m[6] ?? m[7]}</em>);
		}
		last = m.index + m[0].length;
		k++;
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}

/** A markdown link: in-app paths navigate via the router (panel stays open); external URLs open a new tab.
 *  Company/investor links are VALIDATED against the API — the model sometimes
 *  emits slugs for entities that aren't in our DB (especially investors). If the
 *  detail page wouldn't resolve, we render plain text (no link styling) rather
 *  than a dead, navigable link. */
function MdLink({ href, label, router }: { href: string; label: string; router: AppRouter }) {
	const path = href.split(/[?#]/)[0] ?? href;
	const isCompany = path.startsWith('/companies/');
	const isInvestor = path.startsWith('/investors/');
	const slug = (isCompany || isInvestor) ? path.split('/')[2] : undefined;
	const key = slug ? (isCompany ? qk.companies.detail(slug) : qk.investors.detail(slug)) : null;
	// Only fetches when key != null; cached/deduped. shouldRetryOnError off so a
	// 404 settles immediately into "doesn't exist".
	const { data, error } = useSWR(key, { shouldRetryOnError: false, revalidateOnFocus: false, dedupingInterval: 5 * 60_000 });

	if (isCompany || isInvestor) {
		// Render as a link only once existence is confirmed. While loading or on
		// 404, fall back to plain text — no coloured/underlined link.
		if (data && !error) {
			return <a className="ai-link" href={href} onClick={(e) => { e.preventDefault(); router.push(href); }}>{label}</a>;
		}
		return <span>{label}</span>;
	}

	if (href.startsWith('/')) {
		return (
			<a
				className="ai-link"
				href={href}
				onClick={(e) => { e.preventDefault(); router.push(href); }}
			>
				{label}
			</a>
		);
	}
	const safe = /^https?:\/\//i.test(href) ? href : undefined;
	if (!safe) return <span>{label}</span>;
	return <a className="ai-link" href={safe} target="_blank" rel="noopener noreferrer">{label}</a>;
}

const AI_MD_CSS = `
.ai-md { line-height: 1.5; }
.ai-md .ai-table { border-collapse: collapse; width: 100%; font-size: 12px; }
.ai-md .ai-table th, .ai-md .ai-table td { border: 1px solid var(--border); padding: 4px 8px; text-align: left; vertical-align: top; white-space: nowrap; }
.ai-md .ai-table th { background: var(--bg-2); font-weight: 600; }
.ai-md .ai-link { color: var(--accent); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); cursor: pointer; }
.ai-md .ai-link:hover { border-bottom-color: var(--accent); }
.ai-md .ai-code { background: var(--bg-2); padding: 0 4px; border-radius: 3px; font-family: var(--font-mono); font-size: 11px; }
.ai-md .ai-pre { background: var(--bg-2); padding: 8px; border-radius: 6px; overflow-x: auto; font-size: 11px; margin: 6px 0; }
.ai-md .ai-pre code { font-family: var(--font-mono); }
.ai-md .ai-quote { border-left: 2px solid var(--accent); padding: 2px 0 2px 10px; margin: 6px 0; color: var(--fg-2); font-style: italic; }
.ai-history { border-bottom: 1px solid var(--border); max-height: 40%; overflow-y: auto; padding: 6px; }
.ai-history-head { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-muted); padding: 4px 6px; }
.ai-history-empty { font-size: 12px; color: var(--fg-muted); padding: 8px 6px; }
.ai-history-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; text-align: left; background: transparent; border: 0; padding: 7px 8px; border-radius: 6px; cursor: pointer; color: var(--fg); }
.ai-history-item:hover { background: var(--bg-2); }
.ai-history-title { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ai-history-date { font-size: 10px; color: var(--fg-muted); flex-shrink: 0; }
`;

function ThinkingDots() {
	return (
		<>
			<style>{`@keyframes stxThinkPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
			{[0, 0.2, 0.4].map((delay) => (
				<span
					key={delay}
					style={{
						width: 6,
						height: 6,
						background: 'var(--accent)',
						display: 'inline-block',
						animation: `stxThinkPulse 1.2s ease-in-out infinite ${delay}s`,
					}}
				/>
			))}
		</>
	);
}
