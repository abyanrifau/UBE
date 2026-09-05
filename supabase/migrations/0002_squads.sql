-- =====================================================================
-- UBE Academy: split the academy into a boys squad and a girls squad.
--
-- Run this after 0001_init.sql. It is additive and idempotent, so it is
-- safe to re-run and safe against a database that already holds data.
--
-- The rule it encodes: a row tagged with a squad is visible to that squad
-- and to staff. A row with squad = null belongs to the whole academy and is
-- visible to everyone. Staff always see both squads.
-- =====================================================================

do $$ begin
  create type public.squad as enum ('boys', 'girls');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Columns. Nullable everywhere: on players it means "not assigned yet",
-- on events and announcements it means "the whole academy".
-- ---------------------------------------------------------------------
alter table public.players       add column if not exists squad public.squad;
alter table public.events        add column if not exists squad public.squad;
alter table public.announcements add column if not exists squad public.squad;

create index if not exists players_squad_idx       on public.players(squad);
create index if not exists events_squad_idx        on public.events(squad);
create index if not exists announcements_squad_idx on public.announcements(squad);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- The squad of the caller's own roster row, or null if they have no roster
-- row (a pure ExCo login, say) or have not been assigned to one yet.
create or replace function public.my_squad() returns public.squad
language sql stable security definer set search_path = public as $fn$
  select p.squad from public.players p where p.profile_id = auth.uid() limit 1
$fn$;

-- May the caller see a row belonging to this squad?
--   null    the whole academy, everyone sees it
--   staff   both squads, always
--   player  only their own squad
create or replace function public.can_see_squad(target public.squad) returns boolean
language sql stable security definer set search_path = public as $fn$
  select target is null
      or public.is_staff()
      or target = public.my_squad()
$fn$;

-- ---------------------------------------------------------------------
-- Policies. Squad filtering stacks on top of the existing role audience,
-- so a row has to clear both to be readable.
-- ---------------------------------------------------------------------
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (
    public.current_app_role() = any(visible_to_roles)
    and public.can_see_squad(squad)
  );

drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (
    public.current_app_role() = any(visible_to_roles)
    and public.can_see_squad(squad)
  );

-- RSVPs hang off events, so the squad rule reaches them through the join.
drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps for select to authenticated
  using (
    profile_id = auth.uid()
    or (public.is_staff() and exists (
      select 1 from public.events e
      where e.id = event_id and public.current_app_role() = any(e.visible_to_roles)))
  );

-- ---------------------------------------------------------------------
-- The public homepage can label a fixture with the squad playing it.
-- ---------------------------------------------------------------------
drop view if exists public.public_events;
create view public.public_events
with (security_invoker = off) as
select id, title, type, starts_at, location, squad
from public.events
where is_public and starts_at >= now() - interval '1 day'
order by starts_at;

grant select on public.public_events to anon, authenticated;
