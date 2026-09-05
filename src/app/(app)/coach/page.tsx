import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canUseCoachHub, SQUAD_LABEL, SQUADS } from '@/lib/roles';
import type { Announcement, AttendanceStats, Player, Squad } from '@/lib/types';
import { loadCoachSessions } from '@/lib/queries/coach-sessions';
import { PageHeader, RestrictedBanner, SectionTitle, Stat } from '@/components/ui';
import { PracticePlanner } from '@/components/practice-planner';
import { CoachSessions } from '@/components/coach-sessions';
import { AnnouncementComposer, AnnouncementList } from '@/components/announcements';
import { ExcoStar } from '@/components/exco-star';
import { ChevronRight } from '@/components/nav-icons';

export const metadata: Metadata = { title: 'Coach' };

/**
 * The coach hub. Planning, replies, the notice board and the squad in one
 * place, so running a week does not mean four screens.
 *
 * Owners only, which is the Coach and the Admin. The redirect is the polite
 * half; event_plans is owner-only in RLS, so the plans would be empty for
 * anyone else even if they reached this page.
 */
export default async function CoachPage({
  searchParams,
}: {
  searchParams: { squad?: string };
}) {
  const session = await requireSession();
  if (!canUseCoachHub(session.profile.role)) redirect('/dashboard');

  const requested = searchParams.squad as Squad | undefined;
  const squad = requested && SQUADS.includes(requested) ? requested : null;

  const supabase = createClient();
  const [sessions, playersRes, statsRes, announcementsRes] = await Promise.all([
    loadCoachSessions(squad),
    supabase
      .from('players')
      .select('*')
      .eq('is_active', true)
      .order('jersey_number', { ascending: true, nullsFirst: false })
      .order('full_name'),
    supabase.from('player_attendance_stats').select('*'),
    supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const players = ((playersRes.data ?? []) as Player[]).filter(
    (p) => squad === null || p.squad === squad,
  );
  const stats = new Map<string, AttendanceStats>(
    ((statsRes.data ?? []) as AttendanceStats[]).map((s) => [s.player_id, s]),
  );
  const announcements = (announcementsRes.data ?? []) as Announcement[];

  const nextSession = sessions[0];
  const scope = squad ? `${SQUAD_LABEL[squad]} squad` : 'Both squads';

  return (
    <>
      <PageHeader
        title="Coach"
        description="Plan sessions, see who is coming, post to the squad and check the roster."
        action={
          <div className="inline-flex border border-line" role="group" aria-label="Squad">
            {[
              { href: '/coach', label: 'Both', active: squad === null },
              ...SQUADS.map((s) => ({
                href: `/coach?squad=${s}`,
                label: SQUAD_LABEL[s],
                active: squad === s,
              })),
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.active ? 'page' : undefined}
                className={[
                  'px-4 py-2 text-[13px] font-semibold transition-colors',
                  tab.active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        }
      />

      <RestrictedBanner audience="the Coach and Admins" />

      <div className="mb-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
        <Stat
          label="Next session"
          value={nextSession ? nextSession.going.length : 0}
          hint={nextSession ? `going to ${nextSession.event.title}` : 'nothing scheduled'}
          emphasis
        />
        <Stat label="Sessions ahead" value={sessions.length} hint={scope.toLowerCase()} />
        <Stat label="Squad" value={players.length} hint="active players" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section>
            <SectionTitle>Sessions</SectionTitle>
            <div className="mb-5">
              <PracticePlanner defaultSquad={squad} />
            </div>
            <CoachSessions sessions={sessions} />
          </section>

          <section>
            <SectionTitle
              action={
                <Link
                  href="/players"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
                >
                  Full roster
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              Squad
            </SectionTitle>

            <ul className="divide-line border border-line">
              {players.map((player) => {
                const pct = stats.get(player.id)?.attendance_pct ?? null;
                return (
                  <li key={player.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="w-6 shrink-0 text-right text-[12px] font-bold tabular-nums text-muted">
                      {player.jersey_number ?? '–'}
                    </span>
                    <Link
                      href={`/players/${player.id}`}
                      className="truncate text-[14px] font-medium hover:underline"
                    >
                      {player.full_name}
                    </Link>
                    <ExcoStar role={player.exco_role} />
                    <span className="ml-auto shrink-0 text-[12px] text-muted">
                      {player.position ?? 'No position'}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[12px] font-bold tabular-nums">
                      {pct === null ? '–' : `${pct}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle>Notice board</SectionTitle>
          <div className="mb-5">
            <AnnouncementComposer defaultSquad={squad} />
          </div>
          <AnnouncementList announcements={announcements} canEdit />
        </aside>
      </div>
    </>
  );
}
