import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession, createClient } from '@/lib/supabase/server';
import {
  canPostAnnouncements,
  canViewFinance,
  canViewRoster,
  ROLE_LABEL,
} from '@/lib/roles';
import type { AcademyEvent, Announcement, AppRole, EventRsvp, RsvpStatus } from '@/lib/types';
import { AnnouncementComposer, AnnouncementList } from '@/components/announcements';
import { EventCard } from '@/components/events';
import { EmptyState, SectionTitle, Stat } from '@/components/ui';
import { ChevronRight } from '@/components/nav-icons';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { profile, userId } = await requireSession();
  const supabase = createClient();
  const role = profile.role;
  const nowIso = new Date().toISOString();

  // Every query below is RLS-scoped: a player simply does not receive rows
  // they are not entitled to, whatever this page asks for.
  const [announcementsRes, eventsRes, rsvpRes] = await Promise.all([
    supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('events')
      .select('*')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(4),
    supabase.from('event_rsvps').select('event_id,status').eq('profile_id', userId),
  ]);

  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const events = (eventsRes.data ?? []) as AcademyEvent[];
  const rsvps = new Map<string, RsvpStatus>(
    ((rsvpRes.data ?? []) as Pick<EventRsvp, 'event_id' | 'status'>[]).map((r) => [
      r.event_id,
      r.status,
    ]),
  );

  const firstName = (profile.full_name || profile.email).split(' ')[0];

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">{ROLE_LABEL[role]}</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight sm:text-[32px]">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {events.length > 0
            ? `Next up: ${events[0].title}.`
            : 'Nothing on the calendar right now.'}
        </p>
      </div>

      <QuickStats role={role} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------------------------------------------------------- */}
        {/* Announcements: the reason this page exists                */}
        {/* ---------------------------------------------------------- */}
        <section>
          <SectionTitle>Announcements</SectionTitle>

          {canPostAnnouncements(role) && (
            <div className="mb-5">
              <AnnouncementComposer />
            </div>
          )}

          <AnnouncementList
            announcements={announcements}
            canEdit={canPostAnnouncements(role)}
          />
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Up next                                                     */}
        {/* ---------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle
            action={
              <Link
                href="/schedule"
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

/** Small role-aware summary strip. Finance numbers are fetched only for
 *  roles allowed to see them, and RLS would return nothing regardless. */
async function QuickStats({ role }: { role: AppRole }) {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const [rosterRes, eventsRes, financeRes] = await Promise.all([
    canViewRoster(role)
      ? supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true)
      : Promise.resolve({ count: null }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('starts_at', now.toISOString()),
    canViewFinance(role)
      ? supabase
          .from('finance_monthly_summary')
          .select('income,expenses,net')
          .gte('month', monthStart)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const tiles: React.ReactNode[] = [];

  tiles.push(
    <Stat
      key="events"
      label="Upcoming"
      value={eventsRes.count ?? 0}
      hint="events on your calendar"
    />,
  );

  if (canViewRoster(role)) {
    tiles.push(
      <Stat key="roster" label="Active squad" value={rosterRes.count ?? 0} hint="players on the roster" />,
    );
  }

  if (canViewFinance(role)) {
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
    <div className={`mb-10 grid gap-px border border-line bg-line ${columns[tiles.length] ?? 'grid-cols-1'}`}>
      {tiles}
    </div>
  );
}
