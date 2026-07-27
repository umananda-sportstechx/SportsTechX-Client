'use client';

import { Building2, Wallet, Compass, ArrowRight } from 'lucide-react';
import type { AccountType } from '@/hooks/use-user-profile';

const PERSONAS: { id: AccountType; label: string; desc: string; icon: typeof Building2 }[] = [
  { id: 'founder', label: "I'm a founder", desc: 'Claim and verify your company so investors see the details you control.', icon: Building2 },
  { id: 'investor', label: "I'm an investor", desc: 'Claim your fund or syndicate and get founders actively raising in front of you.', icon: Wallet },
  { id: 'user', label: 'Just exploring', desc: 'Browse companies, investors, deals and reports across sports tech.', icon: Compass },
];

/**
 * First onboarding step — the user self-declares a persona. Founder/investor
 * branch into the claim wizard; "just exploring" finishes straight to the app.
 */
export function PersonaStep({ onChoose }: { onChoose: (persona: AccountType) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {PERSONAS.map((p) => {
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChoose(p.id)}
            className="group flex items-center gap-4 rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-foreground/40 hover:bg-accent/5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-foreground">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15px] font-bold leading-tight">{p.label}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{p.desc}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        );
      })}
    </div>
  );
}
