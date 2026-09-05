# UBE Academy

The internal platform for UBE Academy, a volleyball academy in Hulhumalé,
Maldives. It is a password-protected hub where players, the executive
committee and the coaching staff handle announcements, scheduling, player
tracking and finances. The only public page is the homepage.

Built with **Next.js (App Router)**, **Supabase** (auth, Postgres and row
level security) and **Tailwind CSS**. Deploys to Vercel as-is.

---

## What's in it

| Area                | Who                            | What                                                                                      |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| **Homepage**        | Public                         | Instagram grid, academy info, apply-to-join form, opt-in public fixtures, Log in            |
| **Dashboard**       | Everyone signed in             | Academy, Boys and Girls views. Announcements, next events with RSVP, role-aware stats        |
| **Schedule**        | Everyone signed in             | Academy, Boys and Girls views. List and month calendar, RSVP, attendance register, stats     |
| **Players**         | Coach, ExCo, Treasurer, Admin  | Roster split into boys and girls squads, full profiles, attendance percentage, match stats   |
| **My Profile**      | Everyone signed in             | Own account, theme, password change, and own player record if linked                        |
| **Financials**      | Coach, Treasurer, ExCo, Admin  | Entries, auto-rolled monthly and yearly statements, category breakdown, charts               |
| **Manage Accounts** | Coach, Admin                   | Create logins, assign roles, deactivate, reset passwords, link to roster rows                |

The Coach owns the academy, so Coach and Admin have identical reach.

The academy runs a boys squad and a girls squad. Staff work across both. A
player sees their own squad plus anything addressed to the whole academy, and
that is enforced by RLS rather than by hiding links. Full matrix:
[`docs/PERMISSIONS.md`](docs/PERMISSIONS.md).

---

## Try it without a database

Before wiring up Supabase, you can walk the entire app with seeded sample data:

```bash
npm install
echo "NEXT_PUBLIC_DEMO_MODE=true" >> .env.local
npm run dev
```

Sign in at <http://localhost:3000/login>. The screen lists five accounts, one
per role. Password is `ubedemo` for all of them.

Sign in as `player@ube.academy` to watch the restrictions work: Financials and
the roster are simply not reachable. Full details in
[`docs/DEMO.md`](docs/DEMO.md).

> Demo mode is an authentication bypass, off unless the flag is set, with a
> banner pinned to every screen while it is on. Never enable it on a
> deployment holding real member data.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com), then **SQL Editor**, **New query**,
and run the whole of:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_squads.sql
```

The first creates every table, the role helper functions, all RLS policies and
the rollup views. The second splits the academy into a boys squad and a girls
squad. Both are idempotent, so they are safe to re-run.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in from **Supabase**, **Project Settings**, **API**:

| Variable                        | Where it comes from         | Notes                                                            |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                 |                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key         | Safe in the browser, RLS constrains it                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role` `secret` key | **Server only.** Bypasses RLS. Never prefix with `NEXT_PUBLIC_`   |
| `INSTAGRAM_ACCESS_TOKEN`        | See below                   | Optional                                                          |

The academy details, currency (`MVR`), locale (`en-MV`) and time zone
(`Indian/Maldives`) are already set in `.env.example` and in
`src/lib/config.ts`.

### 4. Create the first admin

There is no public sign-up, so the first account is made by hand:

1. **Supabase**, **Authentication**, **Users**, **Add user**. Enter your email
   and a temporary password, and tick **Auto Confirm User**.
2. Open `supabase/bootstrap_admin.sql`, change the email at the top, run it.

### 5. Run it

```bash
npm run dev
```

Sign in at <http://localhost:3000/login>. You will be asked to choose a real
password, then you can create everyone else from **Accounts**.

### 6. Turn demo mode off

If you switched it on, set `NEXT_PUBLIC_DEMO_MODE=false` or delete the line,
so the app talks to Supabase instead of the sample data.

### 7. Instagram (optional)

The homepage feed needs an access token you have to generate yourself, because
the old Basic Display API was retired in December 2024. Step-by-step
instructions are in [`docs/INSTAGRAM.md`](docs/INSTAGRAM.md). **Without a token
the site works fine**, the grid shows a placeholder and a link to Instagram.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. **Vercel**, **New Project**, **Import**. The framework is detected
   automatically, there are no build settings to change.
3. Add the same environment variables under **Settings**, **Environment
   Variables**. `SUPABASE_SERVICE_ROLE_KEY` and `INSTAGRAM_ACCESS_TOKEN` must
   *not* be prefixed with `NEXT_PUBLIC_`.
4. Deploy.

Nothing else is required. No separate backend, no cron jobs.

---

## How accounts work

The Coach or an Admin creates accounts. Nobody signs themselves up.

1. **Accounts**, **Create account**. Enter a name, email and role.
2. The app generates a readable temporary password such as `Rally-setter-4821`
   and shows it **once**, with a copy button. Hand it over however you like.
3. On first sign-in the member is sent to `/set-password` and cannot reach the
   rest of the app until they have chosen their own. From that point nobody
   else knows their password.
4. **Reset password** issues a fresh temporary one and signs the member out
   everywhere.
5. **Deactivate** blocks sign-in and ends existing sessions, without deleting
   any attendance or stats history.

Player logins can be linked to a roster row, which is what lets a player see
their own attendance and stats, and only their own.

---

## Verifying the access rules

The restrictions are enforced by Postgres RLS policies, so a hand-written
`fetch` gets the same zero rows the UI does.

```
supabase/rls_smoke_test.sql
```

Run that in the SQL editor once you have a few accounts and finance entries.
It impersonates each role below the API layer and prints PASS or FAIL for
every rule, including *"Player cannot read the monthly summary view"* and
*"Coach (academy owner) can read finance_entries"*.

---

## Project layout

```
UBE/
├── public/
│   └── brand/            crest, black and white, one per theme
├── src/
│   ├── app/              routes, App Router
│   │   ├── page.tsx          public homepage
│   │   ├── login/            sign in
│   │   ├── set-password/     first-login password flow
│   │   └── (app)/            everything behind auth
│   │       ├── dashboard/  schedule/  players/
│   │       ├── profile/    financials/  accounts/
│   ├── components/       UI: shell, forms, charts, calendar, editors
│   ├── lib/
│   │   ├── actions/          server actions, all writes
│   │   ├── demo/             sample-data backend for demo mode
│   │   ├── supabase/         browser, server, admin and public clients
│   │   ├── queries/          shared reads
│   │   ├── roles.ts          the permission matrix, mirrored from RLS
│   │   ├── format.ts         money, dates, time zone handling
│   │   └── config.ts         academy details from env
│   └── middleware.ts     session refresh and route guard
├── scripts/
│   └── make-icons.mjs    builds the favicons from the crest, no deps
├── supabase/
│   ├── migrations/       0001 schema, RLS and views, 0002 squads
│   ├── bootstrap_admin.sql
│   └── rls_smoke_test.sql
└── docs/                 DEMO.md, INSTAGRAM.md, PERMISSIONS.md
```

`package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts` and
`postcss.config.mjs` sit at the root because Next.js, TypeScript and Tailwind
all require them there.

---

## Design

The crest ships as two transparent PNGs, black artwork for light mode and
white for dark, swapped with CSS on the `.dark` class so the right one is
painted on the first frame with no flash. The browser-tab and iOS icons are
generated from the same artwork by `npm run icons`.

Greyscale only, no accent colours anywhere. Hierarchy comes from contrast,
weight, spacing and hairline rules. Inter throughout, tabular figures for
every number. Light and dark themes are chosen with a Light, Dark, Auto
control, remembered in `localStorage` for the device and mirrored to the
member's profile so a new phone starts in the right theme.

Phones get a fixed bottom tab bar with labelled icons, and tables collapse to
cards. The charts in Financials are hand-drawn SVG using `currentColor`, so
they invert with the theme and pull in no charting library.

---

## Scripts

| Command             | Does                       |
| ------------------- | -------------------------- |
| `npm run dev`       | Dev server on :3000        |
| `npm run build`     | Production build           |
| `npm run start`     | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run lint`      | Next.js ESLint             |
| `npm run icons`     | Rebuild favicons from the crest |

---

## Security notes

- `.env.local` is git-ignored. Never commit `SUPABASE_SERVICE_ROLE_KEY`.
- `anon` is revoked from every table. The only object an anonymous visitor can
  read is the `public_events` view: four columns, and only for events an
  editor ticked "Show on the public homepage".
- Rollup views are declared `security_invoker = on`, so they honour the
  caller's RLS instead of the view owner's. A player selecting
  `finance_monthly_summary` gets nothing.
- `profiles` has a trigger blocking non-owners from changing their own role,
  active flag or email, even though they may edit their name and phone.
- An owner cannot demote or deactivate themselves. That needs the other owner.
- `NEXT_PUBLIC_DEMO_MODE` bypasses authentication entirely. It is off by
  default and shows a banner while on. Never set it in production.
