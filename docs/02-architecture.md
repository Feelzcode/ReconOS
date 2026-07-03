# Architecture

## High-Level

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│  NestJS API  │────▶│ PostgreSQL  │
│  Frontend   │     │  (ReconOS)   │     │  (Prisma)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
       │                   │
       │ public /pay       │ OAuth + REST
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│   Payer     │     │  Nomba API   │
│  (browser)  │     │  + Webhooks  │
└─────────────┘     └──────────────┘
```

## Backend Modules

| Module | Responsibility |
|--------|----------------|
| `auth` | JWT login, org-scoped users |
| `customers` | CRUD + VA provisioning via Nomba |
| `invoices` | Billing, wallet apply, payment tokens |
| `pay` | Public payment page API (no auth) |
| `webhooks` | Nomba signature verification, ingestion |
| `reconciliation` | Matching engine, wallet, sync |
| `transactions` | Merchant transaction list |
| `exceptions` | Unmatched / anomalous payments |
| `treasury` | Org balance, settlements |
| `audit` | Immutable activity log |
| `insights` | Dashboard aggregates |
| `ai` | Gemini explanations for matches |

## Multi-Tenancy

Every query is scoped by `organizationId` from the JWT. Customers, invoices, and transactions never cross org boundaries.

## Responsive UI

Merchant tables use card layouts below `lg` (1024px); desktop tables unchanged.
