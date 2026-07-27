'use client';

import { Globe, Wallet, Zap, TrendingUp, Shield, Check, User, Calendar, ArrowRight } from 'lucide-react';
import { openClaim } from '@/lib/claim-events';

const REPORT_ROWS = [
  { icon: Globe, t: 'Your closest competitors, mapped' },
  { icon: Wallet, t: 'The investors backing your space' },
  { icon: Zap, t: 'Accelerators, challenges & events around you' },
  { icon: TrendingUp, t: 'A read on where your segment is heading' },
];

const TRUST = [
  { icon: Shield, h: 'You stay in control', p: 'Every change is yours to make. Verify ownership once and your profile updates whenever you do.' },
  { icon: Check, h: 'Reviewed by humans', p: 'We confirm your role and your data before anything goes live — usually within 24–48 hours.' },
  { icon: User, h: 'Seen by the right people', p: 'Verified profiles surface first to the investors, programs and partners scanning SportsTechX for deals.' },
];

export default function GetVerifiedPage() {
  return (
    <div className="px-6 py-6">
      <div className="gv-page">
        {/* HERO */}
        <section className="gv-hero">
          <div>
            <span className="gv-eyebrow">
              <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1.2l1.6 1.4 2.1-.2.5 2 1.8 1.1-.9 1.9.5 2.1-1.9.9-.8 2-2.1-.4L8 13.5l-1.6-1.4-2.1.4-.8-2-1.9-.9.5-2.1L1.2 5.5l1.8-1.1.5-2 2.1.2z" fill="currentColor" />
                <path d="M5 8l2 2 4-4" stroke="var(--bg)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Company verification
            </span>
            <h1 className="gv-hero-h">Own how the sports-tech world sees your company.</h1>
            <p className="gv-hero-lead">
              The details investors, programs and partners read on SportsTechX should come from you — not from a guess. Verify your profile to take control of your funding, stage and contacts. It&apos;s free, and it takes about five minutes.
            </p>
            <div className="gv-hero-meta">
              <span className="gv-meta-item"><Check size={15} /> Always free</span>
              <span className="gv-meta-dot">·</span>
              <span className="gv-meta-item"><Calendar size={15} /> ~5 minutes</span>
              <span className="gv-meta-dot">·</span>
              <span className="gv-meta-item"><Shield size={15} /> Reviewed in 24–48h</span>
            </div>
            <div className="gv-hero-actions">
              <button className="gv-cta" onClick={() => openClaim(null, 'founder')}>
                <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 1.2l1.6 1.4 2.1-.2.5 2 1.8 1.1-.9 1.9.5 2.1-1.9.9-.8 2-2.1-.4L8 13.5l-1.6-1.4-2.1.4-.8-2-1.9-.9.5-2.1L1.2 5.5l1.8-1.1.5-2 2.1.2z" fill="#fff" />
                  <path d="M5 8l2 2 4-4" stroke="var(--slate-deep)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verify your company
              </button>
              <span className="gv-cta-sub">No cost · no card · no catch</span>
            </div>
            <div className="gv-roles-line">
              Not a founder?
              <button className="gv-role-link" onClick={() => openClaim(null, 'investor')}>Claim an investor profile</button>
              <span className="gv-meta-dot">·</span>
              <button className="gv-role-link" onClick={() => openClaim(null, 'operator')}>Claim a program or event</button>
            </div>
          </div>

          {/* Locker Room Report preview */}
          <div className="gv-report">
            <div className="gv-report-glow" />
            <div className="gv-report-kicker">
              Locker Room Report <span className="gv-report-bonus">Bonus</span>
            </div>
            <h2 className="gv-report-h">Your personal map of the sports-tech market.</h2>
            <div className="gv-report-rows">
              {REPORT_ROWS.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className="gv-report-row">
                    <span className="gv-report-ico"><Icon size={16} /></span>
                    <span className="gv-report-rt">{r.t}</span>
                  </div>
                );
              })}
            </div>
            <div className="gv-report-foot">
              <span className="gv-report-free">Free when you verify</span> · sent within 24 hours
            </div>
          </div>
        </section>

        {/* STEPS */}
        <div className="gv-steps">
          <div className="gv-step">
            <span className="gv-step-n">STEP 1</span>
            <span className="gv-step-h">Find your company</span>
            <span className="gv-step-p">Search our database. Claim yours, or add it if it&apos;s not listed yet.</span>
          </div>
          <div className="gv-step">
            <span className="gv-step-n">STEP 2</span>
            <span className="gv-step-h">Confirm your details</span>
            <span className="gv-step-p">Verify it&apos;s you with a company email, then fix anything that&apos;s out of date.</span>
          </div>
          <div className="gv-step">
            <span className="gv-step-n">STEP 3</span>
            <span className="gv-step-h">Go live verified</span>
            <span className="gv-step-p">We review within 24–48h. Your badge, Growth access and report all switch on.</span>
          </div>
        </div>

        {/* TRUST */}
        <div className="gv-trust">
          {TRUST.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="gv-trust-card">
                <span className="gv-trust-ico"><Icon size={18} /></span>
                <h3 className="gv-trust-h">{c.h}</h3>
                <p className="gv-trust-p">{c.p}</p>
              </div>
            );
          })}
        </div>

        {/* Closing CTA */}
        <div className="gv-banner" style={{ marginBottom: 8 }}>
          <span className="gv-banner-glyph">
            <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.2l1.6 1.4 2.1-.2.5 2 1.8 1.1-.9 1.9.5 2.1-1.9.9-.8 2-2.1-.4L8 13.5l-1.6-1.4-2.1.4-.8-2-1.9-.9.5-2.1L1.2 5.5l1.8-1.1.5-2 2.1.2L7.2 1.2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="gv-banner-text">
            <div className="gv-banner-h">Ready when you are.</div>
            <div className="gv-banner-sub">Five minutes now keeps your company accurate to every investor watching this space.</div>
          </div>
          <div className="gv-banner-actions">
            <button className="btn" style={{ background: 'var(--verify)', borderColor: 'var(--verify)' }} onClick={() => openClaim(null, 'founder')}>
              Get verified <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
