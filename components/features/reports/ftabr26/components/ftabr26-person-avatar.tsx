// @ts-nocheck
/* eslint-disable */
"use client";
import React, { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   Circular headshot for the FTABR26 innovator and playmaker rosters.

   Photos live under client/public/reports/ftabr26/ and are wired into
   `photoUrl` by scripts/sync-ftabr26-photos.mjs. Anyone without one — a
   cohort member whose headshot never arrived — falls back to initials, and so
   does anyone whose asset 404s at runtime, so a stale data file can never
   render a broken-image icon.

   `variant` keeps the two call sites looking exactly as they did before this
   component existed: the web report uses a gradient fill, the print stylesheet
   a flat one.
   ──────────────────────────────────────────────────────────────────────── */

type Props = {
  name: string;
  color: string;
  size: number;
  photoUrl?: string;
  variant?: "web" | "pdf";
  /** Ring thickness. The default reproduces the flat pre-existing look. */
  ringWidth?: number;
  /** Gap between ring and photo — set for the roster's haloed treatment. */
  ringGap?: number;
  /** Coloured halo behind the ring. */
  glow?: boolean;
  /** Badge pinned to the bottom-right of the ring, e.g. a country flag. */
  badge?: React.ReactNode;
};

export function Ftabr26PersonAvatar({
  name, color, size, photoUrl, variant = "web",
  ringWidth = 2, ringGap = 0, glow = false, badge,
}: Props) {
  const [failed, setFailed] = useState(false);

  /* With no gap, glow or badge the ring is drawn on the image itself and the
     component renders exactly as it did before those options existed. */
  const plain = ringGap === 0 && !glow && !badge;
  const inner = plain ? size : size - 2 * (ringWidth + ringGap);

  const face = photoUrl && !failed ? (
    <img
      src={photoUrl}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        width: inner, height: inner, flexShrink: 0,
        borderRadius: "50%", objectFit: "cover",
        /* Sources are framed head-and-shoulders, so anchor the crop to the
           top — centring cuts foreheads on the taller ones. */
        objectPosition: "top",
        border: plain ? `${ringWidth}px solid ${color}` : "none",
        display: "block",
      }}
    />
  ) : (
    <div style={{
      width: inner, height: inner, borderRadius: "50%", flexShrink: 0,
      background: variant === "pdf" ? `${color}1f` : `linear-gradient(135deg,${color}33,${color}11)`,
      border: plain ? `${ringWidth}px solid ${color}` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Bebas Neue',sans-serif", fontSize: inner * (variant === "pdf" ? 0.4 : 0.38),
      color,
      ...(variant === "pdf" ? {} : { letterSpacing: 1 }),
    }}>{name.split(/\s+/).slice(0, 2).map(p => p[0] ?? "").join("").toUpperCase()}</div>
  );

  if (plain) return face;

  return (
    <div style={{ position: "relative", flexShrink: 0, lineHeight: 0 }}>
      <div data-ring="" style={{
        width: size, height: size, borderRadius: "50%", boxSizing: "border-box",
        border: `${ringWidth}px solid ${color}`, padding: ringGap,
        boxShadow: glow ? `0 0 18px ${color}44` : undefined,
        transition: glow ? "box-shadow 0.2s, transform 0.2s" : undefined,
      }}>{face}</div>
      {badge && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: Math.round(size * 0.26), height: Math.round(size * 0.26),
          borderRadius: "50%", background: "var(--stx-badge-bg, #fff)",
          border: "2px solid var(--stx-badge-bg, #fff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.round(size * 0.14), lineHeight: 1,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>{badge}</div>
      )}
    </div>
  );
}
