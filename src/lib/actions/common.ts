import type { AppRole } from '@/lib/types';
import { ALL_ROLES } from '@/lib/roles';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export const fail = (error: string): ActionResult => ({ ok: false, error });
export const done = (id?: string): ActionResult => ({ ok: true, id });

/** Turns a Postgres error into something a 16-year-old can act on. */
export function friendlyError(error: { message: string; code?: string } | null): string {
  if (!error) return 'Something went wrong.';
  const code = error.code ?? '';
  if (code === '42501' || /row-level security/i.test(error.message)) {
    return 'Your role does not allow that. If you think it should, ask an admin.';
  }
  if (code === '23505') return 'That already exists.';
  if (code === '23503') return 'That referenced a record which no longer exists.';
  if (/not allowed to change privileged/i.test(error.message)) {
    return 'Only an admin can change roles or account status.';
  }
  return error.message;
}

export const str = (fd: FormData, key: string) => (fd.get(key) ?? '').toString().trim();

export function optionalStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === '' ? null : v;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const bool = (fd: FormData, key: string) => fd.get(key) === 'on' || fd.get(key) === 'true';

/** Reads a set of role checkboxes, always keeping admin in the audience. */
export function roles(fd: FormData, key = 'visible_to_roles'): AppRole[] {
  const picked = fd
    .getAll(key)
    .map((v) => v.toString())
    .filter((v): v is AppRole => (ALL_ROLES as string[]).includes(v));
  const set = new Set<AppRole>(picked);
  set.add('admin'); // admins can always see everything
  return Array.from(set);
}
