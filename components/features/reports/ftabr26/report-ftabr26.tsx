// @ts-nocheck
/* eslint-disable */
"use client";

import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import { track } from "@/lib/analytics";
import { LandingFooter } from "@/components/landing/landing-footer";
import "@/components/landing/landing.css";
import "./ftabr26.css";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X, SunMedium, MoonStar } from "lucide-react";
import { getCountryFlag, getFlagByCountryCode } from "./lib/flags";
import { BRAND, DARK, LIGHT, WORLDCUP_TECH_COLORS, type Theme } from "./lib/report-theme";
import {
  type LeaderRow, type CompanyRow, type YearRow,
} from "./data/ftabr26-facts-data";
import {
  FTABR26_HERO as FTABR26_HERO_DEFAULT, FTABR26_ABOUT as FTABR26_ABOUT_DEFAULT,
  FTABR26_INSIGHTS as FTABR26_INSIGHTS_DEFAULT, FTABR26_CREATOR_DEALS as FTABR26_CREATOR_DEALS_DEFAULT, type InsightArticle,
  FTABR26_WOMENS_MCO_GROUPS as FTABR26_WOMENS_MCO_GROUPS_DEFAULT, FTABR26_WORLDCUP as FTABR26_WORLDCUP_DEFAULT,
  FTABR26_WORLDCUP_TECH_CATEGORIES as FTABR26_WORLDCUP_TECH_CATEGORIES_DEFAULT, type WorldCupTech,
  FTABR26_STARTUPS_NOTE as FTABR26_STARTUPS_NOTE_DEFAULT,
  FTABR26_PARTNERS as FTABR26_PARTNERS_DEFAULT, FTABR26_METHODOLOGY as FTABR26_METHODOLOGY_DEFAULT, FTABR26_FEATURED as FTABR26_FEATURED_DEFAULT,
} from "./data/ftabr26-content-data";
import { FTABR26_SOCCERMENT as FTABR26_SOCCERMENT_DEFAULT } from "./data/ftabr26-soccerment-data";
import type { Ftabr26Facts, Ftabr26Ecosystem, Ftabr26EcosystemEntry } from "./lib/ftabr26-types";
import { resolveFtabr26Facts } from "./lib/ftabr26-live";
import { buildFtabr26DealflowCopy } from "./lib/ftabr26-dealflow-copy";
import { formatFtabr26Money, formatFtabr26Percent } from "./lib/ftabr26-format";
import {
  resolveFtabr26Ecosystem, ecoHref, ecoLogoUrl, ecoInitiativeLogoUrl, ecoFlagCode,
  resolveFtabr26Startups, startupLogoUrl, indexFtabr26Startups, lookupFtabr26Startups,
  ecoContinent,
  type Ftabr26Startup, type Ftabr26ContinentId,
} from "./lib/ftabr26-ecosystem";
import { FTABR26_INNOVATORS as FTABR26_INNOVATORS_DEFAULT, FTABR26_PLAYMAKER_COMPANIES as FTABR26_PLAYMAKER_COMPANIES_DEFAULT, FTABR26_QUESTIONS as FTABR26_QUESTIONS_DEFAULT, type FtabrInnovator } from "./data/ftabr26-innovators-data";
import { Ftabr26PersonAvatar } from "./components/ftabr26-person-avatar";
import { Ftabr26McoPanel } from "./components/ftabr26-mco-panel";
import { Ftabr26PersonDrawer } from "./components/ftabr26-person-drawer";
import { Ftabr26SoccermentFeature } from "./components/ftabr26-soccerment-feature";
import { Ftabr26PartnerHeader } from "./components/ftabr26-partner-header";

/* The ecosystem map pulls in d3 and the world topojson, neither of which any
   other section needs — it loads when the reader gets there. */
const Ftabr26EcosystemMap = lazy(() => import("./components/ftabr26-ecosystem-map"));

/* ── Atlas port shims ─────────────────────────────────────────────────────
   The STX page ran under wouter + react-query + a custom auth hook. In Atlas
   the page is rendered chrome-less behind ProtectedRoute, so the viewer is
   always authenticated. The figures, ecosystem rows and startups STX fetched
   live from /api/report/ftabr26/* are stored in reports.content (facts,
   ecosystem, startups); editorial copy is reports.content.<block> ?? default. */
// The STX-generated PDF, hosted in Supabase storage (public_bucket) like GSTER26's. `?download`
// makes Supabase serve it as an attachment — the HTML `download` attr is ignored cross-origin.
const FTABR26_PDF_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public_bucket/reports/FTABR26.pdf?download=FTABR26.pdf`;
function useAuthSession() { return { user: { id: "viewer" }, sessionValid: true, loading: false }; }
function AuthModal() { return null; }
const isPlainObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/* ── ftabr26 Mixpanel helper ──────────────────────────────────────────── */
function trackFT(event: string, props?: Record<string, any>) {
  if (window.location.pathname.startsWith("/report-preview")) return; // the admin editor's preview isn't a reader
  track(`ftabr26_${event}`, { report: "ftabr26", ...props });
}
gsap.registerPlugin(ScrollTrigger);


/* Partner-spotlight accent, the FTABR26 analogue of GSTER26's `peak` / `ngsc` */
const PARTNER_ACCENT = "#6c30ae";
/* Partner spotlights are hidden for now — flip to `true` to bring the section back */
const SHOW_PARTNERS = false;

/* Pitch green — the report's highlight colour. Accents only: pitch markings,
   card rules, table header bands and the Football Only data series. Body copy
   stays black, figures stay STX magenta, grey carries everything secondary. */
const PITCH       = BRAND.green;
const PITCH_LIGHT = BRAND.greenLight;
const PITCH_TINT  = "rgba(56,117,83,0.08)";
/* Featured company panel takes the company's own brand colour */
const FEAT_COL    = FTABR26_FEATURED_DEFAULT.brandColor;
const featLabel: React.CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: FEAT_COL, textTransform: "uppercase", margin: "0 0 8px" };

/* The two dealflow series read as pitch green against neutral grey */
const ONLY_COLOR = PITCH;
const ALSO_COLOR = BRAND.slate;

/* Audience colours, matching the report framework */
const SECTOR_COLOR: Record<"athletes" | "fans" | "execs", string> = {
  athletes: BRAND.athletes,
  fans:     BRAND.fans,
  execs:    BRAND.execs,
};
const SECTOR_LABEL: Record<"athletes" | "fans" | "execs", string> = {
  athletes: "For Athletes",
  fans:     "For Fans",
  execs:    "For Executives",
};

/* Continent ring colours for the innovator grid */
const CONTINENT_COLOR: Record<string, string> = {
  "Europe":        BRAND.fans,
  "North America": BRAND.pink,
  "South America": BRAND.execs,
  "Asia-Pacific":  BRAND.athletes,
  "Africa":        BRAND.teal,
};

/* Tinted card with an accent edge — the drawer bodies are built from these. */
const drawerCardStyle = (accent: string, isDark: boolean): React.CSSProperties => ({
  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14, padding: "14px 16px",
});

const fmt = formatFtabr26Money;

/* ─── Shared primitives (carried over from report-gster26.tsx) ─────────── */

function AccordionBody({ isOpen, windowWidth, children }: { isOpen: boolean; windowWidth: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [isOpen, windowWidth, children]);
  useEffect(() => {
    if (!ref.current || !isOpen) return;
    const ro = new ResizeObserver(() => {
      if (ref.current) setHeight(ref.current.scrollHeight);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [isOpen]);
  return (
    <div
      style={{
        maxHeight: isOpen ? height : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        overflowAnchor: "none" as const,
        transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useReveal(dep?: unknown) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("stx-visible"); }),
      { threshold: 0.08 }
    );
    const els = document.querySelectorAll(".stx-reveal");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [dep]);
}

function ParticleCanvas({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * (canvas.width || 800),
      y: Math.random() * (canvas.height || 600),
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.4 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(237,26,94,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(237,26,94,${0.05 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, [dark]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function AnimatedBar({ pct, color = PITCH, trackColor, delay = 0, isPdf = false }: { pct: number; color?: string; trackColor?: string; delay?: number; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setAnimated(true), delay); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, isPdf]);
  return (
    <div ref={ref} style={{ height: 6, background: trackColor || "rgba(190,208,227,0.15)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: animated ? `${pct}%` : "0%", background: `linear-gradient(to right,${color},${color}bb)`, borderRadius: 3, transition: isPdf ? "none" : "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

function ProgressRow({ label, value, pct, emoji, delay = 0, t, color, isPdf = false }: { label: string; value: string; pct: number; emoji?: React.ReactNode; delay?: number; t: Theme; color?: string; isPdf?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{emoji ? <>{emoji} </> : ""}{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 600 }}>{value}</span>
      </div>
      <AnimatedBar pct={pct} delay={delay} color={color} trackColor={t.border} isPdf={isPdf} />
    </div>
  );
}

const STAT_ICONS = {
  funding:   (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  fans:      (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  globe:     (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  trending:  (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  initiative:(c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>,
  ball:      (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m12 7 4.5 3.3-1.7 5.3h-5.6L7.5 10.3z" /><path d="M12 2v5M2.5 9l5 1.3M4.5 19l4.7-3.4M19.5 19l-4.7-3.4M21.5 9l-5 1.3" /></svg>,
};

function StatCard({ num, label, t, subtitle, style, icon }: { num: React.ReactNode; label: string; t: Theme; subtitle?: string; style?: React.CSSProperties; icon?: keyof typeof STAT_ICONS }) {
  return (
    <div className="stx-reveal"
      style={{ background: t.bgCard, padding: "36px 32px", position: "relative", overflow: "hidden", borderRadius: 14, border: `1px solid ${t.border}`, ...style }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${PITCH},${PITCH}88)` }} />
      {icon && <div style={{ position: "absolute", top: 20, right: 20, opacity: 0.16 }}>{STAT_ICONS[icon](PITCH)}</div>}
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(44px,4.5vw,64px)", color: BRAND.pink, lineHeight: 1 }}>{num}</div>
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.4 }}>{label}</div>
      {subtitle && <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}

/* ─── Charts ──────────────────────────────────────────────────────────────
   SplitBarChart is the Football Only / Football Also two-series stacked bar,
   adapted from GSTER26's MaStackedBarChart (same geometry, same animation,
   same label treatment) so both reports read as one system.
   ──────────────────────────────────────────────────────────────────────── */

type SplitDatum = { label: string; only: number; also: number; roundsOnly: number; roundsAlso: number };

function SplitBarChart({ data, mode, t, isPdf = false }: { data: SplitDatum[]; mode: "value" | "count"; t: Theme; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const isValue = mode === "value";
  const val = (d: SplitDatum) => isValue ? { a: d.only, b: d.also } : { a: d.roundsOnly, b: d.roundsAlso };
  const maxTotal = Math.max(...data.map(d => { const v = val(d); return v.a + v.b; }));
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 280, paddingBottom: 44, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
      {data.map((d, i) => {
        const v = val(d);
        const total = v.a + v.b;
        const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        const aPct = total > 0 ? (v.a / total) * 100 : 0;
        const bPct = total > 0 ? (v.b / total) * 100 : 0;
        const label = isValue ? fmt(total) : String(total);
        return (
          <div key={d.label}
            title={isValue
              ? `${d.label}: ${fmt(d.only)} football only + ${fmt(d.also)} football also`
              : `${d.label}: ${d.roundsOnly} football-only rounds + ${d.roundsAlso} football-also rounds`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", cursor: "default" }}>
            <div style={{ width: "100%", height: animated ? `${pct}%` : "0%", transition: `height 1.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`, position: "relative", minHeight: 4, borderRadius: "3px 3px 0 0", display: "flex", flexDirection: "column" }}>
              <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, whiteSpace: "nowrap", fontWeight: 700 }}>
                {label}
              </span>
              <div style={{ height: `${bPct}%`, background: `linear-gradient(to top,${ALSO_COLOR},${ALSO_COLOR}99)`, borderRadius: "3px 3px 0 0", minHeight: bPct > 0 ? 2 : 0 }} />
              <div style={{ height: `${aPct}%`, background: `linear-gradient(to top,${PITCH},${PITCH_LIGHT})`, borderRadius: bPct === 0 ? "3px 3px 0 0" : 0, minHeight: aPct > 0 ? 2 : 0 }} />
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, textAlign: "center" }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Donut for the sector-share splits */
function DonutChart({ slices, t, title, isPdf = false }: { slices: { label: string; pct: number; color: string }[]; t: Theme; title: string; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.25 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const R = 62, STROKE = 26, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", textAlign: "center" }}>{title}</div>
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={title}>
        <g transform="translate(85,85) rotate(-90)">
          {slices.map((s) => {
            const len = (s.pct / 100) * C;
            const dash = animated ? `${len} ${C - len}` : `0 ${C}`;
            const el = (
              <circle key={s.label} r={R} fill="none" stroke={s.color} strokeWidth={STROKE}
                strokeDasharray={dash} strokeDashoffset={-offset}
                style={{ transition: isPdf ? "none" : "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }} />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: t.textMuted, flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", color: BRAND.pink, fontWeight: 700 }}>{formatFtabr26Percent(s.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* INSIGHTS TABS + NAV                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

/* The Insights section is one article per theme, then the World Cup recap as
   a bonus tab. The PDF still prints the older ten-trend layout from
   FTABR26_TREND_GROUPS — see the note on FTABR26_INSIGHTS. */
const INSIGHT_TABS: { key: string; label: string; bonus?: true }[] = [
  ...FTABR26_INSIGHTS_DEFAULT.map(a => ({ key: a.key, label: a.label })),
  { key: "worldcup", label: "FIFA WC26 Recap", bonus: true },
];

/* World Cup tech, bucketed into its five categories for the accordion. Derived
   from module constants, so it is computed once at load rather than per render.
   Empty categories are dropped, which keeps the accordion honest if a category
   is ever emptied out of the data. */
const WORLDCUP_TECH_GROUPS: { category: string; items: WorldCupTech[] }[] =
  FTABR26_WORLDCUP_TECH_CATEGORIES_DEFAULT
    .map(category => ({ category, items: FTABR26_WORLDCUP_DEFAULT.tech.filter(item => item.category === category) }))
    .filter(group => group.items.length > 0);
/* One entry per section, matching report-gster26. The women's and World Cup
   features are reached through the Insights tab strip, not the nav.
   `activeDot` is a 1-based index into this array. */
const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "#trends",     label: "Insights" },
  { href: "#innovators", label: "Innovators" },
  { href: "#ecosystem",  label: "Startups to Watch" },
  { href: "#ecomap",     label: "Ecosystem" },
  { href: "#dealflow",   label: "Data in Full" },
];

/* Executive Summary ("THE NUMBERS THAT MATTER") is hidden for now. Flip to true
   to bring the section — and the divider that follows it — back. */
const SHOW_EXEC_SUMMARY = false;

/* ═══════════════════════════════════════════════════════════════════════ */
/* MAIN REPORT                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function ReportFTABR26({ content, preview = false }: {
  /** Content to render instead of fetching it — the admin editor's live preview passes its draft. */
  content?: Record<string, any> | null;
  preview?: boolean;
} = {}) {
  const pathname = usePathname();
  const isFtabr26 = pathname === "/reports/ftabr26";

  // ── DB-editable content (reports.content jsonb) ──────────────────────────
  // Each block renders `content.<block> ?? default`. An object block shallow-
  // merges over its default, so a field added later still renders for content
  // saved before it existed.
  const { data: reportDoc } = useSWR<{ content?: Record<string, any> | null }>(content !== undefined ? null : qk.reports.detail("ftabr26"));
  const ov = content !== undefined ? content : (reportDoc?.content ?? null);
  const pick = <T,>(key: string, def: T): T => {
    const v = ov?.[key];
    if (v === undefined || v === null) return def;
    return (isPlainObj(def) && isPlainObj(v) ? { ...def, ...v } : v) as T;
  };
  const FTABR26_HERO = pick("hero", FTABR26_HERO_DEFAULT);
  const FTABR26_ABOUT = pick("about", FTABR26_ABOUT_DEFAULT);
  const FTABR26_INSIGHTS = pick("insights", FTABR26_INSIGHTS_DEFAULT);
  const FTABR26_CREATOR_DEALS = pick("creatorDeals", FTABR26_CREATOR_DEALS_DEFAULT);
  const FTABR26_WOMENS_MCO_GROUPS = pick("womensMcoGroups", FTABR26_WOMENS_MCO_GROUPS_DEFAULT);
  const FTABR26_WORLDCUP = pick("worldcup", FTABR26_WORLDCUP_DEFAULT);
  const FTABR26_WORLDCUP_TECH_CATEGORIES = pick("worldcupTechCategories", FTABR26_WORLDCUP_TECH_CATEGORIES_DEFAULT);
  const FTABR26_STARTUPS_NOTE = pick("startupsNote", FTABR26_STARTUPS_NOTE_DEFAULT);
  const FTABR26_PARTNERS = pick("partners", FTABR26_PARTNERS_DEFAULT);
  const FTABR26_METHODOLOGY = pick("methodology", FTABR26_METHODOLOGY_DEFAULT);
  const FTABR26_FEATURED = pick("featured", FTABR26_FEATURED_DEFAULT);
  const FTABR26_INNOVATORS = pick("innovators", FTABR26_INNOVATORS_DEFAULT);
  const FTABR26_PLAYMAKER_COMPANIES = pick("playmakerCompanies", FTABR26_PLAYMAKER_COMPANIES_DEFAULT);
  const FTABR26_QUESTIONS = pick("questions", FTABR26_QUESTIONS_DEFAULT);
  const FTABR26_SOCCERMENT = pick("soccerment", FTABR26_SOCCERMENT_DEFAULT);
  // Derived from the blocks above (module-level twins read the defaults).
  const INSIGHT_TABS: { key: string; label: string; bonus?: true }[] = [
    ...FTABR26_INSIGHTS.map(a => ({ key: a.key, label: a.label })),
    { key: "worldcup", label: "FIFA WC26 Recap", bonus: true },
  ];
  const WORLDCUP_TECH_GROUPS: { category: string; items: WorldCupTech[] }[] =
    FTABR26_WORLDCUP_TECH_CATEGORIES
      .map(category => ({ category, items: (FTABR26_WORLDCUP.tech ?? []).filter(item => item.category === category) }))
      .filter(group => group.items.length > 0);
  const FEAT_COL = FTABR26_FEATURED.brandColor;
  const featLabel: React.CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: FEAT_COL, textTransform: "uppercase", margin: "0 0 8px" };
  const isPdf = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pdf") === "true";
  const { user, sessionValid, loading: authLoading } = useAuthSession();
  const isAuthenticated = !authLoading && !!user && sessionValid;
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (isPdf) return; // skip auth in PDF mode
    if (!isFtabr26) return;
    if (authLoading) return;
    setShowAuthModal(!isAuthenticated);
  }, [isFtabr26, authLoading, isAuthenticated, isPdf]);

  useEffect(() => { trackFT("page_view"); }, []);

  /* Track all external link clicks within the report */
  const reportContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = reportContainerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (anchor && anchor.hostname !== window.location.hostname) {
        trackFT("external_link_click", { url: anchor.href, text: anchor.textContent?.slice(0, 60) });
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, []);

  const lenisRef       = useRef<Lenis | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const navRef         = useRef<HTMLElement>(null);
  const skewWrapRef    = useRef<HTMLDivElement>(null);

  /* The admin editor's preview aims at a part (`ftabr26:jump`); Lenis owns the
     scroll position, so the jump goes through it. */
  useEffect(() => {
    const onJump = (e: Event) => {
      const el = document.querySelector((e as CustomEvent<string>).detail);
      if (!el) return;
      if (lenisRef.current) lenisRef.current.scrollTo(el as HTMLElement, { offset: -72, immediate: true });
      else (el as HTMLElement).scrollIntoView({ block: "start" });
    };
    window.addEventListener("ftabr26:jump", onJump);
    return () => window.removeEventListener("ftabr26:jump", onJump);
  }, []);

  const authGateActive = isPdf ? false : (isFtabr26 && showAuthModal);

  useEffect(() => {
    if (!authGateActive) {
      lenisRef.current?.start();
      return;
    }
    lenisRef.current?.stop();
    const blockScroll = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      lenisRef.current?.start();
    };
  }, [authGateActive]);

  /* ── UI state ─────────────────────────────────────────────────────── */
  const [isDark, _setIsDark] = useState(false);
  const setIsDark = (v: boolean | ((d: boolean) => boolean)) => { _setIsDark(v); trackFT("theme_toggle"); };
  const [mobileMenuOpen, _setMobileMenuOpen] = useState(false);
  const setMobileMenuOpen = (v: boolean | ((o: boolean) => boolean)) => { _setMobileMenuOpen(v); trackFT("mobile_menu_toggle"); };

  const [insightsTab, _setInsightsTab] = useState<string>(FTABR26_INSIGHTS[0].key);
  const setInsightsTab = (v: string) => { _setInsightsTab(v); trackFT("tab_switch", { tab: "insights", value: v }); };
  /* World Cup tech is grouped into five category accordions, one open at a
     time. All start closed so the section opens as a compact five-row index of
     the categories rather than leading with one category's cards. */
  const [expandedWcCategory, _setExpandedWcCategory] = useState<string | null>(null);
  const setExpandedWcCategory = (v: string | null) => { _setExpandedWcCategory(v); if (v) trackFT("wc_category_expand", { category: v }); };


  const [ecoTab, _setEcoTab] = useState<"initiatives" | "accelerators">("initiatives");
  const setEcoTab = (v: "initiatives" | "accelerators") => { _setEcoTab(v); trackFT("tab_switch", { tab: "ecosystem", value: v }); };
  /* Continent picked on the ecosystem map; null is the whole world. */
  const [ecoRegion, _setEcoRegion] = useState<Ftabr26ContinentId | null>(null);
  const setEcoRegion = (v: Ftabr26ContinentId | null) => {
    _setEcoRegion(v);
    trackFT(v ? "ecomap_continent_click" : "ecomap_continent_clear", { continent: v ?? undefined });
  };

  const [dataTab, _setDataTab] = useState<"investment" | "leaderboards">("investment");
  const setDataTab = (v: "investment" | "leaderboards") => { _setDataTab(v); trackFT("tab_switch", { tab: "data_in_full", value: v }); };
  const [chartMode, _setChartMode] = useState<"value" | "count">("value");
  const setChartMode = (v: "value" | "count") => { _setChartMode(v); trackFT("chart_mode_switch", { mode: v }); };
  const [leaderCat, _setLeaderCat] = useState<"only" | "also">("only");
  const setLeaderCat = (v: "only" | "also") => { _setLeaderCat(v); trackFT("filter", { filter: "category", value: v }); };
  const [leaderWindow, _setLeaderWindow] = useState<"allTime" | "recent">("allTime");
  const setLeaderWindow = (v: "allTime" | "recent") => { _setLeaderWindow(v); trackFT("filter", { filter: "window", value: v }); };
  /* Ranks 6-10 of the country and city boards start collapsed, keyed by board
     so the two sides open independently. The category and window toggles leave
     the state alone: a reader who opened the long list wants it to stay open
     while comparing 'Football Only' against 'Football Also'. */
  const [leaderExpanded, _setLeaderExpanded] = useState<Record<string, boolean>>({});
  const toggleLeaderExpanded = (board: string) => {
    _setLeaderExpanded(prev => {
      const next = !prev[board];
      if (next) trackFT("leaderboard_expand", { board, category: leaderCat, window: leaderWindow });
      return { ...prev, [board]: next };
    });
  };

  const [selectedInnovator, _setSelectedInnovator] = useState<FtabrInnovator | null>(null);
  const setSelectedInnovator = (v: FtabrInnovator | null) => {
    _setSelectedInnovator(v);
    if (v) trackFT("innovator_click", { name: v.name });
  };

  const [activeDot, setActiveDot] = useState(0);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const t: Theme = isDark ? DARK : LIGHT;

  /* Live facts, falling back field-by-field to the committed constants
     (client/src/lib/ftabr26-live.ts) so a failed fetch degrades to the last
     good snapshot rather than blanking a section. queryKey[0] is the URL —
     the global default fetcher in lib/queryClient.ts handles the rest. */
  // Figures as published (the STX endpoint's payload, stored with the report).
  // Missing fields fall back to the committed snapshot in ftabr26-facts-data.
  const liveFacts: Ftabr26Facts | undefined = ov?.facts ?? undefined;
  const factsLoading = content === undefined && !reportDoc;


  /* Ecosystem rows — whatever is flagged in_ftabr26 across the initiatives,
     programs and events master tables. Same public-endpoint/explicit-fetcher
     shape as the facts query above, and it degrades to the committed lists. */
  const liveEco: Ftabr26Ecosystem | undefined = ov?.ecosystem ?? undefined;
  const eco = useMemo(() => resolveFtabr26Ecosystem(liveEco), [liveEco]);

  /* What the tables show: the whole world, or one continent once the map is
     used. A row the master tables leave unplaceable matches no continent, so
     it appears only in the unfiltered view — the map footnotes how many. */
  const ecoShown = useMemo(() => {
    if (!ecoRegion) return eco;
    const only = (rows: Ftabr26EcosystemEntry[]) => rows.filter(r => ecoContinent(r) === ecoRegion);
    return {
      ...eco,
      initiatives: only(eco.initiatives),
      programs: only(eco.programs),
    };
  }, [eco, ecoRegion]);

  /* Land the reader on a tab that has rows. Set without tracking — the reader
     did not pick this. */
  useEffect(() => {
    if (!ecoRegion) return;
    const sizes = {
      initiatives: ecoShown.initiatives.length,
      accelerators: ecoShown.programs.length,
    } as const;
    if (sizes[ecoTab] > 0) return;
    const next = (["initiatives", "accelerators"] as const).find(k => sizes[k] > 0);
    if (next) _setEcoTab(next);
  }, [ecoRegion, ecoShown, ecoTab]);

  /* Startups to watch — the companies flagged in_ftabr26 in sm_test. Same
     shape again, degrading to the committed snapshot of the same flag. */
  const liveStartups: { startups: Ftabr26Startup[] } | undefined = ov?.startups ?? undefined;
  const watch = useMemo(() => resolveFtabr26Startups(liveStartups), [liveStartups]);
  /* Startups to Watch shows only the Playmakers companies, A–Z, joined to the
     startups feed for description, sector, logo and site. A company missing
     from the feed still renders, from the roster's own name and country. */
  const watchStartups = useMemo<Ftabr26Startup[]>(() => {
    const index = indexFtabr26Startups(watch.startups);
    return FTABR26_PLAYMAKER_COMPANIES.map(pc =>
      lookupFtabr26Startups(index, pc.startupKeys)[0] ??
        { name: pc.company, website: null, country: pc.country, description: null, sector: null, logoUrl: null },
    ).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }, [watch.startups]);

  const facts = useMemo(
    () => resolveFtabr26Facts(liveFacts, fmt, eco.initiatives.length),
    [liveFacts, eco.initiatives.length],
  );
  const dealflowCopy = useMemo(() => buildFtabr26DealflowCopy(facts), [facts]);

  useReveal(`${isDark}-${insightsTab}-${watchStartups.length}-${ecoTab}-${dataTab}-${chartMode}-${leaderCat}-${leaderWindow}-${factsLoading}-${eco.isLive}`);

  /* Freeze the page behind an open drawer. Lenis drives scrolling here, so a
     body overflow lock would not hold it. */
  useEffect(() => {
    if (!selectedInnovator) return;
    lenisRef.current?.stop();
    return () => { lenisRef.current?.start(); };
  }, [selectedInnovator]);

  /* ── Lenis + GSAP ScrollTrigger: smooth scroll + scroll-driven effects ── */
  useEffect(() => {
    if (isPdf) return; // skip animations in PDF mode
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      touchMultiplier: 1.2,
      wheelMultiplier: 0.85,
      overscroll: false,
    });
    lenisRef.current = lenis;

    const lenisRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value?: number) {
        if (arguments.length && value !== undefined) lenis.scrollTo(value, { immediate: true });
        return lenis.animatedScroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      pinType: "fixed",
    });
    const onSTRefresh = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", onSTRefresh);
    ScrollTrigger.refresh();

    const getSections = () =>
      NAV_ITEMS.map(n => document.querySelector(n.href) as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];

    const getActiveIdx = () => {
      const sections = getSections();
      let idx = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.4) idx = i + 1;
      }
      return idx;
    };

    let lastDotIdx = -1;
    lenis.on("scroll", ({ progress }: { scroll: number; progress: number; direction: number }) => {
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${progress})`;
      if (navRef.current) navRef.current.style.transform = "translateY(0)";
      const dotIdx = getActiveIdx();
      if (dotIdx !== lastDotIdx) { lastDotIdx = dotIdx; setActiveDot(dotIdx); }
      ScrollTrigger.update();
    });

    /* Horizontal swipe / trackpad pan → vertical section jump */
    let jumping = false;
    const jumpSection = (delta: number) => {
      if (jumping) return;
      jumping = true;
      const sections = getSections();
      const nextIdx = getActiveIdx() + delta;
      if (nextIdx <= 0) {
        lenis.scrollTo(0, { duration: 1.4, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
      } else if (nextIdx <= sections.length) {
        lenis.scrollTo(sections[nextIdx - 1], { offset: -72, duration: 1.4, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
      }
      setTimeout(() => { jumping = false; }, 1100);
    };

    let hAccum = 0;
    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX > absY && absX > 8) {
        e.preventDefault();
        hAccum += e.deltaX;
        if (Math.abs(hAccum) > 60) { jumpSection(hAccum > 0 ? 1 : -1); hAccum = 0; }
      } else { hAccum = 0; }
    };

    let touchX = 0, touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = touchX - e.changedTouches[0].clientX;
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 70) jumpSection(dx > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      ScrollTrigger.removeEventListener("refresh", onSTRefresh);
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isPdf]);

  /* Inject page-scoped animation styles */
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "stx-report-styles";
    style.textContent = `
      .stx-reveal { opacity:1; transform:none; }
      .stx-visible { opacity:1!important; transform:none!important; }
      .stx-scroll-line { animation:stxPulse 2s infinite; }
      @keyframes stxPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      .stx-trend-card:hover { border-color:${PITCH}!important; }
      .stx-nav-link:hover { color:${BRAND.pink}!important; }
      .stx-toggle { cursor:pointer; user-select:none; transition: opacity 0.2s; } .stx-toggle:hover { opacity: 0.7; } .stx-toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 6px; }
      @media (max-width: 639px) {
        .stx-nav-links { display:none!important; }
        .stx-nav-hub { display:none!important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("stx-report-styles")?.remove();
  }, []);

  /* Headings and body copy sit in black on light, white on dark */
  const titleCol = isDark ? t.titleColor : BRAND.black;

  /* ── Section header helpers ───────────────────────────────────────── */
  const sectionLabel = (text: string) => (
    <p style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 5, color: BRAND.pink, textTransform: "uppercase", marginBottom: 14 }}
      className="text-[20px]">
      <span aria-hidden style={{ width: 26, height: 4, background: PITCH, borderRadius: 2, flexShrink: 0 }} />
      {text}
    </p>
  );
  const sectionTitle = (text: string, size = "clamp(42px,6vw,88px)") => (
    <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: titleCol, whiteSpace: "pre-line" }}>{text}</h2>
  );
  const blockHeader = (text: string, size = "clamp(26px,3vw,40px)") => (
    <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: titleCol, margin: 0 }}>{text}</h3>
  );
  /* Section break drawn as a halfway line with a centre spot */
  const pitchDivider = (
    <div aria-hidden style={{ position: "relative", height: 1, background: `linear-gradient(to right,transparent,${PITCH}66,transparent)` }}>
      <span style={{ position: "absolute", left: "50%", top: -4, width: 9, height: 9, borderRadius: "50%", border: `1px solid ${PITCH}99`, transform: "translateX(-50%)" }} />
    </div>
  );

  /* ── Insights: graphic column ── */
  /* Photo collage: the first image full width, the rest side by side under it. */
  const imageCollage = (images: { src: string; alt: string }[]) => {
    const [lead, ...rest] = images;
    const tile = (img: { src: string; alt: string }, ratio: string) => (
      <img key={img.src} src={img.src} alt={img.alt} loading="lazy"
        style={{ display: "block", width: "100%", aspectRatio: ratio, objectFit: "cover", borderRadius: 10, border: `1px solid ${t.border}` }} />
    );
    return (
      <div style={{ display: "grid", gap: isMobile ? 8 : 10 }}>
        {tile(lead, "16 / 9")}
        {rest.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${rest.length},minmax(0,1fr))`, gap: isMobile ? 8 : 10 }}>
            {rest.map(img => tile(img, "4 / 3"))}
          </div>
        )}
      </div>
    );
  };

  const creatorDeals = (
    <div style={{ background: t.bgSec, border: `1px solid ${t.border}`, borderRadius: 12, padding: isMobile ? "18px 16px" : "22px 24px" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", color: BRAND.pink, marginBottom: 6 }}>
        Creators with live rights
      </div>
      {FTABR26_CREATOR_DEALS.map((d, i) => (
        <div key={d.date + d.creator} style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", columnGap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${t.border}` }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 0.6, color: t.textMuted, paddingTop: 2 }}>{d.date}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: titleCol }}>{d.creator}</span>
              <span style={{ fontSize: 11.5, color: PITCH, fontWeight: 600 }}>{d.event}</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.5, color: t.textMuted }}>{d.what}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const insightGraphic = (a: InsightArticle) => {
    const g = a.graphic;
    if (!g) return null;
    if (g.kind === "collage") return imageCollage(g.images);
    if (g.kind === "creator-deals") return creatorDeals;
    if (g.kind === "mco") {
      return (
        <Ftabr26McoPanel dense
          groups={FTABR26_WOMENS_MCO_GROUPS}
          t={t} isDark={isDark} isMobile={isMobile} width={windowWidth} titleCol={titleCol}
        />
      );
    }
    return <img src={g.src} alt={g.alt} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 12, border: `1px solid ${t.border}` }} />;
  };

  /* One Insights article: copy left, graphic right, "Our take" underneath.
     Stacks on mobile; runs full width when the article has no graphic. */
  const insightArticle = (a: InsightArticle) => {
    const graphic = insightGraphic(a);
    return (
      <div key={a.key} style={{ marginBottom: isPdf ? 48 : 0 }}>
      <div className="stx-reveal" style={{ marginBottom: 32 }}>
        {blockHeader(a.heading)}
        <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: t.text }}>{a.description}</p>
      </div>
      <article className="stx-reveal" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: isMobile ? "22px 18px" : "36px 38px" }}>
        {/* The title spans the box; the graphic then starts level with the
            first paragraph. */}
        {blockHeader(a.title, "clamp(24px,2.6vw,34px)")}
        <div style={{ display: "grid", gridTemplateColumns: isMobile || !graphic ? "1fr" : "minmax(0,1fr) minmax(0,1fr)", gap: isMobile ? 24 : 40, alignItems: "start", marginTop: isMobile ? 16 : 24 }}>
          <div>
            {a.body.map((para, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "16px 0 0", fontSize: 15, lineHeight: 1.85, color: t.text }}>{para}</p>
            ))}
          </div>
          {graphic && <div>{graphic}</div>}
        </div>

        {a.take && (
          <div style={{ marginTop: isMobile ? 24 : 32, paddingTop: isMobile ? 20 : 26, borderTop: `1px solid ${t.border}` }}>
            <div style={{ borderLeft: `4px solid ${BRAND.pink}`, paddingLeft: isMobile ? 14 : 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: BRAND.pink, lineHeight: 1 }}>Our take</div>
              <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.85, color: t.text }}>{a.take}</p>
            </div>
          </div>
        )}

        {a.sources && a.sources.length > 0 && (
          <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
            {a.sources.map(src => (
              <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1.2, color: BRAND.pink, textDecoration: "none", textTransform: "uppercase", borderBottom: `1px solid ${BRAND.pink}55`, paddingBottom: 2 }}>
                {src.label} ↗
              </a>
            ))}
          </div>
        )}
      </article>
      </div>
    );
  };
  /* Closing returns focus to the tile that opened the drawer, so keyboard
     users are not dropped at the top of the document. */
  const closeDrawer = (tileId: string, clear: (v: null) => void) => {
    clear(null);
    requestAnimationFrame(() => document.getElementById(tileId)?.focus());
  };

  /* Roster legend, derived from the colour map so the two cannot drift. */
  const rosterLegend = (colors: Record<string, string>) => (
    <div className="stx-reveal" style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 36, marginBottom: 28 }}>
      {Object.entries(colors).map(([label, color]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>{label}</span>
        </div>
      ))}
    </div>
  );

  /* One roster tile — ringed photo, name, company. Both rosters share it. */
  const rosterTile = ({ id, name, company, photoUrl, ring, isSelected, onClick }: {
    id: string; name: string; company: string; photoUrl?: string;
    ring: string; isSelected: boolean; onClick: () => void;
  }) => (
    <button key={id} id={id} type="button" className="stx-reveal" onClick={onClick}
      aria-haspopup="dialog" aria-expanded={isSelected}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
      }}
      /* The glow belongs on the round ring — the avatar's outer wrapper is
         square, so lighting that up would halo the tile as a box. */
      onMouseEnter={e => { const r = e.currentTarget.querySelector("[data-ring]") as HTMLElement | null; if (r) { r.style.boxShadow = `0 0 30px ${ring}88`; r.style.transform = "scale(1.06)"; } }}
      onMouseLeave={e => { const r = e.currentTarget.querySelector("[data-ring]") as HTMLElement | null; if (r) { r.style.boxShadow = `0 0 18px ${ring}44`; r.style.transform = "scale(1)"; } }}>
      <Ftabr26PersonAvatar name={name} photoUrl={photoUrl} color={ring}
        size={isMobile ? 80 : 108} ringWidth={3} ringGap={3} glow />
      <div>
        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 13 : 15, color: t.text, lineHeight: 1.1, margin: "0 0 3px", letterSpacing: 0.4 }}>{name}</p>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1, color: ring, lineHeight: 1.3, textTransform: "uppercase", margin: 0 }}>{company}</p>
      </div>
    </button>
  );

  const noteText = (text: string) => (
    <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.8, margin: "16px 0 40px" }}>{text}</p>
  );

  /* Derived chart inputs */
  const yearSplitData: SplitDatum[] = useMemo(
    () => facts.byYear.map(r => ({ label: r.year, only: r.footballOnly, also: r.footballAlso, roundsOnly: r.roundsOnly, roundsAlso: r.roundsAlso })),
    [facts.byYear]
  );
  const regionSplitData: SplitDatum[] = useMemo(
    () => facts.byRegion.map(r => ({ label: r.region, only: r.footballOnly, also: r.footballAlso, roundsOnly: r.roundsOnly, roundsAlso: r.roundsAlso })),
    [facts.byRegion]
  );

  const leaderKey = `${leaderCat}${leaderWindow === "allTime" ? "AllTime" : "Recent"}` as
    "onlyAllTime" | "onlyRecent" | "alsoAllTime" | "alsoRecent";
  const countryRows: LeaderRow[] = facts.topCountries[leaderKey];
  const cityRows: LeaderRow[] = facts.topCities[leaderKey];
  const companyRows: CompanyRow[] = leaderCat === "only" ? facts.topCompaniesOnly : facts.topCompaniesAlso;

  const CAT_LABEL = { only: "Football Only", also: "Football Also" } as const;

  const jumpTo = (href: string, label: string, mobile = false) => {
    trackFT("nav_click", { section: label, mobile });
    if (mobile) setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) lenisRef.current?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
  };

  return (
    <div ref={reportContainerRef} style={{ background: t.bg, color: t.text, fontFamily: "'Open Sans','system-ui',sans-serif", overflowX: "hidden", minHeight: "100vh", transition: "background 0.35s, color 0.35s" }}>
      {/* ── READING PROGRESS ────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 101, background: "transparent", display: (authGateActive || isPdf) ? "none" : "block" }}>
        <div ref={progressBarRef} style={{ height: "100%", background: BRAND.pink, transform: "scaleX(0)", transformOrigin: "left center" }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav ref={navRef} style={{ position: "fixed", top: 3, left: 0, right: 0, zIndex: 100, padding: isMobile ? "12px 16px" : "16px 40px", display: (authGateActive || isPdf) ? "none" : "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)", background: t.navBg, borderBottom: `1px solid ${t.divider}`, gap: 16, transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)", willChange: "transform" }}>
        <a href="https://atlas.sportstechx.com" target="_blank" rel="noopener noreferrer" style={{ lineHeight: 0, flexShrink: 0 }}>
          <img src={isDark ? "/landing/atlas-wordmark-white.svg" : "/landing/atlas-wordmark-dark.svg"} alt="Atlas" style={{ height: isMobile ? 26 : 34, display: "block" }} />
        </a>
        {!isMobile && (
          <div className="stx-nav-links" style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {NAV_ITEMS.map(({ href, label }, i) => {
              const isActive = activeDot === i + 1;
              return (
                <a key={href} href={href} className="stx-nav-link"
                  style={{
                    fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                    color: isActive ? BRAND.pink : t.textMuted,
                    textDecoration: "none", transition: "color 0.2s",
                    fontWeight: 500, paddingBottom: 4,
                    borderBottom: isActive ? `2px solid ${BRAND.pink}` : "2px solid transparent",
                  }}
                  onClick={(e) => { e.preventDefault(); jumpTo(href, label); }}>
                  {label}
                </a>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", flexShrink: 0 }}>
          <button className="stx-toggle" onClick={() => setIsDark((d: boolean) => !d)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background: "none", border: "none", padding: 6, color: BRAND.pink, display: "flex", alignItems: "center", lineHeight: 0 }}>
            {isDark ? <SunMedium size={isMobile ? 18 : 20} strokeWidth={1.75} /> : <MoonStar size={isMobile ? 18 : 20} strokeWidth={1.75} />}
          </button>
          {isMobile ? (
            <button onClick={() => setMobileMenuOpen(o => !o)}
              style={{ background: "none", border: `1px solid ${BRAND.pink}`, borderRadius: 8, padding: "5px 8px", color: BRAND.pink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : (
            <>
              <a href={FTABR26_PDF_URL} download="FTABR26.pdf"
                style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#fff", background: BRAND.pink, border: `1px solid ${BRAND.pink}`, padding: "6px 14px", textDecoration: "none", textTransform: "uppercase", transition: "opacity 0.2s", borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onClick={() => trackFT("nav_click", { section: "pdf_download" })}
              >↓ Download PDF</a>
            </>
          )}
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 52, left: 0, right: 0, zIndex: 99,
          maxHeight: mobileMenuOpen ? 400 : 0, opacity: mobileMenuOpen ? 1 : 0, overflow: "hidden",
          background: t.navBg, backdropFilter: "blur(20px)", borderBottom: mobileMenuOpen ? `1px solid ${t.divider}` : "none",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
          display: authGateActive ? "none" : undefined,
        }}>
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map(({ href, label }) => (
              <a key={href} href={href}
                style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: t.textMuted, textDecoration: "none", padding: "10px 0", borderBottom: `1px solid ${t.divider}`, fontFamily: "'DM Mono',monospace", transition: "color 0.2s" }}
                onClick={(e) => { e.preventDefault(); jumpTo(href, label, true); }}>
                {label}
              </a>
            ))}
            <a href={FTABR26_PDF_URL} download="FTABR26.pdf" onClick={() => { trackFT("nav_click", { section: "pdf_download", mobile: true }); setMobileMenuOpen(false); }} style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#fff", background: BRAND.pink, textDecoration: "none", padding: "10px 14px", fontFamily: "'DM Mono',monospace", fontWeight: 600, borderRadius: 4, display: "inline-block", marginTop: 4 }}>↓ Download PDF</a>
          </div>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section id="stx-hero" style={{ minHeight: isPdf ? "auto" : "100vh", height: isPdf ? "auto" : (isMobile ? "100svh" : "100vh"), position: "relative", display: "flex", alignItems: "center", overflow: "hidden", background: isDark ? "#0c0f1a" : BRAND.darkTitle, margin: 0, padding: isPdf ? "60px 0" : 0, width: "100%" }}>
        <ParticleCanvas dark={isDark} />
        <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(12,15,26,0.6) 100%)" : "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(45,59,73,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: "38%", width: 2, height: "140%", background: "linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.15) 50%, transparent 90%)", transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: "42%", width: 1, height: "140%", background: "linear-gradient(to bottom, transparent 15%, rgba(237,26,94,0.08) 50%, transparent 85%)", transform: "rotate(12deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: "50%", height: "60%", background: "radial-gradient(ellipse, rgba(237,26,94,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Pitch markings — the football signature, drawn in pitch green */}
        <svg aria-hidden viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <g fill="none" stroke={PITCH_LIGHT} strokeWidth="2" opacity="0.28">
            <line x1="600" y1="-40" x2="600" y2="840" />
            <circle cx="600" cy="400" r="150" />
            <rect x="-180" y="230" width="330" height="340" />
            <rect x="-180" y="320" width="150" height="160" />
            <rect x="1050" y="230" width="330" height="340" />
            <rect x="1230" y="320" width="150" height="160" />
          </g>
          <circle cx="600" cy="400" r="6" fill={PITCH_LIGHT} opacity="0.4" />
        </svg>

        <div ref={heroContentRef} style={{
          position: "relative", zIndex: 2, width: "100%", maxWidth: 1360, margin: "0 auto",
          padding: isMobile ? "0px 20px" : "120px 48px 80px",
          display: "flex", alignItems: isMobile ? "center" : "flex-start", justifyContent: isMobile ? "center" : undefined, gap: isMobile ? 0 : 64,
          flexDirection: isMobile ? "column" : "row", willChange: "transform",
        }}>
          <div style={{ flex: isMobile ? "none" : "1 1 auto", maxWidth: isMobile ? "100%" : "50%" }}>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? "clamp(56px,15vw,88px)" : "clamp(64px,7vw,118px)", lineHeight: 0.92, letterSpacing: -1, margin: 0 }}>
              <span style={{ display: "block", background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                FOOTBALL
              </span>
              <span style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                TECH &amp; BUSINESS
              </span>
              <span style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                REPORT{" "}
                <span style={{ background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2026</span>
              </span>
            </h1>
            <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
              <div style={{ width: 48, height: 3, background: `linear-gradient(to right,${BRAND.pink},#ff6b9d)`, borderRadius: 2 }} />
              <div style={{ width: 24, height: 3, background: PITCH_LIGHT, borderRadius: 2 }} />
            </div>
            <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", marginTop: 16, maxWidth: 560 }}>
              {FTABR26_HERO.standfirst}
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 28, marginTop: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>Presented by</span>
                <img src="/landing/atlas-wordmark-white.svg" alt="SportsTechX" style={{ height: 33, opacity: 0.9 }} />
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(190,208,227,0.2)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>{FTABR26_HERO.edition}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#fff", letterSpacing: 1, lineHeight: 1.2 }}>{FTABR26_HERO.hashtag}</span>
              </div>
            </div>
          </div>

          {!isMobile && <div style={{ flex: "0 1 580px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, minWidth: 0 }}>
            {facts.summary.map((card, i) => (
              <div key={i} style={{
                padding: "26px 24px 22px", borderRadius: 12,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                borderTop: `3px solid ${PITCH}`,
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
              }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,3.5vw,50px)", color: BRAND.pink, lineHeight: 1 }}>{card.num}</div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: isDark ? t.titleColor : BRAND.black, lineHeight: 1.4 }}>{card.label}</div>
                {card.subtitle && <div style={{ marginTop: 6, fontSize: 11, color: isDark ? t.textMuted : BRAND.slate, lineHeight: 1.5 }}>{card.subtitle}</div>}
              </div>
            ))}
          </div>}
        </div>
      </section>

      {/* ── Mobile Summary Cards (separate section, horizontal rows) ────── */}
      {isMobile && (
        <section style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#0c0f1a" : BRAND.darkTitle, padding: "40px 16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.04 : 0.06, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", height: "calc(100svh - 140px)", display: "flex", flexDirection: "column", gap: 10 }}>
            {facts.summary.map((card, i) => (
              <div key={i} style={{
                padding: "20px 18px", borderRadius: 10,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                borderLeft: `3px solid ${PITCH}`,
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", gap: 14,
                flex: 1, minHeight: 0,
              }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: BRAND.pink, lineHeight: 1, flexShrink: 0, minWidth: 62 }}>{card.num}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? t.titleColor : BRAND.black, lineHeight: 1.4 }}>{card.label}</div>
                  {card.subtitle && <div style={{ fontSize: 10, color: isDark ? t.textMuted : BRAND.slate, lineHeight: 1.4, marginTop: 2 }}>{card.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div ref={skewWrapRef} style={{ willChange: "transform", transformOrigin: "center top", position: "relative", zIndex: 1 }}>

      {/* ── ABOUT / EXECUTIVE SUMMARY ───────────────────────────────────── */}
      {SHOW_EXEC_SUMMARY && (<>
      <div id="facts" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Executive Summary")}
            {sectionTitle("THE NUMBERS THAT\nMATTER")}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>{FTABR26_ABOUT}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: isMobile ? 14 : 20, marginTop: 48 }}>
            {facts.summary.map((s, i) => (
              <StatCard key={i} num={s.num} label={s.label} subtitle={s.subtitle} t={t}
                icon={(["funding", "fans", "globe", "trending", "initiative", "ball"] as const)[i % 6]} />
            ))}
          </div>
        </div>
      </div>

      {pitchDivider}
      </>)}

      {/* ── INSIGHTS: TOP TRENDS + FEATURE PANELS ───────────────────────── */}
      <div id="trends" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0", position: "relative", overflow: "hidden" }}>
        {/* Centre circle, cropped off the right edge — Business article only */}
        {(isPdf || insightsTab === "business") && (
          <div aria-hidden style={{ position: "absolute", top: "-20%", right: "-5%", width: "clamp(240px,32vw,420px)", height: "clamp(240px,32vw,420px)", borderRadius: "50%", border: `2px solid ${PITCH}22`, pointerEvents: "none" }} />
        )}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Insights")}
            {sectionTitle("TOP TRENDS")}
          </div>

          {/* Tab switcher: three theme articles, then the bonus World Cup recap */}
          <div style={{ display: "flex", flexWrap: "nowrap", marginTop: 40, marginBottom: 32, borderBottom: `2px solid ${t.border}`, overflowX: "auto" }}>
            {INSIGHT_TABS.map(tab => {
              const active = insightsTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setInsightsTab(tab.key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 12px 10px" : "10px 22px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {tab.bonus && (
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.6, fontWeight: 700, color: "#fff", background: BRAND.pink, borderRadius: 999, padding: "3px 8px 2px", marginRight: 10, verticalAlign: "middle", position: "relative", top: -2 }}>BONUS</span>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {FTABR26_INSIGHTS.filter(a => isPdf || a.key === insightsTab).map(insightArticle)}

          {/* ── Feature panel: FIFA World Cup 2026 recap ──────────────────── */}
          {(isPdf || insightsTab === "worldcup") && (
            <div>
              <div className="stx-reveal" style={{ marginBottom: 32 }}>
                {blockHeader(FTABR26_WORLDCUP.title)}
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(16px,1.8vw,22px)", color: BRAND.pink, letterSpacing: 1, margin: "10px 0 0" }}>{FTABR26_WORLDCUP.standfirst}</p>
                <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.9, color: t.text }}>{FTABR26_WORLDCUP.intro}</p>
              </div>

              {/* Headline + supporting stats */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr 1fr 1fr", gap: isMobile ? 14 : 18 }}>
                <div className="stx-reveal" style={{ background: isDark ? t.bgCard : PITCH_TINT, border: `1px solid ${PITCH}44`, borderLeft: `4px solid ${PITCH}`, borderRadius: 14, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(48px,5vw,72px)", color: BRAND.pink, lineHeight: 1 }}>{FTABR26_WORLDCUP.headline.value}</div>
                  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: t.text }}>{FTABR26_WORLDCUP.headline.label}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>{FTABR26_WORLDCUP.headline.sublabel}</div>
                </div>
                {FTABR26_WORLDCUP.stats.map(s => (
                  <StatCard key={s.label} num={s.value} label={s.label} subtitle={s.sublabel} t={t} style={{ padding: "32px 26px" }} />
                ))}
              </div>

              {/* Tech grid */}
              <div style={{ marginTop: 40 }} className="stx-reveal">
                <div style={{ marginBottom: 24 }}>
                  {blockHeader(FTABR26_WORLDCUP.techHeading.toUpperCase())}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {WORLDCUP_TECH_GROUPS.map(group => {
                    const col = WORLDCUP_TECH_COLORS[group.category] ?? PITCH;
                    const isOpen = isPdf || expandedWcCategory === group.category;
                    return (
                      <div key={group.category} className="stx-reveal"
                        style={{ background: t.bgCard, border: `1px solid ${isOpen ? col : t.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s" }}>
                        <button
                          onClick={() => setExpandedWcCategory(isOpen && !isPdf ? null : group.category)}
                          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: isMobile ? "18px 18px" : "22px 30px", display: "flex", alignItems: "center", gap: isMobile ? 12 : 18, color: "inherit" }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 0.6, lineHeight: 1.1, color: titleCol }}>{group.category.toUpperCase()}</span>
                          <span style={{ flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1.4, color: t.textMuted }}>{group.items.length}</span>
                          <span aria-hidden style={{ flexShrink: 0, fontSize: 22, color: col, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.3s" }}>+</span>
                        </button>
                        <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                          <div style={{ padding: isMobile ? "0 18px 20px" : "0 30px 28px" }}>
                            <div style={{ height: 1, background: t.border, marginBottom: 20 }} />
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 14 : 18 }}>
                              {group.items.map(item => (
                                <div key={item.id} id={`wc-tech-${item.id}`}
                                  style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                  <div style={{ height: 3, background: `linear-gradient(90deg,${col},${col}44)` }} />
                                  <div style={{ padding: isMobile ? "20px 18px" : "24px 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 21, letterSpacing: 0.5, lineHeight: 1.15, color: titleCol }}>{item.title}</span>
                                    <p style={{ fontSize: 13.5, lineHeight: 1.75, color: t.text, margin: 0 }}>{item.body}</p>
                                    {item.source && (
                                      <a href={item.source.url} target="_blank" rel="noopener noreferrer"
                                        style={{ marginTop: "auto", paddingTop: 6, alignSelf: "flex-start", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1.5, color: BRAND.pink, textDecoration: "none", textTransform: "uppercase", borderBottom: `1px solid ${BRAND.pink}55`, paddingBottom: 2 }}>
                                        Source: {item.source.label} ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionBody>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {pitchDivider}

      {/* ── FEATURED COMPANY: PLAYERMAKER (mirrors the NGSC panel in GSTER26) ── */}
      <div style={{ background: t.bg, padding: isMobile ? "32px 0" : "56px 0" }}>
      <div style={{ background: `linear-gradient(135deg, transparent, ${FEAT_COL}, ${FEAT_COL}88, ${FEAT_COL}, transparent)`, padding: 2, margin: isMobile ? "0 8px" : "0 20px", borderRadius: 20 }}>
      <div id="featured" style={{ background: "#0a0a0a", padding: isMobile ? "28px 16px" : "32px 40px", borderRadius: 18 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* ── Row 1: logo + title, CTA + website ── */}
          <Ftabr26PartnerHeader
            className="stx-reveal" name={FTABR26_FEATURED.name} headline={FTABR26_FEATURED.title}
            url={FTABR26_FEATURED.url} accent={FEAT_COL} print={isPdf}
            logo={<img src={FTABR26_FEATURED.logo} alt={FTABR26_FEATURED.name} onError={e => { e.currentTarget.style.display = "none"; }} />}
          />

          {/* ── Row 2: story on the left, image mosaic on the right ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.25fr", gap: isMobile ? 20 : 32, marginBottom: isMobile ? 20 : 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 18 : 20 }}>
              <div>
                <p style={featLabel}>{FTABR26_FEATURED.aboutLabel}</p>
                {FTABR26_FEATURED.about.map((para, i) => (
                  <p key={i} style={{ fontSize: i === 0 ? 14 : 12.5, color: i === 0 ? "#fff" : "#c8c8c8", fontWeight: i === 0 ? 600 : 400, lineHeight: 1.65, margin: i === FTABR26_FEATURED.about.length - 1 ? 0 : "0 0 8px" }}>{para}</p>
                ))}
              </div>
              <div>
                <p style={featLabel}>{FTABR26_FEATURED.achievementsLabel}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FTABR26_FEATURED.achievements.map((text, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: FEAT_COL, lineHeight: 1, flexShrink: 0, width: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                      <p style={{ fontSize: 12.5, color: "#c8c8c8", lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mosaic: lead photo + two shots on the left, product render as a tall tile on the right */}
            <div style={{
              display: "grid", gap: 10, height: isMobile ? undefined : 320,
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 0.95fr",
              gridTemplateRows: isMobile ? "190px 120px 220px" : "1.5fr 1fr",
            }}>
              {[FTABR26_FEATURED.images.lead, ...FTABR26_FEATURED.images.gallery].map((img, i) => (
                <div key={img.src} style={{ gridColumn: i === 0 ? "1 / 3" : undefined, gridRow: i === 0 ? "1" : "2", borderRadius: 10, overflow: "hidden", border: `1px solid ${FEAT_COL}20`, minHeight: 0 }}>
                  <img src={img.src} alt={img.alt} loading="lazy"
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "position" in img ? img.position : "center 60%" }} />
                </div>
              ))}
              <div style={{ gridColumn: isMobile ? "1 / 3" : "3", gridRow: isMobile ? "3" : "1 / 3", borderRadius: 10, overflow: "hidden", border: `1px solid ${FEAT_COL}20`, minHeight: 0, background: `radial-gradient(circle at 50% 55%, ${FEAT_COL}55 0%, ${FEAT_COL}18 42%, #141414 75%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 16 : 18 }}>
                <img src={FTABR26_FEATURED.images.product.src} alt={FTABR26_FEATURED.images.product.alt} loading="lazy"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block", objectFit: "contain", filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.55))" }} />
              </div>
            </div>
          </div>

          {/* ── Row 3: tagline + founder | next 12–18 months (same column split as row 2) ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.25fr", gap: isMobile ? 20 : 32, alignItems: "start", padding: isMobile ? "20px 0 0" : "22px 0 0", borderTop: `1px solid ${FEAT_COL}22` }}>
            <div>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 26, lineHeight: 1, color: "#fff", margin: "0 0 12px" }}>
                {FTABR26_FEATURED.tagline}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={FTABR26_FEATURED.founder.photo} alt={`${FTABR26_FEATURED.founder.name}, ${FTABR26_FEATURED.founder.role} of ${FTABR26_FEATURED.name}`} loading="lazy"
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", objectPosition: "center 20%", border: `2px solid ${FEAT_COL}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{FTABR26_FEATURED.founder.name}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: FEAT_COL, textTransform: "uppercase", marginTop: 2 }}>{FTABR26_FEATURED.founder.role}</div>
                </div>
              </div>
            </div>
            <div>
              <p style={featLabel}>{FTABR26_FEATURED.nextLabel}</p>
              <p style={{ fontSize: 12.5, color: "#c8c8c8", lineHeight: 1.65, margin: 0 }}>{FTABR26_FEATURED.next}</p>
            </div>
          </div>

        </div>
      </div>
      </div>
      </div>

      {pitchDivider}

      {/* ── INNOVATORS + PLAYMAKERS ─────────────────────────────────────── */}
      <div id="innovators" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Innovators")}
            {sectionTitle("THE PEOPLE DEFINING\nFOOTBALL INNOVATION")}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              Our Football Tech Innovators list showcases the leaders driving the ecosystem's growth through transformative initiatives all over the world. Select anyone to read their answers in full.
            </p>
          </div>

          {rosterLegend(CONTINENT_COLOR)}

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: isMobile ? 24 : 36, marginTop: 8 }}>
            {FTABR26_INNOVATORS.map(p => rosterTile({
              id: `ftabr26-inn-${p.id}`,
              name: p.name, company: p.company, photoUrl: p.photoUrl,
              ring: CONTINENT_COLOR[p.continent] || BRAND.pink,
              isSelected: selectedInnovator?.id === p.id,
              onClick: () => setSelectedInnovator(selectedInnovator?.id === p.id ? null : p),
            }))}
          </div>
        </div>
      </div>

      {/* Innovator drawer — the two interview answers */}
      {selectedInnovator && (() => {
        const p = selectedInnovator;
        const accent = CONTINENT_COLOR[p.continent] || BRAND.pink;
        const answers = ([["qTech", p.qTech], ["qUnderserved", p.qUnderserved]] as const)
          .filter(([, a]) => a.trim().length > 0);
        return (
          <Ftabr26PersonDrawer
            name={p.name} photoUrl={p.photoUrl} accent={accent}
            flag={getCountryFlag(p.country)}
            subtitle={`${p.designation} · ${p.company}`}
            linkedin={p.linkedin || undefined}
            reportLabel="FTABR 2026"
            onClose={() => closeDrawer(`ftabr26-inn-${p.id}`, setSelectedInnovator)}
            t={t} isDark={isDark} isMobile={isMobile}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {answers.map(([key, answer]) => (
                <div key={key} style={drawerCardStyle(accent, isDark)}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: "0 0 10px" }}>{FTABR26_QUESTIONS[key]}</p>
                  <p style={{ fontSize: 14, color: t.text, lineHeight: 1.85, margin: 0 }}>{answer}</p>
                </div>
              ))}
            </div>
          </Ftabr26PersonDrawer>
        );
      })()}

      {pitchDivider}

      {/* ── STARTUPS TO WATCH ───────────────────────────────────────────── */}
      <div id="ecosystem" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Startups to Watch")}
            {sectionTitle("COMPANIES WORTH\nYOUR ATTENTION")}
          </div>

          {/* Sector legend */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 40, marginBottom: 28 }}>
            {(["athletes", "fans", "execs"] as const).map(s => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLOR[s] }} />{SECTOR_LABEL[s]}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.8, marginBottom: 32 }}>
            {FTABR26_STARTUPS_NOTE}
          </p>

          {(() => {
            return (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 20 }}>
                {watchStartups.map(c => {
                  /* Unmapped sectors get the brand pink rather than a bucket
                     they were never assigned to. */
                  const sectorColor = c.sector ? SECTOR_COLOR[c.sector] : BRAND.pink;
                  const logoUrl = startupLogoUrl(c);
                  const href = ecoHref(c.website);
                  return (
                    <a key={c.name} href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="stx-reveal" style={{
                      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 0,
                      display: "flex", flexDirection: "column", overflow: "hidden",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      position: "relative", textDecoration: "none", color: "inherit", cursor: href ? "pointer" : "default",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"}, 0 0 0 1px ${sectorColor}33`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ height: 3, background: `linear-gradient(90deg, ${sectorColor}, ${sectorColor}44)` }} />
                      <div style={{ padding: isMobile ? "18px 16px 20px" : "22px 24px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                            position: "relative", flexShrink: 0, overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {logoUrl ? (
                              <img src={logoUrl} alt={c.name} style={{ width: 28, height: 28, objectFit: "contain", position: "relative", zIndex: 1 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span style={{ fontSize: 16, fontWeight: 700, color: sectorColor, fontFamily: "'Bebas Neue',sans-serif" }}>{c.name.charAt(0)}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Open Sans',sans-serif", display: "block" }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{getCountryFlag(c.country ?? "")} {c.country}</span>
                          </div>
                        </div>
                        {c.description && (
                          <p style={{ fontSize: 13, color: t.text, lineHeight: 1.6, margin: 0, fontFamily: "'Open Sans',sans-serif" }}>{c.description}</p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {pitchDivider}

      {/* ── ECOSYSTEM: INITIATIVES AND ACCELERATORS ────────────────────── */}
      <div id="ecomap" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Ecosystem")}
            {sectionTitle("THE FOOTBALL INNOVATION\nECOSYSTEM")}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              Innovation initiatives run by clubs, leagues and federations, plus the accelerators, incubators and challenges backing football startups.
            </p>
          </div>

          {/* The map. Selecting a continent filters the two tables below;
              it hides itself when no row can be placed, which is what an API
              outage leaves behind — see ftabr26-ecosystem-map.tsx. */}
          <Suspense fallback={
            <div style={{ marginTop: 40, height: isMobile ? 220 : 460, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, letterSpacing: 3 }}>LOADING MAP…</span>
            </div>
          }>
            <Ftabr26EcosystemMap
              t={t} isDark={isDark} isMobile={isMobile}
              eco={eco}
              selected={ecoRegion}
              onSelect={setEcoRegion}
            />
          </Suspense>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 40, marginBottom: 28, borderBottom: `2px solid ${t.border}`, overflowX: "auto" }}>
            {([
              ["initiatives",  `Initiatives (${ecoShown.initiatives.length})`],
              ["accelerators", `Accelerators (${ecoShown.programs.length})`],
            ] as const).map(([key, label]) => {
              const active = ecoTab === key;
              return (
                <button key={key} onClick={() => setEcoTab(key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 18 : 24, letterSpacing: 2, padding: isMobile ? "8px 16px 10px" : "10px 32px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              );
            })}

            {/* Reading the filter off the tab strip, and the way back out of
                it, without scrolling back up to the map. */}
            {ecoRegion && (
              <button onClick={() => setEcoRegion(null)}
                style={{ marginLeft: "auto", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 12px", borderRadius: 20, border: `1px solid ${BRAND.pink}55`, background: `${BRAND.pink}12`, color: BRAND.pink, cursor: "pointer", whiteSpace: "nowrap" }}>
                {ecoRegion} <span style={{ fontSize: 12, lineHeight: 1 }}>✕</span>
              </button>
            )}
          </div>

          {(() => {
            const rows: Ftabr26EcosystemEntry[] = ecoTab === "initiatives"
              ? ecoShown.initiatives : ecoShown.programs;
            /* Logo, name and city (which carries the country flag). */
            const cols = isMobile
              ? "34px 1fr"
              : "44px 1fr 240px";
            return (
              <div className="stx-reveal" style={{ border: `1px solid ${t.border}`, overflow: "hidden", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "12px 20px", background: isDark ? "rgba(56,117,83,0.45)" : PITCH, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.white, textTransform: "uppercase" }}>
                  <span />
                  <span>{ecoTab === "initiatives" ? "Initiative" : "Program"}</span>
                  {!isMobile && <span>City</span>}
                </div>
                {rows.length === 0 && (
                  <div style={{ padding: "26px 20px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: t.textMuted, borderTop: `1px solid ${t.border}` }}>
                    NO {(ecoTab === "accelerators" ? "accelerators" : ecoTab).toUpperCase()}{ecoRegion ? ` IN ${ecoRegion.toUpperCase()}` : ""}
                  </div>
                )}
                {rows.map((r, i) => {
                  const href = ecoHref(r.website);
                  const logoUrl = ecoInitiativeLogoUrl(r.name, r.website);
                  /* Same flags as the leaderboards, resolved through our own
                     country lookup so the spellings in the master tables land.
                     Sits with the city, not the name — "🇪🇬 Cairo". */
                  const flagNode = getFlagByCountryCode(ecoFlagCode(r.country));
                  const flagImg = flagNode && (
                    <span title={r.country ?? undefined} style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>{flagNode}</span>
                  );
                  const nameStyle: React.CSSProperties = { color: t.text, textDecoration: "none", borderBottom: href ? `1px solid ${BRAND.pink}44` : "none" };
                  return (
                    <div key={`${r.name}-${r.rank}`} style={{ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "10px 20px", alignItems: "center", background: i % 2 ? t.tableRowAlt : "transparent", borderTop: `1px solid ${t.border}` }}>
                      {/* Logo — the master tables store no logo, so it is
                          resolved from the website and falls back to a
                          monogram when the lookup misses. */}
                      <div style={{ width: 30, height: 30, borderRadius: 5, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.08)" : BRAND.white, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {logoUrl && (
                          <img src={logoUrl} alt="" width={22} height={22} loading="lazy" style={{ objectFit: "contain" }}
                            onError={e => { const img = e.currentTarget; img.style.display = "none"; const sib = img.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }} />
                        )}
                        <span style={{ display: logoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: PITCH }}>
                          {(r.name || "?").charAt(0)}
                        </span>
                      </div>

                      <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: t.text, minWidth: 0, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {href
                          ? <a href={href} target="_blank" rel="noopener noreferrer" style={nameStyle}>{r.name}</a>
                          : <span>{r.name}</span>}
                        {isMobile && r.city && (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: t.textMuted, fontWeight: 400, marginTop: 2 }}>{flagImg}{r.city}</span>
                        )}
                      </span>

                      {!isMobile && (
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          {flagImg}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.city ?? "Not listed"}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {pitchDivider}

      {/* Soccerment follows Ecosystem independently of legacy spotlight flags. */}
      <section id="soccerment" aria-label="Partner feature: Soccerment" style={{ background: t.bg, padding: isMobile ? "32px 0" : "56px 0" }}>
        <div style={{ margin: isMobile ? "0 8px" : "0 20px" }}>
          <Ftabr26SoccermentFeature data={FTABR26_SOCCERMENT} print={isPdf} />
        </div>
      </section>

      {pitchDivider}

      {SHOW_PARTNERS && (
        <>
          {/* ── PARTNER SPOTLIGHTS ──────────────────────────────────────────── */}
          <div style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
              <div className="stx-reveal">
                {sectionLabel("Partners")}
                {sectionTitle("IN THEIR OWN WORDS")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 20 : 28, marginTop: 44 }}>
                {FTABR26_PARTNERS.map(p => {
                  const accent = p.kind === "Presenting Partner" ? BRAND.pink : PARTNER_ACCENT;
                  return (
                    <div key={p.id} className="stx-reveal" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},${accent}22)` }} />
                      <div style={{ padding: isMobile ? "24px 18px" : "34px 36px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase", color: accent, border: `1px solid ${accent}66`, borderRadius: 999, padding: "4px 12px" }}>{p.kind}</span>
                            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(30px,3.4vw,46px)", letterSpacing: 0.8, color: titleCol, margin: "14px 0 4px", lineHeight: 1 }}>{p.name}</h3>
                            <p style={{ fontSize: 14, color: accent, fontWeight: 600, margin: 0 }}>{p.tagline}</p>
                          </div>
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: accent, border: `1px solid ${accent}`, borderRadius: 4, padding: "7px 16px", textDecoration: "none", whiteSpace: "nowrap" }}>Visit ↗</a>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 20 : 32, marginTop: 26 }}>
                          {p.blocks.map(b => (
                            <div key={b.heading}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: t.textMuted, marginBottom: 8 }}>{b.heading}</div>
                              <p style={{ fontSize: 13.5, lineHeight: 1.85, color: t.text, margin: 0 }}>{b.body}</p>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                          <Ftabr26PersonAvatar name={p.contact.name} color={accent} size={40} />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>{p.contact.name}</div>
                            <div style={{ fontSize: 11.5, color: t.textMuted }}>{p.contact.role}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {pitchDivider}
        </>
      )}

      {/* ── DATA IN FULL ────────────────────────────────────────────────── */}
      <div id="dealflow" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Data in Full")}
            {sectionTitle("FOOTBALL TECH\nDEALFLOW")}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              Football is the world's biggest sport and attracts countless solution providers, so we split them in two:
              <strong style={{ color: PITCH }}> Football Only</strong> companies built solely for football, and
              <strong style={{ color: ALSO_COLOR }}> Football Also</strong> multisport platforms serving football alongside other sports.
              All figures cover {facts.period.label}.
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", marginTop: 40, marginBottom: 32, borderBottom: `2px solid ${t.border}`, overflowX: "auto" }}>
            {([["investment", "Investment"], ["leaderboards", "Leaderboards"]] as const).map(([key, label]) => {
              const active = dataTab === key;
              return (
                <button key={key} onClick={() => setDataTab(key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 18px 10px" : "10px 36px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* ══════════ INVESTMENT TAB ══════════ */}
          {(isPdf || dataTab === "investment") && (
            <div>
              {/* Legend + amount/rounds toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {([["Football Only", ONLY_COLOR], ["Football Also", ALSO_COLOR]] as const).map(([lbl, col]) => (
                    <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: col }} />{lbl}
                    </span>
                  ))}
                </div>
                <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {([["value", "Amount"], ["count", "Rounds"]] as const).map(([key, lbl]) => {
                    const active = chartMode === key;
                    return (
                      <button key={key} onClick={() => setChartMode(key)} style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "4px 13px", borderRadius: 14, border: "none", cursor: "pointer",
                        background: active ? BRAND.pink : "transparent", color: active ? "#fff" : t.textMuted,
                        fontWeight: active ? 700 : 400, transition: "all 0.18s", outline: "none",
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>

              {/* Investment by year */}
              <div className="stx-reveal">
                {blockHeader("INVESTMENT BY YEAR")}
                {noteText(dealflowCopy.byYear)}
              </div>
              <SplitBarChart data={yearSplitData} mode={chartMode} t={t} isPdf={isPdf} />

              {/* Rounds table */}
              <div className="stx-reveal" style={{ marginTop: 28, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "auto" }}>
                <div style={{ minWidth: 520 }}>
                  <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${facts.byYear.length},1fr)`, padding: "12px 16px", background: isDark ? "rgba(56,117,83,0.45)" : PITCH, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.6, color: BRAND.white, textTransform: "uppercase" }}>
                    <span>Number of rounds</span>
                    {facts.byYear.map(r => <span key={r.year} style={{ textAlign: "right" }}>{r.year}</span>)}
                  </div>
                  {([
                    ["Football only", (r: YearRow) => r.roundsOnly],
                    ["Football also", (r: YearRow) => r.roundsAlso],
                    ["Total",         (r: YearRow) => r.roundsOnly + r.roundsAlso],
                  ] as const).map(([label, pick], i) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: `160px repeat(${facts.byYear.length},1fr)`, padding: "12px 16px", borderTop: `1px solid ${t.border}`, background: i % 2 ? t.tableRowAlt : "transparent" }}>
                      <span style={{ fontSize: 12.5, fontWeight: label === "Total" ? 700 : 500, color: t.text }}>{label}</span>
                      {facts.byYear.map(r => (
                        <span key={r.year} style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 12, color: label === "Total" ? BRAND.pink : t.textMuted, fontWeight: label === "Total" ? 700 : 400 }}>{pick(r)}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Investment by region */}
              <div className="stx-reveal" style={{ marginTop: 72 }}>
                {blockHeader("INVESTMENT BY REGION")}
                {noteText(dealflowCopy.byRegion)}
              </div>
              <SplitBarChart data={regionSplitData} mode={chartMode} t={t} isPdf={isPdf} />

              <div className="stx-reveal" style={{ marginTop: 28 }}>
                {noteText(dealflowCopy.regionSplit)}
              </div>

              <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 40 }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>Share of total funding</div>
                  {facts.byRegion.map((r, i) => {
                    const total = facts.byRegion.reduce((s, x) => s + x.footballOnly + x.footballAlso, 0);
                    const amt = r.footballOnly + r.footballAlso;
                    return <ProgressRow key={r.region} label={r.region} value={fmt(amt)} pct={(amt / total) * 100} delay={i * 90} t={t} />;
                  })}
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>Rounds by region</div>
                  {facts.byRegion.map((r, i) => {
                    const totalRounds = facts.byRegion.reduce((s, x) => s + x.roundsOnly + x.roundsAlso, 0);
                    const n = r.roundsOnly + r.roundsAlso;
                    return <ProgressRow key={r.region} label={r.region} value={`${n} rounds`} pct={(n / totalRounds) * 100} delay={i * 90} t={t} color={ALSO_COLOR} />;
                  })}
                </div>
              </div>

              {/* Sector split */}
              <div className="stx-reveal" style={{ marginTop: 72 }}>
                {blockHeader("SECTOR-WISE FUNDING")}
                {noteText(dealflowCopy.sector)}
                {noteText(dealflowCopy.sectorMix)}
              </div>

              <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 32, alignItems: "start" }}>
                {/* Slices are named from SECTOR_LABEL, not the row's own
                    label — the feed carries the database's wording ("Fans &
                    Content"), and the report says "For Fans" everywhere else. */}
                <DonutChart t={t} isPdf={isPdf} title={`Funding per sector · ${facts.period.label}`}
                  slices={facts.sectorShare.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
                <DonutChart t={t} isPdf={isPdf} title={`Funding per sector · ${facts.period.recentLabel}`}
                  slices={facts.sectorShareRecent.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
              </div>

              <div className="stx-reveal" style={{ marginTop: 56 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>Funding per sub-sector · {facts.period.label}</div>
                {facts.subSectorShare.map((s, i) => (
                  <ProgressRow key={s.label} label={s.label} value={formatFtabr26Percent(s.pct)} pct={(s.pct / facts.subSectorShare[0].pct) * 100} delay={i * 70} t={t}
                    color={SECTOR_COLOR[s.parent === "execs" ? "execs" : s.parent === "fans" ? "fans" : "athletes"]} />
                ))}
              </div>
            </div>
          )}

          {/* ══════════ LEADERBOARDS TAB ══════════ */}
          {(isPdf || dataTab === "leaderboards") && (
            <div>
              {/* Category + window filters, top right; they also set which
                  side the Top Funded Companies table shows. */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", marginBottom: 32 }}>
                <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {(["only", "also"] as const).map(key => {
                    const active = leaderCat === key;
                    return (
                      <button key={key} onClick={() => setLeaderCat(key)} style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "5px 15px", borderRadius: 14, border: "none", cursor: "pointer",
                        background: active ? BRAND.pink : "transparent", color: active ? "#fff" : t.textMuted,
                        fontWeight: active ? 700 : 400, transition: "all 0.18s", outline: "none", textTransform: "uppercase",
                      }}>{CAT_LABEL[key]}</button>
                    );
                  })}
                </div>
                <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {([["allTime", facts.period.label], ["recent", `Last ${facts.period.recentMonths} months`]] as const).map(([key, lbl]) => {
                    const active = leaderWindow === key;
                    return (
                      <button key={key} onClick={() => setLeaderWindow(key)} style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "5px 15px", borderRadius: 14, border: "none", cursor: "pointer",
                        background: active ? BRAND.pink : "transparent", color: active ? "#fff" : t.textMuted,
                        fontWeight: active ? 700 : 400, transition: "all 0.18s", outline: "none", textTransform: "uppercase",
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>

              {/* Countries + cities. On desktop each column subgrids the
                  title / note / list rows, so the two charts start on the
                  same line however long either note runs. */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", columnGap: 40, rowGap: isMobile ? 40 : 0 }}>
                {([
                  ["TOP FUNDED COUNTRIES", countryRows, dealflowCopy.countries],
                  ["TOP FUNDED CITIES",    cityRows,    dealflowCopy.cities],
                ] as const).map(([title, rows, note]) => {
                  /* Every bar is scaled against rank 1, so the collapsed rows
                     share the scale of the visible ones. */
                  const max = Math.max(...rows.map(r => r.amount), 1);
                  const top = rows.slice(0, 5);
                  const rest = rows.slice(5);
                  /* A PDF render has nothing to click, so it prints all ten. */
                  const isOpen = isPdf || !!leaderExpanded[title];
                  const leaderRow = (r: LeaderRow, i: number) => (
                    <div key={r.name} style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 10 }}>
                        <span style={{ color: t.text, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.slate }}>#{r.rank}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                        </span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 600, flexShrink: 0 }}>
                          {fmt(r.amount)} <span style={{ color: t.textMuted, fontWeight: 400 }}>· {r.rounds} rds</span>
                        </span>
                      </div>
                      <AnimatedBar pct={(r.amount / max) * 100} delay={i * 80} trackColor={t.border} color={leaderCat === "only" ? ONLY_COLOR : ALSO_COLOR} isPdf={isPdf} />
                    </div>
                  );
                  return (
                    <div key={title} className="stx-reveal" style={isMobile ? undefined : { display: "grid", gridRow: "span 3", gridTemplateRows: "subgrid", rowGap: 0 }}>
                      {blockHeader(title, "clamp(22px,2.4vw,32px)")}
                      <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.75, margin: "12px 0 24px" }}>{note}</p>
                      <div>
                        {top.map(leaderRow)}
                        {rest.length > 0 && (
                          <>
                            <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                              {rest.map((r, i) => leaderRow(r, i + top.length))}
                            </AccordionBody>
                            {!isPdf && (
                              <button
                                onClick={() => toggleLeaderExpanded(title)}
                                aria-expanded={isOpen}
                                style={{
                                  fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase",
                                  background: "transparent", border: `1px solid ${t.border}`, borderRadius: 14,
                                  padding: "6px 15px", cursor: "pointer", color: t.textMuted, transition: "all 0.18s", outline: "none",
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BRAND.pink; (e.currentTarget as HTMLElement).style.borderColor = BRAND.pink; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                              >
                                {isOpen ? "Show top 5" : `Show ${rest.length} more`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Companies */}
              <div className="stx-reveal" style={{ marginTop: 72 }}>
                {blockHeader("TOP FUNDED COMPANIES")}
                {noteText(leaderCat === "only" ? dealflowCopy.companiesOnly : dealflowCopy.companiesAlso)}
                {/* Rank, then a logo column matching the ecosystem tables,
                    then name — the logo is resolved from the company website,
                    so the committed fallback rows fall back to a monogram. */}
                <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 34px 1fr 84px" : "48px 44px 1.1fr 1.5fr 150px 110px", gap: "0 12px", padding: "12px 20px", background: isDark ? "rgba(56,117,83,0.45)" : PITCH, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.white, textTransform: "uppercase" }}>
                    <span>#</span><span /><span>Name</span>{!isMobile && <span>Description</span>}{!isMobile && <span>City</span>}
                    <span style={{ textAlign: "right" }}>Funding</span>
                  </div>
                  {companyRows.map((c, i) => {
                    const logoUrl = ecoLogoUrl(c.website);
                    return (
                      <div key={c.name} style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 34px 1fr 84px" : "48px 44px 1.1fr 1.5fr 150px 110px", gap: "0 12px", padding: "13px 20px", alignItems: "center", background: i % 2 ? t.tableRowAlt : "transparent", borderTop: `1px solid ${t.border}` }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: BRAND.slate }}>{c.rank}</span>
                        <div style={{ width: 30, height: 30, borderRadius: 5, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.08)" : BRAND.white, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {logoUrl && (
                            <img src={logoUrl} alt="" width={22} height={22} loading="lazy" style={{ objectFit: "contain" }}
                              onError={e => { const img = e.currentTarget; img.style.display = "none"; const sib = img.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }} />
                          )}
                          <span style={{ display: logoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: PITCH }}>
                            {(c.name || "?").charAt(0)}
                          </span>
                        </div>
                        <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: t.text, minWidth: 0 }}>
                          {c.name}
                          {isMobile && <span style={{ display: "block", fontSize: 11, color: t.textMuted, fontWeight: 400, marginTop: 2, lineHeight: 1.4 }}>{c.description} · {getCountryFlag(c.country)} {c.city}</span>}
                        </span>
                        {!isMobile && <span style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>{c.description}</span>}
                        {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted }}>{getCountryFlag(c.country)} {c.city}</span>}
                        <span style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: BRAND.pink, fontWeight: 700 }}>{fmt(c.funding)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div className="stx-reveal" style={{ marginTop: 72, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: isMobile ? "22px 18px" : "30px 34px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", marginBottom: 12 }}>Methodology</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.85, color: t.textMuted, margin: "0 0 22px" }}>{FTABR26_METHODOLOGY.intro}</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24 }}>
              {FTABR26_METHODOLOGY.categories.map(c => (
                <div key={c.name} style={{ borderLeft: `3px solid ${c.name === "Football Only" ? ONLY_COLOR : ALSO_COLOR}`, paddingLeft: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 0.6, color: titleCol }}>{c.name}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.75, color: t.textMuted, margin: "6px 0 6px" }}>{c.description}</p>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted }}>e.g. {c.examples}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER (the exact Atlas landing footer) ─────────────────────── */}
      <div className="lp"><LandingFooter /></div>

      </div>
      <style>{`
        html, body { overflow-x: hidden; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(237,26,94,0.3); border-radius: 3px; }
        .stx-trend-card { transition: border-color 0.3s, transform 0.3s; }
      `}</style>

      {/* ── FTABR26 AUTH GATE ───────────────────────────────────────────── */}
      {isFtabr26 && !isPdf && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={isAuthenticated ? () => setShowAuthModal(false) : undefined}
          withBlur={true}
        />
      )}
    </div>
  );
}
