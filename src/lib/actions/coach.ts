'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getSession } from '@/lib/supabase/server';
import { canPlanSessions } from '@/lib/roles';
import { fromLocalInput } from '@/lib/format';
import type { Squad } from '@/lib/types';
import {
  done,
  fail,
  friendlyError,
  optionalStr,
  squadOf,
  str,
  type ActionResult,
} from './common';

/**
 * Writes for the coach hub.
 *
 * Every one of these re-checks the caller server-side. That check is a
 * courtesy on top of RLS, which is what actually stops a player writing a
 * session plan even if they called the action directly.
 */

const ALL_ROLES = ['admin', 'treasurer', 'exco', 'coach', 'player'] as const;

/** Saves the coach-facing plan for a session. */
export async function saveSessionPlan(eventId: string, plan: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');
  if (!canPlanSessions(session.profile.role)) {
    return fail('Only the coach or an admin can write session plans.');
  }
  if (!eventId) return fail('Missing session.');

  const supabase = createClient();
  const { error } = await supabase.from('event_plans').upsert(
    {
      event_id: eventId,
      plan: plan.trim(),
      updated_by: session.userId,
      updated_by_name: session.profile.full_name || session.profile.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' },
  );

  if (error) return fail(friendlyError(error));
  revalidatePath('/coach');
  revalidatePath(`/schedule/${eventId}`);
  return done();
}

/**
 * Schedules a practice and stores its plan in one go.
 *
 * The full event form lives on the Schedule. This is the stripped-back
 * version for the thing a coach does most often, so it fixes the type to
 * practice and asks only for what changes week to week.
 */
export async function createPractice(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');
  if (!canPlanSessions(session.profile.role)) {
    return fail('Only the coach or an admin can schedule practices.');
  }

  const squad: Squad | null = squadOf(formData);
  const startsAt = fromLocalInput(str(formData, 'starts_at'));
  const endsAt = fromLocalInput(str(formData, 'ends_at'));

  if (!startsAt) return fail('Set a date and time.');
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return fail('The end time is before the start time.');
  }

  const title =
    str(formData, 'title') ||
    (squad === 'boys' ? 'Boys practice' : squad === 'girls' ? 'Girls practice' : 'Practice');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      type: 'practice',
      starts_at: startsAt,
      ends_at: endsAt,
      location: optionalStr(formData, 'location'),
      description: optionalStr(formData, 'description'),
      visible_to_roles: [...ALL_ROLES],
      squad,
      rsvp_enabled: true,
      is_public: false,
      created_by: session.userId,
      created_by_name: session.profile.full_name || session.profile.email,
    })
    .select('id')
    .single();

  if (error) return fail(friendlyError(error));

  const plan = str(formData, 'plan');
  if (plan) {
    const eventId = data.id as string;
    const { error: planError } = await supabase.from('event_plans').upsert(
      {
        event_id: eventId,
        plan,
        updated_by: session.userId,
        updated_by_name: session.profile.full_name || session.profile.email,
      },
      { onConflict: 'event_id' },
    );
    // The practice exists either way. Losing the plan is worth saying so.
    if (planError) {
      revalidatePath('/coach');
      return fail('Practice scheduled, but the plan did not save. Add it from the session below.');
    }
  }

  revalidatePath('/coach');
  revalidatePath('/schedule', 'layout');
  revalidatePath('/dashboard', 'layout');
  return done(data.id as string);
}
