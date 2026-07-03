// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function confidenceColor(score: number): string {
  if (score >= 95) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-danger';
}

export function confidenceBg(score: number): string {
  if (score >= 95) return 'bg-success';
  if (score >= 70) return 'bg-warning';
  return 'bg-danger';
}

export function statusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    MATCHED: { label: 'Matched', className: 'bg-success/10 text-success-text' },
    MANUALLY_MATCHED: { label: 'Matched', className: 'bg-success/10 text-success-text' },
    IN_REVIEW: { label: 'Review', className: 'bg-warning/10 text-warning-text' },
    EXCEPTION: { label: 'Exception', className: 'bg-danger/10 text-danger-text' },
    UNMATCHED: { label: 'Unmatched', className: 'bg-gray-100 text-gray-500' },
    PAID: { label: 'Paid', className: 'bg-success/10 text-success-text' },
    PENDING: { label: 'Pending', className: 'bg-info/10 text-info-text' },
    OVERDUE: { label: 'Overdue', className: 'bg-danger/10 text-danger-text' },
    PARTIAL: { label: 'Partial', className: 'bg-warning/10 text-warning-text' },
    OVERPAID: { label: 'Overpaid', className: 'bg-violet-100 text-violet-700' },
    OPEN: { label: 'Open', className: 'bg-danger/10 text-danger-text' },
    RESOLVED: { label: 'Resolved', className: 'bg-success/10 text-success-text' },
  };
  return map[status] || { label: status, className: 'bg-gray-100 text-gray-500' };
}
