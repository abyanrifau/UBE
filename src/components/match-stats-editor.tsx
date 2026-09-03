'use client';

import { useState } from 'react';
import type { MatchStat } from '@/lib/types';
import { saveMatchStat } from '@/lib/actions/events';
import { ActionForm, TextArea } from '@/components/form';

const FIELDS = [
  { name: 'points', label: 'Pts' },
  { name: 'kills', label: 'Kills' },
  { name: 'blocks', label: 'Blocks' },
  { name: 'aces', label: 'Aces' },
  { name: 'digs', label: 'Digs' },
  { name: 'assists', label: 'Assists' },
  { name: 'serve_errors', label: 'S/E' },
] as const;

type Row = {
  playerId: string;
  name: string;
  jersey: number | null;
  stat: MatchStat | null;
};

/**
 * Per-match numbers. Optional by design — a coach who does not want to log
 * stats can ignore this entirely and use the notes field on the player.
 */
export function MatchStatsEditor({ eventId, rows }: { eventId: string; rows: Row[] }) {
  const [openFor, setOpenFor] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="border border-line px-4 py-6 text-center text-[13px] text-muted">
        No active players on the roster yet.
      </p>
    );
  }

  return (
    <div className="border border-line">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3.5 py-2.5 font-semibold">Player</th>
              {FIELDS.map((f) => (
                <th key={f.name} className="px-2 py-2.5 text-center font-semibold tabular-nums">
                  {f.label}
                </th>
              ))}
              <th className="px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-line">
            {rows.map((row) => (
              <tr key={row.playerId}>
                <td className="px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className="w-6 text-right text-[11px] font-bold tabular-nums text-muted">
                      {row.jersey ?? '—'}
                    </span>
                    <span className="truncate font-medium">{row.name}</span>
                  </span>
                </td>
                {FIELDS.map((f) => (
                  <td key={f.name} className="px-2 py-2.5 text-center tabular-nums">
                    {row.stat ? (row.stat[f.name] ?? 0) : <span className="text-muted">·</span>}
                  </td>
                ))}
                <td className="px-3.5 py-2.5 text-right">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setOpenFor(openFor === row.playerId ? null : row.playerId)}
                  >
                    {openFor === row.playerId ? 'Close' : row.stat ? 'Edit' : 'Log'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openFor && (
        <div className="animate-fade-up border-t border-line bg-subtle p-5">
          <StatForm
            eventId={eventId}
            row={rows.find((r) => r.playerId === openFor)!}
            onDone={() => setOpenFor(null)}
          />
        </div>
      )}
    </div>
  );
}

function StatForm({
  eventId,
  row,
  onDone,
}: {
  eventId: string;
  row: Row;
  onDone: () => void;
}) {
  return (
    <ActionForm
      action={saveMatchStat}
      submitLabel="Save stats"
      onDone={onDone}
      secondary={
        <button type="button" className="btn-ghost btn-sm" onClick={onDone}>
          Cancel
        </button>
      }
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="player_id" value={row.playerId} />

      <p className="text-[15px] font-bold">{row.name}</p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
        {FIELDS.map((f) => (
          <label key={f.name} className="block">
            <span className="label">{f.label}</span>
            <input
              name={f.name}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="field text-center tabular-nums"
              defaultValue={row.stat ? (row.stat[f.name] ?? 0) : 0}
            />
          </label>
        ))}
      </div>

      <TextArea
        name="notes"
        label="Notes"
        rows={2}
        defaultValue={row.stat?.notes ?? ''}
        placeholder="Anything worth remembering about this performance."
      />
    </ActionForm>
  );
}
