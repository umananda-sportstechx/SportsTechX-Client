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
	/** False until the persona has been resolved from localStorage + profile.
	 *  Gates (e.g. /copilot route guards) must wait for this to avoid acting on
	 *  the SSR-default 'general' before the real persona loads. */
	ready: boolean;
}

const PersonaContext = createContext<PersonaContextValue>({
	persona: 'general',
	setPersona: () => {},
	ready: false,
});

/** Map the onboarding `account_type` ('founder' | 'investor' | 'user') → persona. */
function personaFromAccountType(t: string | null | undefined): Persona {
	if (t === 'founder') return 'founder';
	if (t === 'investor') return 'investor';
	return 'general';
}

export function PersonaProvider({ children }: { children: React.ReactNode }) {
	const { data: profile, isLoading } = useUserProfile();
	// SSR-safe default; the stored override / profile seed are applied on mount.
	const [persona, setPersonaState] = useState<Persona>('general');
	const [overridden, setOverridden] = useState(false);
	const [mountChecked, setMountChecked] = useState(false);

	// Restore an explicit user override (topbar switch) on mount.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === 'founder' || stored === 'investor' || stored === 'general') {
				setPersonaState(stored);
				setOverridden(true);
			}
		} catch { /* ignore */ }
		setMountChecked(true);
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

	// Resolved once we've read localStorage AND either the user has an explicit
	// override or the profile fetch has settled (data or confirmed absent).
	const ready = mountChecked && (overridden || !isLoading);

	return (
		<PersonaContext.Provider value={{ persona, setPersona, ready }}>
			{children}
		</PersonaContext.Provider>
	);
}

export function usePersona(): PersonaContextValue {
	return useContext(PersonaContext);
}
