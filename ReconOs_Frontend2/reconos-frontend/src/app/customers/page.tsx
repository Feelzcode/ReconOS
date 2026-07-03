'use client';
// src/app/customers/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, Badge, PageHeader, Btn, EmptyState, ViewportTable, ViewportCards, DataCard, DataCardHeader, DataCardRow, DataCardActions } from '@/components/ui';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EditCustomerModal from '@/components/ui/EditCustomerModal';
import { formatNaira } from '@/lib/utils';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { sanitizeMerchantError } from '@/lib/merchant-vocabulary';
import toast from 'react-hot-toast';

function paymentReadiness(hasAccount: boolean) {
  if (hasAccount) {
    return (
      <span className="text-[11px] font-semibold text-success flex items-center gap-1">
        <span aria-hidden>🟢</span> Ready to receive payments
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold text-warning-text">Payment account not created</span>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const labels = useMerchantLabels();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  const readyCount = customers.filter((c: any) => c.virtualAccountNumber).length;

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/customers', data),
    onSuccess: () => {
      toast.success('Payment account created');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setForm({ name: '', email: '', phone: '' });
    },
    onError: (err: any) => {
      toast.error(
        sanitizeMerchantError(
          err?.response?.data?.message,
          `Failed to create ${labels.customer.toLowerCase()}`,
        ),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success(`${labels.customer} deleted`);
      qc.invalidateQueries({ queryKey: ['customers'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        sanitizeMerchantError(
          err?.response?.data?.message,
          `Could not delete ${labels.customer.toLowerCase()}`,
        ),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; phone: string } }) =>
      api.patch(`/customers/${id}`, data),
    onSuccess: () => {
      toast.success(`${labels.customer} updated`);
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        sanitizeMerchantError(
          err?.response?.data?.message,
          `Failed to update ${labels.customer.toLowerCase()}`,
        ),
      );
    },
  });

  function confirmDelete() {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const avatarColors = [
    'from-yellow-400 to-red-500', 'from-blue-500 to-indigo-600',
    'from-emerald-400 to-teal-600', 'from-purple-500 to-violet-600',
    'from-pink-500 to-rose-600',
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title={labels.customers}
        subtitle={`${customers.length} ${labels.customers.toLowerCase()} · ${readyCount} ready to receive payments`}
      >
        <Btn onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add {labels.customer}
        </Btn>
      </PageHeader>

      {showForm && (
        <Card className="mb-5">
          <CardHeader title={`New ${labels.customer}`} subtitle="A dedicated payment account will be created automatically">
            <Btn variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
          </CardHeader>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'name', label: 'Business Name', placeholder: 'Alaba Electronics Ltd', required: true },
                { key: 'email', label: 'Email', placeholder: 'accounts@business.ng' },
                { key: 'phone', label: 'Phone', placeholder: '08012345678' },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
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
            <div className="mt-4 flex gap-2">
              <Btn onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Payment Account'}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted border border-border rounded-sm px-3 py-1.5 flex-1 min-w-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${labels.customers.toLowerCase()}…`} className="bg-transparent outline-none text-sm w-full" />
          </div>
          <span className="text-xs text-muted-foreground sm:ml-auto">{filtered.length} results</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:hidden">Loading {labels.customers.toLowerCase()}…</div>
        ) : filtered.length === 0 ? (
          <div className="lg:hidden"><EmptyState title={`No ${labels.customers.toLowerCase()} yet`} description={`Add your first ${labels.customer.toLowerCase()} to get started`} /></div>
        ) : (
          <ViewportCards>
            {filtered.map((c: any, i: number) => {
              const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const overdueCount = c.invoices?.filter((inv: any) => inv.status === 'OVERDUE').length || 0;
              const totalPaid = c.invoices?.filter((inv: any) => inv.status === 'PAID').reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0;
              const openCount = c.invoices?.filter((inv: any) => ['PENDING', 'PARTIAL'].includes(inv.status)).length || 0;

              return (
                <DataCard key={c.id}>
                  <DataCardHeader
                    title={
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div>{c.name}</div>
                          <div className="text-xs font-normal text-muted-foreground">{c.email}</div>
                        </div>
                      </div>
                    }
                    trailing={<Badge status={overdueCount > 0 ? 'OVERDUE' : 'MATCHED'} />}
                  />
                  <div className="mb-2">{paymentReadiness(!!c.virtualAccountNumber)}</div>
                  <DataCardRow label="Bank">{c.bankName || 'Wema Bank'}</DataCardRow>
                  <DataCardRow label="Account">
                    {c.virtualAccountNumber ? (
                      <span className="font-mono text-xs">{c.virtualAccountNumber}</span>
                    ) : '—'}
                  </DataCardRow>
                  <DataCardRow label="Total paid">{formatNaira(totalPaid)}</DataCardRow>
                  <DataCardRow label={`Open ${labels.invoices}`}>
                    {overdueCount > 0 ? (
                      <Badge status="OVERDUE" />
                    ) : openCount > 0 ? (
                      `${openCount} open`
                    ) : (
                      <span className="text-success font-semibold">All paid</span>
                    )}
                  </DataCardRow>
                  <DataCardActions>
                    <Link href={`/customers/${c.id}/statement`} className="text-xs font-semibold text-info hover:underline py-1.5 px-2">
                      Statement
                    </Link>
                    <button type="button" onClick={() => setEditTarget(c)} className="text-xs font-semibold text-foreground hover:underline py-1.5 px-2">
                      Edit
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(c)} disabled={deleteMutation.isPending} className="text-xs font-semibold text-danger hover:underline py-1.5 px-2 disabled:opacity-50">
                      Delete
                    </button>
                  </DataCardActions>
                </DataCard>
              );
            })}
          </ViewportCards>
        )}

        <ViewportTable>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {[labels.customer, 'Bank', 'Account Number', 'Total Paid', `Open ${labels.invoices}`, 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">Loading {labels.customers.toLowerCase()}…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title={`No ${labels.customers.toLowerCase()} yet`} description={`Add your first ${labels.customer.toLowerCase()} to get started`} /></td></tr>
              ) : filtered.map((c: any, i: number) => {
                const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const overdueCount = c.invoices?.filter((inv: any) => inv.status === 'OVERDUE').length || 0;
                const totalPaid = c.invoices?.filter((inv: any) => inv.status === 'PAID').reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0;
                const openCount = c.invoices?.filter((inv: any) => ['PENDING', 'PARTIAL'].includes(inv.status)).length || 0;

                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                          <div className="mt-1">{paymentReadiness(!!c.virtualAccountNumber)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{c.bankName || 'Wema Bank'}</td>
                    <td className="px-5 py-4">
                      {c.virtualAccountNumber ? (
                        <div className="inline-flex items-center gap-1.5 bg-muted border border-border rounded-sm px-2.5 py-1 font-mono text-xs text-foreground">
                          {c.virtualAccountNumber}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">{formatNaira(totalPaid)}</td>
                    <td className="px-5 py-4">
                      {overdueCount > 0 ? (
                        <Badge status="OVERDUE" />
                      ) : openCount > 0 ? (
                        <span className="text-xs text-muted-foreground">{openCount} open</span>
                      ) : (
                        <span className="text-xs text-success font-semibold">All paid</span>
                      )}
                    </td>
                    <td className="px-5 py-4"><Badge status={overdueCount > 0 ? 'OVERDUE' : 'MATCHED'} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/customers/${c.id}/statement`} className="text-xs font-semibold text-info hover:underline">
                          View Statement →
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditTarget(c)}
                          className="text-xs font-semibold text-foreground hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          disabled={deleteMutation.isPending}
                          className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ViewportTable>
      </Card>

      <EditCustomerModal
        open={!!editTarget}
        customer={editTarget}
        loading={updateMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSave={(data) => {
          if (editTarget) updateMutation.mutate({ id: editTarget.id, data });
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${labels.customer.toLowerCase()}?`}
        description={
          deleteTarget ? (
            <>
              <span className="font-semibold text-foreground">{deleteTarget.name}</span>
              {deleteTarget.email && <> · {deleteTarget.email}</>}
              {deleteTarget.virtualAccountNumber ? (
                <span className="block mt-2 font-mono text-xs bg-muted border border-border rounded-sm px-2 py-1 inline-block">
                  {deleteTarget.virtualAccountNumber}
                </span>
              ) : (
                <span className="block mt-2 text-warning-text">Payment account not created</span>
              )}
              <span className="block mt-2">This removes the {labels.customer.toLowerCase()} from ReconOs only. It cannot be undone.</span>
            </>
          ) : null
        }
        confirmLabel={`Delete ${labels.customer.toLowerCase()}`}
        cancelLabel={`Keep ${labels.customer.toLowerCase()}`}
        variant="danger"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
}
