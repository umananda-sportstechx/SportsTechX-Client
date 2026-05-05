'use client';

import { useState } from 'react';
import { Menu, Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MobileSidebar } from '@/components/sidebar';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: profile } = useUserProfile();
  const router = useRouter();

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  const handleLogout = async () => {
    const { getSupabaseBrowser } = await import('@/lib/supabase/client');
    const { logoutState } = await import('@/lib/logout-state');
    const { disableQueryPolling, queryClient } = await import('@/lib/query-client');
    logoutState.startLogout();
    disableQueryPolling();
    queryClient.clear();
    await getSupabaseBrowser().auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search — spacer on left */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.display_name ?? ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.display_name ?? 'Account'}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/subscriptions')}>Subscription</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
