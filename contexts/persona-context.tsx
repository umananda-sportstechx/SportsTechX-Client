'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';

/**
 * Active workspace persona. Drives the persona "Copilot" workspace — the
 * founder Fundraising Copilot and investor Dealflow Copilot nav groups + home
 * screens (ported from ui_design/app/nav.jsx + copilot*.jsx).
 *
 * Default = `general` (the classic intelligence-hub experience). Seeded from
 * the profile's self-declared `account_type` (set at onboarding), but the user
 * can switch personas from the topbar; that choice is persisted to localStorage
 * and takes precedence over the profile default.
 */
export type Persona = 'founder' | 'investor' | 'general';

const STORAGE_KEY = 'stx:persona';

interface PersonaContextValue {
	persona: Persona;
	setPersona: (p: Persona) => void;
}

const PersonaContext = createContext<PersonaContextValue>({
	persona: 'general',
	setPersona: () => {},
});

/** Map the onboarding `account_type` ('founder' | 'investor' | 'user') → persona. */
function personaFromAccountType(t: string | null | undefined): Persona {
	if (t === 'founder') return 'founder';
	if (t === 'investor') return 'investor';
	return 'general';
}

export function PersonaProvider({ children }: { children: React.ReactNode }) {
	const { data: profile } = useUserProfile();
	// SSR-safe default; the stored override / profile seed are applied on mount.
	const [persona, setPersonaState] = useState<Persona>('general');
	const [overridden, setOverridden] = useState(false);

	// Restore an explicit user override (topbar switch) on mount.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === 'founder' || stored === 'investor' || stored === 'general') {
				setPersonaState(stored);
				setOverridden(true);
			}
		} catch { /* ignore */ }
	}, []);

	// Seed from the profile's account_type until the user explicitly overrides.
	useEffect(() => {
		if (overridden || !profile) return;
		setPersonaState(personaFromAccountType(profile.account_type));
	}, [profile, overridden]);

	const setPersona = useCallback((p: Persona) => {
		setPersonaState(p);
		setOverridden(true);
		try { localStorage.setItem(STORAGE_KEY, p); } catch { /* ignore */ }
	}, []);

	return (
		<PersonaContext.Provider value={{ persona, setPersona }}>
			{children}
		</PersonaContext.Provider>
	);
}

export function usePersona(): PersonaContextValue {
	return useContext(PersonaContext);
}
