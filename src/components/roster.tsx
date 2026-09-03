'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Player } from '@/lib/types';
import { age } from '@/lib/format';
import { PlayerForm } from '@/components/player-form';
import { EmptyState } from '@/components/ui';

export type RosterRow = Player & { attendance_pct: number | null; logged: number };

export function Roster({
  players,
  canManage,
  accounts,
}: {
  players: RosterRow[];
  canManage: boolean;
  accounts: { id: string; label: string }[];
}) {
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => (showArchived ? true : p.is_active))
      .filter((p) =>
        q === ''
          ? true
          : p.full_name.toLowerCase().includes(q) ||
            (p.position ?? '').toLowerCase().includes(q) ||
            String(p.jersey_number ?? '').includes(q),
      );
  }, [players, query, showArchived]);

  const archivedCount = players.filter((p) => !p.is_active).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, position or number"
          className="field sm:max-w-xs"
          aria-label="Search the roster"
        />
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-pressed={showArchived}
            className={[
              'whitespace-nowrap border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
              showArchived ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:text-ink',
            ].join(' ')}
          >
            {showArchived ? 'Hiding nothing' : `Show archived (${archivedCount})`}
          </button>
        )}
        {canManage && (
          <button
            type="button"
            className="btn-primary btn-sm sm:ml-auto"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
          >
            {adding ? 'Cancel' : 'Add player'}
          </button>
        )}
      </div>

      {adding && canManage && (
        <div className="card mb-8 animate-fade-up p-5 sm:p-6">
          <h2 className="mb-5 text-[15px] font-bold">Add a player</h2>
          <PlayerForm
            accounts={accounts}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No players match' : 'The roster is empty'}
          description={
            query
              ? 'Try a different name or number.'
              : canManage
                ? 'Add your first player to start tracking attendance.'
                : 'Nobody has been added yet.'
          }
        />
      ) : (
        <>
          {/* Table on desktop */}
          <div className="hidden border border-line md:block">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="w-14 px-3 py-3 text-center font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Player</th>
                  <th className="px-3 py-3 font-semibold">Position</th>
                  <th className="px-3 py-3 text-right font-semibold">Age</th>
                  <th className="px-3 py-3 text-right font-semibold">Height</th>
                  <th className="w-40 px-3 py-3 font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-line">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-subtle">
                    <td className="px-3 py-3 text-center text-[13px] font-bold tabular-nums text-muted">
                      {p.jersey_number ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/players/${p.id}`} className="font-semibold hover:underline">
                        {p.full_name}
                      </Link>
                      {!p.is_active && (
                        <span className="ml-2 text-[11px] uppercase tracking-wider text-muted">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">{p.position ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">
                      {age(p.date_of_birth) ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">
                      {p.height_cm ? `${p.height_cm} cm` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <InlineMeter value={p.attendance_pct} logged={p.logged} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="card block p-4 transition-colors hover:bg-subtle">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line text-[15px] font-bold tabular-nums">
                      {p.jersey_number ?? '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{p.full_name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {p.position ?? 'Position not set'}
                        {!p.is_active && ' · Archived'}
                      </p>
                      <div className="mt-3">
                        <InlineMeter value={p.attendance_pct} logged={p.logged} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function InlineMeter({ value, logged }: { value: number | null; logged: number }) {
  if (logged === 0 || value === null) {
    return <span className="text-[12px] text-muted">No sessions logged</span>;
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 border border-line bg-subtle">
        <div className="h-full bg-ink" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] font-bold tabular-nums">{value}%</span>
    </div>
  );
}
