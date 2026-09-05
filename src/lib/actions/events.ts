'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getSession } from '@/lib/supabase/server';
import { fromLocalInput } from '@/lib/format';
import type { AttendanceStatus, EventType, RsvpStatus } from '@/lib/types';
import {
  bool,
  done,
  fail,
  friendlyError,
  optionalStr,
  roles,
  squadOf,
  str,
  type ActionResult,
} from './common';

const EVENT_TYPES: EventType[] = ['practice', 'match', 'tournament', 'meeting', 'event'];

function readEvent(formData: FormData) {
  const title = str(formData, 'title');
  const type = str(formData, 'type') as EventType;
  const startsAt = fromLocalInput(str(formData, 'starts_at'));
  const endsAt = fromLocalInput(str(formData, 'ends_at'));

  if (!title) return { ok: false as const, error: 'Give the event a title.' as const };
  if (!EVENT_TYPES.includes(type)) return { ok: false as const, error: 'Pick an event type.' as const };
  if (!startsAt) return { ok: false as const, error: 'Set a start date and time.' as const };
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return { ok: false as const, error: 'The end time is before the start time.' as const };
  }

  return {
    ok: true as const,
    values: {
      title,
      type,
      starts_at: startsAt,
      ends_at: endsAt,
      location: optionalStr(formData, 'location'),
      description: optionalStr(formData, 'description'),
      visible_to_roles: roles(formData),
      squad: squadOf(formData),
      rsvp_enabled: bool(formData, 'rsvp_enabled'),
      is_public: bool(formData, 'is_public'),
    },
  };
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const parsed = readEvent(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...parsed.values,
      created_by: session.userId,
      created_by_name: session.profile.full_name || session.profile.email,
    })
    .select('id')
    .single();

  if (error) return fail(friendlyError(error));
  revalidatePath('/schedule', 'layout');
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/');
  return done(data.id as string);
}

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const id = str(formData, 'id');
  if (!id) return fail('Missing event.');

  const parsed = readEvent(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase.from('events').update(parsed.values).eq('id', id);

  if (error) return fail(friendlyError(error));
  revalidatePath('/schedule', 'layout');
  revalidatePath(`/schedule/${id}`);
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/');
  return done(id);
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return fail(friendlyError(error));
  revalidatePath('/schedule', 'layout');
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/');
  return done();
}

/* ------------------------------------------------------------------ */
/* RSVP: a user may only ever write their own row (RLS enforces it)  */
/* ------------------------------------------------------------------ */

export async function setRsvp(eventId: string, status: RsvpStatus): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const supabase = createClient();
  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id: eventId, profile_id: session.userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,profile_id' },
    );

  if (error) return fail(friendlyError(error));
  revalidatePath('/schedule', 'layout');
  revalidatePath(`/schedule/${eventId}`);
  revalidatePath('/dashboard', 'layout');
  return done();
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

export async function saveAttendance(
  eventId: string,
  rows: { playerId: string; status: AttendanceStatus | null }[],
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const supabase = createClient();

  const clear = rows.filter((r) => r.status === null).map((r) => r.playerId);
  const keep = rows.filter((r) => r.status !== null);

  if (clear.length) {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('event_id', eventId)
      .in('player_id', clear);
    if (error) return fail(friendlyError(error));
  }

  if (keep.length) {
    const { error } = await supabase.from('attendance').upsert(
      keep.map((r) => ({
        event_id: eventId,
        player_id: r.playerId,
        status: r.status as AttendanceStatus,
        recorded_by: session.userId,
        recorded_at: new Date().toISOString(),
      })),
      { onConflict: 'event_id,player_id' },
    );
    if (error) return fail(friendlyError(error));
  }

  revalidatePath(`/schedule/${eventId}`);
  revalidatePath('/players');
  return done();
}

/* ------------------------------------------------------------------ */
/* Match stats                                                         */
/* ------------------------------------------------------------------ */

export async function saveMatchStat(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const eventId = str(formData, 'event_id');
  const playerId = str(formData, 'player_id');
  if (!eventId || !playerId) return fail('Missing event or player.');

  const n = (key: string) => {
    const raw = str(formData, key);
    const parsed = raw === '' ? 0 : Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  };

  const supabase = createClient();
  const { error } = await supabase.from('match_stats').upsert(
    {
      event_id: eventId,
      player_id: playerId,
      points: n('points'),
      kills: n('kills'),
      blocks: n('blocks'),
      aces: n('aces'),
      digs: n('digs'),
      assists: n('assists'),
      serve_errors: n('serve_errors'),
      notes: optionalStr(formData, 'notes'),
      recorded_by: session.userId,
    },
    { onConflict: 'event_id,player_id' },
  );

  if (error) return fail(friendlyError(error));
  revalidatePath(`/schedule/${eventId}`);
  revalidatePath(`/players/${playerId}`);
  return done();
}
