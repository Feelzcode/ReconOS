# Nomba Hackathon 2026 — Submission Copy

Copy-paste answers for the submission form.

---

## One-line summary

**ReconOS is a payment reconciliation platform built on the Nomba API that automatically matches bank transfers received on dedicated virtual accounts to the correct invoice — eliminating manual reconciliation for schools, property managers, clinics, and other transfer-based businesses.**

---

## What progress has your team made so far?

### Features built

- **Nomba Virtual Accounts** — dedicated payment account per customer, provisioned on create
- **Webhook ingestion** — HMAC-SHA256 verified Nomba webhooks with idempotent payment processing
- **4-signal reconciliation engine** — scores payments on amount (60), virtual account (25), time (10), and reference (5); auto-matches at ≥95%, review queue at 70–94%
- **Invoice management** — create, track, overdue detection, wallet credit auto-apply
- **Public payment pages** — shareable `/pay/{token}` links with bank details, NQR QR, live payment status
- **Payment recovery** — hourly + nightly Nomba transaction sync when webhooks fail; manual recover-by-session
- **Treasury** — org sub-account balance, bank lookup, merchant withdrawals via Nomba transfers
- **Exceptions & anomalies** — unmatched payments, overpayment disposition (refund / wallet / apply)
- **Wallet credits** — overpayments become credit applied to future invoices
- **Multi-tenant architecture** — org-scoped data with industry templates (education, property, healthcare, logistics)
- **Audit trail & activity feed** — full financial event story per customer
- **AI match explanations** — Google Gemini enhances review-queue explanations
- **Mobile/tablet responsive UI** — card layouts on small screens; Stripe-inspired dashboard on desktop

### Technical milestones

- Full-stack deploy: **Vercel** (frontend) + **Render** (NestJS Docker API) + **Neon** (PostgreSQL)
- Nomba production API integration (OAuth, VAs, transactions, requery, transfers, webhooks)
- Prisma schema with 10+ models, duplicate detection, fingerprint dedup
- Public API for unauthenticated payment pages
- Developer documentation (architecture, Nomba integrations, API reference)

### Challenges solved

- Render Docker build path (`dist/main.js`) and Prisma OpenSSL binary targets for Debian
- CORS + API URL resolution between Vercel frontend and Render backend
- Nomba kobo/Naira boundary, webhook signature algorithm (HMAC-SHA256), duplicate webhook vs sync IDs
- Monorepo folder rename for Render root directory compatibility

### Still to build

- Email payment reminders
- Nomba fee pass-through on invoices
- PDF statement export
- Redis queue for webhook buffering at scale
- Merchant branding on public payment page
- Full fraud detection (beyond anomaly flags)
- Screenshots in docs for judge review

---

## GitHub Repository

**https://github.com/Feelzcode/ReconOS**

Public repository. Key paths:

- Frontend: `ReconOs_Frontend2/reconos-frontend`
- Backend: `ReconOs_Backend2/reconos-backend`
- Developer docs: `docs/DEVELOPER_DOCUMENTATION.md`
- UI/UX guide: `docs/UI_UX_DESIGN.md`

---

## Supporting Resources

| Resource | URL |
|----------|-----|
| **Live app** | https://recon-os-theta.vercel.app |
| **API (health)** | https://reconos-api.onrender.com/api/auth/templates |
| **Developer documentation** | https://github.com/Feelzcode/ReconOS/blob/main/docs/DEVELOPER_DOCUMENTATION.md |
| **UI/UX design guide (live)** | https://recon-os-theta.vercel.app/design |
| **UI/UX design guide (GitHub)** | https://github.com/Feelzcode/ReconOS/blob/main/docs/UI_UX_DESIGN.md |
| **Render blueprint** | `render.yaml` in repo root |

**Demo login:** `admin@royalcrown.edu.ng` / `demo1234` (if production DB seeded)

**Nomba webhook URL:** `https://reconos-api.onrender.com/api/webhooks/nomba`
