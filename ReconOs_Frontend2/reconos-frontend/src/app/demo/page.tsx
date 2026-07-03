'use client';
// src/app/demo/page.tsx
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { DEMO_PAYMENTS, type DemoPaymentKey } from '@/lib/demo-payments';
import { Card, CardHeader, Btn } from '@/components/ui';
import { cn, formatNaira } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface LogEntry { id: number; icon: string; color: string; bg: string; label: string; detail: string; time: string; }

const events: Record<string, Omit<LogEntry, 'id' | 'time'>> = {
  webhook: { icon: '↓', color: 'text-teal-600', bg: 'bg-teal-50', label: 'Webhook Verified', detail: 'HMAC signature valid · Idempotency key unique · Processed' },
  payment: { icon: '⚡', color: 'text-info', bg: 'bg-info/10', label: 'Inbound Payment Received', detail: 'Payment received on dedicated payment account' },
  match: { icon: '✓', color: 'text-success', bg: 'bg-success/10', label: 'Auto-Match Complete', detail: 'Invoice reconciled automatically' },
  review: { icon: '⏳', color: 'text-warning', bg: 'bg-warning/10', label: 'Review Queue Entry', detail: 'Low-confidence match queued for merchant review' },
  anomaly: { icon: '⚠', color: 'text-danger', bg: 'bg-danger/10', label: 'Anomaly Flagged', detail: 'Exception raised — investigate before releasing goods' },
  partial: { icon: '◐', color: 'text-warning', bg: 'bg-warning/10', label: 'Partial Payment Recorded', detail: 'Invoice marked PARTIAL — balance still outstanding' },
  overpay: { icon: '↑', color: 'text-violet-600', bg: 'bg-violet-50', label: 'Overpayment Detected', detail: 'Excess amount flagged for refund or wallet credit' },
  override: { icon: '✎', color: 'text-violet-600', bg: 'bg-violet-50', label: 'Manual Override Applied', detail: 'Match reassigned with audit trail reason' },
};

const SCENARIOS: Record<DemoPaymentKey, { title: string; subtitle: string; gradient: string; titleColor: string; icon: string; steps: string[]; logKeys: (keyof typeof events)[]; variant?: 'danger' | 'secondary' }> = {
  standard: {
    title: 'Scenario A — Standard Payment',
    subtitle: 'Core demo · Full lifecycle to auto-match',
    gradient: 'from-blue-50 to-violet-50',
    titleColor: 'text-info-text',
    icon: '⚡',
    steps: [
      'Payment webhook fires to POST /webhooks/mock',
      'Engine scores match against open invoice',
      'Invoice auto-matched · marked PAID',
    ],
    logKeys: ['webhook', 'payment', 'match'],
  },
  anomaly: {
    title: 'Scenario B — Anomaly Detection',
    subtitle: 'For technical judges · Exception handling',
    gradient: 'from-red-50 to-amber-50',
    titleColor: 'text-danger',
    icon: '⚠',
    steps: [
      `${formatNaira(DEMO_PAYMENTS.anomaly.amount)} from unknown sender — 10× average`,
      'Engine scores low · Flags exception',
      'AI summary available on Insights page',
    ],
    logKeys: ['webhook', 'payment', 'anomaly'],
    variant: 'danger',
  },
  underpayment: {
    title: 'Scenario C — Underpayment',
    subtitle: 'Partial settlement · Balance tracking',
    gradient: 'from-amber-50 to-orange-50',
    titleColor: 'text-warning-text',
    icon: '◐',
    steps: [
      `${formatNaira(DEMO_PAYMENTS.underpayment.amount)} received — less than invoice total`,
      'Invoice marked PARTIAL',
      'Remaining balance visible on Exceptions page',
    ],
    logKeys: ['webhook', 'payment', 'partial'],
    variant: 'secondary',
  },
  overpayment: {
    title: 'Scenario D — Overpayment',
    subtitle: 'Refund / wallet credit workflow',
    gradient: 'from-violet-50 to-indigo-50',
    titleColor: 'text-violet-700',
    icon: '↑',
    steps: [
      `${formatNaira(DEMO_PAYMENTS.overpayment.amount)} exceeds outstanding balance`,
      'OverpaymentAction created',
      'Resolve via refund or wallet credit',
    ],
    logKeys: ['webhook', 'payment', 'overpay'],
    variant: 'secondary',
  },
};

export default function DemoModePage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<DemoPaymentKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { org } = useAuthStore();

  function pushLog(key: keyof typeof events, detailOverride?: string) {
    const e = events[key];
    const entry: LogEntry = {
      ...e,
      detail: detailOverride || e.detail,
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setLog(prev => [entry, ...prev]);
  }

  async function fireDemoPayment(key: DemoPaymentKey) {
    setLoading(key);
    setError(null);
    const preset = DEMO_PAYMENTS[key];

    try {
      await api.post(
        '/webhooks/mock',
        { ...preset, organizationId: org?.id },
        { headers: { 'x-demo-secret': process.env.NEXT_PUBLIC_DEMO_SECRET || '' } },
      );

      const scenario = SCENARIOS[key];
      scenario.logKeys.forEach((logKey, i) => {
        setTimeout(() => {
          const detail = logKey === 'payment'
            ? `${formatNaira(preset.amount)} on dedicated payment account ${preset.accountNumber} · ${preset.payerName}`
            : undefined;
          pushLog(logKey, detail);
        }, i * 500);
      });

      toast.success(`${scenario.title} — webhook accepted`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Webhook failed';
      if (err?.response?.status === 403) {
        setError('Event simulator is locked — check DEMO_MODE_ENABLED and NEXT_PUBLIC_DEMO_SECRET');
        toast.error('Simulator secret rejected by backend');
      } else {
        setError(message);
        toast.error('Backend not reachable — is it running on port 3002?');
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Event Simulator</h1>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Dev</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Inject test payment webhooks for local development and presentations</p>

      <div className="bg-slate-50 border border-slate-200 rounded-DEFAULT p-4 mb-6 flex items-start gap-3">
        <span className="text-lg">⚙</span>
        <div>
          <div className="text-sm font-bold text-slate-800">Developer testing console</div>
          <div className="text-xs text-slate-600 mt-0.5">
            Scenarios call <code className="bg-slate-100 px-1 rounded">POST /webhooks/mock</code> on Backend2 (gated by{' '}
            <code className="bg-slate-100 px-1 rounded">x-demo-secret</code>). Watch Reconciliation and Live Events update within 3 seconds.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-DEFAULT px-4 py-3 mb-6 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {(Object.keys(SCENARIOS) as DemoPaymentKey[]).map((key) => {
          const s = SCENARIOS[key];
          return (
            <Card key={key}>
              <div className={cn('px-5 py-4 border-b border-border bg-gradient-to-br flex items-center justify-between', s.gradient)}>
                <div>
                  <div className={cn('text-sm font-bold', s.titleColor)}>{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</div>
                </div>
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className="p-5">
                <div className="space-y-2 mb-4">
                  {s.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs">
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
                <Btn
                  className="w-full justify-center"
                  variant={s.variant === 'danger' ? 'danger' : s.variant === 'secondary' ? 'secondary' : 'primary'}
                  disabled={!!loading}
                  onClick={() => fireDemoPayment(key)}
                >
                  {loading === key ? 'Firing webhook…' : `▷ Run ${s.title.split('—')[0].trim()}`}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-5">
        <CardHeader title="Quick Triggers" subtitle="Simulated UI events (no backend call)" />
        <div className="p-5 flex flex-wrap gap-2">
          <Btn variant="secondary" onClick={() => pushLog('payment')}>⚡ Inbound Payment</Btn>
          <Btn variant="secondary" onClick={() => pushLog('match')}>✓ Auto-Match</Btn>
          <Btn variant="secondary" onClick={() => pushLog('review')}>⏳ Review Queue</Btn>
          <Btn variant="secondary" onClick={() => pushLog('anomaly')} className="text-danger border-red-200">⚠ Anomaly</Btn>
          <Btn variant="secondary" onClick={() => pushLog('override')} className="text-violet-600 border-violet-200">✎ Override</Btn>
          <Btn variant="secondary" onClick={() => pushLog('webhook')} className="text-teal-600 border-teal-200">↓ Webhook</Btn>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-sm font-bold text-foreground">Demo Event Log</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('w-1.5 h-1.5 rounded-full', log.length > 0 ? 'bg-success live-dot' : 'bg-gray-300')} />
              {log.length > 0 ? `${log.length} event${log.length > 1 ? 's' : ''}` : 'No events triggered'}
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setLog([])}>Clear</Btn>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-11 h-11 bg-muted rounded-DEFAULT flex items-center justify-center mb-3 text-muted-foreground">▷</div>
              <div className="text-sm font-bold text-foreground mb-1">Ready for Demo Day</div>
              <div className="text-xs text-muted-foreground">Run a scenario above — then check Reconciliation Center</div>
            </div>
          ) : log.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-3 border-b border-border last:border-0 slide-in">
              <div className={cn('w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 text-xs border', entry.bg, entry.color)}>{entry.icon}</div>
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-semibold', entry.color)}>{entry.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{entry.detail}</div>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono whitespace-nowrap pt-0.5">{entry.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
