'use client';

import type { ReactNode } from 'react';

/**
 * Lightweight markdown renderer (headings, bold/italic, inline code, blockquotes,
 * lists, hr, paragraphs). Tailwind-styled, dependency-free. Used for the streamed
 * pitch-deck analysis.
 */
function inline(s: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	const re = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
	let last = 0;
	let k = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(s)) !== null) {
		if (m.index > last) nodes.push(s.slice(last, m.index));
		if (m[1] != null) nodes.push(<strong key={k}>{m[1]}</strong>);
		else if (m[2] != null) nodes.push(<code key={k} className="rounded bg-muted px-1 py-0.5 text-xs">{m[2]}</code>);
		else if (m[3] != null) nodes.push(<em key={k}>{m[3]}</em>);
		else if (m[4] != null) nodes.push(<em key={k}>{m[4]}</em>);
		last = m.index + m[0].length;
		k++;
	}
	if (last < s.length) nodes.push(s.slice(last));
	return nodes;
}

export function Markdown({ text, onHeadingClick }: { text: string; onHeadingClick?: (text: string) => void }) {
	if (!text) return null;
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const blocks: ReactNode[] = [];
	let i = 0;
	let key = 0;
	const isSpecial = (t: string) => /^#{1,6}\s/.test(t) || t.startsWith('>') || /^[-*+•]\s/.test(t) || /^\d+[.)]\s/.test(t);

	while (i < lines.length) {
		const t = (lines[i] ?? '').trim();
		if (!t) { i++; continue; }

		const h = /^(#{1,6})\s+(.*)$/.exec(t);
		if (h) {
			const lvl = h[1]!.length;
			const cls = lvl <= 1 ? 'text-lg' : lvl === 2 ? 'text-base' : 'text-sm';
			const htext = h[2]!;
			blocks.push(
				onHeadingClick ? (
					<button key={key++} type="button" onClick={() => onHeadingClick(htext)} className={`mt-4 mb-1 block w-full cursor-pointer text-left font-semibold hover:text-primary ${cls}`}>
						{inline(htext)}
					</button>
				) : (
					<div key={key++} className={`mt-4 mb-1 font-semibold ${cls}`}>{inline(htext)}</div>
				),
			);
			i++;
			continue;
		}
		if (/^([-*_])\1{2,}$/.test(t.replace(/\s/g, ''))) { blocks.push(<hr key={key++} className="my-3 border-border" />); i++; continue; }
		if (t.startsWith('>')) {
			const buf: string[] = [];
			while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) { buf.push((lines[i] ?? '').trim().replace(/^>\s?/, '')); i++; }
			blocks.push(<blockquote key={key++} className="my-2 border-l-2 border-primary pl-3 italic text-muted-foreground">{buf.map((l, bi) => <div key={bi}>{inline(l)}</div>)}</blockquote>);
			continue;
		}
		if (/^[-*+•]\s+/.test(t)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*+•]\s+/.test((lines[i] ?? '').trim())) { items.push((lines[i] ?? '').trim().replace(/^[-*+•]\s+/, '')); i++; }
			blocks.push(<ul key={key++} className="my-1.5 space-y-1">{items.map((it, ii) => <li key={ii} className="flex gap-2"><span className="text-primary">•</span><span>{inline(it)}</span></li>)}</ul>);
			continue;
		}
		if (/^\d+[.)]\s+/.test(t)) {
			const items: Array<[string, string]> = [];
			while (i < lines.length && /^\d+[.)]\s+/.test((lines[i] ?? '').trim())) {
				const mm = /^(\d+)[.)]\s+(.*)$/.exec((lines[i] ?? '').trim());
				items.push(mm ? [mm[1]!, mm[2]!] : ['•', (lines[i] ?? '').trim()]);
				i++;
			}
			blocks.push(<ol key={key++} className="my-1.5 space-y-1">{items.map((it, ii) => <li key={ii} className="flex gap-2"><span className="font-medium text-primary">{it[0]}.</span><span>{inline(it[1])}</span></li>)}</ol>);
			continue;
		}
		const buf: string[] = [];
		while (i < lines.length) {
			const pt = (lines[i] ?? '').trim();
			if (!pt || isSpecial(pt)) break;
			buf.push(pt);
			i++;
		}
		if (buf.length) blocks.push(<p key={key++} className="my-1.5 leading-relaxed">{buf.map((l, pi) => <span key={pi}>{inline(l)}{pi < buf.length - 1 ? ' ' : ''}</span>)}</p>);
	}
	return <div className="text-sm">{blocks}</div>;
}
