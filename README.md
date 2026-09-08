# R&D Command Center

An internal platform for Leap Interactive's R&D team — manage ideas, projects,
tasks, BOM/inventory, experiments, and team workload in one place, with
WhatsApp-based idea capture, an AI assistant, and automated email
reports/reminders.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, Drizzle ORM, and
PostgreSQL.

## Features

- **Ideas → Projects pipeline** — Inbox → Evaluating → Approved →
  Converted/Rejected/Archived, one-click convert to a real project
- **Projects** — full workspace per project: Overview, Tasks (kanban),
  BOM, Experiments, Files/Links, Versions (with code snippet paste/copy/
  download for sharing logic with collaborators), Activity, AI copilot
- **Tasks** — global list + per-project board, dependencies ("blocked by"),
  tags, deadline/overdue notifications
- **Team** — workload view, skills, self-registration with admin
  approval (choose their role right at approval time), admin-triggered
  password reset
- **BOM & Inventory** — standalone quoting tool (with PDF/Word/Excel
  export) separate from the shared inventory tracker
- **Calendar** — project deadlines + task due dates + click-to-add
  standalone events, with a reminder email the day before an event
- **Billing** — subscription tracker with renewal reminders (bell +
  email, once every 24h until it renews)
- **Reports** — automatic weekly PDF report (Saturday evenings, your
  workspace's timezone) emailed to admins, plus on-demand custom
  date-range report generation
- **AI Assistant** — chat interface answering from real workspace data
  (Hugging Face by default, swappable to Groq)
- **WhatsApp bot** — capture ideas by texting a WhatsApp number; admin-only
  step to assign an owner; auto-finalizes if you go quiet mid-conversation
  for 10+ minutes
- **Notifications** — in-app bell (with working click-through per type,
  mark-all-read, clear-all) + email digests, reviewed and approved by an
  admin before anything sends
- **Security** — role-based permissions (admin vs member), rate limiting,
  audit log for structural/financial changes, admin approval gate on
  registration
- **Ops** — automated tests (Vitest), Sentry error monitoring, mobile-
  responsive layout

## Getting started

\`\`\`bash
npm install --legacy-peer-deps
cp .env.example .env   # fill in the values — see below
npm run db:push
npm run dev
\`\`\`

The app needs at minimum:

- `DATABASE_URL` — a Postgres connection string
- `SESSION_SECRET` — random string, e.g. `openssl rand -base64 32`
- `HF_TOKEN` — free Hugging Face token, powers the AI Assistant

Everything else in `.env.example` (WhatsApp, email, Sentry) is optional —
those features quietly no-op if left blank. Each block in the file explains
where to get the value and what it unlocks.

## First login

There's no seeded demo account by design — the first person to sign up
needs to be manually promoted to admin once, since new registrations need
an *existing* admin to approve them (a deliberate chicken-and-egg gate so
random people can't just create an account and get in).

1. Go to `/register`, sign up with a real email and password
2. Connect to your database directly and run:
   \`\`\`sql
   UPDATE users SET role='admin', status='active' WHERE email='your@email.com';
   \`\`\`
3. Log in — from here on, use the Team page to approve/manage everyone else

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync the database schema (run after every pull) |
| `npm run db:studio` | Visual database browser (Drizzle Studio) |
| `npm run db:wipe -- --confirm` | Wipe all work data (projects/tasks/ideas/etc), keeps user accounts |
| `npm test` | Run the automated test suite |

## Architecture notes

- **Background jobs** run inside the Next.js process itself
  (`src/instrumentation.ts`) on a 60-second interval — WhatsApp timeout
  finalization, email digests, deadline/renewal/event reminders, and the
  weekly report check. There's also a serverless-friendly equivalent at
  `/api/cron/finalize-stale` (secret-protected) for when this eventually
  moves to a host like Vercel where long-running background timers don't
  work the same way — point an external scheduler (e.g. cron-job.org) at
  it every few minutes.
- **WhatsApp** currently runs in Meta's test mode: only phone numbers
  manually verified in Meta's developer console can message the bot.
  Moving to a real production number removes that restriction, but
  requires Meta Business Verification.
- **Email** supports two providers (Resend or your own SMTP/Gmail) via
  `EMAIL_PROVIDER` in `.env` — nothing sends without one configured, and
  reminder/digest state is tracked on the relevant row itself (not via
  notifications), so clearing your notifications can never cause a
  duplicate reminder.

## Not yet built

- **Phase 5 integrations** (Slack/GitHub/Google Drive deep integration) —
  intentionally deferred; the Files tab already supports linking out to
  these as plain URLs
- **Hosting** — currently local-only