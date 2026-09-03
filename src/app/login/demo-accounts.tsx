'use client';

import { DEMO_LOGINS } from '@/lib/demo/accounts';
import { DEMO_PASSWORD } from '@/lib/demo/config';
import { ROLE_LABEL } from '@/lib/roles';

/**
 * Shown on the login screen while demo mode is on. Clicking a role fills the
 * form so the whole app can be walked through without a database.
 */
export function DemoAccountPicker({
  onPick,
}: {
  onPick: (email: string, password: string) => void;
}) {
  return (
    <div className="border border-line">
      <div className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Demo logins</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Pick a role to fill the form. Password is{' '}
          <code className="font-mono font-semibold text-ink">{DEMO_PASSWORD}</code> for all of
          them.
        </p>
      </div>

      <ul className="divide-line">
        {DEMO_LOGINS.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => onPick(account.email, DEMO_PASSWORD)}
              className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-subtle"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{ROLE_LABEL[account.role]}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {account.blurb}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted">{account.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
