'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { publicApi, type PaymentPageData } from '@/lib/api';
import { PaymentRequestView } from '@/components/payment/PaymentRequestView';

function shouldPoll(status?: PaymentPageData['trackerStatus']) {
  return status === 'AWAITING' || status === 'CONFIRMING';
}

export default function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay', token],
    queryFn: () => publicApi.get<PaymentPageData>(`/pay/${token}`).then((r) => r.data),
    enabled: !!token,
    refetchInterval: (query) => (shouldPoll(query.state.data?.trackerStatus) ? 5000 : false),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground px-4">
        Loading payment details…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground px-4">
        Payment request not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 px-3 sm:px-4 print:bg-white print:py-0 page-enter">
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <PaymentRequestView data={data} onPrint={() => window.print()} />
      {shouldPoll(data.trackerStatus) && (
        <p className="text-center text-xs text-muted-foreground mt-4 no-print max-w-[480px] mx-auto">
          This page updates when your payment is received.{' '}
          <button
            type="button"
            className="underline font-semibold text-foreground"
            onClick={() => refetch()}
          >
            Refresh now
          </button>
        </p>
      )}
    </div>
  );
}
