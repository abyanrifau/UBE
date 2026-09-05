import { createClient, type Session } from '@/lib/supabase/server';
import { canManageSchedule, SQUAD_LABEL, visibleSquads } from '@/lib/roles';
import type { AcademyEvent, EventRsvp, RsvpStatus, Squad } from '@/lib/types';
import { inSquadView, squadScopeNote } from '@/lib/squads';
import { PageHeader } from '@/components/ui';
import { SquadTabs } from '@/components/squad';
import { ScheduleView } from '@/components/schedule-view';

/**
 * One schedule, rendered three ways: the whole academy, the boys squad, or
 * the girls squad.
 *
 * A squad view keeps that squad's own fixtures plus anything for the whole
 * academy, because the Invitational belongs to neither squad and both travel
 * to it. Leaving it off a squad schedule would hide a fixture people have to
 * turn up to.
 */
export async function ScheduleScreen({
  session,
  squad,
}: {
  session: Session;
  squad: Squad | null;
}) {
  const { profile, userId } = session;
  const supabase = createClient();

  // RLS has already dropped anything outside this person's role audience and
  // squad, so a player never receives another squad's rows to begin with.
  const [eventsRes, rsvpRes] = await Promise.all([
    supabase.from('events').select('*').order('starts_at', { ascending: true }),
    supabase.from('event_rsvps').select('event_id,status').eq('profile_id', userId),
  ]);

  const events = ((eventsRes.data ?? []) as AcademyEvent[]).filter((e) => inSquadView(e, squad));

  const rsvps: Record<string, RsvpStatus> = {};
  for (const r of (rsvpRes.data ?? []) as Pick<EventRsvp, 'event_id' | 'status'>[]) {
    rsvps[r.event_id] = r.status;
  }

  const tabs = visibleSquads(profile.role, session.squad);

  return (
    <>
      {/* The squad tabs are page scope, so they sit in the header rather than
          next to the list and calendar toggle, which switches how this one
          schedule is drawn. */}
      <PageHeader
        title={squad ? `${SQUAD_LABEL[squad]} Schedule` : 'Schedule'}
        description={
          squad
            ? squadScopeNote(squad, 'Practices, matches and tournaments')
            : 'Practices, matches, tournaments and meetings. You only see what applies to you.'
        }
        action={
          tabs.length > 0 ? (
            <SquadTabs base="/schedule" current={squad} squads={tabs} allLabel="All" />
          ) : undefined
        }
      />

      <ScheduleView
        events={events}
        rsvps={rsvps}
        canManage={canManageSchedule(profile.role)}
        squad={squad}
      />
    </>
  );
}
