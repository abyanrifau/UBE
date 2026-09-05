'use client';

import { useState } from 'react';
import type { Squad } from '@/lib/types';
import { toLocalInput } from '@/lib/format';
import { ActionForm, Field, SquadField, TextArea } from '@/components/form';
import { createPractice } from '@/lib/actions/coach';

/**
 * The stripped-back form for the thing a coach does most often.
 *
 * The full event form on the Schedule handles matches, audiences and public
 * fixtures. This one fixes the type to practice and asks only for what
 * changes week to week, including the plan, so scheduling one is a few
 * seconds rather than a trip through every field.
 */
export function PracticePlanner({ defaultSquad = null }: { defaultSquad?: Squad | null }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Plan a practice
      </button>
    );
  }

  return (
    <div className="card animate-fade-up p-5 sm:p-6">
      <h2 className="mb-1 text-[15px] font-bold">Plan a practice</h2>
      <p className="mb-5 text-[13px] text-muted">
        The squad sees the title, time and location. The plan stays between you and the admin.
      </p>

      <ActionForm
        action={createPractice}
        submitLabel="Schedule it"
        pendingLabel="Scheduling…"
        resetOnSuccess
        onDone={() => setOpen(false)}
        secondary={
          <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
            Cancel
          </button>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SquadField
            defaultValue={defaultSquad}
            label="Which squad"
            hint="Only that squad sees it on their schedule."
          />
          <Field
            name="title"
            label="Title"
            placeholder="Leave blank for “Boys practice”"
            hint="Optional. Named after the squad if you leave it empty."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="starts_at"
            label="Starts"
            type="datetime-local"
            required
            defaultValue={toLocalInput(nextSlot().toISOString())}
          />
          <Field
            name="ends_at"
            label="Ends"
            type="datetime-local"
            hint="Optional"
            defaultValue={toLocalInput(nextSlot(2).toISOString())}
          />
        </div>

        <Field
          name="location"
          label="Location"
          defaultValue="Hulhumalé Sports Complex, Court 1"
        />

        <TextArea
          name="description"
          label="Note for the squad"
          rows={2}
          placeholder="Anything they need to bring or know. Optional."
        />

        <TextArea
          name="plan"
          label="Session plan"
          rows={5}
          className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          placeholder={'Warm-up, then what you are actually working on.\n\nOnly you and the admin see this.'}
        />
      </ActionForm>
    </div>
  );
}

/** Tomorrow at 20:00, plus an optional duration, as a sensible default. */
function nextSlot(plusHours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20 + plusHours, 0, 0, 0);
  return d;
}
