'use client';
// src/app/timeline/page.tsx
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, Badge, PageHeader } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

function TimelineContent() {
  const params = useSearchParams();
  const txnId = params.get('id');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get('/transactions').then(r => r.data),
    refetchInterval: 5000,
  });

  const todayList = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return transactions.filter((t: any) => new Date(t.paymentDate) >= start);
  }, [transactions]);

  const activeId = txnId || todayList[0]?.id || transactions[0]?.id;

  const { data } = useQuery({
    queryKey: ['timeline', activeId],
    queryFn: () => api.get(`/transactions/${activeId}/timeline`).then(r => r.data),
    enabled: !!activeId,
  });

  const timeline = data?.timeline || [];
  const txn = data?.transaction;

  if (!activeId) {
    return (
      <DashboardLayout>
        <PageHeader title="Operations Timeline" subtitle="Full lifecycle trace for any transaction" />
        <Card>
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transactions yet — simulate a test payment in the Event Simulator to see the full lifecycle trace.
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Operations Timeline" subtitle="Full lifecycle trace for any transaction" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Selected transaction timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-foreground">Transaction {txn?.nombaReference || '—'}</div>
              <div className="text-xs text-muted-foreground">{txn?.customer?.name} · {txn ? formatNaira(txn.amount) : '—'}</div>
            </div>
            {txn?.status && <Badge status={txn.status} />}
          </div>
          <Card>
            <div className="p-5">
              {timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">Loading timeline…</div>
              ) : timeline.map((step: any, i: number) => (
                <div key={i} className="flex gap-3.5 relative pb-5 last:pb-0">
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10',
                    step.status === 'done' ? 'border-success bg-success/10 text-success' :
                    step.status === 'active' ? 'border-primary bg-primary text-white' :
                    'border-border bg-muted text-muted-foreground'
                  )}>
                    {step.status === 'done' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : step.status === 'active' ? (
                      <span className="w-2 h-2 bg-white rounded-full" />
                    ) : (
                      <span className="w-2 h-2 bg-current rounded-full opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="text-sm font-bold text-foreground">{step.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{step.timestamp && formatDateTime(step.timestamp)}</div>
                    {step.detail && (
                      <div className={cn(
                        'text-xs mt-2 px-3 py-2 rounded-sm border',
                        i === timeline.length - 1 && step.title.includes('AI')
                          ? 'bg-primary text-white border-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      )}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* All transactions today */}
        <div>
          <div className="text-sm font-bold text-foreground mb-3">All Transactions Today</div>
          <Card>
            <div className="divide-y divide-border">
              {todayList.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No payments received today</div>
              ) : todayList.map((t: any) => (
                <a key={t.id} href={`/timeline?id=${t.id}`} className={cn('flex items-start gap-3 px-5 py-3 hover:bg-muted/50 transition-colors', t.id === activeId && 'bg-muted/30')}>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs',
                    t.status === 'MATCHED' || t.status === 'MANUALLY_MATCHED' ? 'bg-success/10 text-success' :
                    t.status === 'IN_REVIEW' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                  )}>
                    {t.status === 'MATCHED' || t.status === 'MANUALLY_MATCHED' ? '✓' : t.status === 'IN_REVIEW' ? '⏳' : '⚠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-foreground">{t.nombaReference} · {formatNaira(t.amount)} · {t.customer?.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(t.paymentDate).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                      {t.match ? ` · ${t.match.autoMatched ? 'Auto-matched' : 'In review'} ${t.match.confidenceScore}%` : t.exception ? ` · Exception: ${t.exception.type}` : ''}
                    </div>
                  </div>
                  <Badge status={t.status} className="flex-shrink-0" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelineContent />
    </Suspense>
  );
}
