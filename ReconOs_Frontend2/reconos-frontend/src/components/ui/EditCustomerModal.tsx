'use client';

import { useEffect, useState } from 'react';
import { Btn } from '@/components/ui';

export interface EditCustomerModalProps {
  open: boolean;
  customer: { id: string; name: string; email?: string | null; phone?: string | null; virtualAccountNumber?: string | null } | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone: string }) => void;
}

export default function EditCustomerModal({
  open,
  customer,
  loading = false,
  onClose,
  onSave,
}: EditCustomerModalProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
      });
    }
  }, [customer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-enter" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={loading ? undefined : onClose}
      />
      <div
        className="relative bg-white border border-border rounded-DEFAULT shadow-xl max-w-lg w-full modal-panel-enter overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-slate-50/80 to-white">
          <h3 className="text-base font-bold text-foreground tracking-tight">Edit customer</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update name and contact details. Payment account{' '}
            {customer.virtualAccountNumber ? (
              <span className="font-mono text-xs">{customer.virtualAccountNumber}</span>
            ) : (
              'number'
            )}{' '}
            stays the same.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {[
            { key: 'name', label: 'Name', placeholder: 'Dorathy Adeyemi (JSS2)', required: true },
            { key: 'email', label: 'Email', placeholder: 'parent@email.com' },
            { key: 'phone', label: 'Phone', placeholder: '08012345678' },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                required={required}
                className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-border bg-white">
          <Btn variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || loading}
          >
            {loading ? 'Saving…' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
