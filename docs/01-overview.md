# Overview

ReconOS is a payment operations platform for Nigerian SMEs that collect via bank transfers into dedicated virtual accounts.

## Problem

Merchants (especially schools) issue invoices, share account numbers, and receive payments — but matching each transfer to the correct invoice is manual, slow, and error-prone.

## Solution

ReconOS provisions a **dedicated Nomba virtual account per customer**, listens for **webhooks**, and **automatically reconciles** inbound payments to open invoices with a confidence score. Staff review edge cases; everything else is hands-off.

## Personas

| Persona | Goal |
|---------|------|
| Bursar / Finance | See who paid, what's outstanding, send payment links |
| Operations | Resolve exceptions, confirm low-confidence matches |
| Customer (payer) | Pay via bank transfer or QR without logging in |

## Core Concepts

- **Organization** — multi-tenant merchant account
- **Customer** — payer with a dedicated VA (labeled "Student" in education template)
- **Invoice** — amount due, wallet credit applied, public `paymentToken` link
- **Transaction** — inbound payment from Nomba
- **Match** — link between transaction and invoice with confidence breakdown
- **Wallet** — credit from overpayments, auto-applied to future invoices
