import type { Metadata } from 'next';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageSchedule } from '@/lib/roles';
import type { AcademyEvent, EventRsvp, RsvpStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import { ScheduleView } from '@/components/schedule-view';

export const metadata: Metadata = { title: 'Schedule' };

export default async function SchedulePage() {
  const { profile, userId } = await requireSession();
  const supabase = createClient();

  // RLS filters this to events whose visible_to_roles includes the caller's
  // role, so an ExCo meeting never reaches a player's browser.
  const [eventsRes, rsvpRes] = await Promise.all([
    supabase.from('events').select('*').order('starts_at', { ascending: true }),
    supabase.from('event_rsvps').select('event_id,status').eq('profile_id', userId),
  ]);

  const events = (eventsRes.data ?? []) as AcademyEvent[];
  const rsvps: Record<string, RsvpStatus> = {};
  for (const r of (rsvpRes.data ?? []) as Pick<EventRsvp, 'event_id' | 'status'>[]) {
    rsvps[r.event_id] = r.status;
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Practices, matches, tournaments and meetings. You only see what applies to you."
      />
      <ScheduleView
        events={events}
        rsvps={rsvps}
        canManage={canManageSchedule(profile.role)}
      />
    </>
  );
}
