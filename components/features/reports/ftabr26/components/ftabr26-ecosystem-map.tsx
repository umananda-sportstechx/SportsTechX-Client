// @ts-nocheck
/* eslint-disable */
"use client";
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 — the football innovation ecosystem map.

   The gster26 map (client/src/components/ecosystem-map-section.tsx) drawn with
   football's two lists: initiatives and accelerators. Same
   projection, same six continent bubbles, same two-list pie sizing, so this and
   the static image in client/public/reports/ftabr26 (built by
   scripts/build-ftabr26-map.mjs, which the PDF and the social cards use) are
   the same map in two media.

   It renders no list of its own. Selecting a continent hands the id back to
   the report, which filters the ecosystem tables underneath — the football
   report already tabs those lists, so a second panel would say the same
   thing twice.
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as topojsonClient from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { BRAND, type Theme } from "../lib/report-theme";
import {
  FTABR26_CONTINENTS, FTABR26_ECO_TYPES, ftabr26MapData,
  type Ftabr26ContinentCounts, type Ftabr26ContinentId, type Ftabr26EcoType,
  type Ftabr26EcosystemEntry,
} from "../lib/ftabr26-ecosystem";

/* Match the two ecosystem lists published in the football report. */
export const FTABR26_ECO_COLORS: Record<Ftabr26EcoType, string> = {
  initiatives: BRAND.tealBright,
  programs: BRAND.navy,
};

/* "Accelerators", not "Programs" — the report's own word for the tab. */
const TYPE_LABELS: Record<Ftabr26EcoType, string> = {
  initiatives: "Initiatives",
  programs: "Accelerators",
};

/* Viewbox, not pixels: the svg scales to its column. */
const W = 900;
const H = 460;

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type EcoLists = {
  initiatives: Ftabr26EcosystemEntry[];
  programs: Ftabr26EcosystemEntry[];
};

export default function Ftabr26EcosystemMap({
  t, isDark, isMobile = false, eco, selected, onSelect,
}: {
  t: Theme;
  isDark: boolean;
  isMobile?: boolean;
  /** The same rows the tables below list, so the tallies always agree. */
  eco: EcoLists;
  selected: Ftabr26ContinentId | null;
  /** Called with null when the reader clears the selection. */
  onSelect: (continent: Ftabr26ContinentId | null) => void;
}) {
  const [countryPaths, setCountryPaths] = useState<{ id: string; d: string }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [hovered, setHovered] = useState<Ftabr26ContinentId | null>(null);
  const projRef = useRef<((c: [number, number]) => [number, number] | null) | null>(null);

  /* ── World geometry ──────────────────────────────────────────────────────
     Same CDN and projection as the gster26 map. A failed fetch still flips
     mapReady: the bubbles carry the numbers, the land is the backdrop. */
  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_URL)
      .then(r => r.json())
      .then((world: any) => {
        if (cancelled) return;
        const countries = topojsonClient.feature(world, world.objects.countries) as any;
        const proj = geoNaturalEarth1().scale(W / 6.28).translate([W / 2, H / 2]);
        const pathFn = geoPath().projection(proj);
        /* Keyed by position, not by feature id: a few features in the
           world-atlas topology carry no id, which collapses them onto one
           React key and drops land from the map. */
        setCountryPaths(countries.features.map((f: any, i: number) => ({ id: `${f.id ?? "x"}-${i}`, d: pathFn(f) || "" })));
        projRef.current = (coords: [number, number]) => {
          const pt = proj(coords);
          return pt ? [pt[0], pt[1]] : null;
        };
        setMapReady(true);
      })
      .catch(() => { if (!cancelled) setMapReady(true); });
    return () => { cancelled = true; };
  }, []);

  const { counts, unplaced, plotted } = useMemo(() => ftabr26MapData(eco), [eco]);

  const centers = useMemo(() => {
    if (!mapReady || !projRef.current) return {} as Record<string, { x: number; y: number }>;
    const proj = projRef.current;
    const out: Record<string, { x: number; y: number }> = {};
    for (const c of FTABR26_CONTINENTS) {
      const pt = proj(c.center as unknown as [number, number]);
      if (pt) out[c.id] = { x: pt[0], y: pt[1] };
    }
    return out;
  }, [mapReady]);

  const totalOf = (c: Ftabr26ContinentCounts) => c.initiatives + c.programs;
  const maxTotal = useMemo(
    () => Math.max(1, ...FTABR26_CONTINENTS.map(c => totalOf(counts[c.id]))),
    [counts],
  );

  /* Pie slices, radius-first — identical arc maths to the gster26 map and to
     the static build script, so a bubble looks the same in all three. */
  const renderPie = useCallback((cx: number, cy: number, r: number, c: Ftabr26ContinentCounts) => {
    const segs = FTABR26_ECO_TYPES.map(key => ({ key, v: c[key] })).filter(s => s.v > 0);
    const total = segs.reduce((n, s) => n + s.v, 0);
    if (total === 0) return null;
    if (segs.length === 1) {
      return <circle cx={cx} cy={cy} r={r} fill={FTABR26_ECO_COLORS[segs[0].key]} opacity={0.9} />;
    }
    let start = -Math.PI / 2;
    return segs.map(seg => {
      const angle = (seg.v / total) * 2 * Math.PI;
      const end = start + angle;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z`;
      start = end;
      return <path key={seg.key} d={d} fill={FTABR26_ECO_COLORS[seg.key]} opacity={0.9} />;
    });
  }, []);

  /* Nothing placeable: the committed fallback lists carry a city but no
     country, so an API outage leaves the map with no bubbles to draw. Better
     to stand down and let the tables carry the section. */
  if (plotted === 0) return null;

  const unplacedTotal = unplaced.initiatives + unplaced.programs;
  const accent = (id: Ftabr26ContinentId) =>
    selected === id ? BRAND.pink : hovered === id ? BRAND.green : null;

  return (
    <div className="stx-reveal" style={{ marginTop: 40 }}>

      {/* Legend — totals across the whole map, in the colours the pies use */}
      <div style={{ display: "flex", gap: isMobile ? 14 : 22, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {FTABR26_ECO_TYPES.map(key => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: FTABR26_ECO_COLORS[key] }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>
              {TYPE_LABELS[key]}
            </span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: FTABR26_ECO_COLORS[key], background: `${FTABR26_ECO_COLORS[key]}15`, padding: "1px 7px", borderRadius: 8 }}>
              {eco[key].length}
            </span>
          </div>
        ))}
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>
          {selected ? "Selected. The tables below show this region." : "Select a continent to filter the tables below."}
        </span>
      </div>

      {/* ── MAP ── */}
      <div style={{ position: "relative", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
        {!mapReady && (
          <div style={{ height: isMobile ? 220 : H, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, letterSpacing: 3 }}>LOADING MAP…</span>
          </div>
        )}

        {mapReady && (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", position: "relative", zIndex: 1 }}>
            <defs>
              <radialGradient id="ftEcoOcean" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor={isDark ? "#0e1624" : "#e8f0f8"} />
                <stop offset="100%" stopColor={isDark ? "#060d18" : "#d5e4f0"} />
              </radialGradient>
            </defs>

            <rect width={W} height={H} fill="url(#ftEcoOcean)" />

            {countryPaths.map(cp => (
              <path key={cp.id} d={cp.d}
                fill={isDark ? "rgba(75,100,130,0.45)" : "rgba(160,185,210,0.55)"}
                stroke={isDark ? "rgba(190,208,227,0.18)" : "rgba(100,130,160,0.25)"}
                strokeWidth={0.4} />
            ))}

            {FTABR26_CONTINENTS.map(cont => {
              const center = centers[cont.id];
              if (!center) return null;
              const c = counts[cont.id];
              const total = totalOf(c);
              const isSelected = selected === cont.id;
              const isHovered = hovered === cont.id;
              const r = total > 0 ? Math.max(16, 16 + (total / maxTotal) * 20) : 14;
              const live = accent(cont.id);
              /* An empty continent is drawn but inert — the reader can see the
                 region has nothing rather than wondering if a click failed. */
              const clickable = total > 0;

              return (
                <g key={cont.id}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-pressed={clickable ? isSelected : undefined}
                  aria-label={clickable ? `${cont.id}: ${total} entries` : undefined}
                  style={{ cursor: clickable ? "pointer" : "default", outline: "none" }}
                  onClick={() => clickable && onSelect(isSelected ? null : cont.id)}
                  onKeyDown={e => {
                    if (!clickable || (e.key !== "Enter" && e.key !== " ")) return;
                    e.preventDefault();
                    onSelect(isSelected ? null : cont.id);
                  }}
                  onMouseEnter={() => setHovered(cont.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(cont.id)}
                  onBlur={() => setHovered(null)}
                >
                  {/* Pulse ring — rests once the bubble is selected */}
                  {total > 0 && (
                    <circle cx={center.x} cy={center.y} r={r + 6} fill="none"
                      stroke={live ?? "rgba(255,255,255,0.15)"}
                      strokeWidth={live ? 1.5 : 1}
                      style={{ transition: "all 0.3s" }}>
                      {!isSelected && (
                        <>
                          <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                        </>
                      )}
                    </circle>
                  )}

                  <circle cx={center.x} cy={center.y} r={r + 2}
                    fill={isSelected ? `${BRAND.pink}22` : isHovered ? `${BRAND.green}1F` : "rgba(0,0,0,0.18)"}
                    stroke={live ?? "rgba(255,255,255,0.3)"}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ transition: "all 0.25s" }} />

                  {total > 0
                    ? renderPie(center.x, center.y, r, c)
                    : <circle cx={center.x} cy={center.y} r={r} fill="rgba(255,255,255,0.06)" />}

                  {total > 0 && (
                    <text x={center.x} y={center.y + 4} textAnchor="middle"
                      style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: Math.max(10, r * 0.7), fill: "#fff", pointerEvents: "none" }}>
                      {total}
                    </text>
                  )}

                  <text x={center.x} y={center.y + r + 14} textAnchor="middle"
                    style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1.5,
                      fill: live ?? (isDark ? "rgba(190,208,227,0.6)" : "rgba(45,59,73,0.65)"),
                      textTransform: "uppercase", transition: "fill 0.25s", pointerEvents: "none",
                      textShadow: isDark ? "0 1px 3px rgba(0,0,0,0.9)" : "0 1px 2px rgba(255,255,255,0.8)",
                    }}>
                    {cont.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Prompt — stands down as soon as the reader engages with the map */}
        <div style={{
          position: "absolute", top: "50%", left: isMobile ? 12 : 28, transform: "translateY(-50%)",
          background: isDark ? "rgba(10,14,26,0.85)" : "rgba(255,255,255,0.9)",
          border: `1px solid ${BRAND.pink}30`, borderRadius: 8,
          padding: isMobile ? "12px 14px" : "16px 20px",
          backdropFilter: "blur(8px)", zIndex: 10, maxWidth: isMobile ? 130 : 170,
          opacity: !isMobile && mapReady && !selected && !hovered ? 1 : 0,
          pointerEvents: "none", transition: "opacity 0.3s ease",
        }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 14 : 16, color: t.titleColor, lineHeight: 1.2, marginBottom: 6 }}>
            Explore by Region
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.textMuted, lineHeight: 1.5, letterSpacing: 0.3 }}>
            Select a continent to filter the initiatives and accelerators below.
          </div>
        </div>

        {/* Hover readout — the three counts behind the pie */}
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          background: isDark ? "rgba(10,14,26,0.95)" : "rgba(255,255,255,0.97)",
          border: `1px solid ${BRAND.pink}44`, borderRadius: 6, padding: "10px 20px",
          display: "flex", gap: 18, alignItems: "center",
          backdropFilter: "blur(10px)", zIndex: 10, whiteSpace: "nowrap",
          opacity: hovered ? 1 : 0, pointerEvents: "none", transition: "opacity 0.2s ease",
        }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, color: t.titleColor }}>
            {hovered ?? ""}
          </span>
          {FTABR26_ECO_TYPES.map(key => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: FTABR26_ECO_COLORS[key] }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted }}>
                {hovered ? counts[hovered][key] : 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Anything the master tables leave unplaceable is named here rather than
          quietly missing from the totals — the same note the static map carries. */}
      {unplacedTotal > 0 && (
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, letterSpacing: 0.5, margin: "10px 0 0" }}>
          {plotted} of {plotted + unplacedTotal} entries mapped · {unplacedTotal} without a location, listed in the tables below.
        </p>
      )}
    </div>
  );
}
