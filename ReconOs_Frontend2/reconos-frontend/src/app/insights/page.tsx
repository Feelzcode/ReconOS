'use client';
// src/app/insights/page.tsx
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Btn } from '@/components/ui';
import { formatNaira } from '@/lib/utils';

function InsightCard({ type, color, text, tags, action, href }: {
  type: string; color: string; text: string; tags: string[]; action?: string; href?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'border-l-primary',
    success: 'border-l-success',
    warning: 'border-l-warning',
    danger: 'border-l-danger',
  };
  return (
    <div className={`bg-white border border-border ${colorMap[color]} border-l-[3px] rounded-DEFAULT p-4 mb-3.5`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{type}</div>
      <div className="text-sm text-foreground leading-relaxed">{text}</div>
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border flex-wrap">
        {tags.map(t => <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">{t}</span>)}
        {action && href && (
          <Link href={href} className="ml-auto">
            <Btn size="sm">{action}</Btn>
          </Link>
        )}
        {action && !href && <Btn size="sm" className="ml-auto">{action}</Btn>}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { data: collection } = useQuery({
    queryKey: ['collection-insight'],
    queryFn: () => api.get('/insights/collections').then(r => r.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ['insights-anomalies'],
    queryFn: () => api.get('/insights/anomalies').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['reconciliation-matches'],
    queryFn: () => api.get('/reconciliation/matches').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get('/reconciliation/review-queue').then(r => r.data),
    refetchInterval: 5000,
  });

  const autoMatched = matches.filter((m: any) => m.autoMatched).slice(0, 3);
  const overdueCount = collection?.overdueInvoices?.length ?? dashboard?.overdueInvoicesCount ?? 0;

  return (
    <DashboardLayout>
      <PageHeader title="AI Insights" subtitle="Plain-English explanations powered by Claude">
        <span className="text-xs font-semibold px-2.5 py-1 bg-info/10 text-info-text rounded-full">Powered by Claude</span>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-bold text-foreground mb-3">Cash Flow Intelligence</div>
          <InsightCard
            type="📊 Collection Insight"
            color="primary"
            text={collection?.aiInsight || 'All invoices are up to date — no overdue receivables to chase.'}
            tags={[
              overdueCount ? `${overdueCount} overdue` : 'All current',
              `${formatNaira(collection?.totalOverdue || dashboard?.totalOverdueAmount || 0)} recoverable`,
            ]}
            action={overdueCount ? 'View Invoices' : undefined}
            href="/invoices"
          />
          <InsightCard
            type="📈 Reconciliation Rate"
            color="success"
            text={
              dashboard
                ? `Your auto-reconcile rate is ${dashboard.autoReconcileRate}% this month across ${dashboard.pendingInvoices ?? 0} pending invoices. ${dashboard.reviewQueueCount ?? 0} payments need manual review.`
                : 'Loading reconciliation performance…'
            }
            tags={[`${dashboard?.autoReconcileRate ?? 0}% auto-match`, `${dashboard?.reviewQueueCount ?? 0} in review`]}
          />
          {(dashboard?.collectedThisMonth ?? 0) > 0 && (
            <InsightCard
              type="💡 Cash Position"
              color="success"
              text={`You've collected ${formatNaira(dashboard.collectedThisMonth)} so far this month. ${dashboard.exceptionsCount ? `${dashboard.exceptionsCount} open exception(s) need attention before month-end close.` : 'No open exceptions — books are clean.'}`}
              tags={['This month', dashboard?.exceptionsCount ? 'Action needed' : 'On track']}
              action={dashboard?.exceptionsCount ? 'Review Exceptions' : undefined}
              href="/exceptions"
            />
          )}
        </div>

        <div>
          <div className="text-sm font-bold text-foreground mb-3">
            Anomaly Explanations
            {anomalies.length > 0 && (
              <span className="ml-2 text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded-full">{anomalies.length} open</span>
            )}
          </div>
          {anomalies.length === 0 ? (
            <InsightCard
              type="✓ No Open Anomalies"
              color="success"
              text="No suspicious or unmatched payments right now. Run Scenario B in the Event Simulator to see anomaly detection."
              tags={['All clear']}
              action="Event Simulator"
              href="/demo"
            />
          ) : anomalies.map((ex: any) => (
            <InsightCard
              key={ex.id}
              type={`⚠ ${ex.type?.replace(/_/g, ' ') || 'Anomaly'} · ${ex.transaction?.nombaReference || 'TXN'}`}
              color="danger"
              text={ex.aiSummary || ex.description || `Payment of ${formatNaira(ex.transaction?.amount)} requires investigation before releasing goods or services.`}
              tags={[
                ex.transaction?.customer?.name || 'Unknown sender',
                formatNaira(ex.transaction?.amount),
              ]}
              action="Investigate"
              href="/reconciliation"
            />
          ))}

          <div className="text-sm font-bold text-foreground mb-3 mt-6">Match Explanations</div>
          {autoMatched.length === 0 && reviewQueue.length === 0 ? (
            <InsightCard
              type="— No Recent Matches"
              color="primary"
              text="Simulate a test payment or wait for inbound webhooks — AI match explanations appear here after reconciliation."
              tags={['Waiting for data']}
              action="Event Simulator"
              href="/demo"
            />
          ) : (
            <>
              {autoMatched.map((m: any) => (
                <InsightCard
                  key={m.id}
                  type={`✓ Match · ${m.invoice?.invoiceNumber} ↔ ${m.transaction?.nombaReference || 'TXN'}`}
                  color="success"
                  text={m.aiExplanation || m.matchReason || `Matched at ${m.confidenceScore}% confidence — amount and customer account signals aligned with ${m.invoice?.customer?.name}.`}
                  tags={[`${m.confidenceScore}% confidence`, m.invoice?.customer?.name || 'Customer']}
                />
              ))}
              {reviewQueue.slice(0, 2).map((m: any) => (
                <InsightCard
                  key={m.id}
                  type={`⚡ Review · ${m.invoice?.invoiceNumber} ↔ ${m.transaction?.nombaReference || 'TXN'}`}
                  color="warning"
                  text={m.matchReason || m.aiExplanation || `Amount matches ${m.invoice?.invoiceNumber} but confidence is ${m.confidenceScore}% — confirm before auto-matching.`}
                  tags={[`${m.confidenceScore}% confidence`, 'Needs confirmation']}
                  action="Confirm Match"
                  href="/reconciliation"
                />
              ))}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
