# ReconOs — Backend

Payment Operations OS for Nigerian SMEs · Nomba × DevCareer Hackathon 2026

## Stack
- **NestJS** + TypeScript
- **PostgreSQL** + Prisma ORM
- **Claude API** (async AI explanations)
- **Nomba APIs** (Virtual Accounts, Webhooks)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Seed demo data
npm run prisma:seed

# 6. Start development server
npm run start:dev
```

Server runs at: `http://localhost:3001/api`

## The One Switch

In `.env`:
```
USE_MOCK_NOMBA=true   # before July 1 (no API keys needed)
USE_MOCK_NOMBA=false  # from July 1 (Nomba sandbox active)
```

That's it. One env var. Everything else stays the same.

## Key Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Customers
- `POST /api/customers` — creates customer + provisions Nomba VA
- `GET /api/customers`
- `GET /api/customers/:id`

### Invoices
- `POST /api/invoices`
- `GET /api/invoices`
- `PATCH /api/invoices/:id`

### Webhooks
- `POST /api/webhooks/nomba` — real Nomba webhook (HMAC verified)
- `POST /api/webhooks/mock` — simulate payment for development/demo

### Reconciliation
- `GET /api/reconciliation/matches`
- `GET /api/reconciliation/review-queue`
- `POST /api/reconciliation/manual-match`
- `POST /api/reconciliation/confirm/:matchId`

### Insights
- `GET /api/insights`
- `GET /api/insights/anomalies`

### Audit
- `GET /api/audit-logs`

## Confidence Scoring

| Signal | Points |
|---|---|
| Exact amount match | 60 |
| Customer VA match | 25 |
| Time window | 10 |
| Reference field | 5 |
| **Total** | **100** |

| Score | Action |
|---|---|
| 95–100 | Auto-match, invoice marked PAID |
| 70–94 | Review queue |
| < 70 | Exception / manual review |

## Demo Day

Test the mock webhook:
```bash
curl -X POST http://localhost:3001/api/webhooks/mock \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"0123456789","amount":85000,"payerName":"ALABA ELECTRONICS"}'
```

Demo login:
- Email: `kemi@kemilogistics.ng`
- Password: `demo1234`
