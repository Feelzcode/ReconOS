import { cn } from '@/lib/utils';

/** Full table layout — visible on large screens (≥1024px) only. */
export function ViewportTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hidden lg:block overflow-x-auto', className)}>{children}</div>;
}

/** Stacked card layout — phone and tablet (<1024px). */
export function ViewportCards({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('lg:hidden divide-y divide-border', className)}>{children}</div>;
}

export function DataCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 sm:p-5 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
        className,
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export function DataCardHeader({
  title,
  subtitle,
  trailing,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-foreground leading-snug">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

export function DataCardRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5', className)}>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
        {label}
      </span>
      <div className="text-sm font-medium text-foreground text-right min-w-0">{children}</div>
    </div>
  );
}

export function DataCardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">{children}</div>;
}
