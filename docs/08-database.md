# Database

PostgreSQL via Prisma. Schema: `prisma/schema.prisma`.

## Core Models

| Model | Description |
|-------|-------------|
| `Organization` | Merchant tenant, industry labels, Nomba sub-account refs |
| `User` | Org members with roles |
| `Customer` | Payer with VA fields + wallet balance |
| `Invoice` | Amount, status, `paymentToken`, `amountDue` |
| `Transaction` | Inbound Nomba payment |
| `Match` | Transaction ↔ invoice link with score breakdown |
| `AuditLog` | Immutable event log |

## Setup

```bash
npx prisma generate
npx prisma db push
```

## Multi-Tenancy

All tenant tables include `organizationId`. API enforces scope from JWT.
