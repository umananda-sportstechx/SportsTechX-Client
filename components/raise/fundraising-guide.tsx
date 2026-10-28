'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpRight, Check, ClipboardCheck, Copy, FileText, LayoutTemplate } from 'lucide-react';
import type { ReactNode } from 'react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { hrefOf } from '@/lib/routes';
import { Empty, Loading, Progress } from '@/components/atlas';
import { Markdown } from '@/components/markdown';
import './fundraising-guide.css';

/**
 * Atlas Raise — Fundraising Guide: guides, templates and checklists across
 * Prepare → Connect → Close (Product Brief). Content lives in raise_resources and
 * is edited in admin; a founder's checklist ticks are saved server-side.
 * Body conventions: "- [ ] item" is a tickable item; "> " lines in a template
 * are a block with a Copy button.
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

type Block = { t: 'md'; text: string } | { t: 'check'; items: string[] } | { t: 'template'; text: string };

/** Split a body into markdown, checklist runs and (in templates) copyable blocks. */
function blocks(body: string, kind: Kind): Block[] {
	const out: Block[] = [];
	const push = (b: Block) => {
		const last = out[out.length - 1];
		if (last && last.t === b.t && b.t !== 'template') {
			if (b.t === 'md') (last as { text: string }).text += `\n${b.text}`;
			else (last as { items: string[] }).items.push(...b.items);
		} else out.push(b);
	};
	let tpl: string[] | null = null;
	const flushTpl = () => { if (tpl) { out.push({ t: 'template', text: tpl.join('\n').trim() }); tpl = null; } };
	for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
		const item = /^\s*-\s\[\s?\]\s+(.+?)\s*$/.exec(line)?.[1];
		if (kind === 'template' && /^\s*>/.test(line)) { (tpl ??= []).push(line.replace(/^\s*>\s?/, '')); continue; }
		flushTpl();
		if (item) push({ t: 'check', items: [item] });
		else push({ t: 'md', text: line });
	}
	flushTpl();
	return out;
}

export function FundraisingGuideItem({ slug }: { slug: string }) {
	const key = qk.raise.resource(slug);
	const { data, isLoading, error, mutate } = useSWR<ResourceDetail>(key);
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
	const k = KIND[data.kind];
	const phase = PHASES.find((p) => p.key === data.phase)?.title;

	return (
		<article className="fg-item">
			<Link href={guideHref()} className="atlas-action"><span className="atlas-action__icon"><ArrowLeft /></span>Fundraising Guide</Link>
			<header className="fg-item__head">
				<span className="fg-kind">{k.icon}{k.label}{phase ? ` · ${phase}` : ''}</span>
				<h1 className="atlas-h1 fg-item__title">{data.title}</h1>
				{data.summary && <p className="fg-item__summary">{data.summary}</p>}
				{data.items_total > 0 && (
					<div className="fg-item__progress">
						<Progress pct={(data.checked.length / data.items_total) * 100} />
						<span>{data.checked.length} of {data.items_total} done</span>
					</div>
				)}
			</header>
			<div className="atlas-card fg-item__body">
				{blocks(data.body_md, data.kind).map((b, i) => (
					b.t === 'md' ? <Markdown key={i} text={b.text} />
					: b.t === 'check' ? (
						<ul key={i} className="fg-checks">
							{b.items.map((it) => {
								const on = checked.has(it);
								return (
									<li key={it}>
										<button type="button" role="checkbox" aria-checked={on} className={`fg-check ${on ? 'is-on' : ''}`} onClick={() => void toggle(it)}>
											<span className="fg-check__box" aria-hidden="true">{on && <Check size={12} strokeWidth={2.5} />}</span>
											<span className="fg-check__text">{it}</span>
										</button>
									</li>
								);
							})}
						</ul>
					) : (
						<div key={i} className="fg-template">
							<pre>{b.text}</pre>
							<button type="button" className="atlas-btn atlas-btn--outline atlas-btn--sm fg-template__copy" onClick={() => void copy(b.text)}><Copy size={12} /> Copy</button>
						</div>
					)
				))}
			</div>
		</article>
	);
}
