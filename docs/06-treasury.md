# Treasury

Module: `src/treasury/`

## Purpose

Give merchants visibility into Nomba sub-account balances and enable settlements/refunds.

## Org Sub-Account

Each `Organization` has `nombaSubAccountId` and `nombaAccountRef`, created via Nomba sub-account API.

## Features

- Balance inquiry against Nomba
- Settlement transfers (bank lookup → transfer)
- Frontend treasury dashboard (`/treasury`)

## Safety

- Transfers require verified bank account via Nomba lookup
- All treasury actions logged in audit trail
- Org-scoped — no cross-merchant access
