'use client';

import { formatNaira } from '@/lib/utils';
import { paymentPageUrl } from '@/lib/api';
import toast from 'react-hot-toast';

type InvoiceDeliver = {
  id?: string;
  invoiceNumber: string;
  description?: string;
  amountDue: number;
  amount?: number;
  amountPaid?: number;
  paymentToken: string;
  paymentUrl?: string;
  customer?: { name: string };
};

type Props = {
  invoice: InvoiceDeliver;
  customerName?: string;
  merchantName?: string;
  onClose: () => void;
};

export function DeliverPaymentModal({ invoice, customerName, merchantName, onClose }: Props) {
  const url = paymentPageUrl(invoice.paymentToken);
  const name = customerName || invoice.customer?.name || 'Customer';
  const due = formatNaira(invoice.amountDue ?? invoice.amount ?? 0);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Payment link copied');
  };

  const whatsappMessage = encodeURIComponent(
    `${merchantName ? `${merchantName}\n\n` : ''}Dear ${name},\n\nYour payment is now due.\n\n${invoice.description || invoice.invoiceNumber}\nAmount: ${due}\n\nPay here:\n${url}\n\nThank you.`,
  );

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
  };

  const openPage = () => {
    window.open(url, '_blank');
  };

  const printInvoice = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg border border-border shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-semibold text-success uppercase tracking-wide mb-1">
              Payment request created
            </div>
            <h2 className="text-lg font-bold text-foreground m-0">{invoice.invoiceNumber}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{invoice.description}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        <div className="rounded-sm border border-border bg-muted/40 p-4 mb-5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Amount to collect
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-1">{due}</div>
          {Number(invoice.amountPaid) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Includes {formatNaira(invoice.amountPaid!)} wallet credit applied
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">Payment account is ready for {name}</p>
        </div>

        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
          Deliver to customer
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DeliverBtn onClick={copyLink}>Copy link</DeliverBtn>
          <DeliverBtn onClick={openWhatsApp}>WhatsApp</DeliverBtn>
          <DeliverBtn onClick={printInvoice}>Print</DeliverBtn>
          <DeliverBtn onClick={openPage} primary>
            View payment page
          </DeliverBtn>
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 break-all font-mono">{url}</p>
      </div>
    </div>
  );
}

function DeliverBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-semibold py-2.5 px-3 rounded-sm border transition-colors ${
        primary
          ? 'bg-primary text-white border-primary hover:opacity-90'
          : 'bg-white border-border text-foreground hover:border-primary'
      }`}
    >
      {children}
    </button>
  );
}
