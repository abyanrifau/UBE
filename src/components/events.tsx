'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AcademyEvent, AppRole, RsvpStatus } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/roles';
import { formatDate, formatTime, relativeDay, toLocalInput } from '@/lib/format';
import {
  ActionForm,
  Checkbox,
  Field,
  RoleAudience,
  Select,
  TextArea,
} from '@/components/form';
import { Tag } from '@/components/ui';
import { createEvent, setRsvp, updateEvent } from '@/lib/actions/events';
import { EVENT_TYPE_LABEL, EVENT_TYPE_OPTIONS } from '@/lib/events';


/* ------------------------------------------------------------------ */
/* Event card                                                          */
/* ------------------------------------------------------------------ */

export function EventCard({
  event,
  rsvp,
  showRsvp,
  href,
}: {
  event: AcademyEvent;
  rsvp?: RsvpStatus | null;
  showRsvp?: boolean;
  href?: string;
}) {
  const relative = relativeDay(event.starts_at);
  const restricted = event.visible_to_roles.length < 5;

  const body = (
    <>
      <div className="flex items-start gap-4">
        <div className="w-[52px] shrink-0 border-r border-line pr-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {formatDate(event.starts_at).split(' ')[1]}
          </p>
          <p className="text-[22px] font-bold leading-none tabular-nums">
            {formatDate(event.starts_at).split(' ')[0]}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag solid>{EVENT_TYPE_LABEL[event.type]}</Tag>
            {relative && <Tag>{relative}</Tag>}
            {restricted && (
              <Tag>
                {event.visible_to_roles
                  .filter((r) => r !== 'admin')
                  .map((r) => ROLE_LABEL[r as AppRole])
                  .join(' · ') || 'Admin only'}
              </Tag>
            )}
          </div>
          <h3 className="mt-2 truncate text-[16px] font-bold leading-snug">{event.title}</h3>
          <p className="mt-1 text-[13px] text-muted">
            {formatTime(event.starts_at)}
            {event.ends_at ? `–${formatTime(event.ends_at)}` : ''}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </div>

      {showRsvp && event.rsvp_enabled && (
        <div className="mt-4 border-t border-line pt-3.5">
          <RsvpControl eventId={event.id} value={rsvp ?? null} />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <div className="card p-4 transition-colors hover:bg-subtle sm:p-5">
        <Link href={href} className="block">
          {body}
        </Link>
      </div>
    );
  }
  return <div className="card p-4 sm:p-5">{body}</div>;
}

/* ------------------------------------------------------------------ */
/* RSVP                                                                */
/* ------------------------------------------------------------------ */

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_going', label: "Can't" },
];

export function RsvpControl({
  eventId,
  value,
  size = 'sm',
}: {
  eventId: string;
  value: RsvpStatus | null;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<RsvpStatus | null>(value);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
        Are you in?
      </span>
      <div className="inline-flex border border-line" role="group" aria-label="RSVP">
        {RSVP_OPTIONS.map((option) => {
          const active = optimistic === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={pending}
              aria-pressed={active}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOptimistic(option.value);
                start(async () => {
                  const result = await setRsvp(eventId, option.value);
                  if (!result.ok) setOptimistic(value);
                  router.refresh();
                });
              }}
              className={[
                size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]',
                'font-semibold transition-colors',
                active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create / edit form                                                  */
/* ------------------------------------------------------------------ */

export function EventForm({
  event,
  onDone,
  onCancel,
}: {
  event?: AcademyEvent;
  onDone?: (id?: string) => void;
  onCancel?: () => void;
}) {
  const editing = !!event;

  return (
    <ActionForm
      action={editing ? updateEvent : createEvent}
      submitLabel={editing ? 'Save changes' : 'Add to calendar'}
      pendingLabel="Saving…"
      onDone={onDone}
      resetOnSuccess={!editing}
      secondary={
        onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )
      }
    >
      {editing && <input type="hidden" name="id" value={event.id} />}

      <Field
        name="title"
        label="Title"
        required
        defaultValue={event?.title}
        placeholder="Tuesday practice"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          name="type"
          label="Type"
          required
          defaultValue={event?.type ?? 'practice'}
          options={EVENT_TYPE_OPTIONS}
        />
        <Field
          name="location"
          label="Location"
          defaultValue={event?.location ?? ''}
          placeholder="Main hall, Court 2"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="starts_at"
          label="Starts"
          type="datetime-local"
          required
          defaultValue={toLocalInput(event?.starts_at)}
        />
        <Field
          name="ends_at"
          label="Ends"
          type="datetime-local"
          defaultValue={toLocalInput(event?.ends_at)}
          hint="Optional"
        />
      </div>

      <TextArea
        name="description"
        label="Details"
        rows={3}
        defaultValue={event?.description ?? ''}
        placeholder="Bring both kits. Warm-up starts 15 minutes early."
      />

      <RoleAudience
        defaultValue={event?.visible_to_roles}
        label="Who sees this event"
        hint="Untick Player to keep an ExCo meeting off the players' calendar."
      />

      <div className="space-y-3 border border-line p-3.5">
        <Checkbox
          name="rsvp_enabled"
          label="Let people RSVP"
          defaultChecked={event?.rsvp_enabled ?? true}
        />
        <Checkbox
          name="is_public"
          label="Show on the public homepage"
          hint="Only the title, date and location are exposed. Never the description."
          defaultChecked={event?.is_public ?? false}
        />
      </div>
    </ActionForm>
  );
}
