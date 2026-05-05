'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, Star, Zap, Crown } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import type { Profile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';

interface Plan {
  id: string; name: string; price_monthly: number; price_yearly: number;
  features: string[]; is_popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    features: ['Access to company database', 'Basic search', 'Dashboard overview', 'Up to 20 results per page'],
  },
  {
    id: 'plus',
    name: 'Plus',
    price_monthly: 49,
    price_yearly: 490,
    features: ['Everything in Free', 'Funding tracker', 'M&A tracker', 'Investor profiles', 'Advanced filters', 'Export to CSV'],
    is_popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price_monthly: 149,
    price_yearly: 1490,
    features: ['Everything in Plus', 'Analytics dashboard', 'Full report access', 'API access', 'Priority support', 'Custom saved searches', 'Team features'],
  },
];

function PlanIcon({ planId }: { planId: string }) {
  if (planId === 'pro') return <Crown className="h-5 w-5 text-yellow-500" />;
  if (planId === 'plus') return <Zap className="h-5 w-5 text-blue-500" />;
  return <Star className="h-5 w-5 text-muted-foreground" />;
}

export default function SubscriptionsPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['/api/profiles/me'],
    staleTime: 5 * 60_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest('POST', '/api/billing/checkout', { planId, interval: billing });
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/billing/portal');
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentTier = profile?.user_type?.toLowerCase() ?? 'free';

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground">Unlock the full power of SportsTechX intelligence</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant={billing === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBilling('monthly')}
          >Monthly</Button>
          <Button
            variant={billing === 'yearly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBilling('yearly')}
          >
            Yearly
            <Badge variant="success" className="ml-2 text-xs">Save 17%</Badge>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrent = currentTier === plan.id;
          const price = billing === 'monthly' ? plan.price_monthly : Math.round(plan.price_yearly / 12);
          return (
            <Card key={plan.id} className={cn('relative flex flex-col', plan.is_popular && 'border-primary shadow-lg', isCurrent && 'ring-2 ring-primary')}>
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="success" className="px-3">Current Plan</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2"><PlanIcon planId={plan.id} /></div>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                  {billing === 'yearly' && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">${plan.price_yearly}/year</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                      {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Manage Billing
                    </Button>
                  ) : plan.id === 'free' ? (
                    <Button variant="outline" className="w-full" disabled>Free Forever</Button>
                  ) : (
                    <Button
                      className={cn('w-full', plan.is_popular && 'bg-primary')}
                      onClick={() => checkoutMutation.mutate(plan.id)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {currentTier === 'free' ? 'Get Started' : 'Switch Plan'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        All plans include 14-day money-back guarantee. Prices in USD. Billed via Stripe.
      </p>
    </div>
  );
}
