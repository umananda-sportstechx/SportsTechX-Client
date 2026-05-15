'use client';

import { SWRConfig } from 'swr';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { swrConfig, enableQueryPolling } from '@/lib/query-client';
import { logoutState } from '@/lib/logout-state';
import { AuthSessionProvider } from '@/contexts/auth-session-context';
import { useAuthSession } from '@/hooks/use-auth-session';
import { FeatureAccessProvider } from '@/contexts/feature-access-context';
import { MobileNavProvider } from '@/contexts/mobile-nav-context';
import { useUserProfile } from '@/hooks/use-user-profile';
import { identify, initAnalytics, reset } from '@/lib/analytics';
import { useEffect } from 'react';

function AppInit() {
  const { sessionValid } = useAuthSession();
  const { data: profile } = useUserProfile();

  useEffect(() => {
    if (!logoutState.isLoggingOut()) {
      enableQueryPolling();
    }
    initAnalytics();
  }, []);

  useEffect(() => {
    if (sessionValid && profile?.id) {
      identify(profile.id, {
        $email: profile.email ?? undefined,
        $name: profile.display_name ?? undefined,
        tier: profile.user_type ?? 'free',
      });
    } else if (!sessionValid) {
      reset();
    }
  }, [sessionValid, profile?.id, profile?.email, profile?.display_name, profile?.user_type]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="stx:theme"
      >
        <TooltipProvider delayDuration={300}>
          {/* AuthSessionProvider must wrap FeatureAccessProvider because the
              latter reads `sessionValid` / `loading` to gate its own queries. */}
          <AuthSessionProvider>
            <FeatureAccessProvider>
              <MobileNavProvider>
                <AppInit />
                {children}
                <Toaster richColors position="top-right" />
              </MobileNavProvider>
            </FeatureAccessProvider>
          </AuthSessionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
