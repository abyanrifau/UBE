import type { Metadata } from 'next';
import { requireSession } from '@/lib/supabase/server';
import { DashboardView } from '@/components/dashboard-view';

export const metadata: Metadata = { title: 'Academy Dashboard' };

/** The combined view. Everyone can open this one. */
export default async function AcademyDashboardPage() {
  const session = await requireSession();
  return <DashboardView session={session} squad={null} />;
}
