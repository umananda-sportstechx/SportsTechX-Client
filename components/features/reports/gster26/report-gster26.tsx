// @ts-nocheck
/* eslint-disable */
"use client";

import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "./gster26.css";
import { LandingFooter } from "@/components/landing/landing-footer";
import "@/components/landing/landing.css";
import { BRAND } from './brand';
import { INNOVATOR_RESPONSES_DEFAULT, watchInnovators_DEFAULT, watchPeak_DEFAULT, PEAK_SWC_FINALISTS_DEFAULT, GROUNDBREAKERS_ORGS_DEFAULT, PEAK_PARTNERS_TIER1_DEFAULT, PEAK_PARTNERS_TIER2_DEFAULT, PEAK_PARTNERS_TIER3_DEFAULT, watchStxRecommends_DEFAULT, FEATURED_ARTICLES_DEFAULT } from './content-defaults';
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// PEAK conference tracks — stays code-side (embeds lucide icon components, not
// serializable to the editorial DB doc); labels aren't editable copy.
const PEAK_TRACKS_DEFAULT = [
  { label: "Shaping the\nFan Experience", Icon: Users },
  { label: "Maximizing Smart\nVenue Performance", Icon: Building2 },
  { label: "Advancing Athlete\nPerformance", Icon: Activity },
  { label: "AI-Powered\nFront Offices", Icon: Bot },
  { label: "Pathways\nto Pro", Icon: Trophy },
  { label: "Financing the\nFuture of Sport", Icon: TrendingUp },
  { label: "Innovative\nEmerging Leagues", Icon: Lightbulb },
  { label: "Next-Gen\nRevenue Strategies", Icon: BarChart3 },
];
import * as topojsonClient from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
import { Users, Building2, Activity, Bot, Trophy, TrendingUp, Lightbulb, BarChart3, Monitor, GitMerge, Footprints, Landmark, DollarSign, Globe, Menu, X, Sun, Moon } from "lucide-react";
import { GSTER25_FACTS } from "./data/gster25-facts-data";
import { GSTER25_MA_DEALS } from "./data/gster25-ma-deals-data";
import { INNOVATORS_DATA } from "./data/gster26-innovators-data";
import { getCountryFlag } from "./flags";
import mixpanel from "mixpanel-browser";

// The downloadable "lite" PDF lives in Supabase storage (public_bucket), not in
// the repo. `?download` makes Supabase serve it as an attachment — the HTML
// `download` attr is ignored cross-origin, so the query param is what forces it.
const GSTER26_PDF_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public_bucket/reports/GSTER26-LITE.pdf?download=GSTER26-LITE.pdf`;

/* ── Atlas port shims ─────────────────────────────────────────────────────
   The STX page ran under wouter + react-query + a custom auth hook. In Atlas
   the page is rendered chrome-less behind ProtectedRoute, so the viewer is
   always authenticated; the innovators/watch/M&A data that STX fetched from
   /api/report/* is sourced here from the committed static snapshots that back
   those endpoints, and the pros/cons poll keeps local vote state. */
const Link = NextLink as unknown as (props: { href: string; children?: React.ReactNode; style?: React.CSSProperties; [k: string]: unknown }) => React.ReactElement;
function useAuthSession() { return { user: { id: "viewer" }, sessionValid: true, loading: false }; }
function AuthModal() { return null; }

/* ── gster26 Mixpanel helper ─────────────────────────────────────────── */
function trackG26(event: string, props?: Record<string, any>) {
  try { mixpanel.track(`gster26_${event}`, { report: "gster26", ...props }); } catch {}
}
gsap.registerPlugin(ScrollTrigger);

const SectorBubbleChart = lazy(() => import("./sector-bubble-chart"));
const EcosystemMapSection = lazy(() => import("./ecosystem-map-section"));

/* ─── STX Brand Palette (from Report Design Guidelines v2) ──────────────────
   #ED1A5E  Primary accent · amounts · highlights
   #2D3B49  Table headers · titles · primary dark
   #FDE1D9  Light background accent · callout fills
   #4D5E72  Secondary text · subheaders
   #BED0E3  Light blue · backgrounds · data fill
   #76ADA7  Teal mid-tone · supporting chart colour
   #6A9DA9  Bright teal · chart accent
   #2B3D8F  Navy · strong accent · dividers
   #FFFFFF  Page backgrounds · reversed text on dark
   #000000  Body text · dark fills
──────────────────────────────────────────────────────────────────────────── */



type WatchCompany = { name: string; description: string; why: string; domain: string; city: string; country: string; countryFlag: React.ReactNode; sector: "athletes" | "execs" | "fans" };
type WatchCompanyWithLink = WatchCompany & { website: string | null };



/* ── PEAK 2026 static data ────────────────────────────────────────────── */







type Theme = {
  bg: string; bgSec: string; bgCard: string; bgCardHover: string;
  text: string; textSec: string; textMuted: string;
  border: string; titleColor: string; navBg: string;
  divider: string; tableRowAlt: string;
};

const DARK: Theme = {
  bg:           "#0c0f1a",
  bgSec:        "#111827",
  bgCard:       "#1a2232",
  bgCardHover:  "#212d44",
  text:         BRAND.white,
  textSec:      BRAND.lightBlue,
  textMuted:    "#8899aa",
  border:       "rgba(190,208,227,0.1)",
  titleColor:   BRAND.white,
  navBg:        "rgba(12,15,26,0.9)",
  divider:      "rgba(237,26,94,0.25)",
  tableRowAlt:  "rgba(255,255,255,0.02)",
};

const LIGHT: Theme = {
  bg:           BRAND.white,
  bgSec:        "#F4F6F9",
  bgCard:       BRAND.white,
  bgCardHover:  BRAND.peach,
  text:         BRAND.black,
  textSec:      BRAND.darkTitle,
  textMuted:    BRAND.slate,
  border:       "rgba(45,59,73,0.12)",
  titleColor:   BRAND.darkTitle,
  navBg:        "rgba(255,255,255,0.95)",
  divider:      "rgba(237,26,94,0.2)",
  tableRowAlt:  "#F9FAFB",
};

type ReportData = {
  summary: { total_companies: number; total_countries: number; total_funding_m: number; total_deals: number; total_ma: number };
  fundingByYear:       { year: number; total_m: number; deals: number }[];
  topCountries:        { country: string; total_m: number; deals: number }[];
  sectorFunding:       { sector: string; total_m: number; deals: number }[];
  regionSplit:         { region: string; total_m: number; deals: number }[];
  topCompaniesByRegion: Record<string, { name: string; total_m: number; region: string; website: string | null; description: string | null; city: string | null; country: string | null }[]>;
  maByYear:            { year: number; deals: number; total_m: number }[];
  businessModel:       { model: string; count: number }[];
  sectorCompanyCount:  { sector: string; companies: number }[];
  topMaDeals:          { acquiree_name: string; acquirer_name: string; acquisition_year: number; amount_m: number; acquiree_country: string; acquiree_sector: string; acquisition_type: string }[];
  sectorDrilldown:        { sector: string; sub_sector: string | null; sub_sub_sector: string | null; total_m: number; deals: number }[];
  sectorCompanyDrilldown: { sector: string; sub_sector: string | null; sub_sub_sector: string | null; total_m: number; deals: number }[];
  undisclosedMaDeals:  { acquiree_name: string; acquirer_name: string; acquisition_year: number; acquiree_country: string; acquiree_sector: string; acquisition_type: string }[];
  maByYearSportstech: { year: number; sportstech: number; non_sportstech: number; sportstech_val: number; non_sportstech_val: number }[];
  topAcquirers: { name: string; deals: number; is_sportstech: string }[];
  acquireeProfile: {
    bySector: { sector: string; deals: number }[];
    byContinent: { continent: string; deals: number }[];
    byModel: { model: string; deals: number }[];
  };
};

/* ─── Trends / Featured Articles types & data ──────────────────────────── */
type TimelineEvent = { year: string; event: string; detail: string };
type FirmProfile = { name: string; desc: string; domain?: string };
type ContentSection = { heading: string; paragraphs: string[] };
type MapCity = { name: string; lon: number; lat: number };
type Stakeholder = { name: string; category: string; market: string; domain?: string; isIndividual?: boolean };
type FlipCard = { id: string; emoji: string; title: string; subtitle: string; frontSummary: string; backParagraphs: string[]; color: string };
type RevenueRow = { sport: string; model: string; share: string };
type NbaTeam = { name: string; abbr: string };
type NbaEuropeRow = { market: string; teams: NbaTeam[]; why: string };
type RevShareRow = { property: string; pct: string; structure?: string; notes: string };
type AthleteOwnerRow = { year: string; athlete: string; team: string; sport: string; type: string };
type RevenueTables = { usLeagues: RevShareRow[]; euroFootball: RevShareRow[]; competitions: RevShareRow[]; individualSports: RevShareRow[]; cricket: RevShareRow[]; combat: RevShareRow[] };
type StatCard = { value: string; label: string; sublabel: string };
type ProConItem = { label: string; detail: string };
type RevShareTableRow = { property: string; pct: string; structure: string; notes: string; isHeader?: boolean };
type FeaturedArticle = { id: string; tag: string; title: string; intro: string; summary: string; bodyParagraphs: string[]; bodyHeading?: string; bodySections?: ContentSection[]; revShareTable?: RevShareTableRow[]; sections?: ContentSection[]; mapCities?: MapCity[]; stakeholders?: Stakeholder[]; timeline?: TimelineEvent[]; firms?: FirmProfile[]; flipCards?: FlipCard[]; revenueTable?: RevenueRow[]; pullQuote?: string; nbaEuropeTable?: NbaEuropeRow[]; revenueTables?: RevenueTables; athleteOwnership?: AthleteOwnerRow[]; statCards?: StatCard[]; prosConsQuestion?: string; pros?: ProConItem[]; cons?: ProConItem[]; closingQuote?: string; color: string };


/* ISO 3166-1 numeric codes for European countries (countries-110m.json) */
const EUROPE_IDS = new Set([
  "40","56","100","191","203","208","233","246","250","276","300","348","352",
  "372","380","428","440","442","528","578","616","620","642","703","705",
  "724","752","756","826","804","688","70","807","8","499","780",
  "112","643","498","268","792",
]);

const EU_MAP_W = 700;
const EU_MAP_H = 480;

function EuropeMap({ cities, t, isDark }: { cities: MapCity[]; t: Theme; isDark: boolean }) {
  const [paths, setPaths] = useState<string[]>([]);
  const projRef = useRef<((coords: [number, number]) => [number, number] | null) | null>(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then((world: any) => {
        const countries = topojsonClient.feature(world, world.objects.countries) as any;
        const proj = geoMercator()
          .center([12, 48])
          .scale(EU_MAP_W * 1.15)
          .translate([EU_MAP_W / 2, EU_MAP_H / 2]);
        const pathFn = geoPath().projection(proj);
        const europePaths = countries.features
          .filter((f: any) => EUROPE_IDS.has(String(f.id)))
          .map((f: any) => pathFn(f) || "")
          .filter(Boolean);
        setPaths(europePaths);
        projRef.current = (coords) => {
          const r = proj(coords);
          return r ? [r[0], r[1]] : null;
        };
      })
      .catch(() => {});
  }, []);

  const projectedCities = useMemo(() => {
    if (!projRef.current || paths.length === 0) return [];
    return cities.map(c => {
      const pt = projRef.current!([c.lon, c.lat]);
      return pt ? { name: c.name, x: pt[0], y: pt[1] } : null;
    }).filter(Boolean) as { name: string; x: number; y: number }[];
  }, [cities, paths]);

  if (paths.length === 0) {
    return (
      <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, letterSpacing: 3 }}>LOADING MAP…</span>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${EU_MAP_W} ${EU_MAP_H}`} style={{ width: "100%", maxWidth: 700, height: "auto", display: "block", margin: "0 auto" }}>
      <defs>
        <radialGradient id="euOceanGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={isDark ? "#0e1624" : "#e8f0f8"} />
          <stop offset="100%" stopColor={isDark ? "#060d18" : "#d5e4f0"} />
        </radialGradient>
      </defs>
      <rect width={EU_MAP_W} height={EU_MAP_H} rx="8" fill="url(#euOceanGrad)" />
      {paths.map((d, i) => (
        <path key={i} d={d}
          fill={isDark ? "rgba(75,100,130,0.45)" : "rgba(160,185,210,0.55)"}
          stroke={isDark ? "rgba(190,208,227,0.18)" : "rgba(100,130,160,0.25)"}
          strokeWidth={0.5} />
      ))}
      {projectedCities.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="8" fill={BRAND.pink} opacity="0.15" />
          <circle cx={c.x} cy={c.y} r="4" fill={BRAND.pink} />
          <circle cx={c.x} cy={c.y} r="2" fill="#fff" />
          <text x={c.x} y={c.y - 10} textAnchor="middle" fill={t.titleColor}
            fontSize="11" fontFamily="'DM Mono',monospace" fontWeight="600">{c.name}</text>
        </g>
      ))}
    </svg>
  );
}

function FlipCardComponent({ card, t, isMobile }: { card: FlipCard; t: Theme; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden", transition: "border-color 0.3s" }}>
      <button
        onClick={() => { setExpanded(e => !e); trackG26("flip_card_toggle", { card: card.title }); }}
        style={{ width: "100%", background: expanded ? `${card.color}08` : t.bgCard, border: "none", cursor: "pointer", padding: isMobile ? "20px 18px" : "24px 24px", textAlign: "left", outline: "none", transition: "background 0.3s" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 24, lineHeight: 1.1, color: t.titleColor, marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1, color: card.color, textTransform: "uppercase", marginBottom: 10 }}>{card.subtitle}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted }}>{card.frontSummary}</div>
          </div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: expanded ? card.color : t.textMuted, flexShrink: 0, transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", marginTop: 4 }}>▼</span>
        </div>
      </button>
      <div style={{ maxHeight: expanded ? 2000 : 0, opacity: expanded ? 1 : 0, overflow: "hidden", transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease" }}>
        <div style={{ padding: isMobile ? "0 18px 20px" : "0 24px 24px" }}>
          <div style={{ height: 1, background: `${card.color}33`, marginBottom: 16 }} />
          {card.backParagraphs.map((p, i) => (
            <p key={i} style={{ fontSize: 13, lineHeight: 1.8, color: t.textMuted, marginTop: i > 0 ? 14 : 0 }}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccordionBody({ isOpen, windowWidth, children }: { isOpen: boolean; windowWidth: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [isOpen, windowWidth, children]);
  // Re-measure when inner content resizes (e.g. collapsible tables expand)
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

function fmt(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 100) return `$${(m / 1).toFixed(0)}M`;
  return `$${m.toFixed(1)}M`;
}

/* Chart Source Badge , shown under every chart title */
function SourceBadge(_props: { chartId: string; source: string }) {
  return null;
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

function AnimatedBar({ pct, color = BRAND.navy, trackColor, delay = 0, isPdf = false }: { pct: number; color?: string; trackColor?: string; delay?: number; isPdf?: boolean }) {
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

function ProgressRow({ label, value, pct, emoji, delay = 0, t, isPdf = false }: { label: string; value: string; pct: number; emoji?: React.ReactNode; delay?: number; t: Theme; isPdf?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{emoji ? <>{emoji} </> : ""}{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 600 }}>{value}</span>
      </div>
      <AnimatedBar pct={pct} delay={delay} trackColor={t.border} isPdf={isPdf} />
    </div>
  );
}

const STAT_ICONS = {
  funding: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  unicorn: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 9l-7 1 5 5-1.5 7L12 18.5 18.5 22 17 15l5-5-7-1z" /></svg>,
  investors: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  globe: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  trending: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  placeholder: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg>,
  ma: (c: string) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 16.25l-3-2.5-3.5 3-3.5-3-3 2.5" /><path d="M2 12a5 5 0 0 1 5-5 4.97 4.97 0 0 1 3 1l2 1.5L14 8a4.97 4.97 0 0 1 3-1 5 5 0 0 1 5 5c0 4.5-6.5 8.5-10 10.5C8.5 20.5 2 16.5 2 12z" /></svg>,
};

function StatCard({ num, label, t, subtitle, style, icon }: { num: React.ReactNode; label: string; t: Theme; subtitle?: string; style?: React.CSSProperties; icon?: keyof typeof STAT_ICONS }) {
  return (
    <div className="stx-reveal"
      style={{ background: t.bgCard, padding: "36px 32px", position: "relative", overflow: "hidden", borderRadius: 14, border: `1px solid ${t.border}`, ...style }}>
      {icon && <div style={{ position: "absolute", top: 20, right: 20, opacity: 0.13 }}>{STAT_ICONS[icon](t.textMuted)}</div>}
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(44px,4.5vw,64px)", color: BRAND.pink, lineHeight: 1 }}>{num}</div>
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: t.titleColor, lineHeight: 1.4 }}>{label}</div>
      {subtitle && <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}

function YearBarChart({ data, t, isPdf = false }: { data: { year: number; total_m: number; deals: number }[]; t: Theme; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const maxVal = Math.max(...data.map(d => d.total_m));
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 260, paddingBottom: 44, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
      {data.map((d, i) => {
        const pct = (d.total_m / maxVal) * 100;
        const isLatest = Number(d.year) === 2025;
        return (
          <div key={d.year} title={`${d.year}: ${fmt(d.total_m)} across ${d.deals} deals`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", cursor: "default" }}>
            <div style={{ width: "100%", height: animated ? `${pct}%` : "0%", background: isLatest ? `linear-gradient(to top,${BRAND.tealBright},${BRAND.lightBlue}66)` : `linear-gradient(to top,${BRAND.navy},${BRAND.teal}55)`, transition: `height 1.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`, position: "relative", minHeight: 4, borderRadius: "3px 3px 0 0" }}>
              <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", fontFamily: "'DM Mono',monospace", fontSize: 10, color: isLatest ? BRAND.tealBright : t.textSec, whiteSpace: "nowrap", fontWeight: 600 }}>
                {fmt(d.total_m)}
              </span>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: isLatest ? BRAND.tealBright : t.textMuted, textAlign: "center", fontWeight: isLatest ? 700 : 400 }}>
              {d.year}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MaStackedBarChart({ chartData, mode, t, isPdf = false }: { chartData: { year: number; sportstech: number; non_sportstech: number; sportstech_val: number; non_sportstech_val: number }[]; mode: "count" | "value"; t: Theme; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const isValue = mode === "value";
  const maxTotal = Math.max(...chartData.map(d => isValue ? d.sportstech_val + d.non_sportstech_val : d.sportstech + d.non_sportstech));
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 280, paddingBottom: 44, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
      {chartData.map((d, i) => {
        const st = isValue ? d.sportstech_val : d.sportstech;
        const nst = isValue ? d.non_sportstech_val : d.non_sportstech;
        const total = st + nst;
        const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        const stPct = total > 0 ? (st / total) * 100 : 0;
        const nstPct = total > 0 ? (nst / total) * 100 : 0;
        const label = isValue ? `$${total >= 1000 ? (total / 1000).toFixed(1) + "B" : total + "M"}` : String(total);
        return (
          <div key={d.year} title={`${d.year}: ${isValue ? "$" + st + "M" : st} sportstech + ${isValue ? "$" + nst + "M" : nst} non-sportstech`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", cursor: "default" }}>
            <div style={{ width: "100%", height: animated ? `${pct}%` : "0%", transition: `height 1.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`, position: "relative", minHeight: 4, borderRadius: "3px 3px 0 0", display: "flex", flexDirection: "column" }}>
              <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.teal, whiteSpace: "nowrap", fontWeight: 600 }}>
                {label}
              </span>
              <div style={{ height: `${stPct}%`, background: `linear-gradient(to top,${BRAND.teal},${BRAND.tealBright})`, borderRadius: "3px 3px 0 0", minHeight: stPct > 0 ? 2 : 0 }} />
              <div style={{ height: `${nstPct}%`, background: `linear-gradient(to top,${BRAND.slate},${BRAND.navy})`, borderRadius: stPct === 0 ? "3px 3px 0 0" : 0, minHeight: nstPct > 0 ? 2 : 0 }} />
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, textAlign: "center" }}>
              {d.year}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Continent Filter ────────────────────────────────────────────────────── */
type RegionCode = "NA" | "EU" | "APAC" | "ROW";

const CONTINENT_REGIONS: { code: RegionCode; label: string; path: string; extra?: string }[] = [
  {
    code: "NA", label: "N. America",
    /* North America: wide top Canada/Alaska, east coast angles SE, Gulf indentation, Florida tip, west coast left */
    path: "M 8,8 L 24,3 L 50,2 L 74,6 L 82,12 L 82,22 L 76,30 L 72,36 L 68,40 L 62,38 L 56,34 L 44,42 L 24,50 L 14,44 L 8,30 L 8,18 Z",
  },
  {
    code: "EU", label: "Europe",
    /* Europe: compact blob, Scandinavia juts NE, Iberian SW, Mediterranean indentation south */
    path: "M 38,8 L 46,4 L 54,4 L 64,10 L 70,18 L 66,28 L 58,36 L 48,40 L 38,36 L 28,28 L 26,20 L 30,12 Z",
    extra: "M 46,4 L 44,0 L 48,2 Z M 54,4 L 58,0 L 60,4 Z M 58,36 L 60,42 L 56,46 L 52,40 Z",
  },
  {
    code: "APAC", label: "Asia Pacific",
    /* Asia Pacific: very wide, spans full width, Indian subcontinent dips south, SE Asia curves down-right */
    path: "M 2,14 L 18,7 L 46,4 L 74,5 L 95,12 L 97,24 L 90,38 L 76,48 L 60,56 L 44,60 L 30,56 L 14,46 L 3,28 Z",
    extra: "M 30,56 L 24,64 L 30,68 L 38,62 L 44,60 Z",
  },
  {
    code: "ROW", label: "Rest of World",
    /* Africa (center-right): elongated oval tapering to Cape of Good Hope; South America (left): pear-shaped */
    path: "M 42,6 L 62,6 L 70,16 L 70,36 L 58,62 L 48,66 L 38,62 L 28,42 L 28,22 L 34,10 Z",
    extra: "M 4,22 L 16,18 L 22,28 L 20,48 L 12,58 L 4,54 L 2,40 Z",
  },
];

function ContinentFilterBar({
  value, onChange, t, label,
}: {
  value: RegionCode | null;
  onChange: (v: RegionCode | null) => void;
  t: Theme;
  label?: string;
}) {
  const allRegions = [{ code: null as RegionCode | null, label: "All" }, ...CONTINENT_REGIONS.map(r => ({ code: r.code as RegionCode | null, label: r.label }))];
  return (
    <div style={{ marginBottom: 28 }}>
      {label && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
          {label}
        </div>
      )}
      <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2, flexWrap: "wrap" }}>
        {allRegions.map(r => {
          const active = value === r.code;
          return (
            <button
              key={String(r.code)}
              onClick={() => onChange(active && r.code !== null ? null : r.code)}
              style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1,
                padding: "5px 16px", borderRadius: 16, border: "none", cursor: "pointer",
                background: active ? BRAND.pink : "transparent",
                color: active ? "#fff" : t.textMuted,
                fontWeight: active ? 700 : 400,
                transition: "all 0.18s",
                outline: "none",
                textTransform: "uppercase",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PollVoteSection({ pollId, article, t, isMobile, user, sessionValid }: { pollId: string; article: FeaturedArticle; t: Theme; isMobile: boolean; user: any; sessionValid: boolean }) {
  // Atlas port: the pros/cons poll keeps local vote state (STX's /api/report
  // poll backend isn't wired here). Vote is optimistic + client-only.
  const [pollData, setPollData] = useState<{ results: Record<string, number>; total: number; userVote: string | null }>(
    { results: { yes: 0, no: 0 }, total: 0, userVote: null },
  );

  const handleVote = (e: React.MouseEvent, vote: string) => {
    e.stopPropagation();
    e.preventDefault();
    trackG26("vote_cast", { poll: pollId, vote });
    if (!user || !sessionValid) {
      window.dispatchEvent(new Event("showAuthModal"));
      return;
    }
    setPollData((prev) => {
      if (prev.userVote) return prev; // one vote per viewer
      return {
        results: { ...prev.results, [vote]: (prev.results[vote] ?? 0) + 1 },
        total: prev.total + 1,
        userVote: vote,
      };
    });
  };

  const userVote = pollData?.userVote ?? null;
  const total = pollData?.total ?? 0;
  const yesCount = pollData?.results?.["yes"] ?? 0;
  const noCount = pollData?.results?.["no"] ?? 0;
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;
  const hasVoted = userVote !== null;

  const GREEN = "#4caf50";

  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 24 }} />
      {article.prosConsQuestion && (
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 26, color: t.titleColor, marginBottom: 24, textAlign: "center" }}>{article.prosConsQuestion}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, alignItems: "stretch" }}>
        {/* WHY IT WILL , clickable to vote yes */}
        <button
          type="button"
          onClick={(e) => handleVote(e, "yes")}
          disabled={hasVoted}
          style={{
            background: t.bgCard,
            border: `1px solid ${userVote === "yes" ? GREEN : t.border}`,
            borderRadius: 10,
            padding: isMobile ? "20px 16px" : "24px 20px",
            cursor: "pointer",
            outline: "none",
            textAlign: "left",
            transition: "all 0.25s",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: 2,
          }}
        >
          {userVote === "yes" && (
            <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: GREEN, textTransform: "uppercase", opacity: 0.8 }}>YOUR VOTE</div>
          )}
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: GREEN, marginBottom: 16 }}>WHY IT WILL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            {article.pros!.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: GREEN, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.titleColor, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: t.textMuted }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
          {!hasVoted && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${GREEN}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: GREEN, textTransform: "uppercase", border: `1px solid ${GREEN}`, borderRadius: 999, padding: "6px 20px" }}>VOTE: IT WILL</span>
            </div>
          )}
        </button>

        {/* WHY IT WON'T , clickable to vote no */}
        <button
          type="button"
          onClick={(e) => handleVote(e, "no")}
          disabled={hasVoted}
          style={{
            background: t.bgCard,
            border: `1px solid ${userVote === "no" ? BRAND.pink : t.border}`,
            borderRadius: 10,
            padding: isMobile ? "20px 16px" : "24px 20px",
            cursor: "pointer",
            outline: "none",
            textAlign: "left",
            transition: "all 0.25s",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: 2,
          }}
        >
          {userVote === "no" && (
            <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: BRAND.pink, textTransform: "uppercase", opacity: 0.8 }}>YOUR VOTE</div>
          )}
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: BRAND.pink, marginBottom: 16 }}>WHY IT WON'T</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            {article.cons!.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: BRAND.pink, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.titleColor, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: t.textMuted }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
          {!hasVoted && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${BRAND.pink}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", border: `1px solid ${BRAND.pink}`, borderRadius: 999, padding: "6px 20px" }}>VOTE: IT WON'T</span>
            </div>
          )}
        </button>
      </div>

      {/* Pre-vote prompt or post-vote results */}
      {!hasVoted ? (
        <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", marginTop: 16, fontStyle: "italic" }}>Cast your vote to see the results</p>
      ) : (
        <div style={{ marginTop: 20 }}>
          <div style={{ height: 6, borderRadius: 3, background: `${BRAND.pink}15`, overflow: "hidden", display: "flex" }}>
            <div style={{ height: "100%", width: `${yesPct}%`, background: GREEN, transition: "width 0.4s ease" }} />
            <div style={{ height: "100%", flex: 1, background: `${BRAND.pink}40` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: GREEN }}>{yesPct}% It will</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>{total} vote{total !== 1 ? "s" : ""}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: BRAND.pink }}>{noPct}% It won't</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportGSTER26() {
  const reportLocation = usePathname();
  const isGster26 = reportLocation === "/reports/gster26";

  // ── Phase 3: DB-editable editorial content ───────────────────────────────
  // Fetch the report's editorial override (reports.content jsonb); each block
  // falls back to the committed default so the report renders identically until
  // an edition is edited in the DB. The heavy computed chart data stays static.
  const { data: reportDoc } = useSWR<{ content?: Record<string, any> | null }>(qk.reports.detail("gster26"));
  const ov = reportDoc?.content ?? null;
  const INNOVATOR_RESPONSES   = ov?.innovatorResponses   ?? INNOVATOR_RESPONSES_DEFAULT;
  const watchInnovators       = ov?.watchInnovators      ?? watchInnovators_DEFAULT;
  const watchPeak             = ov?.watchPeak            ?? watchPeak_DEFAULT;
  const watchStxRecommends    = ov?.watchStxRecommends   ?? watchStxRecommends_DEFAULT;
  const FEATURED_ARTICLES     = ov?.featuredArticles     ?? FEATURED_ARTICLES_DEFAULT;
  // PEAK_TRACKS is code-only (its items carry live lucide Icon components, not
  // serializable JSON) — no DB override path, so reports.content can't crash it.
  const PEAK_TRACKS           = PEAK_TRACKS_DEFAULT;
  const PEAK_SWC_FINALISTS    = ov?.peakSwcFinalists     ?? PEAK_SWC_FINALISTS_DEFAULT;
  const GROUNDBREAKERS_ORGS   = ov?.groundbreakersOrgs   ?? GROUNDBREAKERS_ORGS_DEFAULT;
  const PEAK_PARTNERS_TIER1   = ov?.peakPartnersTier1    ?? PEAK_PARTNERS_TIER1_DEFAULT;
  const PEAK_PARTNERS_TIER2   = ov?.peakPartnersTier2    ?? PEAK_PARTNERS_TIER2_DEFAULT;
  const PEAK_PARTNERS_TIER3   = ov?.peakPartnersTier3    ?? PEAK_PARTNERS_TIER3_DEFAULT;
  const isPdf = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pdf") === "true";
  const { user, sessionValid, loading: authLoading } = useAuthSession();
  const isAuthenticated = !authLoading && !!user && sessionValid;
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (isPdf) return; // skip auth in PDF mode
    if (!isGster26) return;
    if (authLoading) return;
    setShowAuthModal(!isAuthenticated);
  }, [isGster26, authLoading, isAuthenticated, isPdf]);

  // Track page view
  useEffect(() => { trackG26("page_view"); }, []);


  // Track all external link clicks within the report
  const reportContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = reportContainerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (anchor && anchor.hostname !== window.location.hostname) {
        trackG26("external_link_click", { url: anchor.href, text: anchor.textContent?.slice(0, 60) });
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, []);

  const authGateActive = isPdf ? false : (isGster26 && showAuthModal);

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

  const [isDark, _setIsDark] = useState(false);
  const setIsDark = (v: boolean | ((d: boolean) => boolean)) => { _setIsDark(v); trackG26("theme_toggle"); };
  const [mobileMenuOpen, _setMobileMenuOpen] = useState(false);
  const setMobileMenuOpen = (v: boolean | ((o: boolean) => boolean)) => { _setMobileMenuOpen(v); trackG26("mobile_menu_toggle"); };
  const [factTab, _setFactTab] = useState<"funding" | "ma">("funding");
  const setFactTab = (v: "funding" | "ma") => { _setFactTab(v); trackG26("tab_switch", { tab: "data_in_full", value: v }); };
  const [trendsTab, _setTrendsTab] = useState<"trends" | "articles">("trends");
  const setTrendsTab = (v: "trends" | "articles") => { _setTrendsTab(v); trackG26("tab_switch", { tab: "insights", value: v }); };
  const [watchTab, _setWatchTab] = useState<"innovators" | "peak" | "stx">("innovators");
  const setWatchTab = (v: "innovators" | "peak" | "stx") => { _setWatchTab(v); trackG26("tab_switch", { tab: "startups_to_watch", value: v }); };
  const [expandedBlock, _setExpandedBlock] = useState<string | null>(null);
  const setExpandedBlock = (v: string | null) => { _setExpandedBlock(v); if (v) trackG26("block_expand", { block: v }); };
  const [openRevTab, _setOpenRevTab] = useState<string | null>("euro");
  const setOpenRevTab = (v: string | null) => { _setOpenRevTab(v); if (v) trackG26("accordion_toggle", { section: v }); };
  const [showBackToTop, setShowBackToTop] = useState(false);
  const trendCardsRef = useRef<HTMLDivElement>(null);
  const [maChartMode, _setMaChartMode] = useState<"count" | "value">("count");
  const setMaChartMode = (v: "count" | "value") => { _setMaChartMode(v); trackG26("chart_mode_switch", { mode: v }); };
  const [cardImageData, setCardImageData] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [selectedInnovator, _setSelectedInnovator] = useState<any | null>(null);
  const setSelectedInnovator = (v: any | null) => { _setSelectedInnovator(v); setCardImageData(null); if (v) trackG26("innovator_click", { name: v?.name || v?.company_name }); };

  const generateCardImage = async (person: any, accentColor: string): Promise<string> => {
    const W = 480, H = 660;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    await document.fonts.ready;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0c0f1a");
    bg.addColorStop(1, "#111827");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    const bar = ctx.createLinearGradient(0, 0, W, 0);
    bar.addColorStop(0, BRAND.pink);
    bar.addColorStop(0.5, accentColor);
    bar.addColorStop(1, BRAND.pink + "88");
    ctx.fillStyle = bar;
    ctx.fillRect(0, 0, W, 5);

    // Circular photo
    const PHOTO_R = 52;
    const PHOTO_CX = W / 2;
    const PHOTO_CY = 90;

    if (person.photo_url) {
      try {
        const proxyRes = await fetch(person.photo_url);
        if (proxyRes.ok) {
          const blob = await proxyRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.src = objectUrl;
          await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); setTimeout(r, 3000); });
          // Glow ring
          ctx.save();
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 18;
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          // Clip and draw
          ctx.save();
          ctx.beginPath();
          ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, PHOTO_CX - PHOTO_R, PHOTO_CY - PHOTO_R, PHOTO_R * 2, PHOTO_R * 2);
          ctx.restore();
          URL.revokeObjectURL(objectUrl);
        }
      } catch { /* skip photo on error */ }
    } else {
      ctx.fillStyle = accentColor + "55";
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${PHOTO_R}px 'Bebas Neue', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(person.name.charAt(0), PHOTO_CX, PHOTO_CY);
    }

    // Name
    const nameY = PHOTO_CY + PHOTO_R + 20;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 26px 'Bebas Neue', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(person.name.toUpperCase(), W / 2, nameY);

    // Designation · Company
    ctx.fillStyle = accentColor;
    ctx.font = `600 12px sans-serif`;
    ctx.fillText(`${person.designation || ""} · ${person.company || ""}`, W / 2, nameY + 32);

    // Divider line
    const divY = nameY + 56;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, BRAND.pink + "66");
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(32, divY);
    ctx.lineTo(W - 32, divY);
    ctx.stroke();

    // Q&A section — prefer hard-coded responses, fall back to API data
    const hc = INNOVATOR_RESPONSES[person.name] || {};
    const questions = [
      { label: "Underserved areas ripe for disruption?", answer: hc.q_innovators || person.q_innovators || "" },
      { label: "Emerging technologies reshaping sports in 3–5 years?", answer: hc.q_investors || person.q_investors || "" },
      { label: "Operational areas seeking innovation?", answer: hc.q_sports_orgs || person.q_sports_orgs || "" },
    ].filter(q => q.answer.trim().length > 0);

    const wrapText = (text: string, maxWidth: number, lineHeight: number, startY: number): number => {
      const words = text.split(" ");
      let line = "";
      let y = startY;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, 32, y);
          line = word;
          y += lineHeight;
          if (y > H - 80) break;
        } else {
          line = test;
        }
      }
      if (line && y <= H - 80) { ctx.fillText(line, 32, y); y += lineHeight; }
      return y;
    };

    let qY = divY + 16;
    for (let i = 0; i < Math.min(questions.length, 2); i++) {
      if (qY > H - 100) break;
      const q = questions[i];
      // Q label
      ctx.fillStyle = accentColor;
      ctx.font = `600 10px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(q.label.toUpperCase(), 32, qY);
      qY += 16;
      // Answer text
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = `13px sans-serif`;
      qY = wrapText(q.answer, W - 64, 18, qY);
      qY += 14;
    }

    // Footer
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, H - 44, W, 44);
    const footerLine = ctx.createLinearGradient(0, 0, W, 0);
    footerLine.addColorStop(0, "transparent");
    footerLine.addColorStop(0.5, BRAND.pink + "66");
    footerLine.addColorStop(1, "transparent");
    ctx.strokeStyle = footerLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 44);
    ctx.lineTo(W, H - 44);
    ctx.stroke();

    ctx.fillStyle = BRAND.pink;
    ctx.font = `bold 14px 'Bebas Neue', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("SportsTechX", 24, H - 22);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `10px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("atlas.sportstechx.com/reports/gster26", W - 24, H - 22);

    return canvas.toDataURL("image/png");
  };
  const [fundingRegion, _setFundingRegion]       = useState<RegionCode | null>(null);
  const setFundingRegion = (v: RegionCode | null) => { _setFundingRegion(v); trackG26("region_filter", { filter: "funding", region: v || "global" }); };
  const [maAcquireeRegion, _setMaAcquireeRegion] = useState<RegionCode | null>(null);
  const setMaAcquireeRegion = (v: RegionCode | null) => { _setMaAcquireeRegion(v); trackG26("region_filter", { filter: "ma_acquiree", region: v || "global" }); };
  const [maAcquirerRegion, _setMaAcquirerRegion] = useState<RegionCode | null>(null);
  const setMaAcquirerRegion = (v: RegionCode | null) => { _setMaAcquirerRegion(v); trackG26("region_filter", { filter: "ma_acquirer", region: v || "global" }); };
  const [fundingYear, _setFundingYear]           = useState<"last5" | "2025">("last5");
  const setFundingYear = (v: "last5" | "2025") => { _setFundingYear(v); trackG26("year_filter", { filter: "funding", year: v }); };
  const [maYear, _setMaYear]                     = useState<"last5" | "2025">("last5");
  const setMaYear = (v: "last5" | "2025") => { _setMaYear(v); trackG26("year_filter", { filter: "ma", year: v }); };
  const t = isPdf ? LIGHT : (isDark ? DARK : LIGHT);
  const windowWidth = useWindowWidth();
  const isMobile = isPdf ? false : windowWidth < 640;

  /* ── PDF mode: force all content visible, no interactivity ─────────── */
  const pdfBreak: React.CSSProperties = isPdf ? { breakBefore: "page" as const, paddingTop: 40 } : {};

  /* Hardcoded data lookup , all filter combinations pre-computed */
  const data = useMemo(() => {
    const regionKey = fundingRegion || maAcquireeRegion || maAcquirerRegion || "global";
    const key = `${regionKey}_${fundingYear}_${maYear}`;
    return (GSTER25_FACTS[key] || GSTER25_FACTS["global_last5_last5"]) as ReportData;
  }, [fundingRegion, maAcquireeRegion, maAcquirerRegion, fundingYear, maYear]);
  const isLoading = false;

  type WatchDBEntry = {
    company_name: string;
    company_website: string | null;
    description: string | null;
    city: string | null;
    country: string | null;
    sector: string | null;
  };
  // Atlas port: STX fetched these from /api/report/*. Here the watch lists fall
  // back to the component's committed hardcoded arrays, and the innovators come
  // from the committed Notion snapshot (gster26-innovators-data.ts).
  const watchData: { innovators: WatchDBEntry[]; peak: WatchDBEntry[]; stx: WatchDBEntry[] } | undefined = undefined;

  type NotionInnovator = {
    id: string; name: string; company: string; designation: string;
    q_innovators: string; q_investors: string; q_sports_orgs: string;
    logo_url: string; photo_url: string; country: string; continent: string; linkedin: string;
  };
  const notionData: { data: NotionInnovator[] } = { data: INNOVATORS_DATA as NotionInnovator[] };

  type MaDealLive = {
    acquiree_name: string; acquirer_name: string;
    acquisition_year: number; amount_m?: number;
    acquiree_country: string | null; acquiree_city: string | null;
    acquirer_country: string | null; acquirer_city: string | null;
    acquiree_sector: string | null; acquisition_type: string | null;
  };
  /* Hardcoded M&A deals lookup , all filter combinations pre-computed */
  const maDealsQuery = useMemo(() => {
    const key = `${maYear || "last5"}_${maAcquireeRegion || "global"}_${maAcquirerRegion || "global"}`;
    const d = (GSTER25_MA_DEALS[key] || GSTER25_MA_DEALS["last5_global_global"]) as { topMaDeals: MaDealLive[]; undisclosedMaDeals: MaDealLive[] };
    return { data: d, isLoading: false };
  }, [maYear, maAcquireeRegion, maAcquirerRegion]);

  const mergeWatchCompanies = useMemo(() => {
    const sectorMap: Record<string, WatchCompany["sector"]> = {
      "activity & performance": "athletes",
      "fans & content": "fans",
      "management & organisation": "execs",
    };

    function merge(
      dbList: WatchDBEntry[] | undefined,
      hardcoded: WatchCompany[]
    ): WatchCompanyWithLink[] {
      if (!dbList || dbList.length === 0) {
        return hardcoded.map((c) => ({ ...c, website: `https://${c.domain}` }));
      }
      const hardcodedByName = new Map<string, WatchCompany>();
      const hardcodedByDomain = new Map<string, WatchCompany>();
      for (const c of hardcoded) {
        hardcodedByName.set(c.name.toLowerCase(), c);
        if (c.domain) hardcodedByDomain.set(c.domain.toLowerCase(), c);
      }

      return dbList.map((db) => {
        let domain = "";
        if (db.company_website) {
          try { domain = new URL(db.company_website).hostname.replace(/^www\./, ""); } catch {}
        }
        const match = hardcodedByName.get(db.company_name.toLowerCase()) || (domain ? hardcodedByDomain.get(domain.toLowerCase()) : undefined);
        const dbSector = db.sector ? sectorMap[db.sector.toLowerCase()] || "execs" : "execs";
        return {
          name: db.company_name,
          description: match?.description || db.description || "Placeholder",
          why: match?.why || "Placeholder",
          domain: domain || match?.domain || "",
          city: db.city || match?.city || "",
          country: db.country || match?.country || "",
          countryFlag: (db.country && db.country !== "TBC") ? getCountryFlag(db.country) : (match?.country && match.country !== "TBC" ? getCountryFlag(match.country) : ""),
          sector: dbSector,
          website: db.company_website || (match ? `https://${match.domain}` : null),
        };
      });
    }
    return {
      innovators: merge(watchData?.innovators, watchInnovators),
      peak: merge(watchData?.peak, watchPeak),
      stx: merge(watchData?.stx, watchStxRecommends),
    };
  }, [watchData, watchInnovators, watchPeak, watchStxRecommends]);

  const lenisRef        = useRef<Lenis | null>(null);
  const progressBarRef  = useRef<HTMLDivElement>(null);
  const heroContentRef  = useRef<HTMLDivElement>(null);
  const navRef          = useRef<HTMLElement>(null);
  const skewWrapRef     = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  /* Stable randomised exit directions for hero + 6 sections (assigned once per page load) */
  const exitDirsRef = useRef<number[]>(Array.from({ length: 9 }, () => (Math.random() > 0.5 ? 1 : -1)));
  useReveal(`${isDark}-${factTab}-${trendsTab}-${watchTab}-${fundingRegion}-${maAcquireeRegion}-${maAcquirerRegion}-${fundingYear}-${maYear}-${isLoading}`);

  /* Resize Lenis when accordion content changes + auto-scroll to expanded block */
  useEffect(() => {
    if (!expandedBlock) return;
    const timer = setTimeout(() => {
      lenisRef.current?.resize();
      const el = document.getElementById(`trend-expanded-${expandedBlock}`);
      if (el) {
        lenisRef.current?.scrollTo(el, { offset: -72, duration: 1.0, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [expandedBlock]);

  /* Show "Back to top" button when trend cards scroll out of view while an article is open */
  useEffect(() => {
    const el = trendCardsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!expandedBlock) { setShowBackToTop(false); return; }
      /* Only show if cards are out of view AND the expanded article is still in/below the viewport */
      const expandedEl = document.getElementById(`trend-expanded-${expandedBlock}`);
      if (!expandedEl) { setShowBackToTop(false); return; }
      const expandedRect = expandedEl.getBoundingClientRect();
      const isWithinExpanded = expandedRect.bottom > 0 && expandedRect.top < window.innerHeight;
      setShowBackToTop(!entry.isIntersecting && isWithinExpanded);
    }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [expandedBlock]);

  /* Section anchors used for horizontal→vertical jump and dot nav */
  const SECTION_IDS = ["hero", "trends", "innovators", "peak2026", "ecomap", "ngsc", "dealflow", "ecosystem"];
  const SECTION_LABELS = ["Summary", "Trends", "Innovators", "Startups to Watch", "Ecosystem", "Data in Full"];

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

    /* ── 1. Wire Lenis into GSAP ticker (official integration pattern) ── */
    const lenisRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    /* ── 2. ScrollTrigger proxy so GSAP reads Lenis scroll position ────── */
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

    /* ── 3. Hero , no pin/fade on mobile; subtle parallax on desktop ── */
    const heroContent = heroContentRef.current;
    void heroContent; /* referenced by heroContentRef */

    /* Refresh after all setup */
    ScrollTrigger.refresh();

    /* ── 5. Lenis scroll → lightweight effects (no skew, no RAF conflict) ── */
    const getSections = () =>
      ["#trends","#innovators","#ecosystem","#ecomap","#dealflow"]
        .map(id => document.querySelector(id) as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];

    const getActiveIdx = (_scrollY: number) => {
      const sections = getSections();
      let idx = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.4) idx = i + 1;
      }
      return idx;
    };

    let lastDotIdx = -1;
    lenis.on("scroll", ({ scroll, progress, direction }: { scroll: number; progress: number; direction: number }) => {
      /* Reading progress bar */
      if (progressBarRef.current)
        progressBarRef.current.style.transform = `scaleX(${progress})`;

      /* Nav hide on scroll-down, reveal on scroll-up */
      if (navRef.current)
        navRef.current.style.transform = "translateY(0)";

      /* Active section dot */
      const dotIdx = getActiveIdx(scroll);
      if (dotIdx !== lastDotIdx) { lastDotIdx = dotIdx; setActiveDot(dotIdx); }

      /* Also notify ScrollTrigger of each scroll tick */
      ScrollTrigger.update();
    });

    /* ── 6. Horizontal swipe → vertical section jump ─────────────────── */
    let jumping = false;
    const jumpSection = (delta: number) => {
      if (jumping) return;
      jumping = true;
      const sections = getSections();
      const currentIdx = getActiveIdx(lenis.animatedScroll);
      const nextIdx = currentIdx + delta;
      if (nextIdx <= 0) {
        lenis.scrollTo(0, { duration: 1.4, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      } else if (nextIdx <= sections.length) {
        lenis.scrollTo(sections[nextIdx - 1], { offset: -72, duration: 1.4, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
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
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) jumpSection(dx > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      gsap.ticker.remove(lenisRaf);
      ScrollTrigger.removeEventListener("refresh", onSTRefresh);
      ScrollTrigger.getAll().forEach(st => st.kill());
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);


  /* Inject page-scoped animation styles */
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "stx-report-styles";
    style.textContent = `
      .stx-reveal { opacity:1; transform:none; }
      .stx-visible { opacity:1!important; transform:none!important; }
      .stx-marquee { animation:stxMarquee 32s linear infinite; }
      @keyframes stxMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      .stx-scroll-line { animation:stxPulse 2s infinite; }
      @keyframes stxPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      .stx-trend-card:hover { border-color:${BRAND.pink}!important; transform:translateY(-6px)!important; }
      .stx-nav-link:hover { color:${BRAND.pink}!important; }
      .stx-toggle { cursor:pointer; user-select:none; }
      @media (max-width: 639px) {
        .stx-dot-nav { display:none!important; }
        .stx-nav-links { display:none!important; }
        .stx-nav-hub { display:none!important; }
        .stx-trend-card:hover { transform:none!important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("stx-report-styles")?.remove();
  }, []);

  const s = data?.summary;
  const totalFundingB = s ? (s.total_funding_m / 1000).toFixed(1) : "—";
  const totalCountry = data?.topCountries.slice(0, 8).reduce((sum, c) => sum + c.total_m, 0) || 1;

  const regionLabels: Record<string, string> = { NA: "North America", EU: "Europe", APAC: "Asia Pacific", ROW: "Rest of World" };


  const marqueeItems = data ? [
    `$${totalFundingB}B TOTAL DEALFLOW`, `${s?.total_companies?.toLocaleString()} COMPANIES TRACKED`,
    `${s?.total_deals?.toLocaleString()} FUNDING ROUNDS`, `${s?.total_ma} M&A DEALS`,
    `${s?.total_countries} COUNTRIES COVERED`, "SPORTSTECHX ATLAS",
    `$${totalFundingB}B TOTAL DEALFLOW`, `${s?.total_companies?.toLocaleString()} COMPANIES TRACKED`,
    `${s?.total_deals?.toLocaleString()} FUNDING ROUNDS`, `${s?.total_ma} M&A DEALS`,
    `${s?.total_countries} COUNTRIES COVERED`, "SPORTSTECHX ATLAS",
  ] : Array(12).fill("LOADING…");

  const sectionLabel = (text: string) => (
    <p
      style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 5, color: BRAND.pink, textTransform: "uppercase", marginBottom: 14 }}
      className="text-[20px]">{text}</p>
  );
  const sectionTitle = (text: string, size = "clamp(42px,6vw,88px)") => (
    <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: t.titleColor }}>{text}</h2>
  );

  const YearPill = () => (
    <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2, flexShrink: 0, alignSelf: "center" }}>
      {(["last5", "2025"] as const).map(yr => {
        const active = fundingYear === yr;
        return (
          <button key={yr} onClick={() => setFundingYear(yr)} style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
            padding: "4px 13px", borderRadius: 14, border: "none", cursor: "pointer",
            background: active ? BRAND.pink : "transparent",
            color: active ? "#fff" : t.textMuted,
            fontWeight: active ? 700 : 400,
            transition: "all 0.18s", outline: "none",
          }}>
            {yr === "last5" ? "LAST 5 YRS" : "2025"}
          </button>
        );
      })}
    </div>
  );

  const fundingHeader = (text: string, size = "clamp(26px,3vw,40px)") => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 0 }}>
      <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: t.titleColor, margin: 0 }}>{text}</h2>
      <YearPill />
    </div>
  );

  const MaYearPill = () => (
    <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2, flexShrink: 0, alignSelf: "center" }}>
      {(["last5", "2025"] as const).map(yr => {
        const active = maYear === yr;
        return (
          <button key={yr} onClick={() => setMaYear(yr)} style={{
            fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
            padding: "4px 13px", borderRadius: 14, border: "none", cursor: "pointer",
            background: active ? BRAND.pink : "transparent",
            color: active ? "#fff" : t.textMuted,
            fontWeight: active ? 700 : 400,
            transition: "all 0.18s", outline: "none",
          }}>
            {yr === "last5" ? "LAST 5 YRS" : "2025"}
          </button>
        );
      })}
    </div>
  );

  const maHeader = (text: string, size = "clamp(26px,3vw,40px)") => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 0 }}>
      <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: t.titleColor, margin: 0 }}>{text}</h2>
      <MaYearPill />
    </div>
  );

  return (
    <div ref={reportContainerRef} style={{ background: t.bg, color: t.text, fontFamily: "'Open Sans','system-ui',sans-serif", overflowX: "hidden", minHeight: "100vh", transition: "background 0.35s, color 0.35s" }}>
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav ref={navRef} style={{ position: "fixed", top: 3, left: 0, right: 0, zIndex: 100, padding: isMobile ? "12px 16px" : "16px 40px", display: (authGateActive || isPdf) ? "none" : "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)", background: t.navBg, borderBottom: `1px solid ${t.divider}`, gap: 16, transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)", willChange: "transform" }}>
        <a href="https://atlas.sportstechx.com" target="_blank" rel="noopener noreferrer" style={{ lineHeight: 0, flexShrink: 0 }}>
          <img src={isDark ? "/landing/atlas-wordmark-white.svg" : "/landing/atlas-wordmark-dark.svg"} alt="Atlas" style={{ height: isMobile ? 26 : 34, display: "block" }} />
        </a>
        {/* Desktop nav links */}
        {!isMobile && (
          <div className="stx-nav-links" style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {([["#trends","Insights",1],["#innovators","Innovators",2],["#ecosystem","Startups to Watch",3],["#ecomap","Ecosystem",4],["#dealflow","Data in Full",5]] as const).map(([href, label, dotIdx]) => {
              const isActive = activeDot === dotIdx;
              return (
                <a key={href} href={href} className="stx-nav-link"
                  style={{
                    fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
                    fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase",
                    color: isActive ? BRAND.pink : t.textMuted,
                    textDecoration: "none", transition: "color 0.2s",
                    fontWeight: 500,
                    paddingBottom: 4,
                    borderBottom: isActive ? `2px solid ${BRAND.pink}` : "2px solid transparent",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    trackG26("nav_click", { section: label });
                    const target = document.querySelector(href);
                    if (target) lenisRef.current?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                  }}>
                  {label}
                </a>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center", flexShrink: 0 }}>
          {/* Dark/Light toggle */}
          <button className="stx-toggle" onClick={() => setIsDark((d: boolean) => !d)}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", background: isDark ? "rgba(243,33,99,0.16)" : "rgba(243,33,99,0.08)", border: `1px solid ${isDark ? "rgba(243,33,99,0.7)" : "rgba(243,33,99,0.5)"}`, borderRadius: 99, padding: isMobile ? "6px 9px" : "6px 11px", fontSize: isMobile ? 10 : 12, color: isDark ? "#ffa7c2" : "#f32163", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "background 0.25s, color 0.25s" }}>
            {isDark ? <Sun size={isMobile ? 14 : 16} strokeWidth={2} /> : <Moon size={isMobile ? 14 : 16} strokeWidth={2} />}
          </button>
          {/* Desktop: Hub link / Mobile: Hamburger */}
          {isMobile ? (
            <button onClick={() => setMobileMenuOpen(o => !o)}
              style={{ background: "none", border: `1px solid ${BRAND.pink}`, borderRadius: 8, padding: "5px 8px", color: BRAND.pink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : (
            <>
              <a href={GSTER26_PDF_URL} download="GSTER26-LITE.pdf"
                style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", fontSize: 11, letterSpacing: 1.6, fontWeight: 500, color: "#fff", background: "#f32163", border: "1px solid #f32163", padding: "8px 18px", textDecoration: "none", textTransform: "uppercase", transition: "opacity 0.2s", borderRadius: 99 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onClick={() => { trackG26("nav_click", { section: "pdf_download" }); }}
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
            {([["#trends","Insights"],["#innovators","Innovators"],["#ecosystem","Startups to Watch"],["#ecomap","Ecosystem"],["#dealflow","Data in Full"]] as const).map(([href, label]) => (
              <a key={href} href={href}
                style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: t.textMuted, textDecoration: "none", padding: "10px 0", borderBottom: `1px solid ${t.divider}`, fontFamily: "'DM Mono',monospace", transition: "color 0.2s" }}
                onClick={(e) => {
                  e.preventDefault();
                  trackG26("nav_click", { section: label, mobile: true });
                  setMobileMenuOpen(false);
                  const target = document.querySelector(href);
                  if (target) lenisRef.current?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                }}>
                {label}
              </a>
            ))}
            <a href={GSTER26_PDF_URL} download="GSTER26-LITE.pdf" onClick={() => { trackG26("nav_click", { section: "pdf_download", mobile: true }); setMobileMenuOpen(false); }} style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: "#fff", background: "#f32163", textDecoration: "none", padding: "11px 20px", fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", fontWeight: 500, borderRadius: 99, display: "inline-block", marginTop: 4 }}>↓ Download PDF</a>
          </div>
        </div>
      )}
      {/* ── Back to Top button for trends/explained articles ── */}
      {!isPdf && <button
        onClick={() => {
          trackG26("back_to_top");
          const target = document.querySelector("#trends");
          if (target) lenisRef.current?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.0, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        }}
        style={{
          position: "fixed", bottom: isMobile ? 20 : 32, right: isMobile ? 20 : 32, zIndex: 140,
          background: BRAND.pink, color: "#fff", border: "none", borderRadius: 50,
          padding: isMobile ? "10px 16px" : "10px 20px",
          fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
          cursor: "pointer", boxShadow: "0 4px 20px rgba(237,26,94,0.4)",
          opacity: showBackToTop ? 1 : 0, pointerEvents: showBackToTop ? "auto" : "none",
          transform: showBackToTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>↑</span> BACK TO TOP
      </button>}
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section id="stx-hero" style={{ minHeight: isPdf ? "auto" : "100vh", height: isPdf ? "auto" : (isMobile ? "100svh" : "100vh"), position: "relative", display: "flex", alignItems: "center", overflow: "hidden", background: isDark ? "#0c0f1a" : BRAND.darkTitle, margin: 0, padding: isPdf ? "60px 0" : 0, width: "100%" }}>
        <ParticleCanvas dark={isDark} />
        {/* Radial overlay */}
        <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(12,15,26,0.6) 100%)" : "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(45,59,73,0.5) 100%)" }} />
        {/* Diagonal accent lines */}
        <div style={{ position: "absolute", top: 0, left: "38%", width: 2, height: "140%", background: `linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.15) 50%, transparent 90%)`, transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: "42%", width: 1, height: "140%", background: `linear-gradient(to bottom, transparent 15%, rgba(237,26,94,0.08) 50%, transparent 85%)`, transform: "rotate(12deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        {/* Grid dot pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
        {/* Soft pink glow behind cards area */}
        <div style={{ position: "absolute", top: "20%", right: "10%", width: "50%", height: "60%", background: "radial-gradient(ellipse, rgba(237,26,94,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div ref={heroContentRef} style={{
          position: "relative", zIndex: 2, width: "100%", maxWidth: 1360, margin: "0 auto",
          padding: isMobile ? "0px 20px" : "120px 48px 80px",
          display: "flex", alignItems: isMobile ? "center" : "flex-start", justifyContent: isMobile ? "center" : undefined, gap: isMobile ? 0 : 64,
          flexDirection: isMobile ? "column" : "row", willChange: "transform",
        }}>
          {/* Left , Title (on mobile this is the only thing in the hero) */}
          <div style={{ flex: isMobile ? "none" : "1 1 auto", maxWidth: isMobile ? "100%" : "50%" }}>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? "clamp(64px,18vw,96px)" : "clamp(72px,8vw,130px)", lineHeight: 0.92, letterSpacing: -1, margin: 0 }}>
              <span style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                GLOBAL
              </span>
              <span style={{ display: "block", background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                SPORTSTECH
              </span>
              <span style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ECOSYSTEM
              </span>
              <span style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                REPORT{" "}
                <span style={{ background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>2026</span>
              </span>
            </h1>
            {/* Accent bar */}
            <div style={{ width: 48, height: 3, background: `linear-gradient(to right,${BRAND.pink},#ff6b9d)`, borderRadius: 2, marginTop: 24 }} />
            <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", marginTop: 16, maxWidth: 560 }}>Welcome to the ninth edition of the most comprehensive annual review of investment, innovation, and technology in the global sports ecosystem.</p>
            {/* Logos */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 28, marginTop: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>Presented by</span>
                <img src="/landing/atlas-wordmark-white.svg" alt="SportsTechX" style={{ height: 33, opacity: 0.9 }} />
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(190,208,227,0.2)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>Powered by</span>
                <img src={isGster26 ? "/peak-logo-nav.webp" : "/peak-logo.jpeg"} alt="PEAK" style={{ height: isGster26 ? 28 : 36, borderRadius: 6, opacity: 0.9 }} />
              </div>
            </div>
          </div>

          {/* Right , Summary cards (desktop only , on mobile these are in a separate section below) */}
          {!isMobile && <div style={{ flex: "0 1 580px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, minWidth: 0 }}>
            {([
              { icon: "funding" as const, num: "$35.8B", label: "Invested in SportsTech 2021–25, with $8.7B deployed in 2025 alone" },
              { icon: "unicorn" as const, num: "46", label: "SportsTech unicorns with a combined $210.2B valuation" },
              { icon: "investors" as const, num: "58", label: "New investors & initiatives in the sports ecosystem in the last 12 months" },
              { icon: "globe" as const, num: "51%", label: "Europe's share of 2025 funding, overtaking North America for the first time ($4.5B vs $4.0B)" },
              { icon: "trending" as const, num: "$43.6M", label: "Average deal value in 2025, up from $28.1M in 2024 despite a similar number of rounds (200 vs 194)" },
              { icon: "ma" as const, num: "87%", label: "Of all 2025 acquisitions made by SportsTech companies, up from 47% in 2020" },
            ]).map((card, i) => (
              <div key={i} style={{
                padding: "26px 24px 22px", borderRadius: 12,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
              }}>
                <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.55 }}>{STAT_ICONS[card.icon](isDark ? t.textMuted : BRAND.darkTitle)}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,3.5vw,50px)", color: BRAND.pink, lineHeight: 1 }}>{card.num}</div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: isDark ? t.titleColor : BRAND.darkTitle, lineHeight: 1.4 }}>{card.label}</div>
              </div>
            ))}
          </div>}
        </div>

      </section>
      {/* ── Mobile Summary Cards (separate section , horizontal rows) ── */}
      {isMobile && (
        <section style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#0c0f1a" : BRAND.darkTitle, padding: "40px 16px", position: "relative", overflow: "hidden" }}>
          {/* Subtle background pattern */}
          <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.04 : 0.06, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", height: "calc(100svh - 140px)", display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              { icon: "funding" as const, num: "$35.8B", label: "Invested in SportsTech 2021–25, with $8.7B deployed in 2025 alone" },
              { icon: "unicorn" as const, num: "46", label: "SportsTech unicorns with a combined $210.2B valuation" },
              { icon: "investors" as const, num: "58", label: "New investors & initiatives in the sports ecosystem in the last 12 months" },
              { icon: "globe" as const, num: "51%", label: "Europe's share of 2025 funding, overtaking North America for the first time ($4.5B vs $4.0B)" },
              { icon: "trending" as const, num: "$43.6M", label: "Average deal value in 2025, up from $28.1M in 2024 despite a similar number of rounds (200 vs 194)" },
              { icon: "ma" as const, num: "87%", label: "Of all 2025 acquisitions made by SportsTech companies, up from 47% in 2020" },
            ]).map((card, i) => (
              <div key={i} style={{
                padding: "20px 18px", borderRadius: 10,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", gap: 14,
                flex: 1, minHeight: 0,
              }}>
                <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.55 }}>{STAT_ICONS[card.icon](isDark ? t.textMuted : BRAND.darkTitle)}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: BRAND.pink, lineHeight: 1, flexShrink: 0, minWidth: 55 }}>{card.num}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: isDark ? t.titleColor : BRAND.darkTitle, lineHeight: 1.4 }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* ── SKEW WRAPPER: velocity-based tilt applied to all content below hero ── */}
      <div ref={skewWrapRef} style={{ willChange: "transform", transformOrigin: "center top", position: "relative", zIndex: 1 }}>

      {/* ── CHART-01: EXECUTIVE SUMMARY STATS ──────────────────────────── */}
      {/* Executive Summary section , commented out
      <div id="facts" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Executive Summary")}
            {sectionTitle("THE NUMBERS\nTHAT MATTER")}
            <SourceBadge chartId="CHART-01" source="sm_test · dm_test · ma_test_new (COUNT / SUM aggregates)" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 16, marginTop: 40 }}>
            {isLoading ? Array(6).fill(0).map((_,i) => (
              <div key={i} style={{ background: t.bgCard, height: 156, opacity: 0.35, border: `1px solid ${t.border}`, borderRadius: 14 }} />
            )) : (
              <>
                <StatCard t={t} icon="funding" num="$35.8B" label="Invested in SportsTech 2021–25, with $8.7B deployed in 2025 alone" />
                <StatCard t={t} icon="unicorn" num="46" label="SportsTech unicorns with a combined $210.2B valuation" />
                <StatCard t={t} icon="investors" num="58" label="New investors & initiatives in the sports ecosystem in the last 12 months" />
                <StatCard t={t} icon="globe" num="51%" label="Europe's share of 2025 funding, overtaking North America for the first time ($4.5B vs $4.0B)" />
                <StatCard t={t} icon="trending" num="$43.6M" label="Average deal value in 2025, up from $28.1M in 2024 despite a similar number of rounds (200 vs 194)" />
                <StatCard t={t} icon="ma" num="87%" label="Of all 2025 acquisitions made by SportsTech companies, up from 47% in 2020" />
              </>
            )}
          </div>
        </div>
      </div>
      */}


      {/* ── CHART-07: KEY TRENDS (THREE FORCES) ─────────────────────────── */}
      <div id="trends" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Trends | Deep Dives")}
            {sectionTitle("THE FORCES RESHAPING\nSPORTSTECH")}
            <SourceBadge chartId="CHART-07" source="dm_test (Sector SUM) · sm_test (Sector COUNT) · ma_test_new (deal count 2024)" />
          </div>

          {/* ── Tab Switcher ── */}
          <div style={{ display: "flex", marginTop: 40, marginBottom: 40, borderBottom: `2px solid ${t.border}` }}>
            {(["Trends", "Deep Dives"] as const).map(tab => {
              const key = tab === "Trends" ? "trends" : "articles";
              const active = trendsTab === key;
              return (
                <button key={tab}
                  onClick={() => { setTrendsTab(key as "trends" | "articles"); setExpandedBlock(null); }}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 18px 10px" : "10px 36px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none" }}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* ── Tab description ── */}
          <p style={{ margin: "0 0 32px", fontSize: 15, lineHeight: 1.7, color: t.text }}>
            {trendsTab === "trends"
              ? "Three signals that point to structural shifts, not temporary blips."
              : "Three stories with implications that run deeper than the news cycle."}
          </p>

          {/* ── Trends accordion ── */}
          {(isPdf || trendsTab === "trends") && (() => {
            const dtcExamples: { entity: string; desc: string; date: string; country: string; domain: string }[] = [
              { entity: "ESPN", desc: "Launched full DTC streaming service (ESPN Unlimited) for the first time, unbundling all 12 linear networks from cable at $29.99/month with 47,000 live events/year", date: "Aug 2025", country: "USA", domain: "espn.com" },
              { entity: "Ligue 1 (LFP)", desc: "First major men's football league in Europe to launch its own DTC service (Ligue 1+), hitting 1M+ subscribers within one month", date: "Aug 2025", country: "France", domain: "ligue1.com" },
              { entity: "Tampa Bay Lightning", desc: "Launched team-powered DTC streaming service (TBLightning.tv) at $66/season ahead of the 2025-26 NHL season, produced by Scripps Sports and powered by ViewLift", date: "Sep 2025", country: "USA", domain: "nhl.com" },
              { entity: "Top 14 / LNR", desc: "French rugby's Top 14 launched Top 14 Rugby TV , its first-ever global DTC service , in 170+ territories via Two Circles' StayLive platform, covering markets without broadcast deals including Australia, New Zealand, and South Africa", date: "Nov 2025", country: "France", domain: "lnr.fr" },
              { entity: "Houston Astros & Rockets", desc: "Launched Space City Home Network (SCHN+) , the last MLB and NBA teams to go DTC , at $19.99/month, recording over 500K streams within two months of launch", date: "Dec 2025", country: "USA", domain: "mlb.com" },
              { entity: "Texas Rangers", desc: "Formed Rangers Sports Media & Entertainment Company and launched Rangers Sports Network, one of the earliest team-owned local media moves in the MLB RSN collapse", date: "2025", country: "USA", domain: "mlb.com" },
              { entity: "Seattle Mariners", desc: "Root Sports Northwest closed after the 2025 season; Mariners moved to MLB Local Media's centralised DTC infrastructure rather than building their own platform", date: "Jan 2026", country: "USA", domain: "mlb.com" },
              { entity: "Washington Nationals", desc: "Signed with MLB Local Media for DTC distribution after resolving a long-running rights dispute with the Baltimore Orioles over MASN", date: "Jan 2026", country: "USA", domain: "mlb.com" },
              { entity: "Atlanta Braves", desc: "Launched BravesVision / Braves.TV , fully team-owned network with no-blackout DTC streaming , after departing Main Street Sports Group, covering a 6-state Southeast territory", date: "Feb 2026", country: "USA", domain: "mlb.com" },
              { entity: "6 MLB Teams (Brewers, Cardinals, Marlins, Rays, Reds, Royals)", desc: "All six exited Main Street Sports Group / FanDuel Sports Network and moved to MLB Local Media's platform for DTC distribution in the 2026 season", date: "Feb 2026", country: "USA", domain: "mlb.com" },
              { entity: "Premier League", desc: "Confirmed Premier League+ DTC platform launching in Singapore for 2026/27 , its first-ever DTC service , built on in-house production after ending its long-running IMG international production deal", date: "Feb 2026", country: "England", domain: "premierleague.com" },
              { entity: "Detroit Tigers & Red Wings", desc: "Jointly launched Detroit SportsNet , covering MLB and NHL , with in-market DTC streaming at $19.99/month, produced with MLB Local Media support", date: "Feb 2026", country: "USA", domain: "nhl.com" },
            ];
            const infraProviders: { name: string; location: string; desc: string; domain: string }[] = [
              { name: "ViewLift", location: "New York", desc: "Most active in the US , powered Seattle Mariners and Tampa Bay Lightning platforms. 16 pro sports team clients. Launched a joint venture with Monumental Sports to offer a managed 'go DTC' playbook.", domain: "viewlift.com" },
              { name: "Deltatre / Endeavor Streaming", location: "Italy / US", desc: "Dominant global player. Powered Ligue 1+. Combined client list covers NFL, UEFA, UFC, NBA, MLB, and World Rugby. Largest pure-play sports OTT provider after the September 2025 acquisition.", domain: "deltatre.com" },
              { name: "Two Circles / StayLive", location: "London", desc: "Data-first approach , leads with fan audience intelligence, then builds the platform. Powered Top 14 Rugby TV across 170+ territories. Works with 350+ sports properties globally.", domain: "twocircles.com" },
            ];
            const trendBlocks = [
              {
                id: "ma-sportstech", n: "01", tag: "M&A ACQUIRERS", title: "SPORTSTECH IS BUYING ITSELF",
                summary: "SportsTech companies are now their own most active acquirers , sportstech-on-sportstech deals tripled from 21 in 2016 to 68 in 2025.",
                body: "",
                stat: data ? String(data.maByYearSportstech?.[data.maByYearSportstech.length - 1]?.sportstech || "—") : "…",
                statLabel: "sportstech-on-sportstech deals in 2025",
                color: BRAND.teal,
                expandedContent: true,
              },
              {
                id: "running-renaissance", n: "02", tag: "PARTICIPATION & CULTURE", title: "COMPETITIVE RUNNING IS HAVING ITS MOMENT",
                summary: "Record finishers, record revenues, and a new breed of runner turning race weekends into destination experiences , competitive running has become one of the fastest-growing segments in global sports.",
                body: "",
                stat: "3.1%",
                statLabel: "race churn rate in 2025 , record low, signaling a maturing market",
                color: BRAND.pink,
                expandedContent: true,
              },
              {
                id: "dtc-shift", n: "03", tag: "DTC & STREAMING", title: "SPORT IS GOING DIRECT",
                summary: "A structural collapse in the US and a strategic awakening internationally have combined to make 2025/26 the year the DTC shift stopped being theoretical.",
                body: "",
                stat: "",
                statLabel: "",
                color: BRAND.tealBright,
                expandedContent: true,
              },
            ];
            const trendIcons: Record<string, React.ReactNode> = {
              "dtc-shift": <Monitor size={32} />,
              "ma-sportstech": <DollarSign size={32} />,
              "running-renaissance": <Footprints size={32} />,
            };
            return (
              <>
              <div ref={trendCardsRef} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
                {trendBlocks.map(block => {
                  const isOpen = isPdf || expandedBlock === block.id;
                  return (
                    <button
                      key={block.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setExpandedBlock(isOpen ? null : block.id)}
                      style={{ background: isOpen ? t.bgSec : `${BRAND.darkTitle}08`, border: `1px solid ${isOpen ? BRAND.darkTitle + "44" : BRAND.darkTitle + "18"}`, borderRadius: 10, cursor: "pointer", padding: isMobile ? "24px 20px" : "28px 24px", textAlign: "left", outline: "none", display: "flex", flexDirection: "column", gap: 14, transition: "all 0.3s", height: isMobile ? undefined : 220, overflow: "hidden", fontFamily: "inherit" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${BRAND.darkTitle}10`, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.darkTitle, flexShrink: 0 }}>
                          {trendIcons[block.id]}
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 24, lineHeight: 1.1, color: t.titleColor, flex: 1 }}>{block.title}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: t.textMuted, flexShrink: 0 }}>{block.n}</div>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, flex: 1 }}>{block.summary}</div>
                      <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: 1, color: isOpen ? BRAND.darkTitle : t.textMuted, marginTop: 4 }}>{isOpen ? "CLOSE ✕" : "READ MORE →"}</div>
                    </button>
                  );
                })}
              </div>
              {trendBlocks.map(block => {
                const isOpen = isPdf || expandedBlock === block.id;
                return (
                  <div key={block.id} id={`trend-expanded-${block.id}`} style={{ borderRadius: 10, overflow: "hidden", marginTop: isOpen ? 28 : 0, background: isOpen ? t.bgSec : "transparent", border: isOpen ? `1px solid ${BRAND.darkTitle}18` : "1px solid transparent" }}>
                    <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                        <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", textAlign: "justify" }}>
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 26 : 34, lineHeight: 1.1, color: t.titleColor }}>{block.title}</div>
                            <p style={{ fontSize: 14, lineHeight: 1.7, color: t.textMuted, marginTop: 8 }}>{block.summary}</p>
                          </div>
                          {block.id === "ma-sportstech" && data?.maByYearSportstech ? (() => {
                            const acquirerDomains: Record<string, string> = {
                              "Teamworks": "teamworks.com",
                              "NODWIN Gaming": "nodwingaming.com",
                              "Blue Star Sports": "bluestarsports.com",
                              "Hudl": "hudl.com",
                              "Sportradar AG": "sportradar.com",
                              "Fanatics": "fanatics.com",
                              "Playtomic": "playtomic.io",
                              "Catapult": "catapultsports.com",
                              "Better Collective": "bettercollective.com",
                              "DraftKings": "draftkings.com",
                              "Bruin Sports Capital": "bruinsportscapital.com",
                              "FanDuel": "fanduel.com",
                              "Napster Corp. (formerly Infinite Reality)": "napster.com",
                              "Fastbreak AI": "fastbreak.ai",
                            };
                            const chartData = data.maByYearSportstech;
                            const latest = chartData[chartData.length - 1];
                            const latestTotal = latest ? latest.sportstech + latest.non_sportstech : 0;
                            const latestStPct = latestTotal > 0 ? Math.round((latest.sportstech / latestTotal) * 100) : 0;
                            const totalStDeals = chartData.reduce((s, d) => s + d.sportstech, 0);
                            const totalAllDeals = chartData.reduce((s, d) => s + d.sportstech + d.non_sportstech, 0);
                            const stPctAll = totalAllDeals > 0 ? Math.round((totalStDeals / totalAllDeals) * 100) : 0;
                            const growthX = chartData.length >= 2 && chartData[0].sportstech > 0 ? (chartData[chartData.length - 1].sportstech / chartData[0].sportstech).toFixed(1) : "—";
                            return (
                              <>
                                {/* Summary stats */}
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                                  {[
                                    { value: `${latestStPct}%`, label: "of 2025 M&A deals by sportstech acquirers" },
                                    { value: `${stPctAll}%`, label: "of all M&A deals (2016–2025) had a sportstech acquirer" },
                                    { value: `${growthX}x`, label: "more sportstech-on-sportstech deals in 2025 than in 2016 (21 → 68)" },
                                  ].map((s, si) => (
                                    <div key={si} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: BRAND.pink, lineHeight: 1 }}>{s.value}</div>
                                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Insight text */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "0 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>INSIGHT</div>
                                <div>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    Over the past decade, sportstech-on-sportstech acquisitions have tripled, rising from 21 deals in 2016 to 68 in 2025. The industry is consolidating from within.
                                  </p>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    Companies like Teamworks, Hudl, and Sportradar are assembling platform stacks through acquisition, buying adjacent capabilities rather than building them.
                                  </p>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    The goal is the same: become the single vendor a club or league can't live without.
                                  </p>
                                </div>

                                {/* Stacked bar chart */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.teal}55,transparent)`, margin: "36px 0 28px" }} />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: BRAND.teal, textTransform: "uppercase" }}>M&A BY ACQUIRER TYPE</div>
                                  {/* Count / Value toggle */}
                                  <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${t.border}` }}>
                                    {(["count", "value"] as const).map(m => (
                                      <button key={m} onClick={() => setMaChartMode(m)} style={{
                                        padding: "5px 14px", fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", border: "none", outline: "none",
                                        background: maChartMode === m ? BRAND.teal : "transparent",
                                        color: maChartMode === m ? "#fff" : t.textMuted,
                                        fontWeight: maChartMode === m ? 700 : 400,
                                        transition: "all 0.2s",
                                      }}>{m === "count" ? "# Deals" : "$ Value"}</button>
                                    ))}
                                  </div>
                                </div>
                                {/* Legend */}
                                <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.teal }} />
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>SportsTech Acquirer</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: BRAND.slate }} />
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>Non-SportsTech Acquirer</span>
                                  </div>
                                </div>
                                <MaStackedBarChart chartData={chartData} mode={maChartMode} t={t} isPdf={isPdf} />

                                {/* Top Acquirers + Acquiree Profile side-by-side */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.teal}55,transparent)`, margin: "40px 0 28px" }} />
                                <div style={{ display: "flex", gap: isMobile ? 16 : 32, flexWrap: "wrap" }}>
                                  {/* Left: Top Acquirers */}
                                  <div style={{ flex: "1 1 340px", minWidth: 0 }}>
                                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: BRAND.teal, textTransform: "uppercase", marginBottom: 16 }}>TOP ACQUIRERS</div>
                                    <div style={{ overflowX: "auto" }}>
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 13 }}>
                                        <thead>
                                          <tr>
                                            {["#", "Acquirer", "Deals"].map(h => (
                                              <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.teal, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {data.topAcquirers.map((row, i) => {
                                            const domain = acquirerDomains[row.name];
                                            const aUrl = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
                                            const isNonSt = row.is_sportstech !== "Y";
                                            return (
                                              <tr key={i} style={{ background: isNonSt ? `${BRAND.slate}11` : (i % 2 === 1 ? t.tableRowAlt : "transparent") }}>
                                                <td style={{ padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, borderBottom: `1px solid ${t.border}`, width: 36 }}>{i + 1}</td>
                                                <td style={{ padding: "10px 12px", fontWeight: 600, color: isNonSt ? t.textMuted : t.text, borderBottom: `1px solid ${t.border}`, whiteSpace: isMobile ? "normal" : "nowrap" }}>
                                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{ width: 22, height: 22, borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                                      {aUrl && <img src={aUrl} alt="" width={22} height={22} style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, zIndex: 1, background: "#fff", borderRadius: 4 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                                                      <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: isNonSt ? BRAND.slate : BRAND.teal, borderRadius: 4, color: "#fff", fontWeight: 700, fontSize: 10, fontFamily: "'Bebas Neue',sans-serif" }}>{row.name.charAt(0)}</div>
                                                    </div>
                                                    {row.name}
                                                    {isNonSt && <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: BRAND.slate, letterSpacing: 1, opacity: 0.7, marginLeft: 4 }}>NOT ST</span>}
                                                  </div>
                                                </td>
                                                <td style={{ padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: t.titleColor, borderBottom: `1px solid ${t.border}` }}>{row.deals}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Right: Acquiree Profile */}
                                  {data.acquireeProfile && (
                                    <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: BRAND.teal, textTransform: "uppercase", marginBottom: 16 }}>ACQUIREE PROFILE</div>

                                      {/* By Sector */}
                                      {(() => {
                                        const sectorColors: Record<string, string> = { "Activity & Performance": BRAND.athletes, "Fans & Content": BRAND.fans, "Management & Organisation": BRAND.execs };
                                        const sectorLabels: Record<string, string> = { "Activity & Performance": "For Athletes", "Fans & Content": "For Fans", "Management & Organisation": "For Executives", "Non STX Sector Framework": "Not SportsTech" };
                                        const totalDeals = data.acquireeProfile.bySector.reduce((s, d) => s + d.deals, 0);
                                        return (
                                          <div style={{ marginBottom: 28 }}>
                                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>BY SECTOR</div>
                                            {/* Stacked bar */}
                                            <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                                              {data.acquireeProfile.bySector.map((d) => (
                                                <div key={d.sector} style={{ width: `${(d.deals / totalDeals) * 100}%`, background: sectorColors[d.sector] || BRAND.slate, transition: "width 0.4s" }} title={`${d.sector}: ${d.deals} deals (${Math.round((d.deals / totalDeals) * 100)}%)`} />
                                              ))}
                                            </div>
                                            {data.acquireeProfile.bySector.map((d) => (
                                              <div key={d.sector} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.border}` }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                  <div style={{ width: 8, height: 8, borderRadius: 2, background: sectorColors[d.sector] || BRAND.slate, flexShrink: 0 }} />
                                                  <span style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: t.text }}>{sectorLabels[d.sector] || d.sector}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: t.titleColor }}>{d.deals}</span>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>{Math.round((d.deals / totalDeals) * 100)}%</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}

                                      {/* By Region */}
                                      {(() => {
                                        const regionColors: Record<string, string> = { "North America": "#E08B35", "Europe": "#2B3D8F", "Asia Pacific": "#76ADA7", "Rest of the World": "#4D5E72" };
                                        const grouped = data.acquireeProfile.byContinent.reduce<Record<string, number>>((acc, d) => {
                                          if (d.continent === "USA") return acc;
                                          const key = (d.continent === "Asia" || d.continent === "Oceania") ? "Asia Pacific"
                                            : (d.continent === "Africa" || d.continent === "South America") ? "Rest of the World"
                                            : d.continent;
                                          acc[key] = (acc[key] || 0) + d.deals;
                                          return acc;
                                        }, {});
                                        const regions = Object.entries(grouped).map(([name, deals]) => ({ name, deals })).sort((a, b) => b.deals - a.deals);
                                        const totalDeals = regions.reduce((s, d) => s + d.deals, 0);
                                        return (
                                          <div style={{ marginBottom: 28 }}>
                                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>BY REGION</div>
                                            <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                                              {regions.map((d) => (
                                                <div key={d.name} style={{ width: `${(d.deals / totalDeals) * 100}%`, background: regionColors[d.name] || BRAND.slate, transition: "width 0.4s" }} title={`${d.name}: ${d.deals} deals (${Math.round((d.deals / totalDeals) * 100)}%)`} />
                                              ))}
                                            </div>
                                            {regions.map((d) => (
                                              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.border}` }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                  <div style={{ width: 8, height: 8, borderRadius: 2, background: regionColors[d.name] || BRAND.slate, flexShrink: 0 }} />
                                                  <span style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: t.text }}>{d.name}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: t.titleColor }}>{d.deals}</span>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>{Math.round((d.deals / totalDeals) * 100)}%</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}

                                      {/* By Business Model */}
                                      {(() => {
                                        const modelColors: Record<string, string> = { "B2B": BRAND.b2b, "B2C": BRAND.b2c, "B2B2C": BRAND.teal };
                                        const totalDeals = data.acquireeProfile.byModel.reduce((s, d) => s + d.deals, 0);
                                        return (
                                          <div>
                                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>BY BUSINESS MODEL</div>
                                            <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                                              {data.acquireeProfile.byModel.map((d) => (
                                                <div key={d.model} style={{ width: `${(d.deals / totalDeals) * 100}%`, background: modelColors[d.model] || BRAND.slate, transition: "width 0.4s" }} title={`${d.model}: ${d.deals} deals (${Math.round((d.deals / totalDeals) * 100)}%)`} />
                                              ))}
                                            </div>
                                            {data.acquireeProfile.byModel.map((d) => (
                                              <div key={d.model} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.border}` }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                  <div style={{ width: 8, height: 8, borderRadius: 2, background: modelColors[d.model] || BRAND.slate, flexShrink: 0 }} />
                                                  <span style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: t.text }}>{d.model}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: t.titleColor }}>{d.deals}</span>
                                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>{Math.round((d.deals / totalDeals) * 100)}%</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {/* WHY IT'S HAPPENING */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>WHY IT'S HAPPENING</div>
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
                                  {[
                                    { n: "01", title: "Scale Now a Prerequisite", desc: "Clubs, leagues, and federations are consolidating , multi-club ownership, global expansions, centralised contracts. They need mature, scalable solutions to manage their growing complexity. For providers, acquisition has been faster than building , though AI may be the first credible alternative." },
                                    { n: "02", title: "The Platform Playbook: Land & Expand", desc: "Even the best 'point solutions' are losing ground to integrated stacks. Companies are acquiring adjacent capabilities , not to diversify, but to become the single vendor a club or league can't extract itself from." },
                                    { n: "03", title: "Window of Opportunity", desc: "The 2022 funding contraction left well-built but undercapitalised SportsTech companies exposed , strong products, weak balance sheets. For cash-generating operators, this created an acquisition window at prices unavailable during peak funding years." },
                                  ].map(d => (
                                    <div key={d.n} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>{d.n}</span>
                                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>{d.title}</span>
                                      </div>
                                      <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>{d.desc}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* WHY IT MATTERS */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>WHY IT MATTERS</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                  {[
                                    { n: "01", title: "For Solution Providers", desc: "The market is bifurcating into platforms and point solutions and the gap is widening. For smaller companies the options are clear: scale your niche fast, or get acquired. Or risk irrelevance as platforms build around you." },
                                    { n: "02", title: "For Sports Organisations", desc: "Integration reduces complexity but also reduces leverage. Any organisation embedding a single vendor across its entire operation should be negotiating contractual protections now, while the market is still competitive." },
                                    { n: "03", title: "For Investors", desc: "Value is concentrating among companies that control scale and distribution. The major acquirers have the capital, the customer relationships, and the strategic clarity to consolidate before the window closes." },
                                  ].map(d => (
                                    <div key={d.n} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>{d.n}</span>
                                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>{d.title}</span>
                                      </div>
                                      <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>{d.desc}</p>
                                    </div>
                                  ))}
                                </div>

                              </>
                            );
                          })() : block.id === "running-renaissance" ? (() => {
                            const marathons: { name: string; y2023: string; y2024: string; y2025: string; g2324: string; g2425: string; domain: string; note?: string }[] = [
                              { name: "TCS New York City", y2023: "51,402", y2024: "55,646", y2025: "59,226", g2324: "+8.2%", g2425: "+6.4%", domain: "nyrr.org" },
                              { name: "TCS London", y2023: "48,000*", y2024: "53,851", y2025: "56,000", g2324: "+12.2%", g2425: "+4.0%", domain: "tcslondonmarathon.com" },
                              { name: "Chicago", y2023: "48,398", y2024: "52,150", y2025: "54,351", g2324: "+7.8%", g2425: "+4.2%", domain: "chicagomarathon.com" },
                              { name: "Berlin", y2023: "43,010", y2024: "54,280", y2025: "49,831", g2324: "+26.2%", g2425: "\u22128.2%", domain: "berlin-marathon.com", note: "2024 was 50th anniversary edition" },
                              { name: "Sydney", y2023: "13,294", y2024: "20,284", y2025: "32,963", g2324: "+52.6%", g2425: "+62.5%", domain: "tcssydneymarathon.com" },
                            ];
                            const drivers: { n: string; title: string; desc: string }[] = [
                              { n: "01", title: "Events as the Anchor", desc: "75% of Gen Z athletes report that a signed-up race is the primary driver keeping them training. A race entry creates a fixed goal, social accountability, and a financial commitment. It anchors training in a way gym memberships don't." },
                              { n: "02", title: "Running as Social Currency", desc: "Running has become a visible identity. Training runs, gear, and race completion are shared across platforms for status , from Strava to TikTok and even LinkedIn. Especially as major races are oversubscribed, lottery-based, and increasingly exclusive. Entry itself has become a signal: something to earn, not just buy." },
                              { n: "03", title: "The New Third Space", desc: "As traditional social venues decline, run clubs have emerged as vital community infrastructure. For Gen Z and Millennials, they replace dating apps and networking events , one in five Gen Z users has gone on a date with someone they met through exercise." },
                              { n: "04", title: "Move for Mental Health", desc: "Runners cite stress and anxiety management as a major motivator. The structured, goal-oriented nature of race training creates routine and focus. Completing a race, a goal set months in advance, delivers a measurable sense of progress and accomplishment that few other activities can replicate." },
                            ];
                            const impacts: { label: string; value: string; detail: string }[] = [
                              { label: "Top 50 Marathons", value: "$5.2B", detail: "annual economic contribution , Chicago alone: $627M, Berlin: $505M" },
                              { label: "Global Marathon Events Market", value: "$13.8B", detail: "in 2024, projected $23.6B by 2033 (6.2% CAGR)" },
                              { label: "Global Running Apparel Market", value: "$161.8B", detail: "projected by 2031 , one of the most commercially valuable participation sports" },
                            ];
                            return (
                              <>
                                {/* Summary stats */}
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                                  {[
                                    { value: "59,226", label: "finishers at 2025 NYC Marathon , largest US race ever" },
                                    { value: "3.1%", label: "race churn rate in 2025 , record low" },
                                    { value: "$13.8B", label: "global marathon events market (2024)" },
                                  ].map((s, si) => (
                                    <div key={si} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: BRAND.pink, lineHeight: 1 }}>{s.value}</div>
                                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* INSIGHT */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "0 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>INSIGHT</div>
                                <div>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    Competitive running is shifting from a niche endurance sport into a global, event-driven participation economy.
                                  </p>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    Record-breaking marathon participation is no longer an outlier, it's the new baseline. The 2025 TCS New York City Marathon reached 59,226 finishers, while London matched that scale with 56,000. This growth is not episodic , it is structural.
                                  </p>
                                  <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                    The clearest signal: only 129 of the 4,209 races with over 500 participants failed to return in 2025 , a churn rate of 3.1%, down from 3.9% in 2024 and 5.0% in 2023, and a record low. The market isn't just expanding , it is stabilizing, professionalizing, and consolidating.
                                  </p>
                                </div>

                                {/* Major marathons table */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "36px 0 28px" }} />
                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: BRAND.pink, textTransform: "uppercase", marginBottom: 16 }}>2025 MAJOR MARATHONS</div>
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 13, minWidth: isMobile ? undefined : 700 }}>
                                    <thead>
                                      <tr>
                                        <th style={{ textAlign: "left", padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>Marathon</th>
                                        <th style={{ textAlign: "right", padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>2023</th>
                                        <th style={{ textAlign: "center", padding: "10px 6px", fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}`, opacity: 0.6 }}>YOY</th>
                                        <th style={{ textAlign: "right", padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>2024</th>
                                        <th style={{ textAlign: "center", padding: "10px 6px", fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}`, opacity: 0.6 }}>YOY</th>
                                        <th style={{ textAlign: "right", padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>2025</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {marathons.map((m, i) => {
                                        const mUrl = m.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${m.domain}` : null;
                                        const isNeg2425 = m.g2425.startsWith("\u2212") || m.g2425.startsWith("-");
                                        const isNeg2324 = m.g2324.startsWith("\u2212") || m.g2324.startsWith("-");
                                        return (
                                          <tr key={i} style={{ background: i % 2 === 1 ? t.tableRowAlt : "transparent" }}>
                                            <td style={{ padding: isMobile ? "8px 8px" : "10px 12px", fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}`, whiteSpace: isMobile ? "normal" : "nowrap" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 22, height: 22, borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                                  {mUrl && <img src={mUrl} alt="" width={22} height={22} style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, zIndex: 1, background: "#fff", borderRadius: 4 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                                                  <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.pink, borderRadius: 4, color: "#fff", fontWeight: 700, fontSize: 10, fontFamily: "'Bebas Neue',sans-serif" }}>{m.name.charAt(0)}</div>
                                                </div>
                                                {m.name}
                                              </div>
                                            </td>
                                            <td style={{ padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: t.textMuted, borderBottom: `1px solid ${t.border}`, textAlign: "right" }}>{m.y2023}</td>
                                            <td style={{ padding: "10px 6px", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600, color: isNeg2324 ? "#e05252" : "#4caf50", borderBottom: `1px solid ${t.border}`, textAlign: "center", background: isNeg2324 ? "#e0525208" : "#4caf5008", letterSpacing: 0.5 }}>{m.g2324}</td>
                                            <td style={{ padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: t.textMuted, borderBottom: `1px solid ${t.border}`, textAlign: "right" }}>{m.y2024}</td>
                                            <td style={{ padding: "10px 6px", fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600, color: isNeg2425 ? "#e05252" : "#4caf50", borderBottom: `1px solid ${t.border}`, textAlign: "center", background: isNeg2425 ? "#e0525208" : "#4caf5008", letterSpacing: 0.5 }}>{m.g2425}</td>
                                            <td style={{ padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: t.titleColor, borderBottom: `1px solid ${t.border}`, textAlign: "right" }}>{m.y2025}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {/* Footnotes */}
                                <div style={{ marginTop: 12, fontSize: 11, color: t.textMuted, lineHeight: 1.6, fontStyle: "italic", maxWidth: 700 }}>
                                  <p style={{ margin: "4px 0" }}>*Approximate figure , official communications cited "around 48,000 finishers."</p>
                                  <p style={{ margin: "4px 0" }}>Note on Berlin: the 2024 figure was the race's 50th anniversary edition, which inflated participation significantly. The 2025 figure of 49,831 remains the second-highest in Berlin's history.</p>
                                </div>

                                {/* Drivers section */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>WHY IT'S HAPPENING</div>
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
                                  {drivers.map(d => (
                                    <div key={d.n} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>{d.n}</span>
                                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>{d.title}</span>
                                      </div>
                                      <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>{d.desc}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* WHY IT MATTERS */}
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 8 }}>WHY IT MATTERS</div>
                                <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 24 }}>Competitive running is evolving into a high-value, experience-led event economy , with expanding layers of monetization.</p>

                                {/* Impact stat boxes */}
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                                  {[
                                    { value: "$13.8B", label: "Global Marathon Events Market in 2024, projected $23.6B by 2033 (6.2% CAGR)" },
                                    { value: "59%", label: "of participants stay three to five nights at the destination" },
                                    { value: "$161.8B", label: "Global Running Apparel Market projected by 2031" },
                                  ].map((s, si) => (
                                    <div key={si} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: BRAND.pink, lineHeight: 1 }}>{s.value}</div>
                                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Impact boxes , full width stacked */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                  {[
                                    { n: "01", title: "The Race-cation Economy", desc: "Events are now tourism engines, with location the top factor runners cite in race selection. Runners plan trips around races, extending stays and increasing per-capita spend. The Boston Marathon generated $509M in economic activity in 2024 alone, with 30% of participants travelling internationally." },
                                    { n: "02", title: "The Global Circuit Playbook", desc: "The Ultra-Trail du Mont-Blanc (UTMB) and Ironman playbook is now the template , popular independent races consolidated into global circuits, with broadcast potential and non-endemic sponsor appeal, including luxury brands." },
                                    { n: "03", title: "The Performance Economy", desc: "Performance footwear delivers measurable gains, smart wearables capture real-time data, and AI coaching platforms like Runna are replacing expensive personal trainers. As participation scales, so does the addressable market. Competitive running is becoming as much a technology category as a sports one." },
                                  ].map(d => (
                                    <div key={d.n} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>{d.n}</span>
                                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>{d.title}</span>
                                      </div>
                                      <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>{d.desc}</p>
                                    </div>
                                  ))}
                                </div>

                              </>
                            );
                          })() : block.id === "dtc-shift" ? (
                            <>
                              {/* Summary stats */}
                              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
                                {[
                                  { value: "22/30", label: "MLB clubs with in-market DTC streaming by March 2026" },
                                  { value: "1M+", label: "Ligue 1+ subscribers within one month of launch" },
                                  { value: "29", label: "franchises affected by the RSN collapse (Diamond → Main Street → liquidation)" },
                                ].map((s, si) => (
                                  <div key={si} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: BRAND.pink, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
                                  </div>
                                ))}
                              </div>

                              {/* INSIGHT */}
                              <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "0 0 28px" }} />
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>INSIGHT</div>
                              <div>
                                <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginBottom: 16 }}>
                                  The question of whether leagues and teams would go direct-to-consumer was treated as a thought experiment for years. Infrastructure wasn't ready, rights structures were too complex, broadcasters were paying too well.
                                </p>
                                <p style={{ fontSize: 15, lineHeight: 1.8, color: t.titleColor, fontWeight: 600, marginBottom: 16 }}>
                                  Not anymore.
                                </p>
                              </div>

                              {/* KEY DTC LAUNCHES , collapsible table */}
                              <div style={{ marginBottom: 36 }}>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setOpenRevTab(openRevTab === "dtc-launches" ? null : "dtc-launches"); }}
                                  style={{ width: "100%", background: openRevTab === "dtc-launches" ? `${BRAND.pink}06` : t.bgCard, border: `1px solid ${openRevTab === "dtc-launches" ? BRAND.pink + "44" : t.border}`, borderRadius: 10, cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, outline: "none", transition: "all 0.3s", zIndex: 2, fontFamily: "inherit" }}
                                >
                                  <div style={{ textAlign: "left" }}>
                                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: t.titleColor, lineHeight: 1.2 }}>KEY DTC LAUNCHES 2025–2026</div>
                                    <div style={{ fontSize: 11, color: t.textMuted, fontStyle: "italic", marginTop: 4 }}>12 launches across MLB, NHL, Premier League, Ligue 1 and more , the RSN collapse accelerated everything</div>
                                  </div>
                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: openRevTab === "dtc-launches" ? BRAND.pink : t.textMuted, flexShrink: 0, transition: "transform 0.3s", transform: openRevTab === "dtc-launches" ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                </button>
                                <div style={{ maxHeight: openRevTab === "dtc-launches" ? 3000 : 0, opacity: openRevTab === "dtc-launches" ? 1 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease" }}>
                                  <div style={{ padding: "12px 0 0", overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 10 : 12 }}>
                                      <thead>
                                        <tr>
                                          {["Date", "Entity", "Country", "Description"].map(h => (
                                            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dtcExamples.map((row, ri) => (
                                          <tr key={ri} style={{ background: ri % 2 === 1 ? `${t.border}33` : "transparent" }}>
                                            <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: BRAND.pink, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.date}</td>
                                            <td style={{ padding: "6px 10px", fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.entity}</td>
                                            <td style={{ padding: "6px 10px", color: t.textMuted, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.country}</td>
                                            <td style={{ padding: "6px 10px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{row.desc}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              {/* WHY IT'S HAPPENING */}
                              <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>WHY IT'S HAPPENING</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                                {/* 01 , The US Catalyst */}
                                <div style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>01</span>
                                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>The US Catalyst</span>
                                  </div>
                                  <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 12px" }}>
                                    Diamond Sports Group filed for bankruptcy in 2023, rebranded as Main Street Sports Group, and is now heading for full liquidation in April 2026, taking the local broadcast rights of 29 MLB, NBA, and NHL franchises with it.
                                  </p>
                                  <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 12px" }}>
                                    The Regional Sports Network (RSN) model isn't struggling. It's over. And leagues and teams aren't waiting for a replacement, they're building one.
                                  </p>
                                  <div style={{ paddingLeft: 16, borderLeft: `3px solid ${BRAND.tealBright}`, marginTop: 12 }}>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 6px" }}>
                                      <strong style={{ color: t.titleColor }}>MLB:</strong> Braves and Tigers are launching new DTC networks, while the Astros already operate one; MLB had in-market streaming available for 22 of 30 clubs by March 2026.
                                    </p>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>
                                      <strong style={{ color: t.titleColor }}>NBA:</strong> Fast-tracking a streaming hub for 2026/27; Amazon, YouTube TV, ESPN, and DAZN all in talks; up to 22 franchises, a deal worth billions.
                                    </p>
                                  </div>
                                </div>

                                {/* 02 , The Global Wave */}
                                <div style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>02</span>
                                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>The Global Wave</span>
                                  </div>
                                  <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 12px" }}>
                                    The US collapse is the loudest signal, but it isn't the only one. Across Europe, leagues facing a different problem , eroding broadcast revenues and a shrinking pool of viable rights buyers , are arriving at the same conclusion: own the platform, own the relationship.
                                  </p>
                                  <div style={{ paddingLeft: 16, borderLeft: `3px solid ${BRAND.tealBright}`, marginTop: 12 }}>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 6px" }}>
                                      <strong style={{ color: t.titleColor }}>Ligue 1:</strong> Announced Ligue 1+ in July 2025 after the domestic market failed to produce a viable rights buyer; passed one million subscribers within a month.
                                    </p>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: "0 0 6px" }}>
                                      <strong style={{ color: t.titleColor }}>Top 14 Rugby:</strong> Launched TOP 14 Rugby TV in November 2025, across 170+ territories; not a domestic fallback but a deliberate global growth play.
                                    </p>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>
                                      <strong style={{ color: t.titleColor }}>Premier League:</strong> Announced Premier League+ in February 2026, in Singapore for 2026/27; explicitly framed as a learning exercise before any broader rollout.
                                    </p>
                                  </div>
                                </div>

                                {/* 03 , The Infrastructure Moment */}
                                <div style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>03</span>
                                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>The Infrastructure Moment</span>
                                  </div>
                                  <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>
                                    The technology that made DTC prohibitively expensive five years ago is now commoditised. Cloud-based streaming infrastructure, white-label OTT platforms, and AI-driven personalisation have collapsed the cost of building a direct viewing product. Simultaneously, rights structures are being renegotiated with DTC carve-outs as standard. Leagues are no longer signing away digital rights wholesale. The window that broadcasters held for decades is closing, not because leagues are being bold, but because the barriers to going direct have largely disappeared.
                                  </p>
                                </div>
                              </div>

                              {/* Quote block */}
                              <div style={{ margin: isMobile ? "24px 0" : "32px 0 32px 0", padding: isMobile ? "20px 18px" : "28px 36px", borderLeft: `4px solid ${BRAND.pink}`, background: `${BRAND.pink}08`, borderRadius: "0 10px 10px 0" }}>
                                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 16 : 20, lineHeight: 1.5, color: t.titleColor, fontStyle: "italic", fontWeight: 700, marginBottom: 10 }}>
                                  "For the first time, the Premier League is going to have its own customers."
                                </p>
                                <p style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>
                                  , Premier League CEO Richard Masters
                                </p>
                              </div>

                              {/* WHY IT MATTERS */}
                              <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "40px 0 28px" }} />
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 20 }}>WHY IT MATTERS</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {[
                                  { n: "01", title: "Data Layer Shifts to the League", desc: "Viewing habits, purchase behaviour, device preferences , data that is extraordinarily valuable, and now owned by the league, not the broadcaster. For the first time, leagues know exactly who their fans are, what they watch, and what they'll pay for." },
                                  { n: "02", title: "Broadcasters' Role Shift", desc: "The big players aren't disappearing, they're repositioning. DAZN, Amazon, and YouTube TV are in talks to carry the NBA's streaming hub not as rights holders, but as distribution partners." },
                                  { n: "03", title: "The Fragmentation Problem", desc: "Every new DTC launch adds another paywall. The Premier League's own CEO flagged piracy as a live concern. Fragmentation is both the inevitable consequence of every league going direct at once, and the biggest threat to the reach they're trying to build." },
                                ].map(d => (
                                  <div key={d.n} style={{ padding: "20px 24px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 2, opacity: 0.6 }}>{d.n}</span>
                                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, lineHeight: 1 }}>{d.title}</span>
                                    </div>
                                    <p style={{ fontSize: 12, lineHeight: 1.7, color: t.textMuted, margin: 0 }}>{d.desc}</p>
                                  </div>
                                ))}
                              </div>
                              <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, fontStyle: "italic", marginTop: 24 }}>
                                The infrastructure is shifting, the rights structures are moving, and the broadcasters are adapting. The only question left is who pays , and how much fragmentation fans will accept before they stop paying altogether.
                              </p>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 14, lineHeight: 1.8, color: t.text, marginBottom: 24 }}>{block.body}</div>
                              {block.stat && (
                                <div style={{ paddingTop: 20, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
                                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: block.color }}>{block.stat}</div>
                                  <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>{block.statLabel}</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                    </AccordionBody>
                  </div>
                );
              })}
              </>
            );
          })()}

          {/* ── Explained accordion ── */}
          {(isPdf || trendsTab === "articles") && (() => {
            const articleIcons: Record<string, React.ReactNode> = {
              "pe-ownership": <Landmark size={32} />,
              "who-owns-upside": <DollarSign size={32} />,
              "nba-europe": <Globe size={32} />,
            };
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
                  {FEATURED_ARTICLES.map((article, ai) => {
                    const isOpen = isPdf || expandedBlock === article.id;
                    const articleNum = String(ai + 4).padStart(2, "0");
                    return (
                      <button
                        key={article.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setExpandedBlock(isOpen ? null : article.id)}
                        style={{ background: isOpen ? t.bgSec : `${BRAND.darkTitle}08`, border: `1px solid ${isOpen ? BRAND.darkTitle + "44" : BRAND.darkTitle + "18"}`, borderRadius: 10, cursor: "pointer", padding: isMobile ? "24px 20px" : "28px 24px", textAlign: "left", outline: "none", display: "flex", flexDirection: "column", gap: 14, transition: "all 0.3s", height: isMobile ? undefined : 220, overflow: "hidden", fontFamily: "inherit" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${BRAND.darkTitle}10`, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.darkTitle, flexShrink: 0 }}>
                            {articleIcons[article.id]}
                          </div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 24, lineHeight: 1.1, color: t.titleColor, flex: 1 }}>{article.title}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: t.textMuted, flexShrink: 0 }}>{articleNum}</div>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, flex: 1, overflow: "hidden" }}>{article.summary}</div>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: 1, color: isOpen ? BRAND.darkTitle : t.textMuted, marginTop: 4 }}>{isOpen ? "CLOSE ✕" : "READ MORE →"}</div>
                      </button>
                    );
                  })}
                </div>
                {FEATURED_ARTICLES.map(article => {
                  const isOpen = isPdf || expandedBlock === article.id;
                  return (
                    <div key={article.id} id={`trend-expanded-${article.id}`} style={{ borderRadius: 10, overflow: "hidden", marginTop: isOpen ? 28 : 0, background: isOpen ? t.bgSec : "transparent", border: isOpen ? `1px solid ${BRAND.darkTitle}18` : "1px solid transparent" }}>
                      <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                          <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", textAlign: "justify" }}>
                            <div style={{ marginBottom: 24 }}>
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 26 : 34, lineHeight: 1.1, color: t.titleColor }}>{article.title}</div>
                              <p style={{ fontSize: 14, lineHeight: 1.7, color: t.textMuted, marginTop: 8 }}>{article.summary}</p>
                            </div>

                            {/* Intro + Body , PE article: full-width stat cards, then two-column layout with timeline */}
                            {article.id === "pe-ownership" && !isMobile && article.timeline ? (
                              <>
                              {/* Stat cards , full width */}
                              {article.statCards && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
                                  {article.statCards.map((card, ci) => (
                                    <div key={ci} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "20px 24px" }}>
                                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: BRAND.pink, lineHeight: 1 }}>{card.value}</div>
                                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{card.label}. {card.sublabel}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Two-column: content left, timeline right */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 40 }}>
                                <div>
                                  {/* Sections with bold sub-headings + firms inside WHERE WE ARE TODAY */}
                                  {article.sections && article.sections.map((section, si) => (
                                    <div key={si} style={{ marginTop: si === 0 ? 0 : 36 }}>
                                      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 24 }} />
                                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: t.titleColor, marginBottom: 16 }}>{section.heading}</div>
                                      {section.paragraphs.map((p, pi) => {
                                        const dashIdx = p.indexOf(" , ");
                                        if (dashIdx > 0 && dashIdx < 60 && p.substring(0, dashIdx) === p.substring(0, dashIdx).toUpperCase()) {
                                          const boldPart = p.substring(0, dashIdx);
                                          const rest = p.substring(dashIdx + 3);
                                          return (
                                            <div key={pi} style={{ marginTop: 14 }}>
                                              <strong style={{ display: "block", fontSize: 14, color: t.titleColor, marginBottom: 6 }}>{boldPart}</strong>
                                              <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted }}>{rest}</p>
                                            </div>
                                          );
                                        }
                                        return <p key={pi} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 14 }}>{p}</p>;
                                      })}
                                      {/* Firm profiles sit inside WHERE WE ARE TODAY */}
                                      {section.heading === "WHERE WE ARE TODAY" && article.firms && (
                                        <div style={{ marginTop: 28 }}>
                                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: t.titleColor, marginBottom: 8 }}>WHO PIONEERED THE MODEL</div>
                                          <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 20 }}>Three firms defined what institutional sports ownership actually looks like, each representing a structurally distinct thesis.</p>
                                          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                            {article.firms.map(firm => {
                                              const fUrl = firm.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${firm.domain}` : null;
                                              return (
                                                <div key={firm.name} style={{ paddingLeft: 16, borderLeft: `3px solid ${BRAND.pink}` }}>
                                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                                      {fUrl && <img src={fUrl} alt="" width={28} height={28} style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, zIndex: 1, background: "#fff", borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                                                      <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.pink, borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: "'Bebas Neue',sans-serif" }}>{firm.name.charAt(0)}</div>
                                                    </div>
                                                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.titleColor }}>{firm.name}</div>
                                                  </div>
                                                  <p style={{ fontSize: 13, lineHeight: 1.8, color: t.textMuted }}>{firm.desc}</p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* Vertical timeline sidebar , stretches full height of article */}
                                <div style={{ borderLeft: `2px solid ${BRAND.pink}33`, paddingLeft: 20, display: "flex", flexDirection: "column" }}>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: BRAND.pink, textTransform: "uppercase", marginBottom: 16 }}>TIMELINE</div>
                                  <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                    <div style={{ position: "absolute", left: -22, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${BRAND.pink}, ${BRAND.navy})` }} />
                                    {article.timeline.map((evt, i) => (
                                      <div key={i} style={{ position: "relative", paddingLeft: 8 }}>
                                        <div style={{ position: "absolute", left: -26, top: 4, width: 8, height: 8, borderRadius: "50%", background: BRAND.pink, border: `2px solid ${t.bg}` }} />
                                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, marginBottom: 1 }}>{evt.year}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: t.titleColor, lineHeight: 1.3, marginBottom: 1 }}>{evt.event}</div>
                                        <div style={{ fontSize: 9, lineHeight: 1.4, color: t.textMuted }}>{evt.detail}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <p style={{ fontSize: 10, lineHeight: 1.5, color: t.textMuted, fontStyle: "italic", marginTop: 12, opacity: 0.7 }}>
                                    Domestic investors such as Berlusconi at Milan, Walker at Blackburn, and Moratti at Inter are excluded , this timeline focuses on foreign PE investment.
                                  </p>
                                </div>
                              </div>
                              </>
                            ) : (
                              <>
                                {/* Stat cards */}
                                {article.statCards && (
                                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 10 : 14, marginBottom: 28 }}>
                                    {article.statCards.map((card, ci) => (
                                      <div key={ci} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: isMobile ? "16px 14px" : "20px 24px" }}>
                                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 28 : 32, color: BRAND.pink, lineHeight: 1 }}>{card.value}</div>
                                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{card.label}. {card.sublabel}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {article.intro && article.bodyParagraphs.length > 0 && (
                                  <p style={{ fontStyle: "italic", fontSize: 15, lineHeight: 1.8, color: t.textSec, marginBottom: 24 }}>
                                    {article.intro}
                                  </p>
                                )}
                                {article.bodyParagraphs.length > 0 && (
                                  <div>
                                    {article.bodyHeading && (
                                      <>
                                        <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 24 }} />
                                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 24, color: t.titleColor, marginBottom: 16 }}>{article.bodyHeading}</div>
                                      </>
                                    )}
                                    {article.bodyParagraphs.map((p, i) => {
                                      const dashIdx = p.indexOf(" , ");
                                      if (dashIdx > 0 && dashIdx < 50 && p.substring(0, dashIdx) === p.substring(0, dashIdx).toUpperCase()) {
                                        const boldPart = p.substring(0, dashIdx);
                                        const rest = p.substring(dashIdx + 3);
                                        return (
                                          <div key={i} style={{ marginTop: 14 }}>
                                            <strong style={{ display: "block", fontSize: 14, color: t.titleColor, marginBottom: 6 }}>{boldPart}</strong>
                                            <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted }}>{rest}</p>
                                          </div>
                                        );
                                      }
                                      return <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 14 }}>{p}</p>;
                                    })}
                                  </div>
                                )}
                                {/* Body sections , render right after bodyParagraphs, before flipCards/tables */}
                                {article.bodySections?.map((section, si) => (
                                  <div key={si} style={{ marginTop: si === 0 ? 28 : 36 }}>
                                    <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 24 }} />
                                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 24, color: t.titleColor, marginBottom: 16 }}>{section.heading}</div>
                                    {section.paragraphs.map((p, pi) => {
                                      const dashIdx = p.indexOf(" \u2014 ");
                                      if (dashIdx > 0 && dashIdx < 60) {
                                        const boldPart = p.substring(0, dashIdx);
                                        const rest = p.substring(dashIdx + 3);
                                        return (
                                          <div key={pi} style={{ marginTop: 14 }}>
                                            <strong style={{ display: "block", fontSize: 14, color: t.titleColor, marginBottom: 6 }}>{boldPart}</strong>
                                            <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted }}>{rest}</p>
                                          </div>
                                        );
                                      }
                                      return <p key={pi} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 14 }}>{p}</p>;
                                    })}
                                  </div>
                                ))}
                                {/* Collapsible revenue share table */}
                                {article.revShareTable && (() => {
                                  const parsePct = (s: string): number => {
                                    const nums = s.match(/\d+/g)?.map(Number) || [];
                                    return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0] || 0;
                                  };
                                  const pctColor = (pct: number): string => {
                                    if (pct <= 0) return t.textMuted;
                                    if (pct < 25) return "#e05252";
                                    if (pct < 40) return "#e08b35";
                                    if (pct < 55) return "#d4a73a";
                                    return "#4caf50";
                                  };
                                  return (
                                    <div style={{ marginTop: 28 }}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setOpenRevTab(openRevTab === "revshare" ? null : "revshare"); }}
                                        style={{ width: "100%", background: openRevTab === "revshare" ? `${BRAND.pink}06` : t.bgCard, border: `1px solid ${openRevTab === "revshare" ? BRAND.pink + "44" : t.border}`, borderRadius: 10, cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, outline: "none", transition: "all 0.3s", zIndex: 2 }}
                                      >
                                        <div style={{ textAlign: "left" }}>
                                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: t.titleColor, lineHeight: 1.2 }}>ATHLETE REVENUE SHARE BY SPORT</div>
                                          <div style={{ fontSize: 11, color: t.textMuted, fontStyle: "italic", marginTop: 4 }}>Ranges of how much of the money reaches the athletes, across sports, geographies and structures</div>
                                        </div>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: openRevTab === "revshare" ? BRAND.pink : t.textMuted, flexShrink: 0, transition: "transform 0.3s", transform: openRevTab === "revshare" ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                      </button>
                                      <div style={{ maxHeight: openRevTab === "revshare" ? 2000 : 0, opacity: openRevTab === "revshare" ? 1 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease" }}>
                                        <div style={{ padding: "12px 0 0", overflowX: "auto" }}>
                                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 12 }}>
                                            <thead>
                                              <tr>
                                                {["Property", "% to Players", "Structure", "Notes"].map(h => (
                                                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {article.revShareTable.map((row, ri) => {
                                                if (row.isHeader) {
                                                  return (
                                                    <tr key={ri}>
                                                      <td colSpan={4} style={{ padding: "14px 12px 6px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: t.titleColor, letterSpacing: 1, borderBottom: `1px solid ${t.border}` }}>{row.property}</td>
                                                    </tr>
                                                  );
                                                }
                                                const numPct = parsePct(row.pct);
                                                const clr = pctColor(numPct);
                                                return (
                                                  <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : `${t.border}33` }}>
                                                    <td style={{ padding: "8px 12px", fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}` }}>{row.property}</td>
                                                    <td style={{ padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: clr, borderBottom: `1px solid ${t.border}` }}>{row.pct}</td>
                                                    <td style={{ padding: "8px 12px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{row.structure}</td>
                                                    <td style={{ padding: "8px 12px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}`, fontStyle: "italic" }}>{row.notes}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {/* Sections for mobile PE fallback */}
                                {article.id === "pe-ownership" && article.sections && article.sections.map((section, si) => (
                                  <div key={si} style={{ marginTop: 28 }}>
                                    <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 20 }} />
                                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.titleColor, marginBottom: 12 }}>{section.heading}</div>
                                    {section.paragraphs.map((p, pi) => {
                                      const dashIdx = p.indexOf(" , ");
                                      if (dashIdx > 0 && dashIdx < 50) {
                                        const boldPart = p.substring(0, dashIdx);
                                        const rest = p.substring(dashIdx);
                                        return (
                                          <p key={pi} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 12 }}>
                                            <strong style={{ color: t.titleColor }}>{boldPart}</strong>{rest}
                                          </p>
                                        );
                                      }
                                      return <p key={pi} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 12 }}>{p}</p>;
                                    })}
                                    {/* Firm profiles inside WHERE WE ARE TODAY on mobile */}
                                    {section.heading === "WHERE WE ARE TODAY" && article.firms && (
                                      <div style={{ marginTop: 24 }}>
                                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: t.titleColor, marginBottom: 6 }}>WHO PIONEERED THE MODEL</div>
                                        <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 16 }}>Three firms defined what institutional sports ownership actually looks like, each representing a structurally distinct thesis.</p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                          {article.firms.map(firm => (
                                            <div key={firm.name} style={{ paddingLeft: 14, borderLeft: `3px solid ${BRAND.pink}` }}>
                                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: t.titleColor, marginBottom: 6 }}>{firm.name}</div>
                                              <p style={{ fontSize: 13, lineHeight: 1.7, color: t.textMuted }}>{firm.desc}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}


                            {/* THE SHIFT + Revenue tables + Athletes as Owners , before sections */}
                            {article.flipCards && (
                              <div style={{ marginTop: 40 }}>
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 32 }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 8 }}>THE SHIFT</div>
                                <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 28 }}>For most of sports history, athletes accepted the model they were born into. Three moments made that impossible to continue.</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  {article.flipCards.map(card => (
                                    <FlipCardComponent key={card.id} card={card} t={t} isMobile={isMobile} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {article.revenueTables && (() => {
                              const rt = article.revenueTables;
                              const sectionGroups: { key: string; title: string; subtitle: string; rows: RevShareRow[] }[] = [
                                { key: "us", title: "US LEAGUES", subtitle: "Closed leagues = controlled labor with strong unions", rows: rt.usLeagues },
                                { key: "euro", title: "EUROPEAN FOOTBALL", subtitle: "Players run the show", rows: rt.euroFootball },
                                { key: "comp", title: "COMPETITIONS", subtitle: "Governing bodies with full control", rows: rt.competitions },
                                { key: "ind", title: "INDIVIDUAL SPORTS", subtitle: "Fragmented power , Golf just forced a reset", rows: rt.individualSports },
                                { key: "cricket", title: "CRICKET", subtitle: "Governing body capture", rows: rt.cricket },
                                { key: "combat", title: "UFC / WWE / BOXING", subtitle: "Extreme owner dominance vs star power", rows: rt.combat },
                              ];
                              const parsePct = (s: string): number => {
                                const nums = s.match(/\d+/g)?.map(Number) || [];
                                return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0] || 0;
                              };
                              const pctColor = (pct: number): string => {
                                if (pct <= 0) return "#9e9e9e";
                                const clamped = Math.min(pct, 80);
                                if (clamped < 25) return "#e05252";
                                if (clamped < 40) return "#e08b35";
                                if (clamped < 55) return "#d4a73a";
                                return "#4caf50";
                              };
                              const pctBg = (pct: number): string => pctColor(pct) + "14";
                              return (
                                <div style={{ marginTop: 48 }}>
                                  <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 32 }} />
                                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 8 }}>ATHLETE REVENUE SHARE BY SPORT</div>
                                  <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>How much of the money reaches the athletes , and what structure determines it.</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                                    {[{ label: "< 25%", color: "#e05252" }, { label: "25–40%", color: "#e08b35" }, { label: "40–55%", color: "#d4a73a" }, { label: "> 55%", color: "#4caf50" }].map(l => (
                                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMuted }}>{l.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {sectionGroups.map(group => {
                                      const isOpen = openRevTab === group.key;
                                      return (
                                        <div key={group.key} style={{ borderRadius: 10, border: `1px solid ${isOpen ? BRAND.pink + "44" : t.border}`, overflow: "hidden", transition: "border-color 0.3s" }}>
                                          <button
                                            onClick={() => setOpenRevTab(isOpen ? null : group.key)}
                                            style={{ width: "100%", background: isOpen ? (isDark ? `${BRAND.pink}10` : `${BRAND.pink}06`) : t.bgCard, border: "none", cursor: "pointer", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, outline: "none", transition: "background 0.3s" }}
                                          >
                                            <div style={{ textAlign: "left" }}>
                                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, color: t.titleColor, lineHeight: 1.2 }}>{group.title}</div>
                                              <div style={{ fontSize: 10, color: t.textMuted, fontStyle: "italic", marginTop: 2 }}>{group.subtitle}</div>
                                            </div>
                                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: isOpen ? BRAND.pink : t.textMuted, flexShrink: 0, transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                          </button>
                                          <div style={{ maxHeight: isOpen ? 600 : 0, opacity: isOpen ? 1 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease" }}>
                                            <div style={{ padding: "0 20px 16px", overflowX: "auto" }}>
                                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 12, minWidth: isMobile ? undefined : 380 }}>
                                                <thead>
                                                  <tr>
                                                    {["Property", "% to Players", ...(group.rows[0]?.structure ? ["Structure"] : []), "Notes"].map(h => (
                                                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>{h}</th>
                                                    ))}
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {group.rows.map((row, i) => {
                                                    const numPct = parsePct(row.pct);
                                                    const clr = pctColor(numPct);
                                                    return (
                                                      <tr key={i}>
                                                        <td style={{ padding: isMobile ? "8px 8px" : "8px 12px", fontWeight: 600, color: t.text, whiteSpace: isMobile ? "normal" : "nowrap", borderBottom: `1px solid ${t.border}` }}>{row.property}</td>
                                                        <td style={{ padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: clr, borderBottom: `1px solid ${t.border}`, background: pctBg(numPct) }}>{row.pct}</td>
                                                        {row.structure !== undefined && <td style={{ padding: "8px 12px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{row.structure}</td>}
                                                        <td style={{ padding: "8px 12px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{row.notes}</td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Content sections with headings (skip PE , handled above) */}
                            {article.id !== "pe-ownership" && article.sections?.map((section, si) => (
                              <div key={si} style={{ marginTop: si === 0 ? 0 : 36 }}>
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 24 }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 24, color: t.titleColor, marginBottom: 16 }}>{section.heading}</div>
                                {/* Float map right inside first section for articles with maps */}
                                {si === 0 && article.mapCities && !isMobile && (
                                  <div style={{ float: "right", width: 460, marginLeft: 28, marginBottom: 16 }}>
                                    <EuropeMap cities={article.mapCities} t={t} isDark={isDark} />
                                  </div>
                                )}
                                {si === 0 && article.mapCities && isMobile && (
                                  <div style={{ marginBottom: 20 }}>
                                    <EuropeMap cities={article.mapCities} t={t} isDark={isDark} />
                                  </div>
                                )}
                                {section.paragraphs.map((p, pi) => {
                                  const dashIdx = p.indexOf(" , ");
                                  if (dashIdx > 0 && dashIdx < 60) {
                                    const boldPart = p.substring(0, dashIdx);
                                    const rest = p.substring(dashIdx + 3);
                                    return (
                                      <React.Fragment key={pi}>
                                        <div style={{ marginTop: 14 }}>
                                          <strong style={{ display: "block", fontSize: 14, color: t.titleColor, marginBottom: 6 }}>{boldPart}</strong>
                                          <p style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted }}>{rest}</p>
                                        </div>
                                        {/* Collapsible athlete ownership table after THE ATHLETE TAKES CONTROL */}
                                        {boldPart === "THE ATHLETE TAKES CONTROL" && article.athleteOwnership && (
                                          <div style={{ marginTop: 20, marginBottom: 8 }}>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); setOpenRevTab(openRevTab === "athlete-ownership" ? null : "athlete-ownership"); }}
                                              style={{ width: "100%", background: openRevTab === "athlete-ownership" ? `${BRAND.pink}06` : t.bgCard, border: `1px solid ${openRevTab === "athlete-ownership" ? BRAND.pink + "44" : t.border}`, borderRadius: 10, cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, outline: "none", transition: "all 0.3s", zIndex: 2 }}
                                            >
                                              <div style={{ textAlign: "left" }}>
                                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: t.titleColor, lineHeight: 1.2 }}>HISTORY OF ATHLETE OWNERSHIP</div>
                                                <div style={{ fontSize: 11, color: t.textMuted, fontStyle: "italic", marginTop: 3 }}>The earliest known example was George Halas (1920s, NFL). From 2009–2015 few but isolated cases. 2019 onward a clear explosion.</div>
                                              </div>
                                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: openRevTab === "athlete-ownership" ? BRAND.pink : t.textMuted, flexShrink: 0, transition: "transform 0.3s", transform: openRevTab === "athlete-ownership" ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                            </button>
                                            <div style={{ maxHeight: openRevTab === "athlete-ownership" ? 3000 : 0, opacity: openRevTab === "athlete-ownership" ? 1 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease" }}>
                                              <div style={{ padding: "12px 0 0", overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 10 : 12 }}>
                                                  <thead>
                                                    <tr>
                                                      {["Year", "Athlete", "Team / League", "Sport", "Type"].map(h => (
                                                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", borderBottom: `2px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {article.athleteOwnership.map((row, ri) => (
                                                      <tr key={ri} style={{ background: ri % 2 === 1 ? `${t.border}33` : "transparent" }}>
                                                        <td style={{ padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: BRAND.pink, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.year}</td>
                                                        <td style={{ padding: "6px 10px", fontWeight: 600, color: t.text, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.athlete}</td>
                                                        <td style={{ padding: "6px 10px", color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>{row.team}</td>
                                                        <td style={{ padding: "6px 10px", color: t.textMuted, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{row.sport}</td>
                                                        <td style={{ padding: "6px 10px", color: t.textMuted, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{row.type}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  }
                                  return <p key={pi} style={{ fontSize: 14, lineHeight: 1.8, color: t.textMuted, marginTop: 14 }}>{p}</p>;
                                })}
                              </div>
                            ))}

                            {/* Closing quote */}
                            {article.closingQuote && (
                              <div style={{ marginTop: 40 }}>
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, marginBottom: 28 }} />
                                <p style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.8, color: t.textMuted, textAlign: "center", padding: isMobile ? "0 8px" : "0 40px" }}>{article.closingQuote}</p>
                              </div>
                            )}

                            {/* Pros / Cons + integrated vote */}
                            {article.pros && article.cons && (() => {
                              const pollId = `gster26:${article.id}:will-it-work`;
                              return <PollVoteSection pollId={pollId} article={article} t={t} isMobile={isMobile} user={user} sessionValid={sessionValid} />;
                            })()}

                            {/* Timeline , skip for PE on desktop since it's in the sidebar */}
                            {article.timeline && !(article.id === "pe-ownership" && !isMobile) && (
                              <>
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "48px 0" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 40, textAlign: "center" }}>TIMELINE</div>

                                {isMobile ? (
                                  /* Mobile: vertical compact timeline */
                                  (<div style={{ position: "relative", paddingLeft: 28 }}>
                                    <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${BRAND.pink}, ${BRAND.navy})` }} />
                                    {article.timeline.map((evt, i) => (
                                      <div key={i} style={{ position: "relative", marginBottom: 24, paddingLeft: 20 }}>
                                        <div style={{ position: "absolute", left: -24, top: 4, width: 12, height: 12, borderRadius: "50%", background: BRAND.pink, border: `2px solid ${t.bg}` }} />
                                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: BRAND.pink, marginBottom: 4 }}>{evt.year}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: t.titleColor, marginBottom: 2 }}>{evt.event}</div>
                                        <div style={{ fontSize: 12, lineHeight: 1.6, color: t.textMuted }}>{evt.detail}</div>
                                      </div>
                                    ))}
                                  </div>)
                                ) : (
                                  /* Desktop: horizontal with events alternating top/bottom */
                                  (<div style={{ position: "relative", overflowX: "auto", padding: "0 0 24px", scrollbarWidth: "none" as const }}>
                                    <div style={{ display: "flex", alignItems: "center", minWidth: article.timeline.length * 140, position: "relative" }}>
                                      {/* Horizontal line */}
                                      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: `linear-gradient(to right, ${BRAND.pink}, ${BRAND.navy})`, transform: "translateY(-1px)" }} />
                                      {article.timeline.map((evt, i) => {
                                        const isTop = i % 2 === 0;
                                        return (
                                          <div key={i} style={{ flex: 1, minWidth: 140, position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            {/* Top content */}
                                            <div style={{ height: 120, display: "flex", flexDirection: "column", justifyContent: isTop ? "flex-end" : "flex-start", paddingBottom: isTop ? 16 : 0, paddingTop: isTop ? 0 : 16, opacity: isTop ? 1 : 0, pointerEvents: isTop ? "auto" : "none" }}>
                                              <div style={{ textAlign: "center", maxWidth: 130 }}>
                                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, marginBottom: 4 }}>{evt.year}</div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: t.titleColor, lineHeight: 1.3, marginBottom: 2 }}>{evt.event}</div>
                                                <div style={{ fontSize: 10, lineHeight: 1.4, color: t.textMuted }}>{evt.detail}</div>
                                              </div>
                                            </div>
                                            {/* Dot */}
                                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: BRAND.pink, border: `2px solid ${t.bg}`, zIndex: 1, flexShrink: 0 }} />
                                            {/* Bottom content */}
                                            <div style={{ height: 120, display: "flex", flexDirection: "column", justifyContent: !isTop ? "flex-start" : "flex-end", paddingTop: !isTop ? 16 : 0, paddingBottom: !isTop ? 0 : 16, opacity: !isTop ? 1 : 0, pointerEvents: !isTop ? "auto" : "none" }}>
                                              <div style={{ textAlign: "center", maxWidth: 130 }}>
                                                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.pink, marginBottom: 4 }}>{evt.year}</div>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: t.titleColor, lineHeight: 1.3, marginBottom: 2 }}>{evt.event}</div>
                                                <div style={{ fontSize: 10, lineHeight: 1.4, color: t.textMuted }}>{evt.detail}</div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>)
                                )}
                              </>
                            )}

                            {/* Firm profiles , skip PE entirely (handled in its own section) */}
                            {article.firms && article.id !== "pe-ownership" && (
                              <>
                                <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: "48px 0" }} />
                                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.titleColor, marginBottom: 32 }}>WHO PIONEERED THE MODEL</div>
                                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20 }}>
                                  {article.firms.map(firm => {
                                    const fUrl = firm.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${firm.domain}` : null;
                                    return (
                                      <div key={firm.name} style={{ paddingLeft: 16, borderLeft: `3px solid ${BRAND.pink}` }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                          <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                            {fUrl && <img src={fUrl} alt="" width={28} height={28} style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, zIndex: 1, background: "#fff", borderRadius: 6 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                                            <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.pink, borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: "'Bebas Neue',sans-serif" }}>{firm.name.charAt(0)}</div>
                                          </div>
                                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.titleColor }}>{firm.name}</div>
                                        </div>
                                        <p style={{ fontSize: 13, lineHeight: 1.8, color: t.textMuted }}>{firm.desc}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                      </AccordionBody>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)` }} />

      {/* ── PEAK 2026 FEATURED SECTION ─────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, transparent, #170c4944, #170c4966, #170c4944, transparent)`, padding: 2, margin: isMobile ? "0 8px" : "0 20px", borderRadius: 20 }}>
      <div id="peak2026" style={{ background: `linear-gradient(135deg, #0e0830, #170c49, #0e0830)`, padding: isMobile ? "28px 16px" : "32px 40px", borderRadius: 18, position: "relative", overflow: "hidden" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "-30%", right: "-10%", width: "60%", height: "160%", background: "radial-gradient(ellipse, rgba(23,12,73,0.5) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── Row 1: Header + Stats ── */}
          <div className="stx-reveal" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 16, marginBottom: isMobile ? 16 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src="/peak-logo.jpeg" alt="PEAK" style={{ height: isMobile ? 40 : 48, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 28 : 38, lineHeight: 1, color: "#fff", margin: 0 }}>PEAK 2026 | LAS VEGAS</h2>
                </div>
                <p style={{ fontSize: isMobile ? 10 : 11, letterSpacing: 1.5, color: "#c9a0e8", margin: "2px 0 0", textTransform: "uppercase" }}>The Global Stage for SportsTech Startups</p>
              </div>
            </div>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
{["1,000+ Attendees", "100+ Speakers", "8+ Tracks", "50+ Countries", "100+ Exhibitors"].map((stat, i) => (
                  <span key={stat} style={{ fontSize: 10, letterSpacing: 1, color: "#fff", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{stat.split(" ")[0]}</span>{" " + stat.split(" ").slice(1).join(" ")}
                    {i < 4 && <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 6px" }}>|</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Row 2: Video + About + Tracks (3 columns) ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1.8fr", gap: isMobile ? 16 : 16, marginBottom: isMobile ? 12 : 12 }}>
            {/* Video */}
            <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://www.youtube.com/embed/fLBSnWkv40o"
                  title="PEAK 2026"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                />
              </div>
            </div>
            {/* About + Tracks + CTA */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 0.8fr", gap: isMobile ? 12 : 24, flex: 1 }}>
                {/* Text */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "PEAK brings together 1,000+ sports executives, investors, and founders shaping the future of sport.",
                    "Raise capital, build partnerships, and stay ahead of SportsTech , all in one place.",
                    "Three days at PEAK can replace months of meetings, so you can get back to building.",
                    "APRIL 20–22, 2026 | Fontainebleau Las Vegas",
                  ].map((text, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#fff", fontFamily: "'Open Sans',sans-serif", fontWeight: i === 3 ? 700 : 400, letterSpacing: i === 3 ? 0.5 : 0, lineHeight: 1.7, margin: 0 }}>{text}</p>
                  ))}
                </div>
                {/* Tracks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignContent: "start" }}>
                  {PEAK_TRACKS.map(({ label, Icon }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
                        <Icon size={13} color="#e8d5f5" strokeWidth={1.5} />
                      </div>
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, lineHeight: 1.2 }}>{label.replace("\n", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* CTA box spanning full width below */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 8, padding: isMobile ? "10px 14px" : "10px 20px", gap: 16, marginTop: 8 }}>
                <div>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 14 : 16, color: BRAND.darkTitle, margin: 0, lineHeight: 1.2 }}>Discover the Future of Sports</p>
                  <p style={{ fontSize: isMobile ? 9 : 10, color: BRAND.slate, margin: "2px 0 0", fontStyle: "italic" }}>Join the global SportsTech community at PEAK 2026</p>
                </div>
                <a href="https://peakconf.com/stxreport?utm_source=stxreport&utm_medium=report&utm_campaign=stxreport_link" target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: 2, color: "#fff", background: BRAND.pink, padding: "8px 28px", borderRadius: 50, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                  SAVE $500 NOW
                </a>
              </div>
            </div>
          </div>

          {/* ── Row 3: Startup Competitions (side by side, compact) ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: isMobile ? 10 : 10 }}>
            {/* SWC */}
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderLeft: "3px solid #c9a0e8", borderRadius: 8, padding: isMobile ? "14px 14px" : "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <h4 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#fff", margin: 0, letterSpacing: 1 }}>Startup World Cup Finals</h4>
                <span style={{ fontSize: 9, color: "#c9a0e8", letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>AWS · $10K Prize</span>
              </div>
              <p style={{ fontSize: 11, color: "#fff", lineHeight: 1.5, margin: "0 0 10px" }}>Nine finalists pitch live to leading sports executives and investors.</p>
              {(() => {
                const sectors = ["athletes", "fans", "executives"] as const;
                const sectorLabels = { athletes: "For Athletes", fans: "For Fans", executives: "For Executives" };
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 12px" }}>
                    {sectors.map(sector => (
                      <span key={sector} style={{ fontSize: 9, letterSpacing: 1.5, color: "#c9a0e8", textTransform: "uppercase", fontWeight: 600 }}>{sectorLabels[sector]}</span>
                    ))}
                    {[0, 1, 2].map(row => (
                      sectors.map(sector => {
                        const c = PEAK_SWC_FINALISTS[sector][row];
                        if (!c) return <div key={`${sector}-${row}`} />;
                        const lUrl = c.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${c.domain}` : null;
                        return (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {lUrl && <img src={lUrl} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                            <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{c.name}</span>
                          </div>
                        );
                      })
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* Groundbreakers */}
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderLeft: "3px solid #c9a0e8", borderRadius: 8, padding: isMobile ? "14px 14px" : "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <h4 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#fff", margin: 0, letterSpacing: 1 }}>Groundbreakers Challenge</h4>
                <span style={{ fontSize: 9, color: "#c9a0e8", letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>GSIC</span>
              </div>
              <p style={{ fontSize: 11, color: "#fff", lineHeight: 1.5, margin: "0 0 10px" }}>Connecting startups with leading sports organisations seeking tech-driven solutions.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 12px" }}>
                {GROUNDBREAKERS_ORGS.map(org => {
                  const lUrl = org.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${org.domain}` : null;
                  return (
                    <div key={org.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {lUrl && <img src={lUrl} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{org.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Row 4: Partners bar ── */}
          <div className="stx-reveal" style={{ padding: "8px 20px" }}>
            <p style={{ fontSize: 9, letterSpacing: 2.5, color: "#c9a0e8", textTransform: "uppercase", margin: "0 0 6px", textAlign: "center" }}>Partners & Sponsors</p>
            {(() => {
              const allPartners = [...PEAK_PARTNERS_TIER1, ...PEAK_PARTNERS_TIER2, ...PEAK_PARTNERS_TIER3];
              const row1 = allPartners.slice(0, 12);
              const row2 = allPartners.slice(12);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 6, alignItems: "center" }}>
                {[row1, row2].map((row, ri) => (
                <div key={ri} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: isMobile ? 10 : 10 }}>
                  {row.map(p => (
                    <div key={p.name} title={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: isMobile ? 44 : 52, height: isMobile ? 44 : 52 }}>
                      <img src={p.logo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  ))}
                </div>
                ))}
                </div>
              );
            })()}
          </div>

        </div>
      </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)` }} />

      {/* ── GSTER26 INNOVATORS ────────────────────────────────────────────── */}
      {(() => {
        const innovators = [...(notionData?.data || [])].sort((a, b) => a.name.localeCompare(b.name));
        const continentColor = (continent: string) => {
          const c = continent.toLowerCase();
          if (c.includes("europe"))        return "#5B7FFF";
          if (c.includes("north america")) return "#E08B35";
          if (c.includes("asia") || c.includes("apac") || c.includes("oceania") || c.includes("india") || c.includes("middle east") || c.includes("pacific")) return "#4D9B6F";
          if (c.includes("africa"))        return "#4D9B6F";
          if (c.includes("south america") || c.includes("latin")) return "#E08B35";
          return "#4D9B6F";
        };

        return (
          <div id="innovators" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0", position: "relative" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
              <div className="stx-reveal">
                {sectionLabel("Innovators")}
                {sectionTitle("DRIVING WHAT\nCOMES NEXT")}
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: t.textMuted, marginTop: 16, lineHeight: 1.65 }}>
                  The people and organisations defining where sports innovation and investment go from here.
                </p>
              </div>

              {/* Region legend */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 32, marginBottom: 48 }}>
                {[
                  { label: "Europe",        color: "#5B7FFF" },
                  { label: "North America", color: "#E08B35" },
                  { label: "APAC",          color: "#4D9B6F" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>{r.label}</span>
                  </div>
                ))}
              </div>

              {/* Card grid */}
              {innovators.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: t.textMuted, fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 2 }}>
                  LOADING INNOVATORS…
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6,1fr)",
                  gap: isMobile ? 24 : 36,
                }}>
                  {innovators.map(person => {
                    const ringColor = continentColor(person.continent);
                    return (
                      <div
                        key={person.id}
                        onClick={() => setSelectedInnovator(person)}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "center" }}
                      >
                        {/* Profile circle */}
                        <div style={{
                          width: isMobile ? 80 : 108,
                          height: isMobile ? 80 : 108,
                          borderRadius: "50%",
                          border: `3px solid ${ringColor}`,
                          padding: 3,
                          boxShadow: `0 0 18px ${ringColor}44`,
                          transition: "box-shadow 0.2s, transform 0.2s",
                          flexShrink: 0,
                          position: "relative",
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${ringColor}88`; (e.currentTarget as HTMLElement).style.transform = "scale(1.06)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${ringColor}44`; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                        >
                          {/* Initials sit behind; the photo covers them and reveals them on
                              error — the Notion-hosted innovator photos can expire. */}
                          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: t.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: ringColor }}>
                              {person.name.charAt(0)}
                            </span>
                          </div>
                          {person.photo_url && (
                            <img
                              src={person.photo_url}
                              alt={person.name}
                              style={{ position: "absolute", inset: 3, width: "calc(100% - 6px)", height: "calc(100% - 6px)", borderRadius: "50%", objectFit: "cover", objectPosition: "top", filter: "grayscale(20%)" }}
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                        </div>

                        {/* Name + Company */}
                        <div>
                          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 13 : 15, color: t.text, lineHeight: 1.1, marginBottom: 3 }}>{person.name}</p>
                          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1, color: ringColor, lineHeight: 1.3, textTransform: "uppercase" }}>{person.company}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* ── Detail sliding panel ── */}
            {selectedInnovator && createPortal((() => {
              const p = selectedInnovator;
              const accent = continentColor(p.continent);
              const cardRef = { current: null as HTMLDivElement | null };
              const contentRef = { current: null as HTMLDivElement | null };
              const handleDownload = async () => {
                trackG26("innovator_download", { name: p.name });
                setIsGeneratingCard(true);
                try {
                  const dataUrl = cardImageData || await generateCardImage(p, accent);
                  if (!cardImageData) setCardImageData(dataUrl);
                  const link = document.createElement("a");
                  link.download = `${p.name.replace(/\s+/g, "-")}-GSTER26.png`;
                  link.href = dataUrl;
                  link.click();
                } catch (err) {
                  console.error("Card generation failed:", err);
                } finally {
                  setIsGeneratingCard(false);
                }
              };
              const hardcoded = INNOVATOR_RESPONSES[p.name] || {};
              const questions = [
                { label: "Are there any underserved areas in sports tech that you think are ripe for disruption?", answer: hardcoded.q_innovators || p.q_innovators || "" },
                { label: "Which emerging technologies do you believe will reshape the sports industry in the next 3–5 years?", answer: hardcoded.q_investors || p.q_investors || "" },
                { label: "In which operational areas are you actively seeking innovation?", answer: hardcoded.q_sports_orgs || p.q_sports_orgs || "" },
              ].filter(q => q.answer.trim().length > 0);

              return (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setSelectedInnovator(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 8999, backdropFilter: "blur(2px)" }}
                  />
                  {/* Sliding panel from right */}
                  <div
                    ref={(el) => { cardRef.current = el; }}
                    className="animate-slide-in-right"
                    style={{
                      position: "fixed",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: isMobile ? "100%" : 480,
                      zIndex: 9000,
                      background: isDark
                        ? `linear-gradient(135deg, #0c0f1a 0%, #111827 100%)`
                        : `linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
                      boxShadow: `-8px 0 40px rgba(0,0,0,0.3), 0 0 0 1px ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                    }}
                  >
                    {/* Top accent bar */}
                    <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${BRAND.pink}, ${accent}, ${BRAND.pink}88)` }} />

                    {/* Top toolbar: branding, download, share, close */}
                    <div style={{
                      flexShrink: 0,
                      padding: "10px 16px",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2, color: BRAND.pink, flexShrink: 0 }}>SportsTechX</div>
                        <div style={{ height: 3, flex: 1, borderRadius: 2, background: `linear-gradient(90deg, ${BRAND.pink}44, ${accent}44, transparent)` }} />
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase", whiteSpace: "nowrap" }}>GSTER 2026</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        {/* Download PNG */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                          title="Download card as image"
                          disabled={isGeneratingCard}
                          style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                            cursor: isGeneratingCard ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: t.textMuted, transition: "all 0.2s", opacity: isGeneratingCard ? 0.5 : 1,
                          }}
                          onMouseEnter={e => { if (!isGeneratingCard) { e.currentTarget.style.background = BRAND.pink; e.currentTarget.style.color = "#fff"; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; e.currentTarget.style.color = t.textMuted; }}
                        >
                          {isGeneratingCard
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          }
                        </button>
                        {/* Close */}
                        <button
                          onClick={() => setSelectedInnovator(null)}
                          style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                            cursor: "pointer",
                            color: t.textMuted, fontSize: 14, lineHeight: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; }}
                        >✕</button>
                      </div>
                    </div>

                    {/* Scrollable content area */}
                    <div ref={(el) => { contentRef.current = el; }} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                      {/* Header: details left, photo right */}
                      <div style={{
                        padding: isMobile ? "20px 16px" : "24px 24px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 16,
                      }}>
                        {/* Photo with country flag badge */}
                        <div style={{ flexShrink: 0, position: "relative" }}>
                          <div style={{
                            width: 100, height: 100,
                            borderRadius: "50%", border: `3px solid ${accent}`, padding: 3,
                            boxShadow: `0 0 32px ${accent}33, 0 0 0 8px ${accent}10`,
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                          }}>
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", objectPosition: "top" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: t.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: accent }}>{p.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          {p.country && (
                            <div style={{
                              position: "absolute", bottom: 2, right: 2,
                              width: 28, height: 28, borderRadius: "50%",
                              background: isDark ? "#1a1f2e" : "#fff",
                              border: `2px solid ${isDark ? "#1a1f2e" : "#fff"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}>
                              {getCountryFlag(p.country)}
                            </div>
                          )}
                        </div>

                        {/* Name + details */}
                        <div style={{ textAlign: "center", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.text, lineHeight: 1, letterSpacing: 1 }}>{p.name}</h3>
                            {p.logo_url && (
                              <img src={p.logo_url} alt={`${p.company} logo`} style={{ height: 20, maxWidth: 60, objectFit: "contain", opacity: 0.75 }}
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 12 }}>{p.designation} · {p.company}</p>
                          {p.linkedin && (
                            <a href={p.linkedin.startsWith("http") ? p.linkedin : `https://${p.linkedin}`} target="_blank" rel="noopener noreferrer"
                              style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 30, height: 30, borderRadius: "50%",
                                background: "#0A66C2", color: "#fff", textDecoration: "none",
                                fontSize: 14, fontWeight: 700,
                              }}>
                              in
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ margin: "0 24px", height: 1, background: `linear-gradient(90deg, ${accent}33, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}, transparent)` }} />

                      {/* Q&A section */}
                      <div style={{ padding: "20px 24px 24px" }}>
                        {questions.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {questions.map((q, i) => (
                              <div key={i} style={{
                                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                                borderRadius: 14,
                                padding: "14px 16px",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
                                borderLeftWidth: 3,
                                borderLeftColor: accent,
                                borderLeftStyle: "solid" as const,
                              }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 10 }}>{q.label}</p>
                                <p style={{ fontSize: 14, color: t.text, lineHeight: 1.85 }}>
                                  {q.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: t.textMuted, textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>No responses yet</p>
                        )}
                      </div>
                    </div>

                  </div>

                </>
              );
            })(), document.body)}
          </div>
        );
      })()}

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)` }} />

      {/* ── CHART-10 + CHART-11: ECOSYSTEM SNAPSHOT ─────────────────────── */}
      <div id="ecosystem" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel("Startups to Watch")}
            {sectionTitle("COMPANIES WORTH\nYOUR ATTENTION")}
          </div>
          {/* ── Tab Switcher + Sector Legend ── */}
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 32, marginBottom: 16, borderBottom: `2px solid ${t.border}`, flexWrap: "wrap" }}>
            <div style={{ display: "flex" }}>
              {([["Innovators", "innovators"], ["PEAK", "peak"], ["Our Picks", "stx"]] as const).map(([label, key]) => {
                const active = watchTab === key;
                return (
                  <button key={key}
                    onClick={() => setWatchTab(key as "innovators" | "peak" | "stx")}
                    style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 16 : 26, letterSpacing: 2, padding: isMobile ? "8px 14px 10px" : "10px 36px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none" }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: isMobile ? "none" : "flex", gap: 14, marginLeft: "auto", marginBottom: 10, flexShrink: 0 }}>
              {([["For Athletes", BRAND.athletes], ["For Executives", BRAND.execs], ["For Fans", BRAND.fans]] as const).map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color, fontSize: 9, lineHeight: 1 }}>●</span>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: t.textMuted, letterSpacing: 0.5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tab description ── */}
          <p style={{ margin: "0 0 32px", fontSize: 15, lineHeight: 1.7, color: t.text, }}>
            {watchTab === "innovators"
              ? "Nominated by this year's featured innovators: the startups they're watching, backing, or building alongside."
              : watchTab === "peak"
              ? "Finalists in the PEAK Startup World Cup: pitching in Las Vegas on April 21 in front of investors and industry leaders."
              : "Companies that stood out to our team: for the problem they address, or the moment they're in."}
          </p>

          {/* ── Card Grid ── */}
          {(() => {
            const companies = mergeWatchCompanies[watchTab];
            const sectorColorMap: Record<WatchCompany["sector"], string> = { athletes: BRAND.athletes, execs: BRAND.execs, fans: BRAND.fans };
            const sectorLabelMap: Record<WatchCompany["sector"], string> = { athletes: "For Athletes", execs: "For Executives", fans: "For Fans" };
            return (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 20 }}>
                {companies.map((c, idx) => {
                  const sectorColor = sectorColorMap[c.sector];
                  const logoUrl = c.domain ? `https://www.google.com/s2/favicons?sz=128&domain=${c.domain}` : null;
                  const CardWrapper = c.website ? "a" : "div";
                  const cardLinkProps = c.website ? { href: c.website, target: "_blank", rel: "noopener noreferrer" } : {};
                  return (
                    <CardWrapper key={c.name} {...cardLinkProps} className="stx-reveal" style={{
                      background: t.bgCard,
                      border: `1px solid ${t.border}`,
                      borderRadius: 14,
                      padding: 0,
                      display: "flex", flexDirection: "column",
                      overflow: "hidden",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      position: "relative",
                      textDecoration: "none",
                      color: "inherit",
                      cursor: c.website ? "pointer" : "default",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"}, 0 0 0 1px ${sectorColor}33`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* Top accent gradient */}
                      <div style={{ height: 3, background: `linear-gradient(90deg, ${sectorColor}, ${sectorColor}44)` }} />

                      <div style={{ padding: isMobile ? "18px 16px 20px" : "22px 24px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        {/* Header: logo + name + sector tag */}
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
                            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{c.countryFlag} {c.city}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, margin: 0, fontFamily: "'Open Sans',sans-serif" }}>{c.description}</p>

                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            );
          })()}

          {/* Add / Verify Company CTA Banner */}
          <div style={{
            marginTop: 56,
            padding: isMobile ? "32px 20px" : "40px 48px",
            background: isDark ? "#0c0f1a" : BRAND.darkTitle,
            display: "flex", flexDirection: isMobile ? "column" : "row",
            alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 32,
            borderRadius: 12, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${BRAND.pink}, transparent)` }} />
            <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(12,15,26,0.6) 100%)" : "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(45,59,73,0.5) 100%)" }} />
            <div style={{ position: "absolute", top: "-30%", right: "-5%", width: "clamp(200px,30vw,350px)", height: "clamp(200px,30vw,350px)", borderRadius: "50%", border: "2px solid rgba(237,26,94,0.12)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: "-15%", right: "5%", width: "clamp(120px,20vw,220px)", height: "clamp(120px,20vw,220px)", borderRadius: "50%", border: "2px solid rgba(237,26,94,0.2)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, left: "30%", width: 1, height: "140%", background: "linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.1) 50%, transparent 90%)", transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#fff", pointerEvents: "none" }} />
            <img src="/landing/atlas-wordmark-white.svg" alt="SportsTechX Atlas" style={{ width: isMobile ? 120 : 160, opacity: 0.9, position: "relative", zIndex: 1, flexShrink: 0, objectFit: "contain" }} />
            <div style={{ position: "relative", zIndex: 1, textAlign: isMobile ? "center" : "left" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>Is your company on the global sports tech database?</div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: "rgba(255,255,255,0.6)" }}>ADD or VERIFY your company to get discovered by investors, programs, and sports organizations worldwide</div>
            </div>
            <a href="/companies" target="_blank" rel="noopener noreferrer" style={{
              position: "relative", zIndex: 1,
              display: "inline-block", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2,
              color: "#fff", background: BRAND.pink, textDecoration: "none",
              padding: "11px 32px", borderRadius: 50, whiteSpace: "nowrap",
              boxShadow: `0 4px 16px ${BRAND.pink}44`,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${BRAND.pink}55`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${BRAND.pink}44`; }}
            >VERIFY YOUR COMPANY</a>
          </div>

        </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)` }} />

      {/* ── ECOSYSTEM MAP: INVESTORS, INNOVATION & PROGRAMS ──────────────── */}
      <div id="ecomap">
        <Suspense fallback={<div style={{ height: 500, background: t.bgSec, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: t.textMuted, letterSpacing: 2 }}>LOADING ECOSYSTEM MAP…</span></div>}>
          <EcosystemMapSection t={t} isDark={isDark} isMobile={isMobile} />
        </Suspense>
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.pink}55,transparent)`, margin: isMobile ? "24px 0" : "40px 0" }} />

      {/* ── NGSC FEATURED SECTION ────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, transparent, ${BRAND.ngsc}, ${BRAND.ngsc}88, ${BRAND.ngsc}, transparent)`, padding: 2, margin: isMobile ? "0 8px" : "0 20px", borderRadius: 20 }}>
      <div id="ngsc" style={{ background: "#0a0a0a", padding: isMobile ? "28px 16px" : "32px 40px", borderRadius: 18 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* ── Row 1: Header + date inline ── */}
          <div className="stx-reveal" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 16, marginBottom: isMobile ? 20 : 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src="https://newglobalsportconference.com/wp-content/uploads/2025/08/EWCF_V1.0_White-1.svg" alt="Esports World Cup Foundation" style={{ height: isMobile ? 32 : 40, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 26 : 36, lineHeight: 1, color: "#fff", margin: 0 }}>NGSC 2025</h2>
                </div>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 9 : 10, letterSpacing: 2, color: BRAND.ngsc, margin: "2px 0 0", textTransform: "uppercase" }}>23–24 August 2025 · Four Seasons Hotel Riyadh, Saudi Arabia</p>
              </div>
            </div>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <a href="https://newglobalsportconference.com/n9cxy3/" target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: 2, color: "#0a0a0a", background: BRAND.ngsc, padding: "7px 20px", borderRadius: 50, textDecoration: "none", boxShadow: `0 3px 12px ${BRAND.ngsc}55` }}>
                  REGISTER INTEREST
                </a>
                {[
                  { href: "https://newglobalsportconference.com", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
                  { href: "https://www.linkedin.com/company/nextwrldsa/", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                  { href: "https://www.instagram.com/ngsc_sa", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
                  { href: "https://x.com/ngsc_sa", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { href: "https://www.youtube.com/channel/UC-OFimRLY7Jxdn_SvAsCzWg", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                ].map((s, i) => (
                  <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", color: `${BRAND.ngsc}`, textDecoration: "none", border: `1px solid ${BRAND.ngsc}33`, transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${BRAND.ngsc}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Row 2: Images + About (3 columns) ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1.2fr", gap: isMobile ? 16 : 20, marginBottom: isMobile ? 16 : 24 }}>
            {/* Stage photo */}
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${BRAND.ngsc}20`, minHeight: isMobile ? 180 : 340 }}>
              <img
                src="https://newglobalsportconference.com/wp-content/uploads/2025/06/webready-about.webp"
                alt="Panel discussion at NGSC with global sports and esports leaders on stage in Riyadh"
                style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center center" }}
              />
            </div>
            {/* About text */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: BRAND.ngsc, textTransform: "uppercase", margin: "0 0 8px" }}>About the Conference</p>
              <p style={{ fontSize: 12, color: "#c8c8c8", lineHeight: 1.7, margin: "0 0 8px" }}>
                The New Global Sport Conference (NGSC 2025) is the premier global platform for industry leaders at the intersection of gaming, esports and sport , bringing together CEOs, founders and investors to drive groundbreaking initiatives.
              </p>
              <p style={{ fontSize: 12, color: "#c8c8c8", lineHeight: 1.7, margin: "0 0 8px" }}>
                A flagship event of the Esports World Cup Foundation, NGSC is held annually in Riyadh during the closing weekend of the Esports World Cup , the world's largest esports and gaming event.
              </p>
              <p style={{ fontSize: 12, color: "#c8c8c8", lineHeight: 1.7, margin: 0 }}>
                NGSC 2025 official theme, <em style={{ color: "#fff" }}>"The Next Game,"</em> reflects the accelerating convergence of competitive gaming and global sports.
              </p>
            </div>
            {/* Crowd photo */}
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${BRAND.ngsc}20`, minHeight: isMobile ? 180 : 340 }}>
              <img
                src="https://newglobalsportconference.com/wp-content/uploads/2025/06/biggest-global-esport-conference-ngsc-2-e1750325522595.webp"
                alt="Attendees of NGSC sharing a selfie moment during the esports and sports networking session in Riyadh"
                style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center center" }}
              />
            </div>
          </div>

          {/* ── Row 3: Competitive play heading + pillars + program ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 16 : 24, padding: "28px 0 0", borderTop: `1px solid ${BRAND.ngsc}18` }}>
            {/* Left: theme heading */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 26, lineHeight: 1.05, color: "#fff", margin: "0 0 12px" }}>
                TRANSFORMING THE FUTURE OF COMPETITIVE PLAY
              </h3>
              {isMobile && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <a href="https://newglobalsportconference.com/n9cxy3/" target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: 2, color: "#0a0a0a", background: BRAND.ngsc, padding: "7px 20px", borderRadius: 50, textDecoration: "none" }}>
                    REGISTER INTEREST
                  </a>
                  <a href="https://newglobalsportconference.com" target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: BRAND.ngsc, border: `1px solid ${BRAND.ngsc}55`, padding: "7px 14px", borderRadius: 50, textDecoration: "none" }}>
                    WEBSITE
                  </a>
                </div>
              )}
            </div>
            {/* Middle: three pillars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
              {[
                { n: "01", text: "Bringing together the world's most influential voices." },
                { n: "02", text: "Where industries converge to spark dialogue and challenge convention." },
                { n: "03", text: "The leading platform where gaming, esports and sport's future takes shape." },
              ].map(p => (
                <div key={p.n} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: BRAND.ngsc, lineHeight: 1, flexShrink: 0 }}>{p.n}</span>
                  <p style={{ fontSize: 12, color: "#c8c8c8", lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{p.text}</p>
                </div>
              ))}
            </div>
            {/* Right: program highlights */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: BRAND.ngsc, textTransform: "uppercase", margin: "0 0 8px" }}>The Program</p>
              <p style={{ fontSize: 12, color: "#c8c8c8", lineHeight: 1.7, margin: 0 }}>
                The curated program features over 1,500 industry leaders, including HRH Prince Faisal bin Bandar bin Sultan Al Saud, HRH Prince Fahad bin Mansour bin Nasser Al Saud, and representatives from the LA28 Olympic Games, Sony, SEGA, and more. Through keynotes, panels, strategic roundtables and private forums, attendees will define the next stage of industry growth and innovation.
              </p>
            </div>
          </div>

        </div>
      </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right,transparent,${BRAND.ngsc}55,transparent)`, margin: isMobile ? "24px 0" : "40px 0" }} />

      {/* ── FACTS & FIGURES: FUNDING + M&A TABS ─────────────────────────── */}
      <div id="dealflow" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>

          <div className="stx-reveal">
            {sectionLabel("Data in Full")}
            {sectionTitle("THE NUMBERS\nTHAT MATTER")}
            <p style={{ fontSize: 15, color: t.textMuted, lineHeight: 1.7, maxWidth: 600, marginTop: 16 }}>
              The complete dataset behind this year's report: every company, every deal, every number behind the story.
            </p>
          </div>

          {/* ── Tab Switcher ── */}
          <div style={{ display: "flex", marginTop: 40, marginBottom: 56, borderBottom: `2px solid ${t.border}` }}>
            {(["Equity", "Mergers & Acquisitions"] as const).map(tab => {
              const active = (tab === "Equity" && factTab === "funding") || (tab === "Mergers & Acquisitions" && factTab === "ma");
              return (
                <button key={tab}
                  onClick={() => setFactTab(tab === "Equity" ? "funding" : "ma")}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 18px 10px" : "10px 36px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none" }}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* ════════════════════════════════════════
              FUNDING TAB
          ════════════════════════════════════════ */}
          {(isPdf || factTab === "funding") && (
            <div>
              {/* Continent filter */}
              <ContinentFilterBar value={fundingRegion} onChange={setFundingRegion} t={t} label="Filter by continent" />

              {/* CHART-02: Funding By Year */}
              <div className="stx-reveal">
                {fundingHeader("FUNDING BY YEAR")}
                <SourceBadge chartId="CHART-02" source="dm_test · SUM(Round_Amount_USD) GROUP BY Deal_Year · VC_Date 2021–2025" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 40 }}>
                  Peaked at $13.3B in 2021, the all-time high. 2025 marked a decisive return to growth.
                </p>
              </div>
              {data ? <YearBarChart data={data.fundingByYear} t={t} isPdf={isPdf} /> : (
                <div style={{ height: 260, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4 }} />
              )}

              {/* CHART-06: Regional Share */}
              <div style={{ marginTop: 48 }} className="stx-reveal">
                {fundingHeader("REGIONAL SHARE OF GLOBAL DEALFLOW", "clamp(22px,2.8vw,36px)")}
                <SourceBadge chartId="CHART-06" source="dm_test · SUM(Round_Amount_USD) GROUP BY VC_Report_Region" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 20 }}>
                  North America leads on volume, but Europe closed the gap in 2025.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 2, marginTop: 20 }}>
                  {data?.regionSplit.map(r => (
                    <div key={r.region} style={{ background: t.bgCard, padding: "24px 28px", border: `1px solid ${t.border}` }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>{regionLabels[r.region] || r.region}</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: t.titleColor, lineHeight: 1 }}>{fmt(r.total_m)}</div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                        {s ? ((r.total_m / s.total_funding_m) * 100).toFixed(0) : "—"}% global · {r.deals} deals
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHART-03: Top Countries */}
              <div style={{ marginTop: 72 }} className="stx-reveal">
                {fundingHeader("TOP COUNTRIES BY FUNDING")}
                <SourceBadge chartId="CHART-03" source="dm_test · SUM(Round_Amount_USD) GROUP BY Country · VC_Date 2021–2025" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 20 }}>
                  The USA accounts for the majority of capital raised, but the gap to the next tier is narrowing.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "4px 48px" }}>
                  {data?.topCountries.slice(0, 10).map((c, i) => (
                    <ProgressRow key={c.country} t={t} label={c.country} value={fmt(c.total_m)} pct={(c.total_m / totalCountry) * 100} emoji={getCountryFlag(c.country)} delay={i * 70} isPdf={isPdf} />
                  ))}
                </div>
              </div>

              {/* Atlas CTA Banner , same style as ecosystem map */}
              <div style={{
                marginTop: 56, marginBottom: 56,
                padding: isMobile ? "32px 20px" : "40px 48px",
                background: isDark ? "#0c0f1a" : BRAND.darkTitle,
                display: "flex", flexDirection: isMobile ? "column" : "row",
                alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 32,
                borderRadius: 12, position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${BRAND.pink}, transparent)` }} />
                <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(12,15,26,0.6) 100%)" : "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(45,59,73,0.5) 100%)" }} />
                <div style={{ position: "absolute", top: "-30%", right: "-5%", width: "clamp(200px,30vw,350px)", height: "clamp(200px,30vw,350px)", borderRadius: "50%", border: "2px solid rgba(237,26,94,0.12)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "-15%", right: "5%", width: "clamp(120px,20vw,220px)", height: "clamp(120px,20vw,220px)", borderRadius: "50%", border: "2px solid rgba(237,26,94,0.2)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: 0, left: "30%", width: 1, height: "140%", background: "linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.1) 50%, transparent 90%)", transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
                <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#fff", pointerEvents: "none" }} />
                <img src="/landing/atlas-wordmark-white.svg" alt="SportsTechX Atlas" style={{ width: isMobile ? 120 : 160, opacity: 0.9, position: "relative", zIndex: 1, flexShrink: 0, objectFit: "contain" }} />
                <div style={{ position: "relative", zIndex: 1, textAlign: isMobile ? "center" : "left" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>Dive Deeper into the Data</div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: "rgba(255,255,255,0.6)" }}>
                    Interactive charts, custom filters, and real-time analytics across every deal, sector, and region
                  </div>
                </div>
                <a href="/analytics" target="_blank" rel="noopener noreferrer" style={{
                  position: "relative", zIndex: 1,
                  display: "inline-block", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2,
                  color: "#fff", background: BRAND.pink, textDecoration: "none",
                  padding: "11px 32px", borderRadius: 50, whiteSpace: "nowrap",
                  boxShadow: `0 4px 16px ${BRAND.pink}44`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${BRAND.pink}55`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${BRAND.pink}44`; }}
                >OPEN ANALYTICS </a>
              </div>

              {/* CHART-04: Sector Split */}
              <div style={{ marginTop: 72 }} className="stx-reveal">
                {fundingHeader("SECTOR SPLIT BY INVESTMENT")}
                <SourceBadge chartId="CHART-04" source="dm_test · SUM(Round_Amount_USD) GROUP BY Sector → Sub-Sector → Sub-Sub-Sector · VC_Date 2021–2025" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 20 }}>
                  'For Fans' companies attract the most capital by volume, and their share is growing.
                </p>
                {data?.sectorDrilldown && data.sectorDrilldown.length > 0 ? (
                  <Suspense fallback={<div style={{ height: 460, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }} />}>
                    <SectorBubbleChart
                      data={data.sectorDrilldown}
                      theme={{ bg: t.bgSec, text: t.text, textMuted: t.textMuted, border: t.border, bgCard: t.bgCard, titleColor: t.titleColor }}
                      brandColors={{ pink: BRAND.pink, teal: BRAND.teal, tealBright: BRAND.tealBright, navy: BRAND.navy, lightBlue: BRAND.lightBlue, slate: BRAND.slate }}
                      sectorColors={{ "Activity & Performance": BRAND.athletes, "Fans & Content": BRAND.fans, "Management & Organisation": BRAND.execs }}
                      sectorSecondaryColors={{ "Activity & Performance": BRAND.athletesSec, "Fans & Content": BRAND.fansSec, "Management & Organisation": BRAND.execsSec }}
                      sectorLabels={{ "Activity & Performance": "For Athletes", "Fans & Content": "For Fans", "Management & Organisation": "For Executives" }}
                      isPdf={isPdf}
                    />
                  </Suspense>
                ) : (
                  <div style={{ height: 460, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }} />
                )}
              </div>

              {/* CHART-05: Top Funded Companies by Region */}
              <div style={{ marginTop: 72 }} className="stx-reveal">
                {fundingHeader("TOP FUNDED COMPANIES")}
                <SourceBadge chartId="CHART-05" source="dm_test · SUM(Round_Amount_USD) GROUP BY Name, VC_Report_Region · top 5 per region" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 20 }}>
                  The names that defined the 2021–2025 cycle, by region.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 2, marginTop: 24 }}>
                  {["NA","EU","APAC"].map(region => {
                    return (
                      <div key={region} style={{ background: t.bgCard, padding: isMobile ? 16 : 28, border: `1px solid ${t.border}` }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 24, marginBottom: isMobile ? 10 : 16, color: t.titleColor }}>{regionLabels[region]}</div>
                        {(data?.topCompaniesByRegion[region] || []).map((co, i) => {
                          let domain = "";
                          if (co.website) { try { domain = new URL(co.website).hostname.replace(/^www\./, ""); } catch {} }
                          const logoUrl = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
                          const displayName = co.name.replace(/\s*\(formerly [^)]+\)/, "");
                          const logoEl = (
                            <div style={{ width: 26, height: 26, borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                              {logoUrl && <img src={logoUrl} alt="" width={26} height={26} style={{ objectFit: "contain", position: "absolute", top: 0, left: 0, zIndex: 1, background: "#fff", borderRadius: 4 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                              <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.teal, borderRadius: 4, color: "#fff", fontWeight: 700, fontSize: 11, fontFamily: "'Bebas Neue',sans-serif" }}>{displayName.charAt(0)}</div>
                            </div>
                          );
                          return (
                            <div key={co.name} style={{ padding: isMobile ? "10px 0" : "12px 0", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", gap: isMobile ? 8 : 10 }}>
                              <div style={{ marginTop: 2, flexShrink: 0 }}>
                                {co.website ? <a href={co.website} target="_blank" rel="noopener noreferrer">{logoEl}</a> : logoEl}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ color: BRAND.slate, fontFamily: "'DM Mono',monospace", fontSize: 10 }}>#{i + 1}</span>
                                  <span style={{ color: t.text, fontWeight: 600, fontSize: isMobile ? 12 : 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 11 : 12, color: BRAND.pink, fontWeight: 700, flexShrink: 0, marginLeft: "auto" }}>{fmt(co.total_m)}</span>
                                </div>
                                {co.description && (
                                  <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4, marginTop: 3 }}>{co.description}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════
              M&A TAB
          ════════════════════════════════════════ */}
          {(isPdf || factTab === "ma") && (
            <div>
              {/* Acquiree + Acquirer continent filters */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 12 }}>
                <ContinentFilterBar value={maAcquireeRegion} onChange={setMaAcquireeRegion} t={t} label="Acquiree continent" />
                <ContinentFilterBar value={maAcquirerRegion} onChange={setMaAcquirerRegion} t={t} label="Acquirer continent" />
              </div>

              {/* CHART-08: M&A By Year */}
              <div className="stx-reveal">
                {maHeader("M&A BY YEAR")}
                <SourceBadge chartId="CHART-08" source="ma_test_new · SUM(round_amount_usd) GROUP BY acquisition_year · date 2021–2025" />
                <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 40 }}>
                  Deal volume peaked in 2023 at $10.9B across 70 deals, consolidation has accelerated sharply since 2022.
                </p>
              </div>
              {data ? <YearBarChart data={(data.maByYear || []).filter(d => d.year >= 2021 && d.year <= 2025)} t={t} isPdf={isPdf} /> : (
                <div style={{ height: 260, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4 }} />
              )}

              {/* CHART-09: Notable Acquisitions */}
              {(() => {
                const maDeals = maDealsQuery.data?.topMaDeals || [];
                const cols09 = isMobile ? "1fr auto" : "1fr 120px 1fr 120px 70px 100px";
                return (
                  <div style={{ marginTop: 72 }} className="stx-reveal">
                    {maHeader("NOTABLE ACQUISITIONS")}
                    <SourceBadge chartId="CHART-09" source="ma_test_new · WHERE round_amount_usd > 0 · ORDER BY round_amount_usd DESC · date 2021–2025" />
                    <p style={{ fontSize: 14, color: t.textMuted, maxWidth: 580, lineHeight: 1.8, marginBottom: 20 }}>
                      The largest disclosed SportsTech acquisitions of the 2021–2025 cycle, ranked by deal value.
                    </p>
                    <div style={{ marginTop: 24, border: `1px solid ${t.border}`, overflow: "hidden", borderRadius: 4 }}>
                      <div style={{ display: "grid", gridTemplateColumns: cols09, gap: "0 12px", padding: "12px 20px", background: isDark ? "rgba(43,61,143,0.35)" : BRAND.darkTitle, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: BRAND.white, textTransform: "uppercase" }}>
                        <span>Acquiree</span>{!isMobile && <span>Location</span>}{!isMobile && <span>Acquirer</span>}{!isMobile && <span>Location</span>}{!isMobile && <span>Year</span>}<span style={{ textAlign: "right" }}>Value</span>
                      </div>
                      {maDealsQuery.isLoading && (
                        <div style={{ padding: "24px 20px", fontSize: 13, color: t.textMuted, textAlign: "center" }}>Loading…</div>
                      )}
                      {!maDealsQuery.isLoading && maDeals.slice(0, 10).map((d, i) => {
                        const domain = d.acquiree_name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
                        const logoUrl = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
                        const eeFlag = d.acquiree_country ? getCountryFlag(d.acquiree_country) : null;
                        const erFlag = d.acquirer_country ? getCountryFlag(d.acquirer_country) : null;
                        const erDomain = d.acquirer_name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
                        const erLogoUrl = erDomain ? `https://www.google.com/s2/favicons?sz=128&domain=${erDomain}` : null;
                        return (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: cols09, gap: "0 12px", padding: "14px 20px", borderTop: `1px solid ${t.border}`, fontSize: 13, background: i % 2 === 0 ? "transparent" : t.tableRowAlt, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, textDecoration: "none" }}>
                                <div style={{ width: 26, height: 26, borderRadius: 4, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {logoUrl && <img src={logoUrl} alt="" width={26} height={26} style={{ objectFit: "contain", position: "absolute", inset: 0, width: "100%", height: "100%", background: "#fff", borderRadius: 4 }} onError={e => { e.currentTarget.style.display = "none"; }} />}
                                  <div style={{ width: 26, height: 26, background: BRAND.teal, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, fontFamily: "'Bebas Neue',sans-serif" }}>{d.acquiree_name.charAt(0)}</div>
                                </div>
                              </a>
                              <span style={{ color: t.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap" }}>
                                {d.acquiree_name}
                                {isMobile && <span style={{ display: "block", fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, fontWeight: 400 }}>{eeFlag} {d.acquiree_city || d.acquiree_country} · {d.acquirer_name} · {d.acquisition_year}</span>}
                              </span>
                            </div>
                            {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eeFlag && <span style={{ marginRight: 4 }}>{eeFlag}</span>}{d.acquiree_city || d.acquiree_country || "—"}</span>}
                            {!isMobile && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                <a href={`https://${erDomain}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, textDecoration: "none" }}>
                                  <div style={{ width: 26, height: 26, borderRadius: 4, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {erLogoUrl && <img src={erLogoUrl} alt="" width={26} height={26} style={{ objectFit: "contain", position: "absolute", inset: 0, width: "100%", height: "100%", background: "#fff", borderRadius: 4 }} onError={e => { e.currentTarget.style.display = "none"; }} />}
                                    <div style={{ width: 26, height: 26, background: BRAND.slate, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, fontFamily: "'Bebas Neue',sans-serif" }}>{d.acquirer_name.charAt(0)}</div>
                                  </div>
                                </a>
                                <span style={{ color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.acquirer_name}</span>
                              </div>
                            )}
                            {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{erFlag && <span style={{ marginRight: 4 }}>{erFlag}</span>}{d.acquirer_city || d.acquirer_country || "—"}</span>}
                            {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted }}>{d.acquisition_year}</span>}
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 700, textAlign: "right" }}>{fmt(d.amount_m ?? 0)}</span>
                          </div>
                        );
                      })}
                      {!maDealsQuery.isLoading && maDeals.length === 0 && (
                        <div style={{ padding: "24px 20px", fontSize: 13, color: t.textMuted, textAlign: "center" }}>No acquisitions found for the selected period.</div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      </div>

      {/* ── CLOSING QUOTE ───────────────────────────────────────────────── */}
      <div style={{ background: isDark ? BRAND.darkTitle : BRAND.lightBlue, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,4vw,52px)", lineHeight: 1.1, maxWidth: 860, margin: "0 auto 24px", color: isDark ? BRAND.white : BRAND.darkTitle }}>
            The data is clear. Sports technology is not a trend. It is the infrastructure of modern sport.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <a href="https://atlas.sportstechx.com" target="_blank" rel="noopener noreferrer" style={{ lineHeight: 0 }}>
              <img src={isDark ? "/landing/atlas-wordmark-white.svg" : "/landing/atlas-wordmark-dark.svg"} alt="Atlas" style={{ height: isMobile ? 26 : 32, opacity: 0.9 }} />
            </a>
            <cite style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: BRAND.pink, fontStyle: "normal" }}>
              2025
            </cite>
          </div>
        </div>
      </div>

      {/* ── FOOTER (the exact Atlas landing footer) ─────────────────────── */}
      <div className="lp"><LandingFooter /></div>

      </div>
      <style>{`
        html, body { overflow-x: hidden; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(237,26,94,0.3); border-radius: 3px; }
        .stx-trend-card { transition: border-color 0.3s, transform 0.3s; }
      `}</style>
      {/* ── GSTER26 AUTH GATE ─────────────────────────────────────────────── */}
      {isGster26 && !isPdf && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={isAuthenticated ? () => setShowAuthModal(false) : undefined}
          withBlur={true}
        />
      )}
    </div>
  );
}
