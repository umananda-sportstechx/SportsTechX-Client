import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  /**
   * `centered` (default) — for content pages with `max-w-Xxl mx-auto p-4 md:p-8`
   * (settings, dashboard, admin, subscriptions). Renders a 2xl bold title.
   * `inline` — for table-layout pages (companies, investors, etc.) where the
   * header sits in a single border-bottom row alongside search + filters.
   * Renders a smaller `text-lg font-semibold`.
   */
  variant?: 'centered' | 'inline';
}

/**
 * Standardized page header. Use everywhere instead of hand-rolling
 * `<h1 className="text-2xl font-bold">` patterns. Keeps typography
 * consistent across all pages.
 */
export function PageHeader({ title, subtitle, actions, className, variant = 'centered' }: PageHeaderProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <h1 className="font-semibold text-lg shrink-0">{title}</h1>
        {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
