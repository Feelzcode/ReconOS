# Payment Lifecycle

## 1. Customer Onboarding

Merchant creates customer → ReconOS calls Nomba → dedicated VA issued.

## 2. Invoice Creation

Wallet credit auto-applied. `amountDue` and `paymentToken` generated.

## 3. Deliver Payment Request

Merchant shares:

- Link: `{FRONTEND_URL}/pay/{paymentToken}`
- Account number on payment page
- NQR QR code (EMVCo TLV)

## 4. Customer Pays

Payer transfers to VA or scans QR. No ReconOS login required.

## 5. Nomba Webhook

`POST /webhooks/nomba` — signature verified → transaction ingested.

## 6. Reconciliation

Engine scores match → auto-match or review queue.

## 7. Invoice Settled

Status updated. Audit log + financial events on customer statement.

## 8. Live Status

Public page polls `GET /api/pay/:token`: `AWAITING` → `CONFIRMING` → `CONFIRMED`.
