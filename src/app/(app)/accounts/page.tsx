import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageAccounts, ROLE_LABEL } from '@/lib/roles';
import type { Player, Profile } from '@/lib/types';
import { PageHeader, RestrictedBanner, SectionTitle } from '@/components/ui';
import { AccountsManager, type AccountRow } from '@/components/accounts-manager';
import { ALL_ROLES } from '@/lib/roles';

export const metadata: Metadata = { title: 'Accounts' };

export default async function AccountsPage() {
  const { profile, userId } = await requireSession();
  if (!canManageAccounts(profile.role)) redirect('/dashboard');

  const supabase = createClient();
  const [profilesRes, playersRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('players').select('id,full_name,profile_id,is_active'),
  ]);

  const profiles = (profilesRes.data ?? []) as Profile[];
  const players = (playersRes.data ?? []) as Pick<
    Player,
    'id' | 'full_name' | 'profile_id' | 'is_active'
  >[];

  const playerByProfile = new Map(
    players.filter((p) => p.profile_id).map((p) => [p.profile_id as string, p.full_name]),
  );

  const accounts: AccountRow[] = profiles.map((p) => ({
    ...p,
    playerName: playerByProfile.get(p.id) ?? null,
  }));

  const unlinkedPlayers = players
    .filter((p) => !p.profile_id && p.is_active)
    .map((p) => ({ id: p.id, label: p.full_name }));

  const counts = ALL_ROLES.map((role) => ({
    role,
    count: accounts.filter((a) => a.role === role && a.is_active).length,
  }));

  return (
    <>
      <PageHeader
        title="Manage Accounts"
        description="Create logins, assign roles and hand out temporary passwords."
      />

      <RestrictedBanner audience="Admins" />

      <section className="mb-8">
        <SectionTitle>Active accounts by role</SectionTitle>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
          {counts.map(({ role, count }) => (
            <div key={role} className="bg-paper p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {ROLE_LABEL[role]}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <AccountsManager
        accounts={accounts}
        unlinkedPlayers={unlinkedPlayers}
        currentUserId={userId}
      />
    </>
  );
}
