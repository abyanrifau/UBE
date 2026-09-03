import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient, requireSession } from '@/lib/supabase/server';
import { ROLE_BLURB, ROLE_LABEL } from '@/lib/roles';
import type { AttendanceStats, Player } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { KeyValue, PageHeader, SectionTitle } from '@/components/ui';
import { PlayerDetail, type AttendanceHistoryRow, type StatHistoryRow } from '@/components/player-detail';
import { AccountSettings } from '@/components/account-settings';
import { loadPlayerHistory } from '@/lib/queries/player-history';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const { profile, userId } = await requireSession();
  const supabase = createClient();

  // RLS: a player can only ever match their own roster row here.
  const { data: playerRow } = await supabase
    .from('players')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  const player = (playerRow ?? null) as Player | null;

  const [history, statsRes] = player
    ? await Promise.all([
        loadPlayerHistory(player.id),
        supabase
          .from('player_attendance_stats')
          .select('*')
          .eq('player_id', player.id)
          .maybeSingle(),
      ])
    : [{ history: [], matchStats: [] }, { data: null }];

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your account, and — if you are on the roster — your own player record."
      />

      <div className="mb-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <SectionTitle>Account</SectionTitle>
          <AccountSettings profile={profile} />
        </section>

        <aside>
          <SectionTitle>Your access</SectionTitle>
          <div className="card px-5 py-2">
            <dl className="divide-line">
              <KeyValue label="Role" value={ROLE_LABEL[profile.role]} />
              <KeyValue label="Email" value={profile.email} />
              <KeyValue label="Member since" value={formatDate(profile.created_at)} />
            </dl>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {ROLE_BLURB[profile.role]} Only an admin can change your role.
          </p>
        </aside>
      </div>

      {player ? (
        <section>
          <div className="mb-6 border-t border-line pt-8">
            <h2 className="text-[22px] font-bold tracking-tight">Player record</h2>
            <p className="mt-1.5 text-sm text-muted">
              Maintained by your coach and ExCo. Ask them if something looks wrong.
            </p>
          </div>
          <PlayerDetail
            player={player}
            stats={(statsRes.data ?? null) as AttendanceStats | null}
            history={history.history as AttendanceHistoryRow[]}
            matchStats={history.matchStats as StatHistoryRow[]}
            showContact={false}
          />
        </section>
      ) : (
        <section className="border-t border-line pt-8">
          <div className="card px-6 py-10 text-center">
            <p className="text-[15px] font-semibold">No player record linked</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              Your login is not attached to a roster entry yet, so there is no attendance or stats
              history to show. An admin can link them from the Players page.
            </p>
            <Link href="/schedule" className="btn-secondary btn-sm mt-5">
              Go to the schedule
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
