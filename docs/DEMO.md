# Demo mode

A placeholder backend so the whole app can be walked through before a Supabase
project exists. Turn it on with one environment variable:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Then `npm run dev` and sign in at <http://localhost:3000/login>. The login
screen lists all six accounts, click one to fill the form.

## The logins

Password is **`ubedemo`** for every account.

| Email                   | Role      | What you can reach                                  |
| ----------------------- | --------- | --------------------------------------------------- |
| `admin@ube.academy`     | Admin     | Everything, including Manage Accounts               |
| `coach@ube.academy`     | Coach     | Everything. The coach owns the academy              |
| `treasurer@ube.academy` | Treasurer | Full control of Financials, ExCo access elsewhere   |
| `exco@ube.academy`      | ExCo      | Reads Financials, cannot edit them                  |
| `player@ube.academy`    | Player    | Boys squad. Own profile, schedule, announcements    |
| `zaha@ube.academy`      | Player    | Girls squad. The mirror image of the boys player    |

## What is in the sample data

Dates are generated relative to today, so the calendar and the yearly
statement always look current. Amounts are in rufiyaa.

- **14 players**, 13 active, split into a boys squad of seven and a girls
  squad of six, with positions, heights, dates of birth, and guardian details
  for the few who are under 18. Three are linked to logins.
- **23 events** across the last three weeks and the next month. The girls
  train at 18:00 and the boys at 20:00, each squad has its own fixtures, and
  the conditioning session, the Inter-Island Invitational and the squad night
  belong to the whole academy. The meetings are committee-only and a few
  fixtures are flagged public.
- **Attendance** logged for every past session, so attendance percentages are
  populated across the roster.
- **Match stats** for eight players from the past friendly.
- **Six announcements**, two pinned, one restricted to the committee, and one
  each addressed to the boys and girls squads.
- **Finance entries** for every month of the current year to date, across
  eleven categories, which roll up into the monthly and yearly statements.

## Seeing the permission rules work

Sign in as `player@ube.academy` and try:

| You do this                            | What happens                                |
| -------------------------------------- | ------------------------------------------- |
| Look at the nav                        | Only Dashboard, Schedule, My Profile        |
| Visit `/financials`                    | Redirected to the dashboard                 |
| Visit `/accounts`                      | Redirected to the dashboard                 |
| Visit `/players`                       | Redirected to your own profile              |
| Visit another player's `/players/<id>` | Redirected to your own profile              |
| Read the announcements                 | The committee-only kit post is not there    |
| Read the schedule                      | The ExCo meetings are not there             |
| Open `/dashboard/girls`                | Redirected, the boys player has no business there |
| Look anywhere at all                   | No girls practice, no girls announcement, on any page |

Sign in as `player@ube.academy` (boys) and `zaha@ube.academy` (girls) in turn
to see the mirror image of each other.

Then sign in as `coach@ube.academy`. Everything appears, both squads plus
Financials and Manage Accounts, because the coach owns the academy. Compare that
with `exco@ube.academy`, who can read the statements but has no Add entry
button and no Accounts tab.

The in-memory store applies the same role filters as the RLS policies rather
than handing every row to everyone, so the demo does not overstate what each
role can see. It is still a simulation. The real proof is
`supabase/rls_smoke_test.sql` against a real database.

## Limits

- **Writes live in the Node process.** Add an event or a finance entry and it
  sticks while you browse, then disappears when the dev server restarts. On a
  serverless deployment it may not persist between requests at all.
- **The password flow is stubbed.** Changing a password succeeds and does
  nothing, because there is no real credential to change.
- **No email, no tokens, no sessions to expire.** The session is a plain
  readable cookie naming one of the six accounts.

## Turning it off

Set `NEXT_PUBLIC_DEMO_MODE=false`, or delete the line, and restart. The app
goes back to talking to Supabase with no other changes.

> **This is an authentication bypass.** Anyone who can open the site can sign
> in as an admin. Never set the flag on a deployment holding real member data.
> A banner is pinned to the top of every screen while it is on, precisely so it
> cannot be left enabled by accident.

## How it works

Everything lives under `src/lib/demo/`, and nothing outside it knows the
difference:

| File          | Does                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `config.ts`   | The flag, the password, the cookie name                              |
| `accounts.ts` | The six logins, small and client-safe so the login form can use it    |
| `seed.ts`     | The sample academy, generated relative to today                      |
| `store.ts`    | In-memory tables, the derived views, and the role filters            |
| `client.ts`   | A small stand-in for the supabase-js query builder                   |
| `browser.ts`  | Sign in and sign out via a cookie                                    |
| `admin.ts`    | The `auth.admin` surface the Accounts page calls                     |

The four `createClient()` entry points in `src/lib/supabase/` each check the
flag and return the fake instead. Every page, query and server action is
unchanged, which is the point: the demo exercises the real code paths.
