'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Authenticated-shell error boundary. Catches errors thrown inside any
 * (app)/ page so the sidebar + header stay rendered and the user can
 * navigate elsewhere instead of bouncing to the global app/error.tsx.
 */
export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[AppShellError]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Couldn't load this page</h2>
        <p className="text-sm text-muted-foreground mb-2">
          {process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong.'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono mb-6">Reference: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
