/**
 * Only an Explore (free) user can be in a sandbox. getUserType records the
 * viewer's real tier here every time it runs, so the interceptor and the tier
 * override never act for a paid account (or before the profile has loaded).
 */
let realTier: string | null = null;
export const noteRealTier = (tier: string) => { realTier = tier; };
export const isSandboxEligible = () => realTier === 'explore';
