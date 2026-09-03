'use client';

import { useRouter } from 'next/navigation';
import type { Player } from '@/lib/types';
import { ActionForm, Checkbox, Field, Select, TextArea } from '@/components/form';
import { createPlayer, updatePlayer } from '@/lib/actions/players';

const POSITIONS = [
  '',
  'Outside Hitter',
  'Opposite',
  'Middle Blocker',
  'Setter',
  'Libero',
  'Defensive Specialist',
];

export function PlayerForm({
  player,
  accounts,
  onDone,
  onCancel,
}: {
  player?: Player;
  /** Unlinked logins an admin can attach this roster row to. */
  accounts?: { id: string; label: string }[];
  onDone?: (id?: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const editing = !!player;

  return (
    <ActionForm
      action={editing ? updatePlayer : createPlayer}
      submitLabel={editing ? 'Save changes' : 'Add player'}
      onDone={(id) => {
        onDone?.(id);
        if (!editing && id) router.push(`/players/${id}`);
      }}
      resetOnSuccess={!editing}
      secondary={
        onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )
      }
    >
      {editing && <input type="hidden" name="id" value={player.id} />}

      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field name="full_name" label="Full name" required defaultValue={player?.full_name} />
        <Field
          name="jersey_number"
          label="Jersey #"
          type="number"
          min={0}
          max={999}
          inputMode="numeric"
          defaultValue={player?.jersey_number ?? ''}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          name="position"
          label="Position"
          defaultValue={player?.position ?? ''}
          options={POSITIONS.map((p) => ({ value: p, label: p || 'Not set' }))}
        />
        <Field
          name="height_cm"
          label="Height (cm)"
          type="number"
          step="0.1"
          min={0}
          inputMode="decimal"
          defaultValue={player?.height_cm ?? ''}
        />
        <Field
          name="weight_kg"
          label="Weight (kg)"
          type="number"
          step="0.1"
          min={0}
          inputMode="decimal"
          defaultValue={player?.weight_kg ?? ''}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          name="date_of_birth"
          label="Date of birth"
          type="date"
          defaultValue={player?.date_of_birth ?? ''}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          defaultValue={player?.email ?? ''}
          placeholder="player@example.com"
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={player?.phone ?? ''}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="guardian_name"
          label="Guardian name"
          defaultValue={player?.guardian_name ?? ''}
          hint="For under-18 players"
        />
        <Field
          name="guardian_phone"
          label="Guardian phone"
          type="tel"
          defaultValue={player?.guardian_phone ?? ''}
        />
      </div>

      <TextArea
        name="notes"
        label="Coach notes"
        rows={4}
        defaultValue={player?.notes ?? ''}
        placeholder="Technical focus, injuries, availability, anything the coaching staff should know."
      />

      {accounts && accounts.length > 0 && (
        <Select
          name="profile_id"
          label="Linked login"
          defaultValue={player?.profile_id ?? ''}
          hint="Linking lets this player sign in and see their own profile."
          options={[
            { value: '', label: 'No login linked' },
            ...(player?.profile_id &&
            !accounts.some((a) => a.id === player.profile_id)
              ? [{ value: player.profile_id, label: 'Currently linked account' }]
              : []),
            ...accounts.map((a) => ({ value: a.id, label: a.label })),
          ]}
        />
      )}

      <Checkbox
        name="is_active"
        label="Active on the roster"
        hint="Untick to archive without deleting their history."
        defaultChecked={player?.is_active ?? true}
      />
    </ActionForm>
  );
}
