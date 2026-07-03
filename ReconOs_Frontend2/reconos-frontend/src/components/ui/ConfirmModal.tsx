'use client';

import { useEffect } from 'react';
import { Btn } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={loading ? undefined : onClose}
      />
      <div
        className="relative bg-white border border-border rounded-DEFAULT shadow-xl max-w-md w-full modal-panel-enter overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(
          'px-6 pt-6 pb-4 border-b border-border',
          variant === 'danger' ? 'bg-gradient-to-br from-red-50/80 to-white' : 'bg-gradient-to-br from-slate-50/80 to-white',
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 text-lg border',
              variant === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-primary/5 border-border text-primary',
            )}>
              {variant === 'danger' ? '⚠' : '?'}
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 id="confirm-modal-title" className="text-base font-bold text-foreground tracking-tight">
                {title}
              </h3>
              <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {description}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-2 bg-white">
          <Btn variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Btn>
          <Btn
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'bg-danger text-white border-danger hover:bg-red-700 hover:border-red-700' : undefined}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
