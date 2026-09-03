import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageRoster, canManageSchedule, isStaff, ROLE_LABEL } from '@/lib/roles';
import type {
  AcademyEvent,
  AttendanceRow,
  EventRsvp,
  MatchStat,
  Player,
  Profile,
  RsvpStatus,
} from '@/lib/types';
import { formatDateLong, formatTime } from '@/lib/format';
import { BackLink, KeyValue, PageHeader, SectionTitle, Tag } from '@/components/ui';
import { RsvpControl } from '@/components/events';
import { EVENT_TYPE_LABEL } from '@/lib/events';
import { EventAdmin } from '@/components/event-admin';
import { AttendanceEditor } from '@/components/attendance-editor';
import { MatchStatsEditor } from '@/components/match-stats-editor';

export const metadata: Metadata = { title: 'Event' };

const RSVP_LABEL: Record<RsvpStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't make it",
};

export default async function EventPage({ params }: { params: { id: string } }) {
  const { profile, userId } = await requireSession();
  const supabase = createClient();
  const role = profile.role;

  // If RLS hides this event from the caller's role, this is a 404 for them.
  const { data: eventRow } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!eventRow) notFound();
  const event = eventRow as AcademyEvent;

  const staff = isStaff(role);
  const canEditRoster = canManageRoster(role);
  const isCompetitive = event.type === 'match' || event.type === 'tournament';

  const [myRsvpRes, allRsvpRes, playersRes, attendanceRes, statsRes, profilesRes] =
    await Promise.all([
      supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', event.id)
        .eq('profile_id', userId)
        .maybeSingle(),
      staff
        ? supabase.from('event_rsvps').select('profile_id,status').eq('event_id', event.id)
        : Promise.resolve({ data: null }),
      canEditRoster
        ? supabase
            .from('players')
            .select('id,full_name,jersey_number')
            .eq('is_active', true)
            .order('jersey_number', { ascending: true, nullsFirst: false })
            .order('full_name')
        : Promise.resolve({ data: null }),
      canEditRoster
        ? supabase.from('attendance').select('*').eq('event_id', event.id)
        : Promise.resolve({ data: null }),
      canEditRoster && isCompetitive
        ? supabase.from('match_stats').select('*').eq('event_id', event.id)
        : Promise.resolve({ data: null }),
      staff ? supabase.from('profiles').select('id,full_name,email') : Promise.resolve({ data: null }),
    ]);

  const myRsvp = (myRsvpRes.data?.status ?? null) as RsvpStatus | null;

  const nameById = new Map<string, string>(
    ((profilesRes.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[]).map((p) => [
      p.id,
      p.full_name || p.email,
    ]),
  );

  const rsvpGroups: Record<RsvpStatus, string[]> = { going: [], maybe: [], not_going: [] };
  for (const r of (allRsvpRes.data ?? []) as Pick<EventRsvp, 'profile_id' | 'status'>[]) {
    rsvpGroups[r.status].push(nameById.get(r.profile_id) ?? 'Someone');
  }

  const players = (playersRes.data ?? []) as Pick<
    Player,
    'id' | 'full_name' | 'jersey_number'
  >[];
  const attendanceByPlayer = new Map<string, AttendanceRow>(
    ((attendanceRes.data ?? []) as AttendanceRow[]).map((a) => [a.player_id, a]),
  );
  const statsByPlayer = new Map<string, MatchStat>(
    ((statsRes.data ?? []) as MatchStat[]).map((s) => [s.player_id, s]),
  );

  return (
    <>
      <div className="mb-6">
        <BackLink href="/schedule">Schedule</BackLink>
      </div>

      <PageHeader
        title={event.title}
        description={`${formatDateLong(event.starts_at)} · ${formatTime(event.starts_at)}${
          event.ends_at ? `–${formatTime(event.ends_at)}` : ''
        }`}
      />

      {canManageSchedule(role) && (
        <div className="mb-10">
          <EventAdmin event={event} />
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-10">
          <section>
            <div className="flex flex-wrap gap-1.5">
              <Tag solid>{EVENT_TYPE_LABEL[event.type]}</Tag>
              {event.is_public && <Tag>Public</Tag>}
              {event.visible_to_roles.length < 5 && (
                <Tag>
                  {event.visible_to_roles
                    .filter((r) => r !== 'admin')
                    .map((r) => ROLE_LABEL[r])
                    .join(' · ') || 'Admin only'}
                </Tag>
              )}
            </div>

            {event.description && <p className="prose-body mt-5">{event.description}</p>}

            <dl className="mt-6 divide-line border-t border-line">
              <KeyValue label="Location" value={event.location ?? '—'} />
              <KeyValue label="Starts" value={formatTime(event.starts_at)} />
              {event.ends_at && <KeyValue label="Ends" value={formatTime(event.ends_at)} />}
              <KeyValue label="Added by" value={event.created_by_name || '—'} />
            </dl>
          </section>

          {/* -------------------------------------------------------- */}
          {/* Attendance — staff only                                   */}
          {/* -------------------------------------------------------- */}
          {canEditRoster && (
            <section>
              <SectionTitle>Attendance</SectionTitle>
              <AttendanceEditor
                eventId={event.id}
                initial={players.map((p) => ({
                  playerId: p.id,
                  name: p.full_name,
                  jersey: p.jersey_number,
                  status: attendanceByPlayer.get(p.id)?.status ?? null,
                }))}
              />
            </section>
          )}

          {/* -------------------------------------------------------- */}
          {/* Match stats — matches and tournaments only                */}
          {/* -------------------------------------------------------- */}
          {canEditRoster && isCompetitive && (
            <section>
              <SectionTitle>Match stats</SectionTitle>
              <p className="mb-3 text-[13px] text-muted">
                Optional. Log what is useful and leave the rest at zero.
              </p>
              <MatchStatsEditor
                eventId={event.id}
                rows={players.map((p) => ({
                  playerId: p.id,
                  name: p.full_name,
                  jersey: p.jersey_number,
                  stat: statsByPlayer.get(p.id) ?? null,
                }))}
              />
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------- */}
        {/* RSVP                                                        */}
        {/* ---------------------------------------------------------- */}
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          {event.rsvp_enabled && (
            <section className="card p-5">
              <SectionTitle>Your RSVP</SectionTitle>
              <RsvpControl eventId={event.id} value={myRsvp} size="md" />
              <p className="mt-3 text-[12px] text-muted">
                {myRsvp
                  ? `Saved as “${RSVP_LABEL[myRsvp]}”. Change it any time.`
                  : 'Let the team know whether you are coming.'}
              </p>
            </section>
          )}

          {staff && event.rsvp_enabled && (
            <section>
              <SectionTitle>Responses</SectionTitle>
              <div className="divide-line border border-line">
                {(['going', 'maybe', 'not_going'] as RsvpStatus[]).map((status) => (
                  <div key={status} className="px-4 py-3">
                    <p className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.1em]">
                      <span>{RSVP_LABEL[status]}</span>
                      <span className="tabular-nums text-muted">
                        {rsvpGroups[status].length}
                      </span>
                    </p>
                    {rsvpGroups[status].length > 0 && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                        {rsvpGroups[status].join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
