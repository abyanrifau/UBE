import { createClient } from '@/lib/supabase/server';
import type {
  AcademyEvent,
  EventPlan,
  EventRsvp,
  ExcoRole,
  Player,
  Profile,
  RsvpStatus,
  Squad,
} from '@/lib/types';
import { inSquadView } from '@/lib/squads';

export type Attendee = {
  profileId: string;
  name: string;
  jersey: number | null;
  excoRole: ExcoRole | null;
  /** True when this person has no roster row, so a coach or committee member. */
  staff: boolean;
};

export type CoachSession = {
  event: AcademyEvent;
  plan: string;
  planUpdatedBy: string | null;
  going: Attendee[];
  maybe: Attendee[];
  notGoing: Attendee[];
  /** Squad members on the roster who have not answered yet. */
  noReply: Attendee[];
  squadSize: number;
};

/**
 * Everything the coach hub needs about the sessions coming up: who has said
 * yes, who has said nothing, and the plan for each one.
 *
 * Reads are RLS-scoped like everywhere else. event_plans is owner-only, so a
 * non-owner calling this would simply get sessions with empty plans.
 */
export async function loadCoachSessions(squad: Squad | null, limit = 6): Promise<CoachSession[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const { data: eventRows } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(40);

  const events = ((eventRows ?? []) as AcademyEvent[])
    .filter((e) => e.type !== 'meeting')
    .filter((e) => inSquadView(e, squad))
    .slice(0, limit);

  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);

  const [rsvpRes, planRes, profileRes, playerRes] = await Promise.all([
    supabase.from('event_rsvps').select('event_id,profile_id,status').in('event_id', eventIds),
    supabase.from('event_plans').select('*').in('event_id', eventIds),
    supabase.from('profiles').select('id,full_name,email'),
    supabase.from('players').select('id,profile_id,full_name,jersey_number,squad,exco_role'),
  ]);

  const profiles = new Map<string, string>(
    ((profileRes.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[]).map((p) => [
      p.id,
      p.full_name || p.email,
    ]),
  );

  const players = (playerRes.data ?? []) as Pick<
    Player,
    'id' | 'profile_id' | 'full_name' | 'jersey_number' | 'squad' | 'exco_role'
  >[];
  const playerByProfile = new Map(players.filter((p) => p.profile_id).map((p) => [p.profile_id!, p]));

  const plans = new Map<string, EventPlan>(
    ((planRes.data ?? []) as EventPlan[]).map((p) => [p.event_id, p]),
  );

  const rsvps = (rsvpRes.data ?? []) as Pick<EventRsvp, 'event_id' | 'profile_id' | 'status'>[];

  const attendee = (profileId: string): Attendee => {
    const player = playerByProfile.get(profileId);
    return {
      profileId,
      name: player?.full_name ?? profiles.get(profileId) ?? 'Someone',
      jersey: player?.jersey_number ?? null,
      excoRole: player?.exco_role ?? null,
      staff: !player,
    };
  };

  const byJersey = (a: Attendee, b: Attendee) => {
    if (a.jersey === null && b.jersey === null) return a.name.localeCompare(b.name);
    if (a.jersey === null) return 1;
    if (b.jersey === null) return -1;
    return a.jersey - b.jersey;
  };

  return events.map((event) => {
    const mine = rsvps.filter((r) => r.event_id === event.id);
    const pick = (status: RsvpStatus) =>
      mine.filter((r) => r.status === status).map((r) => attendee(r.profile_id)).sort(byJersey);

    // Who was expected: the squad that owns the session, or everyone when it
    // belongs to the whole academy.
    const expected = players.filter(
      (p) => p.profile_id && (event.squad === null || p.squad === event.squad),
    );
    const answered = new Set(mine.map((r) => r.profile_id));
    const noReply = expected
      .filter((p) => !answered.has(p.profile_id!))
      .map((p) => attendee(p.profile_id!))
      .sort(byJersey);

    const plan = plans.get(event.id);

    return {
      event,
      plan: plan?.plan ?? '',
      planUpdatedBy: plan?.plan ? (plan.updated_by_name || null) : null,
      going: pick('going'),
      maybe: pick('maybe'),
      notGoing: pick('not_going'),
      noReply,
      squadSize: players.filter((p) => event.squad === null || p.squad === event.squad).length,
    };
  });
}
