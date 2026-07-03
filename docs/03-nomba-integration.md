# Nomba Integration

ReconOS uses Nomba as the payment rail. All Nomba-specific logic lives in `src/nomba/` behind a provider interface (`NombaProvider`), with a mock implementation for local dev (`USE_MOCK_NOMBA=true`).

## Authentication

- `POST /auth/token/issue` with `clientId`, `clientSecret`, and `accountId` header
- Tokens cached in-memory with expiry refresh (1-hour TTL)

## Virtual Accounts

- `POST /accounts/virtual` when a customer is created
- Each customer gets `virtualAccountNumber`, `bankName`, Nomba refs stored in Prisma
- Amounts at Nomba boundary are **kobo**; ReconOS stores **Naira**

## Transactions

- Webhook ingestion (primary path)
- `transaction-sync.service` polls Nomba for missed events
- Requery for recovery when webhook delayed

## Webhooks

- Header: `nomba-signature`
- Algorithm: **HMAC-SHA256**
- Verified in `nomba-webhook.util.ts` before any state change

## Transfers & Bank Lookup

- `POST /transfers/bank/lookup` before outbound transfer
- Used in treasury for settlements and refund flows

## Configuration

| Variable | Purpose |
|----------|---------|
| `NOMBA_BASE_URL` | Sandbox or production host |
| `NOMBA_CLIENT_ID` | OAuth client |
| `NOMBA_CLIENT_SECRET` | OAuth secret |
| `NOMBA_ACCOUNT_ID` | Parent merchant account header |
| `NOMBA_WEBHOOK_SECRET` | Signature verification |
| `NOMBA_SUBACCOUNT_ID` | Org sub-account scope |

Never commit real values. See `.env.example`.
