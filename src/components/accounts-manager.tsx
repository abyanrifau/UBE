'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppRole, Profile } from '@/lib/types';
import { ALL_ROLES, ROLE_BLURB, ROLE_LABEL } from '@/lib/roles';
import { formatDate } from '@/lib/format';
import { ActionForm, ConfirmButton, Field, Select, Checkbox } from '@/components/form';
import { EmptyState, Notice, Tag } from '@/components/ui';
import {
  createAccount,
  deleteAccount,
  resetAccountPassword,
  updateAccount,
} from '@/lib/actions/accounts';

export type AccountRow = Profile & { playerName: string | null };

const ROLE_OPTIONS = ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export function AccountsManager({
  accounts,
  unlinkedPlayers,
  currentUserId,
}: {
  accounts: AccountRow[];
  unlinkedPlayers: { id: string; label: string }[];
  currentUserId: string;
}) {
  const [creating, setCreating] = useState(false);
  const [handover, setHandover] = useState<{ email: string; password: string } | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');

  const filtered = accounts
    .filter((a) => (roleFilter === 'all' ? true : a.role === roleFilter))
    .filter((a) => {
      const q = query.trim().toLowerCase();
      return (
        q === '' ||
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    });

  return (
    <div>
      {handover && (
        <div className="mb-6">
          <CredentialHandover
            email={handover.email}
            password={handover.password}
            onDismiss={() => setHandover(null)}
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="field sm:max-w-xs"
          aria-label="Search accounts"
        />
        <select
          className="field w-auto py-2 text-[13px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | AppRole)}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary btn-sm sm:ml-auto"
          onClick={() => setCreating((v) => !v)}
          aria-expanded={creating}
        >
          {creating ? 'Cancel' : 'Create account'}
        </button>
      </div>

      {creating && (
        <div className="card mb-8 animate-fade-up p-5 sm:p-6">
          <h2 className="mb-1 text-[15px] font-bold">Create an account</h2>
          <p className="mb-5 text-[13px] text-muted">
            A temporary password is generated for you to hand over. The person is forced to choose
            their own the first time they sign in.
          </p>
          <CreateAccountForm
            unlinkedPlayers={unlinkedPlayers}
            onCreated={(result) => {
              setHandover(result);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No accounts match" description="Try a different search or role." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isSelf={account.id === currentUserId}
              onReset={setHandover}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CreateAccountForm({
  unlinkedPlayers,
  onCreated,
  onCancel,
}: {
  unlinkedPlayers: { id: string; label: string }[];
  onCreated: (r: { email: string; password: string }) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('player');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const result = await createAccount(fd);
      if (result.ok) {
        onCreated({ email: result.email, password: result.password });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="full_name" label="Full name" required placeholder="Alex Tan" />
        <Field
          name="email"
          label="Email"
          type="email"
          required
          placeholder="alex@example.com"
          hint="This is what they sign in with."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          name="role"
          label="Role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          options={ROLE_OPTIONS}
          hint={ROLE_BLURB[role]}
        />
        {role === 'player' && unlinkedPlayers.length > 0 && (
          <Select
            name="link_player_id"
            label="Link to roster entry"
            options={[
              { value: '', label: 'Do not link yet' },
              ...unlinkedPlayers,
            ].map((p) => ('value' in p ? p : { value: p.id, label: p.label }))}
            hint="Links this login to an existing player record."
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function AccountCard({
  account,
  isSelf,
  onReset,
}: {
  account: AccountRow;
  isSelf: boolean;
  onReset: (r: { email: string; password: string }) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className={`card p-5 ${account.is_active ? '' : 'opacity-60'}`}>
      {editing ? (
        <ActionForm
          action={updateAccount}
          submitLabel="Save changes"
          onDone={() => setEditing(false)}
          secondary={
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          }
        >
          <input type="hidden" name="id" value={account.id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="full_name" label="Full name" required defaultValue={account.full_name} />
            <Select
              name="role"
              label="Role"
              required
              defaultValue={account.role}
              options={ROLE_OPTIONS}
            />
          </div>
          <Checkbox
            name="is_active"
            label="Active"
            hint="Deactivating signs them out and blocks sign-in without deleting their history."
            defaultChecked={account.is_active}
          />
          {isSelf && (
            <Notice>You cannot remove your own admin access or deactivate yourself.</Notice>
          )}
        </ActionForm>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Tag solid>{ROLE_LABEL[account.role]}</Tag>
                {!account.is_active && <Tag>Deactivated</Tag>}
                {account.must_set_password && <Tag>Password not set</Tag>}
                {isSelf && <Tag>You</Tag>}
              </div>
              <p className="mt-2 text-[16px] font-bold">{account.full_name || '(no name)'}</p>
              <p className="mt-0.5 text-[13px] text-muted">{account.email}</p>
              <p className="mt-1 text-[12px] text-muted">
                Added {formatDate(account.created_at)}
                {account.playerName ? ` · Roster: ${account.playerName}` : ''}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const result = await resetAccountPassword(account.id);
                  if (result.ok) {
                    onReset({ email: account.email, password: result.password });
                    router.refresh();
                  } else {
                    setError(result.error);
                  }
                });
              }}
            >
              {pending ? 'Working…' : 'Reset password'}
            </button>
            {!isSelf && (
              <ConfirmButton
                label="Delete account"
                confirmLabel="Really delete"
                className="btn-ghost btn-sm"
                onConfirm={() => deleteAccount(account.id)}
              />
            )}
          </div>
        </>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */

function CredentialHandover({
  email,
  password,
  onDismiss,
}: {
  email: string;
  password: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border-2 border-ink p-5 animate-fade-up">
      <p className="eyebrow">Hand these over now</p>
      <p className="mt-2 text-[14px] leading-relaxed">
        This temporary password is shown <strong>once</strong> and is not stored anywhere you can
        read it again. Send it to the member. They will be asked to choose their own password the
        first time they sign in.
      </p>

      <dl className="mt-4 divide-line border-y border-line">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-[13px] text-muted">Email</dt>
          <dd className="break-all text-right font-mono text-[14px]">{email}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-[13px] text-muted">Temporary password</dt>
          <dd className="break-all text-right font-mono text-[15px] font-bold">{password}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `Email: ${email}\nTemporary password: ${password}`,
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy credentials'}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onDismiss}>
          Done, hide this
        </button>
      </div>
    </div>
  );
}
