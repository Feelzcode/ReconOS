# ReconOS

Automatic payment reconciliation powered by [Nomba](https://nomba.com) APIs.

Built for Nigerian SMEs — schools, property managers, clinics — who collect via dedicated bank accounts and need every naira matched to the right invoice without manual spreadsheets.

## Features

- Dedicated payment accounts per customer
- Automatic reconciliation with confidence scoring
- Invoice management & public payment links
- Treasury & merchant settlements
- Payment recovery (transaction requery)
- Exceptions & anomaly detection
- Wallet credits & overpayment handling
- Full audit trail
- Multi-tenant architecture (org-scoped data)

## Architecture

```
Customer
    ↓
Dedicated Payment Account (Nomba Virtual Account)
    ↓
Nomba
    ↓
Webhook
    ↓
ReconOS (ingest → match → settle)
    ↓
Invoice Paid
```

## Built With

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, React, Tailwind CSS, TypeScript |
| Backend | NestJS, Prisma, PostgreSQL, TypeScript |
| Payments | Nomba APIs (OAuth, VAs, transactions, transfers, webhooks) |
| AI | Google Gemini (match explanations & insights) |

## Nomba APIs Used

| API | Purpose |
|-----|---------|
| OAuth Authentication | Secure API access with token caching |
| Virtual Accounts | Dedicated payment accounts per customer |
| Transactions API | Synchronize inbound collections |
| Transaction Requery | Recover missed or delayed payments |
| Transfers | Merchant settlements and refunds |
| Bank Lookup | Verify destination accounts before transfer |
| Webhooks | Real-time payment notifications (HMAC-SHA256 verified) |

## Running Locally

**Prerequisites:** Node.js 20+, PostgreSQL

### Backend

```bash
cd ReconOs_Backend2/reconos-backend
cp .env.example .env   # fill in values — never commit .env
npm install
npx prisma generate
npx prisma db push
npm run start:dev      # http://localhost:3002/api
```

### Frontend

```bash
cd ReconOs_Frontend2/reconos-frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

### Environment Variables

Backend (see `.env.example` for full list):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NOMBA_BASE_URL`
- `NOMBA_CLIENT_ID`
- `NOMBA_CLIENT_SECRET`
- `NOMBA_WEBHOOK_SECRET`
- `NOMBA_ACCOUNT_ID`
- `NOMBA_SUBACCOUNT_ID`
- `FRONTEND_URL`
- `GEMINI_API_KEY`

Frontend:

- `NEXT_PUBLIC_API_URL`

## Screenshots

See [`docs/images/`](docs/images/) — add captures of:

- Dashboard
- Invoice creation
- Customers / students
- Payment request (deliver modal)
- Public payment page (`/pay/{token}`)
- Reconciliation center
- Treasury
- Exceptions
- Activity feed
- QR payment
- Operations audit

## Project Structure

```
reconos/
├── ReconOs_Frontend2/reconos-frontend/   # Next.js merchant & public pay UI
├── ReconOs_Backend2/reconos-backend/   # NestJS API + reconciliation engine
├── docs/                                  # Detailed documentation
└── render.yaml                            # Render deployment blueprint
```

> `reconos-web/` is a legacy prototype kept locally and excluded from this repository.

## Documentation

| Doc | Description |
|-----|-------------|
| [**Developer Documentation**](./docs/DEVELOPER_DOCUMENTATION.md) | **Full technical architecture (hackathon submission)** |
| [Overview](docs/01-overview.md) | Product vision & personas |
| [Architecture](docs/02-architecture.md) | System design |
| [Nomba Integration](docs/03-nomba-integration.md) | API usage & webhook flow |
| [Reconciliation Engine](docs/04-reconciliation-engine.md) | Matching logic |
| [Payment Lifecycle](docs/05-payment-lifecycle.md) | End-to-end flow |
| [Treasury](docs/06-treasury.md) | Settlements & balances |
| [API Reference](docs/07-api-reference.md) | Key endpoints |
| [Database](docs/08-database.md) | Schema overview |
| [Deployment](docs/09-deployment.md) | Render & production |
| [Roadmap](docs/10-roadmap.md) | What's next |

## Acknowledgements

Built for the **Nomba API Hackathon 2026**, leveraging Nomba's APIs for authentication, dedicated payment accounts, transaction synchronization, payment recovery, transfers, and webhook-driven reconciliation.
