// src/components/reconciliation/ConfidenceBreakdown.tsx
//
// Visual breakdown of the 4-signal scoring engine. This is the single
// detail most other hackathon teams will not have — showing judges
// exactly how confidence was computed, not just the final percentage.

import { SCORE_SIGNAL_LABELS } from '@/lib/merchant-vocabulary';

interface Props {
  scoreAmount?: number;
  scoreCustomer?: number;
  scoreTime?: number;
  scoreReference?: number;
}

const MAX = { amount: 60, customer: 25, time: 10, reference: 5 };

function Row({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  const color = pct === 100 ? 'bg-success' : pct > 0 ? 'bg-warning' : 'bg-gray-200';
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="font-bold text-foreground w-8 text-right">{score}/{max}</span>
      </div>
    </div>
  );
}

export default function ConfidenceBreakdown({
  scoreAmount = 0, scoreCustomer = 0, scoreTime = 0, scoreReference = 0,
}: Props) {
  const total = scoreAmount + scoreCustomer + scoreTime + scoreReference;
  return (
    <div className="bg-white border border-border rounded-sm p-2.5 space-y-1.5">
      <Row label={SCORE_SIGNAL_LABELS.amount} score={scoreAmount} max={MAX.amount} />
      <Row label={SCORE_SIGNAL_LABELS.customer} score={scoreCustomer} max={MAX.customer} />
      <Row label={SCORE_SIGNAL_LABELS.time} score={scoreTime} max={MAX.time} />
      <Row label={SCORE_SIGNAL_LABELS.reference} score={scoreReference} max={MAX.reference} />
      <div className="flex items-center justify-between pt-1.5 border-t border-border">
        <span className="text-[11px] font-bold text-foreground">Total</span>
        <span className="text-xs font-extrabold text-success">{total}/100</span>
      </div>
    </div>
  );
}
