'use client';
// src/app/invoices/page.tsx
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, StatCard, Badge, PageHeader, Btn, ViewportTable, ViewportCards, DataCard, DataCardHeader, DataCardRow, DataCardActions } from '@/components/ui';
import { DeliverPaymentModal } from '@/components/invoices/DeliverPaymentModal';
import { formatNaira, formatDate } from '@/lib/utils';
import { useMerchantLabels } from '@/lib/merchant-labels';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const qc = useQueryClient();
  const labels = useMerchantLabels();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deliverInvoice, setDeliverInvoice] = useState<any | null>(null);
  const [form, setForm] = useState({ customerId: '', description: '', amount: '', dueDate: '', notes: '' });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get('/invoices', { params: statusFilter !== 'ALL' ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: (res) => {
      const inv = res.data;
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setForm({ customerId: '', description: '', amount: '', dueDate: '', notes: '' });
      setDeliverInvoice(inv);
    },
    onError: () => toast.error('Failed to create invoice'),
  });

  const selectedCustomer = customers.find((c: any) => c.id === form.customerId);
  const invoiceAmount = Number(form.amount) || 0;
  const walletPreview =
    selectedCustomer && selectedCustomer.walletBalance > 0 && invoiceAmount > 0
      ? (() => {
          const applied = Math.min(selectedCustomer.walletBalance, invoiceAmount);
          const due = Math.max(invoiceAmount - applied, 0);
          return { applied, due, wallet: selectedCustomer.walletBalance };
        })()
      : null;

  const openAmountDue = (inv: any) =>
    inv.amountDue ?? Math.max(Number(inv.amount) - Number(inv.amountPaid ?? 0), 0);

  const totalOutstanding = invoices
    .filter((i: any) => !['PAID', 'OVERPAID'].includes(i.status))
    .reduce((s: number, i: any) => s + openAmountDue(i), 0);

  const filtered = statusFilter === 'ALL' ? invoices : invoices.filter((inv: any) => inv.status === statusFilter);
  const tabs = ['ALL', 'PENDING', 'PAID', 'OVERDUE', 'PARTIAL'];

  return (
    <DashboardLayout>
      <PageHeader title={labels.invoices} subtitle={`Track and manage all your ${labels.customer.toLowerCase()} ${labels.invoices.toLowerCase()}`}>
        <Btn variant="secondary">Export CSV</Btn>
        <Btn onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New {labels.invoice}
        </Btn>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Outstanding" value={formatNaira(totalOutstanding)} highlight />
        <StatCard label="Paid This Month" value={formatNaira(invoices.filter((i:any)=>i.status==='PAID').reduce((s:number,i:any)=>s+Number(i.amount),0))} delta="Matched payments" deltaUp />
        <StatCard label="Overdue" value={formatNaira(invoices.filter((i:any)=>i.status==='OVERDUE').reduce((s:number,i:any)=>s+Number(i.amount),0))} delta={`${invoices.filter((i:any)=>i.status==='OVERDUE').length} ${labels.invoices.toLowerCase()}`} />
        <StatCard label="Avg Collection" value="2.3d" delta="0.8d faster" deltaUp />
      </div>

      {showForm && (
        <Card className="mb-5">
          <CardHeader title={`New ${labels.invoice}`}><Btn variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn></CardHeader>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{labels.customer}</label>
              <select value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})} className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary">
                <option value="">Select {labels.customer.toLowerCase()}</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">What is this for?</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Term 2 school fees, Caution fee, March rent" className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Amount (₦)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="25000" className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Internal notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional — staff only" className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              {walletPreview && (
                <div className="mb-3 rounded-sm border border-info/30 bg-info/5 px-3 py-2 text-xs text-foreground">
                  This {labels.customer.toLowerCase()} has {formatNaira(walletPreview.wallet)} wallet credit.
                  {walletPreview.applied > 0 && (
                    <>
                      {' '}
                      Up to {formatNaira(walletPreview.applied)} will apply to this invoice — customer pays{' '}
                      <span className="font-bold">{formatNaira(walletPreview.due)}</span> via payment account.
                    </>
                  )}
                </div>
              )}
              <Btn onClick={() => createMutation.mutate({...form, amount: Number(form.amount)})} disabled={!form.customerId || !form.description.trim() || !form.amount || !form.dueDate || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : `Create ${labels.invoice}`}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setStatusFilter(t)} className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              <span className="ml-1.5 opacity-70">{t === 'ALL' ? invoices.length : invoices.filter((i:any)=>i.status===t).length}</span>
            </button>
          ))}
        </div>
        <ViewportCards>
          {filtered.map((inv: any) => {
            const amountDue = openAmountDue(inv);
            const walletOrPaid = Number(inv.amountPaid ?? 0);
            return (
              <DataCard key={inv.id}>
                <DataCardHeader
                  title={inv.description || '—'}
                  subtitle={inv.invoiceNumber}
                  trailing={<Badge status={inv.status} />}
                />
                <DataCardRow label={labels.customer}>{inv.customer?.name || '—'}</DataCardRow>
                <DataCardRow label="Invoice">{formatNaira(inv.amount)}</DataCardRow>
                <DataCardRow label="Wallet / Paid">{walletOrPaid > 0 ? formatNaira(walletOrPaid) : '—'}</DataCardRow>
                <DataCardRow label="To collect">
                  {amountDue > 0 ? formatNaira(amountDue) : '—'}
                </DataCardRow>
                <DataCardRow label="Due date">
                  <span className={inv.status === 'OVERDUE' ? 'text-danger font-semibold' : ''}>
                    {formatDate(inv.dueDate)}
                  </span>
                </DataCardRow>
                <DataCardActions>
                  <Btn variant="ghost" size="sm" onClick={() => setDeliverInvoice(inv)}>
                    {inv.status === 'OVERDUE' ? 'Remind' : 'Share'}
                  </Btn>
                </DataCardActions>
              </DataCard>
            );
          })}
        </ViewportCards>
        <ViewportTable>
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted">{['Description', labels.customer, 'Invoice', 'Wallet / Paid', 'To collect', 'Due Date', 'Status', 'Action'].map(h=><th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((inv: any) => {
                const amountDue = openAmountDue(inv);
                const walletOrPaid = Number(inv.amountPaid ?? 0);
                return (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-semibold text-foreground">{inv.description || '—'}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{inv.invoiceNumber}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium">{inv.customer?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-bold">{formatNaira(inv.amount)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-muted-foreground">
                    {walletOrPaid > 0 ? formatNaira(walletOrPaid) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {amountDue > 0 ? (
                      <span className="text-sm font-bold text-foreground">{formatNaira(amountDue)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`px-5 py-3.5 text-xs ${inv.status === 'OVERDUE' ? 'text-danger font-semibold' : 'text-muted-foreground'}`}>{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3.5"><Badge status={inv.status} /></td>
                  <td className="px-5 py-3.5">
                    <Btn variant="ghost" size="sm" onClick={() => setDeliverInvoice(inv)}>
                      {inv.status === 'OVERDUE' ? 'Remind' : 'Share'}
                    </Btn>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </ViewportTable>
      </Card>

      {deliverInvoice && (
        <DeliverPaymentModal
          invoice={deliverInvoice}
          onClose={() => setDeliverInvoice(null)}
        />
      )}
    </DashboardLayout>
  );
}
