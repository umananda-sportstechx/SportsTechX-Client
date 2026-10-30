// @ts-nocheck
/* eslint-disable */
"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BRAND, type Theme } from "../lib/report-theme";
import { Ftabr26PersonAvatar } from "./ftabr26-person-avatar";

/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 — the slide-over a roster tile opens.

   Ported from the GSTER26 report's innovator panel, whose treatment this
   follows: a dimmed page, a panel in from the right, the person's ringed
   photo with a country-flag badge, then whatever the caller passes as the
   body — interview answers for innovators, a company profile for Playmakers.

   The original is inline in that page and skips role/Escape/focus/scroll
   handling; those are added here rather than transcribed, since the panel
   this replaces on ftabr26 already had some of them.

   Scroll locking is the caller's job: this page drives scrolling through
   Lenis, which a `body { overflow: hidden }` would not stop. The panel's own
   body opts out of Lenis so it still scrolls while the page is frozen.
   ──────────────────────────────────────────────────────────────────────── */

type Props = {
  name: string;
  photoUrl?: string;
  /** Ring and accent colour — continent for innovators, region for Playmakers. */
  accent: string;
  /** Flag badge on the avatar; the page resolves this from the country. */
  flag?: React.ReactNode;
  /** Line under the name, in the accent colour. */
  subtitle?: React.ReactNode;
  linkedin?: string;
  /** Small label in the header bar, e.g. "FTABR 2026". */
  reportLabel: string;
  onClose: () => void;
  t: Theme;
  isDark: boolean;
  isMobile: boolean;
  children: React.ReactNode;
};

const TITLE_ID = "ftabr26-drawer-title";

export function Ftabr26PersonDrawer({
  name, photoUrl, accent, flag, subtitle, linkedin, reportLabel,
  onClose, t, isDark, isMobile, children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Focus moves into the panel so the keyboard lands on what just opened;
     whoever opened it restores focus on the way out. */
  useEffect(() => { panelRef.current?.focus({ preventScroll: true }); }, [name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hairline = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return createPortal(
    <>
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 8999,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
      }} />

      <div
        ref={panelRef}
        className="animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: isMobile ? "100%" : 480, zIndex: 9000,
          background: isDark
            ? "linear-gradient(135deg, #0c0f1a 0%, #111827 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: `-8px 0 40px rgba(0,0,0,0.3), 0 0 0 1px ${hairline}`,
          borderLeft: `1px solid ${hairline}`,
          display: "flex", flexDirection: "column", outline: "none",
        }}>

        <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${BRAND.pink}, ${accent}, ${BRAND.pink}88)` }} />

        {/* Header bar: wordmark, rule, report label, close */}
        <div style={{
          flexShrink: 0, padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          borderBottom: `1px solid ${hairline}`,
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2, color: BRAND.pink, flexShrink: 0 }}>SportsTechX</div>
            <div style={{ height: 3, flex: 1, borderRadius: 2, background: `linear-gradient(90deg, ${BRAND.pink}44, ${accent}44, transparent)` }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{reportLabel}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: chipBg, border: `1px solid ${hairline}`, cursor: "pointer",
              color: t.textMuted, fontSize: 14, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = chipBg; }}
          >✕</button>
        </div>

        {/* data-lenis-prevent: the page stops Lenis while the drawer is open,
            and a stopped Lenis cancels every wheel event — this one included —
            unless the target opts out. overscroll-behavior keeps a scroll that
            hits the end from chaining to the page. */}
        <div data-lenis-prevent style={{ flex: 1, overflowY: "auto", minHeight: 0, overscrollBehavior: "contain" }}>
          <div style={{
            padding: isMobile ? "20px 16px" : "24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            /* The flag badge reads as a cut-out of the panel behind it. */
            ["--stx-badge-bg" as any]: isDark ? "#1a1f2e" : "#fff",
          }}>
            <Ftabr26PersonAvatar
              name={name} photoUrl={photoUrl} color={accent} size={100}
              ringWidth={3} ringGap={3} glow badge={flag} />

            <div style={{ textAlign: "center", minWidth: 0 }}>
              <h3 id={TITLE_ID} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: t.text, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{name}</h3>
              {subtitle && (
                <p style={{ fontSize: 12, fontWeight: 600, color: accent, margin: "6px 0 12px" }}>{subtitle}</p>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn`}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#0A66C2", color: "#fff", textDecoration: "none",
                    fontSize: 14, fontWeight: 700,
                  }}>in</a>
              )}
            </div>
          </div>

          <div style={{ margin: "0 24px", height: 1, background: `linear-gradient(90deg, ${accent}33, ${hairline}, transparent)` }} />

          <div style={{ padding: "20px 24px 24px" }}>{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}
