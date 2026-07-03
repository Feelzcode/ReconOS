'use client';
// src/app/dashboard/page.tsx
import { useState, Fragment } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatCard, Card, CardHeader, Badge, PageHeader, ViewportTable, ViewportCards, DataCard, DataCardHeader, DataCardRow } from '@/components/ui';
import { formatNaira, timeAgo } from '@/lib/utils';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import LiveWebhookEvents from '@/components/dashboard/LiveWebhookEvents';
import ConfidenceBreakdown from '@/components/reconciliation/ConfidenceBreakdown';
import { toMerchantText } from '@/lib/merchant-vocabulary';
import Link from 'next/link';

function matchDisplay(txn: {
  status: string;
  match?: {
    autoMatched?: boolean;
    confidenceScore?: number;
    invoice?: { invoiceNumber?: string; description?: string };
  } | null;
}) {
  if (txn.status === 'MATCHED' && txn.match?.autoMatched) {
    return { label: '✓ Auto', hint: 'Matched automatically' };
  }
  if (txn.status === 'MANUALLY_MATCHED') {
    return { label: 'Manual', hint: 'Matched manually' };
  }
  if (txn.status === 'IN_REVIEW') {
    return { label: '⚠ Review', hint: 'Awaiting review' };
  }
  if (txn.status === 'EXCEPTION') {
    return { label: 'Issue', hint: 'Needs attention' };
  }
  return { label: '—', hint: 'Unmatched' };
}

function paymentLabel(txn: {
  amount: number | string;
  customer?: { name?: string } | null;
  match?: { invoice?: { description?: string; invoiceNumber?: string } } | null;
  nombaReference?: string;
}) {
  const inv = txn.match?.invoice;
  const primary = inv?.description || inv?.invoiceNumber || txn.customer?.name || 'Payment';
  const secondary = inv?.invoiceNumber && inv?.description ? inv.invoiceNumber : null;
  return { primary, secondary, amount: formatNaira(Number(txn.amount)) };
}

function needsAttentionDelta(review: number, exceptions: number): string {
  const parts: string[] = [];
  if (exceptions > 0) {
    parts.push(`${exceptions} payment exception${exceptions !== 1 ? 's' : ''}`);
  }
  if (review > 0) {
    parts.push(`${review} awaiting review`);
  }
  if (parts.length === 0) return 'All clear';
  return parts.join(' · ');
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights').then((r) => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const weekData = insights?.weeklyCollections ?? [];
  const recent = insights?.recentTransactions ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const reviewCount = insights?.reviewQueueCount ?? 0;
  const exceptionCount = insights?.exceptionsCount ?? 0;
  const attentionCount = reviewCount + exceptionCount;

  return (
    <DashboardLayout>
      <PageHeader
        title={`${greeting}, ${firstName} 👋`}
        subtitle="Here's an overview of today's collections, reconciliations, and outstanding payments."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's collections"
          value={isLoading ? '—' : formatNaira(insights?.collectedToday ?? 0)}
          delta={
            isLoading
              ? ''
              : insights?.paymentsToday
              ? `Across ${insights.paymentsToday} payment${insights.paymentsToday !== 1 ? 's' : ''} today`
              : 'No payments matched today'
          }
          highlight
        />
        <StatCard
          label="Outstanding"
          value={isLoading ? '—' : formatNaira(insights?.totalOutstandingAmount ?? 0)}
          delta={
            isLoading
              ? ''
              : insights?.overdueInvoicesCount
              ? `${insights.overdueInvoicesCount} overdue invoice${insights.overdueInvoicesCount !== 1 ? 's' : ''}`
              : `${insights?.outstandingInvoiceCount ?? 0} open invoice${(insights?.outstandingInvoiceCount ?? 0) !== 1 ? 's' : ''}`
          }
        />
        <StatCard
          label="Needs attention"
          value={isLoading ? '—' : attentionCount === 0 ? 'None' : `${attentionCount} issue${attentionCount !== 1 ? 's' : ''}`}
          delta={isLoading ? '' : needsAttentionDelta(reviewCount, exceptionCount)}
        />
        <StatCard
          label="Auto-reconciliation rate"
          value={isLoading ? '—' : `${insights?.autoReconcileRate ?? 0}%`}
          delta="Payments matched automatically without manual review"
          deltaUp={(insights?.autoReconcileRate ?? 0) >= 70}
        />
      </div>

      <Card className="mb-5">
        <CardHeader
          title="Collections this week"
          subtitle={
            isLoading
              ? undefined
              : `This month: ${formatNaira(insights?.collectedThisMonth ?? 0)} across ${insights?.matchedPaymentsThisMonth ?? 0} successful payment${(insights?.matchedPaymentsThisMonth ?? 0) !== 1 ? 's' : ''}`
          }
        />
        <div className="px-5 pb-2">
          <p className="text-2xl font-extrabold tracking-tight">
            {isLoading ? '—' : formatNaira(insights?.weeklyCollectionsTotal ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mb-4">Total collected this week</p>
        </div>
        <div className="px-5 pb-5">
          {weekData.length === 0 && !isLoading ? (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              No matched payments this week yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weekData} barSize={20}>
                <Bar dataKey="amount" fill="#111827" radius={[3, 3, 0, 0]} opacity={0.85} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [formatNaira(v), 'Collected']}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <LiveWebhookEvents />

      <Card className="mb-5">
        <CardHeader title="Recent activity">
          <span className="text-xs text-muted-foreground font-medium">Live updates enabled</span>
        </CardHeader>
        <div className="divide-y divide-border">
          {recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No payments yet —{' '}
              <Link href="/demo" className="text-primary font-semibold hover:underline">
                simulate a test payment
              </Link>
            </div>
          ) : (
            recent.slice(0, 5).map((txn: any) => {
              const match = matchDisplay(txn);
              const inv = txn.match?.invoice?.invoiceNumber;
              return (
                <div key={txn.id} className="flex items-start gap-3 px-5 py-3 slide-in">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs
                  ${
                    txn.status === 'MATCHED' || txn.status === 'MANUALLY_MATCHED'
                      ? 'bg-success/10 text-success'
                      : txn.status === 'IN_REVIEW'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                  }`}
                  >
                    {txn.status === 'MATCHED' || txn.status === 'MANUALLY_MATCHED'
                      ? '✓'
                      : txn.status === 'IN_REVIEW'
                      ? '⏳'
                      : '⚠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-foreground">
                      <span className="font-bold">{formatNaira(txn.amount)}</span>
                      {inv && txn.status !== 'EXCEPTION'
                        ? ` · Invoice ${inv} paid`
                        : txn.status === 'EXCEPTION'
                        ? ' · Payment issue'
                        : txn.status === 'IN_REVIEW'
                        ? ' · Awaiting review'
                        : ''}
                      {txn.customer?.name && ` · ${txn.customer.name}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {timeAgo(txn.paymentDate || txn.createdAt)}
                      {txn.match?.confidenceScore != null &&
                        (txn.status === 'MATCHED' || txn.status === 'MANUALLY_MATCHED') &&
                        ` · ${match.hint} · ${txn.match.confidenceScore}% match confidence`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent transactions">
          <a href="/transactions" className="text-xs text-muted-foreground hover:text-foreground font-medium">
            View all →
          </a>
        </CardHeader>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No transactions recorded yet</div>
        ) : (
          <>
            <ViewportCards>
              {recent.slice(0, 5).map((txn: any) => {
                const label = paymentLabel(txn);
                const match = matchDisplay(txn);
                const expanded = expandedTxn === txn.id;
                return (
                  <DataCard key={txn.id} onClick={() => setExpandedTxn(expanded ? null : txn.id)}>
                    <DataCardHeader
                      title={label.primary}
                      subtitle={label.secondary || undefined}
                      trailing={<Badge status={txn.status} />}
                    />
                    <DataCardRow label="Customer">{txn.customer?.name || 'Unknown sender'}</DataCardRow>
                    <DataCardRow label="Amount">{label.amount}</DataCardRow>
                    <DataCardRow label="Match">
                      <span
                        className={`text-xs font-semibold ${
                          match.label.startsWith('✓')
                            ? 'text-success'
                            : match.label.includes('Review') || match.label.includes('Issue')
                            ? 'text-warning'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {match.label}
                      </span>
                    </DataCardRow>
                    <DataCardRow label="Time">{timeAgo(txn.paymentDate || txn.createdAt)}</DataCardRow>
                    {expanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-[11px] font-bold uppercase text-muted-foreground mb-2">
                          {txn.match ? 'Why this payment matched' : 'Payment details'}
                        </div>
                        {txn.match && (
                          <div className="mb-3">
                            <ConfidenceBreakdown
                              scoreAmount={txn.match.scoreAmount ?? 0}
                              scoreCustomer={txn.match.scoreCustomer ?? 0}
                              scoreTime={txn.match.scoreTime ?? 0}
                              scoreReference={txn.match.scoreReference ?? 0}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              Overall match confidence:{' '}
                              <strong className="text-foreground">{txn.match.confidenceScore}%</strong>
                            </p>
                          </div>
                        )}
                        {txn.match?.aiExplanation && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {toMerchantText(txn.match.aiExplanation)}
                          </p>
                        )}
                        {txn.match?.matchReason && !txn.match?.aiExplanation && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {toMerchantText(txn.match.matchReason)}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Reference:{' '}
                          <span className="font-mono text-foreground">{txn.nombaReference}</span>
                        </p>
                      </div>
                    )}
                  </DataCard>
                );
              })}
            </ViewportCards>
            <ViewportTable>
              <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {['Payment', 'Customer', 'Amount', 'Match', 'Status', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-5 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 5).map((txn: any) => {
                  const label = paymentLabel(txn);
                  const match = matchDisplay(txn);
                  const expanded = expandedTxn === txn.id;
                  return (
                    <Fragment key={txn.id}>
                      <tr
                        className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedTxn(expanded ? null : txn.id)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-foreground">{label.primary}</div>
                          {label.secondary && (
                            <div className="text-[11px] text-muted-foreground">{label.secondary}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium">
                          {txn.customer?.name || 'Unknown sender'}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold">{label.amount}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-semibold ${
                              match.label.startsWith('✓')
                                ? 'text-success'
                                : match.label.includes('Review') || match.label.includes('Issue')
                                ? 'text-warning'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {match.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge status={txn.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {timeAgo(txn.paymentDate || txn.createdAt)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="text-[11px] font-bold uppercase text-muted-foreground mb-2">
                              {txn.match ? 'Why this payment matched' : 'Payment details'}
                            </div>
                            {txn.match && (
                              <div className="mb-3 max-w-md">
                                <ConfidenceBreakdown
                                  scoreAmount={txn.match.scoreAmount ?? 0}
                                  scoreCustomer={txn.match.scoreCustomer ?? 0}
                                  scoreTime={txn.match.scoreTime ?? 0}
                                  scoreReference={txn.match.scoreReference ?? 0}
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                  Overall match confidence:{' '}
                                  <strong className="text-foreground">{txn.match.confidenceScore}%</strong>
                                </p>
                              </div>
                            )}
                            {txn.match?.aiExplanation && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {toMerchantText(txn.match.aiExplanation)}
                              </p>
                            )}
                            {txn.match?.matchReason && !txn.match?.aiExplanation && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {toMerchantText(txn.match.matchReason)}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                              Reference:{' '}
                              <span className="font-mono text-foreground">{txn.nombaReference}</span>
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </ViewportTable>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
