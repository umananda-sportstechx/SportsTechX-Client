// @ts-nocheck
/* eslint-disable */
import React from "react";
import { BRAND, type Theme } from "../lib/report-theme";
import { ecoHref, ecoLogoUrl } from "../lib/ftabr26-ecosystem";
import type { Ftabr26McoClub, Ftabr26McoGroup } from "../data/ftabr26-content-data";

/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 — multi-club ownership panel for the women's football feature.

   Echoes p21 of the source report: one row per ownership group, the owner on
   the left, a dotted connector running right, and the crests of the clubs it
   owns sitting on that connector at fixed, aligned columns.

   Crests come from a local file where one is supplied, otherwise logo.dev via
   `ecoLogoUrl`, which returns null when the token is unset or a club has no
   verified domain — so every tile renders both an <img> and a monogram <span>
   and swaps to the monogram on error, as the ecosystem tables do.
   ──────────────────────────────────────────────────────────────────────── */

const PITCH = BRAND.green;

type Props = {
  groups: Ftabr26McoGroup[];
  t: Theme;
  isDark: boolean;
  isMobile: boolean;
  width: number;
  titleCol: string;
  /** Smaller tiles and tighter spacing, for when the panel sits in a
      half-width column beside copy rather than across the full page. */
  dense?: boolean;
};

/** "FC Rosengård" → "R", "London City Lionesses" → "LC", "OL Lyonnes" → "OL".
    Only the generic club-type words are stripped; OL and HB are part of the
    name people recognise. */
function monogram(name: string): string {
  const words = name.replace(/\b(FC|AFC|SC|HSC)\b/gi, " ").split(/\s+/).filter(Boolean);
  const src = words.length > 0 ? words : name.split(/\s+/).filter(Boolean);
  return src.slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

function LogoTile({ name, website, size, round, t, crest, invertOnDark, isDark }: {
  name: string; website: string | null; size: number; round: boolean; t: Theme;
  /** A local crest file wins over the logo.dev lookup. */
  crest?: string;
  invertOnDark?: boolean;
  isDark?: boolean;
}) {
  const logoUrl = crest ?? ecoLogoUrl(website, 128);
  const img = Math.round(size * 0.68);
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      borderRadius: round ? "50%" : 12,
      /* Opaque on purpose — the dotted connector runs underneath. */
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {logoUrl && (
        <img src={logoUrl} alt="" width={img} height={img} loading="lazy"
          style={{ objectFit: "contain", filter: invertOnDark && isDark ? "invert(1)" : undefined }}
          onError={e => {
            const el = e.currentTarget; el.style.display = "none";
            const sib = el.nextElementSibling as HTMLElement | null;
            if (sib) sib.style.display = "flex";
          }} />
      )}
      <span style={{
        display: logoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%",
        fontFamily: "'Bebas Neue',sans-serif", fontSize: Math.round(size * 0.34),
        letterSpacing: 0.5, color: PITCH,
      }}>{monogram(name)}</span>
    </div>
  );
}

export function Ftabr26McoPanel({ groups, t, isDark, isMobile, width, titleCol, dense = false }: Props) {
  const compact = !isMobile && (dense || width < 1100);

  const TILE    = dense ? (isMobile ? 38 : 36) : isMobile || compact ? 44 : 54;
  const CELL    = dense ? 76 : compact ? 112 : 150;
  const GAP     = dense ? 8 : isMobile ? 12 : compact ? 14 : 20;
  const OWNER_W = dense ? 118 : compact ? 150 : 200;
  const ROW_GAP = dense ? 12 : compact ? 18 : 28;
  const ROW_PAD = dense ? 12 : 22;

  /* Widest row drives the column count, so adding a fifth club needs no
     change here. */
  const maxClubs = Math.max(...groups.map(g => g.clubs.length), 1);

  /* Faint but legible in both themes — t.border sits at 0.10/0.12 alpha and
     vanishes once it is broken into dots. */
  const dashCol = isDark ? "rgba(190,208,227,0.34)" : "rgba(45,59,73,0.26)";
  const dashes = `repeating-linear-gradient(to right, ${dashCol} 0 3px, transparent 3px 9px)`;

  const clubCell = (c: Ftabr26McoClub) => {
    const href = ecoHref(c.website);
    const inner = (
      <>
        <LogoTile name={c.name} website={c.website} size={TILE} round t={t}
          crest={c.crest} invertOnDark={c.crestInvertOnDark} isDark={isDark} />
        <span style={{
          marginTop: dense ? 5 : 8, fontSize: dense ? 9.5 : 10.5, lineHeight: 1.3, textAlign: "center",
          color: t.textMuted, hyphens: "auto",
        }}>{c.name}</span>
      </>
    );
    const cellStyle: React.CSSProperties = {
      position: "relative", zIndex: 1,
      display: "flex", flexDirection: "column", alignItems: "center",
      textDecoration: "none", color: "inherit",
    };
    return href
      ? <a key={c.name} href={href} target="_blank" rel="noopener noreferrer" style={cellStyle}>{inner}</a>
      : <div key={c.name} style={cellStyle}>{inner}</div>;
  };

  return (
    <div className="stx-reveal" style={{
      marginTop: dense ? 0 : 40, background: t.bgSec, border: `1px solid ${t.border}`,
      borderRadius: dense ? 12 : 16,
      padding: isMobile ? "20px 16px" : dense ? "18px 18px" : "30px 32px",
      /* The #trends container clips overflow, so scroll inside it instead. */
      overflowX: "auto",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : dense ? 12 : 26 }}>
        {groups.map((g, i) => {
          const ownerHref = ecoHref(g.website);
          const ownerName = (
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif", fontSize: dense ? 15 : compact ? 17 : 19,
                letterSpacing: 0.6, color: titleCol, lineHeight: 1.05,
              }}>{g.name}</div>
              {g.principal && (
                <div style={{ fontSize: 10.5, lineHeight: 1.4, color: t.textMuted, marginTop: 3 }}>{g.principal}</div>
              )}
            </div>
          );
          const linkedName = ownerHref
            ? <a href={ownerHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>{ownerName}</a>
            : ownerName;

          /* Mobile: owner header over a fluid crest grid, no connector — a
             rule under a stacked owner reads as a stray divider, so the card
             border does the grouping instead. */
          if (isMobile) {
            return (
              <div key={g.name} style={{
                background: t.bgCard, border: `1px solid ${t.border}`, borderLeft: `3px solid ${PITCH}`,
                borderRadius: 12, padding: "14px 14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <LogoTile name={g.name} website={g.website} size={TILE} round={false} t={t} />
                  {linkedName}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: GAP }}>
                  {g.clubs.map(clubCell)}
                </div>
              </div>
            );
          }

          return (
            <div key={g.name} style={{
              display: "grid", gridTemplateColumns: `${OWNER_W}px 1fr`, columnGap: ROW_GAP,
              alignItems: "start",
              paddingTop: i === 0 ? 0 : ROW_PAD,
              borderTop: i === 0 ? "none" : `1px solid ${t.border}`,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: dense ? 6 : 10 }}>
                <LogoTile name={g.name} website={g.website} size={TILE} round={false} t={t} />
                {linkedName}
              </div>

              <div style={{
                position: "relative",
                display: "grid", gridTemplateColumns: `repeat(${maxClubs}, ${CELL}px)`,
                columnGap: GAP, justifyContent: "start", alignItems: "start",
              }}>
                {/* Reaches back under the owner column and stops dead at the
                    centre of this row's last crest, as the source page does. */}
                <span aria-hidden style={{
                  position: "absolute", top: TILE / 2, left: -ROW_GAP,
                  width: ROW_GAP + (g.clubs.length - 1) * (CELL + GAP) + CELL / 2,
                  height: 1, background: dashes, zIndex: 0, pointerEvents: "none",
                }} />
                {g.clubs.map(clubCell)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
