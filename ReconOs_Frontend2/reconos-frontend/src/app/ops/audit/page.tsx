'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import ActivityFeed, { type ActivityEntry } from '@/components/activity/ActivityFeed';

const OPS_KEY = process.env.NEXT_PUBLIC_RECONOS_OPS_AUDIT_KEY || '';

export default function OpsAuditPage() {
  const { data: entries = [], isLoading, isError } = useQuery<ActivityEntry[]>({
    queryKey: ['ops-audit'],
    queryFn: () =>
      api
        .get('/audit-logs/operations', {
          headers: OPS_KEY ? { 'x-reconos-ops-key': OPS_KEY } : undefined,
        })
        .then((r) => r.data),
    refetchInterval: 5000,
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="System Audit"
        subtitle="ReconOS operations log — webhooks, background sync, reconciliation jobs, and provider diagnostics for support and engineering."
      />

      <div className="mb-5 bg-slate-900 text-slate-200 border border-slate-700 rounded-DEFAULT px-4 py-3 text-xs leading-relaxed">
        <span className="font-bold text-white">ReconOS internal.</span> This view includes infrastructure
        events merchants never see on Activity — sync jobs, engine runs, verification payloads, and raw
        provider metadata. Use it when support needs to answer &quot;why did this invoice become paid?&quot;
      </div>

      {isError ? (
        <div className="text-sm text-danger py-12 text-center">
          Operations audit unavailable — check RECONOS_OPS_AUDIT_KEY configuration.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading system audit…</div>
      ) : (
        <ActivityFeed
          entries={entries}
          opsMode
          emptyMessage="No operations events yet."
        />
      )}
    </DashboardLayout>
  );
}
