import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageRoster, canViewRoster, isOwner } from '@/lib/roles';
import type { AttendanceStats, Player, Profile } from '@/lib/types';
import { BackLink, PageHeader } from '@/components/ui';
import { PlayerDetail, type AttendanceHistoryRow, type StatHistoryRow } from '@/components/player-detail';
import { PlayerAdmin } from '@/components/player-admin';
import { loadPlayerHistory } from '@/lib/queries/player-history';

export const metadata: Metadata = { title: 'Player' };

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const { profile } = await requireSession();
  if (!canViewRoster(profile.role)) redirect('/profile');

  const supabase = createClient();
  const { data: playerRow } = await supabase
    .from('players')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!playerRow) notFound();
  const player = playerRow as Player;

  const [{ history, matchStats }, statsRes, accountsRes] = await Promise.all([
    loadPlayerHistory(player.id),
    supabase
      .from('player_attendance_stats')
      .select('*')
      .eq('player_id', player.id)
      .maybeSingle(),
    isOwner(profile.role)
      ? supabase.from('profiles').select('id,full_name,email,role').eq('is_active', true)
      : Promise.resolve({ data: null }),
  ]);

  const { data: linkedRows } = isOwner(profile.role)
    ? await supabase.from('players').select('profile_id').not('profile_id', 'is', null)
    : { data: null };

  const linked = new Set((linkedRows ?? []).map((r) => r.profile_id as string));
  const accounts = ((accountsRes.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[])
    .filter((a) => a.role === 'player' && (!linked.has(a.id) || a.id === player.profile_id))
    .map((a) => ({ id: a.id, label: `${a.full_name || a.email} (${a.email})` }));

  return (
    <>
      <div className="mb-6">
        <BackLink href="/players">Players</BackLink>
      </div>

      <PageHeader
        title={player.full_name}
        description={[
          player.jersey_number !== null ? `#${player.jersey_number}` : null,
          player.position,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      {canManageRoster(profile.role) && (
        <div className="mb-10">
          <PlayerAdmin
            player={player}
            accounts={accounts}
            canDelete={isOwner(profile.role)}
          />
        </div>
      )}

      <PlayerDetail
        player={player}
        stats={(statsRes.data ?? null) as AttendanceStats | null}
        history={history as AttendanceHistoryRow[]}
        matchStats={matchStats as StatHistoryRow[]}
        showContact
      />
    </>
  );
}
