# AtomGrid Goals

AtomGrid Goals is a goal setting and tracking portal for organisations running an annual cycle with four quarterly check-ins. Employees own the draft of their goal sheet across thrust areas, managers approve and add structured feedback at each quarter, and admins govern the cycle, audit overrides, and shift the system clock when demoing across quarters.

## Stack

- Next.js 16 — App Router, React 19, Server Actions
- TypeScript (strict)
- Prisma 7 with the Neon serverless driver against Neon Postgres
- Auth.js v5 — Microsoft Entra ID provider, plus a signed-cookie role-switcher for the demo
- Tailwind v4 with `@theme` tokens, warm light single-mode
- Radix UI primitives wrapped in a Lattice/Jira/Stripe-leaning design system
- Recharts for analytics, Sonner for toasts
- Vitest for unit tests, Playwright for e2e and screenshot capture

## Local development

Prerequisites: Node 20+ and pnpm 10.

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, AUTH_URL
pnpm db:push
pnpm db:seed
pnpm dev
```

The app boots on http://localhost:3000. The top-right dropdown carries three primary demo identities; pick any to populate the role-aware sidebar and switch context instantly.

| Email          | Name          | Role     | Notes                                                |
| -------------- | ------------- | -------- | ---------------------------------------------------- |
| `emp@demo`     | Riya Sharma   | Employee | Approved sheet, Q1 check-in complete                  |
| `mgr@demo`     | Karthik Iyer  | Manager  | Direct reports include Riya, Aditya, Neha, Sanjay     |
| `admin@demo`   | Priya Nair    | Admin    | Governance, time-travel, audit log                    |

`More identities` in the dropdown exposes the rest of the seeded org — twelve employees and three managers across Sales, Engineering, and Operations.

## Project structure

```
src/
  app/(app)/          Authenticated route group — sidebar + header shell
    employee/         Goal sheet editor and quarterly check-ins
    manager/          Approval queue and team check-ins
    admin/            Cycles, users, time-travel, unlock, audit log
    reports/          Completion grid and analytics
  components/         Composed UI surfaces
  components/ui/      Primitives — Button, Input, Table, Dialog, Select, Sheet, DropdownMenu
  lib/                Server helpers — auth, db, audit, scoring, system-date
  lib/actions/        Server actions per surface
  lib/validators/     Zod schemas shared between client forms and server actions
prisma/               Schema, migrations, seed
e2e/                  Playwright specs and screenshot automation
```

## Scripts

```bash
pnpm dev               # next dev with Turbopack
pnpm build             # production build
pnpm typecheck         # tsc --noEmit

pnpm db:push           # apply schema to Neon without a migration
pnpm db:migrate        # create and apply a new migration
pnpm db:seed           # full seeded org with mixed sheet states
pnpm db:reset          # drop everything, re-migrate, re-seed
pnpm db:studio         # Prisma Studio against the configured Neon branch

pnpm screenshots       # capture every route across six identities and two viewports
pnpm e2e               # run all Playwright specs
pnpm e2e:ui            # Playwright's interactive runner
```

Each screenshot run lands in `test-results/screenshots/<ISO timestamp>/<email-key>/<viewport>/<route>.png`, so visual diffs between iterations are kept side by side.
