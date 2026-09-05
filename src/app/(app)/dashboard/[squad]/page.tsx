import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/supabase/server';
import { canViewSquad, SQUAD_LABEL, SQUADS } from '@/lib/roles';
import type { Squad } from '@/lib/types';
import { DashboardView } from '@/components/dashboard-view';

/**
 * The Boys and Girls dashboards, at /dashboard/boys and /dashboard/girls.
 *
 * A player may only open the one matching their own squad. The redirect here
 * is the courteous half of that rule; the enforcing half is RLS, which will
 * not return another squad's rows even if this check were removed.
 *
 * Deliberately no generateStaticParams: this page reads the session, so
 * prerendering it at build time would bake one visitor's outcome, a redirect
 * to /login, into a page served to everyone.
 */
export async function generateMetadata({
  params,
}: {
  params: { squad: string };
}): Promise<Metadata> {
  const squad = params.squad as Squad;
  return { title: SQUADS.includes(squad) ? `${SQUAD_LABEL[squad]} Dashboard` : 'Dashboard' };
}

export default async function SquadDashboardPage({ params }: { params: { squad: string } }) {
  const squad = params.squad as Squad;
  if (!SQUADS.includes(squad)) notFound();

  const session = await requireSession();
  if (!canViewSquad(session.profile.role, session.squad, squad)) redirect('/dashboard');

  return <DashboardView session={session} squad={squad} />;
}
