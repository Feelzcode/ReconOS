# ReconOs — Frontend

Next.js 14 + Tailwind dashboard for ReconOs.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```
Runs at http://localhost:3000

## Pages
- `/` — **Homepage** (marketing landing page: hero with animated iPhone mockup, how-it-works, features, reconciliation engine showcase, social proof, footer). Converted from the original ReconOs static design with all CSS scoped under `.reconos-home` so it can't collide with the dashboard's Tailwind styles.
- `/auth` — **Sign in / Create account** (split-panel design with live event stream and confidence-score animation on the brand panel). Converted from the original static design, CSS scoped under `.reconos-auth`. Wired to the real backend: `POST /auth/login`, `POST /auth/register`. Supports `?tab=signup` to open directly on the signup form. Redirects to `/dashboard` on success.
- `/dashboard` — overview + stats
- `/customers` — customer + VA management
- `/invoices` — invoice CRUD
- `/transactions` — payment list
- `/reconciliation` — the Reconciliation Center (3-column kanban)
- `/timeline` — Operations Timeline per transaction
- `/insights` — AI-powered insights (Claude)
- `/audit` — audit log
- `/demo` — Demo Mode for Demo Day (works without backend)

All dashboard pages use React Query with `placeholderData` mock fallbacks,
so the UI renders fully even before the backend is running — useful for
early frontend development before Nomba API keys arrive.

The homepage and auth page were originally designed as standalone static
HTML/CSS/JS files, then converted into real Next.js pages: HTML structure
is injected via `dangerouslySetInnerHTML`, CSS is scoped under a unique
parent class per page (`.reconos-home`, `.reconos-auth`) to prevent any
selector collisions with the rest of the app, and the original vanilla JS
(theme toggle, animations, form handling) runs via a `useEffect` that
injects and cleans up a `<script>` tag on mount/unmount. This preserves
every visual and interaction detail of the original design exactly,
while making it a real, connected part of the app rather than a
disconnected static file.

Connect to the backend by setting `NEXT_PUBLIC_API_URL` in `.env.local`
(used by dashboard pages) — the homepage/auth pages read
`window.RECONOS_API_URL` if set, otherwise default to
`http://localhost:3001/api` on localhost or `/api` in production.
