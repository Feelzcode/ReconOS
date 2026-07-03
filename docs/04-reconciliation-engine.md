# Reconciliation Engine

Located in `src/reconciliation/`. Core flow: **ingest → dedupe → score → match → settle**.

## Ingestion

1. Receive webhook or sync payload
2. Verify duplicate by `nombaEventId` / `nombaReference`
3. Fingerprint dedup: same VA + amount within 2-minute window
4. Create `Transaction` record

## Scoring

Match confidence from four signals:

| Signal | Checks |
|--------|--------|
| Amount | Payment vs invoice `amountDue` |
| Customer | VA belongs to invoice customer |
| Time | Proximity to due date / invoice age |
| Reference | Narration / invoice number in payment ref |

Thresholds:

- **≥ 85** — auto-match
- **60–84** — review queue
- **< 60** — exception or manual

## Wallet

- Overpayments create wallet credit
- `applyToOpenInvoices()` on new invoice creation
- Disposition events on customer statement

## Anomaly Detection

Payment > 3× 30-day average on same VA → `ANOMALY` exception flag.
