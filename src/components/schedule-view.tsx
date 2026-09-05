'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AcademyEvent, EventType, RsvpStatus, Squad } from '@/lib/types';
import { dayKey, formatTime, MONTH_NAMES } from '@/lib/format';
import { EventCard, EventForm } from '@/components/events';
import { EVENT_TYPE_LABEL } from '@/lib/events';
import { EmptyState } from '@/components/ui';

type ViewMode = 'list' | 'calendar';

const TYPE_FILTERS: ('all' | EventType)[] = [
  'all',
  'practice',
  'match',
  'tournament',
  'meeting',
  'event',
];

export function ScheduleView({
  events,
  rsvps,
  canManage,
  squad = null,
}: {
  events: AcademyEvent[];
  rsvps: Record<string, RsvpStatus>;
  canManage: boolean;
  /** Which squad view this is. New events default to it. */
  squad?: Squad | null;
}) {
  const [view, setView] = useState<ViewMode>('list');
  const [type, setType] = useState<'all' | EventType>('all');
  const [showPast, setShowPast] = useState(false);
  const [creating, setCreating] = useState(false);

  const nowMs = Date.now();

  const filtered = useMemo(() => {
    return events
      .filter((e) => (type === 'all' ? true : e.type === type))
      .filter((e) => (showPast ? true : Date.parse(e.ends_at ?? e.starts_at) >= nowMs - 36e5));
  }, [events, type, showPast, nowMs]);

  return (
    <div>
      {/* ---------------------------------------------------------- */}
      {/* Controls                                                    */}
      {/* ---------------------------------------------------------- */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex border border-line" role="group" aria-label="View">
            {(['list', 'calendar'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={[
                  'px-4 py-2 text-[13px] font-semibold capitalize transition-colors',
                  view === mode ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {mode}
              </button>
            ))}
          </div>

          {canManage && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setCreating((v) => !v)}
              aria-expanded={creating}
            >
              {creating ? 'Cancel' : 'New event'}
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={[
                'whitespace-nowrap border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
                type === t
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line text-muted hover:text-ink',
              ].join(' ')}
            >
              {t === 'all' ? 'All' : `${EVENT_TYPE_LABEL[t]}s`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-pressed={showPast}
            className={[
              'ml-auto whitespace-nowrap border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
              showPast ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:text-ink',
            ].join(' ')}
          >
            {showPast ? 'Hiding nothing' : 'Show past'}
          </button>
        </div>
      </div>

      {creating && canManage && (
        <div className="card mb-8 animate-fade-up p-5 sm:p-6">
          <h2 className="mb-5 text-[15px] font-bold">New event</h2>
          <EventForm
            defaultSquad={squad}
            onDone={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Views                                                       */}
      {/* ---------------------------------------------------------- */}
      {view === 'list' ? (
        <ListView events={filtered} rsvps={rsvps} />
      ) : (
        <CalendarView events={filtered} rsvps={rsvps} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

function ListView({
  events,
  rsvps,
}: {
  events: AcademyEvent[];
  rsvps: Record<string, RsvpStatus>;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Nothing matches"
        description="Try a different type, or turn on past events."
      />
    );
  }

  // Group by month so a long list stays scannable.
  const groups = new Map<string, AcademyEvent[]>();
  for (const event of events) {
    const d = new Date(event.starts_at);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  return (
    <div className="space-y-9">
      {Array.from(groups.entries()).map(([key, group]) => {
        const [year, month] = key.split('-').map(Number);
        return (
          <section key={key}>
            <h2 className="eyebrow mb-3">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="space-y-3">
              {group.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  rsvp={rsvps[event.id] ?? null}
                  showRsvp
                  href={`/schedule/${event.id}`}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function CalendarView({
  events,
  rsvps,
}: {
  events: AcademyEvent[];
  rsvps: Record<string, RsvpStatus>;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  });
  const [selected, setSelected] = useState<string | null>(dayKey(today));

  const byDay = useMemo(() => {
    const map = new Map<string, AcademyEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.starts_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
  const startWeekday = first.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const leading = (startWeekday + 6) % 7; // shift to Monday-first

  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(Date.UTC(cursor.year, cursor.month, i + 1));
      return d.toISOString().slice(0, 10);
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const step = (delta: number) => {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];
  const todayKey = dayKey(today);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-tight">
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="btn-secondary btn-sm px-3"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                setCursor({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
                setSelected(todayKey);
              }}
              className="btn-secondary btn-sm"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="btn-secondary btn-sm px-3"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-x border-t border-line">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div
              key={d}
              className="border-b border-line py-2 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted"
            >
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}

          {cells.map((iso, i) => {
            if (!iso) {
              return <div key={`pad-${i}`} className="border-b border-r border-line bg-subtle/50" />;
            }
            const dayEvents = byDay.get(iso) ?? [];
            const isToday = iso === todayKey;
            const isSelected = iso === selected;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSelected}
                className={[
                  'relative flex min-h-[64px] flex-col items-start gap-1 border-b border-r border-line p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2',
                  isSelected ? 'bg-ink text-paper' : 'hover:bg-subtle',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-[12px] font-semibold tabular-nums',
                    isToday && !isSelected ? 'underline decoration-2 underline-offset-2' : '',
                  ].join(' ')}
                >
                  {Number(iso.slice(8, 10))}
                </span>

                {/* Titles on desktop, dots on phones. */}
                <span className="hidden w-full flex-col gap-0.5 sm:flex">
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className={[
                        'truncate border-l-2 pl-1 text-[10px] leading-tight',
                        isSelected ? 'border-paper' : 'border-ink',
                      ].join(' ')}
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] opacity-70">+{dayEvents.length - 2} more</span>
                  )}
                </span>

                {dayEvents.length > 0 && (
                  <span className="mt-auto flex gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`h-1 w-1 rounded-full ${isSelected ? 'bg-paper' : 'bg-ink'}`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside>
        <h3 className="eyebrow mb-3">
          {selected
            ? new Intl.DateTimeFormat('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
              }).format(new Date(`${selected}T00:00:00Z`))
            : 'Pick a day'}
        </h3>

        {selectedEvents.length === 0 ? (
          <p className="border border-line px-4 py-6 text-center text-[13px] text-muted">
            Nothing scheduled.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <Link key={event.id} href={`/schedule/${event.id}`} className="block">
                <div className="card p-4 transition-colors hover:bg-subtle">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {EVENT_TYPE_LABEL[event.type]} · {formatTime(event.starts_at)}
                  </p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug">{event.title}</p>
                  {event.location && (
                    <p className="mt-1 text-[13px] text-muted">{event.location}</p>
                  )}
                  {rsvps[event.id] && (
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
                      You: {rsvps[event.id] === 'not_going' ? "Can't" : rsvps[event.id]}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
