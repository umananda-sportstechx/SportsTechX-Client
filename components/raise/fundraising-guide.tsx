'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ClipboardCheck, Copy, FileText, LayoutTemplate, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { hrefOf } from '@/lib/routes';
import { Empty, Loading, Progress } from '@/components/atlas';
import { inline } from '@/components/markdown';
import './fundraising-guide.css';

/**
 * Atlas Raise — Fundraising Guide: guides, templates and checklists across
 * Prepare → Connect → Close (Product Brief). Content lives in raise_resources and
 * is edited in admin; a founder's checklist ticks are saved server-side.
 * Body conventions: "- [ ] item" is a tickable item; "> " lines in a template
 * are a block with a Copy button (in a guide they're a tip callout).
 */
type Phase = 'prepare' | 'connect' | 'close';
type Kind = 'guide' | 'template' | 'checklist';
interface ResourceCard { id: string; slug: string; phase: Phase; kind: Kind; title: string; summary: string; items_total: number; items_done: number }
interface ResourceDetail extends Omit<ResourceCard, 'items_done'> { body_md: string; checked: string[] }

const PHASES: { key: Phase; title: string; blurb: string }[] = [
	{ key: 'prepare', title: 'Prepare', blurb: 'Strengthen your pitch and get investor-ready.' },
	{ key: 'connect', title: 'Connect', blurb: 'Find the right investors and organise your outreach.' },
	{ key: 'close', title: 'Close', blurb: 'Navigate due diligence, terms and closing.' },
];
const KIND: Record<Kind, { label: string; icon: ReactNode }> = {
	guide: { label: 'Guide', icon: <FileText size={13} strokeWidth={1.5} aria-hidden="true" /> },
	template: { label: 'Template', icon: <LayoutTemplate size={13} strokeWidth={1.5} aria-hidden="true" /> },
	checklist: { label: 'Checklist', icon: <ClipboardCheck size={13} strokeWidth={1.5} aria-hidden="true" /> },
};
const guideHref = (slug?: string) => `${hrefOf('guide')}${slug ? `/${slug}` : ''}`;
const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function FundraisingGuide() {
	const { data, isLoading } = useSWR<{ data: ResourceCard[] }>(qk.raise.resources());
	if (isLoading && !data) return <Loading />;
	const rows = data?.data ?? [];
	if (rows.length === 0) return <Empty>The guide is being written — check back soon.</Empty>;
	return (
		<div className="fg">
			{PHASES.map((p) => {
				const items = rows.filter((r) => r.phase === p.key);
				if (!items.length) return null;
				return (
					<section key={p.key} className="fg-phase" aria-labelledby={`fg-${p.key}`}>
						<div className="fg-phase__head">
							<h2 id={`fg-${p.key}`} className="atlas-h2">{p.title}</h2>
							<span className="fg-phase__blurb">{p.blurb}</span>
						</div>
						<div className="fg-grid">
							{items.map((r) => (
								<Link key={r.id} href={guideHref(r.slug)} className="atlas-card fg-card">
									<span className="fg-kind">{KIND[r.kind].icon}{KIND[r.kind].label}</span>
									<span className="fg-card__title">{r.title}</span>
									{r.summary && <span className="fg-card__summary">{r.summary}</span>}
									{r.items_total > 0 && (
										<span className="fg-card__progress">
											<Progress pct={(r.items_done / r.items_total) * 100} />
											<span>{r.items_done} of {r.items_total} done</span>
										</span>
									)}
									<span className="fg-card__go" aria-hidden="true"><ArrowUpRight size={12} /></span>
								</Link>
							))}
						</div>
					</section>
				);
			})}
		</div>
	);
}

type Block =
	| { t: 'h'; level: 2 | 3; text: string }
	| { t: 'p'; text: string }
	| { t: 'ul'; items: string[] }
	| { t: 'ol'; items: [string, string][] }
	| { t: 'tip'; lines: string[] }
	| { t: 'check'; items: string[] }
	| { t: 'template'; text: string };

/** The guide's own small markdown: headings, paragraphs, lists, tips, checklists
 *  and (in templates) copyable blocks — real semantic elements, styled here
 *  rather than through the deck analyser's utility classes. */
function parse(body: string, kind: Kind): Block[] {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	const out: Block[] = [];
	let i = 0;
	const at = (n: number) => (lines[n] ?? '').trim();
	const run = (test: (t: string) => boolean, map: (t: string) => string) => {
		const xs: string[] = [];
		while (i < lines.length && test(at(i))) xs.push(map(at(i++)));
		return xs;
	};
	while (i < lines.length) {
		const t = at(i);
		if (!t) { i++; continue; }
		const h = /^(#{1,6})\s+(.*)$/.exec(t);
		if (h) { out.push({ t: 'h', level: h[1]!.length >= 3 ? 3 : 2, text: h[2]! }); i++; continue; }
		if (/^-\s\[\s?\]\s+/.test(t)) { out.push({ t: 'check', items: run((x) => /^-\s\[\s?\]\s+/.test(x), (x) => x.replace(/^-\s\[\s?\]\s+/, '')) }); continue; }
		if (t.startsWith('>')) {
			const ls = run((x) => x.startsWith('>'), (x) => x.replace(/^>\s?/, ''));
			out.push(kind === 'template' ? { t: 'template', text: ls.join('\n').trim() } : { t: 'tip', lines: ls.filter(Boolean) });
			continue;
		}
		if (/^[-*•]\s+/.test(t)) { out.push({ t: 'ul', items: run((x) => /^[-*•]\s+/.test(x) && !/^-\s\[\s?\]/.test(x), (x) => x.replace(/^[-*•]\s+/, '')) }); continue; }
		if (/^\d+[.)]\s+/.test(t)) {
			out.push({ t: 'ol', items: run((x) => /^\d+[.)]\s+/.test(x), (x) => x).map((x) => { const m = /^(\d+)[.)]\s+(.*)$/.exec(x)!; return [m[1]!, m[2]!] as [string, string]; }) });
			continue;
		}
		const para = run((x) => !!x && !/^(#{1,6}\s|>|[-*•]\s|\d+[.)]\s)/.test(x), (x) => x);
		// Admin-edited content: never let an unmatched line stall the loop.
		if (para.length) out.push({ t: 'p', text: para.join(' ') }); else out.push({ t: 'p', text: at(i++) });
	}
	return out;
}

export function FundraisingGuideItem({ slug }: { slug: string }) {
	const { data, isLoading, error, mutate } = useSWR<ResourceDetail>(qk.raise.resource(slug));
	// The catalogue drives "More in this phase" and "Next".
	const { data: all } = useSWR<{ data: ResourceCard[] }>(qk.raise.resources());
	if (isLoading && !data) return <Loading />;
	if (error || !data) return <Empty>This resource isn&apos;t available. <Link href={guideHref()} style={{ color: 'var(--a-navy)' }}>Back to the guide</Link>.</Empty>;

	const checked = new Set(data.checked);
	const toggle = async (item: string) => {
		const on = !checked.has(item);
		const optimistic = { ...data, checked: on ? [...data.checked, item] : data.checked.filter((c) => c !== item) };
		await mutate(optimistic, { revalidate: false });
		try {
			const res = await apiRequest('PUT', `/api/raise/resources/${slug}/checks`, { item, checked: on });
			const { checked: saved } = (await res.json()) as { checked: string[] };
			await mutate({ ...data, checked: saved }, { revalidate: false });
			void refreshPaths('/api/raise/resources'); // the index's "x of y done"
		} catch (e) {
			await mutate(data, { revalidate: false });
			toast.error((e as Error).message || 'Could not save that — try again.');
		}
	};
	const copy = async (text: string) => {
		try { await navigator.clipboard.writeText(text); toast.success('Template copied'); }
		catch { toast.error('Copy failed — select the text and copy it instead.'); }
	};

	const blocks = parse(data.body_md, data.kind);
	const toc = blocks.filter((b): b is Extract<Block, { t: 'h' }> => b.t === 'h' && b.level === 2);
	const phase = PHASES.find((p) => p.key === data.phase);
	const siblings = (all?.data ?? []).filter((r) => r.phase === data.phase);
	const idx = siblings.findIndex((r) => r.slug === slug);
	const next = idx >= 0 ? siblings[idx + 1] ?? (all?.data ?? [])[(all?.data ?? []).findIndex((r) => r.slug === slug) + 1] : undefined;
	const k = KIND[data.kind];

	return (
		<article className="fg-item">
			<Link href={guideHref()} className="atlas-action"><span className="atlas-action__icon"><ArrowLeft /></span>Fundraising Guide</Link>
			<header className="fg-item__head">
				<span className="fg-kind">{k.icon}{k.label}{phase ? ` · ${phase.title}` : ''}</span>
				<h1 className="atlas-h1 fg-item__title">{data.title}</h1>
				{data.summary && <p className="fg-item__summary">{data.summary}</p>}
				{data.items_total > 0 && (
					<div className="fg-item__progress" aria-live="polite">
						<Progress pct={(data.checked.length / data.items_total) * 100} />
						<span>{data.checked.length} of {data.items_total} done</span>
					</div>
				)}
			</header>

			<div className="fg-item__layout">
				<div className="atlas-card fg-item__body">
					{blocks.map((b, i) => {
						switch (b.t) {
							case 'h': return b.level === 2
								? <h2 key={i} id={anchor(b.text)} className="fg-h2">{inline(b.text)}</h2>
								: <h3 key={i} className="fg-h3">{inline(b.text)}</h3>;
							case 'p': return <p key={i} className="fg-p">{inline(b.text)}</p>;
							case 'ul': return <ul key={i} className="fg-ul">{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
							case 'ol': return <ol key={i} className="fg-ol">{b.items.map(([n, it]) => <li key={n}><span className="fg-ol__n">{n}</span><span>{inline(it)}</span></li>)}</ol>;
							case 'tip': return (
								<aside key={i} className="fg-tip"><Lightbulb size={16} strokeWidth={1.75} aria-hidden="true" /><div>{b.lines.map((l, j) => <p key={j}>{inline(l.replace(/^Tip:\s*/i, ''))}</p>)}</div></aside>
							);
							case 'check': return (
								<ul key={i} className="fg-checks">
									{b.items.map((it) => {
										const on = checked.has(it);
										return (
											<li key={it}>
												<button type="button" role="checkbox" aria-checked={on} className={`fg-check ${on ? 'is-on' : ''}`} onClick={() => void toggle(it)}>
													<span className="fg-check__box" aria-hidden="true">{on && <Check size={13} strokeWidth={2.5} />}</span>
													<span className="fg-check__text">{inline(it)}</span>
												</button>
											</li>
										);
									})}
								</ul>
							);
							case 'template': return (
								<div key={i} className="fg-template">
									<pre>{b.text}</pre>
									<button type="button" className="atlas-btn atlas-btn--outline atlas-btn--sm fg-template__copy" onClick={() => void copy(b.text)}><Copy size={12} /> Copy</button>
								</div>
							);
						}
					})}
					{next && (
						<Link href={guideHref(next.slug)} className="fg-next">
							<span><span className="fg-next__label">Next{next.phase !== data.phase ? ` · ${PHASES.find((p) => p.key === next.phase)?.title}` : ''}</span><span className="fg-next__title">{next.title}</span></span>
							<ArrowRight size={16} aria-hidden="true" />
						</Link>
					)}
				</div>

				<aside className="fg-item__aside" aria-label="About this resource">
					{toc.length > 1 && (
						<nav className="atlas-card fg-side" aria-label="On this page">
							<div className="fg-side__title">On this page</div>
							{toc.map((h) => <a key={h.text} href={`#${anchor(h.text)}`} className="fg-side__link">{h.text.replace(/\*\*/g, '')}</a>)}
						</nav>
					)}
					{siblings.length > 1 && phase && (
						<nav className="atlas-card fg-side" aria-label={`More in ${phase.title}`}>
							<div className="fg-side__title">More in {phase.title}</div>
							{siblings.map((r) => (
								<Link key={r.slug} href={guideHref(r.slug)} className={`fg-side__link ${r.slug === slug ? 'is-current' : ''}`} aria-current={r.slug === slug ? 'page' : undefined}>
									<span className="fg-side__kind">{KIND[r.kind].icon}</span>{r.title}
									{r.items_total > 0 && <span className="fg-side__count">{r.slug === slug ? data.checked.length : r.items_done}/{r.items_total}</span>}
								</Link>
							))}
						</nav>
					)}
				</aside>
			</div>
		</article>
	);
}
