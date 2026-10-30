'use client';

import { useEffect, useState } from 'react';
import { ReportNav } from '@/components/features/reports/report-nav';
import { DARK, LIGHT } from '@/components/features/reports/ftabr26/lib/report-theme';
import { LandingFooter } from '@/components/landing/landing-footer';
import '@/components/landing/landing.css';
import './methodology.css';

/**
 * The reports' methodology note, ported verbatim from the STX web app's
 * /reports/methodology (linked from GSTER26 and FTABR26). Same header and
 * footer as every web report; dark by default, as on STX.
 */
export default function MethodologyPage() {
	const [isDark, setIsDark] = useState(true);
	const [isMobile, setIsMobile] = useState(false);
	const [back, setBack] = useState('/reports/gster26');
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 639px)');
		const on = () => setIsMobile(mq.matches);
		on(); mq.addEventListener('change', on);
		// "Back to Report" returns to the report that linked here (STX always went to GSTER26).
		try { const r = new URL(document.referrer); if (r.origin === location.origin && r.pathname.startsWith('/reports/') && r.pathname !== location.pathname) setBack(r.pathname); } catch { /* no referrer */ }
		return () => mq.removeEventListener('change', on);
	}, []);
	const t = isDark ? DARK : LIGHT;

	return (
		<div style={{ minHeight: '100vh', background: t.bg, color: isDark ? '#bed0e3' : t.textSec, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.35s, color 0.35s' }}>
			<ReportNav items={[]} activeIndex={0} isDark={isDark} isMobile={isMobile} theme={t}
				mobileOpen={false} onToggleMobile={() => {}} onToggleDark={() => setIsDark((d) => !d)} onNavigate={() => {}} />
			<div style={{ maxWidth: 800, margin: '0 auto', padding: '132px 24px 60px' }}>
				<a href={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: '#ff3c7d', textDecoration: 'none', textTransform: 'uppercase', marginBottom: 40 }}>
					← Back to Report
				</a>

				<h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: 4, color: t.titleColor, margin: '0 0 32px' }}>
					Methodology
				</h1>

				<div className="methodology-body" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, lineHeight: 1.8, color: isDark ? 'rgba(190, 208, 227, 0.75)' : t.textMuted }}>
					<p>The data from this report was obtained by reviewing over 7,500+ startups and nearly 7,500+ funding deals in Global Sports Tech. Here are some key things to know about how this analysis was approached.</p>

					<p>While we always want to be as inclusive as possible, we have applied certain criteria to ensure that all data is representative of current trends. All companies founded before the year 2000 have been excluded unless otherwise stated, such as Fanatics. Only deals announced during the period of Jan 1, 2021 - Jun 30, 2026 were considered. Deals completed in that period for companies that are not currently active have also been included.</p>

					<p>As with every year, we expect some degree of reporting lag, as not all deals from the current year may have been announced yet. To account for this, for the end of year projections for 2025 we pro-rate the 10 months deal flow to 12 months and then add 5% to the total funding and M&amp;A reported values.</p>

					<p>All figures are reported in USD. For deals not denominated in USD, the average conversion rate for the respective deal year was applied.</p>

					<p>As far as possible, we source public domain information for all the deals included, using funding announcements made across a variety of media channels.</p>

					<p>All deals are reported in USD. For deals not in USD, the average conversion rate for the deal currency to USD in the deal year was utilized.</p>

					<p>One last thing: As always, our team spends countless hours poring over interviews and data around startups and funding rounds, but the nature of the beast that we try to tackle is that some will inadvertently get missed, especially from the last year. Nonetheless, we are confident that the data presented paints an accurate picture of the state of the sports industry, allowing us to draw strong inferences about where the sector is headed.</p>
				</div>
			</div>
			<div className="lp"><LandingFooter /></div>
		</div>
	);
}
