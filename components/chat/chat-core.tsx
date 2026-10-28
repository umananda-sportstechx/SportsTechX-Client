'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { getAuthHeaders } from '@/lib/query-client';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { refreshCredits, refreshPaths } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';

/**
 * Shared chat mechanics for the streaming agent, used by both the legacy
 * market-intel AI panel and the Atlas founder chat. Holds everything that is
 * pure/stateful-but-chrome-agnostic: SSE consumption, citation extraction,
 * markdown rendering, and the `useChat` state machine (message list + send
 * loop + history + export). Panels supply their own route policy
 * (`actionFromTool`, `pageContext`, markdown `rewritePath`) and chrome.
 */

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface CitationSource {
	index: number;
	/** Absolute URL or in-app path. Absent for knowledge hits with no linkable location. */
	url?: string;
	title?: string;
}

export interface ToolEntry {
	/** Anthropic-issued tool_use id — matched across tool_call / tool_result. */
	id: string;
	tool: string;
	ok: boolean;
	preview: string;
}

/** A suggested navigation the agent proposed. Rendered as a tappable chip
 *  (no auto-navigation, so the view never changes under the user). */
export interface ChatAction {
	kind: 'navigate' | 'open_entity';
	label: string;
	href: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	tools?: ToolEntry[];
	sources?: CitationSource[];
	actions?: ChatAction[];
	plan?: { strategy: string; steps: string[] };
}

export interface ConversationListItem {
	id: string;
	title: string | null;
	last_message_at: string;
}

export interface PageContext {
	path: string;
	entityType?: string;
	entityId?: string;
	filters?: Record<string, string>;
}

/* ─── Filters / current URL ──────────────────────────────────────────────── */

/** Read the current URL's query string into a plain object so the agent can see
 *  the active list filters (drives check_visibility — "why isn't X showing"). */
export function currentFilters(): Record<string, string> | undefined {
	if (typeof window === 'undefined' || !window.location.search) return undefined;
	const out: Record<string, string> = {};
	new URLSearchParams(window.location.search).forEach((v, k) => {
		if (k === 'page' || k === 'view' || v === '') return; // pagination/view aren't filters
		out[k] = v;
	});
	return Object.keys(out).length ? out : undefined;
}

/* ─── Shared session ─────────────────────────────────────────────────────── */

/*
 * ONE agent conversation for the whole app. The co-pilot drawer and the full
 * chat page both render it, so expanding the drawer shows the same thread at
 * once — no refetch, no greeting flash — and a reply that is still streaming
 * keeps streaming. It lives outside React on purpose: a component unmounting
 * (drawer → page) must not drop the thread or abort the reply; only an explicit
 * stop / close / new chat does.
 */
interface ChatSession {
	/** The turns, without the greeting. */
	thread: ChatMessage[];
	/** A new chat shows the greeting above its turns; a loaded one doesn't. */
	withGreeting: boolean;
	conversationId: string | null;
	streaming: boolean;
	stage: string;
	/** The composer draft — carried across too, so expanding keeps what was typed. */
	input: string;
	/** Opening a conversation that isn't cached yet: its id is current, its turns are on the way. */
	loading: boolean;
}

const EMPTY: Omit<ChatSession, 'input'> = { thread: [], withGreeting: true, conversationId: null, streaming: false, stage: '', loading: false };
let session: ChatSession = { ...EMPTY, input: '' };
const listeners = new Set<() => void>();
let abortCtl: AbortController | null = null;
let nextSourceIndex = 1;
/** Bumped by every load / send / reset, so a slow load can't land on top of a newer state. */
let loadSeq = 0;
/** Transcripts seen this visit: reopening a conversation shows at once while it refreshes. */
const transcripts = new Map<string, ChatMessage[]>();
const MAX_TRANSCRIPTS = 30; // a long-lived tab shouldn't keep every conversation it ever opened

function update(patch: Partial<ChatSession> | ((s: ChatSession) => Partial<ChatSession>)): void {
	session = { ...session, ...(typeof patch === 'function' ? patch(session) : patch) };
	if (session.conversationId && !session.loading) {
		transcripts.delete(session.conversationId); // re-insert = most recent
		transcripts.set(session.conversationId, session.thread);
		if (transcripts.size > MAX_TRANSCRIPTS) transcripts.delete(transcripts.keys().next().value!);
	}
	listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSession = () => session;
/** The conversation on screen right now — for effects that must not act on a stale render. */
export const chatSessionId = (): string | null => session.conversationId;
/** Whether a reply is streaming right now (live, not a render's copy). */
export const chatSessionStreaming = (): boolean => session.streaming;

/** The session is app-wide, so it must not outlive the person: signing out — or
 *  a different user signing in on this tab without a sign-out in between, which
 *  the auth context also handles — stops any reply and empties it. */
let watchingAuth = false;
let sessionUser: string | null = null;
function clearOnSignOut(): void {
	if (watchingAuth || typeof window === 'undefined') return;
	watchingAuth = true;
	getSupabaseBrowser().auth.onAuthStateChange((event, auth) => {
		const uid = auth?.user?.id ?? null;
		const switched = event === 'SIGNED_IN' && uid !== null && sessionUser !== null && uid !== sessionUser;
		if (uid) sessionUser = uid;
		if (event !== 'SIGNED_OUT' && !switched) return;
		if (event === 'SIGNED_OUT') sessionUser = null;
		abortCtl?.abort();
		abortCtl = null;
		loadSeq++;
		transcripts.clear();
		update({ ...EMPTY, input: '' });
	});
}

/** Replace the last assistant turn (the one streaming in), if there is one. */
function updateLastAssistant(fn: (m: ChatMessage) => ChatMessage | null): void {
	update((s) => {
		const last = s.thread[s.thread.length - 1];
		const next = last && last.role === 'assistant' ? fn(last) : null;
		return next ? { thread: [...s.thread.slice(0, -1), next] } : {};
	});
}

/* ─── useChat hook ───────────────────────────────────────────────────────── */

export interface UseChatOptions {
	/** Opening assistant message shown before the first turn. */
	greeting: string;
	/** Map a client-side nav tool call to a chip (route policy differs per shell). */
	actionFromTool: (tool: string, input: unknown) => ChatAction | null;
	/** Build the page context sent with each message (route parsing differs per shell). */
	pageContext: () => PageContext | undefined;
	/** Apply immediate client-side action tools (theme/accent). Optional. */
	onClientAction?: (tool: string, input: unknown) => void;
	/** Markdown shown when the user is out of AI credits. Panels differ on where
	 *  they point (the founder shell has no /subscriptions page). */
	insufficientCreditsMd?: string;
}

const DEFAULT_INSUFFICIENT_CREDITS = "_⚠️ You're out of AI credits._ Top up or upgrade to keep chatting.";

export function useChat({ greeting, actionFromTool, pageContext, onClientAction, insufficientCreditsMd }: UseChatOptions) {
	useEffect(clearOnSignOut, []);
	const s = useSyncExternalStore(subscribe, getSession, getSession);
	// The greeting is per-product and follows the viewer's tier (which arrives a
	// render late), so it's applied at render rather than stored in the thread.
	const messages = useMemo<ChatMessage[]>(() => {
		const hello: ChatMessage = { role: 'assistant', content: greeting };
		return s.withGreeting || s.thread.length === 0 ? [hello, ...s.thread] : s.thread;
	}, [s.thread, s.withGreeting, greeting]);

	const [showHistory, setShowHistory] = useState(false);
	// Past conversations from the shared SWR cache (the chat page's rail reads the
	// same key), so reopening the list is instant and every surface agrees.
	const history = useSWR<ConversationListItem[]>(showHistory ? qk.chat.conversations() : null);
	const bodyRef = useRef<HTMLDivElement>(null);

	// Pin the transcript to the bottom — also on mount, so the page opens at the
	// latest message when the drawer expands into it.
	useEffect(() => {
		if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
	}, [s.thread, s.streaming]);

	const setInput = useCallback((v: string) => update({ input: v }), []);
	const toggleHistory = useCallback(() => setShowHistory((v) => !v), []);

	const resetConversation = useCallback(() => {
		abortCtl?.abort();
		abortCtl = null;
		loadSeq++;
		nextSourceIndex = 1;
		update({ ...EMPTY });
		setShowHistory(false);
	}, []);

	const loadConversation = useCallback(async (id: string) => {
		abortCtl?.abort();
		abortCtl = null;
		setShowHistory(false);
		const seq = ++loadSeq;
		// Seen this visit → show it now; the fetch below brings it up to date.
		// Not seen → switch to it at once, empty and loading: leaving the previous
		// thread up meant a message typed meanwhile went into THAT conversation.
		const cached = transcripts.get(id);
		update({ conversationId: id, withGreeting: false, thread: cached ?? [], streaming: false, stage: '', loading: !cached });
		try {
			const auth = await getAuthHeaders();
			const res = await fetch(`/api/chat/conversations/${id}`, { headers: { ...auth }, credentials: 'include' });
			if (seq !== loadSeq) return;
			if (!res.ok) {
				// Gone or not ours: fall back to a fresh chat rather than a blank "loading" one.
				if (!cached) update({ ...EMPTY });
				return;
			}
			const data = (await res.json()) as {
				messages: Array<{ role: 'user' | 'assistant'; content: string; tool_calls?: Array<{ tool: string; input?: unknown; ok: boolean; preview: string }> | null }>;
			};
			if (seq !== loadSeq) return;
			const msgs: ChatMessage[] = data.messages.map((m, idx) => {
				const calls = m.role === 'assistant' ? m.tool_calls ?? undefined : undefined;
				const actions: ChatAction[] = [];
				if (calls) {
					for (const t of calls) {
						const a = actionFromTool(t.tool, t.input);
						if (a && !actions.some((x) => x.href === a.href)) actions.push(a);
					}
				}
				return {
					role: m.role,
					content: m.content,
					tools: calls ? calls.map((t, ti) => ({ id: `${idx}-${ti}`, tool: t.tool, ok: t.ok, preview: t.preview })) : undefined,
					actions: actions.length > 0 ? actions : undefined,
				};
			});
			update({ conversationId: id, withGreeting: false, thread: msgs, streaming: false, stage: '', loading: false });
			nextSourceIndex = 1;
		} catch {
			// A cached transcript stays on screen; an uncached one falls back to a fresh chat.
			if (seq === loadSeq && !cached) update({ ...EMPTY });
		}
	}, [actionFromTool]);

	const send = useCallback(async (text?: string) => {
		const message = (text ?? session.input).trim();
		// Not while a conversation is still loading — its turns would land after this one.
		if (!message || session.streaming || session.loading) return;
		loadSeq++;
		const conversationId = session.conversationId;
		update((st) => ({
			input: '',
			thread: [...st.thread, { role: 'user', content: message }, { role: 'assistant', content: '', tools: [], sources: [] }],
			streaming: true,
			stage: 'Planning',
		}));
		nextSourceIndex = 1;

		abortCtl?.abort();
		const ac = new AbortController();
		abortCtl = ac;
		// A stopped request (stop / new chat / another conversation) must not write
		// its late error text into whatever thread is on screen now.
		const write = (content: (prev: string) => string) => {
			if (!ac.signal.aborted) updateLastAssistant((m) => ({ ...m, content: content(m.content) }));
		};

		try {
			const auth = await getAuthHeaders();
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...auth },
				body: JSON.stringify({ conversation_id: conversationId, message, page: pageContext() }),
				credentials: 'include',
				signal: ac.signal,
			});
			if (!res.ok || !res.body) {
				if (res.status === 402) {
					const body = await res.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
					const note = body?.error?.code === 'INSUFFICIENT_CREDITS'
						? (insufficientCreditsMd ?? DEFAULT_INSUFFICIENT_CREDITS)
						: `_⚠️ ${body?.error?.message ?? 'Could not start the chat.'}_`;
					write((c) => c + note);
					return;
				}
				const errText = await res.text().catch(() => 'request failed');
				write((c) => `${c}_⚠️ ${errText}_`);
				return;
			}
			await consumeSse(res.body, {
				onConversation: (id) => update({ conversationId: id }),
				onThinking: () => update((st) => ({ stage: st.stage === '' || st.stage === 'Writing the answer' ? 'Thinking' : st.stage })),
				onPlan: (strategy, steps) => updateLastAssistant((m) => ({ ...m, plan: { strategy, steps } })),
				onText: (delta) => { update({ stage: 'Writing the answer' }); write((c) => c + delta); },
				onToolCall: (id, tool, tInput) => {
					update({ stage: toolStage(tool) });
					updateLastAssistant((m) => ({ ...m, tools: [...(m.tools ?? []), { id, tool, ok: false, preview: '…' }] }));
					const action = actionFromTool(tool, tInput);
					if (action) updateLastAssistant((m) => ((m.actions ?? []).some((a) => a.href === action.href) ? null : { ...m, actions: [...(m.actions ?? []), action] }));
					else onClientAction?.(tool, tInput);
				},
				onToolResult: (id, ok, preview, parsed) => {
					// Tools that change the user's own data: refresh what shows it.
					if (ok) {
						const tool = session.thread[session.thread.length - 1]?.tools?.find((t) => t.id === id)?.tool;
						if (tool === 'add_favorite') void refreshPaths('/api/favorites', '/api/user-watchlists');
						if (tool === 'update_my_notification_settings') void mutate(qk.profile());
					}
					updateLastAssistant((m) => {
						const idx = m.tools?.findIndex((t) => t.id === id) ?? -1;
						if (idx === -1) return null;
						const tools = [...m.tools!];
						tools[idx] = { ...tools[idx]!, ok, preview };
						return { ...m, tools };
					});
					update({ stage: 'Analyzing results' });
					const webSources = extractCitations(parsed, nextSourceIndex) ?? [];
					const knowledgeSources = extractKnowledgeCitations(parsed, nextSourceIndex + webSources.length) ?? [];
					const sources = [...webSources, ...knowledgeSources];
					if (sources.length > 0) {
						nextSourceIndex += sources.length;
						updateLastAssistant((m) => ({ ...m, sources: mergeSources(m.sources ?? [], sources) }));
					}
				},
				onError: (msg) => write((c) => `${c}\n\n_⚠️ ${msg}_`),
			}, ac.signal);
		} catch (err) {
			if ((err as Error).name === 'AbortError') return;
			write((c) => `${c}\n\n_⚠️ ${(err as Error).message}_`);
		} finally {
			// Only the stream that is still current settles the session — an aborted
			// one finishing late must not flip a newer reply to "not streaming".
			if (abortCtl === ac || abortCtl === null) {
				abortCtl = null;
				update({ streaming: false, stage: '' });
				void mutate(qk.chat.conversations()); // new / retitled conversation in every history list
				void refreshCredits(); // each reply spends AI credits
			}
		}
	}, [actionFromTool, pageContext, onClientAction, insufficientCreditsMd]);

	const exportConversation = useCallback(async () => {
		const id = session.conversationId;
		if (!id) return;
		const auth = await getAuthHeaders();
		const res = await fetch(`/api/chat/conversations/${id}/export`, { headers: { ...auth }, credentials: 'include' });
		if (!res.ok) return;
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `conversation-${id.slice(0, 8)}.md`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}, []);

	return {
		messages, input: s.input, setInput, streaming: s.streaming, stage: s.stage, conversationId: s.conversationId, loading: s.loading,
		showHistory, conversations: history.data ?? null, historyLoading: showHistory && history.isLoading, bodyRef,
		send, resetConversation, toggleHistory, loadConversation, exportConversation,
		abort: () => { abortCtl?.abort(); abortCtl = null; update({ streaming: false, stage: '' }); },
	};
}

/* ─── Stage labels ───────────────────────────────────────────────────────── */

/** Map a tool the agent invoked to a plain-language pipeline-stage label. */
export function toolStage(tool: string): string {
	if (tool === 'web_search') return 'Searching the web';
	if (tool === 'search_knowledge') return 'Searching the knowledge base';
	if (tool.startsWith('find_') || tool === 'get_entity_details' || tool === 'search_by_name') return 'Searching the database';
	if (tool === 'navigate_and_filter' || tool === 'open_entity') return 'Navigating the platform';
	if (tool === 'page_insights') return 'Reading the current page';
	return 'Working';
}

function mergeSources(prev: CitationSource[], next: CitationSource[]): CitationSource[] {
	if (next.length === 0) return prev;
	const byIndex = new Map<number, CitationSource>();
	for (const s of prev) byIndex.set(s.index, s);
	for (const s of next) byIndex.set(s.index, s);
	return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/* ─── SSE consumption ────────────────────────────────────────────────────── */

interface SseHandlers {
	onConversation: (id: string) => void;
	onThinking: (iteration: number) => void;
	onPlan: (strategy: string, steps: string[]) => void;
	onText: (delta: string) => void;
	onToolCall: (id: string, tool: string, input: unknown) => void;
	onToolResult: (id: string, ok: boolean, preview: string, parsedPayload: unknown) => void;
	onError: (msg: string) => void;
}

export async function consumeSse(stream: ReadableStream<Uint8Array>, handlers: SseHandlers, signal: AbortSignal): Promise<void> {
	const reader = stream.getReader();
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
					case 'conversation': if (parsed.id) handlers.onConversation(parsed.id); break;
					case 'thinking': if (typeof parsed.iteration === 'number') handlers.onThinking(parsed.iteration); break;
					case 'plan':
						if (typeof parsed.strategy === 'string' && Array.isArray(parsed.steps)) {
							handlers.onPlan(parsed.strategy, parsed.steps.filter((s: unknown): s is string => typeof s === 'string'));
						}
						break;
					case 'content_delta': if (typeof parsed.text === 'string') handlers.onText(parsed.text); break;
					case 'tool_call': if (parsed.tool && typeof parsed.id === 'string') handlers.onToolCall(parsed.id, parsed.tool, parsed.input); break;
					case 'tool_result': if (typeof parsed.id === 'string') handlers.onToolResult(parsed.id, !!parsed.ok, parsed.preview ?? '', parsed); break;
					case 'error': handlers.onError(parsed.message ?? 'unknown error'); break;
					case 'done': break;
				}
			} catch {
				/* skip malformed events */
			}
		}
	}
}

/* ─── Citation extraction ────────────────────────────────────────────────── */

/** True only for links the browser can actually open: absolute URLs or in-app paths. */
export function linkable(uri: string | undefined | null): string | undefined {
	if (!uri) return undefined;
	return /^https?:\/\//i.test(uri) || uri.startsWith('/') ? uri : undefined;
}

function extractKnowledgeCitations(parsed: unknown, startIndex: number): CitationSource[] | undefined {
	if (!parsed || typeof parsed !== 'object') return undefined;
	const obj = parsed as { text?: Array<{ title?: string | null; uri?: string | null }>; images?: Array<{ title?: string | null; uri?: string | null }> };
	const hits = [...(Array.isArray(obj.text) ? obj.text : []), ...(Array.isArray(obj.images) ? obj.images : [])];
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
		if (r.url) { out.push({ index: i, url: r.url, title: r.title }); i += 1; }
	}
	return out.length > 0 ? out : undefined;
}

/* ─── Markdown rendering ─────────────────────────────────────────────────── */

type AppRouter = ReturnType<typeof useRouter>;
/** Remap an in-app markdown link before navigation. Return null to render the
 *  label as plain text (no such page in this shell). Undefined = identity. */
export type RewritePath = (href: string) => string | null;

type Block =
	| { type: 'heading'; level: number; text: string }
	| { type: 'hr' }
	| { type: 'quote'; lines: string[] }
	| { type: 'ul'; items: string[] }
	| { type: 'ol'; items: Array<{ n: number; text: string }> }
	| { type: 'table'; header: string[]; rows: string[][] }
	| { type: 'code'; text: string }
	| { type: 'p'; text: string };

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
		if (t.startsWith('```')) {
			const buf: string[] = [];
			i++;
			while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) { buf.push(lines[i] ?? ''); i++; }
			i++;
			blocks.push({ type: 'code', text: buf.join('\n') });
			continue;
		}
		if (/^([-*_])\1{2,}$/.test(t.replace(/\s+/g, ''))) { blocks.push({ type: 'hr' }); i++; continue; }
		const h = /^(#{1,6})\s+(.*)$/.exec(t);
		if (h) { blocks.push({ type: 'heading', level: h[1]!.length, text: h[2]! }); i++; continue; }
		if (t.includes('|') && isTableSep(lines[i + 1] ?? '')) {
			const header = splitRow(t);
			i += 2;
			const rows: string[][] = [];
			while (i < lines.length && (lines[i] ?? '').trim().includes('|')) { rows.push(splitRow((lines[i] ?? '').trim())); i++; }
			blocks.push({ type: 'table', header, rows });
			continue;
		}
		if (t.startsWith('>')) {
			const buf: string[] = [];
			while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) { buf.push((lines[i] ?? '').trim().replace(/^>\s?/, '')); i++; }
			blocks.push({ type: 'quote', lines: buf });
			continue;
		}
		if (/^[-*+•▸]\s+/.test(t)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*+•▸]\s+/.test((lines[i] ?? '').trim())) { items.push((lines[i] ?? '').trim().replace(/^[-*+•▸]\s+/, '')); i++; }
			blocks.push({ type: 'ul', items });
			continue;
		}
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

export function MarkdownMessage({ text, sources, rewritePath }: { text: string; sources: CitationSource[]; rewritePath?: RewritePath }) {
	const router = useRouter();
	if (!text) return null;
	const blocks = parseBlocks(text);
	return <div className="ai-md">{blocks.map((b, i) => renderBlock(b, i, sources, router, rewritePath))}</div>;
}

function renderBlock(b: Block, i: number, sources: CitationSource[], router: AppRouter, rw: RewritePath | undefined): ReactNode {
	const key = `b${i}`;
	switch (b.type) {
		case 'heading':
			return (
				<div key={key} style={{ fontWeight: 700, fontSize: HEADING_SIZE[b.level] ?? 13, margin: '10px 0 4px', lineHeight: 1.3 }}>
					{renderInline(b.text, sources, router, key, rw)}
				</div>
			);
		case 'hr':
			return <hr key={key} style={{ border: 0, borderTop: '1px solid var(--border)', margin: '10px 0' }} />;
		case 'quote':
			return (
				<blockquote key={key} className="ai-quote">
					{b.lines.map((l, li) => <div key={li}>{renderInline(l, sources, router, `${key}-${li}`, rw)}</div>)}
				</blockquote>
			);
		case 'ul':
			return (
				<div key={key} style={{ margin: '4px 0' }}>
					{b.items.map((it, ii) => (
						<div key={ii} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
							<span style={{ color: 'var(--accent)' }}>▸</span>
							<span>{renderInline(it, sources, router, `${key}-${ii}`, rw)}</span>
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
							<span>{renderInline(it.text, sources, router, `${key}-${ii}`, rw)}</span>
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
							<tr>{b.header.map((c, ci) => <th key={ci}>{renderInline(c, sources, router, `${key}-h${ci}`, rw)}</th>)}</tr>
						</thead>
						<tbody>
							{b.rows.map((r, ri) => (
								<tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, sources, router, `${key}-${ri}-${ci}`, rw)}</td>)}</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case 'p':
		default:
			return (
				<div key={key} style={{ margin: '4px 0', lineHeight: 1.5 }}>
					{b.text.split('\n').map((l, li) => <div key={li}>{renderInline(l, sources, router, `${key}-${li}`, rw)}</div>)}
				</div>
			);
	}
}

function renderInline(text: string, sources: CitationSource[], router: AppRouter, keyBase: string, rw: RewritePath | undefined): ReactNode[] {
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
			nodes.push(<MdLink key={kk} href={m[2]} label={m[1]} router={router} rewritePath={rw} />);
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

/** A markdown link. Company/investor links are validated against the API (the
 *  model sometimes emits slugs that aren't in our DB); a `rewritePath` lets the
 *  shell remap the destination or flatten it to plain text. */
function MdLink({ href, label, router, rewritePath }: { href: string; label: string; router: AppRouter; rewritePath?: RewritePath }) {
	const path = href.split(/[?#]/)[0] ?? href;
	const isCompany = path.startsWith('/companies/');
	const isInvestor = path.startsWith('/investors/');
	const slug = (isCompany || isInvestor) ? path.split('/')[2] : undefined;
	const key = slug ? (isCompany ? qk.companies.detail(slug) : qk.investors.detail(slug)) : null;
	const { data, error } = useSWR(key, { shouldRetryOnError: false, revalidateOnFocus: false, dedupingInterval: 5 * 60_000 });

	// Destination after the shell's remap. `undefined` rewritePath = identity;
	// `null` result = no such page here → render plain text.
	const dest = rewritePath ? rewritePath(href) : href;

	if (isCompany || isInvestor) {
		if (dest === null) return <span>{label}</span>;
		if (data && !error) {
			return <a className="ai-link" href={dest} onClick={(e) => { e.preventDefault(); router.push(dest); }}>{label}</a>;
		}
		return <span>{label}</span>;
	}
	if (href.startsWith('/')) {
		if (dest === null) return <span>{label}</span>;
		return <a className="ai-link" href={dest} onClick={(e) => { e.preventDefault(); router.push(dest); }}>{label}</a>;
	}
	const safe = /^https?:\/\//i.test(href) ? href : undefined;
	if (!safe) return <span>{label}</span>;
	return <a className="ai-link" href={safe} target="_blank" rel="noopener noreferrer">{label}</a>;
}

export function ThinkingDots() {
	return (
		<>
			<style>{`@keyframes stxThinkPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
			{[0, 0.2, 0.4].map((delay) => (
				<span key={delay} style={{ width: 6, height: 6, background: 'var(--accent)', display: 'inline-block', animation: `stxThinkPulse 1.2s ease-in-out infinite ${delay}s` }} />
			))}
		</>
	);
}

/** Markdown + history CSS shared by both panels (token-agnostic: uses --accent /
 *  --border / --bg-2 which each panel maps to its own palette). */
export const AI_MD_CSS = `
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
