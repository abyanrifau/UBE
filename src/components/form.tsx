'use client';

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_ROLES, ROLE_LABEL } from '@/lib/roles';
import type { AppRole, Squad } from '@/lib/types';
import { Notice } from '@/components/ui';

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

type BaseProps = { label: string; hint?: string; required?: boolean; className?: string };

export function Field({
  label,
  hint,
  required,
  className = '',
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <input id={id} className="field" required={required} {...props} />
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  required,
  className = '',
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <textarea id={id} className="field resize-y" rows={4} required={required} {...props} />
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  hint,
  required,
  className = '',
  options,
  ...props
}: BaseProps & { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <select id={id} className="field appearance-none pr-8" required={required} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-[3px] h-4 w-4 shrink-0 accent-[rgb(var(--ink))]"
        {...props}
      />
      <label htmlFor={id} className="text-[14px] leading-snug">
        {label}
        {hint && <span className="mt-0.5 block text-[12px] text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/** Who can see this? Admin is implicit and always included. */
export function RoleAudience({
  name = 'visible_to_roles',
  defaultValue,
  label = 'Who can see this',
  hint,
}: {
  name?: string;
  defaultValue?: AppRole[];
  label?: string;
  hint?: string;
}) {
  const selectable = ALL_ROLES.filter((r) => r !== 'admin');
  const initial = new Set(defaultValue ?? ALL_ROLES);

  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border border-line p-3.5 sm:grid-cols-4">
        {selectable.map((role) => (
          <Checkbox
            key={role}
            name={name}
            value={role}
            defaultChecked={initial.has(role)}
            label={ROLE_LABEL[role]}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        {hint ?? 'Admins always see everything. Untick a role to hide this from them.'}
      </p>
    </fieldset>
  );
}

/**
 * Which squad a row belongs to. The empty option means different things in
 * different places, so the caller names it: "Whole academy" for an event or
 * announcement, "Not assigned" for a player.
 */
export function SquadField({
  name = 'squad',
  defaultValue,
  label = 'Team',
  emptyLabel = 'Whole academy',
  hint,
  className,
}: {
  name?: string;
  defaultValue?: Squad | null;
  label?: string;
  emptyLabel?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Select
      name={name}
      label={label}
      className={className}
      defaultValue={defaultValue ?? ''}
      hint={hint}
      options={[
        { value: '', label: emptyLabel },
        { value: 'boys', label: 'Boys squad' },
        { value: 'girls', label: 'Girls squad' },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Submission                                                          */
/* ------------------------------------------------------------------ */

export type ActionState = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Wraps a server action: handles pending state, surfaces the returned error
 * inline, and refreshes the route on success.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  onDone,
  resetOnSuccess = false,
  successMessage,
  className = 'space-y-5',
  secondary,
}: {
  action: (fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  onDone?: (id?: string) => void;
  resetOnSuccess?: boolean;
  successMessage?: string;
  className?: string;
  secondary?: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 3500);
    return () => clearTimeout(t);
  }, [success]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);
    start(async () => {
      const result = await action(fd);
      if (result.ok) {
        if (resetOnSuccess) formRef.current?.reset();
        if (successMessage) setSuccess(true);
        router.refresh();
        onDone?.(result.id);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      {success && successMessage && <Notice tone="success">{successMessage}</Notice>}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (pendingLabel ?? 'Saving…') : submitLabel}
        </button>
        {secondary}
      </div>
    </form>
  );
}

/** Destructive action with a two-step confirm, no browser dialog. */
export function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Confirm delete',
  className = 'btn-secondary btn-sm',
}: {
  onConfirm: () => Promise<ActionState>;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          start(async () => {
            const result = await onConfirm();
            if (result.ok) {
              setArmed(false);
              router.refresh();
            } else {
              setError(result.error);
              setArmed(false);
            }
          });
        }}
      >
        {pending ? 'Working…' : armed ? confirmLabel : label}
      </button>
      {error && <span className="text-[12px] font-medium">{error}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Disclosure: used for "new event", "add entry" and edit panels      */
/* ------------------------------------------------------------------ */

export function Disclosure({
  trigger,
  title,
  children,
  defaultOpen = false,
  triggerClassName = 'btn-primary btn-sm',
}: {
  trigger: ReactNode;
  title?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  defaultOpen?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Cancel' : trigger}
      </button>
      {open && (
        <div className="card mt-4 animate-fade-up p-5 sm:p-6">
          {title && <h3 className="mb-5 text-[15px] font-bold">{title}</h3>}
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </>
  );
}
