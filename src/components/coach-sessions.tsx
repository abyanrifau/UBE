'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Attendee, CoachSession } from '@/lib/queries/coach-sessions';
import { EVENT_TYPE_LABEL } from '@/lib/events';
import { formatDate, formatTime, relativeDay } from '@/lib/format';
import { EmptyState, Notice, Tag } from '@/components/ui';
import { SquadTag } from '@/components/squad';
import { ExcoStar } from '@/components/exco-star';
import { saveSessionPlan } from '@/lib/actions/coach';

/**
 * The sessions coming up, each with who is coming and what the coach intends
 * to run.
 *
 * RSVPs change while the coach is looking at this, so the list refreshes when
 * the tab regains focus rather than going stale in a pocket on the way to
 * training.
 */
export function CoachSessions({ sessions }: { sessions: CoachSession[] }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router]);

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Nothing scheduled"
        description="Add a practice above and it will show up here with the squad's replies."
      />
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard key={session.event.id} session={session} />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: CoachSession }) {
  const { event, going, maybe, notGoing, noReply } = session;
  const relative = relativeDay(event.starts_at);

  return (
    <article className="card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag solid>{EVENT_TYPE_LABEL[event.type]}</Tag>
            <SquadTag squad={event.squad} />
            {relative && <Tag>{relative}</Tag>}
          </div>
          <h3 className="mt-2 text-[17px] font-bold leading-snug">
            <Link href={`/schedule/${event.id}`} className="hover:underline">
              {event.title}
            </Link>
          </h3>
          <p className="mt-1 text-[13px] text-muted">
            {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
            {event.ends_at ? ` to ${formatTime(event.ends_at)}` : ''}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>

        <p className="shrink-0 text-right">
          <span className="block text-[26px] font-bold leading-none tabular-nums">
            {going.length}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            going
          </span>
        </p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <AttendanceLists going={going} maybe={maybe} notGoing={notGoing} noReply={noReply} />
        <PlanEditor
          eventId={event.id}
          initial={session.plan}
          updatedBy={session.planUpdatedBy}
        />
      </div>
    </article>
  );
}

function AttendanceLists({
  going,
  maybe,
  notGoing,
  noReply,
}: {
  going: Attendee[];
  maybe: Attendee[];
  notGoing: Attendee[];
  noReply: Attendee[];
}) {
  return (
    <div>
      <p className="eyebrow mb-2.5">
        Going · {going.length}
      </p>

      {going.length === 0 ? (
        <p className="border border-line px-3.5 py-4 text-center text-[13px] text-muted">
          Nobody has said yes yet.
        </p>
      ) : (
        <ul className="divide-line border border-line">
          {going.map((person) => (
            <li key={person.profileId} className="flex items-center gap-3 px-3.5 py-2">
              <span className="w-6 shrink-0 text-right text-[12px] font-bold tabular-nums text-muted">
                {person.jersey ?? '–'}
              </span>
              <span className="truncate text-[14px] font-medium">{person.name}</span>
              <ExcoStar role={person.excoRole} />
              {person.staff && (
                <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-muted">
                  Staff
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-px border border-line bg-line text-center">
        <Count label="Maybe" people={maybe} />
        <Count label="Cannot" people={notGoing} />
        <Count label="No reply" people={noReply} />
      </dl>
    </div>
  );
}

function Count({ label, people }: { label: string; people: Attendee[] }) {
  return (
    <div className="bg-paper px-2 py-2.5" title={people.map((p) => p.name).join(', ')}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-1 text-[16px] font-bold tabular-nums">{people.length}</dd>
    </div>
  );
}

function PlanEditor({
  eventId,
  initial,
  updatedBy,
}: {
  eventId: string;
  initial: string;
  updatedBy: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // A fresh server render means somebody else may have changed it.
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const dirty = value !== initial;

  return (
    <div>
      <p className="eyebrow mb-2.5">Session plan</p>

      {error && (
        <div className="mb-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <textarea
        className="field min-h-[132px] resize-y font-mono text-[13px] leading-relaxed"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder={'Warm-up, then what you are actually working on.\n\nOnly you and the admin see this.'}
        aria-label="Session plan"
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={pending || !dirty}
          onClick={() => {
            setError(null);
            start(async () => {
              const result = await saveSessionPlan(eventId, value);
              if (result.ok) {
                setSaved(true);
                router.refresh();
              } else {
                setError(result.error);
              }
            });
          }}
        >
          {pending ? 'Saving…' : 'Save plan'}
        </button>

        {dirty && !pending && <span className="text-[12px] text-muted">Unsaved changes.</span>}
        {!dirty && saved && <span className="text-[12px] text-muted">Saved.</span>}
        {!dirty && !saved && updatedBy && (
          <span className="text-[12px] text-muted">Last edited by {updatedBy}.</span>
        )}
      </div>
    </div>
  );
}
