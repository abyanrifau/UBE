# Roles and permissions

Two layers enforce this, and they are deliberately kept in sync:

| Layer                              | File                                    | Purpose                          |
| ---------------------------------- | --------------------------------------- | -------------------------------- |
| **Database (the real gate)**       | `supabase/migrations/0001_init.sql`     | RLS policies. Cannot be bypassed |
| **UI (what gets rendered)**        | `src/lib/roles.ts`                      | Hides links and buttons          |

If you change one, change the other. The UI layer is a convenience only — a
player who guesses `/financials` is redirected by the page *and* would receive
zero rows from Postgres even if the redirect were removed.

## The matrix

| Capability                            | Admin | Treasurer | ExCo | Coach | Player |
| ------------------------------------- | :---: | :-------: | :--: | :---: | :----: |
| Dashboard + announcements (read)       |  ✓   |     ✓     |  ✓   |   ✓   |   ✓    |
| Post / edit announcements              |  ✓   |     ✓     |  ✓   |   ✓   |   —    |
| Schedule (read, role-filtered)         |  ✓   |     ✓     |  ✓   |   ✓   |   ✓    |
| Create / edit events                   |  ✓   |     ✓     |  ✓   |   ✓   |   —    |
| RSVP to an event                       |  ✓   |     ✓     |  ✓   |   ✓   |   ✓    |
| Full roster (read)                     |  ✓   |     ✓     |  ✓   |   ✓   |   —    |
| Own player record (read)               |  ✓   |     ✓     |  ✓   |   ✓   |   ✓    |
| Edit players / attendance / stats      |  ✓   |     ✓     |  ✓   |   ✓   |   —    |
| **Financials (read)**                  |  ✓   |     ✓     |  ✓   |   —   |   —    |
| **Financials (add / edit / delete)**   |  ✓   |     ✓     |  —   |   —   |   —    |
| Create accounts, assign roles          |  ✓   |     —     |  —   |   —   |   —    |

The Treasurer is an ExCo member with the books added, exactly as specified:
admin-level control of Financials, standard ExCo access everywhere else.

## Per-row visibility

Announcements and events each carry a `visible_to_roles` array. A row is
readable only if the caller's role appears in it:

```sql
create policy events_select on public.events for select to authenticated
  using (public.current_app_role() = any(visible_to_roles));
```

So an ExCo meeting saved with `{admin,treasurer,exco}` is not merely hidden
from players — it is never sent to their browser. Admin is always included,
enforced in `roles()` in `src/lib/actions/common.ts`.

## Player self-access

A `players` row can be linked to a login via `profile_id`. That link is what
lets a player see their own record and nobody else's:

```sql
create policy players_select on public.players for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());
```

Attendance and match stats use `public.my_player_id()`, which resolves to the
caller's own roster row, so the same rule applies to their history.

## The one place RLS is bypassed

`src/lib/supabase/admin.ts` creates a service-role client, which ignores RLS
entirely. It is imported by exactly one module — `src/lib/actions/accounts.ts`
— and every function there calls `assertAdmin()` first, which re-reads the
caller's role through the *RLS-scoped* client. Nothing from the form is
trusted. The file is marked `server-only`, so importing it into a Client
Component is a build error.

## Proving it

Run `supabase/rls_smoke_test.sql` in the Supabase SQL editor. It impersonates
each role below the API layer and prints PASS/FAIL for each rule — including
"Coach cannot read finance_entries" and "Player cannot read the monthly
summary view".

To check by hand, sign in as a player and try:

- Visiting `/financials` → redirected to the dashboard.
- Visiting `/players` → redirected to your own profile.
- Visiting `/players/<someone-else's-id>` → 404.
- Query Supabase directly, bypassing the app entirely — while signed in as the
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

  → `[]`. Not an error, not a filtered UI — Postgres simply has no rows to
  return for that role. The same request as the Treasurer returns everything.
