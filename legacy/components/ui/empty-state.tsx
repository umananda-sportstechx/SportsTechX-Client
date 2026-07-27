import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** A lucide-react icon component. Rendered at h-16 w-16 muted. */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** `default` for centered-page empty states. `compact` for table-cell empty rows. */
  variant?: 'default' | 'compact';
}

/**
 * Standardized empty state. Replaces the various ad-hoc
 * "<div className="text-center py-16">..." patterns scattered through pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('text-center py-8 text-muted-foreground text-sm', className)}>
        {title}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      {Icon && <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />}
      <p className="text-base font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
