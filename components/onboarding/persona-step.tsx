'use client';

import { Building2, Wallet, Compass, ArrowRight } from 'lucide-react';
import type { AccountType } from '@/hooks/use-user-profile';
import './onboarding.css';

const PERSONAS: { id: AccountType; label: string; desc: string; icon: typeof Building2 }[] = [
  { id: 'founder', label: "I'm a founder", desc: 'Claim and verify your company so investors see the details you control.', icon: Building2 },
  { id: 'investor', label: "I'm an investor", desc: 'Claim your fund or syndicate and get founders actively raising in front of you.', icon: Wallet },
  { id: 'user', label: 'Just exploring', desc: 'Browse companies, investors, deals and reports across sports tech.', icon: Compass },
];

/**
 * First onboarding step — the user self-declares a persona. Founder/investor
 * branch into the claim wizard; "just exploring" finishes straight to the app.
 *
 * Three options on purpose. The `ATLAS Base` mockup has an eleven-option
 * "Which best describes you?" — but that is a *background* question inside a
 * five-step personalisation wizard, a different thing from this one, which sets
 * `account_type` and therefore which product the user lands in.
 */
export function PersonaStep({ onChoose }: { onChoose: (persona: AccountType) => void }) {
  return (
    <div className="onb-personas">
      {PERSONAS.map((p) => {
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChoose(p.id)}
            className="onb-persona"
          >
            <span className="onb-persona__icon">
              <Icon size={20} />
            </span>
            <span className="onb-persona__body">
              <span className="onb-persona__label">{p.label}</span>
              <span className="onb-persona__desc">{p.desc}</span>
            </span>
            <ArrowRight size={16} className="onb-persona__go" />
          </button>
        );
      })}
    </div>
  );
}
