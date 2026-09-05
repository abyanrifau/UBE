import { requireSession } from '@/lib/supabase/server';
import { AppShell, type NavItem } from '@/components/app-shell';
import { canManageAccounts, canUseCoachHub, canViewFinance, canViewRoster } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  const role = profile.role;

  const nav: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: 'dashboard' },
    { href: '/schedule', label: 'Schedule', short: 'Schedule', icon: 'schedule' },
  ];

  // The coach hub sits early: for the Coach it is the screen they open first.
  if (canUseCoachHub(role)) {
    nav.push({ href: '/coach', label: 'Coach', short: 'Coach', icon: 'coach' });
  }
  if (canViewRoster(role)) {
    nav.push({ href: '/players', label: 'Players', short: 'Players', icon: 'players' });
  }
  if (canViewFinance(role)) {
    nav.push({ href: '/financials', label: 'Financials', short: 'Money', icon: 'financials' });
  }
  nav.push({ href: '/profile', label: 'My Profile', short: 'Me', icon: 'profile' });
  if (canManageAccounts(role)) {
    nav.push({ href: '/accounts', label: 'Accounts', short: 'Admin', icon: 'accounts' });
  }

  return (
    <AppShell
      nav={nav}
      name={profile.full_name || profile.email}
      role={role}
      theme={profile.theme}
    >
      {children}
    </AppShell>
  );
}
