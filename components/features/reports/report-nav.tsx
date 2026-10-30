'use client';

import { forwardRef } from 'react';
import { Menu, Moon, SunMedium, X } from 'lucide-react';

/**
 * The header every custom-built web report shares (GSTER26, FTABR26): Atlas
 * wordmark, the report's own section links, the theme toggle and the PDF
 * download. Only `items` and the PDF differ per report — the bar itself is the
 * same everywhere. (The footer is shared too: the Atlas landing footer.)
 */

const PINK = '#ED1A5E';
const PILL = '#f32163';
const SANS = 'var(--font-space-grotesk), system-ui, sans-serif';

export type ReportNavItem = { href: string; label: string };

type Props = {
	items: readonly ReportNavItem[];
	/** 1-based index into `items` of the section in view; 0 for none. */
	activeIndex: number;
	isDark: boolean;
	isMobile: boolean;
	/** Hidden entirely (print mode, auth gate). */
	hidden?: boolean;
	theme: { navBg: string; divider: string; textMuted: string };
	pdf?: { url: string; file: string; label?: string };
	mobileOpen: boolean;
	onToggleMobile: () => void;
	onToggleDark: () => void;
	onNavigate: (href: string, label: string, mobile: boolean) => void;
	onDownload?: (mobile: boolean) => void;
};

export const ReportNav = forwardRef<HTMLElement, Props>(function ReportNav(
	{ items, activeIndex, isDark, isMobile, hidden, theme: t, pdf, mobileOpen, onToggleMobile, onToggleDark, onNavigate, onDownload },
	navRef,
) {
	const pdfLabel = pdf?.label ?? '↓ Download PDF';
	const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
	return (
		<>
			<nav ref={navRef} style={{ position: 'fixed', top: 3, left: 0, right: 0, zIndex: 100, padding: isMobile ? '12px 16px' : '16px 40px', display: hidden ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)', background: t.navBg, borderBottom: `1px solid ${t.divider}`, gap: 16, transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)', willChange: 'transform' }}>
				<a href="https://atlas.sportstechx.com" target="_blank" rel="noopener noreferrer" style={{ lineHeight: 0, flexShrink: 0 }}>
					<img src={isDark ? '/landing/atlas-wordmark-white.svg' : '/landing/atlas-wordmark-dark.svg'} alt="Atlas" style={{ height: isMobile ? 26 : 34, display: 'block' }} />
				</a>
				{!isMobile && (
					<div className="stx-nav-links" style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
						{items.map(({ href, label }, i) => {
							const active = activeIndex === i + 1;
							return (
								<a key={href} href={href} className="stx-nav-link"
									style={{ fontFamily: SANS, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: active ? PINK : t.textMuted, textDecoration: 'none', transition: 'color 0.2s', fontWeight: 500, paddingBottom: 4, borderBottom: active ? `2px solid ${PINK}` : '2px solid transparent' }}
									onClick={(e) => { e.preventDefault(); onNavigate(href, label, false); }}>
									{label}
								</a>
							);
						})}
					</div>
				)}
				<div style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', flexShrink: 0 }}>
					<button type="button" className="stx-toggle" onClick={onToggleDark} title={themeLabel} aria-label={themeLabel}
						style={{ background: 'none', border: 'none', padding: 6, color: isDark ? '#ffa7c2' : PILL, display: 'flex', alignItems: 'center', lineHeight: 0, transition: 'color 0.25s' }}>
						{isDark ? <SunMedium size={isMobile ? 18 : 20} strokeWidth={1.75} /> : <Moon size={isMobile ? 18 : 20} strokeWidth={1.75} />}
					</button>
					{isMobile ? (
						<button type="button" onClick={onToggleMobile} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
							style={{ background: 'none', border: `1px solid ${PINK}`, borderRadius: 8, padding: '5px 8px', color: PINK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							{mobileOpen ? <X size={18} /> : <Menu size={18} />}
						</button>
					) : pdf && (
						<a href={pdf.url} download={pdf.file}
							style={{ fontFamily: SANS, fontSize: 11, letterSpacing: 1.6, fontWeight: 500, color: '#fff', background: PILL, border: `1px solid ${PILL}`, padding: '8px 18px', textDecoration: 'none', textTransform: 'uppercase', transition: 'opacity 0.2s', borderRadius: 99 }}
							onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
							onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
							onClick={() => onDownload?.(false)}>{pdfLabel}</a>
					)}
				</div>
			</nav>
			{isMobile && (
				<div style={{ position: 'fixed', top: 52, left: 0, right: 0, zIndex: 99, maxHeight: mobileOpen ? 400 : 0, opacity: mobileOpen ? 1 : 0, overflow: 'hidden', background: t.navBg, backdropFilter: 'blur(20px)', borderBottom: mobileOpen ? `1px solid ${t.divider}` : 'none', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease', display: hidden ? 'none' : undefined }}>
					<div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
						{items.map(({ href, label }) => (
							<a key={href} href={href}
								style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: t.textMuted, textDecoration: 'none', padding: '10px 0', borderBottom: `1px solid ${t.divider}`, fontFamily: "'DM Mono',monospace", transition: 'color 0.2s' }}
								onClick={(e) => { e.preventDefault(); onNavigate(href, label, true); }}>
								{label}
							</a>
						))}
						{pdf && (
							<a href={pdf.url} download={pdf.file} onClick={() => onDownload?.(true)}
								style={{ fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#fff', background: PILL, textDecoration: 'none', padding: '11px 20px', fontFamily: SANS, fontWeight: 500, borderRadius: 99, display: 'inline-block', marginTop: 4 }}>{pdfLabel}</a>
						)}
					</div>
				</div>
			)}
		</>
	);
});
