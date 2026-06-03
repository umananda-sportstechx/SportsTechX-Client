'use client';

import { useEffect, useRef, useState } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import {
  Check, X, Search, Plus, ArrowRight, Sparkles, Building2, Wallet, Zap,
  User, Briefcase, DollarSign, Shield, Database, FileText, UploadCloud, Loader2,
} from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { useUserProfile } from '@/hooks/use-user-profile';
import { VerifiedBadge, Flag } from '@/components/ui/atoms';
import type { ClaimRole, ClaimTarget } from '@/lib/claim-events';
import {
  CM_ROLES, CM_ROLE_LIST, blankClaimForm,
  BIZ_MODELS, SPORTS_LIST, RAISE_AMOUNTS, FUND_ROUND_NAMES, INV_CATEGORIES,
  CONTINENTS, THESIS_SECTORS, TECH_PREFS, FUNDING_STAGES, REVENUE_STAGES, OP_TYPES,
  type ClaimForm, type SelectedEntity, type RoleConfig,
} from './claim-form';
import { useClaimReference } from './use-claim-reference';
import { useClaimSearch } from './use-claim-search';
import { buildCompanyDto, buildInvestorDto, buildEntityDto, uploadPitchDeck } from './build-claim-dto';

const initials = (n: string) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function RoleIcon({ icon, size = 20 }: { icon: RoleConfig['icon']; size?: number }) {
  if (icon === 'wallet') return <Wallet size={size} />;
  if (icon === 'zap') return <Zap size={size} />;
  return <Building2 size={size} />;
}

function EntityLogo({ item, size = 34 }: { item: { name?: string } | null; size?: number }) {
  return (
    <span className="cm-ent-logo" style={{ width: size, height: size, background: 'var(--bg-3)', color: 'var(--fg-2)' }}>
      {initials(item?.name ?? '')}
    </span>
  );
}

type Step =
  | 'role' | 'search' | 'identity' | 'dataedits' | 'fundraising' | 'review'
  | 'invdata' | 'portfolio' | 'details' | 'extra' | 'done';

export function ClaimModal({
  target, initialRole, onClose, onSubmitted,
}: {
  target: ClaimTarget | null;
  initialRole: ClaimRole | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { data: profile } = useUserProfile();
  const ref = useClaimReference();

  const lockedTarget = !!target?.id;
  const startRole = target?.role ?? initialRole ?? null;
  const [role, setRole] = useState<ClaimRole | null>(startRole);
  const [step, setStep] = useState<Step>(target?.id ? 'identity' : startRole ? 'search' : 'role');
  const [selItem, setSelItem] = useState<SelectedEntity | null>(
    target ? { id: target.id ?? null, name: target.name ?? '', website: target.website ?? null } : null,
  );
  const [selMode, setSelMode] = useState<'claim' | 'add'>(target?.id ? 'claim' : 'add');
  const [q, setQ] = useState('');
  const [editTab, setEditTab] = useState<'info' | 'funding' | 'mna' | 'org' | 'thesis'>('info');
  const [form, setForm] = useState<ClaimForm>(() => blankClaimForm(target ? { id: target.id, name: target.name ?? '', website: target.website } : null));
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const R = role ? CM_ROLES[role] : null;
  const { results } = useClaimSearch(role, q);

  // Prefill the claimant email from the signed-in profile once it loads (SWR
  // resolves after mount, so this genuinely syncs external state → form).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.email) setForm((f) => (f.email ? f : { ...f, email: profile.email ?? '' }));
  }, [profile?.email]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [step, editTab]);

  function set<K extends keyof ClaimForm>(k: K, v: ClaimForm[K]) { setForm((f) => ({ ...f, [k]: v })); }
  const toggleIn = (k: 'roundNames' | 'continents' | 'thesisSectors' | 'techPrefs' | 'fundingStages' | 'revenueStages', v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const selectAll = (k: 'continents' | 'thesisSectors' | 'techPrefs', list: string[]) =>
    setForm((f) => ({ ...f, [k]: f[k].length === list.length ? [] : [...list] }));
  const copyContact = () => setForm((f) => ({
    ...f,
    contactFirst: f.first, contactLast: f.last, contactName: `${f.first} ${f.last}`.trim(),
    contactPosition: f.position, contactEmail: f.email, contactLinkedin: f.linkedin,
  }));

  const pickRole = (id: ClaimRole) => { setRole(id); setQ(''); setSelItem(null); setForm(blankClaimForm(null)); setStep('search'); };
  const pickItem = (it: SelectedEntity) => {
    setSelItem(it); setSelMode('claim'); setEditTab(role === 'investor' ? 'org' : 'info');
    setForm((f) => ({ ...blankClaimForm(it), first: f.first, last: f.last, email: f.email, linkedin: f.linkedin, city: f.city, country: f.country, position: f.position }));
    setStep('identity');
  };
  const addNew = () => {
    setSelItem(null); setSelMode('add'); setEditTab(role === 'investor' ? 'org' : 'info');
    setForm((f) => ({ ...blankClaimForm(null), name: q, first: f.first, last: f.last, email: f.email, linkedin: f.linkedin, city: f.city, country: f.country, position: f.position }));
    setStep('identity');
  };

  const emailOk = /.+@.+\..+/.test(form.email);
  const richId = role === 'founder' || role === 'investor';
  const identityOk = richId
    ? !!(form.first.trim() && form.last.trim() && form.city.trim() && form.country.trim() && emailOk && form.position.trim())
    : !!(form.first.trim() && form.last.trim() && emailOk);
  const detailsOk = !!(form.name.trim() && form.website.trim());
  const fundraisingOk = !form.raising || !!(form.raiseMin && form.raiseMax && form.roundNames.length > 0);

  const isRole = step === 'role';
  const isSearch = step === 'search';
  const isDone = step === 'done';
  const preStep = isRole || isSearch;

  const STEPS = R ? R.steps : [];
  const stepKeys = STEPS.map((s) => s.k);
  const curIdx = stepKeys.indexOf(step);
  const isLast = curIdx === stepKeys.length - 1;
  const orgTab = editTab === 'thesis' ? 'thesis' : 'org';

  const stepValid = () => {
    if (step === 'identity') return identityOk;
    if (step === 'details' || step === 'dataedits') return detailsOk;
    if (step === 'invdata') return !!form.name.trim();
    if (step === 'fundraising') return fundraisingOk;
    return true;
  };

  async function submit() {
    if (!role) return;
    setSubmitting(true);
    try {
      let deckPath: string | null = null;
      if (role === 'founder' && form.deckFile && profile?.id) {
        deckPath = await uploadPitchDeck(form.deckFile, profile.id);
      }
      const targetId = selItem?.id ?? null;
      const [url, dto] = role === 'founder'
        ? ['/api/claims/company', buildCompanyDto(form, ref, targetId, deckPath)] as const
        : role === 'investor'
          ? ['/api/claims/investor', buildInvestorDto(form, ref, targetId)] as const
          : ['/api/claims/ecosystem-entity', buildEntityDto(form, targetId)] as const;
      await apiRequest('POST', url, dto);
      await mutate(qk.claims.mine());
      setStep('done');
      onSubmitted?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^\d+:\s*/, '') : 'Submission failed.';
      toast.error('Could not submit your claim', { description: msg.slice(0, 300) });
    } finally {
      setSubmitting(false);
    }
  }

  const goNext = () => { if (isLast) void submit(); else setStep(stepKeys[curIdx + 1] as Step); };
  const goBack = () => { if (curIdx > 0) setStep(stepKeys[curIdx - 1] as Step); else if (!lockedTarget) setStep('search'); };

  const submitLabel = !R ? '' : isLast
    ? (R.id === 'founder' ? 'Submit for verification' : (selMode === 'add' ? R.submitAdd : R.submitClaim))
    : (STEPS[curIdx]?.next ?? 'Continue');

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className={`cm-modal ${isDone ? 'cm-narrow' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Claim & verify">
        {/* LEFT RAIL */}
        {!isDone && (
          <aside className="cm-rail">
            <div className="cm-rail-glow" />
            <div className="cm-rail-brand">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M4 4 L20 4 L28 12 L28 28 L12 28 L4 20 Z" fill="currentColor" /></svg>
              SPORTS<span className="cm-rail-x">TECH</span>X
            </div>
            <h2 className="cm-rail-h">{isRole ? 'Own your profile on SportsTechX.' : (R?.free ? "Own your company's profile." : 'Claim and manage your profile.')}</h2>
            <p className="cm-rail-lead">{isRole || !R ? 'Verify ownership so the details the ecosystem sees come from you — not from a guess.' : R.railLead(selItem?.name || form.name)}</p>

            {!isRole && R && (
              <div className="cm-steps">
                {STEPS.map((s, i) => {
                  const state = isSearch ? '' : (i < curIdx ? 'done' : i === curIdx ? 'active' : '');
                  return (
                    <div key={s.k} className={`cm-step-row ${state}`}>
                      <span className="cm-step-num">{state === 'done' ? <Check size={13} /> : i + 1}</span>
                      <span className="cm-step-label">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cm-rail-bonus">
              <div className="cm-rail-bonus-tag">{isRole || R?.free ? <Sparkles size={12} /> : <Check size={12} />} {isRole || !R ? 'What you get' : R.bonusTag}</div>
              <ul className="cm-rail-bonus-list">
                {(isRole || !R ? CM_ROLES.founder.bonus : R.bonus).map((b, i) => <li key={i}><Check size={13} /> {b}</li>)}
              </ul>
            </div>
          </aside>
        )}

        {/* RIGHT BODY */}
        <div className="cm-body">
          {!isDone && (
            <div className="cm-progress">
              <div className="cm-progress-fill" style={{ width: isRole ? '4%' : isSearch ? '10%' : `${((curIdx + 1) / (STEPS.length + 1)) * 100}%` }} />
            </div>
          )}

          <header className="cm-head">
            <div className="cm-head-titles">
              <div className="cm-head-kicker">
                {isRole ? 'Get verified' : isSearch && R ? `${R.label} · find your ${R.noun}` : isDone ? 'All set' : R ? `${R.id === 'founder' ? (selMode === 'add' ? 'Add your company' : 'Get this company verified') : R.id === 'investor' ? (selMode === 'add' ? 'Add this investor' : 'Get this investor verified') : (selMode === 'add' ? 'Add' : 'Claim')} · Step ${curIdx + 1} of ${STEPS.length}` : ''}
              </div>
              <h3 className="cm-head-h">
                {isRole && 'Who are you?'}
                {isSearch && R && `Find your ${R.noun}`}
                {step === 'identity' && (richId ? 'Your details' : 'Tell us who you are')}
                {step === 'dataedits' && 'Review the company data'}
                {step === 'invdata' && 'Review the investor data'}
                {step === 'portfolio' && 'Portfolio companies'}
                {step === 'details' && (selMode === 'claim' ? 'Confirm your details' : R ? `Your ${R.noun} details` : 'Details')}
                {step === 'fundraising' && 'Fundraising'}
                {step === 'extra' && 'Applications & dates'}
                {step === 'review' && 'Review & submit'}
                {isDone && (selMode === 'add' ? 'Listing received' : 'Claim received')}
              </h3>
            </div>
            <button className="cm-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </header>

          <div className="cm-scroll" ref={scrollRef}>
            {/* ROLE CHOOSER */}
            {isRole && (
              <div>
                <p className="cm-intro">Tell us who you are and we&apos;ll take you to the right place to claim and verify your profile.</p>
                <div className="cm-roles">
                  {CM_ROLE_LIST.map((r) => (
                    <button key={r.id} className="cm-role-card" onClick={() => pickRole(r.id)}>
                      <span className="cm-role-ico"><RoleIcon icon={r.icon} size={20} /></span>
                      <span className="cm-role-text"><span className="cm-role-h">{r.label}</span><span className="cm-role-p pl-1">{r.chooserDesc}</span></span>
                      {r.free && <span className="cm-role-tag free">Free</span>}
                      <ArrowRight size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEARCH */}
            {isSearch && R && (
              <div>
                {!initialRole && !lockedTarget && <button className="cm-backlink" onClick={() => setStep('role')}><ArrowRight size={11} /> Change type</button>}
                <p className="cm-intro">Search our database. If your {R.noun} is already listed you can claim it — if not, you can add it.</p>
                <div className="cm-search-wrap">
                  <span className="cm-search-ico"><Search size={16} /></span>
                  <input className="cm-input cm-search-input" autoFocus placeholder={R.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                {results.length > 0 && (
                  <div className="cm-results">
                    {results.map((it) => (
                      <button key={it.id} className="cm-result" onClick={() => pickItem({ id: it.id, name: it.name, website: it.website, hq: it.hq, cc: it.cc, verified: it.verified })}>
                        <EntityLogo item={it} />
                        <span className="cm-result-text">
                          <span className="cm-result-name">{it.name} {it.verified && <VerifiedBadge size={12} />}</span>
                          <span className="cm-result-meta">{it.cc && <Flag cc={it.cc} size={12} />} {it.hq ?? ''}{it.kind ? ` · ${it.kind}` : ''}</span>
                        </span>
                        {it.verified ? <span className="cm-result-claimed">Claimed</span> : <span className="cm-result-arrow"><ArrowRight size={14} /></span>}
                      </button>
                    ))}
                  </div>
                )}
                <button className="cm-addnew" onClick={addNew}>
                  <span className="cm-addnew-ico"><Plus size={18} /></span>
                  <span style={{ flex: 1 }}><span className="cm-addnew-h">{q.trim() ? `Add "${q.trim()}"` : `Can't find your ${R.noun}?`}</span><span className="cm-addnew-p">Not listed yet — add it and we&apos;ll verify the details.</span></span>
                  <ArrowRight size={14} style={{ color: 'var(--fg-muted)' }} />
                </button>
              </div>
            )}

            {/* Selected-entity chip */}
            {!preStep && !isDone && step !== 'review' && R && (
              <div className="cm-selco">
                {selItem ? <EntityLogo item={selItem} size={36} /> : <span className="cm-addnew-ico" style={{ width: 36, height: 36 }}><RoleIcon icon={R.icon} size={18} /></span>}
                <span className="cm-selco-text"><span className="cm-selco-name">{form.name || (selItem ? selItem.name : `New ${R.noun}`)}</span><span className="cm-selco-meta">{selMode === 'add' ? 'New listing — pending review' : 'In our database'}</span></span>
                <span className="cm-selco-mode">{selMode === 'add' ? 'Add' : 'Claim'}</span>
                {!lockedTarget && <button className="cm-selco-change" onClick={() => setStep('search')}>Change</button>}
              </div>
            )}

            {/* IDENTITY — rich (founder + investor) */}
            {step === 'identity' && richId && R && (
              <div>
                <div className="cm-block">
                  <div className="cm-block-h">{R.id === 'investor' ? <Wallet size={16} /> : <Building2 size={16} />} {R.id === 'investor' ? 'Investor information' : 'Company information'}</div>
                  <div className="cm-row2">
                    <div className="cm-field cm-half"><label className="cm-label">{R.id === 'investor' ? 'Investor name' : 'Company name'}</label><input className="cm-input cm-readonly" value={form.name} readOnly /></div>
                    <div className="cm-field cm-half"><label className="cm-label">Website</label><input className="cm-input cm-readonly" value={form.website || '—'} readOnly /></div>
                  </div>
                </div>
                <div className="cm-block">
                  <div className="cm-block-h"><User size={16} /> Your information</div>
                  <div className="cm-row2">
                    <div className="cm-field cm-half"><label className="cm-label">First name <span className="cm-req">*</span></label><input className="cm-input" value={form.first} onChange={(e) => set('first', e.target.value)} placeholder="Your first name" /></div>
                    <div className="cm-field cm-half"><label className="cm-label">Last name <span className="cm-req">*</span></label><input className="cm-input" value={form.last} onChange={(e) => set('last', e.target.value)} placeholder="Your last name" /></div>
                  </div>
                  <div className="cm-row2">
                    <div className="cm-field cm-half"><label className="cm-label">City <span className="cm-req">*</span></label><input className="cm-input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Your city" /></div>
                    <div className="cm-field cm-half"><label className="cm-label">Country <span className="cm-req">*</span></label><input className="cm-input" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Your country" /></div>
                  </div>
                </div>
                <div className="cm-block" style={{ marginBottom: 0 }}>
                  <div className="cm-block-h"><Briefcase size={16} /> Professional details</div>
                  <div className="cm-row2">
                    <div className="cm-field cm-half"><label className="cm-label">Company email <span className="cm-req">*</span></label><input className="cm-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="your.name@company.com" /></div>
                    <div className="cm-field cm-half"><label className="cm-label">Position <span className="cm-req">*</span></label><input className="cm-input" value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. CEO, Partner, Founder" /></div>
                  </div>
                  <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">LinkedIn profile URL</label><input className="cm-input" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourprofile" /></div>
                </div>
              </div>
            )}

            {/* IDENTITY — operator */}
            {step === 'identity' && R?.id === 'operator' && (
              <div>
                <p className="cm-intro">We verify that you actually represent {form.name || `this ${R.noun}`} before any changes go live. Use your work email.</p>
                <div className="cm-row2">
                  <div className="cm-field cm-half"><label className="cm-label">First name <span className="cm-req">*</span></label><input className="cm-input" value={form.first} onChange={(e) => set('first', e.target.value)} placeholder="Alex" /></div>
                  <div className="cm-field cm-half"><label className="cm-label">Last name <span className="cm-req">*</span></label><input className="cm-input" value={form.last} onChange={(e) => set('last', e.target.value)} placeholder="Morgan" /></div>
                </div>
                <div className="cm-field"><label className="cm-label">Work email <span className="cm-req">*</span></label><input className="cm-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@organisation.com" /><div className="cm-hint">A work email at your {R.noun}&apos;s domain speeds up approval.</div></div>
                <div className="cm-field"><label className="cm-label">Position <span className="cm-opt">(optional)</span></label><input className="cm-input" value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Programme Director" /></div>
                <div className="cm-field"><label className="cm-label">LinkedIn profile <span className="cm-opt">(optional)</span></label><input className="cm-input" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/you" /></div>
              </div>
            )}

            {/* FOUNDER — DATA EDITS */}
            {step === 'dataedits' && (
              <div>
                {selMode === 'claim'
                  ? <div className="cm-pending"><Check size={15} /><span>We pre-filled this from our records. Edit anything that&apos;s wrong — your changes are saved as <b>pending updates</b> and go live once we confirm them.</span></div>
                  : <p className="cm-intro">Tell us about your company. Everything here is reviewed before it&apos;s published.</p>}

                <div className="cm-tabs">
                  <button className={`cm-tab ${editTab === 'info' ? 'on' : ''}`} onClick={() => setEditTab('info')}><Building2 size={14} /> Company info</button>
                  <button className={`cm-tab ${editTab === 'funding' ? 'on' : ''}`} onClick={() => setEditTab('funding')}><DollarSign size={14} /> Funding <span className="cm-tab-ct">({form.rounds.length})</span></button>
                  <button className={`cm-tab ${editTab === 'mna' ? 'on' : ''}`} onClick={() => setEditTab('mna')}><Shield size={14} /> M&amp;A <span className="cm-tab-ct">({form.mna.length})</span></button>
                </div>

                {editTab === 'info' && (
                  <div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Company name <span className="cm-req">*</span></label><input className="cm-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Website</label><div className="cm-input-prefix"><span className="cm-input-prefix-txt">https://</span><input className="cm-input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="company.com" /></div></div>
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Description <span className="cm-opt">(max 150 characters)</span></label>
                      <textarea className="cm-textarea" maxLength={150} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What you do, in a sentence or two." />
                      <div className={`cm-counter ${form.description.length >= 150 ? 'over' : ''}`}>{form.description.length}/150 characters</div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Sector</label><input className="cm-input" value={form.sector} onChange={(e) => set('sector', e.target.value)} placeholder="e.g. Fans & Content" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Business model</label><select className="cm-select" value={form.businessModel} onChange={(e) => set('businessModel', e.target.value)}>{BIZ_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Founded year</label><input className="cm-input" value={form.founded} onChange={(e) => set('founded', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2021" inputMode="numeric" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">City</label><input className="cm-input" value={form.coCity} onChange={(e) => set('coCity', e.target.value)} placeholder="London" /></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Country</label><input className="cm-input" value={form.coCountry} onChange={(e) => set('coCountry', e.target.value)} placeholder="UK" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Sport</label><select className="cm-select" value={form.sport} onChange={(e) => set('sport', e.target.value)}><option value="">Select…</option>{SPORTS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="cm-field"><label className="cm-label">Program participation</label><input className="cm-input" value={form.programs} onChange={(e) => set('programs', e.target.value)} placeholder="e.g. Stadia Ventures '24" /></div>

                    <div className="cm-sub">Contact &amp; social</div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Twitter</label><input className="cm-input" value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="https://twitter.com/company" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Instagram</label><input className="cm-input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/company" /></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Facebook</label><input className="cm-input" value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/company" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">LinkedIn</label><input className="cm-input" value={form.linkedin_co} onChange={(e) => set('linkedin_co', e.target.value)} placeholder="https://linkedin.com/company/…" /></div>
                    </div>
                    <div className="cm-field"><label className="cm-label">Company email</label><input className="cm-input" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} placeholder="contact@company.com" /></div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 0 12px' }}>
                      <div className="cm-sub" style={{ margin: 0 }}>Primary contact</div>
                      <button className="cm-samebtn" onClick={copyContact}><User size={13} /> Same as your info</button>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Contact first name</label><input className="cm-input" value={form.contactFirst} onChange={(e) => set('contactFirst', e.target.value)} placeholder="Adam" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Contact last name</label><input className="cm-input" value={form.contactLast} onChange={(e) => set('contactLast', e.target.value)} placeholder="Breeden" /></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Position</label><input className="cm-input" value={form.contactPosition} onChange={(e) => set('contactPosition', e.target.value)} placeholder="Founder & CEO" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Contact email</label><input className="cm-input" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="adam@company.com" /></div>
                    </div>
                    <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">Personal LinkedIn profile</label><input className="cm-input" value={form.contactLinkedin} onChange={(e) => set('contactLinkedin', e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
                  </div>
                )}

                {editTab === 'funding' && (
                  <div>
                    <div className="cm-edithead">
                      <div><div className="cm-edithead-t">Edit funding rounds</div><div className="cm-edithead-s">Edit existing rounds or add new ones.</div></div>
                      <button className="cm-addrow" onClick={() => set('rounds', [...form.rounds, { roundType: '', amount: '', date: '', investors: '', source: '' }])}><Plus size={14} /> Add round</button>
                    </div>
                    {form.rounds.length === 0 && <div className="cm-editempty">No funding rounds yet. Add one if you&apos;d like it on your profile.</div>}
                    <div className="cm-editlist">
                      {form.rounds.map((r, i) => {
                        const upd = (k: keyof typeof r, v: string) => set('rounds', form.rounds.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <div key={i} className="cm-editcard">
                            <button className="cm-editcard-x" onClick={() => set('rounds', form.rounds.filter((_, j) => j !== i))} aria-label="Remove round"><X size={14} /></button>
                            <div className="cm-row3">
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Round type</label><select className="cm-select" value={r.roundType} onChange={(e) => upd('roundType', e.target.value)}><option value="">Select…</option>{FUND_ROUND_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Amount (USD)</label><input className="cm-input" value={r.amount} onChange={(e) => upd('amount', e.target.value.replace(/[^\d]/g, ''))} placeholder="1000000" inputMode="numeric" /></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Date</label><input className="cm-input" value={r.date} onChange={(e) => upd('date', e.target.value)} placeholder="2024-07-10" /></div>
                            </div>
                            <div className="cm-field" style={{ marginBottom: 12 }}><label className="cm-label">Investors</label><input className="cm-input" value={r.investors} onChange={(e) => upd('investors', e.target.value)} placeholder="Comma-separated" /></div>
                            <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Source <span className="cm-opt">(optional)</span></label><input className="cm-input" value={r.source} onChange={(e) => upd('source', e.target.value)} placeholder="https://…" /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {editTab === 'mna' && (
                  <div>
                    <div className="cm-edithead">
                      <div><div className="cm-edithead-t">Edit M&amp;A deals</div><div className="cm-edithead-s">Edit existing deals or add new ones.</div></div>
                      <button className="cm-addrow" onClick={() => set('mna', [...form.mna, { dealType: 'Acquisition', counterparty: '', amount: '', date: '' }])}><Plus size={14} /> Add deal</button>
                    </div>
                    {form.mna.length === 0 && <div className="cm-editempty">No M&amp;A deals on record. Add one if relevant.</div>}
                    <div className="cm-editlist">
                      {form.mna.map((m, i) => {
                        const upd = (k: keyof typeof m, v: string) => set('mna', form.mna.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <div key={i} className="cm-editcard">
                            <button className="cm-editcard-x" onClick={() => set('mna', form.mna.filter((_, j) => j !== i))} aria-label="Remove deal"><X size={14} /></button>
                            <div className="cm-row3">
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Deal type</label><select className="cm-select" value={m.dealType} onChange={(e) => upd('dealType', e.target.value)}><option>Acquisition</option><option>Merger</option><option>Acqui-hire</option><option>Majority stake</option><option>Minority stake</option></select></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Counterparty</label><input className="cm-input" value={m.counterparty} onChange={(e) => upd('counterparty', e.target.value)} placeholder="Company name" /></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Date</label><input className="cm-input" value={m.date} onChange={(e) => upd('date', e.target.value)} placeholder="2024" /></div>
                            </div>
                            <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Amount (USD) <span className="cm-opt">(optional)</span></label><input className="cm-input" value={m.amount} onChange={(e) => upd('amount', e.target.value.replace(/[^\d]/g, ''))} placeholder="Undisclosed" inputMode="numeric" /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INVESTOR / OPERATOR — DETAILS (operator only; investor uses invdata) */}
            {step === 'details' && R && (
              <div>
                {selMode === 'claim'
                  ? <div className="cm-pending"><Check size={15} /><span>We pre-filled this from our records. Edit anything that&apos;s wrong — changes are saved as <b>pending updates</b>.</span></div>
                  : <p className="cm-intro">Tell us about your {R.noun}. Everything here is reviewed before it&apos;s published.</p>}
                <div className="cm-sub">The basics</div>
                <div className="cm-field"><label className="cm-label">Program / event name <span className="cm-req">*</span></label><input className="cm-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" /></div>
                <div className="cm-field"><label className="cm-label">Website <span className="cm-req">*</span></label><div className="cm-input-prefix"><span className="cm-input-prefix-txt">https://</span><input className="cm-input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="organisation.com" /></div></div>
                <div className="cm-field"><label className="cm-label">One-line description</label><input className="cm-input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What you do, in a sentence" /></div>
                <div className="cm-sub">Profile</div>
                <div className="cm-row2">
                  <div className="cm-field cm-half"><label className="cm-label">Location</label><input className="cm-input" value={form.coCity} onChange={(e) => set('coCity', e.target.value)} placeholder="London" /></div>
                  <div className="cm-field cm-half"><label className="cm-label">Country</label><input className="cm-input" value={form.coCountry} onChange={(e) => set('coCountry', e.target.value)} placeholder="UK" /></div>
                </div>
                <div className="cm-field"><label className="cm-label">Type</label><select className="cm-select" value={form.opType} onChange={(e) => set('opType', e.target.value)}>{OP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
            )}

            {/* FOUNDER — FUNDRAISING */}
            {step === 'fundraising' && (
              <div>
                <label className={`cm-bigcheck ${form.raising ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.raising} onChange={(e) => set('raising', e.target.checked)} />
                  <span><span className="cm-bigcheck-h">We are actively raising funds</span><span className="cm-bigcheck-p">Check this if your company is currently seeking investment. You&apos;ll be surfaced to investors scanning for deals.</span></span>
                </label>
                {form.raising && (
                  <div className="cm-nest">
                    <div className="cm-field"><label className="cm-label">Amount seeking to raise (USD) <span className="cm-req">*</span></label>
                      <div className="cm-row2">
                        <div className="cm-field cm-half" style={{ marginBottom: 0 }}><select className="cm-select" value={form.raiseMin} onChange={(e) => set('raiseMin', e.target.value)}><option value="">Min</option>{RAISE_AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                        <div className="cm-field cm-half" style={{ marginBottom: 0 }}><select className="cm-select" value={form.raiseMax} onChange={(e) => set('raiseMax', e.target.value)}><option value="">Max</option>{RAISE_AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                      </div>
                    </div>
                    <div className="cm-field">
                      <label className="cm-label">Round name <span className="cm-req">*</span></label>
                      <div className="cm-check-grid">
                        {FUND_ROUND_NAMES.map((n) => <label key={n} className="cm-check"><input type="checkbox" checked={form.roundNames.includes(n)} onChange={() => toggleIn('roundNames', n)} /> {n}</label>)}
                      </div>
                    </div>
                    <div className="cm-field"><label className="cm-label">Valuation</label><input className="cm-input" value={form.valuation} onChange={(e) => set('valuation', e.target.value)} placeholder="e.g. $5M pre-money" /><div className="cm-hint">Optional: pre-money or post-money valuation.</div></div>
                    <div className="cm-field" style={{ marginBottom: 0 }}>
                      <label className="cm-label">Pitch deck <span className="cm-opt">(PDF / PPT / PPTX)</span></label>
                      <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0] ?? null; setForm((s) => ({ ...s, deckFile: f, deckName: f?.name ?? null })); }} />
                      {form.deckName ? (
                        <div className="cm-drop has-file"><FileText size={18} style={{ color: 'var(--verify)' }} /><span className="cm-drop-file">{form.deckName}</span><button className="cm-drop-clear" onClick={() => setForm((s) => ({ ...s, deckFile: null, deckName: null }))} aria-label="Remove file"><X size={14} /></button></div>
                      ) : (
                        <button className="cm-drop" onClick={() => fileRef.current?.click()}><span className="cm-drop-ico"><UploadCloud size={20} /></span><span className="cm-drop-h">Choose file</span><span className="cm-drop-p">Max 10MB · PDF, PPT, PPTX</span></button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INVESTOR — DATA (org / thesis) */}
            {step === 'invdata' && (
              <div>
                {selMode === 'claim'
                  ? <div className="cm-pending"><Check size={15} /><span>Review and update the investor data below. Changes are submitted as <b>pending updates</b>.</span></div>
                  : <p className="cm-intro">Tell us about your firm. Everything here is reviewed before it&apos;s published.</p>}

                <div className="cm-tabs cm-tabs-2">
                  <button className={`cm-tab ${orgTab === 'org' ? 'on' : ''}`} onClick={() => setEditTab('org')}><Database size={14} /> Organisation data</button>
                  <button className={`cm-tab ${orgTab === 'thesis' ? 'on' : ''}`} onClick={() => setEditTab('thesis')}><DollarSign size={14} /> Thesis</button>
                </div>

                {orgTab === 'org' && (
                  <div>
                    <div className="cm-sub">Organisation details</div>
                    <div className="cm-field"><label className="cm-label">Name <span className="cm-req">*</span></label><input className="cm-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                    <div className="cm-field"><label className="cm-label">Website</label><div className="cm-input-prefix"><span className="cm-input-prefix-txt">https://</span><input className="cm-input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="firm.com" /></div></div>
                    <div className="cm-field"><label className="cm-label">Description</label><textarea className="cm-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What you back, in a sentence or two." /></div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Category</label><select className="cm-select" value={form.invCategory} onChange={(e) => set('invCategory', e.target.value)}><option value="">Select…</option>{INV_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="cm-field cm-half"><label className="cm-label">Year launched</label><input className="cm-input" value={form.yearLaunched} onChange={(e) => set('yearLaunched', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2018" inputMode="numeric" /></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">City</label><input className="cm-input" value={form.coCity} onChange={(e) => set('coCity', e.target.value)} placeholder="Boston" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Country</label><input className="cm-input" value={form.coCountry} onChange={(e) => set('coCountry', e.target.value)} placeholder="USA" /></div>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">AUM <span className="cm-opt">(optional)</span></label><input className="cm-input" value={form.aum} onChange={(e) => set('aum', e.target.value)} placeholder="e.g. 230M" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Focus <span className="cm-opt">(optional)</span></label><input className="cm-input" value={form.focus} onChange={(e) => set('focus', e.target.value)} placeholder="e.g. Seed–Series A" /></div>
                    </div>

                    <div className="cm-edithead" style={{ marginTop: 6 }}>
                      <div><div className="cm-edithead-t">Fund history</div><div className="cm-edithead-s">Add the funds you&apos;ve raised.</div></div>
                      <button className="cm-addrow" onClick={() => set('funds', [...form.funds, { name: '', year: '', size: '' }])}><Plus size={14} /> Add fund</button>
                    </div>
                    {form.funds.length === 0 && <div className="cm-editempty">No funds on record. Add one if relevant.</div>}
                    <div className="cm-editlist">
                      {form.funds.map((fd, i) => {
                        const upd = (k: keyof typeof fd, v: string) => set('funds', form.funds.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <div key={i} className="cm-editcard">
                            <button className="cm-editcard-x" onClick={() => set('funds', form.funds.filter((_, j) => j !== i))} aria-label="Remove fund"><X size={14} /></button>
                            <div className="cm-row3">
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Fund name</label><input className="cm-input" value={fd.name} onChange={(e) => upd('name', e.target.value)} placeholder="Fund I" /></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Year</label><input className="cm-input" value={fd.year} onChange={(e) => upd('year', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2023" inputMode="numeric" /></div>
                              <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Size (USD)</label><input className="cm-input" value={fd.size} onChange={(e) => upd('size', e.target.value.replace(/[^\d]/g, ''))} placeholder="50000000" inputMode="numeric" /></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="cm-sub">Social media</div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Twitter</label><input className="cm-input" value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="https://twitter.com/…" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">LinkedIn</label><input className="cm-input" value={form.linkedin_co} onChange={(e) => set('linkedin_co', e.target.value)} placeholder="https://linkedin.com/company/…" /></div>
                    </div>
                    <div className="cm-field"><label className="cm-label">Email</label><input className="cm-input" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} placeholder="info@firm.com" /></div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 0 12px' }}>
                      <div className="cm-sub" style={{ margin: 0 }}>Point of contact</div>
                      <button className="cm-samebtn" onClick={copyContact}><User size={13} /> Same as your info</button>
                    </div>
                    <div className="cm-row2">
                      <div className="cm-field cm-half"><label className="cm-label">Contact name</label><input className="cm-input" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Brad Blum" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">Position</label><input className="cm-input" value={form.contactPosition} onChange={(e) => set('contactPosition', e.target.value)} placeholder="President" /></div>
                    </div>
                    <div className="cm-row2" style={{ marginBottom: 0 }}>
                      <div className="cm-field cm-half"><label className="cm-label">Contact email</label><input className="cm-input" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="brad@firm.com" /></div>
                      <div className="cm-field cm-half"><label className="cm-label">LinkedIn</label><input className="cm-input" value={form.contactLinkedin} onChange={(e) => set('contactLinkedin', e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
                    </div>
                  </div>
                )}

                {orgTab === 'thesis' && (
                  <div>
                    <label className={`cm-bigcheck ${form.buildThesis ? 'on' : ''}`}>
                      <input type="checkbox" checked={form.buildThesis} onChange={(e) => set('buildThesis', e.target.checked)} />
                      <span><span className="cm-bigcheck-h">Build thesis</span><span className="cm-bigcheck-p">Set your thesis to surface companies that align with your investment criteria.</span></span>
                    </label>
                    {form.buildThesis && (
                      <div className="cm-thesis">
                        {([['continents', 'Continents', CONTINENTS], ['thesisSectors', 'Sectors', THESIS_SECTORS], ['techPrefs', 'Tech preferences', TECH_PREFS]] as const).map(([key, label, list]) => (
                          <div key={key} className="cm-field">
                            <div className="cm-grouplabel"><span className="cm-label" style={{ margin: 0 }}>{label}</span><button className="cm-selectall" onClick={() => selectAll(key, list as unknown as string[])}>{form[key].length === list.length ? 'Clear all' : 'Select all'}</button></div>
                            <div className="cm-check-grid">{list.map((o) => <label key={o} className="cm-check"><input type="checkbox" checked={form[key].includes(o)} onChange={() => toggleIn(key, o)} /> {o}</label>)}</div>
                          </div>
                        ))}
                        <div className="cm-row2">
                          <div className="cm-field cm-half"><label className="cm-label">Min investment</label><select className="cm-select" value={form.minInv} onChange={(e) => set('minInv', e.target.value)}><option value="">Select min</option>{RAISE_AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                          <div className="cm-field cm-half"><label className="cm-label">Max investment</label><select className="cm-select" value={form.maxInv} onChange={(e) => set('maxInv', e.target.value)}><option value="">Select max</option>{RAISE_AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                        </div>
                        <div className="cm-field"><label className="cm-label">Funding stage</label><div className="cm-check-grid">{FUNDING_STAGES.map((o) => <label key={o} className="cm-check"><input type="checkbox" checked={form.fundingStages.includes(o)} onChange={() => toggleIn('fundingStages', o)} /> {o}</label>)}</div></div>
                        <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">Startup financials — revenue stage</label><div className="cm-check-grid">{REVENUE_STAGES.map((o) => <label key={o} className="cm-check"><input type="checkbox" checked={form.revenueStages.includes(o)} onChange={() => toggleIn('revenueStages', o)} /> {o}</label>)}</div></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* INVESTOR — PORTFOLIO */}
            {step === 'portfolio' && (
              <div>
                <div className="cm-pending"><Briefcase size={15} /><span>Optionally add portfolio companies you&apos;ve invested in. This helps us verify your claim faster — you can skip this step.</span></div>
                <div className="cm-edithead">
                  <div><div className="cm-edithead-t">Portfolio companies <span className="cm-opt" style={{ fontWeight: 400 }}>(optional)</span></div><div className="cm-edithead-s">Companies you&apos;ve backed.</div></div>
                  <button className="cm-addrow" onClick={() => set('portfolio', [...form.portfolio, { name: '', stage: '', year: '' }])}><Plus size={14} /> Add company</button>
                </div>
                {form.portfolio.length === 0 && <div className="cm-editempty">No portfolio companies added yet. Click &quot;Add company&quot; above or skip this step.</div>}
                <div className="cm-editlist">
                  {form.portfolio.map((p, i) => {
                    const upd = (k: keyof typeof p, v: string) => set('portfolio', form.portfolio.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                    return (
                      <div key={i} className="cm-editcard">
                        <button className="cm-editcard-x" onClick={() => set('portfolio', form.portfolio.filter((_, j) => j !== i))} aria-label="Remove company"><X size={14} /></button>
                        <div className="cm-row3">
                          <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Company</label><input className="cm-input" value={p.name} onChange={(e) => upd('name', e.target.value)} placeholder="Company name" /></div>
                          <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Stage</label><select className="cm-select" value={p.stage} onChange={(e) => upd('stage', e.target.value)}><option value="">—</option>{FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                          <div className="cm-field" style={{ margin: 0 }}><label className="cm-label">Year</label><input className="cm-input" value={p.year} onChange={(e) => upd('year', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2023" inputMode="numeric" /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OPERATOR — EXTRA */}
            {step === 'extra' && R?.id === 'operator' && (
              <div>
                <p className="cm-intro">Optional — keep this current and the right founders find your next intake at exactly the right moment.</p>
                <label className={`cm-bigcheck ${form.appsOpen ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.appsOpen} onChange={(e) => set('appsOpen', e.target.checked)} />
                  <span><span className="cm-bigcheck-h">Applications / signups open</span><span className="cm-bigcheck-p">Adds an &quot;Open&quot; status and surfaces you to founders actively looking.</span></span>
                </label>
                <div className="cm-row2" style={{ marginTop: 14 }}>
                  <div className="cm-field cm-half"><label className="cm-label">Next intake / edition</label><input className="cm-input" value={form.intake} onChange={(e) => set('intake', e.target.value)} placeholder="e.g. Cohort 12 · Spring '26" /></div>
                  <div className="cm-field cm-half"><label className="cm-label">Key date / deadline</label><input className="cm-input" value={form.keyDate} onChange={(e) => set('keyDate', e.target.value)} placeholder="e.g. 30 Jun 2026" /></div>
                </div>
                <div className="cm-field" style={{ marginBottom: 0 }}><label className="cm-label">What you offer <span className="cm-opt">(optional)</span></label><input className="cm-input" value={form.offer} onChange={(e) => set('offer', e.target.value)} placeholder="e.g. $100K + 14-week program, equity-free" /></div>
              </div>
            )}

            {/* FOUNDER — REVIEW */}
            {step === 'review' && (
              <div>
                <p className="cm-intro">Quick check before you submit. You can jump back to any section to edit.</p>
                <div className="cm-review-sec">
                  <div className="cm-review-h">Your details <button className="cm-review-edit" onClick={() => setStep('identity')}>Edit</button></div>
                  <div className="cm-review-list">
                    <div className="cm-review-row"><span className="cm-review-k">Name</span><span className="cm-review-v">{form.first} {form.last}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Position</span><span className="cm-review-v">{form.position || '—'}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Email</span><span className="cm-review-v">{form.email}</span></div>
                  </div>
                </div>
                <div className="cm-review-sec">
                  <div className="cm-review-h">Company <button className="cm-review-edit" onClick={() => { setEditTab('info'); setStep('dataedits'); }}>Edit</button></div>
                  <div className="cm-review-list">
                    <div className="cm-review-row"><span className="cm-review-k">Name</span><span className="cm-review-v">{form.name}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Website</span><span className="cm-review-v">{form.website || '—'}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Sector</span><span className="cm-review-v">{form.sector || '—'}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Founded</span><span className="cm-review-v">{form.founded || '—'}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Location</span><span className="cm-review-v">{[form.coCity, form.coCountry].filter(Boolean).join(', ') || '—'}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">Funding rounds</span><span className="cm-review-v">{form.rounds.length}</span></div>
                    <div className="cm-review-row"><span className="cm-review-k">M&amp;A deals</span><span className="cm-review-v">{form.mna.length}</span></div>
                  </div>
                </div>
                <div className="cm-review-sec" style={{ marginBottom: 0 }}>
                  <div className="cm-review-h">Fundraising <button className="cm-review-edit" onClick={() => setStep('fundraising')}>Edit</button></div>
                  <div className="cm-review-list">
                    <div className="cm-review-row"><span className="cm-review-k">Actively raising</span><span className="cm-review-v">{form.raising ? 'Yes' : 'No'}</span></div>
                    {form.raising && <div className="cm-review-row"><span className="cm-review-k">Amount</span><span className="cm-review-v">{form.raiseMin && form.raiseMax ? `${form.raiseMin} – ${form.raiseMax}` : '—'}</span></div>}
                    {form.raising && <div className="cm-review-row"><span className="cm-review-k">Round(s)</span><span className="cm-review-v">{form.roundNames.join(', ') || '—'}</span></div>}
                    {form.raising && form.valuation && <div className="cm-review-row"><span className="cm-review-k">Valuation</span><span className="cm-review-v">{form.valuation}</span></div>}
                    {form.raising && <div className="cm-review-row"><span className="cm-review-k">Pitch deck</span><span className="cm-review-v">{form.deckName || 'None'}</span></div>}
                  </div>
                </div>
              </div>
            )}

            {/* DONE */}
            {isDone && R && (
              <div className="cm-done">
                <div className="cm-done-badge"><Check size={30} /></div>
                <h3 className="cm-done-h">{selMode === 'add' ? "We've got your details" : "You're in review"}</h3>
                <p className="cm-done-p">Thanks{form.first ? `, ${form.first}` : ''}. We&apos;ve received your {selMode === 'add' ? 'submission' : `request to claim ${form.name}`}. Here&apos;s what happens next.</p>
                <div className="cm-timeline">
                  <div className="cm-tl-row lit"><span className="cm-tl-ico"><Check size={15} /></span><span className="cm-tl-text"><span className="cm-tl-h">Submitted <span className="cm-tl-when">· just now</span></span><span className="cm-tl-p">Sent a confirmation to {form.email || 'your email'}.</span></span></div>
                  <div className="cm-tl-row"><span className="cm-tl-ico">2</span><span className="cm-tl-text"><span className="cm-tl-h">We verify the details <span className="cm-tl-when">· within 24–48h</span></span><span className="cm-tl-p">Our team confirms your role and your {R.noun} data. We may email you if anything needs a second look.</span></span></div>
                  <div className="cm-tl-row"><span className="cm-tl-ico">3</span><span className="cm-tl-text">
                    <span className="cm-tl-h">You go live <span className="cm-tl-when">{R.free ? '· verified badge + bonus' : '· claimed badge'}</span></span>
                    <span className="cm-tl-p">{R.free
                      ? 'Your profile is published with a verified badge, your 30-day Growth access switches on, and your Locker Room Report lands in your inbox.'
                      : 'Your profile is published with a claimed badge and management tools, and we\'ll walk you through keeping it current by email.'}</span>
                  </span></div>
                </div>
                <div className="cm-done-actions"><button className="cm-btn ghost" onClick={onClose}>Back to the platform</button></div>
              </div>
            )}
          </div>

          {/* FOOTER NAV */}
          {!preStep && !isDone && R && (
            <footer className="cm-foot">
              {(curIdx > 0 || !lockedTarget) ? (
                <button className="cm-btn ghost" onClick={goBack}><ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} /> Previous</button>
              ) : <span />}
              <span className="cm-foot-spacer" />
              {isLast && R.free && <span className="cm-foot-meta" style={{ marginRight: 4 }}>Free · ~5 min</span>}
              <button className="cm-btn" disabled={!stepValid() || submitting} onClick={goNext}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {submitLabel} {!submitting && (isLast ? <Check size={14} /> : <ArrowRight size={13} />)}
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
