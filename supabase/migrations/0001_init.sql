-- =====================================================================
-- UBE Academy: schema, roles and row level security
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'treasurer', 'exco', 'coach', 'player');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_type as enum ('practice', 'match', 'tournament', 'meeting', 'event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rsvp_status as enum ('going', 'not_going', 'maybe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finance_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  full_name           text not null default '',
  role                public.app_role not null default 'player',
  is_active           boolean not null default true,
  must_set_password   boolean not null default true,
  theme               text not null default 'system' check (theme in ('light','dark','system')),
  phone               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- players: roster row, optionally linked to a login
-- ---------------------------------------------------------------------
create table if not exists public.players (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid unique references public.profiles(id) on delete set null,
  full_name         text not null,
  jersey_number     int,
  position          text,
  height_cm         numeric(5,1),
  weight_kg         numeric(5,1),
  date_of_birth     date,
  email             text,
  phone             text,
  guardian_name     text,
  guardian_phone    text,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists players_active_idx on public.players(is_active, full_name);

-- ---------------------------------------------------------------------
-- events: practices, matches, tournaments, meetings, general events
-- visible_to_roles decides who may read the row (enforced by RLS)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  type              public.event_type not null default 'practice',
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  location          text,
  description       text,
  visible_to_roles  public.app_role[] not null
                      default array['admin','treasurer','exco','coach','player']::public.app_role[],
  rsvp_enabled      boolean not null default true,
  -- Opt-in: when true, the title/date/location appear on the public homepage.
  is_public         boolean not null default false,
  created_by        uuid references public.profiles(id) on delete set null,
  created_by_name   text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists events_starts_at_idx on public.events(starts_at);

-- ---------------------------------------------------------------------
-- event_rsvps
-- ---------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  status      public.rsvp_status not null,
  updated_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

-- ---------------------------------------------------------------------
-- attendance: one row per (event, player)
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  player_id    uuid not null references public.players(id) on delete cascade,
  status       public.attendance_status not null,
  note         text,
  recorded_by  uuid references public.profiles(id) on delete set null,
  recorded_at  timestamptz not null default now(),
  unique (event_id, player_id)
);
create index if not exists attendance_player_idx on public.attendance(player_id);

-- ---------------------------------------------------------------------
-- match_stats: optional per-match numbers
-- ---------------------------------------------------------------------
create table if not exists public.match_stats (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  points        int not null default 0,
  kills         int not null default 0,
  blocks        int not null default 0,
  aces          int not null default 0,
  digs          int not null default 0,
  assists       int not null default 0,
  serve_errors  int not null default 0,
  notes         text,
  recorded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (event_id, player_id)
);
create index if not exists match_stats_player_idx on public.match_stats(player_id);

-- ---------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  body              text not null,
  pinned            boolean not null default false,
  visible_to_roles  public.app_role[] not null
                      default array['admin','treasurer','exco','coach','player']::public.app_role[],
  author_id         uuid references public.profiles(id) on delete set null,
  author_name       text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements(pinned desc, created_at desc);

-- ---------------------------------------------------------------------
-- finance_entries: RESTRICTED
-- ---------------------------------------------------------------------
create table if not exists public.finance_entries (
  id            uuid primary key default gen_random_uuid(),
  entry_date    date not null,
  kind          public.finance_kind not null,
  category      text not null default 'General',
  description   text not null default '',
  amount        numeric(12,2) not null check (amount >= 0),
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists finance_entries_date_idx on public.finance_entries(entry_date desc);

-- =====================================================================
-- Role helpers. SECURITY DEFINER so policies can read profiles.role
-- without tripping RLS on profiles itself (which would recurse).
-- =====================================================================
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $fn$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active
$fn$;

create or replace function public.has_any_role(roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(public.current_app_role() = any(roles), false)
$fn$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin']::public.app_role[])
$fn$;

-- Owners hold the academy itself. The Coach owns UBE, so Coach and Admin
-- have identical reach: every table, including the financial ones and
-- account management.
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach']::public.app_role[])
$fn$;

-- Anyone with a back-office seat.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach','treasurer','exco']::public.app_role[])
$fn$;

-- Roster, attendance and scheduling editors.
create or replace function public.can_manage_roster() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach','treasurer','exco']::public.app_role[])
$fn$;

-- Announcement authors.
create or replace function public.can_post_announcements() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach','treasurer','exco']::public.app_role[])
$fn$;

-- Finance READ: owners, treasurer and exco. Never a player.
create or replace function public.can_view_finance() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach','treasurer','exco']::public.app_role[])
$fn$;

-- Finance WRITE: owners and the treasurer. ExCo reads only.
create or replace function public.can_manage_finance() returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.has_any_role(array['admin','coach','treasurer']::public.app_role[])
$fn$;

-- The roster row belonging to the signed-in user, if any.
create or replace function public.my_player_id() returns uuid
language sql stable security definer set search_path = public as $fn$
  select id from public.players where profile_id = auth.uid()
$fn$;

-- =====================================================================
-- Triggers
-- =====================================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

do $blk$
declare t text;
begin
  foreach t in array array['profiles','players','events','announcements','finance_entries'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $blk$;

-- New auth user -> profile row. Metadata is supplied by the admin API route.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, email, full_name, role, must_set_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'player'),
    coalesce((new.raw_user_meta_data ->> 'must_set_password')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who is not an owner may edit their own name/phone/theme but never
-- their role, their active flag, or their email.
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if public.is_owner() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email then
    raise exception 'not allowed to change privileged profile fields';
  end if;
  return new;
end $fn$;

drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Called by the client once a new password has actually been saved.
create or replace function public.complete_password_setup() returns void
language sql security definer set search_path = public as $fn$
  update public.profiles set must_set_password = false where id = auth.uid();
$fn$;

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.players         enable row level security;
alter table public.events          enable row level security;
alter table public.event_rsvps     enable row level security;
alter table public.attendance      enable row level security;
alter table public.match_stats     enable row level security;
alter table public.announcements   enable row level security;
alter table public.finance_entries enable row level security;

-- profiles -------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles for insert to authenticated
  with check (public.is_owner());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles for delete to authenticated
  using (public.is_owner());

-- players --------------------------------------------------------------
drop policy if exists players_select on public.players;
create policy players_select on public.players for select to authenticated
  using (public.is_staff() or profile_id = auth.uid());

drop policy if exists players_write on public.players;
create policy players_write on public.players for all to authenticated
  using (public.can_manage_roster())
  with check (public.can_manage_roster());

-- events ---------------------------------------------------------------
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (public.current_app_role() = any(visible_to_roles));

drop policy if exists events_write on public.events;
create policy events_write on public.events for all to authenticated
  using (public.can_manage_roster())
  with check (public.can_manage_roster());

-- event_rsvps ----------------------------------------------------------
drop policy if exists rsvps_select on public.event_rsvps;
create policy rsvps_select on public.event_rsvps for select to authenticated
  using (
    profile_id = auth.uid()
    or (public.is_staff() and exists (
      select 1 from public.events e
      where e.id = event_id and public.current_app_role() = any(e.visible_to_roles)))
  );

drop policy if exists rsvps_insert_self on public.event_rsvps;
create policy rsvps_insert_self on public.event_rsvps for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (select 1 from public.events e
                where e.id = event_id and public.current_app_role() = any(e.visible_to_roles))
  );

drop policy if exists rsvps_update_self on public.event_rsvps;
create policy rsvps_update_self on public.event_rsvps for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists rsvps_delete_self on public.event_rsvps;
create policy rsvps_delete_self on public.event_rsvps for delete to authenticated
  using (profile_id = auth.uid() or public.is_owner());

-- attendance -----------------------------------------------------------
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated
  using (public.is_staff() or player_id = public.my_player_id());

drop policy if exists attendance_write on public.attendance;
create policy attendance_write on public.attendance for all to authenticated
  using (public.can_manage_roster())
  with check (public.can_manage_roster());

-- match_stats ----------------------------------------------------------
drop policy if exists match_stats_select on public.match_stats;
create policy match_stats_select on public.match_stats for select to authenticated
  using (public.is_staff() or player_id = public.my_player_id());

drop policy if exists match_stats_write on public.match_stats;
create policy match_stats_write on public.match_stats for all to authenticated
  using (public.can_manage_roster())
  with check (public.can_manage_roster());

-- announcements --------------------------------------------------------
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (public.current_app_role() = any(visible_to_roles));

drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements for all to authenticated
  using (public.can_post_announcements())
  with check (public.can_post_announcements());

-- finance_entries: restricted to owners, treasurer and exco -------------
drop policy if exists finance_select on public.finance_entries;
create policy finance_select on public.finance_entries for select to authenticated
  using (public.can_view_finance());

drop policy if exists finance_insert on public.finance_entries;
create policy finance_insert on public.finance_entries for insert to authenticated
  with check (public.can_manage_finance());

drop policy if exists finance_update on public.finance_entries;
create policy finance_update on public.finance_entries for update to authenticated
  using (public.can_manage_finance())
  with check (public.can_manage_finance());

drop policy if exists finance_delete on public.finance_entries;
create policy finance_delete on public.finance_entries for delete to authenticated
  using (public.can_manage_finance());

-- =====================================================================
-- Derived views. security_invoker = on keeps the caller's RLS in force,
-- so a coach or player selecting a finance view gets zero rows.
-- =====================================================================
create or replace view public.finance_monthly_summary
with (security_invoker = on) as
select
  date_trunc('month', entry_date)::date                                   as month,
  extract(year  from entry_date)::int                                     as year,
  extract(month from entry_date)::int                                     as month_number,
  coalesce(sum(amount) filter (where kind = 'income'), 0)::numeric(14,2)  as income,
  coalesce(sum(amount) filter (where kind = 'expense'), 0)::numeric(14,2) as expenses,
  (coalesce(sum(amount) filter (where kind = 'income'), 0)
   - coalesce(sum(amount) filter (where kind = 'expense'), 0))::numeric(14,2) as net,
  count(*)::int                                                           as entry_count
from public.finance_entries
group by 1, 2, 3;

create or replace view public.finance_yearly_summary
with (security_invoker = on) as
select
  extract(year from entry_date)::int                                      as year,
  coalesce(sum(amount) filter (where kind = 'income'), 0)::numeric(14,2)  as income,
  coalesce(sum(amount) filter (where kind = 'expense'), 0)::numeric(14,2) as expenses,
  (coalesce(sum(amount) filter (where kind = 'income'), 0)
   - coalesce(sum(amount) filter (where kind = 'expense'), 0))::numeric(14,2) as net,
  count(*)::int                                                           as entry_count
from public.finance_entries
group by 1;

create or replace view public.finance_category_summary
with (security_invoker = on) as
select
  extract(year from entry_date)::int                                      as year,
  kind,
  category,
  coalesce(sum(amount), 0)::numeric(14,2)                                 as total
from public.finance_entries
group by 1, 2, 3;

create or replace view public.player_attendance_stats
with (security_invoker = on) as
select
  p.id                                                                    as player_id,
  count(a.id)::int                                                        as logged,
  count(a.id) filter (where a.status = 'present')::int                    as present,
  count(a.id) filter (where a.status = 'absent')::int                     as absent,
  count(a.id) filter (where a.status = 'excused')::int                    as excused,
  case
    when count(a.id) filter (where a.status in ('present','absent')) = 0 then null
    else round(
      100.0 * count(a.id) filter (where a.status = 'present')
      / nullif(count(a.id) filter (where a.status in ('present','absent')), 0), 0)::int
  end                                                                     as attendance_pct
from public.players p
left join public.attendance a on a.player_id = p.id
group by p.id;

-- The only thing an anonymous visitor may ever read: events an editor has
-- explicitly flagged as public, and only these four columns.
create or replace view public.public_events
with (security_invoker = off) as
select id, title, type, starts_at, location
from public.events
where is_public and starts_at >= now() - interval '1 day'
order by starts_at;

grant select on public.public_events to anon, authenticated;

revoke all on public.finance_monthly_summary   from anon;
revoke all on public.finance_yearly_summary    from anon;
revoke all on public.finance_category_summary  from anon;
revoke all on public.player_attendance_stats   from anon;

grant select on public.finance_monthly_summary  to authenticated;
grant select on public.finance_yearly_summary   to authenticated;
grant select on public.finance_category_summary to authenticated;
grant select on public.player_attendance_stats  to authenticated;

-- Nothing in this schema is readable without a session.
revoke all on public.profiles, public.players, public.events, public.event_rsvps,
              public.attendance, public.match_stats, public.announcements,
              public.finance_entries
  from anon;
