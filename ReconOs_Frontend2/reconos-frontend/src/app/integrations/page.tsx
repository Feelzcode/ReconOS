'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

function StatusRow({
  label,
  value,
  ok = true,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold ${ok ? 'text-success' : 'text-warning'}`}
      >
        {ok ? '✓ ' : ''}
        {value}
      </span>
    </div>
  );
}

export default function IntegrationsPage() {
  const { org } = useAuthStore();

  const { data: treasury, isLoading } = useQuery({
    queryKey: ['treasury'],
    queryFn: () => api.get('/treasury').then((r) => r.data),
    retry: 1,
  });

  const connected = !isLoading && !!treasury;

  return (
    <DashboardLayout>
      <PageHeader
        title="Integrations"
        subtitle="Payment infrastructure connected to your ReconOS workspace"
      />

      <div className="max-w-xl">
        <Card>
          <CardHeader
            title="Payment Infrastructure"
            subtitle={org?.name ? `Workspace: ${org.name}` : undefined}
          />
          <div className="px-5 pb-5">
            <StatusRow
              label="Status"
              value={connected ? 'Connected' : isLoading ? 'Checking…' : 'Connecting…'}
              ok={connected}
            />
            <StatusRow label="Provider" value="Powered by Nomba" ok />
            <StatusRow label="Collections" value="Active" ok={connected} />
            <StatusRow label="Transfers" value="Enabled" ok={connected} />
            <StatusRow label="Webhooks" value="Connected" ok={connected} />
          </div>
        </Card>

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          ReconOS handles payment operations on your behalf. This is the only place you need to
          check infrastructure status — day-to-day workflows stay inside ReconOS.
        </p>
      </div>
    </DashboardLayout>
  );
}
