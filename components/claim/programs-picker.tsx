'use client';

import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { LocationSelect } from '@/components/features/location/location-select';
import { CityInput } from '@/components/features/location/city-input';
import { useClaimSearch } from './use-claim-search';
import { blankNewEntity, newProgramMissing, type ProgramPick } from './claim-form';

/**
 * "Program participation" in the claim wizard: the accelerators, incubators and
 * other programs the company took part in. Pick as many as apply from Atlas;
 * once a search has run and found nothing by that name, add it by hand — name,
 * website and country. An added program stays on the claim and becomes a record
 * (linked to the company) only when the claim is verified.
 */
const PARTICIPATION_TYPES = 'program,initiative,event';
const MAX_PROGRAMS = 20; // the server's limit per claim

export function ProgramsPicker({ value, onChange }: { value: ProgramPick[]; onChange: (v: ProgramPick[]) => void }) {
  const [q, setQ] = useState('');
  // Companies took part in initiatives (UEFA Innovation Hub) and event
  // competitions too — searching programs only would push those into "add new".
  const { results, isLoading, enabled, query: searched, failed } = useClaimSearch('operator', q, PARTICIPATION_TYPES);
  const query = q.trim();
  const picked = new Set(value.map((p) => p.id).filter(Boolean));
  const named = (n: string) => value.some((p) => p.name.trim().toLowerCase() === n.toLowerCase());
  const canAdd = enabled && !isLoading && searched === query
    && !results.some((r) => r.name.trim().toLowerCase() === query.toLowerCase()) && !named(query);
  const update = (i: number, p: ProgramPick) => onChange(value.map((x, n) => (n === i ? p : x)));
  const add = (p: ProgramPick) => { onChange([...value, p]); setQ(''); };

  const full = value.length >= MAX_PROGRAMS;
  return (
    <div>
      {value.map((p, i) => <ProgramRow key={`${p.id ?? 'new'}-${i}`} p={p} onChange={(v) => update(i, v)} onRemove={() => onChange(value.filter((_, n) => n !== i))} />)}
      {full ? <div className="cm-hint" style={{ marginTop: 0 }}>That&apos;s the most programs one claim can list ({MAX_PROGRAMS}).</div> : (
        <div className="cm-search-wrap" style={{ marginBottom: 8 }}>
          <span className="cm-search-ico"><Search size={15} /></span>
          <input className="cm-input cm-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={value.length ? 'Add another program…' : 'Search Atlas for a program, e.g. Stadia Ventures'} />
        </div>
      )}
      {failed && <div className="cm-hint" style={{ marginTop: 0, marginBottom: 8 }}>Search isn&apos;t responding — try again in a moment.</div>}
      {!full && enabled && results.length > 0 && (
        <div className="cm-results" style={{ maxHeight: 220 }}>
          {results.slice(0, 5).map((r) => {
            const kind = r.kind && r.kind !== 'program' ? r.kind[0]!.toUpperCase() + r.kind.slice(1) : null;
            const meta = [kind, [r.hq, r.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || null;
            const already = picked.has(r.id);
            return (
              <button key={r.id} type="button" className="cm-result" disabled={already} onClick={() => add({ id: r.id, name: r.name, meta, year: '', added: null })}>
                <span className="cm-result-text"><span className="cm-result-name">{r.name}</span>{(meta || already) && <span className="cm-result-meta">{already ? 'Added' : meta}</span>}</span>
              </button>
            );
          })}
        </div>
      )}
      {!full && canAdd && (
        <button type="button" className="cm-addnew" style={{ marginTop: 8 }} onClick={() => add({ id: null, name: query, year: '', added: blankNewEntity() })}>
          <span className="cm-addnew-ico"><Plus size={16} /></span>
          <span style={{ flex: 1 }}><span className="cm-addnew-h">Add “{query}” as a new program</span><span className="cm-addnew-p">Not in Atlas yet — add its basics and we&apos;ll review it with your claim.</span></span>
        </button>
      )}
    </div>
  );
}

function ProgramRow({ p, onChange, onRemove }: { p: ProgramPick; onChange: (v: ProgramPick) => void; onRemove: () => void }) {
  const year = (
    <input className="cm-input cm-program-year" value={p.year} onChange={(e) => onChange({ ...p, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="Year" inputMode="numeric" aria-label={`Year you took part in ${p.name}`} />
  );
  const remove = <button type="button" className="cm-selco-change" onClick={onRemove} aria-label={`Remove ${p.name}`}><X size={14} /></button>;
  if (!p.added) {
    return (
      <div className="cm-selco cm-program-row">
        <span className="cm-selco-text"><span className="cm-selco-name">{p.name}</span>{p.meta && <span className="cm-selco-meta">{p.meta}</span>}</span>
        <span className="cm-selco-mode">{p.id ? 'In Atlas' : 'Not linked'}</span>
        {year}{remove}
      </div>
    );
  }
  const a = p.added;
  const set = (k: 'website' | 'country' | 'city', v: string) => onChange({ ...p, added: { ...a, [k]: v } });
  const missing = newProgramMissing(a, p.name);
  const req = <span className="cm-req">*</span>;
  return (
    <div className="cm-pick-new cm-program-row">
      <div className="cm-pick-new-head">
        <span className="cm-selco-mode cm-pick-new-tag">New · added by you</span>
        <span className="cm-pick-new-note">Not in Atlas yet. It&apos;s reviewed with your claim and published once approved.</span>
        {remove}
      </div>
      <div className="cm-row2">
        <div className="cm-field cm-half"><label className="cm-label">Program name {req}</label><input className="cm-input" value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} /></div>
        <div className="cm-field cm-half"><label className="cm-label">Website {req}</label><div className="cm-input-prefix"><span className="cm-input-prefix-txt">https://</span><input className="cm-input" value={a.website} onChange={(e) => set('website', e.target.value)} placeholder="program.com" /></div></div>
      </div>
      <div className="cm-row2">
        <div className="cm-field cm-half"><label className="cm-label">Country {req}</label><LocationSelect className="cm-select" value={a.country} onChange={(v) => set('country', v)} placeholder="Select country" /></div>
        <div className="cm-field cm-half"><label className="cm-label">City <span className="cm-opt">(optional)</span></label><CityInput className="cm-input" value={a.city} onChange={(v) => set('city', v)} onPick={(h) => onChange({ ...p, added: { ...a, city: h.city, country: a.country || h.country || '' } })} placeholder="City" geo={a.country} /></div>
      </div>
      <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">Year you took part <span className="cm-opt">(optional)</span></label>{year}</div>
      {missing.length > 0 && <div className="cm-hint cm-pick-missing">Still needed: {missing.join(', ')}</div>}
    </div>
  );
}
