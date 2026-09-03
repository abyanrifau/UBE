'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AcademyEvent } from '@/lib/types';
import { EventForm } from '@/components/events';
import { ConfirmButton } from '@/components/form';
import { deleteEvent } from '@/lib/actions/events';

export function EventAdmin({ event }: { event: AcademyEvent }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="card animate-fade-up p-5 sm:p-6">
        <h2 className="mb-5 text-[15px] font-bold">Edit event</h2>
        <EventForm
          event={event}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
        Edit event
      </button>
      <ConfirmButton
        label="Delete event"
        confirmLabel="Really delete"
        className="btn-ghost btn-sm"
        onConfirm={async () => {
          const result = await deleteEvent(event.id);
          if (result.ok) router.replace('/schedule');
          return result;
        }}
      />
    </div>
  );
}
