import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageRoster, canViewRoster } from '@/lib/roles';
import type { AttendanceStats, Player, Profile } from '@/lib/types';
import { PageHeader } from '@/components/ui';
import { Roster, type RosterRow } from '@/components/roster';

export const metadata: Metadata = { title: 'Players' };

export default async function PlayersPage() {
  const { profile } = await requireSession();

  // Players never reach the roster: they get their own profile instead.
  if (!canViewRoster(profile.role)) redirect('/profile');

  const supabase = createClient();
  const [playersRes, statsRes, accountsRes] = await Promise.all([
    supabase.from('players').select('*').order('jersey_number', { ascending: true, nullsFirst: false }).order('full_name'),
    supabase.from('player_attendance_stats').select('*'),
    profile.role === 'admin'
      ? supabase.from('profiles').select('id,full_name,email,role').eq('is_active', true)
      : Promise.resolve({ data: null }),
  ]);

  const players = (playersRes.data ?? []) as Player[];
  const statsById = new Map<string, AttendanceStats>(
    ((statsRes.data ?? []) as AttendanceStats[]).map((s) => [s.player_id, s]),
  );

  const rows: RosterRow[] = players.map((p) => ({
    ...p,
    attendance_pct: statsById.get(p.id)?.attendance_pct ?? null,
    logged: statsById.get(p.id)?.logged ?? 0,
  }));

  const linkedProfileIds = new Set(players.map((p) => p.profile_id).filter(Boolean));
  const accounts = ((accountsRes.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[])
    .filter((a) => a.role === 'player' && !linkedProfileIds.has(a.id))
    .map((a) => ({ id: a.id, label: `${a.full_name || a.email} (${a.email})` }));

  const active = rows.filter((r) => r.is_active);
  const boys = active.filter((r) => r.squad === 'boys').length;
  const girls = active.filter((r) => r.squad === 'girls').length;
  const unassigned = active.length - boys - girls;
  const archived = rows.length - active.length;

  return (
    <>
      <PageHeader
        title="Players"
        description={[
          `${boys} in the boys squad`,
          `${girls} in the girls squad`,
          unassigned > 0 ? `${unassigned} not assigned` : null,
          archived > 0 ? `${archived} archived` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <Roster
        players={rows}
        canManage={canManageRoster(profile.role)}
        accounts={accounts}
      />
    </>
  );
}
