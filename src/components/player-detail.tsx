import type { AttendanceStats, MatchStat, Player } from '@/lib/types';
import { age, formatDate } from '@/lib/format';
import { KeyValue, Meter, SectionTitle, Stat, Tag } from '@/components/ui';
import { SQUAD_LABEL } from '@/lib/roles';
import { EVENT_TYPE_LABEL } from '@/lib/events';

export type AttendanceHistoryRow = {
  id: string;
  status: 'present' | 'absent' | 'excused';
  eventTitle: string;
  eventType: keyof typeof EVENT_TYPE_LABEL;
  startsAt: string;
  note: string | null;
};

export type StatHistoryRow = MatchStat & { eventTitle: string; startsAt: string };

const STATUS_LABEL = { present: 'Present', absent: 'Absent', excused: 'Excused' } as const;

/**
 * The read side of a player record. Shared by the staff view at
 * /players/[id] and the player's own view at /profile.
 */
export function PlayerDetail({
  player,
  stats,
  history,
  matchStats,
  showContact,
}: {
  player: Player;
  stats: AttendanceStats | null;
  history: AttendanceHistoryRow[];
  matchStats: StatHistoryRow[];
  /** Contact and guardian details are staff-facing. */
  showContact: boolean;
}) {
  const totals = matchStats.reduce(
    (acc, s) => ({
      points: acc.points + s.points,
      kills: acc.kills + s.kills,
      blocks: acc.blocks + s.blocks,
      aces: acc.aces + s.aces,
      digs: acc.digs + s.digs,
      assists: acc.assists + s.assists,
    }),
    { points: 0, kills: 0, blocks: 0, aces: 0, digs: 0, assists: 0 },
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-10">
        {/* ------------------------------------------------------ */}
        <section>
          <SectionTitle>Attendance</SectionTitle>
          <div className="card p-5">
            <Meter value={stats?.attendance_pct ?? null} />
            <div className="mt-5 grid grid-cols-3 gap-px border border-line bg-line">
              <Stat label="Present" value={stats?.present ?? 0} />
              <Stat label="Absent" value={stats?.absent ?? 0} />
              <Stat label="Excused" value={stats?.excused ?? 0} />
            </div>
            <p className="mt-3 text-[12px] text-muted">
              Percentage counts present against absent. Excused sessions do not count against it.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------ */}
        {history.length > 0 && (
          <section>
            <SectionTitle>Recent sessions</SectionTitle>
            <ul className="divide-line border border-line">
              {history.slice(0, 12).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{row.eventTitle}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {EVENT_TYPE_LABEL[row.eventType]} · {formatDate(row.startsAt)}
                      {row.note ? ` · ${row.note}` : ''}
                    </p>
                  </div>
                  <span
                    className={
                      row.status === 'present'
                        ? 'tag-solid'
                        : 'tag'
                    }
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------ */}
        {matchStats.length > 0 && (
          <section>
            <SectionTitle>Match stats</SectionTitle>
            <div className="mb-4 grid grid-cols-3 gap-px border border-line bg-line sm:grid-cols-6">
              <Stat label="Points" value={totals.points} />
              <Stat label="Kills" value={totals.kills} />
              <Stat label="Blocks" value={totals.blocks} />
              <Stat label="Aces" value={totals.aces} />
              <Stat label="Digs" value={totals.digs} />
              <Stat label="Assists" value={totals.assists} />
            </div>

            <div className="no-scrollbar overflow-x-auto border border-line">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="px-3.5 py-2.5 font-semibold">Match</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Pts</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Kills</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Blocks</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Aces</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Digs</th>
                  </tr>
                </thead>
                <tbody className="divide-line">
                  {matchStats.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3.5 py-2.5">
                        <span className="block truncate font-medium">{s.eventTitle}</span>
                        <span className="text-[11px] text-muted">{formatDate(s.startsAt)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{s.points}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{s.kills}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{s.blocks}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{s.aces}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{s.digs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ */}
        {player.notes && (
          <section>
            <SectionTitle>Coach notes</SectionTitle>
            <div className="card p-5">
              <p className="prose-body">{player.notes}</p>
            </div>
          </section>
        )}
      </div>

      {/* -------------------------------------------------------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SectionTitle>Details</SectionTitle>
        <div className="card px-5 py-2">
          <dl className="divide-line">
            <KeyValue
              label="Team"
              value={player.squad ? `${SQUAD_LABEL[player.squad]} squad` : 'Not assigned'}
            />
            <KeyValue label="Jersey" value={player.jersey_number ?? '–'} />
            <KeyValue label="Position" value={player.position ?? '–'} />
            <KeyValue
              label="Height"
              value={player.height_cm ? `${player.height_cm} cm` : '–'}
            />
            <KeyValue
              label="Weight"
              value={player.weight_kg ? `${player.weight_kg} kg` : '–'}
            />
            <KeyValue
              label="Date of birth"
              value={
                player.date_of_birth
                  ? `${formatDate(player.date_of_birth)}${
                      age(player.date_of_birth) !== null ? ` · ${age(player.date_of_birth)}` : ''
                    }`
                  : '–'
              }
            />
            {showContact && (
              <>
                <KeyValue label="Email" value={player.email ?? '–'} />
                <KeyValue label="Phone" value={player.phone ?? '–'} />
                <KeyValue label="Guardian" value={player.guardian_name ?? '–'} />
                <KeyValue label="Guardian phone" value={player.guardian_phone ?? '–'} />
              </>
            )}
            <KeyValue
              label="Status"
              value={player.is_active ? <Tag solid>Active</Tag> : <Tag>Archived</Tag>}
            />
          </dl>
        </div>
      </aside>
    </div>
  );
}
