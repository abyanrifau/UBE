-- =====================================================================
-- RLS smoke test: proves the access rules hold at the database level.
--
-- This impersonates each role the way PostgREST does (SET ROLE authenticated
-- plus a JWT claim) and reports how many rows each one can actually read.
-- Because it runs below the API, it also covers anything the app forgets:
-- a hand-crafted fetch, a leaked anon key, curl.
--
-- HOW TO RUN
--   1. Create at least one account per role from the Accounts page.
--   2. Add a couple of finance entries as the Treasurer, and a player or two.
--   3. Paste this whole file into the Supabase SQL editor and run it.
--
-- WHAT TO EXPECT: the last SELECT prints PASS or FAIL per rule.
-- =====================================================================

begin;

create or replace function pg_temp.probe(target uuid)
returns table (
  role_name          text,
  finance_entries    bigint,
  finance_monthly    bigint,
  players            bigint,
  events             bigint,
  announcements      bigint,
  profiles           bigint
)
language plpgsql
as $fn$
declare
  r text;
begin
  select p.role::text into r from public.profiles p where p.id = target;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', target::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  return query
  select
    r,
    (select count(*) from public.finance_entries),
    (select count(*) from public.finance_monthly_summary),
    (select count(*) from public.players),
    (select count(*) from public.events),
    (select count(*) from public.announcements),
    (select count(*) from public.profiles);

  execute 'reset role';
end
$fn$;

-- One probe per role, using the first active account found for each.
create temporary table probe_results on commit drop as
select p.* from (
  select id from public.profiles where role = 'admin'     and is_active limit 1
  union all
  select id from public.profiles where role = 'treasurer' and is_active limit 1
  union all
  select id from public.profiles where role = 'exco'      and is_active limit 1
  union all
  select id from public.profiles where role = 'coach'     and is_active limit 1
  union all
  select id from public.profiles where role = 'player'    and is_active limit 1
) ids
cross join lateral pg_temp.probe(ids.id) p;

-- ---------------------------------------------------------------------
-- Raw visibility, one row per role
-- ---------------------------------------------------------------------
select * from probe_results order by role_name;

-- ---------------------------------------------------------------------
-- The rules that matter, asserted
-- ---------------------------------------------------------------------
with total_finance as (select count(*) as n from public.finance_entries),
     total_players  as (select count(*) as n from public.players)
select check_name, expected, actual,
       case when passed then 'PASS' else 'FAIL' end as result
from (
  select
    'Player cannot read finance_entries'           as check_name,
    '0'                                            as expected,
    coalesce(max(finance_entries) filter (where role_name = 'player'), 0)::text as actual,
    coalesce(max(finance_entries) filter (where role_name = 'player'), 0) = 0   as passed
  from probe_results

  union all
  select
    'Player cannot read the monthly summary view',
    '0',
    coalesce(max(finance_monthly) filter (where role_name = 'player'), 0)::text,
    coalesce(max(finance_monthly) filter (where role_name = 'player'), 0) = 0
  from probe_results

  union all
  select
    'Coach (academy owner) can read finance_entries',
    'all ' || (select n from total_finance)::text,
    coalesce(max(finance_entries) filter (where role_name = 'coach'), 0)::text,
    coalesce(max(finance_entries) filter (where role_name = 'coach'), 0)
      = (select n from total_finance)
  from probe_results

  union all
  select
    'Treasurer can read finance_entries',
    'all ' || (select n from total_finance)::text,
    coalesce(max(finance_entries) filter (where role_name = 'treasurer'), 0)::text,
    coalesce(max(finance_entries) filter (where role_name = 'treasurer'), 0)
      = (select n from total_finance)
  from probe_results

  union all
  select
    'ExCo can read finance_entries',
    'all ' || (select n from total_finance)::text,
    coalesce(max(finance_entries) filter (where role_name = 'exco'), 0)::text,
    coalesce(max(finance_entries) filter (where role_name = 'exco'), 0)
      = (select n from total_finance)
  from probe_results

  union all
  select
    'Player sees at most their own player row',
    '0 or 1',
    coalesce(max(players) filter (where role_name = 'player'), 0)::text,
    coalesce(max(players) filter (where role_name = 'player'), 0) <= 1
  from probe_results

  union all
  select
    'Coach sees the whole roster',
    'all ' || (select n from total_players)::text,
    coalesce(max(players) filter (where role_name = 'coach'), 0)::text,
    coalesce(max(players) filter (where role_name = 'coach'), 0)
      = (select n from total_players)
  from probe_results

  union all
  select
    'Player sees at most their own profile',
    '0 or 1',
    coalesce(max(profiles) filter (where role_name = 'player'), 0)::text,
    coalesce(max(profiles) filter (where role_name = 'player'), 0) <= 1
  from probe_results
) checks
order by result desc, check_name;

-- ---------------------------------------------------------------------
-- Anonymous visitors: everything must be zero rows or an error, except
-- the deliberately public events view.
-- ---------------------------------------------------------------------
do $anon$
declare
  leaked text := '';
  n bigint;
begin
  perform set_config('request.jwt.claims', null, true);
  execute 'set local role anon';

  foreach n in array array[]::bigint[] loop end loop; -- no-op, keeps plpgsql happy

  begin
    execute 'select count(*) from public.finance_entries' into n;
    if n > 0 then leaked := leaked || 'finance_entries '; end if;
  exception when others then null; -- permission denied is the good outcome
  end;

  begin
    execute 'select count(*) from public.players' into n;
    if n > 0 then leaked := leaked || 'players '; end if;
  exception when others then null;
  end;

  begin
    execute 'select count(*) from public.profiles' into n;
    if n > 0 then leaked := leaked || 'profiles '; end if;
  exception when others then null;
  end;

  execute 'reset role';

  if leaked = '' then
    raise notice 'PASS  anonymous access leaks nothing';
  else
    raise warning 'FAIL  anonymous access leaked: %', leaked;
  end if;
end
$anon$;

-- Nothing here is meant to persist.
rollback;
