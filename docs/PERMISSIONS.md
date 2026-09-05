# Roles and permissions

Two layers enforce this, and they are deliberately kept in sync:

| Layer                        | File                                | Purpose                          |
| ---------------------------- | ----------------------------------- | -------------------------------- |
| **Database, the real gate**  | `supabase/migrations/`              | RLS policies. Cannot be bypassed |
| **UI, what gets rendered**   | `src/lib/roles.ts`                  | Hides links and buttons          |

If you change one, change the other. The UI layer is a convenience only. A
player who guesses `/financials` is redirected by the page, and would receive
zero rows from Postgres even if the redirect were removed.

## Owners

The Coach owns UBE Academy, so **Coach and Admin have identical reach**: every
screen, including Financials and Manage Accounts. In the code they are grouped
as "owners", via `isOwner()` in `src/lib/roles.ts` and `public.is_owner()` in
SQL. Admin exists as a separate role only so someone can hold the keys without
also being the person running training.

## The matrix

| Capability                           | Admin | Coach | Treasurer | ExCo | Player |
| ------------------------------------ | :---: | :---: | :-------: | :--: | :----: |
| Dashboard and announcements (read)   |   ✓   |   ✓   |     ✓     |  ✓   |   ✓    |
| Post and edit announcements          |   ✓   |   ✓   |     ✓     |  ✓   |   .    |
| Schedule (read, role-filtered)       |   ✓   |   ✓   |     ✓     |  ✓   |   ✓    |
| Create and edit events               |   ✓   |   ✓   |     ✓     |  ✓   |   .    |
| RSVP to an event                     |   ✓   |   ✓   |     ✓     |  ✓   |   ✓    |
| Full roster (read)                   |   ✓   |   ✓   |     ✓     |  ✓   |   .    |
| Own player record (read)             |   ✓   |   ✓   |     ✓     |  ✓   |   ✓    |
| Edit players, attendance, stats      |   ✓   |   ✓   |     ✓     |  ✓   |   .    |
| **Financials (read)**                |   ✓   |   ✓   |     ✓     |  ✓   |   .    |
| **Financials (add, edit, delete)**   |   ✓   |   ✓   |     ✓     |  .   |   .    |
| Create accounts, assign roles        |   ✓   |   ✓   |     .     |  .   |   .    |

The Treasurer is an ExCo member with the books added: full control of
Financials, standard ExCo access everywhere else. ExCo can read the statements
but not change an entry.

The only role that is genuinely fenced in is Player.

## Squads

The academy runs a boys squad and a girls squad. Every player belongs to one,
set on their roster row. Events and announcements carry an optional squad:
tagged rows belong to that squad, untagged rows belong to the whole academy.

| Who      | Sees                                                    |
| -------- | ------------------------------------------------------- |
| Staff    | Both squads, plus everything academy-wide               |
| Player   | Their own squad, plus everything academy-wide           |
| No squad | Academy-wide rows only                                  |

That is one rule, `public.can_see_squad()`, layered on top of the role
audience. A row has to clear both to be readable:

```sql
create policy events_select on public.events for select to authenticated
  using (
    public.current_app_role() = any(visible_to_roles)
    and public.can_see_squad(squad)
  );
```

So a girls player is not merely redirected away from `/dashboard/boys`. The
boys announcements and boys practices never reach her browser on any page,
including the Academy Dashboard.

### The three views

Dashboard and Schedule each render three ways:

| Route                              | Shows                                                    |
| ---------------------------------- | -------------------------------------------------------- |
| `/dashboard`, `/schedule`          | Everything you can see, both squads combined              |
| `/dashboard/boys`, `/schedule/boys`   | Boys squad, plus anything for the whole academy        |
| `/dashboard/girls`, `/schedule/girls` | Girls squad, plus anything for the whole academy       |

Squad views keep the academy-wide rows on purpose. The Inter-Island
Invitational belongs to neither squad and both travel to it, so dropping it
from a squad schedule would hide a fixture people have to turn up to.

The squad routes redirect anyone not entitled to them. That redirect is the
polite half of the rule. RLS is the half that actually enforces it.

Mirrored in `src/lib/roles.ts` as `canViewSquad()` and `visibleSquads()`, and
in `src/lib/squads.ts` as `inSquadView()`.

## Per-row visibility

Announcements and events each carry a `visible_to_roles` array. A row is
readable only if the caller's role appears in it:

```sql
create policy events_select on public.events for select to authenticated
  using (
    public.current_app_role() = any(visible_to_roles)
    and public.can_see_squad(squad)
  );
```

So an ExCo meeting saved with `{admin,coach,treasurer,exco}` is not merely
hidden from players, it is never sent to their browser. Admin is always
included, enforced in `roles()` in `src/lib/actions/common.ts`.

## Player self-access

A `players` row can be linked to a login via `profile_id`. That link is what
lets a player see their own record and nobody else's:

```sql
create policy players_select on public.players for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());
```

Attendance and match stats use `public.my_player_id()`, which resolves to the
caller's own roster row, so the same rule covers their history.

## The one place RLS is bypassed

`src/lib/supabase/admin.ts` creates a service-role client, which ignores RLS
entirely. It is imported by exactly one module, `src/lib/actions/accounts.ts`,
and every function there calls `assertOwner()` first, which re-reads the
caller's role through the RLS-scoped client. Nothing from the form is trusted.
The file is marked `server-only`, so importing it into a Client Component is a
build error.

## Proving it

Run `supabase/rls_smoke_test.sql` in the Supabase SQL editor. It impersonates
each role below the API layer and prints PASS or FAIL for each rule, including
"Player cannot read the monthly summary view" and "Coach (academy owner) can
read finance_entries".

To check by hand, sign in as a player and try:

- Visiting `/financials`, redirected to the dashboard.
- Visiting `/accounts`, redirected to the dashboard.
- Visiting `/players`, redirected to your own profile.
- Visiting another player's `/players/<id>`, redirected to your own profile.
- Visiting the other squad's `/dashboard/<squad>` or `/schedule/<squad>`,
  redirected back to the academy view.
- Query Supabase directly, bypassing the app entirely. While signed in as the
  player, open the browser console on any page of the app and run:

  ```js
  // values from .env.local
  const url  = 'https://YOUR-PROJECT.supabase.co';
  const anon = '<your anon key>';
  const jwt  = JSON.parse(
    localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-auth-token')))
  ).access_token;

  await fetch(`${url}/rest/v1/finance_entries?select=*`, {
    headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
  }).then((r) => r.json());
  ```

  It returns `[]`. Not an error, not a filtered UI. Postgres simply has no
  rows to hand that role. The same request as the Treasurer returns everything.
