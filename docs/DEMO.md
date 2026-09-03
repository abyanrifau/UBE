# Demo mode

A placeholder backend so the whole app can be walked through before a Supabase
project exists. Turn it on with one environment variable:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Then `npm run dev` and sign in at <http://localhost:3000/login>. The login
screen lists all five accounts — click one to fill the form.

## The logins

Password is **`ubedemo`** for every account.

| Email                    | Role       | What you can reach                                     |
| ------------------------ | ---------- | ------------------------------------------------------ |
| `admin@ube.academy`      | Admin      | Everything, including Manage Accounts                  |
| `treasurer@ube.academy`  | Treasurer  | Full control of Financials, ExCo access elsewhere      |
| `exco@ube.academy`       | ExCo       | Reads Financials, cannot edit them                     |
| `coach@ube.academy`      | Coach      | Players and Schedule. Financials do not exist for them |
| `player@ube.academy`     | Player     | Own profile, schedule, announcements. Nothing else     |

## What is in the sample data

Dates are generated relative to today, so the calendar and the yearly
statement always look current.

- **14 players**, 13 active, with positions, heights, dates of birth and
  guardian details for the under-18s. Three are linked to logins.
- **17 events** spread across the last three weeks and the next month —
  practices, two matches, a tournament, two ExCo meetings and a social. Two of
  the meetings are ExCo-only; a few fixtures are flagged public.
- **Attendance** logged for every past session, so attendance percentages are
  populated across the roster.
- **Match stats** for eight players from the past friendly.
- **Five announcements**, two pinned, one restricted to ExCo.
- **Finance entries** for every month of the current year to date, across
  eleven categories, which roll up into the monthly and yearly statements.

## Seeing the permission rules work

Sign in as `player@ube.academy` and try:

| You do this                          | What happens                                    |
| ------------------------------------ | ----------------------------------------------- |
| Look at the nav                      | Only Dashboard, Schedule, My Profile            |
| Visit `/financials`                  | Redirected to the dashboard                     |
| Visit `/accounts`                    | Redirected to the dashboard                     |
| Visit `/players`                     | Redirected to your own profile                  |
| Visit another player's `/players/<id>` | Redirected to your own profile                |
| Read the announcements               | The ExCo-only kit reorder post is not there     |
| Read the schedule                    | The ExCo meetings are not there                 |

Then sign in as `coach@ube.academy`: the full roster appears, and Financials
still does not — that is the Coach/Treasurer split the brief asked for.

The in-memory store applies the same role filters as the RLS policies rather
than handing every row to everyone, so the demo does not overstate what each
role can see. It is still a simulation: the real proof is
`supabase/rls_smoke_test.sql` against a real database.

## Limits

- **Writes live in the Node process.** Add an event or a finance entry and it
  sticks while you browse, and disappears when the dev server restarts. On a
  serverless deployment it may not persist between requests at all.
- **The password flow is stubbed.** Changing a password succeeds and does
  nothing; there is no real credential to change.
- **No email, no tokens, no sessions to expire.** The session is a plain
  readable cookie naming one of the five accounts.

## Turning it off

Set `NEXT_PUBLIC_DEMO_MODE=false`, or delete the line, and restart. The app
goes back to talking to Supabase with no other changes.

> **This is an authentication bypass.** Anyone who can open the site can sign
> in as an admin. Never set the flag on a deployment holding real member data.
> A banner is pinned to the top of every screen while it is on, precisely so it
> cannot be left enabled by accident.

## How it works

Four files, all under `src/lib/demo/`, and nothing outside them knows the
difference:

| File          | Does                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `config.ts`   | The flag, the password, the cookie name                              |
| `accounts.ts` | The five logins — small and client-safe, so the login form can use it |
| `seed.ts`     | The sample academy, generated relative to today                      |
| `store.ts`    | In-memory tables, the derived views, and the role filters            |
| `client.ts`   | A small stand-in for the supabase-js query builder                   |
| `browser.ts`  | Sign in / sign out via a cookie                                      |
| `admin.ts`    | The `auth.admin` surface the Accounts page calls                     |

The four `createClient()` entry points in `src/lib/supabase/` each check the
flag and return the fake instead. Every page, query and server action is
unchanged — which is the point: the demo exercises the real code paths.
