'use client';
// src/app/customers/[id]/statement/page.tsx

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, Badge, Btn, StatCard, ViewportTable, ViewportCards, DataCard, DataCardHeader, DataCardRow } from '@/components/ui';
import { FinancialActivity } from '@/components/customers/FinancialActivity';
import { formatNaira, formatDate, formatDateTime } from '@/lib/utils';
import { useMerchantLabels } from '@/lib/merchant-labels';
import Link from 'next/link';

export default function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const labels = useMerchantLabels();

  const { data: stmt, isLoading, isError } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => api.get(`/customers/${id}/statement`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Loading statement…
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !stmt) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Could not load statement
        </div>
      </DashboardLayout>
    );
  }

  const { customer, summary, invoices, recentTransactions, financialEvents = [] } = stmt;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            ← {labels.customers}
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
            {customer.name} — Statement
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Btn variant="secondary">Export PDF</Btn>
          <Btn variant="secondary">Send to {labels.customer}</Btn>
        </div>
      </div>

      {/* Student / customer summary */}
      <Card className="mb-5">
        <div className="p-5 flex flex-col sm:flex-row gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {customer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="text-base font-bold text-foreground">{customer.name}</div>
              <div className="text-sm text-muted-foreground">{customer.email}</div>
              <div className="text-sm text-muted-foreground">{customer.phone}</div>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-col gap-3 min-w-[220px]">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                Payment Details
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Dedicated Payment Account</div>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Bank</div>
                <div className="font-medium text-foreground">{customer.bankName || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Account Number
                </div>
                <div className="font-mono font-bold text-foreground">
                  {customer.virtualAccountNumber || 'Not created'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary — bursar snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Wallet Credit"
          value={formatNaira(summary.walletCredit ?? summary.walletBalance ?? 0)}
          delta={summary.walletCredit > 0 ? 'Available for future invoices' : 'None'}
          highlight={summary.walletCredit > 0}
        />
        <StatCard
          label="Outstanding"
          value={formatNaira(summary.outstanding ?? summary.outstandingBalance ?? 0)}
          delta={summary.outstanding > 0 ? 'Balance due' : 'Fully settled'}
        />
        <StatCard
          label="Total Collected"
          value={formatNaira(summary.totalCollected ?? summary.totalPaid ?? 0)}
          delta="All payments received"
        />
        <StatCard
          label={`${labels.invoices} Paid`}
          value={String(summary.invoicesPaid ?? summary.paidCount ?? 0)}
          delta={`${summary.invoicesOpen ?? 0} open`}
        />
      </div>

      {/* Financial Activity — the story */}
      <Card className="mb-5">
        <CardHeader
          title="Financial Activity"
          subtitle="What happened to this customer's money — in order"
        />
        <FinancialActivity events={financialEvents} />
      </Card>

      {/* Invoice breakdown — accountant table */}
      <Card className="mb-5">
        <CardHeader title="Invoice Breakdown" subtitle="Each bill with payment progress" />
        <ViewportCards>
          {invoices.map((inv: any) => (
            <DataCard key={inv.id}>
              <DataCardHeader
                title={inv.description || '—'}
                subtitle={inv.invoiceNumber}
                trailing={<Badge status={inv.status} />}
              />
              <DataCardRow label="Invoice">{formatNaira(inv.amount)}</DataCardRow>
              <DataCardRow label="Wallet / Paid">
                <div>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${Math.min((inv.amountPaid / inv.amount) * 100, 100)}%` }}
                      />
                    </div>
                    {formatNaira(inv.amountPaid)}
                  </div>
                  {inv.amountPaid > 0 && inv.amountDue > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Includes wallet credit</div>
                  )}
                </div>
              </DataCardRow>
              <DataCardRow label="To collect">
                {(inv.amountDue ?? inv.remainingBalance) > 0 ? (
                  <div>
                    {formatNaira(inv.amountDue ?? inv.remainingBalance)}
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">Via payment account</div>
                  </div>
                ) : '—'}
              </DataCardRow>
              <DataCardRow label="Due date">
                <span className={inv.status === 'OVERDUE' ? 'text-danger font-semibold' : ''}>
                  {formatDate(inv.dueDate)}
                </span>
              </DataCardRow>
            </DataCard>
          ))}
        </ViewportCards>
        <ViewportTable>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {['Description', 'Invoice', 'Wallet / Paid', 'To collect', 'Due Date', 'Status'].map((h) => (
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
              {invoices.map((inv: any) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-foreground">{inv.description || '—'}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {inv.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold">{formatNaira(inv.amount)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                        <div
                          className="h-full bg-success rounded-full transition-all"
                          style={{
                            width: `${Math.min((inv.amountPaid / inv.amount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatNaira(inv.amountPaid)}
                      </span>
                    </div>
                    {inv.amountPaid > 0 && inv.amountDue > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">Includes wallet credit</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {(inv.amountDue ?? inv.remainingBalance) > 0 ? (
                      <div>
                        <span className="text-sm font-bold text-foreground">
                          {formatNaira(inv.amountDue ?? inv.remainingBalance)}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Via payment account</div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    className={`px-5 py-4 text-xs ${
                      inv.status === 'OVERDUE' ? 'text-danger font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ViewportTable>
      </Card>

      {/* Payment history — raw inbound list */}
      <Card>
        <CardHeader
          title="Payment History"
          subtitle={`All payments received from this ${labels.customer.toLowerCase()}`}
        />
        <div className="divide-y divide-border">
          {recentTransactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No payments received yet
            </div>
          ) : (
            recentTransactions.map((txn: any) => (
              <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-success/10 text-success flex items-center justify-center text-xs flex-shrink-0">
                    ₦
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{formatNaira(txn.amount)}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {txn.nombaReference}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-10 sm:pl-0">
                  {txn.match?.invoice && (
                    <div className="text-xs font-semibold text-info font-mono">
                      {txn.match.invoice.invoiceNumber}
                    </div>
                  )}
                  <Badge status={txn.status} />
                  <div className="text-xs text-muted-foreground">{formatDateTime(txn.paymentDate)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
