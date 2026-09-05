'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Player, Squad } from '@/lib/types';
import { SQUAD_LABEL } from '@/lib/roles';
import { age } from '@/lib/format';
import { PlayerForm } from '@/components/player-form';
import { EmptyState } from '@/components/ui';

export type RosterRow = Player & { attendance_pct: number | null; logged: number };

type Group = { key: string; label: string; rows: RosterRow[]; note?: string };

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

  /**
   * One section per squad. Players with no squad yet get their own section,
   * shown only when somebody is actually in it, so it disappears once the
   * roster is fully assigned.
   */
  const groups = useMemo<Group[]>(() => {
    const bySquad = (squad: Squad) => filtered.filter((p) => p.squad === squad);
    const unassigned = filtered.filter((p) => p.squad === null);

    const out: Group[] = [
      { key: 'boys', label: `${SQUAD_LABEL.boys} squad`, rows: bySquad('boys') },
      { key: 'girls', label: `${SQUAD_LABEL.girls} squad`, rows: bySquad('girls') },
    ];

    if (unassigned.length > 0) {
      out.push({
        key: 'unassigned',
        label: 'Not assigned to a squad',
        rows: unassigned,
        note: 'Open each player and set their team so they appear on the right schedule.',
      });
    }
    return out;
  }, [filtered]);

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
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
                <h2 className="eyebrow">{group.label}</h2>
                <p className="shrink-0 text-[12px] tabular-nums text-muted">
                  {group.rows.length} {group.rows.length === 1 ? 'player' : 'players'}
                </p>
              </div>

              {group.note && group.rows.length > 0 && (
                <p className="mb-3 text-[13px] text-muted">{group.note}</p>
              )}

              {group.rows.length === 0 ? (
                <p className="border border-line px-4 py-6 text-center text-[13px] text-muted">
                  {query ? 'Nobody in this squad matches.' : 'No players in this squad yet.'}
                </p>
              ) : (
                <PlayerGroup rows={group.rows} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerGroup({ rows }: { rows: RosterRow[] }) {
  return (
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
            {rows.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-subtle">
                <td className="px-3 py-3 text-center text-[13px] font-bold tabular-nums text-muted">
                  {p.jersey_number ?? '–'}
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
                <td className="px-3 py-3 text-muted">{p.position ?? '–'}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">
                  {age(p.date_of_birth) ?? '–'}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">
                  {p.height_cm ? `${p.height_cm} cm` : '–'}
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
        {rows.map((p) => (
          <li key={p.id}>
            <Link
              href={`/players/${p.id}`}
              className="card block p-4 transition-colors hover:bg-subtle"
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line text-[15px] font-bold tabular-nums">
                  {p.jersey_number ?? '–'}
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
