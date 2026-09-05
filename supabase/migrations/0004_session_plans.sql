-- =====================================================================
-- UBE Academy: session plans for the coach hub.
--
-- Run this after 0003_exco_roles.sql. Additive and idempotent.
--
-- What the coach intends to run in a session is working material: drills,
-- what went badly last week, who to look at. It is not the same thing as
-- events.description, which is what the squad reads.
--
-- It lives in its own table rather than as another column on events because
-- RLS works on rows, not columns. A column on events would be handed to any
-- player who can see the event, whatever the UI chose to render.
-- =====================================================================

create table if not exists public.event_plans (
  event_id        uuid primary key references public.events(id) on delete cascade,
  plan            text not null default '',
  updated_by      uuid references public.profiles(id) on delete set null,
  updated_by_name text not null default '',
  updated_at      timestamptz not null default now()
);

alter table public.event_plans enable row level security;

-- Owners only, matching the coach hub the plans are written in. ExCo run the
-- committee, not the training session.
drop policy if exists event_plans_select on public.event_plans;
create policy event_plans_select on public.event_plans for select to authenticated
  using (public.is_owner());

drop policy if exists event_plans_write on public.event_plans;
create policy event_plans_write on public.event_plans for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

revoke all on public.event_plans from anon;

drop trigger if exists touch_event_plans on public.event_plans;
create trigger touch_event_plans before update on public.event_plans
  for each row execute function public.touch_updated_at();

comment on table public.event_plans is
  'Coach-facing plan for a session. Readable by owners only, never by players.';
