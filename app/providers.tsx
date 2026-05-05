'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient, enableQueryPolling } from '@/lib/query-client';
import { logoutState } from '@/lib/logout-state';
import { FeatureAccessProvider } from '@/contexts/feature-access-context';
import { MobileNavProvider } from '@/contexts/mobile-nav-context';
import { useEffect } from 'react';

function AppInit() {
  useEffect(() => {
    if (!logoutState.isLoggingOut()) {
      enableQueryPolling();
    }
  }, []);
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
          <FeatureAccessProvider>
            <MobileNavProvider>
              <AppInit />
              {children}
              <Toaster richColors position="top-right" />
            </MobileNavProvider>
          </FeatureAccessProvider>
        </TooltipProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
