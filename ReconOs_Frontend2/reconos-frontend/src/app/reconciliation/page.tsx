'use client';
// src/app/reconciliation/page.tsx
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, StatCard, PageHeader, Btn, EmptyState } from '@/components/ui';
import { formatNaira, formatTime } from '@/lib/utils';
import ConfidenceBreakdown from '@/components/reconciliation/ConfidenceBreakdown';
import { toMerchantText, confidenceDisplayLabel } from '@/lib/merchant-vocabulary';
import toast from 'react-hot-toast';

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
        {confidenceDisplayLabel(score)}
      </span>
      <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
        {score}%
      </span>
    </span>
  );
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const [overrideTarget, setOverrideTarget] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideInvoiceId, setOverrideInvoiceId] = useState('');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [recoverCustomerId, setRecoverCustomerId] = useState('');
  const [recoverAmount, setRecoverAmount] = useState('');
  const [recoverResults, setRecoverResults] = useState<any[]>([]);
  const [showAdvancedRecover, setShowAdvancedRecover] = useState(false);
  const [advancedSessionId, setAdvancedSessionId] = useState('');

  const { data: matches = [] } = useQuery({
    queryKey: ['reconciliation-matches'],
    queryFn: () => api.get('/reconciliation/matches').then(r => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get('/reconciliation/review-queue').then(r => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['exceptions', 'OPEN'],
    queryFn: () => api.get('/exceptions', { params: { status: 'OPEN' } }).then(r => r.data),
    placeholderData: [] as any[],
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const { data: openInvoices = [] } = useQuery({
    queryKey: ['invoices', 'open'],
    queryFn: () => api.get('/invoices', { params: { status: 'PENDING' } }).then(r => r.data),
    enabled: !!overrideTarget,
    placeholderData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
    placeholderData: [],
  });

  const confirmMutation = useMutation({
    mutationFn: (matchId: string) => api.post(`/reconciliation/confirm/${matchId}`),
    onSuccess: () => { toast.success('Match confirmed — invoice marked paid'); qc.invalidateQueries(); },
  });

  const overrideMutation = useMutation({
    mutationFn: (data: any) => api.post('/reconciliation/manual-match', data),
    onSuccess: () => { toast.success('Override applied and logged'); setOverrideTarget(null); setOverrideReason(''); setOverrideInvoiceId(''); qc.invalidateQueries(); },
  });

  const investigateMutation = useMutation({
    mutationFn: (exceptionId: string) => api.post(`/exceptions/${exceptionId}/investigate`),
    onSuccess: () => {
      toast.success('Exception marked as investigating');
      qc.invalidateQueries({ queryKey: ['exceptions'] });
    },
    onError: () => toast.error('Could not update exception'),
  });

  const runEngineMutation = useMutation({
    mutationFn: () => api.post('/reconciliation/run'),
    onSuccess: (res) => {
      const { processed, matched, review, exceptions } = res.data;
      toast.success(
        processed === 0
          ? 'Nothing to re-process'
          : `Reconciliation ran on ${processed} payment(s): ${matched} matched, ${review} in review, ${exceptions} exceptions`,
      );
      qc.invalidateQueries();
    },
    onError: () => toast.error('Reconciliation run failed'),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/reconciliation/sync'),
    onSuccess: (res) => {
      const { paymentsRecovered, duplicatesSkipped } = res.data;
      toast.success(
        paymentsRecovered > 0
          ? `Sync found ${paymentsRecovered} recovered payment(s)`
          : `Sync complete — ${duplicatesSkipped} duplicate(s) skipped`,
      );
      qc.invalidateQueries();
    },
    onError: () => toast.error('Payment sync failed'),
  });

  const searchPaymentsMutation = useMutation({
    mutationFn: () =>
      api.post('/reconciliation/recover-payment/search', {
        customerId: recoverCustomerId,
        ...(recoverAmount ? { amount: Number(recoverAmount) } : {}),
      }),
    onSuccess: (res) => {
      setRecoverResults(res.data);
      const missing = res.data.filter((r: any) => !r.alreadyImported);
      toast.success(
        missing.length
          ? `Found ${missing.length} payment(s) not yet in ReconOS`
          : 'No new payments found for this student',
      );
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Search failed'),
  });

  const importPaymentMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.post('/reconciliation/recover-payment/import', {
        customerId: recoverCustomerId,
        sessionId,
      }),
    onSuccess: () => {
      toast.success('Payment imported and reconciled');
      setRecoverResults([]);
      qc.invalidateQueries();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Import failed'),
  });

  const sessionRecoverMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.post('/reconciliation/recover-session', { sessionId }),
    onSuccess: () => {
      toast.success('Payment recovered from session ID');
      setAdvancedSessionId('');
      qc.invalidateQueries();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Recovery failed'),
  });

  const autoMatched = matches.filter((m: any) => m.autoMatched);
  const autoMatchedToday = autoMatched.filter((m: any) => {
    const d = new Date(m.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Reconciliation Center"
        subtitle="Monitor, reconcile, and recover customer payments in real time."
      >
        <div className="flex gap-2">
          <Btn
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync Payments'}
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => runEngineMutation.mutate()}
            disabled={runEngineMutation.isPending}
          >
            {runEngineMutation.isPending ? 'Running…' : 'Run Reconciliation'}
          </Btn>
        </div>
      </PageHeader>

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Recover payment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search for payments received into a student&apos;s dedicated payment account. If a
              payment was missed during processing, ReconOS imports and reconciles it automatically.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Student</label>
              <select
                value={recoverCustomerId}
                onChange={e => setRecoverCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm"
              >
                <option value="">Select student…</option>
                {customers.filter((c: any) => c.virtualAccountNumber).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.virtualAccountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Amount (optional)</label>
              <input
                type="number"
                value={recoverAmount}
                onChange={e => setRecoverAmount(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm"
              />
            </div>
            <div className="flex items-end">
              <Btn
                className="w-full"
                disabled={!recoverCustomerId || searchPaymentsMutation.isPending}
                onClick={() => searchPaymentsMutation.mutate()}
              >
                {searchPaymentsMutation.isPending ? 'Searching…' : 'Search Payments'}
              </Btn>
            </div>
          </div>
          {recoverResults.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              {recoverResults.map((r: any) => (
                <div key={r.sessionId} className="flex flex-wrap items-center justify-between gap-2 bg-muted rounded-sm p-3">
                  <div className="text-sm">
                    <span className="font-bold">{formatNaira(r.amount)}</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span>{r.payerName || 'Unknown payer'}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {new Date(r.paymentDate).toLocaleString()}
                    </span>
                  </div>
                  {r.alreadyImported ? (
                    <span className="text-xs font-semibold text-success">Already in ReconOS</span>
                  ) : (
                    <Btn
                      size="sm"
                      onClick={() => importPaymentMutation.mutate(r.sessionId)}
                      disabled={importPaymentMutation.isPending}
                    >
                      Import &amp; reconcile
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAdvancedRecover(!showAdvancedRecover)}
            className="text-xs text-muted-foreground hover:text-foreground text-left"
          >
            {showAdvancedRecover ? '▲ Hide advanced' : '▼ Advanced: payment session ID'}
          </button>
          {showAdvancedRecover && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                Payment session ID
              </label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Only use this if a customer provides a payment receipt.
              </p>
              <div className="flex gap-2">
              <input
                value={advancedSessionId}
                onChange={e => setAdvancedSessionId(e.target.value)}
                placeholder="Paste session ID from receipt"
                className="flex-1 px-3 py-2 border border-border rounded-sm bg-input text-sm font-mono"
              />
              <Btn
                variant="secondary"
                disabled={!advancedSessionId || sessionRecoverMutation.isPending}
                onClick={() => sessionRecoverMutation.mutate(advancedSessionId)}
              >
                Recover
              </Btn>
            </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Auto-Matched Today"
          value={String(autoMatchedToday.length)}
          delta={`${insights?.autoReconcileRate ?? 0}% monthly rate`}
          deltaUp={(insights?.autoReconcileRate ?? 0) >= 70}
          highlight
        />
        <StatCard label="In Review Queue" value={String(reviewQueue.length)} delta="Needs attention" />
        <StatCard label="Exceptions" value={String(exceptions.length)} delta={exceptions.length ? 'Action required' : 'All clear'} />
        <StatCard
          label="Recovered payments"
          value={String(insights?.recoveredPaymentsCount ?? 0)}
          delta="Recovered from payment history"
          deltaUp={(insights?.recoveredPaymentsCount ?? 0) > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AUTO-MATCHED */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">✓ Auto-Matched</span>
            <span className="text-[11px] font-bold text-white bg-success px-2 py-0.5 rounded-full">{autoMatched.length}</span>
          </div>
          <div className="p-2.5 space-y-2 max-h-[600px] overflow-y-auto">
            {autoMatched.map((m: any) => (
              <div key={m.id} className="bg-muted border border-border rounded-sm p-3">
                <div
                  className="flex justify-between items-start mb-2 cursor-pointer"
                  onClick={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                >
                  <div>
                    <div className="text-base font-extrabold text-foreground tracking-tight">{formatNaira(m.transaction?.amount)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.invoice?.description || m.invoice?.invoiceNumber}</div>
                  </div>
                  <ConfidenceBadge score={m.confidenceScore} />
                </div>
                <div className="text-xs font-semibold text-foreground/80 mb-2">{m.invoice?.customer?.name}</div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">{formatTime(m.createdAt)}</span>
                  <button
                    onClick={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                    className="text-[10px] font-semibold text-muted-foreground bg-white border border-border px-1.5 py-0.5 rounded-full hover:border-primary transition-colors"
                  >
                    {expandedMatch === m.id ? 'Hide score ▲' : 'Auto · Show score ▼'}
                  </button>
                </div>
                {expandedMatch === m.id && (
                  <div className="mt-2.5 space-y-2">
                    {m.aiExplanation && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed bg-white border border-border rounded-sm p-2">
                        {toMerchantText(m.aiExplanation)}
                      </p>
                    )}
                    <ConfidenceBreakdown
                      scoreAmount={m.scoreAmount ?? 60}
                      scoreCustomer={m.scoreCustomer ?? 25}
                      scoreTime={m.scoreTime ?? (m.confidenceScore >= 99 ? 10 : 9)}
                      scoreReference={m.scoreReference ?? 5}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* REVIEW QUEUE */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">⚠ Pending Review</span>
            <span className="text-[11px] font-bold text-white bg-warning px-2 py-0.5 rounded-full">{reviewQueue.length}</span>
          </div>
          <div className="p-2.5 space-y-2 max-h-[600px] overflow-y-auto">
            {reviewQueue.length === 0 ? (
              <EmptyState title="All clear" description="No payments require review." />
            ) : reviewQueue.map((m: any) => (
              <div key={m.id} className="bg-white border-2 border-warning/30 rounded-sm p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-base font-extrabold text-foreground tracking-tight">{formatNaira(m.transaction?.amount)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Possible: {m.invoice?.description || m.invoice?.invoiceNumber}</div>
                  </div>
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {confidenceDisplayLabel(m.confidenceScore)}
                    </span>
                    <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                      {m.confidenceScore}%
                    </span>
                  </span>
                </div>
                <div className="text-xs font-semibold text-foreground/80 mb-2">{m.invoice?.customer?.name}</div>
                <div className="bg-warning/5 border border-warning/20 rounded-sm p-2 mb-2.5 text-[11px] text-warning-text leading-relaxed">
                  {toMerchantText(m.matchReason) || 'Amount matches but timing is unusual. Confirm or reassign.'}
                </div>
                <div className="flex gap-1.5">
                  <Btn size="sm" onClick={() => confirmMutation.mutate(m.id)} className="flex-1">Confirm Match</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => {
                    setOverrideInvoiceId(m.invoiceId || '');
                    setOverrideReason('');
                    setOverrideTarget(m);
                  }}>Override</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* EXCEPTIONS */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">✕ Exceptions</span>
            <span className="text-[11px] font-bold text-white bg-danger px-2 py-0.5 rounded-full">{exceptions.length}</span>
          </div>
          <div className="p-2.5 space-y-2 max-h-[600px] overflow-y-auto">
            {exceptions.length === 0 ? (
              <EmptyState title="No open exceptions" description="Payments requiring manual attention will appear here." />
            ) : exceptions.map((e: any) => (
              <div key={e.id} className="bg-white border-2 border-danger/30 rounded-sm p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-base font-extrabold text-danger tracking-tight">{formatNaira(e.transaction?.amount)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.type?.replace(/_/g, ' ') || 'No match found'}</div>
                  </div>
                  <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded-full uppercase">{e.status}</span>
                </div>
                <div className="text-xs font-semibold text-danger mb-2">{e.transaction?.payerName || e.transaction?.customer?.name || 'Unknown sender'}</div>
                <div className="bg-danger/5 border border-danger/20 rounded-sm p-2 mb-2.5 text-[11px] text-danger-text leading-relaxed">
                  ⚠ {e.aiSummary || e.description || 'Review this payment before releasing goods or services.'}
                </div>
                <div className="flex gap-1.5">
                  <Btn
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setOverrideInvoiceId('');
                      setOverrideReason('');
                      setOverrideTarget({
                        transactionId: e.transactionId,
                        transaction: e.transaction,
                      });
                    }}
                  >
                    Assign to Invoice
                  </Btn>
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={() => investigateMutation.mutate(e.id)}
                    disabled={investigateMutation.isPending}
                  >
                    Investigate
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Override modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setOverrideTarget(null)}>
          <div className="bg-white rounded-DEFAULT max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">Override Match</h3>
            <p className="text-xs text-muted-foreground mb-4">Reassign {formatNaira(overrideTarget.transaction?.amount)} to a different invoice. This will be logged in the audit trail.</p>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Target invoice</label>
            <select
              value={overrideInvoiceId}
              onChange={e => setOverrideInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary mb-4"
            >
              <option value="">Select invoice…</option>
              {openInvoices.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.description || inv.invoiceNumber} — {inv.customer?.name} ({formatNaira(inv.amount)})
                </option>
              ))}
            </select>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Reason for override</label>
            <textarea
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="e.g. Wrong invoice auto-selected, customer confirmed different invoice"
              className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm outline-none focus:border-primary mb-4 h-20 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => { setOverrideTarget(null); setOverrideInvoiceId(''); }}>Cancel</Btn>
              <Btn
                onClick={() => overrideMutation.mutate({
                  transactionId: overrideTarget.transactionId,
                  invoiceId: overrideInvoiceId,
                  reason: overrideReason,
                })}
                disabled={!overrideReason || !overrideInvoiceId || overrideMutation.isPending}
              >
                Apply Override
              </Btn>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
