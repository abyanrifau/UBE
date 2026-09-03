# UBE Academy

The internal platform for UBE Academy — a password-protected hub where
players, the executive committee and the coaching staff handle announcements,
scheduling, player tracking and finances. The only public page is the
homepage.

Built with **Next.js (App Router)**, **Supabase** (auth + Postgres + row level
security) and **Tailwind CSS**. Deploys to Vercel as-is.

---

## What's in it

| Area                 | Who                            | What                                                                                     |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| **Homepage**         | Public                         | Instagram grid, academy info, contact, opt-in public fixtures, Log in                     |
| **Dashboard**        | Everyone signed in             | Announcements board with per-role audiences, next four events with RSVP, role-aware stats |
| **Schedule**         | Everyone signed in             | List + month calendar, five event types, RSVP, attendance register, match stats           |
| **Players**          | Coach, ExCo, Treasurer, Admin  | Roster, full profiles, attendance % per player, per-match stats, coach notes              |
| **My Profile**       | Everyone signed in             | Own account, theme, password change, and own player record if linked                      |
| **Financials**       | Treasurer, ExCo, Admin         | Entries, auto-rolled monthly and yearly statements, category breakdown, charts            |
| **Manage Accounts**  | Admin                          | Create logins, assign roles, deactivate, reset passwords, link to roster rows             |

Full permission matrix: [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md).

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com), then **SQL Editor → New query** and
run the whole of:

```
supabase/migrations/0001_init.sql
```

That creates every table, the role helper functions, all RLS policies and the
rollup views. It is idempotent — safe to re-run.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in from **Supabase → Project Settings → API**:

| Variable                        | Where it comes from        | Notes                                        |
| ------------------------------- | -------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                |                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key        | Safe in the browser; RLS constrains it        |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role` `secret` key | **Server only.** Bypasses RLS. Never prefix with `NEXT_PUBLIC_` |
| `INSTAGRAM_ACCESS_TOKEN`        | See below                  | Optional                                      |
| `NEXT_PUBLIC_CURRENCY`          | e.g. `SGD`, `IDR`, `USD`   | ISO 4217. **Set this** — the default is `USD` |
| `NEXT_PUBLIC_TIME_ZONE`         | e.g. `Asia/Singapore`      | IANA zone the calendar is written in          |

### 4. Create the first admin

There is no public sign-up, so the first account is made by hand:

1. **Supabase → Authentication → Users → Add user.** Enter your email and a
   temporary password, and tick **Auto Confirm User**.
2. Open `supabase/bootstrap_admin.sql`, change the email at the top, run it.

### 5. Run it

```bash
npm run dev
```

Sign in at <http://localhost:3000/login>. You will be asked to choose a real
password, then you can create everyone else from **Accounts**.

### 6. Add the crest

Save the academy logo — black artwork on a white background, exactly as
supplied — to `public/brand/ube-logo.png`. No editing needed: the background
is keyed out and the mark inverted to white for dark mode entirely in CSS.
Details in [`public/brand/README.md`](public/brand/README.md).

### 7. Instagram (optional)

The homepage feed needs an access token you have to generate yourself — the
old Basic Display API was retired in December 2024. Step-by-step instructions
are in [`docs/INSTAGRAM.md`](docs/INSTAGRAM.md). **Without a token the site
works fine**; the grid shows a placeholder and a link to Instagram.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. **Vercel → New Project → Import**. The framework is detected automatically;
   no build settings to change.
3. Add the same environment variables under **Settings → Environment
   Variables**. `SUPABASE_SERVICE_ROLE_KEY` and `INSTAGRAM_ACCESS_TOKEN` must
   *not* be `NEXT_PUBLIC_`.
4. Deploy.

Nothing else is required — no separate backend, no cron jobs.

---

## How accounts work

Admins create accounts; nobody signs themselves up.

1. **Accounts → Create account.** Enter a name, email and role.
2. The app generates a readable temporary password (`Rally-setter-4821`) and
   shows it **once**, with a copy button. Hand it over however you like.
3. On first sign-in the member is sent to `/set-password` and cannot reach the
   rest of the app until they have chosen their own. From that point no admin
   knows their password.
4. **Reset password** issues a fresh temporary one and signs the member out
   everywhere.
5. **Deactivate** blocks sign-in and ends existing sessions, without deleting
   any attendance or stats history.

Player logins can be linked to a roster row, which is what lets a player see
their own attendance and stats — and only their own.

---

## Verifying the access rules

The brief asks that restrictions be real, not cosmetic. They are enforced by
Postgres RLS policies, so a hand-written `fetch` gets the same zero rows the
UI does.

```
supabase/rls_smoke_test.sql
```

Run that in the SQL editor once you have a few accounts and finance entries.
It impersonates each role below the API layer and prints PASS/FAIL for every
rule, including *"Coach cannot read finance_entries"* and *"Player cannot read
the monthly summary view"*.

---

## Project layout

```
UBE/
├── public/
│   └── brand/            logo and brand assets (drop ube-logo.png here)
├── src/
│   ├── app/              routes — App Router
│   │   ├── page.tsx          public homepage
│   │   ├── login/            sign in
│   │   ├── set-password/     first-login password flow
│   │   └── (app)/            everything behind auth
│   │       ├── dashboard/  schedule/  players/
│   │       ├── profile/    financials/  accounts/
│   ├── components/       UI — shell, forms, charts, calendar, editors
│   ├── lib/
│   │   ├── actions/          server actions (all writes)
│   │   ├── supabase/         browser / server / admin / public clients
│   │   ├── queries/          shared reads
│   │   ├── roles.ts          the permission matrix, mirrored from RLS
│   │   ├── format.ts         money, dates, time zone handling
│   │   └── config.ts         academy details from env
│   └── middleware.ts     session refresh + route guard
├── supabase/
│   ├── migrations/       0001_init.sql — schema, RLS, views
│   ├── bootstrap_admin.sql
│   └── rls_smoke_test.sql
└── docs/                 INSTAGRAM.md, PERMISSIONS.md
```

`package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts` and
`postcss.config.mjs` sit at the root because Next.js, TypeScript and Tailwind
all require them there.

---

## Design

Greyscale only — no accent colours anywhere. Hierarchy comes from contrast,
weight, spacing and hairline rules. Inter throughout, tabular figures for every
number. Light and dark themes are chosen with a Light / Dark / Auto control,
remembered in `localStorage` for the device and mirrored to the member's
profile so a new phone starts in the right theme.

Phones get a fixed bottom tab bar with labelled icons; tables collapse to
cards. The charts in Financials are hand-drawn SVG using `currentColor`, so
they invert with the theme and pull in no charting library.

---

## Scripts

| Command             | Does                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Dev server on :3000                      |
| `npm run build`     | Production build                         |
| `npm run start`     | Serve the production build               |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | Next.js ESLint                           |

---

## Security notes

- `.env.local` is git-ignored. Never commit `SUPABASE_SERVICE_ROLE_KEY`.
- `anon` is revoked from every table. The only object an anonymous visitor can
  read is the `public_events` view — four columns, and only for events an
  editor ticked "Show on the public homepage".
- Rollup views are declared `security_invoker = on`, so they honour the
  caller's RLS instead of the view owner's. A coach selecting
  `finance_monthly_summary` gets nothing.
- `profiles` has a trigger blocking non-admins from changing their own role,
  active flag or email, even though they may edit their name and phone.
- An admin cannot demote or deactivate themselves — that needs another admin.
