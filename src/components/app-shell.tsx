'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Logo } from '@/components/logo';
import { ThemeProvider, ThemeToggle } from '@/components/theme';
import { SignOutButton } from '@/components/sign-out';
import { DemoBanner } from '@/components/demo-banner';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABEL } from '@/lib/roles';
import { initials } from '@/lib/format';
import type { AppRole, ThemePreference } from '@/lib/types';
import {
  AccountsIcon,
  DashboardIcon,
  FinanceIcon,
  PlayersIcon,
  ProfileIcon,
  ScheduleIcon,
} from '@/components/nav-icons';

export const NAV_ICONS = {
  dashboard: DashboardIcon,
  schedule: ScheduleIcon,
  players: PlayersIcon,
  financials: FinanceIcon,
  profile: ProfileIcon,
  accounts: AccountsIcon,
};

export type NavIconKey = keyof typeof NAV_ICONS;
export type NavItem = { href: string; label: string; short: string; icon: NavIconKey };

export function AppShell({
  children,
  nav,
  name,
  role,
  theme,
}: {
  children: React.ReactNode;
  nav: NavItem[];
  name: string;
  role: AppRole;
  theme: ThemePreference;
}) {
  const pathname = usePathname();

  // Remembered per user: written to localStorage immediately by ThemeProvider,
  // and mirrored onto the profile so a new device starts in the right theme.
  const persistTheme = useCallback((preference: ThemePreference) => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void supabase.from('profiles').update({ theme: preference }).eq('id', data.user.id);
      }
    });
  }, []);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <ThemeProvider initial={theme} onPersist={persistTheme}>
      <div className="flex min-h-dvh flex-col">
        <DemoBanner />

        {/* -------------------------------------------------------- */}
        {/* Header                                                    */}
        {/* -------------------------------------------------------- */}
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
              <Logo size={30} />
              <span className="text-[13px] font-bold uppercase tracking-[0.2em]">UBE</span>
            </Link>

            <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'px-3 py-2 text-[14px] font-medium transition-colors',
                      active
                        ? 'text-ink underline decoration-2 underline-offset-[10px]'
                        : 'text-muted hover:text-ink',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle compact />
              <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex">
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center border border-line text-[11px] font-bold"
                >
                  {initials(name)}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="max-w-[140px] truncate text-[13px] font-semibold">{name}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
                    {ROLE_LABEL[role]}
                  </span>
                </span>
              </div>
              <SignOutButton className="btn-ghost btn-sm hidden sm:inline-flex" />
            </div>
          </div>
        </header>

        {/* -------------------------------------------------------- */}
        {/* Page                                                      */}
        {/* -------------------------------------------------------- */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10">
          {children}
        </main>

        {/* -------------------------------------------------------- */}
        {/* Mobile tab bar — thumb-reachable, always labelled          */}
        {/* -------------------------------------------------------- */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto flex max-w-lg">
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors',
                      active ? 'text-ink' : 'text-muted',
                    ].join(' ')}
                  >
                    <Icon className={active ? 'opacity-100' : 'opacity-70'} />
                    <span>{item.short}</span>
                    <span
                      aria-hidden
                      className={`h-[2px] w-6 ${active ? 'bg-ink' : 'bg-transparent'}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </ThemeProvider>
  );
}
