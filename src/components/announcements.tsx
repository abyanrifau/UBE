'use client';

import { useState } from 'react';
import type { Announcement, AppRole, Squad } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/roles';
import { formatDateTime } from '@/lib/format';
import {
  ActionForm,
  ConfirmButton,
  Disclosure,
  Field,
  RoleAudience,
  SquadField,
  TextArea,
  Checkbox,
} from '@/components/form';
import { EmptyState, Tag } from '@/components/ui';
import { SquadTag } from '@/components/squad';
import { PinIcon } from '@/components/nav-icons';
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePinned,
  updateAnnouncement,
} from '@/lib/actions/announcements';

const ALL = 5; // number of roles, used to spot an "everyone" audience

export function AnnouncementComposer({ defaultSquad = null }: { defaultSquad?: Squad | null }) {
  return (
    <Disclosure trigger="New announcement" title="Post an announcement">
      {(close) => (
        <ActionForm
          action={createAnnouncement}
          submitLabel="Post"
          pendingLabel="Posting…"
          resetOnSuccess
          onDone={close}
          secondary={
            <button type="button" className="btn-ghost btn-sm" onClick={close}>
              Cancel
            </button>
          }
        >
          <Field name="title" label="Title" required placeholder="Training moved to Saturday" />
          <TextArea
            name="body"
            label="Message"
            required
            rows={5}
            placeholder="Write the details here. Line breaks are kept."
          />
          <SquadField
            defaultValue={defaultSquad}
            hint="Whole academy posts show on every dashboard. A squad post shows only on theirs."
          />
          <RoleAudience />
          <Checkbox name="pinned" label="Pin to the top of the dashboard" />
        </ActionForm>
      )}
    </Disclosure>
  );
}

export function AnnouncementList({
  announcements,
  canEdit,
}: {
  announcements: Announcement[];
  canEdit: boolean;
}) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description={
          canEdit
            ? 'Post the first one. It will show up here for everyone you send it to.'
            : 'When ExCo or your coach posts something, it lands here.'
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {announcements.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} canEdit={canEdit} />
      ))}
    </ul>
  );
}

function AnnouncementCard({
  announcement: a,
  canEdit,
}: {
  announcement: Announcement;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const restricted = a.visible_to_roles.length < ALL;

  return (
    <li className={`card p-5 ${a.pinned ? 'border-ink' : ''}`}>
      {editing ? (
        <ActionForm
          action={updateAnnouncement}
          submitLabel="Save changes"
          onDone={() => setEditing(false)}
          secondary={
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          }
        >
          <input type="hidden" name="id" value={a.id} />
          <Field name="title" label="Title" required defaultValue={a.title} />
          <TextArea name="body" label="Message" required rows={5} defaultValue={a.body} />
          <SquadField defaultValue={a.squad} />
          <RoleAudience defaultValue={a.visible_to_roles} />
          <Checkbox name="pinned" label="Pinned" defaultChecked={a.pinned} />
        </ActionForm>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned && (
                  <span className="tag-solid inline-flex items-center gap-1">
                    <PinIcon className="h-3 w-3" />
                    Pinned
                  </span>
                )}
                <SquadTag squad={a.squad} />
                {restricted && (
                  <Tag>
                    {a.visible_to_roles
                      .filter((r) => r !== 'admin')
                      .map((r) => ROLE_LABEL[r as AppRole])
                      .join(' · ') || 'Admin only'}
                  </Tag>
                )}
              </div>
              <h3 className="mt-2 text-[17px] font-bold leading-snug">{a.title}</h3>
            </div>
          </div>

          <p className="prose-body mt-3">{a.body}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
            <p className="text-[12px] text-muted">
              {a.author_name || 'Someone'} · {formatDateTime(a.created_at)}
            </p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <PinToggle id={a.id} pinned={a.pinned} />
                <ConfirmButton
                  onConfirm={() => deleteAnnouncement(a.id)}
                  className="btn-ghost btn-sm"
                />
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );
}

function PinToggle({ id, pinned }: { id: string; pinned: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await togglePinned(id, !pinned);
        setBusy(false);
      }}
    >
      {pinned ? 'Unpin' : 'Pin'}
    </button>
  );
}
