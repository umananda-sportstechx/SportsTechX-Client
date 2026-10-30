"use client";
/* ---------------------------------------------------------------------------
   SportsTechX — Sports Tech VC Deal Sourcing Benchmark 2026 (ported from the
   STX web app's public report). Atlas port: the shared report header
   (../report-nav) replaces the floating section rail, the Atlas landing footer
   replaces the STX legal strip, and the report document is read from
   reports.content (the bundled JSON is the fallback).

   Self-contained: the data, images and PDF are imported from this folder, the
   styles are scoped under .stx-report (public-report.css), and light/dark is
   held on this component's own root rather than on <html>, so it neither needs
   nor disturbs the host app's theming. Needs only react and lucide-react, in a
   Vite project (asset imports and `?url`).

   Content is text-identical to the published PDF
   (assets/sports-tech-vc-deal-sourcing-benchmark-2026.pdf); do not hand-edit
   the copy in data/public-report.json.
   --------------------------------------------------------------------------- */

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReveal } from "./use-reveal";
import reportJson from "./data/public-report.json";
import { ReportNav } from "../report-nav";
import { DARK as NAV_DARK, LIGHT as NAV_LIGHT } from "../ftabr26/lib/report-theme";
import { LandingFooter } from "@/components/landing/landing-footer";
import "@/components/landing/landing.css";
import "./public-report.css";

type NavSection = { id: string; n: string; title: string };
const contributorsUrl = "/reports/benchmark26/contributors.webp";
// The published PDF, in Supabase storage (public_bucket) like the other reports' PDFs.
const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/public_bucket/reports/VCDSB26.pdf?download=VCDSB26.pdf`;

/* ------------------------------------------------------------ types
   Mirrors the `stx.public-report/1` JSON in data/public-report.json. Change
   the shape there, change it here. */

interface Stat { value: string; label: string; key: string }

interface ChannelRow {
  id: string; label: string; closed_deals: number; closed_deals_pct: number;
  quality_mean: number; quality_raters: number;
}
interface FundsRow { label: string; funds: number; funds_pct: number }
interface StackRow { answer: string; label: string; funds: number; no_platform: number; uses_platform: number }

type Chart =
  | { id: string; type: "bar+rating"; title: string; subtitle: string; basis: string; rows: ChannelRow[] }
  | { id: string; type: "bar"; title: string; subtitle: string; basis: string; rows: FundsRow[] }
  | { id: string; type: "dots"; title: string; subtitle: string; basis: string; dots_per_row: number; rows: FundsRow[] }
  | { id: string; type: "stacked-bar"; title: string; subtitle: string; basis: string; series: string[]; rows: StackRow[] };

interface Section {
  id: string; number: number; heading: string; subtitle: string; intro: string;
  stats: Stat[]; charts: Chart[]; takeaways: string[];
}

export interface PublicReportData {
  schema: string;
  meta: {
    id: string; edition: number; title: string; subtitle: string; kind: string;
    published: string; fieldwork: string; publisher: string;
    funds: number; deals_traced: number; footer: string;
  };
  intro: {
    heading: string; subtitle: string; body: string[];
    contributors: { named: number; confidential: number };
  };
  sections: Section[];
  closing: {
    heading: string; subtitle: string; intro: string;
    points: { title: string; body: string }[];
    cta: { title: string; body: string; email: string; url: string };
  };
  methodology: {
    heading: string; subtitle: string; intro: string;
    blocks: { title: string; body: string }[];
    note: { title: string; body: string };
  };
}

/* JSON imports widen string literals (chart `type`) to string, so the bundled
   data is asserted to the declared shape here, once. */
const REPORT = reportJson as unknown as PublicReportData;

/* ----------------------------------------------------------- theme

   Dark by default, as the report was designed. The choice is remembered under
   the same `stx-theme` key the SportsTechX benchmark viewer uses. */
const THEME_KEY = "stx-theme";

function useReportTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) !== "light";
    } catch {
      return true;
    }
  });
  const toggle = useCallback(() => {
    setDark((d) => {
      try {
        localStorage.setItem(THEME_KEY, d ? "light" : "dark");
      } catch {
        /* the choice just does not survive a reload */
      }
      return !d;
    });
  }, []);
  return { dark, toggle };
}

/* ------------------------------------------------------------ copy */

/* The PDF sets the tail of every heading in pink, and where the tail starts is
   an editorial choice the JSON does not record — so it lives here. */
const ACCENT: Record<string, string> = {
  "why-now": "and why now",
  "deal-sourcing-reality": "come from",
  "sourcing-process": "process",
  "outbound-and-tools": "find deals",
  closing: "for investors",
  method: "data notes",
};

/* The four sections that carry findings are numbered, as a fund snapshot's
   sections are; the opening and the method notes frame them and are not. The
   rail uses the same numbers, and leaves the framing rows blank. */
const SECTION_NO: Record<string, string> = {
  "deal-sourcing-reality": "01",
  "sourcing-process": "02",
  "outbound-and-tools": "03",
  closing: "04",
};

const NAV: NavSection[] = [
  { id: "why-now", n: "", title: "Why now" },
  { id: "deal-sourcing-reality", n: "01", title: "Deal sources" },
  { id: "sourcing-process", n: "02", title: "Process" },
  { id: "outbound-and-tools", n: "03", title: "Outbound" },
  { id: "closing", n: "04", title: "Implications" },
  { id: "method", n: "", title: "Method" },
];

/* "2026-09" → "September 2026"; "2026-04/2026-07" → "April to July 2026". */
const month = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
const year = (ym: string) => ym.slice(0, 4);

function fieldworkSpan(range: string) {
  const [from, to] = range.split("/");
  return year(from) === year(to)
    ? `${month(from)} to ${month(to)} ${year(to)}`
    : `${month(from)} ${year(from)} to ${month(to)} ${year(to)}`;
}

function Accented({ text, tail }: { text: string; tail?: string }) {
  const at = tail ? text.toLowerCase().lastIndexOf(tail.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<span className="pub-pink">{text.slice(at)}</span></>;
}

/* Bars scale to the largest row, with a sliver kept for any non-zero value so
   a 2% channel still reads as "something". */
const share = (v: number, max: number) => (max > 0 ? Math.max((v / max) * 100, v > 0 ? 1.2 : 0) : 0);

/* ------------------------------------------------------------ layout */

function PubSection({
  id, heading, subtitle, intro, children,
}: { id: string; heading: string; subtitle: string; intro: string; children: ReactNode }) {
  return (
    <section className="pub-section" id={id} aria-labelledby={`${id}-title`}>
      {/* Number (findings sections only), heading, and the rule under both. */}
      <div className="pub-head">
        {SECTION_NO[id] && <span className="pub-no">{SECTION_NO[id]}</span>}
        <h2 className="pub-h2" id={`${id}-title`}><Accented text={heading} tail={ACCENT[id]} /></h2>
      </div>
      <p className="pub-sub">{subtitle}</p>
      <p className="lead pub-lead">{intro}</p>
      {children}
    </section>
  );
}

/* The method notes are reference material, so they stay shut until asked for,
   as the fund snapshots' appendix does. The heading
   row is the control; the subtitle and intro stay visible beneath it. Arriving
   at #method (the rail's own link, or a shared URL) counts as asking. */
function CollapsibleSection({
  id, heading, subtitle, intro, children,
}: { id: string; heading: string; subtitle: string; intro: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => window.location.hash === `#${id}`);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);

  return (
    <section className="pub-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="pub-head">
        <h2 className="pub-h2 pub-h2-toggle" id={`${id}-title`}>
          <button
            type="button"
            className="pub-toggle"
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={() => setOpen((v) => !v)}
            data-testid={`button-${id}-toggle`}
          >
            <span><Accented text={heading} tail={ACCENT[id]} /></span>
            <span className="appx-cue">
              {open ? "Hide" : "Show"}
              <ChevronDown className="appx-caret" size={15} aria-hidden="true" />
            </span>
          </button>
        </h2>
      </div>
      <p className="pub-sub">{subtitle}</p>
      <p className="lead pub-lead">{intro}</p>
      <div className="pub-collapse" id={`${id}-body`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

function Stats({ items }: { items: Stat[] }) {
  return (
    <dl className="pub-stats">
      {items.map((s) => (
        <div className="pub-stat" key={s.key}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChartCard({ chart, children }: { chart: Chart; children: ReactNode }) {
  return (
    <figure className="pub-card" id={`chart-${chart.id}`}>
      <figcaption>
        <h3 className="pub-h3">{chart.title}</h3>
        <p className="pub-meta">{chart.subtitle}</p>
      </figcaption>
      {children}
    </figure>
  );
}

function Takeaways({ items }: { items: string[] }) {
  return (
    <div className="pub-takes">
      <h3 className="pub-h3">Key takeaways</h3>
      <ol>
        {items.map((t, i) => (
          <li key={i}><span className="pub-take-n" aria-hidden="true">{i + 1}</span><p>{t}</p></li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------ charts */

function Rating({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <span className="pub-rating" role="img" aria-label={`Quality ${value.toFixed(1)} out of 5`}>
      <b>{value.toFixed(1)}</b>
      <span className="pub-pips" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < filled ? "on" : ""} />)}
      </span>
    </span>
  );
}

function ChannelChart({ rows, deals }: { rows: ChannelRow[]; deals: number }) {
  const { ref, seen } = useReveal<HTMLDivElement>();
  const max = Math.max(...rows.map((r) => r.closed_deals_pct));
  return (
    <div className="pub-rows pub-channels" ref={ref}>
      <div className="pub-row pub-colhead" aria-hidden="true">
        <span />
        <span>Share of closed deals</span>
        <span>Quality</span>
      </div>
      {rows.map((r) => (
        <div
          className="pub-row"
          key={r.id}
          title={`${r.closed_deals} of ${deals} closed deals · rated by ${r.quality_raters} funds`}
        >
          <span className="pub-label">{r.label}</span>
          <span className="pub-track">
            <i style={{ width: seen ? `${share(r.closed_deals_pct, max)}%` : 0 }} />
            <b>{r.closed_deals_pct}%</b>
          </span>
          <Rating value={r.quality_mean} />
        </div>
      ))}
    </div>
  );
}

function ShareChart({ rows, funds }: { rows: FundsRow[]; funds: number }) {
  const { ref, seen } = useReveal<HTMLDivElement>();
  const max = Math.max(...rows.map((r) => r.funds_pct));
  return (
    <div className="pub-rows" ref={ref}>
      {rows.map((r) => (
        <div className="pub-row pub-row-2" key={r.label} title={`${r.funds} of ${funds} funds`}>
          <span className="pub-label">{r.label}</span>
          <span className="pub-track">
            <i style={{ width: seen ? `${share(r.funds_pct, max)}%` : 0 }} />
            <b>{r.funds_pct}%</b>
          </span>
        </div>
      ))}
    </div>
  );
}

function DotChart({ rows, per }: { rows: FundsRow[]; per: number }) {
  const { ref, seen } = useReveal<HTMLDivElement>();
  return (
    <div className="pub-rows" ref={ref}>
      {rows.map((r) => (
        <div className="pub-row pub-row-2" key={r.label}>
          <span className="pub-label">{r.label}</span>
          <span className="pub-dotrow" role="img" aria-label={`${r.funds} of ${per} funds`}>
            <b aria-hidden="true">{r.funds}</b>
            <span className="pub-dots" aria-hidden="true">
              {Array.from({ length: per }, (_, i) => (
                <i
                  key={i}
                  className={seen && i < r.funds ? "on" : ""}
                  style={{ transitionDelay: `${i * 18}ms` }}
                />
              ))}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

const SERIES: Record<string, string> = {
  no_platform: "No data platform",
  uses_platform: "Uses a data platform",
};

function StackChart({ rows, series }: { rows: StackRow[]; series: string[] }) {
  const { ref, seen } = useReveal<HTMLDivElement>();
  const max = Math.max(...rows.map((r) => r.funds));
  return (
    <>
      <div className="pub-rows pub-stack" ref={ref}>
        {rows.map((r) => (
          <div className="pub-row pub-row-2" key={r.answer}>
            <span className="pub-label">
              {r.label}
              <small>{r.funds} funds</small>
            </span>
            <span className="pub-segs" style={{ width: seen ? `${(r.funds / max) * 100}%` : 0 }}>
              {series.map((k, i) => {
                const v = r[k as "no_platform" | "uses_platform"];
                return v > 0 && (
                  <i key={k} className={`s${i}`} style={{ flexGrow: v }} title={`${SERIES[k]}: ${v}`}>
                    <span className="sr-only">{SERIES[k]}: </span>{v}
                  </i>
                );
              })}
            </span>
          </div>
        ))}
      </div>
      <div className="pub-key" aria-hidden="true">
        {series.map((k, i) => <span key={k}><i className={`s${i}`} />{SERIES[k] ?? k}</span>)}
      </div>
    </>
  );
}

/* The PDF prints the five challenges that more than one fund named; the three
   below them are single write-in answers. */
const CHALLENGES_SHOWN = 5;

function ChartFor({ chart, meta }: { chart: Chart; meta: PublicReportData["meta"] }) {
  switch (chart.type) {
    case "bar+rating": return <ChannelChart rows={chart.rows} deals={meta.deals_traced} />;
    case "bar": return (
      <ShareChart
        rows={chart.id === "challenges" ? chart.rows.slice(0, CHALLENGES_SHOWN) : chart.rows}
        funds={meta.funds}
      />
    );
    case "dots": return <DotChart rows={chart.rows} per={chart.dots_per_row} />;
    case "stacked-bar": return <StackChart rows={chart.rows} series={chart.series} />;
  }
}

/* -------------------------------------------------------------- page */

export default function PublicReport({ data = REPORT }: { data?: PublicReportData }) {
  const { meta, intro, sections, closing, methodology } = data;
  const { dark, toggle } = useReportTheme();
  const pdfName = `SportsTechX — ${meta.title}.pdf`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  /* The section in view, for the header's active link (as the STX section rail did). */
  // The last section whose top has passed a line 30% down the viewport; none above the first.
  const [active, setActive] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let idx = 0;
      NAV.forEach((n, i) => { const el = document.getElementById(n.id); if (el && el.getBoundingClientRect().top <= line) idx = i + 1; });
      setActive(idx);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const site = closing.cta.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className={`stx-report${dark ? " dark" : ""}`}>
      <header className="pub-cover">
        <div className="wrap pub-cover-in">
          <div>
            <div className="pub-eyebrow">October 2026</div>
            <div className="pub-rule" aria-hidden="true" />
            <h1 className="pub-h1">
              <Accented text={meta.title} tail={`Benchmark ${meta.edition}`} />
            </h1>
            <p className="pub-cover-sub">{meta.subtitle}</p>
          </div>
          <div className="pub-strap">
            <span>{site}</span>
          </div>
        </div>
      </header>

      {/* The header every web report shares; only the section links are this report's. */}
      <ReportNav
        items={NAV.map((n) => ({ href: `#${n.id}`, label: n.title }))}
        activeIndex={active} isDark={dark} isMobile={isMobile} theme={dark ? NAV_DARK : NAV_LIGHT}
        pdf={{ url: pdfUrl, file: pdfName }}
        mobileOpen={menuOpen} onToggleMobile={() => setMenuOpen((o) => !o)} onToggleDark={toggle}
        onNavigate={(href, _label, mobile) => {
          if (mobile) setMenuOpen(false);
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onDownload={(mobile) => { if (mobile) setMenuOpen(false); }}
      />

      <main className="wrap">
        <PubSection id="why-now" heading={intro.heading} subtitle={intro.subtitle} intro={intro.body[0]}>
          {intro.body.slice(1).map((p, i) => <p className="lead pub-lead" key={i}>{p}</p>)}
          <figure className="pub-logos">
            <img
              src={contributorsUrl}
              alt={`Logos of the ${intro.contributors.named} funds named as founding contributors`}
              width={1600}
              height={608}
              loading="lazy"
            />
          </figure>
        </PubSection>

        {sections.map((s) => (
          <PubSection key={s.id} id={s.id} heading={s.heading} subtitle={s.subtitle} intro={s.intro}>
            <Stats items={s.stats} />
            {s.charts.map((c) => <ChartCard chart={c} key={c.id}><ChartFor chart={c} meta={meta} /></ChartCard>)}
            <Takeaways items={s.takeaways} />
          </PubSection>
        ))}

        <PubSection id="closing" heading={closing.heading} subtitle={closing.subtitle} intro={closing.intro}>
          <ol className="pub-points">
            {closing.points.map((p, i) => (
              <li key={p.title}>
                <span className="pub-point-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="pub-h3">{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </PubSection>

        <CollapsibleSection id="method" heading={methodology.heading} subtitle={methodology.subtitle} intro={methodology.intro}>
          <div className="pub-method">
            {methodology.blocks.map((b) => (
              <div key={b.title}>
                <h3 className="pub-h3">{b.title}</h3>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
          <div className="pub-card pub-note">
            <h3 className="pub-h3">{methodology.note.title}</h3>
            <p>{methodology.note.body}</p>
          </div>
        </CollapsibleSection>
      </main>

      {/* The benchmark viewer's footer, part for part: a card with the call to
          action, the legal line, then the strap. */}
      <footer className="foot pub-foot">
        <div className="wrap">
          <div className="block">
            <h3>{closing.cta.title}</h3>
            <p className="foot-lede">{closing.cta.body}</p>
            <div className="cta-row">
              <a className="cta" href="mailto:hello@sportstechx.com" data-testid="link-public-email">
                Email us hello@sportstechx.com
              </a>
            </div>
          </div>
        </div>
      </footer>
      {/* The footer every web report shares: the Atlas landing footer. */}
      <div className="lp"><LandingFooter /></div>
    </div>
  );
}
