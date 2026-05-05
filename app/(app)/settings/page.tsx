'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Lock, Bell, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/query-client';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/hooks/use-user-profile';

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['/api/profiles/me'],
    staleTime: 5 * 60_000,
  });

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dirty, setDirty] = useState(false);

  // Sync form on profile load
  if (profile && !dirty) {
    if (displayName === '' && profile.display_name) setDisplayName(profile.display_name);
    if (jobTitle === '' && profile.job_title) setJobTitle(profile.job_title);
    if (companyName === '' && profile.company_name) setCompanyName(profile.company_name);
  }

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await apiRequest('PATCH', '/api/profiles/me', body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/profiles/me'] });
      toast.success('Profile updated');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ display_name: displayName, job_title: jobTitle, company_name: companyName });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email ?? ''} disabled className="opacity-70" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display Name</Label>
            <Input id="display-name" value={displayName} onChange={e => { setDisplayName(e.target.value); setDirty(true); }} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job Title</Label>
              <Input id="job-title" value={jobTitle} onChange={e => { setJobTitle(e.target.value); setDirty(true); }} placeholder="Analyst" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={companyName} onChange={e => { setCompanyName(e.target.value); setDirty(true); }} placeholder="Acme Corp" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !dirty}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Subscription</CardTitle>
          <CardDescription>Manage your plan and billing.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{profile?.user_type ?? 'Free'} Plan</p>
              <p className="text-sm text-muted-foreground">{profile?.is_trial ? 'Trial active' : 'Active subscription'}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/subscriptions')}>Manage</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Account</CardTitle>
          <CardDescription>Security settings for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => router.push('/forgot-password')}>Change Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
