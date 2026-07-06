'use client';
// Treasury — merchant-facing balances and transfers (ReconOS is the product).

import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, StatCard, PageHeader, Btn } from '@/components/ui';
import { formatNaira } from '@/lib/utils';
import { BankSelect } from '@/components/ui/BankSelect';
import { apiErrorMessage } from '@/lib/merchant-vocabulary';
import toast from 'react-hot-toast';

export default function TreasuryPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    amount: '',
    bankCode: '058',
    accountNumber: '',
    accountName: '',
    narration: '',
  });
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const lookupGen = useRef(0);

  const { data: treasury, isLoading, refetch } = useQuery({
    queryKey: ['treasury'],
    queryFn: () => api.get('/treasury').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const lookupMutation = useMutation({
    mutationFn: (params: { bankCode: string; accountNumber: string }) =>
      api
        .get('/treasury/lookup', { params })
        .then((r) => r.data),
    onSuccess: (data) => {
      setForm((f) => ({ ...f, accountName: data.accountName }));
      setLookupDone(true);
      setLookupError('');
    },
    onError: (err: any) => {
      setLookupDone(false);
      setForm((f) => ({ ...f, accountName: '' }));
      setLookupError(
        apiErrorMessage(err, 'Could not verify this account'),
      );
    },
  });

  // Auto-verify when 10-digit account number is entered (debounced).
  useEffect(() => {
    const acct = form.accountNumber;
    if (acct.length !== 10) {
      setLookupDone(false);
      setLookupError('');
      if (form.accountName) setForm((f) => ({ ...f, accountName: '' }));
      return;
    }

    const gen = ++lookupGen.current;
    const timer = setTimeout(() => {
      lookupMutation.mutate({ bankCode: form.bankCode, accountNumber: acct }, {
        onSettled: () => {
          if (lookupGen.current !== gen) return;
        },
      });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountNumber, form.bankCode]);

  const withdrawMutation = useMutation({
    mutationFn: () =>
      api.post('/treasury/withdraw', {
        amount: Number(form.amount),
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        narration: form.narration || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        `Transfer ${res.data.status === 'successful' ? 'completed' : 'submitted'} — ref ${res.data.reference}`,
      );
      qc.invalidateQueries({ queryKey: ['treasury'] });
      setForm({ amount: '', bankCode: '058', accountNumber: '', accountName: '', narration: '' });
      setLookupDone(false);
      setLookupError('');
    },
    onError: (err: any) => {
      toast.error(
        apiErrorMessage(
          err,
          'Transfer could not be completed right now. Please try again.',
        ),
      );
    },
  });

  const infraStatus = treasury?.paymentInfrastructure?.status ?? 'provisioning';
  const balance = treasury?.balance;
  const verifying = lookupMutation.isPending;
  const maxWithdraw = balance?.available ?? 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Treasury"
        subtitle="Your collections and transfers — managed securely through ReconOS."
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              infraStatus === 'connected'
                ? 'bg-success/10 text-success-text'
                : 'bg-warning/10 text-warning-text'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            Treasury account · {infraStatus === 'connected' ? 'Active' : 'Setting up…'}
          </span>
          <Btn variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Btn>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Available to transfer"
          value={isLoading ? '—' : formatNaira(balance?.available ?? 0)}
          highlight
          delta={
            balance?.nombaWallet != null
              ? `Nomba wallet ₦${(balance.nombaWallet as number).toLocaleString('en-NG')} · cleared ₦${(balance.cleared ?? 0).toLocaleString('en-NG')}`
              : 'Cleared funds in treasury'
          }
        />
        <StatCard
          label="Today's collections"
          value={isLoading ? '—' : formatNaira(balance?.today ?? 0)}
          delta="Received today"
        />
        <StatCard
          label="Pending"
          value={isLoading ? '—' : formatNaira(balance?.pending ?? 0)}
          delta="Awaiting reconciliation"
        />
        <StatCard
          label="Total collected"
          value={isLoading ? '—' : formatNaira(balance?.totalCollected ?? 0)}
          delta="All time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Transfer funds" />
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Move cleared funds to your bank account. Transfers are processed by ReconOS on your
              behalf.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                Amount (₦)
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm"
                placeholder="10000"
                max={maxWithdraw > 0 ? maxWithdraw : undefined}
              />
              {maxWithdraw > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Maximum: {formatNaira(maxWithdraw)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                Bank
              </label>
              <BankSelect
                value={form.bankCode}
                onChange={(bankCode) => {
                  setForm({ ...form, bankCode, accountName: '' });
                  setLookupDone(false);
                  setLookupError('');
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                Account number
              </label>
              <div className="relative">
                <input
                  value={form.accountNumber}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                      accountName: '',
                    });
                    setLookupDone(false);
                    setLookupError('');
                  }}
                  className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm pr-28"
                  placeholder="10 digits"
                  maxLength={10}
                />
                {form.accountNumber.length === 10 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                    {verifying ? (
                      <span className="text-info">Verifying…</span>
                    ) : lookupDone ? (
                      <span className="text-success">✓ Verified</span>
                    ) : lookupError ? (
                      <span className="text-danger">Failed</span>
                    ) : null}
                  </span>
                )}
              </div>
              {lookupError && (
                <p className="text-[11px] text-danger mt-1">{lookupError}</p>
              )}
            </div>
            {form.accountName && (
              <div className="text-sm bg-muted px-3 py-2 rounded-sm">
                Account name: <strong>{form.accountName}</strong>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                Narration (optional)
              </label>
              <input
                value={form.narration}
                onChange={(e) => setForm({ ...form, narration: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-sm bg-input text-sm"
                placeholder="School fees settlement"
              />
            </div>
            <Btn
              onClick={() => withdrawMutation.mutate()}
              disabled={
                !lookupDone ||
                !form.accountName ||
                !form.amount ||
                Number(form.amount) <= 0 ||
                Number(form.amount) > maxWithdraw ||
                withdrawMutation.isPending ||
                verifying
              }
            >
              {withdrawMutation.isPending ? 'Processing…' : 'Transfer funds'}
            </Btn>
          </div>
        </Card>

        <Card>
          <CardHeader title="How treasury works" />
          <div className="p-5 text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">1. Customer pays</strong> → to their dedicated
              payment account.
            </p>
            <p>
              <strong className="text-foreground">2. ReconOS reconciles</strong> the payment to
              the correct invoice automatically.
            </p>
            <p>
              <strong className="text-foreground">3. Your balance updates</strong> as collections
              are matched and cleared.
            </p>
            <p>
              <strong className="text-foreground">4. Transfer funds</strong> to your bank when you
              are ready.
            </p>
            <p className="pt-2 border-t border-border text-xs">
              Questions about payouts or your account? Contact ReconOS Support at{' '}
              <span className="text-foreground">support@reconos.com</span>.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
