// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useRef, useEffect } from 'react';

interface SectorNode {
  sector: string;
  sub_sector: string | null;
  sub_sub_sector: string | null;
  total_m: number;
  deals: number;
}

interface SubSubItem {
  label: string;
  value: number;
  deals: number;
}

interface SubItem {
  label: string;
  value: number;
  deals: number;
  subSubs: SubSubItem[];
}

interface SectorItem {
  label: string;
  value: number;
  deals: number;
  subs: SubItem[];
}

const LEVEL_COLORS = {
  0: '#ED1A5E',
  1: '#6A9DA9',
  2: '#BED0E3',
};

function fmt(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1).replace('.0', '')}B`;
  return `$${Math.round(m)}M`;
}

function buildHierarchy(data: SectorNode[]): SectorItem[] {
  const map = new Map<string, { value: number; deals: number; subs: Map<string, { value: number; deals: number; subSubs: Map<string, { value: number; deals: number }> }> }>();

  for (const row of data) {
    if (!map.has(row.sector)) map.set(row.sector, { value: 0, deals: 0, subs: new Map() });
    const sec = map.get(row.sector)!;
    sec.value += row.total_m;
    sec.deals += row.deals;

    const subKey = row.sub_sector || 'Other';
    if (!sec.subs.has(subKey)) sec.subs.set(subKey, { value: 0, deals: 0, subSubs: new Map() });
    const sub = sec.subs.get(subKey)!;
    sub.value += row.total_m;
    sub.deals += row.deals;

    const ssKey = row.sub_sub_sector || 'Other';
    if (!sub.subSubs.has(ssKey)) sub.subSubs.set(ssKey, { value: 0, deals: 0 });
    const ss = sub.subSubs.get(ssKey)!;
    ss.value += row.total_m;
    ss.deals += row.deals;
  }

  const result: SectorItem[] = [];
  map.forEach((sec, label) => {
    const subs: SubItem[] = [];
    sec.subs.forEach((sub, subLabel) => {
      const subSubs: SubSubItem[] = [];
      sub.subSubs.forEach((ss, ssLabel) => {
        subSubs.push({ label: ssLabel, value: ss.value, deals: ss.deals });
      });
      subs.push({ label: subLabel, value: sub.value, deals: sub.deals, subSubs: subSubs.sort((a, b) => b.value - a.value) });
    });
    result.push({ label, value: sec.value, deals: sec.deals, subs: subs.sort((a, b) => b.value - a.value) });
  });

  return result.sort((a, b) => b.value - a.value);
}

interface AnimBarProps {
  pct: number;
  color: string;
  trackColor: string;
  height?: number;
  delay?: number;
  isPdf?: boolean;
}

function AnimBar({ pct, color, trackColor, height = 3, delay = 0, isPdf = false }: AnimBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setGo(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isPdf]);
  return (
    <div ref={ref} style={{ width: '100%', height, background: trackColor, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%',
        width: go ? `${pct}%` : '0%',
        background: color,
        borderRadius: 2,
        transition: isPdf ? 'none' : `width 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }} />
    </div>
  );
}

interface CollapsibleProps {
  open: boolean;
  children: React.ReactNode;
}

function Collapsible({ open, children }: CollapsibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    if (open) {
      setHeight(ref.current.scrollHeight);
      const id = setTimeout(() => setHeight(99999), 600);
      return () => clearTimeout(id);
    } else {
      setHeight(ref.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open]);

  return (
    <div style={{
      overflow: 'hidden',
      height: open && height === 99999 ? 'auto' : height,
      transition: 'height 0.4s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

interface Props {
  data: SectorNode[];
  theme: { bg: string; text: string; textMuted: string; border: string; bgCard: string; titleColor: string };
  brandColors: { pink: string; teal: string; tealBright: string; navy: string; lightBlue: string; slate: string };
  sectorColors?: Record<string, string>;
  sectorSecondaryColors?: Record<string, string>;
  sectorLabels?: Record<string, string>;
  formatValue?: (v: number) => string;
  dealLabel?: string;
  isPdf?: boolean;
}

export default function SectorDrilldownChart({ data, theme, brandColors, sectorColors, sectorSecondaryColors, sectorLabels, formatValue, dealLabel, isPdf = false }: Props) {
  const fmtVal = formatValue ?? fmt;
  const secLabel = dealLabel ?? 'deals';
  const hierarchy = buildHierarchy(data);
  const totalSector = Math.max(hierarchy.reduce((sum, s) => sum + s.value, 0), 1);
  const getSectorColor = (label: string) => sectorColors?.[label] || LEVEL_COLORS[0];
  const getSectorSecColor = (label: string) => sectorSecondaryColors?.[label] || LEVEL_COLORS[1];
  const getSectorLabel = (label: string) => sectorLabels?.[label] || label;

  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  const toggleSector = (label: string) => {
    setOpenSectors(prev => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  };

  const toggleSub = (key: string) => {
    setOpenSubs(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  return (
    <div style={{ width: '100%' }}>
      {hierarchy.map((sector, si) => {
        const isOpen = openSectors.has(sector.label);
        const secColor = getSectorColor(sector.label);

        return (
          <div key={sector.label} style={{ marginBottom: 2 }}>
            {/* Sector row */}
            <div
              onClick={() => toggleSector(sector.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '10px 14px',
                background: isOpen ? `${secColor}10` : 'transparent',
                border: `1px solid ${isOpen ? secColor + '44' : theme.border}`,
                borderRadius: 4,
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2,
                      color: isOpen ? secColor : theme.textMuted,
                      textTransform: 'uppercase', minWidth: 18,
                      transition: 'transform 0.25s',
                      display: 'inline-block',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}>▶</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{getSectorLabel(sector.label)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>{((sector.value / totalSector) * 100).toFixed(1)}%</span>
                    <span style={{ fontSize: 13, color: secColor, fontWeight: 700 }}>{fmtVal(sector.value)}</span>
                  </div>
                </div>
                <AnimBar pct={(sector.value / totalSector) * 100} color={secColor} trackColor={theme.border} height={3} delay={si * 60} isPdf={isPdf} />
              </div>
            </div>

            {/* Sub-sectors */}
            <Collapsible open={isOpen}>
              <div style={{ paddingLeft: 20, paddingTop: 4 }}>
                {sector.subs.map((sub, subi) => {
                  const subKey = `${sector.label}::${sub.label}`;
                  const isSubOpen = openSubs.has(subKey);
                  const subColor = getSectorSecColor(sector.label);

                  return (
                    <div key={sub.label} style={{ marginBottom: 2 }}>
                      {/* Sub-sector row */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSub(subKey); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: sub.subSubs.length > 0 ? 'pointer' : 'default',
                          padding: '8px 12px',
                          background: isSubOpen ? `${subColor}10` : 'transparent',
                          border: `1px solid ${isSubOpen ? subColor + '44' : theme.border}`,
                          borderRadius: 3,
                          transition: 'all 0.2s',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {sub.subSubs.length > 0 && (
                                <span style={{
                                  fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 1,
                                  color: isSubOpen ? subColor : theme.textMuted,
                                  textTransform: 'uppercase', minWidth: 14,
                                  transition: 'transform 0.25s',
                                  display: 'inline-block',
                                  transform: isSubOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                }}>▶</span>
                              )}
                              <span style={{ fontSize: 12, color: theme.text }}>{sub.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span style={{ fontSize: 10, color: theme.textMuted }}>{((sub.value / totalSector) * 100).toFixed(1)}%</span>
                              <span style={{ fontSize: 12, color: subColor, fontWeight: 700 }}>{fmtVal(sub.value)}</span>
                            </div>
                          </div>
                          <AnimBar pct={(sub.value / totalSector) * 100} color={subColor} trackColor={theme.border} height={2} delay={subi * 45} isPdf={isPdf} />
                        </div>
                      </div>

                      {/* Sub-sub-sectors */}
                      {sub.subSubs.length > 0 && (
                        <Collapsible open={isSubOpen}>
                          <div style={{ paddingLeft: 20, paddingTop: 3, paddingBottom: 6 }}>
                            {sub.subSubs.map((ss, ssi) => (
                              <div key={ss.label} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 12px',
                                marginBottom: 2,
                                background: 'transparent',
                                border: `1px solid ${theme.border}`,
                                borderRadius: 3,
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, color: theme.textMuted }}>{ss.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                      <span style={{ fontSize: 10, color: theme.textMuted }}>{((ss.value / totalSector) * 100).toFixed(1)}%</span>
                                      <span style={{ fontSize: 11, color: subColor, fontWeight: 700 }}>{fmtVal(ss.value)}</span>
                                    </div>
                                  </div>
                                  <AnimBar pct={(ss.value / totalSector) * 100} color={`${subColor}88`} trackColor={theme.border} height={2} delay={ssi * 30} isPdf={isPdf} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          </div>
        );
      })}

      <div style={{ marginTop: 14, fontSize: 10, color: theme.textMuted, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <a href="https://intelligence.sportstechx.com/framework" target="_blank" rel="noopener noreferrer" style={{ color: brandColors.pink, textDecoration: "none" }}>Understand the Framework →</a>
      </div>
    </div>
  );
}
