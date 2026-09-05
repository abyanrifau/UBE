-- =====================================================================
-- UBE Academy: ExCo posts held by players.
--
-- Run this after 0002_squads.sql. Additive and idempotent.
--
-- ExCo members are players, not a separate kind of person, so the post they
-- hold lives on their roster row rather than on a second record.
--
-- IMPORTANT: this field is descriptive only. It grants nothing. What a
-- person may see and do is still decided entirely by profiles.role and the
-- policies in 0001_init.sql. Giving a player the "treasurer" ExCo post does
-- not let them near the books; that needs the Treasurer account role.
-- =====================================================================

do $$ begin
  create type public.exco_role as enum (
    'vice_president',
    'secretary',
    'treasurer',
    'event_coordinator_boy',
    'event_coordinator_girl',
    'academy_rep_boy',
    'academy_rep_girl'
  );
exception when duplicate_object then null; end $$;

alter table public.players add column if not exists exco_role public.exco_role;

create index if not exists players_exco_role_idx
  on public.players(exco_role)
  where exco_role is not null;

comment on column public.players.exco_role is
  'Committee post this player holds, if any. Descriptive only, grants no access.';
