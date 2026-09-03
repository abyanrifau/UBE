'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/lib/types';
import { PlayerForm } from '@/components/player-form';
import { ConfirmButton } from '@/components/form';
import { deletePlayer } from '@/lib/actions/players';

export function PlayerAdmin({
  player,
  accounts,
  canDelete,
}: {
  player: Player;
  accounts: { id: string; label: string }[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="card mb-10 animate-fade-up p-5 sm:p-6">
        <h2 className="mb-5 text-[15px] font-bold">Edit player</h2>
        <PlayerForm
          player={player}
          accounts={accounts}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
        Edit player
      </button>
      {canDelete && (
        <ConfirmButton
          label="Delete"
          confirmLabel="Really delete"
          className="btn-ghost btn-sm"
          onConfirm={async () => {
            const result = await deletePlayer(player.id);
            if (result.ok) router.replace('/players');
            return result;
          }}
        />
      )}
    </div>
  );
}
