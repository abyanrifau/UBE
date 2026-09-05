'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AttendanceStatus, ExcoRole } from '@/lib/types';
import { saveAttendance } from '@/lib/actions/events';
import { Notice } from '@/components/ui';
import { ExcoStar } from '@/components/exco-star';

type Row = {
  playerId: string;
  name: string;
  jersey: number | null;
  excoRole: ExcoRole | null;
  status: AttendanceStatus | null;
};

const OPTIONS: { value: AttendanceStatus; label: string; short: string }[] = [
  { value: 'present', label: 'Present', short: 'P' },
  { value: 'absent', label: 'Absent', short: 'A' },
  { value: 'excused', label: 'Excused', short: 'E' },
];

export function AttendanceEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = rows.some((r, i) => r.status !== initial[i]?.status);
  const counts = OPTIONS.map((o) => ({
    ...o,
    count: rows.filter((r) => r.status === o.value).length,
  }));
  const unmarked = rows.filter((r) => r.status === null).length;

  function set(playerId: string, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((r) =>
        r.playerId === playerId ? { ...r, status: r.status === status ? null : status } : r,
      ),
    );
    setSaved(false);
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => (r.status === null ? { ...r, status: 'present' } : r)));
    setSaved(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const result = await saveAttendance(
        eventId,
        rows.map((r) => ({ playerId: r.playerId, status: r.status })),
      );
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="border border-line px-4 py-6 text-center text-[13px] text-muted">
        No active players on the roster yet.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {counts.map((c) => `${c.count} ${c.label.toLowerCase()}`).join(' · ')}
          {unmarked > 0 ? ` · ${unmarked} not marked` : ''}
        </p>
        <button type="button" className="btn-secondary btn-sm" onClick={markAllPresent}>
          Mark remaining present
        </button>
      </div>

      <ul className="divide-line border border-line">
        {rows.map((row) => (
          <li
            key={row.playerId}
            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="w-7 shrink-0 text-right text-[12px] font-bold tabular-nums text-muted">
                {row.jersey ?? '–'}
              </span>
              <span className="truncate text-[14px] font-medium">{row.name}</span>
              <ExcoStar role={row.excoRole} />
            </span>

            <span className="inline-flex border border-line" role="group" aria-label={`Attendance for ${row.name}`}>
              {OPTIONS.map((option) => {
                const active = row.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    title={option.label}
                    onClick={() => set(row.playerId, option.value)}
                    className={[
                      'px-3 py-1.5 text-[12px] font-semibold transition-colors',
                      active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                    ].join(' ')}
                  >
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.short}</span>
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={save} disabled={pending || !dirty}>
          {pending ? 'Saving…' : 'Save attendance'}
        </button>
        {saved && !dirty && <span className="text-[13px] text-muted">Saved.</span>}
        {dirty && !pending && <span className="text-[13px] text-muted">Unsaved changes.</span>}
      </div>
    </div>
  );
}
