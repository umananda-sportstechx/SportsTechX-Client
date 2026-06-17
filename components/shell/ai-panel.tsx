'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, Download, Plus } from 'lucide-react';
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

export function AiPanel({ open, onClose }: AiPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
	const [input, setInput] = useState('');
	const [streaming, setStreaming] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [iteration, setIteration] = useState(0);
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
		nextSourceIndexRef.current = 1;
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
				body: JSON.stringify({ conversation_id: conversationId, message }),
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

				<div className="ai-body" ref={bodyRef}>
					{messages.map((m, i) => (
						<div key={i} className={`ai-msg ${m.role}`}>
							{m.role === 'assistant' && m.plan && (m.plan.strategy !== '' || m.plan.steps.length > 0) && (
								<details style={{ marginBottom: 6 }}>
									<summary style={{ cursor: 'pointer', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
										Plan
									</summary>
									<div style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 4 }}>
										{m.plan.strategy && <div style={{ marginBottom: 4, fontStyle: 'italic' }}>{m.plan.strategy}</div>}
										{m.plan.steps.map((s, si) => (
											<div key={si} style={{ display: 'flex', gap: 6 }}>
												<span style={{ color: 'var(--accent)' }}>{si + 1}.</span>
												<span>{s}</span>
											</div>
										))}
									</div>
								</details>
							)}
							{m.role === 'assistant' && m.tools && m.tools.length > 0 && (
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
									<SourceBadge tools={m.tools} />
									{m.tools.map((t, ti) => (
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
							<MarkdownLite text={m.content} sources={m.sources ?? []} />
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
					))}
					{streaming && messages[messages.length - 1]?.content === '' && (
						<div className="ai-msg" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
							<ThinkingDots />
						</div>
					)}
				</div>

				<div className="ai-quick">
					{prompts.map((q) => (
						<button key={q} className="qchip" onClick={() => send(q)} disabled={streaming}>
							{q}
						</button>
					))}
				</div>

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

/** Minimal markdown: bold, bullets, and [N] superscript citation chips. */
function MarkdownLite({ text, sources }: { text: string; sources: CitationSource[] }) {
	if (!text) return null;
	const lines = text.split('\n');
	return (
		<div>
			{lines.map((line, i) => {
				if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
				if (line.startsWith('• ') || line.startsWith('- ')) {
					return (
						<div key={i} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
							<span style={{ color: 'var(--accent)' }}>▸</span>
							<RenderInline text={line.slice(2)} sources={sources} />
						</div>
					);
				}
				return <div key={i}><RenderInline text={line} sources={sources} /></div>;
			})}
		</div>
	);
}

function RenderInline({ text, sources }: { text: string; sources: CitationSource[] }) {
	const sourceMap = new Map(sources.map((s) => [s.index, s]));
	const parts: Array<{ type: 'text' | 'cite'; value: string; index?: number }> = [];
	const re = /\[(\d+)\]/g;
	let cursor = 0;
	let match: RegExpExecArray | null;
	while ((match = re.exec(text)) !== null) {
		if (match.index > cursor) parts.push({ type: 'text', value: text.slice(cursor, match.index) });
		parts.push({ type: 'cite', value: match[0], index: Number(match[1]) });
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) parts.push({ type: 'text', value: text.slice(cursor) });

	return (
		<>
			{parts.map((p, i) => {
				if (p.type === 'text') return <span key={i} dangerouslySetInnerHTML={{ __html: bold(p.value) }} />;
				const source = p.index != null ? sourceMap.get(p.index) : null;
				if (!source) return <sup key={i} style={{ color: 'var(--fg-muted)' }}>[{p.index}]</sup>;
				return (
					<a
						key={i}
						href={source.url}
						target="_blank"
						rel="noopener noreferrer"
						title={source.title ?? source.url}
						style={{ textDecoration: 'none' }}
					>
						<sup style={{ color: 'var(--accent)', fontWeight: 700, padding: '0 2px' }}>[{p.index}]</sup>
					</a>
				);
			})}
		</>
	);
}

function bold(s: string): string {
	return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

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
