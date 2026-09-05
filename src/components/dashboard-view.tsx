import Link from 'next/link';
import { createClient, type Session } from '@/lib/supabase/server';
import {
  canPostAnnouncements,
  canViewFinance,
  canViewRoster,
  ROLE_LABEL,
  SQUAD_LABEL,
  visibleSquads,
} from '@/lib/roles';
import type { AcademyEvent, Announcement, AppRole, EventRsvp, RsvpStatus, Squad } from '@/lib/types';
import { inSquadView } from '@/lib/squads';
import { AnnouncementComposer, AnnouncementList } from '@/components/announcements';
import { EventCard } from '@/components/events';
import { SquadTabs } from '@/components/squad';
import { EmptyState, SectionTitle, Stat } from '@/components/ui';
import { ChevronRight } from '@/components/nav-icons';
import { money } from '@/lib/format';

/**
 * One dashboard, rendered three ways.
 *
 * `squad` of null is the Academy Dashboard: everything the viewer can see,
 * both squads combined. A squad view narrows to that squad plus anything
 * addressed to the whole academy.
 *
 * Access is checked by the route that renders this, and again by RLS, which
 * will not hand a boys player a girls row whatever this page asks for.
 */
export async function DashboardView({
  session,
  squad,
}: {
  session: Session;
  squad: Squad | null;
}) {
  const { profile, userId } = session;
  const supabase = createClient();
  const role = profile.role;
  const nowIso = new Date().toISOString();

  const [announcementsRes, eventsRes, rsvpRes] = await Promise.all([
    supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(40),
    supabase.from('event_rsvps').select('event_id,status').eq('profile_id', userId),
  ]);

  const announcements = ((announcementsRes.data ?? []) as Announcement[])
    .filter((a) => inSquadView(a, squad))
    .slice(0, 15);

  const events = ((eventsRes.data ?? []) as AcademyEvent[])
    .filter((e) => inSquadView(e, squad))
    .slice(0, 4);

  const rsvps = new Map<string, RsvpStatus>(
    ((rsvpRes.data ?? []) as Pick<EventRsvp, 'event_id' | 'status'>[]).map((r) => [
      r.event_id,
      r.status,
    ]),
  );

  const firstName = (profile.full_name || profile.email).split(' ')[0];
  const tabs = visibleSquads(role, session.squad);

  return (
    <>
      <div className="mb-6">
        <p className="eyebrow">
          {squad ? `${SQUAD_LABEL[squad]} squad` : 'Academy'} · {ROLE_LABEL[role]}
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight sm:text-[32px]">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {events.length > 0
            ? `Next up: ${events[0].title}.`
            : squad
              ? `Nothing on the ${SQUAD_LABEL[squad].toLowerCase()} calendar right now.`
              : 'Nothing on the calendar right now.'}
        </p>
      </div>

      {tabs.length > 0 && (
        <div className="mb-8">
          <SquadTabs base="/dashboard" current={squad} squads={tabs} />
        </div>
      )}

      <QuickStats role={role} squad={squad} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <SectionTitle>Announcements</SectionTitle>

          {canPostAnnouncements(role) && (
            <div className="mb-5">
              <AnnouncementComposer defaultSquad={squad} />
            </div>
          )}

          <AnnouncementList
            announcements={announcements}
            canEdit={canPostAnnouncements(role)}
          />
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle
            action={
              <Link
                href={squad ? `/schedule/${squad}` : '/schedule'}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
              >
                Full schedule
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Up next
          </SectionTitle>

          {events.length === 0 ? (
            <EmptyState
              title="Calendar is clear"
              description="Practices, matches and meetings will appear here as they are added."
            />
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  rsvp={rsvps.get(event.id) ?? null}
                  showRsvp
                  href={`/schedule/${event.id}`}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function greeting() {
  const hour = new Date().getUTCHours();
  if (hour < 11) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

/**
 * Role-aware summary strip. Finance numbers are only fetched for roles
 * allowed to see them, and RLS would return nothing regardless.
 */
async function QuickStats({ role, squad }: { role: AppRole; squad: Squad | null }) {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const rosterQuery = supabase.from('players').select('squad').eq('is_active', true);

  const [rosterRes, eventsRes, financeRes] = await Promise.all([
    canViewRoster(role) ? rosterQuery : Promise.resolve({ data: null }),
    supabase.from('events').select('squad').gte('starts_at', now.toISOString()),
    canViewFinance(role)
      ? supabase
          .from('finance_monthly_summary')
          .select('income,expenses,net')
          .gte('month', monthStart)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const roster = ((rosterRes.data ?? []) as { squad: Squad | null }[]).filter((p) =>
    squad === null ? true : p.squad === squad,
  );
  const upcoming = ((eventsRes.data ?? []) as { squad: Squad | null }[]).filter((e) =>
    inSquadView(e, squad),
  );

  const tiles: React.ReactNode[] = [
    <Stat
      key="events"
      label="Upcoming"
      value={upcoming.length}
      hint={squad ? `${SQUAD_LABEL[squad].toLowerCase()} events ahead` : 'events on your calendar'}
    />,
  ];

  if (canViewRoster(role)) {
    tiles.push(
      <Stat
        key="roster"
        label={squad ? `${SQUAD_LABEL[squad]} squad` : 'Active squad'}
        value={roster.length}
        hint="players on the roster"
      />,
    );
  }

  // Financials are academy-wide, so they only belong on the academy view.
  if (canViewFinance(role) && squad === null) {
    const f = (financeRes as { data: { income: number; expenses: number; net: number } | null })
      .data;
    tiles.push(
      <Stat
        key="net"
        label="This month"
        value={money(f?.net ?? 0)}
        hint={`${money(f?.income ?? 0)} in · ${money(f?.expenses ?? 0)} out`}
        emphasis
      />,
    );
  }

  if (tiles.length < 2) return null;

  const columns: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
  };

  return (
    <div
      className={`mb-10 grid gap-px border border-line bg-line ${columns[tiles.length] ?? 'grid-cols-1'}`}
    >
      {tiles}
    </div>
  );
}
