'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import ActivityFeed, { type ActivityEntry } from '@/components/activity/ActivityFeed';
import { fetchMerchantActivity } from '@/lib/activity-client';
import { PageHeader, Btn } from '@/components/ui';

export default function ActivityPage() {
  const { data: entries = [], isLoading, isError, refetch } = useQuery<ActivityEntry[]>({
    queryKey: ['activity'],
    queryFn: fetchMerchantActivity,
    refetchInterval: 5000,
    retry: 1,
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Activity"
        subtitle="Every payment, invoice, reconciliation, and administrative action is securely recorded for compliance and traceability."
      >
        <Btn variant="secondary">Export</Btn>
      </PageHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading activity…</div>
      ) : isError ? (
        <div className="text-sm text-danger py-12 text-center max-w-md mx-auto">
          Could not load activity. Check that the API is running on port 3002.
          <div className="mt-3">
            <Btn variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Btn>
          </div>
        </div>
      ) : (
        <ActivityFeed
          entries={entries}
          emptyMessage="No activity yet — payments and invoices will appear here as your business operates."
        />
      )}
    </DashboardLayout>
  );
}
