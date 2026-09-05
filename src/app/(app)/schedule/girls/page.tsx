import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/supabase/server';
import { canViewSquad } from '@/lib/roles';
import { ScheduleScreen } from '@/components/schedule-screen';

export const metadata: Metadata = { title: 'Girls Schedule' };

/**
 * A static segment, so it takes priority over /schedule/[id]. Event ids are
 * UUIDs, so there is no chance of one shadowing this route.
 */
export default async function GirlsSchedulePage() {
  const session = await requireSession();
  if (!canViewSquad(session.profile.role, session.squad, 'girls')) redirect('/schedule');
  return <ScheduleScreen session={session} squad="girls" />;
}
