'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient, enableQueryPolling } from '@/lib/query-client';
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
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
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
