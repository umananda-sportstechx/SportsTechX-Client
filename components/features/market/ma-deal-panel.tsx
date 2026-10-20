'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import Link from 'next/link';
import useSWR from 'swr';
import { X, ArrowRight, ExternalLink } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { Logo, Flag } from '@/components/atlas';
import { canonicalCountry } from '@/lib/catalog-options';
import { companyHref } from '@/lib/routes';
import { fmtUsd } from '@/components/features/market/format';
import type { MaDeal } from '@/components/features/market/ma-deals';

/**
 * M&A detail — a right-side slide-over for one acquisition, opened from a table
 * row. Built on the same Radix Dialog primitive as the kit Modal (free focus
 * trap, Escape, overlay); there is no shared Drawer yet, and this is the first
 * caller that needs one, so it stays local until a second caller appears.
 *
 * Everything shown comes from the list row already in hand — the only fetch is
 * the per-party sports list (`/:id/sports`), which the row can't carry.
 */

const TYPE_LABEL: Record<string, string> = { acquisition: 'Acquisition', merger: 'Merger', asset_purchase: 'Asset purchase' };
const bmLabel = (b: string | null) => (!b ? null : b === 'other' ? 'Other' : b.toUpperCase());
const fmtMonth = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—');
const fmtValue = (n: MaDeal['amount_usd']) => (n == null || Number(n) === 0 ? 'Undisclosed' : fmtUsd(Number(n)));
const withHttp = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--a-border)' }}>
			<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>{label}</span>
			<span style={{ fontSize: 12, color: 'var(--a-ink)', fontWeight: 500, textAlign: 'right', minWidth: 0 }}>{children}</span>
		</div>
	);
}

function Party({ role, name, website, slug, sector, city, country, businessModel, sports }: {
	role: string; name: string | null; website: string | null; slug: string | null;
	sector?: string | null; city?: string | null; country?: string | null;
	businessModel: string | null; sports: string[];
}) {
	const loc = [city, country && canonicalCountry(country)].filter(Boolean).join(', ');
	return (
		<div className="atlas-card" style={{ padding: 16 }}>
			<div style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 10 }}>{role}</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
				<Logo co={{ name: name ?? '—', website, custom_logo_url: null }} size={40} radius={7} />
				<div style={{ minWidth: 0 }}>
					{slug
						? <Link href={companyHref(slug)} style={{ fontWeight: 600, fontSize: 15 }} className="atlas-ellipsis">{name ?? '—'}</Link>
						: <div style={{ fontWeight: 600, fontSize: 15 }} className="atlas-ellipsis">{name ?? 'Not specified'}</div>}
					{website && (
						<a href={withHttp(website)} target="_blank" rel="noreferrer" className="atlas-ellipsis"
							style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--a-muted)' }}>
							{website.replace(/^https?:\/\//, '')}<ExternalLink size={10} />
						</a>
					)}
				</div>
			</div>
			{sector && <Fact label="Sector">{sector}</Fact>}
			{loc && <Fact label="Location">{country && <Flag cc={country} size={11} />} <span style={{ marginLeft: country ? 5 : 0 }}>{loc}</span></Fact>}
			{bmLabel(businessModel) && <Fact label="Business model">{bmLabel(businessModel)}</Fact>}
			{sports.length > 0 && <Fact label="Sport">{sports.join(', ')}</Fact>}
		</div>
	);
}

export function MaDealPanel({ deal, onClose }: { deal: MaDeal | null; onClose: () => void }) {
	const open = !!deal;
	const sports = useSWR<Array<{ party: string; name: string; slug: string }>>(deal ? qk.acquisitions.sports(deal.id) : null);
	const party = (p: string) => (sports.data ?? []).filter((s) => s.party === p).map((s) => s.name);

	return (
		<DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogPrimitive.Portal>
				<style>{`
					@keyframes maPanelIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
					@keyframes maScrimIn { from { opacity: 0; } to { opacity: 1; } }
					.ma-panel[data-state="open"] { animation: maPanelIn 220ms cubic-bezier(.22,.61,.36,1); }
					.ma-scrim[data-state="open"] { animation: maScrimIn 180ms ease; }
				`}</style>
				<DialogPrimitive.Overlay className="ma-scrim" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
				<DialogPrimitive.Content
					className="atlas ma-panel"
					aria-describedby={undefined}
					style={{
						position: 'fixed', top: 0, right: 0, height: '100dvh', width: 'min(94vw, 460px)',
						background: 'var(--a-page)', borderLeft: '1px solid var(--a-border)', zIndex: 201,
						color: 'var(--a-ink)', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
					}}
				>
					{deal && (() => {
						const value = fmtValue(deal.amount_usd);
						return <>
							<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--a-border)' }}>
								<DialogPrimitive.Title style={{ fontFamily: 'var(--a-font)', fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
									<span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
										{deal.acquiree_name ?? '—'}<ArrowRight size={15} style={{ color: 'var(--a-muted)' }} />{deal.acquirer_name ?? '—'}
									</span>
								</DialogPrimitive.Title>
								<DialogPrimitive.Close aria-label="Close" style={{ border: 'none', background: 'transparent', color: 'var(--a-muted)', cursor: 'pointer', padding: 2, lineHeight: 0 }}>
									<X size={18} />
								</DialogPrimitive.Close>
							</div>

							<div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
								<p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)', margin: 0 }}>
									<strong style={{ color: 'var(--a-ink)' }}>{deal.acquiree_name ?? 'A company'}</strong> was acquired by{' '}
									<strong style={{ color: 'var(--a-ink)' }}>{deal.acquirer_name ?? 'an undisclosed buyer'}</strong>
									{deal.acquisition_date ? ` in ${fmtMonth(deal.acquisition_date)}` : ''}
									{value === 'Undisclosed' ? ' for an undisclosed amount' : ` for ${value}`}.
								</p>

								<div className="atlas-card" style={{ padding: 16 }}>
									<Fact label="Value">{value}{deal.currency_code && value !== 'Undisclosed' ? ` ${deal.currency_code}` : ''}</Fact>
									<Fact label="Announced">{fmtMonth(deal.acquisition_date)}</Fact>
									<Fact label="Type">{TYPE_LABEL[deal.acquisition_type ?? ''] ?? deal.acquisition_type ?? '—'}</Fact>
									{deal.source_url && (
										<div style={{ paddingTop: 10 }}>
											<a href={withHttp(deal.source_url)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--a-navy)' }}>
												View source<ExternalLink size={11} />
											</a>
										</div>
									)}
								</div>

								<Party role="Acquiree" name={deal.acquiree_name} slug={deal.acquiree_slug}
									website={deal.acquiree_website ?? deal.acquiree_website_snapshot}
									sector={deal.primary_sector} city={deal.hq_city} country={deal.hq_country}
									businessModel={deal.acquiree_business_model} sports={party('acquiree')} />

								<Party role="Acquirer" name={deal.acquirer_name} slug={deal.acquirer_slug}
									website={deal.acquirer_website_snapshot}
									businessModel={deal.acquirer_business_model} sports={party('acquirer')} />
							</div>
						</>;
					})()}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
