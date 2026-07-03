'use client';
// src/app/transactions/page.tsx
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, Badge, PageHeader, Btn, ConfidenceBar, EmptyState, ViewportTable, ViewportCards, DataCard, DataCardHeader, DataCardRow, DataCardActions } from '@/components/ui';
import { formatNaira, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', statusFilter],
    queryFn: () => api.get('/transactions', { params: statusFilter !== 'ALL' ? { status: statusFilter } : {} }).then(r => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const tabs = [
    { key: 'ALL', label: 'All' },
    { key: 'MATCHED', label: 'Matched' },
    { key: 'IN_REVIEW', label: 'Review' },
    { key: 'EXCEPTION', label: 'Exceptions' },
  ];

  const filtered = statusFilter === 'ALL' ? transactions : transactions.filter((t: any) => t.status === statusFilter);

  return (
    <DashboardLayout>
      <PageHeader title="Transactions" subtitle="All incoming payments to dedicated customer payment accounts">
        <Btn variant="secondary">Export CSV</Btn>
      </PageHeader>

      <Card>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === t.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No transactions" description="Transactions will appear here as payments arrive" />
        ) : (
          <>
            <ViewportCards>
              {filtered.map((txn: any) => (
                <DataCard key={txn.id}>
                  <DataCardHeader
                    title={formatNaira(txn.amount)}
                    subtitle={txn.nombaReference}
                    trailing={<Badge status={txn.status} />}
                  />
                  <DataCardRow label="Sender">
                    {txn.payerName ? (
                      <span className={txn.status === 'EXCEPTION' ? 'text-danger' : ''}>{txn.payerName}</span>
                    ) : (
                      txn.customer?.name || 'Unknown'
                    )}
                  </DataCardRow>
                  <DataCardRow label="Account">
                    <span className="font-mono text-xs">{txn.accountNumber}</span>
                  </DataCardRow>
                  <DataCardRow label="Confidence">
                    <ConfidenceBar score={txn.match?.confidenceScore || 0} />
                  </DataCardRow>
                  <DataCardRow label="Matched to">
                    <span className="font-mono text-xs text-info">
                      {txn.match?.invoice?.invoiceNumber || (txn.status === 'IN_REVIEW' ? '?' : '—')}
                    </span>
                  </DataCardRow>
                  <DataCardRow label="Received">{formatDateTime(txn.paymentDate)}</DataCardRow>
                  <DataCardActions>
                    <Link href={`/timeline?id=${txn.id}`} className="text-xs font-semibold text-info hover:underline py-1.5 px-2">
                      View timeline →
                    </Link>
                  </DataCardActions>
                </DataCard>
              ))}
            </ViewportCards>
            <ViewportTable>
              <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {['Reference', 'Sender', 'Account', 'Amount', 'Confidence', 'Matched To', 'Status', 'Received'].map(h => (
                  <th key={h} className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn: any) => (
                <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{txn.nombaReference}</td>
                  <td className="px-5 py-3.5 text-sm">
                    {txn.payerName ? (
                      <span className={txn.status === 'EXCEPTION' ? 'text-danger font-medium' : ''}>{txn.payerName}</span>
                    ) : (
                      <span className="text-muted-foreground">{txn.customer?.name || 'Unknown'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs">{txn.accountNumber}</td>
                  <td className={`px-5 py-3.5 text-sm font-bold ${txn.status === 'EXCEPTION' ? 'text-danger' : ''}`}>{formatNaira(txn.amount)}</td>
                  <td className="px-5 py-3.5"><ConfidenceBar score={txn.match?.confidenceScore || 0} /></td>
                  <td className="px-5 py-3.5 font-mono text-xs text-info">
                    {txn.match?.invoice?.invoiceNumber || (txn.status === 'IN_REVIEW' ? '?' : '—')}
                  </td>
                  <td className="px-5 py-3.5"><Badge status={txn.status} /></td>
                  <td className="px-5 py-3.5">
                    <Link href={`/timeline?id=${txn.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                      {formatDateTime(txn.paymentDate)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </ViewportTable>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
