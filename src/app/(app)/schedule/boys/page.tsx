import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/supabase/server';
import { canViewSquad } from '@/lib/roles';
import { ScheduleScreen } from '@/components/schedule-screen';

export const metadata: Metadata = { title: 'Boys Schedule' };

/**
 * A static segment, so it takes priority over /schedule/[id]. Event ids are
 * UUIDs, so there is no chance of one shadowing this route.
 */
export default async function BoysSchedulePage() {
  const session = await requireSession();
  if (!canViewSquad(session.profile.role, session.squad, 'boys')) redirect('/schedule');
  return <ScheduleScreen session={session} squad="boys" />;
}
