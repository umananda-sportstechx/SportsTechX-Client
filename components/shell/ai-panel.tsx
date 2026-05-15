'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, X, Download } from 'lucide-react';
import { useQuery } from '@/lib/query-client';
import { getAuthHeaders } from '@/lib/query-client';

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
	url: string;
	title?: string;
}

interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	tools?: Array<{ tool: string; ok: boolean; preview: string }>;
	sources?: CitationSource[];
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

export function AiPanel({ open, onClose }: AiPanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			role: 'assistant',
			content:
				'I can query the SportsTechX database — companies, deals, investors, programs — and pull live web results. Try a quick prompt below or ask anything.',
		},
	]);
	const [input, setInput] = useState('');
	const [streaming, setStreaming] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const bodyRef = useRef<HTMLDivElement>(null);

	const { data: suggestions } = useQuery<{ prompts: string[] }>({
		queryKey: ['/api/chat/suggestions'],
		staleTime: 60 * 60_000,
		enabled: open,
	});
	const prompts = suggestions?.prompts ?? FALLBACK_PROMPTS;

	useEffect(() => {
		if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
	}, [messages, streaming]);

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

		try {
			const auth = await getAuthHeaders();
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...auth },
				body: JSON.stringify({ conversation_id: conversationId, message }),
				credentials: 'include',
			});
			if (!res.ok || !res.body) {
				const errText = await res.text().catch(() => 'request failed');
				patchLastAssistant(`⚠️ ${errText}`);
				return;
			}
			await consumeSse(res.body, {
				onConversation: (id) => setConversationId(id),
				onText: (delta) => appendToLastAssistant(delta),
				onToolCall: (tool) => addToolToLastAssistant({ tool, ok: false, preview: '…' }),
				onToolResult: (tool, ok, preview, sources) => updateLastTool(tool, ok, preview, sources),
				onError: (msg) => patchLastAssistant(`\n\n_⚠️ ${msg}_`),
			});
		} catch (err) {
			patchLastAssistant(`\n\n_⚠️ ${(err as Error).message}_`);
		} finally {
			setStreaming(false);
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

	const addToolToLastAssistant = (tool: { tool: string; ok: boolean; preview: string }) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant') {
				next[next.length - 1] = { ...last, tools: [...(last.tools ?? []), tool] };
			}
			return next;
		});
	};

	const updateLastTool = (tool: string, ok: boolean, preview: string, newSources?: CitationSource[]) => {
		setMessages((prev) => {
			const next = [...prev];
			const last = next[next.length - 1];
			if (last && last.role === 'assistant' && last.tools) {
				const tools = [...last.tools];
				for (let i = tools.length - 1; i >= 0; i -= 1) {
					if (tools[i].tool === tool) {
						tools[i] = { tool, ok, preview };
						break;
					}
				}
				const merged = mergeSources(last.sources ?? [], newSources ?? []);
				next[next.length - 1] = { ...last, tools, sources: merged };
			}
			return next;
		});
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
							{streaming ? 'Thinking…' : 'Online'}
						</div>
					</div>
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
											{t.tool === 'web_search' ? '🌐' : t.tool === 'search_database' ? '📊' : '🔧'}
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
	const hasDb = tools.some((t) => t.tool === 'search_database');
	if (hasWeb && hasDb) return <span className="tag pos">🔀 Hybrid</span>;
	if (hasWeb) return <span className="tag">🌐 Web</span>;
	if (hasDb) return <span className="tag pos">📊 Database</span>;
	return null;
}

function mergeSources(prev: CitationSource[], next: CitationSource[]): CitationSource[] {
	if (next.length === 0) return prev;
	const byIndex = new Map<number, CitationSource>();
	for (const s of prev) byIndex.set(s.index, s);
	for (const s of next) byIndex.set(s.index, s);
	return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/* ─── SSE consumption ───────────────────────────────────────────────────── */

interface SseHandlers {
	onConversation: (id: string) => void;
	onText: (delta: string) => void;
	onToolCall: (tool: string) => void;
	onToolResult: (tool: string, ok: boolean, preview: string, sources?: CitationSource[]) => void;
	onError: (msg: string) => void;
}

async function consumeSse(stream: ReadableStream<Uint8Array>, handlers: SseHandlers): Promise<void> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
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
					case 'content_delta':
						if (typeof parsed.text === 'string') handlers.onText(parsed.text);
						break;
					case 'tool_call':
						if (parsed.tool) handlers.onToolCall(parsed.tool);
						break;
					case 'tool_result': {
						const sources = extractCitations(parsed);
						if (parsed.tool) handlers.onToolResult(parsed.tool, !!parsed.ok, parsed.preview ?? '', sources);
						break;
					}
					case 'error':
						handlers.onError(parsed.message ?? 'unknown error');
						break;
					case 'done':
					case 'thinking':
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
 * an array of `{title, url, snippet}` results in `parsed.results`; older
 * preview-only payloads are skipped silently.
 */
function extractCitations(parsed: unknown): CitationSource[] | undefined {
	if (!parsed || typeof parsed !== 'object') return undefined;
	const obj = parsed as { results?: Array<{ url?: string; title?: string }> };
	if (!Array.isArray(obj.results)) return undefined;
	const out: CitationSource[] = [];
	let i = 1;
	for (const r of obj.results) {
		if (r.url) out.push({ index: i, url: r.url, title: r.title });
		i += 1;
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
