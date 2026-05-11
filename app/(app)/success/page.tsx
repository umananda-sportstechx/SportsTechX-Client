'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { queryClient } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { toast } from 'sonner';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [syncing, setSyncing] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setSyncing(false);
      toast.error('No payment session found');
      return;
    }

    // cancelled flag guards setState/toast calls if the user navigates away
    // mid-sync. apiRequest doesn't accept an AbortSignal, so we rely on this
    // flag instead of true cancellation — the request still resolves in the
    // background, we just don't react to it.
    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest('POST', '/api/billing/sync-from-session', { session_id: sessionId });
        const result = await res.json();
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: qk.profile() });
        if (cancelled) return;
        setPlanName(result.user_type ?? 'subscription');
        setSyncComplete(true);
        toast.success(`Your ${result.user_type ?? 'subscription'} plan has been activated`);
      } catch (err) {
        if (cancelled) return;
        toast.error('Payment received — still processing. Refresh or contact support if it persists.');
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Card className="text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            {syncing
              ? <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
              : <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />}
          </div>
          <CardTitle className="text-2xl">
            {syncing ? 'Processing Payment…' : syncComplete ? 'Payment Successful!' : 'Payment Complete'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {syncing
              ? 'We\'re activating your subscription…'
              : syncComplete
                ? `Your ${planName} plan is now active. All premium features are available.`
                : 'Your payment was processed successfully.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {sessionId && !syncing && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-3 py-2 inline-block">
              Session: {sessionId}
            </p>
          )}

          <ul className="text-sm text-muted-foreground text-left inline-block space-y-1 mx-auto">
            <li>• Your account has been automatically upgraded</li>
            <li>• A confirmation email is on its way</li>
            <li>• All premium features are now unlocked</li>
            <li>• Billing details are available in Settings</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild disabled={syncing}>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild disabled={syncing}>
              <Link href="/subscriptions"><ArrowLeft className="h-4 w-4 mr-2" />Back to Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
