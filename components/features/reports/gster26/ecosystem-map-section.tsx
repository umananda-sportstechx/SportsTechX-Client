// @ts-nocheck
/* eslint-disable */
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as topojsonClient from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import staticEcoData from "./data/ecosystem-map-data.json";

/* Analytics are no-ops in the Atlas port (STX Mixpanel hooks not wired here). */
const ecosystemMapContinentClicked = (..._a: unknown[]) => {};
const ecosystemMapTabClicked = (..._a: unknown[]) => {};
const ecosystemMapEntityClicked = (..._a: unknown[]) => {};

/* ─── Types ──────────────────────────────────────────────────────────────── */
type EcoEntity = {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  continent: string | null;
  category: string | null;
  gster26: boolean | string | null;
  founded_year: string | number | null;
};
type EcoData = { investors: EcoEntity[]; initiatives: EcoEntity[]; programs: EcoEntity[] };
type TabKey = "investors" | "initiatives" | "programs";
type Theme = {
  bg: string; bgSec: string; bgCard: string; bgCardHover: string;
  text: string; textSec: string; textMuted: string;
  border: string; titleColor: string; navBg: string;
  divider: string; tableRowAlt: string;
};

/* ─── Brand ──────────────────────────────────────────────────────────────── */
const BRAND = {
  pink: "#ED1A5E", darkTitle: "#2D3B49", peach: "#FDE1D9",
  slate: "#4D5E72", lightBlue: "#BED0E3", teal: "#76ADA7",
  tealBright: "#6A9DA9", navy: "#2B3D8F", white: "#FFFFFF",
};
const TAB_COLORS: Record<TabKey, string> = {
  investors: "#E08B35", initiatives: BRAND.tealBright, programs: BRAND.navy,
};
const TAB_LABELS: Record<TabKey, string> = {
  investors: "Investors", initiatives: "Initiatives", programs: "Programs",
};

/* ─── Map dimensions ─────────────────────────────────────────────────────── */
const W = 900;
const H = 460;

/* ─── Continent definitions ─────────────────────────────────────────────── */
const CONTINENTS = [
  { id: "North America", label: "N. America", center: [-95, 48] as [number, number] },
  { id: "South America", label: "S. America", center: [-58, -15] as [number, number] },
  { id: "Europe",        label: "Europe",     center: [15,  52] as [number, number] },
  { id: "Africa",        label: "Africa",     center: [22,   3] as [number, number] },
  { id: "Asia",          label: "Asia",       center: [90,  40] as [number, number] },
  { id: "Oceania",       label: "Oceania",    center: [135,-25] as [number, number] },
] as const;
type ContinentId = typeof CONTINENTS[number]["id"];

/* ─── Country name → [lon, lat] centroid ────────────────────────────────── */
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "USA": [-95.7, 37.1], "United States": [-95.7, 37.1], "United States of America": [-95.7, 37.1],
  "UK": [-3.4, 55.4], "United Kingdom": [-3.4, 55.4],
  "Germany": [10.4, 51.2], "France": [2.2, 46.2], "Spain": [-3.7, 40.3],
  "Italy": [12.6, 42.8], "Netherlands": [5.3, 52.1], "Belgium": [4.5, 50.5],
  "Switzerland": [8.2, 46.8], "Austria": [14.1, 47.6], "Sweden": [18.6, 60.1],
  "Norway": [8.5, 60.5], "Denmark": [10.0, 56.3], "Finland": [25.7, 64.9],
  "Poland": [19.1, 51.9], "Portugal": [-8.2, 39.6], "Ireland": [-8.2, 53.2],
  "Australia": [133.8, -25.7], "New Zealand": [172.5, -41.5],
  "Canada": [-96.8, 56.0], "Mexico": [-102.6, 23.6],
  "Brazil": [-51.9, -14.2], "Argentina": [-63.6, -38.4], "Colombia": [-74.3, 4.6],
  "Chile": [-71.5, -35.7], "Peru": [-75.0, -9.2], "Ecuador": [-78.2, -1.8],
  "Venezuela": [-66.6, 6.4], "Uruguay": [-56.0, -32.5], "Paraguay": [-58.4, -23.4],
  "China": [104.2, 35.9], "Japan": [138.3, 36.2], "India": [78.9, 20.6],
  "South Korea": [127.8, 36.5], "Singapore": [103.8, 1.4],
  "UAE": [53.8, 23.4], "United Arab Emirates": [53.8, 23.4],
  "Saudi Arabia": [45.1, 24.7], "Israel": [35.0, 31.5], "Turkey": [35.2, 38.9],
  "Qatar": [51.2, 25.4], "Bahrain": [50.6, 26.1], "Kuwait": [47.5, 29.3],
  "Jordan": [37.0, 31.2], "Lebanon": [35.9, 33.9], "Oman": [55.9, 21.5],
  "South Africa": [25.1, -29.0], "Nigeria": [8.7, 9.1], "Kenya": [37.9, 0.0],
  "Egypt": [30.8, 26.8], "Morocco": [-7.1, 31.8], "Ghana": [-1.0, 7.9],
  "Ethiopia": [40.5, 9.1], "Tanzania": [34.9, -6.4], "Tunisia": [9.5, 34.0],
  "Russia": [105.3, 61.5], "Ukraine": [31.2, 49.0], "Greece": [21.8, 39.1],
  "Czech Republic": [15.5, 49.8], "Hungary": [19.5, 47.2], "Romania": [25.0, 45.9],
  "Croatia": [15.2, 45.1], "Serbia": [21.0, 44.0], "Bulgaria": [25.5, 42.7],
  "Slovakia": [19.7, 48.7], "Slovenia": [15.0, 46.1], "Lithuania": [23.9, 55.2],
  "Latvia": [24.6, 57.0], "Estonia": [25.0, 58.6], "Luxembourg": [6.1, 49.8],
  "Iceland": [-18.1, 65.0], "Malta": [14.4, 35.9], "Cyprus": [33.4, 34.9],
  "Belarus": [28.0, 53.5],
  "Thailand": [100.9, 15.9], "Indonesia": [113.9, -0.8], "Malaysia": [109.7, 4.2],
  "Philippines": [122.9, 12.9], "Vietnam": [108.3, 14.1],
  "Pakistan": [69.3, 30.4], "Bangladesh": [90.4, 23.7], "Sri Lanka": [80.7, 7.9],
  "Hong Kong": [114.2, 22.4], "Taiwan": [120.9, 23.7],
  "Costa Rica": [-84.0, 9.7], "Panama": [-80.8, 8.5], "Guatemala": [-90.4, 15.8],
  "Dominican Republic": [-70.2, 18.9], "Jamaica": [-77.3, 18.1],
  "Ivory Coast": [-5.5, 7.5], "Senegal": [-14.4, 14.5],
  "Rwanda": [29.9, -1.9], "Uganda": [32.3, 1.4], "Cameroon": [12.4, 3.9],
};

/* ─── Normalise continent from raw DB string ─────────────────────────────── */
function normalizeContinent(raw: string | null): ContinentId | null {
  if (!raw) return null;
  const l = raw.toLowerCase().trim();
  if (l.includes("north america")) return "North America";
  if (l.includes("south america") || l.includes("latin")) return "South America";
  if (l.includes("europe")) return "Europe";
  if (l.includes("africa")) return "Africa";
  if (l.includes("asia") || l.includes("apac") || l.includes("middle east")) return "Asia";
  if (l.includes("oceania") || l.includes("australia") || l.includes("pacific")) return "Oceania";
  return null;
}

/* ─── Continent count aggregation ───────────────────────────────────────── */
function getContinentCounts(data: EcoData) {
  const out: Record<string, { investors: number; initiatives: number; programs: number }> = {};
  const add = (arr: EcoEntity[], key: TabKey) => {
    for (const e of arr) {
      const c = normalizeContinent(e.continent);
      if (!c) continue;
      if (!out[c]) out[c] = { investors: 0, initiatives: 0, programs: 0 };
      out[c][key]++;
    }
  };
  add(data.investors, "investors");
  add(data.initiatives, "initiatives");
  add(data.programs, "programs");
  return out;
}

/* ─── Country flag emoji ─────────────────────────────────────────────────── */
function countryToFlag(country: string): string {
  const MAP: Record<string, string> = {
    "USA": "US", "United States": "US", "UK": "GB", "United Kingdom": "GB",
    "Germany": "DE", "France": "FR", "Australia": "AU", "India": "IN",
    "China": "CN", "Canada": "CA", "Finland": "FI", "Spain": "ES",
    "Ireland": "IE", "Brazil": "BR", "Netherlands": "NL", "Italy": "IT",
    "Japan": "JP", "South Korea": "KR", "Singapore": "SG", "Israel": "IL",
    "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Switzerland": "CH",
    "Belgium": "BE", "Austria": "AT", "Portugal": "PT", "Poland": "PL",
    "Czech Republic": "CZ", "Romania": "RO", "South Africa": "ZA",
    "Mexico": "MX", "Argentina": "AR", "Chile": "CL", "Colombia": "CO",
    "New Zealand": "NZ", "Thailand": "TH", "Indonesia": "ID", "Malaysia": "MY",
    "Philippines": "PH", "Vietnam": "VN", "Turkey": "TR", "UAE": "AE",
    "United Arab Emirates": "AE", "Saudi Arabia": "SA", "Egypt": "EG",
    "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH", "Russia": "RU",
    "Ukraine": "UA", "Greece": "GR", "Croatia": "HR", "Hungary": "HU",
    "Slovakia": "SK", "Slovenia": "SI", "Lithuania": "LT", "Latvia": "LV",
    "Estonia": "EE", "Luxembourg": "LU", "Iceland": "IS", "Malta": "MT",
    "Cyprus": "CY", "Bulgaria": "BG", "Serbia": "RS", "Taiwan": "TW",
    "Hong Kong": "HK", "Bahrain": "BH", "Qatar": "QA", "Kuwait": "KW",
    "Oman": "OM", "Jordan": "JO", "Lebanon": "LB", "Morocco": "MA",
    "Tunisia": "TN", "Pakistan": "PK", "Bangladesh": "BD", "Sri Lanka": "LK",
    "Peru": "PE", "Uruguay": "UY", "Ecuador": "EC", "Costa Rica": "CR",
    "Panama": "PA", "Rwanda": "RW", "Ethiopia": "ET", "Tanzania": "TZ",
    "Jamaica": "JM", "Dominican Republic": "DO", "Cameroon": "CM",
    "Ivory Coast": "CI", "Senegal": "SN", "Uganda": "UG",
  };
  const code = MAP[country];
  if (!code) return "🌍";
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}


/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EcosystemMapSection({
  t, isDark, isMobile = false,
  eyebrow = "Ecosystem",
  title = "THE GLOBAL\nECOSYSTEM MAP",
  intro,
}: {
  t: Theme; isDark: boolean; isMobile?: boolean;
  /* Optional label overrides so other reports can frame the same map in their own context */
  eyebrow?: string; title?: string; intro?: string;
}) {
  const data: EcoData = staticEcoData as EcoData;

  /* ── Map state ── */
  const [countryPaths, setCountryPaths] = useState<{ id: string; d: string }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const projRef = useRef<((c: [number, number]) => [number, number] | null) | null>(null);

  /* ── Interaction state ── */
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("investors");
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [showEcoBackToTop, setShowEcoBackToTop] = useState(false);
  const [showAllTooltip, setShowAllTooltip] = useState(false);

  /* ── Reset tab when continent changes — pick first tab that has entities ── */
  useEffect(() => {
    if (selectedContinent && data) {
      const first = (["investors", "initiatives", "programs"] as TabKey[]).find(
        key => data[key].filter(e => normalizeContinent(e.continent) === selectedContinent).length > 0
      );
      setActiveTab(first || "investors");
    }
  }, [selectedContinent, data]);

  /* ── Show back-to-top when map scrolls out of view while exploring panel is open ── */
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      setShowEcoBackToTop(!entry.isIntersecting && !!selectedContinent);
    }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [selectedContinent]);

  /* ── Load world topojson ── */
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then((world: any) => {
        const countries = topojsonClient.feature(world, world.objects.countries) as any;
        const proj = geoNaturalEarth1().scale(W / 6.28).translate([W / 2, H / 2]);
        const pathFn = geoPath().projection(proj);
        setCountryPaths(countries.features.map((f: any) => ({
          id: String(f.id),
          d: pathFn(f) || "",
        })));
        projRef.current = (coords: [number, number]) => {
          const result = proj(coords);
          return result ? [result[0], result[1]] : null;
        };
        setMapReady(true);
      })
      .catch(() => setMapReady(true));
  }, []);


  /* ── Continent bubble centers projected ── */
  const continentCenters = useMemo(() => {
    if (!mapReady || !projRef.current) return {};
    const proj = projRef.current;
    const out: Record<string, { x: number; y: number }> = {};
    for (const c of CONTINENTS) {
      const pt = proj(c.center);
      if (pt) out[c.id] = { x: pt[0], y: pt[1] };
    }
    return out;
  }, [mapReady]);

  /* ── Continent counts ── */
  const contCounts = useMemo(() => data ? getContinentCounts(data) : {}, [data]);
  const maxTotal = useMemo(() => {
    let m = 1;
    for (const c of Object.values(contCounts)) {
      const t = c.investors + c.initiatives + c.programs;
      if (t > m) m = t;
    }
    return m;
  }, [contCounts]);

  /* ── Filtered entities for detail panel ── */
  const filteredEntities = useMemo(() => {
    if (!data || !selectedContinent) return [];
    return data[activeTab]
      .filter(e => normalizeContinent(e.continent) === selectedContinent)
      .filter(e => String(e.gster26).toUpperCase() === "TRUE");
  }, [data, selectedContinent, activeTab]);

  /* ── Group entities by category ── */
  /* ── Group entities by category, sort each group by continent/country/city ── */
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, EcoEntity[]> = {};
    for (const e of filteredEntities) {
      const cat = e.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    }
    const cmp = (a: string | null, b: string | null) => (a || "").localeCompare(b || "");
    for (const arr of Object.values(groups)) {
      arr.sort((a, b) => cmp(a.continent, b.continent) || cmp(a.country, b.country) || cmp(a.city, b.city));
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredEntities]);

  /* ── Scroll panel into view ── */
  useEffect(() => {
    if (selectedContinent && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [selectedContinent]);

  /* ── Pie segment helper ── */
  const renderPie = useCallback((cx: number, cy: number, r: number, counts: { investors: number; initiatives: number; programs: number }) => {
    const total = counts.investors + counts.initiatives + counts.programs;
    if (total === 0) return null;
    const segs = ([
      { key: "investors" as TabKey, v: counts.investors },
      { key: "initiatives" as TabKey, v: counts.initiatives },
      { key: "programs" as TabKey, v: counts.programs },
    ]).filter(s => s.v > 0);

    if (segs.length === 1) {
      return (
        <circle cx={cx} cy={cy} r={r} fill={TAB_COLORS[segs[0].key]} opacity={0.9} />
      );
    }
    let start = -Math.PI / 2;
    return segs.map(seg => {
      const angle = (seg.v / total) * 2 * Math.PI;
      const end = start + angle;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
      const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z`;
      start = end;
      return <path key={seg.key} d={d} fill={TAB_COLORS[seg.key]} opacity={0.9} />;
    });
  }, []);

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div style={{ padding: isMobile ? "48px 0" : "88px 0", background: t.bgSec }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>

        {/* Header */}
        <div className="stx-reveal" style={{ display: "flex", alignItems: isMobile ? "flex-start" : "flex-start", justifyContent: "space-between", gap: isMobile ? 24 : 40, flexDirection: isMobile ? "column" : "row", marginBottom: 28 }}>
          <div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: BRAND.pink, textTransform: "uppercase", marginBottom: 14 }}>
              {eyebrow}
            </p>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(42px,6vw,88px)", lineHeight: 0.92, color: t.titleColor, whiteSpace: "pre-line", margin: 0 }}>
              {title}
            </h2>
          </div>

          <div style={{ maxWidth: isMobile ? "100%" : 420, flexShrink: 0, paddingTop: isMobile ? 0 : 28 }}>
            <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.8, margin: "0 0 16px 0" }}>
              {intro ?? <>{data ? `${data.investors.length} investors, ${data.initiatives.length} initiatives, and ${data.programs.length} programs` : "Investors, initiatives, and programs"} across every major region. Select a continent to explore the organisations driving sports technology forward.</>}
            </p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              {(["investors", "initiatives", "programs"] as TabKey[]).map(key => {
                const total = data ? data[key].length : 0;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TAB_COLORS[key] }} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>
                      {TAB_LABELS[key]}
                    </span>
                    {total > 0 && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: TAB_COLORS[key], background: `${TAB_COLORS[key]}15`, padding: "1px 7px", borderRadius: 8 }}>
                        {total}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* ── MAP ── */}
        <div ref={mapRef} className="stx-reveal" style={{ position: "relative", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
          {!mapReady && (
            <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, letterSpacing: 3 }}>LOADING MAP…</span>
            </div>
          )}

          {mapReady && (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", position: "relative", zIndex: 1 }}>
              <defs>
                <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor={isDark ? "#0e1624" : "#e8f0f8"} />
                  <stop offset="100%" stopColor={isDark ? "#060d18" : "#d5e4f0"} />
                </radialGradient>
              </defs>

              {/* Ocean background */}
              <rect width={W} height={H} fill="url(#oceanGrad)" />

              {/* Country shapes */}
              {countryPaths.map(cp => (
                <path
                  key={cp.id}
                  d={cp.d}
                  fill={isDark ? "rgba(75,100,130,0.45)" : "rgba(160,185,210,0.55)"}
                  stroke={isDark ? "rgba(190,208,227,0.18)" : "rgba(100,130,160,0.25)"}
                  strokeWidth={0.4}
                />
              ))}

              {/* Continent interactive bubbles */}
              {CONTINENTS.map(cont => {
                const center = continentCenters[cont.id];
                if (!center) return null;
                const counts = contCounts[cont.id] || { investors: 0, initiatives: 0, programs: 0 };
                const total = counts.investors + counts.initiatives + counts.programs;
                const isSelected = selectedContinent === cont.id;
                const isHovered = hoveredContinent === cont.id;
                const r = total > 0 ? Math.max(16, 16 + (total / maxTotal) * 20) : 14;

                return (
                  <g
                    key={cont.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => { if (!isSelected) ecosystemMapContinentClicked(cont.id); setSelectedContinent(isSelected ? null : cont.id); }}
                    onMouseEnter={() => setHoveredContinent(cont.id)}
                    onMouseLeave={() => setHoveredContinent(null)}
                  >
                    {/* Pulse ring */}
                    {total > 0 && (
                      <circle cx={center.x} cy={center.y} r={r + 6}
                        fill="none"
                        stroke={isSelected ? BRAND.pink : isHovered ? BRAND.tealBright : "rgba(255,255,255,0.15)"}
                        strokeWidth={isSelected || isHovered ? 1.5 : 1}
                        style={{ transition: "all 0.3s" }}
                      >
                        {!isSelected && (
                          <>
                            <animate attributeName="r" values={`${r+4};${r+10};${r+4}`} dur="3s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                          </>
                        )}
                      </circle>
                    )}

                    {/* Backdrop circle */}
                    <circle
                      cx={center.x} cy={center.y} r={r + 2}
                      fill={isSelected ? `${BRAND.pink}22` : isHovered ? `${BRAND.tealBright}15` : "rgba(0,0,0,0.18)"}
                      stroke={isSelected ? BRAND.pink : isHovered ? BRAND.tealBright : "rgba(255,255,255,0.3)"}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ transition: "all 0.25s" }}
                    />

                    {/* Pie segments or placeholder */}
                    {total > 0
                      ? renderPie(center.x, center.y, r, counts)
                      : <circle cx={center.x} cy={center.y} r={r} fill="rgba(255,255,255,0.06)" />
                    }

                    {/* Count label */}
                    {total > 0 && (
                      <text x={center.x} y={center.y + 4} textAnchor="middle"
                        style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: Math.max(10, r * 0.7), fill: "#fff", pointerEvents: "none" }}>
                        {total}
                      </text>
                    )}

                    {/* Continent name label */}
                    <text x={center.x} y={center.y + r + 14} textAnchor="middle"
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 8, letterSpacing: 1.5,
                        fill: isSelected ? BRAND.pink : isHovered ? BRAND.tealBright : isDark ? "rgba(190,208,227,0.6)" : "rgba(45,59,73,0.65)",
                        textTransform: "uppercase" as const,
                        transition: "fill 0.25s",
                        pointerEvents: "none",
                        textShadow: isDark ? "0 1px 3px rgba(0,0,0,0.9)" : "0 1px 2px rgba(255,255,255,0.8)",
                      }}>
                      {cont.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Click prompt — shown when no region is selected or hovered */}
          <div style={{
            position: "absolute", top: "50%", left: isMobile ? 12 : 28, transform: "translateY(-50%)",
            background: isDark ? "rgba(10,14,26,0.85)" : "rgba(255,255,255,0.9)",
            border: `1px solid ${BRAND.pink}30`, borderRadius: 8,
            padding: isMobile ? "12px 14px" : "16px 20px",
            backdropFilter: "blur(8px)", zIndex: 10,
            maxWidth: isMobile ? 130 : 160,
            opacity: !isMobile && !selectedContinent && !hoveredContinent ? 1 : 0,
            pointerEvents: !selectedContinent && !hoveredContinent ? "auto" as const : "none" as const,
            transition: "opacity 0.3s ease",
          }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 14 : 16, color: t.titleColor, lineHeight: 1.2, marginBottom: 6 }}>
              Explore by Region
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMuted, lineHeight: 1.5, letterSpacing: 0.3 }}>
              Select a continent to explore investors, initiatives and programs by region.
            </div>
          </div>

          {/* Hover tooltip */}
          <div style={{
            position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
            background: isDark ? "rgba(10,14,26,0.95)" : "rgba(255,255,255,0.97)",
            border: `1px solid ${BRAND.pink}44`, borderRadius: 6, padding: "10px 20px",
            display: "flex", gap: 18, alignItems: "center",
            backdropFilter: "blur(10px)", zIndex: 10, whiteSpace: "nowrap",
            opacity: hoveredContinent && !selectedContinent && contCounts[hoveredContinent] ? 1 : 0,
            pointerEvents: "none" as const,
            transition: "opacity 0.2s ease",
          }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, color: t.titleColor }}>
              {hoveredContinent || ""}
            </span>
            {(["investors", "initiatives", "programs"] as TabKey[]).map(key => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: TAB_COLORS[key] }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>
                  {hoveredContinent ? (contCounts[hoveredContinent]?.[key] || 0) : 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width CTA banner — Explore Atlas */}
        <div style={{
          marginTop: 28,
          padding: isMobile ? "32px 20px" : "40px 48px",
          background: isDark ? "#0c0f1a" : BRAND.darkTitle,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 32,
          borderRadius: 12, position: "relative", overflow: "hidden",
        }}>
          {/* Hero-style decorative elements */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${BRAND.pink}, transparent)` }} />
          <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(12,15,26,0.6) 100%)" : "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(45,59,73,0.5) 100%)" }} />
          <div style={{ position: "absolute", top: "-30%", right: "-5%", width: "clamp(200px,30vw,350px)", height: "clamp(200px,30vw,350px)", borderRadius: "50%", border: `2px solid rgba(237,26,94,0.12)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-15%", right: "5%", width: "clamp(120px,20vw,220px)", height: "clamp(120px,20vw,220px)", borderRadius: "50%", border: `2px solid rgba(237,26,94,0.2)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: "30%", width: 1, height: "140%", background: `linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.1) 50%, transparent 90%)`, transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#fff", pointerEvents: "none" }} />
          <img src="/atlas-wordmark.png" alt="SportsTechX Atlas" style={{ width: isMobile ? 120 : 160, opacity: 0.9, position: "relative", zIndex: 1, flexShrink: 0, objectFit: "contain" }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: isMobile ? "center" : "left" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>Discover the Full Ecosystem</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 10 : 11, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>
              1,000+ investors, accelerators, and innovation programs on Atlas
            </div>
          </div>
          <a href="https://atlas.sportstechx.com/investors" target="_blank" rel="noopener noreferrer" style={{
            position: "relative", zIndex: 1,
            display: "inline-block", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2,
            color: "#fff", background: BRAND.pink, textDecoration: "none",
            padding: "11px 32px", borderRadius: 50, whiteSpace: "nowrap",
            boxShadow: `0 4px 16px ${BRAND.pink}44`,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${BRAND.pink}55`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${BRAND.pink}44`; }}
          >EXPLORE ATLAS </a>
        </div>

        {/* ── CONTINENT DETAIL PANEL ── */}
        {selectedContinent && data && (
          <div ref={panelRef} style={{
            marginTop: 24,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 8, overflow: "hidden",
            animation: "fadeIn 0.4s ease-out",
          }}>
            {/* Panel header */}
            <div style={{
              padding: isMobile ? "20px 16px 0" : "28px 32px 0",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              flexWrap: "wrap", gap: 16,
              background: isDark ? `${BRAND.navy}12` : `${BRAND.lightBlue}30`,
              borderBottom: `1px solid ${t.border}`,
            }}>
              <div style={{ paddingBottom: 24 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: BRAND.pink, textTransform: "uppercase", marginBottom: 8 }}>
                  Exploring
                </p>
                <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,4vw,52px)", lineHeight: 0.95, color: t.titleColor, margin: 0 }}>
                  {selectedContinent.toUpperCase()}
                </h3>
                {/* Summary counts + Limited/All pill */}
                <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                  {(["investors", "initiatives", "programs"] as TabKey[]).map(key => {
                    const count = data[key].filter(e => normalizeContinent(e.continent) === selectedContinent).length;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: TAB_COLORS[key] }} />
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                          {count} {TAB_LABELS[key]}
                        </span>
                      </div>
                    );
                  })}

                  {/* Limited / All filter pill */}
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <div style={{ display: "inline-flex", background: isDark ? "rgba(255,255,255,0.06)" : t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                      <button style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "4px 13px", borderRadius: 14, border: "none", cursor: "default",
                        background: BRAND.pink, color: "#fff", fontWeight: 700,
                        transition: "all 0.18s", outline: "none",
                      }}>
                        LIMITED
                      </button>
                      <button
                        onMouseEnter={() => setShowAllTooltip(true)}
                        onMouseLeave={() => setShowAllTooltip(false)}
                        onClick={() => setShowAllTooltip(prev => !prev)}
                        style={{
                          fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                          padding: "4px 13px", borderRadius: 14, border: "none", cursor: "pointer",
                          background: "transparent", color: t.textMuted, fontWeight: 400,
                          transition: "all 0.18s", outline: "none",
                          display: "flex", alignItems: "center", gap: 4,
                          opacity: 0.6,
                        }}>
                        ALL <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                    </div>
                    {showAllTooltip && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 8px)", left: 0,
                        background: isDark ? "rgba(10,14,26,0.95)" : "rgba(45,59,73,0.95)",
                        color: "#fff", fontFamily: "'DM Mono',monospace", fontSize: 10, lineHeight: 1.5,
                        padding: "10px 14px", borderRadius: 8, zIndex: 20,
                        backdropFilter: "blur(8px)", border: `1px solid ${BRAND.pink}30`,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                        width: 260,
                      }}>
                        View all 1,000+ investors, accelerators & programs on Atlas
                        <div style={{
                          position: "absolute", top: -5, left: 24, transform: "rotate(45deg)",
                          width: 10, height: 10,
                          background: isDark ? "rgba(10,14,26,0.95)" : "rgba(45,59,73,0.95)",
                          borderTop: `1px solid ${BRAND.pink}30`, borderLeft: `1px solid ${BRAND.pink}30`,
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedContinent(null)} style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2,
                padding: "8px 18px", border: `1px solid ${t.border}`, borderRadius: 4,
                background: "transparent", color: t.textMuted, cursor: "pointer",
                transition: "all 0.2s", textTransform: "uppercase", marginTop: 4,
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BRAND.pink; (e.currentTarget as HTMLElement).style.color = BRAND.pink; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
              >
                ✕ Close
              </button>
            </div>

            {/* Tabs + Hub link */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 16px" : "0 32px", borderBottom: `2px solid ${t.border}`, background: t.bgCard, overflowX: "auto", gap: 12 }}>
              <div style={{ display: "flex" }}>
                {(["investors", "initiatives", "programs"] as TabKey[]).filter(tab =>
                  data[tab].filter(e => normalizeContinent(e.continent) === selectedContinent).length > 0
                ).map(tab => {
                  const active = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => { ecosystemMapTabClicked(tab, selectedContinent); setActiveTab(tab); }} style={{
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 16 : 20, letterSpacing: 2,
                      padding: isMobile ? "10px 14px 13px" : "14px 28px 17px", background: "none", border: "none",
                      borderBottom: active ? `3px solid ${TAB_COLORS[tab]}` : "3px solid transparent",
                      color: active ? TAB_COLORS[tab] : t.textMuted,
                      cursor: "pointer", transition: "color 0.2s, border-color 0.2s",
                      marginBottom: -2, outline: "none",
                    }}>
                      {TAB_LABELS[tab]}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${BRAND.pink}40`, borderLeft: `3px solid ${BRAND.pink}`, background: isDark ? "rgba(237,26,94,0.08)" : "rgba(237,26,94,0.04)" }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMuted, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                  Launched 2025/2026
                </span>
              </div>
            </div>

            {/* Entity grid grouped by category */}
            <div style={{ padding: isMobile ? "12px 12px 20px" : "20px 28px 28px" }}>
              {filteredEntities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: t.textMuted, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
                  NO {TAB_LABELS[activeTab].toUpperCase()} FOUND
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {groupedByCategory.map(([category, entities]) => {
                    const accentColor = TAB_COLORS[activeTab];
                    return (
                      <div key={category}>
                        {/* Category header */}
                        <div style={{
                          fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 16 : 18,
                          color: accentColor, letterSpacing: 1, marginBottom: 10,
                          borderBottom: `1.5px solid ${accentColor}30`, paddingBottom: 6,
                        }}>
                          {category}
                        </div>
                        {/* Cards grid */}
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                          {entities.map((entity, i) => {
                            const href = entity.website ? (entity.website.startsWith("http") ? entity.website : `https://${entity.website}`) : undefined;
                            const domain = entity.website ? entity.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null;
                            const logoUrl = domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
                            const CardTag = href ? "a" : "div";
                            const yr = Number(entity.founded_year);
                            const isNew = yr === 2025 || yr === 2026;
                            const newBg = isDark ? "rgba(237,26,94,0.08)" : "rgba(237,26,94,0.04)";
                            const defaultBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)";
                            return (
                              <CardTag key={`${entity.name}-${i}`}
                                {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                                onClick={() => ecosystemMapEntityClicked(entity.name, activeTab, selectedContinent, category)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "8px 10px",
                                  background: isNew ? newBg : defaultBg,
                                  borderRadius: 6,
                                  border: `1px solid ${isNew ? `${BRAND.pink}40` : t.border}`,
                                  borderLeft: isNew ? `3px solid ${BRAND.pink}` : `1px solid ${isNew ? `${BRAND.pink}40` : t.border}`,
                                  transition: "border-color 0.2s, background 0.2s",
                                  textDecoration: "none", color: "inherit", cursor: href ? "pointer" : "default",
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}50`; (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.06)" : `${accentColor}08`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isNew ? `${BRAND.pink}40` : t.border; (e.currentTarget as HTMLElement).style.borderLeftColor = isNew ? BRAND.pink : (isNew ? `${BRAND.pink}40` : t.border); (e.currentTarget as HTMLElement).style.background = isNew ? newBg : defaultBg; }}
                              >
                                {/* Logo */}
                                <div style={{
                                  width: 30, height: 30, borderRadius: 4, flexShrink: 0,
                                  background: isDark ? "rgba(255,255,255,0.08)" : "#fff",
                                  border: `1px solid ${t.border}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  overflow: "hidden",
                                }}>
                                  {logoUrl ? (
                                    <img src={logoUrl} alt="" width={22} height={22} style={{ objectFit: "contain" }}
                                      onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; const sib = img.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }}
                                    />
                                  ) : null}
                                  <span style={{
                                    display: logoUrl ? "none" : "flex",
                                    alignItems: "center", justifyContent: "center",
                                    width: "100%", height: "100%",
                                    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: accentColor,
                                  }}>
                                    {(entity.name || "?").charAt(0)}
                                  </span>
                                </div>

                                {/* Name + Location */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: t.titleColor,
                                    lineHeight: 1.2,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {entity.name}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                                    <span style={{ fontSize: 10, lineHeight: 1 }}>{countryToFlag(entity.country || "")}</span>
                                    <span style={{
                                      fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMuted,
                                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                      {entity.city || entity.country || ""}
                                    </span>
                                  </div>
                                </div>
                              </CardTag>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredEntities.length > 0 && data && (
                <div style={{ marginTop: 16, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>
                    {filteredEntities.length}/{data[activeTab].filter(e => normalizeContinent(e.continent) === selectedContinent).length} {TAB_LABELS[activeTab].toUpperCase()}
                  </span>
                  <span style={{ color: t.textMuted, fontSize: 10 }}>·</span>
                  <a href="https://atlas.sportstechx.com/investors" target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, letterSpacing: 0.5,
                    textDecoration: "none", transition: "opacity 0.2s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    View all on Atlas →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      {/* Back to top button */}
      <button
        onClick={() => {
          mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        style={{
          position: "fixed", bottom: isMobile ? 20 : 32, right: isMobile ? 20 : 32, zIndex: 140,
          background: BRAND.pink, color: "#fff", border: "none", borderRadius: 50,
          padding: isMobile ? "10px 16px" : "10px 20px",
          fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
          cursor: "pointer", boxShadow: `0 4px 20px rgba(237,26,94,0.4)`,
          opacity: showEcoBackToTop ? 1 : 0, pointerEvents: showEcoBackToTop ? "auto" : "none",
          transform: showEcoBackToTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>↑</span> BACK TO MAP
      </button>
    </div>
  );
}
