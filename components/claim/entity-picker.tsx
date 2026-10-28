'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Combobox } from '@/components/atlas/ui/combobox';
import { LocationSelect } from '@/components/features/location/location-select';
import { CityInput } from '@/components/features/location/city-input';
import { useLeafSectorOptions } from '@/hooks/use-catalog-options';
import { useClaimSearch } from './use-claim-search';
import { INVESTOR_CATEGORY_OPTIONS, blankNewEntity, newEntityMissing, type EntityKind, type EntityPick, type NewEntity } from './claim-form';

/**
 * A portfolio company, M&A counterparty or round investor inside the claim
 * wizard. Search Atlas and pick the record; only once a search has run and
 * found nothing by that name can the user add it — by hand, with the fields a
 * usable record needs (no enrichment for users). An added entry stays on the
 * claim, flagged as user-added, and becomes a record only when the claim is
 * verified.
 */
export function EntityPicker({ kind, value, onChange, legacy }: {
  kind: EntityKind;
  value: EntityPick | null;
  onChange: (v: EntityPick | null) => void;
  /** Free text from an older claim, before entries were linked — seeds the search. */
  legacy?: string;
}) {
  const [q, setQ] = useState(legacy ?? '');
  const { results, isLoading, enabled, query: searched } = useClaimSearch(kind === 'company' ? 'founder' : 'investor', q);
  const noun = kind === 'company' ? 'company' : 'investor';
  const query = q.trim();
  // "Add" unlocks only when the search for exactly this text has come back
  // without a record of that name.
  const canAdd = enabled && !isLoading && searched === query
    && !results.some((r) => r.name.trim().toLowerCase() === query.toLowerCase());

  if (value?.added) return <AddedForm kind={kind} value={value} added={value.added} onChange={onChange} />;
  if (value) {
    return (
      <div className="cm-selco" style={{ marginBottom: 0 }}>
        <span className="cm-selco-text"><span className="cm-selco-name">{value.name}</span>{value.meta && <span className="cm-selco-meta">{value.meta}</span>}</span>
        <span className="cm-selco-mode">In Atlas</span>
        <button type="button" className="cm-selco-change" onClick={() => onChange(null)}>Change</button>
      </div>
    );
  }
  return (
    <div>
      <div className="cm-search-wrap" style={{ marginBottom: 8 }}>
        <span className="cm-search-ico"><Search size={15} /></span>
        <input className="cm-input cm-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search Atlas for the ${noun}…`} />
      </div>
      {legacy && query === legacy.trim() && <div className="cm-hint" style={{ marginTop: 0, marginBottom: 8 }}>Previously entered as “{legacy}” — pick it from Atlas or add it.</div>}
      {enabled && results.length > 0 && (
        <div className="cm-results" style={{ maxHeight: 220 }}>
          {results.slice(0, 5).map((r) => {
            const meta = [r.hq, r.country].filter(Boolean).join(', ') || null;
            return (
              <button key={r.id} type="button" className="cm-result" onClick={() => onChange({ id: r.id, name: r.name, meta, added: null })}>
                <span className="cm-result-text"><span className="cm-result-name">{r.name}</span>{meta && <span className="cm-result-meta">{meta}</span>}</span>
              </button>
            );
          })}
        </div>
      )}
      {canAdd && (
        <button type="button" className="cm-addnew" style={{ marginTop: 8 }} onClick={() => onChange({ id: null, name: query, added: blankNewEntity() })}>
          <span className="cm-addnew-ico"><Plus size={16} /></span>
          <span style={{ flex: 1 }}><span className="cm-addnew-h">Add “{query}” as a new {noun}</span><span className="cm-addnew-p">Not in Atlas yet — add its details and we&apos;ll review it with your claim.</span></span>
        </button>
      )}
    </div>
  );
}

function AddedForm({ kind, value, added, onChange }: { kind: EntityKind; value: EntityPick; added: NewEntity; onChange: (v: EntityPick | null) => void }) {
  const sectors = useLeafSectorOptions();
  const set = (k: keyof NewEntity, v: string) => onChange({ ...value, added: { ...added, [k]: v } });
  const missing = newEntityMissing(kind, added, value.name);
  const req = <span className="cm-req">*</span>;
  return (
    <div className="cm-pick-new">
      <div className="cm-pick-new-head">
        <span className="cm-selco-mode cm-pick-new-tag">New · added by you</span>
        <span className="cm-pick-new-note">Not in Atlas yet. It&apos;s reviewed with your claim and published once approved.</span>
        <button type="button" className="cm-selco-change" onClick={() => onChange(null)}>Change</button>
      </div>
      <div className="cm-row2">
        <div className="cm-field cm-half"><label className="cm-label">{kind === 'company' ? 'Company' : 'Investor'} name {req}</label><input className="cm-input" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
        <div className="cm-field cm-half"><label className="cm-label">Website {req}</label><div className="cm-input-prefix"><span className="cm-input-prefix-txt">https://</span><input className="cm-input" value={added.website} onChange={(e) => set('website', e.target.value)} placeholder={kind === 'company' ? 'company.com' : 'firm.com'} /></div></div>
      </div>
      <div className="cm-row2">
        <div className="cm-field cm-half"><label className="cm-label">Country {req}</label><LocationSelect className="cm-select" value={added.country} onChange={(v) => set('country', v)} placeholder="Select country" /></div>
        <div className="cm-field cm-half"><label className="cm-label">City <span className="cm-opt">(optional)</span></label><CityInput className="cm-input" value={added.city} onChange={(v) => set('city', v)} onPick={(h) => { if (h.country && !added.country) set('country', h.country); }} placeholder="City" geo={added.country} /></div>
      </div>
      {kind === 'company' ? (
        <>
          <div className="cm-row2">
            <div className="cm-field cm-half"><label className="cm-label">Sector {req}</label><Combobox className="cm-select" value={added.sectorId} onChange={(v) => set('sectorId', v)} placeholder="Select sector…" options={[['', 'Select sector…'], ...sectors]} /></div>
            <div className="cm-field cm-half"><label className="cm-label">Founded year <span className="cm-opt">(optional)</span></label><input className="cm-input" value={added.founded} onChange={(e) => set('founded', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2021" inputMode="numeric" /></div>
          </div>
          <div className="cm-field"><label className="cm-label">What does it do? {req}</label><input className="cm-input" maxLength={300} value={added.description} onChange={(e) => set('description', e.target.value)} placeholder="One sentence" /></div>
        </>
      ) : (
        <div className="cm-field"><label className="cm-label">Investor type {req}</label><Combobox className="cm-select" value={added.category} onChange={(v) => set('category', v)} placeholder="Select type…" options={[['', 'Select type…'], ...INVESTOR_CATEGORY_OPTIONS]} /></div>
      )}
      <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">LinkedIn <span className="cm-opt">(optional)</span></label><input className="cm-input" type="url" value={added.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/company/…" /></div>
      {missing.length > 0 && <div className="cm-hint cm-pick-missing">Still needed: {missing.join(', ')}</div>}
    </div>
  );
}
