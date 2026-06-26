'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsAdmin } from '@/hooks/use-user-profile';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import {
  Home, Globe, Book, Database, Building2, DollarSign, Handshake,
  TrendingUp, Network, CalendarDays, CreditCard, Settings, Code,
  Link2, Key, FileText, ChevronDown, ChevronRight, Menu, X, Lock,
} from 'lucide-react';

// ── Navigation structure ─────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  featureSlug?: string;
  isCategory?: boolean;
  adminOnly?: boolean;
  subItems?: NavItem[];
}

const topNav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'framework', label: 'Framework', icon: Globe, path: '/framework' },
  { id: 'reports', label: 'Reports', icon: Book, path: '/reports' },
  {
    id: 'database', label: 'Databases', icon: Database, isCategory: true,
    subItems: [
      { id: 'companies', label: 'Companies', icon: Building2, path: '/companies' },
      { id: 'funding', label: 'Funding Tracker', icon: DollarSign, path: '/funding', featureSlug: 'funding_page_access' },
      { id: 'ma', label: 'M&A Tracker', icon: Handshake, path: '/ma', featureSlug: 'm&a_page_access' },
    ],
  },
  {
    id: 'ecosystem', label: 'Ecosystem', icon: Network, isCategory: true,
    subItems: [
      { id: 'investors', label: 'Investors', icon: DollarSign, path: '/investors', featureSlug: 'investors_page_access' },
      { id: 'programs', label: 'Programs', icon: Building2, path: '/programs', featureSlug: 'programs_page_access' },
      { id: 'events', label: 'Events', icon: CalendarDays, path: '/events', featureSlug: 'events_page_access' },
    ],
  },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' },
];

const bottomNav: NavItem[] = [
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, path: '/subscriptions' },
  {
    id: 'developers', label: 'Developers', icon: Code, isCategory: true, adminOnly: true,
    subItems: [
      { id: 'integrations', label: 'Integrations', icon: Link2, path: '/integrations' },
      { id: 'api-keys', label: 'API Keys', icon: Key, path: '/api-keys' },
      { id: 'api-docs', label: 'API Docs', icon: FileText, path: '/api-docs' },
    ],
  },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

// ── Single nav item ──────────────────────────────────────────────────────────

function NavItemButton({
  item, collapsed, expanded, toggleExpanded, onNavigate, isSubItem = false,
}: {
  item: NavItem; collapsed: boolean; expanded: string[]; toggleExpanded: (id: string) => void;
  onNavigate?: () => void; isSubItem?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthSession();
  const access = useFeatureAccess(item.featureSlug ?? '');
  const hasAccess = !item.featureSlug || access.hasAccess;
  // Only mark locked once entitlement is known — not while the matrix is loading
  // or failed to load (avoids a brief lock flash on gated nav items).
  const entitlementKnown = !access.isLoading && !access.error;
  const locked = user ? (entitlementKnown && !hasAccess) : !!item.featureSlug;

  const hasSubItems = !!item.subItems?.length;
  const isExpanded = expanded.includes(item.id);
  const isActive = hasSubItems
    ? item.subItems!.some(s => pathname === s.path || pathname.startsWith(s.path + '/'))
    : pathname === item.path || (pathname === '/' && item.path === '/dashboard') ||
      (isSubItem && item.path ? pathname.startsWith(item.path) : false);

  const Icon = item.icon;

  const handleClick = () => {
    if (!user && item.featureSlug) {
      router.push('/dashboard?showAuth=true');
      onNavigate?.();
      return;
    }
    if (hasSubItems || item.isCategory) {
      if (!collapsed) toggleExpanded(item.id);
    } else if (item.path) {
      router.push(item.path);
      onNavigate?.();
    }
  };

  return (
    <Button
      variant="ghost"
      size={isSubItem ? 'sm' : 'default'}
      onClick={handleClick}
      className={cn(
        'w-full justify-start transition-colors',
        isSubItem ? 'text-sm font-normal' : 'text-sm font-medium',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className={cn(isSubItem ? 'mr-2 h-3 w-3' : 'h-5 w-5', collapsed && !isSubItem ? 'mx-auto' : isSubItem ? '' : 'mr-3')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{item.label}</span>
          {locked && <Lock className={cn('ml-2 text-muted-foreground', isSubItem ? 'h-3 w-3' : 'h-4 w-4')} />}
          {hasSubItems && !locked && (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
        </>
      )}
    </Button>
  );
}

// ── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({
  collapsed, setCollapsed, onNavigate, showCollapseButton = true,
}: {
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  onNavigate?: () => void; showCollapseButton?: boolean;
}) {
  const [expanded, setExpanded] = useState<string[]>(['database', 'ecosystem']);
  const { isAdmin } = useIsAdmin();
  const router = useRouter();

  const toggleExpanded = (id: string) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const renderItems = (items: NavItem[]) =>
    items.map(item => {
      if (item.adminOnly && !isAdmin) return null;
      const hasSubItems = !!item.subItems?.length;
      const isExpanded = expanded.includes(item.id);
      return (
        <div key={item.id}>
          <NavItemButton item={item} collapsed={collapsed} expanded={expanded} toggleExpanded={toggleExpanded} onNavigate={onNavigate} />
          {hasSubItems && isExpanded && !collapsed && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
              {item.subItems!.map(sub => (
                <NavItemButton key={sub.id} item={sub} collapsed={collapsed} expanded={expanded} toggleExpanded={toggleExpanded} onNavigate={onNavigate} isSubItem />
              ))}
            </div>
          )}
        </div>
      );
    });

  const handleLogout = async () => {
    const { getSupabaseBrowser } = await import('@/lib/supabase/client');
    const { logoutState } = await import('@/lib/logout-state');
    const { disableQueryPolling } = await import('@/lib/query-client');
    const { mutate } = await import('swr');
    logoutState.startLogout();
    disableQueryPolling();
    await mutate(() => true, undefined, { revalidate: false });
    await getSupabaseBrowser().auth.signOut();
    router.push('/login');
  };

  return (
    <div className="bg-sidebar-background text-sidebar-foreground h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link href="/dashboard" className="block">
              <span className="text-xl font-bold tracking-wider text-sidebar-primary font-display">
                SPORTSTECHX
              </span>
            </Link>
          )}
          {showCollapseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 p-0 hover:bg-sidebar-accent"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Top nav */}
      <nav className="flex-1 flex flex-col py-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-3 space-y-0.5 flex-1">
          {renderItems(topNav)}
        </div>

        {/* Bottom nav */}
        <div className="px-3 mt-4 pt-4 border-t border-sidebar-border space-y-0.5">
          {renderItems(bottomNav)}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {!collapsed && 'Sign Out'}
          </Button>
        </div>
      </nav>
    </div>
  );
}

// ── Exported Sidebar ─────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={cn('hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-sidebar-border transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
      <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 z-50 h-full w-64 lg:hidden">
        <SidebarContent collapsed={false} setCollapsed={() => {}} onNavigate={onClose} showCollapseButton={false} />
      </aside>
    </>
  );
}
