# API Reference

Base URL: `http://localhost:3002/api` (dev).

Auth: `Authorization: Bearer <jwt>` unless noted.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create org + user |
| POST | `/auth/login` | JWT tokens |
| GET | `/auth/templates` | Industry label templates |

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List org customers |
| POST | `/customers` | Create + provision VA |
| GET | `/customers/:id/statement` | Financial statement |

## Invoices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/invoices` | List (filter by status) |
| POST | `/invoices` | Create invoice |

## Pay (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pay/:token` | Payment page payload |

## Reconciliation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reconciliation/queue` | Review queue |
| POST | `/reconciliation/confirm/:matchId` | Confirm match |

## Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/nomba` | Nomba payment events |

See NestJS controllers in `src/*/` for full shapes.
