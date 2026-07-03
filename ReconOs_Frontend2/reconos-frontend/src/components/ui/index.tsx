// src/components/ui/index.tsx
import { cn, statusBadge, confidenceBg } from '@/lib/utils';

// ── BADGE ────────────────────────────────────────────────────
export function Badge({ status, className }: { status: string; className?: string }) {
  const { label, className: cls } = statusBadge(status);
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', cls, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// ── CARD ─────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-DEFAULT shadow-card overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── STAT CARD ────────────────────────────────────────────────
export function StatCard({
  label, value, delta, deltaUp, highlight, className,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      'rounded-DEFAULT border p-5 shadow-card',
      highlight ? 'bg-primary border-primary text-white' : 'bg-white border-border',
      className
    )}>
      <div className={cn('text-[11px] font-bold uppercase tracking-wider mb-2', highlight ? 'text-white/60' : 'text-muted-foreground')}>
        {label}
      </div>
      <div className={cn('text-3xl font-extrabold tracking-tight leading-none mb-1.5', highlight ? 'text-white' : 'text-foreground')}>
        {value}
      </div>
      {delta && (
        <div className={cn('text-xs flex items-center gap-1', deltaUp ? (highlight ? 'text-emerald-300' : 'text-success') : 'text-muted-foreground')}>
          {deltaUp && '↑ '}{delta}
        </div>
      )}
    </div>
  );
}

// ── CONFIDENCE BAR ────────────────────────────────────────────
export function ConfidenceBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={cn('h-full rounded-full conf-bar-fill', confidenceBg(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-bold min-w-[30px]', score >= 95 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-danger')}>
          {score}%
        </span>
      )}
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 bg-muted rounded-DEFAULT flex items-center justify-center mb-3 text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="text-sm font-bold text-foreground mb-1">{title}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
  );
}

// ── TABLE ─────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-5 py-3 border-b border-border bg-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b border-border last:border-0', onClick && 'cursor-pointer hover:bg-muted/50 transition-colors')}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 text-sm align-middle', className)}>{children}</td>;
}

// ── BUTTON ────────────────────────────────────────────────────
export function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled, className, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-gray-800',
    secondary: 'bg-white border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
    >
      {children}
    </button>
  );
}

// ── PAGE HEADER ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">{children}</div>
      )}
    </div>
  );
}

export {
  ViewportTable,
  ViewportCards,
  DataCard,
  DataCardHeader,
  DataCardRow,
  DataCardActions,
} from './responsive-list';
