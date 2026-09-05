import type { Metadata } from 'next';
import { requireSession } from '@/lib/supabase/server';
import { ScheduleScreen } from '@/components/schedule-screen';

export const metadata: Metadata = { title: 'Schedule' };

export default async function SchedulePage() {
  const session = await requireSession();
  return <ScheduleScreen session={session} squad={null} />;
}
