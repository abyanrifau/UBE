'use server';

import { revalidatePath } from 'next/cache';
import { randomInt } from 'node:crypto';
import { getSession } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALL_ROLES } from '@/lib/roles';
import type { AppRole } from '@/lib/types';
import { done, fail, friendlyError, optionalStr, str, type ActionResult } from './common';

/**
 * Every function here runs with the service-role key, which bypasses RLS.
 * `assertAdmin` is therefore the only thing standing between a caller and
 * the whole database — it re-checks the role server-side on every call,
 * using the RLS-scoped client, and never trusts anything from the form.
 */
type Guard =
  | { ok: false; error: string }
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> };

async function assertAdmin(): Promise<Guard> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'You are signed out.' };
  if (session.profile.role !== 'admin') return { ok: false, error: 'Admins only.' };
  return { ok: true, session };
}

/** Readable temporary password — easy to type once, then replaced on first login. */
function generateTempPassword(): string {
  const words = [
    'court', 'serve', 'spike', 'block', 'rally', 'setter', 'libero', 'ace',
    'net', 'dig', 'pass', 'match', 'squad', 'coach', 'point', 'jump',
  ];
  const pick = () => words[randomInt(words.length)];
  const word = pick();
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}-${pick()}-${randomInt(1000, 9999)}`;
}

type CreateResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

export async function createAccount(formData: FormData): Promise<CreateResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const email = str(formData, 'email').toLowerCase();
  const fullName = str(formData, 'full_name');
  const role = str(formData, 'role') as AppRole;
  const linkPlayerId = optionalStr(formData, 'link_player_id');

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!fullName) return { ok: false, error: 'Enter the person’s full name.' };
  if (!ALL_ROLES.includes(role)) return { ok: false, error: 'Pick a role.' };

  const password = generateTempPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no inbox round-trip; the admin hands over the password
    user_metadata: { full_name: fullName, role, must_set_password: true },
  });

  if (error) {
    const already = /already been registered|already exists/i.test(error.message);
    return {
      ok: false,
      error: already ? 'An account with that email already exists.' : error.message,
    };
  }

  // The trigger creates the profile; make sure the values stuck even if the
  // row already existed from a previous partial run.
  await admin
    .from('profiles')
    .update({ email, full_name: fullName, role, is_active: true, must_set_password: true })
    .eq('id', data.user.id);

  if (linkPlayerId) {
    await admin.from('players').update({ profile_id: data.user.id }).eq('id', linkPlayerId);
  }

  revalidatePath('/accounts');
  revalidatePath('/players');
  return { ok: true, email, password };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return fail(guard.error);

  const id = str(formData, 'id');
  const fullName = str(formData, 'full_name');
  const role = str(formData, 'role') as AppRole;
  const isActive = formData.get('is_active') === 'on';

  if (!id) return fail('Missing account.');
  if (!fullName) return fail('Enter a name.');
  if (!ALL_ROLES.includes(role)) return fail('Pick a role.');

  // An admin must not be able to lock themselves out of account management.
  if (id === guard.session.userId && (role !== 'admin' || !isActive)) {
    return fail('You cannot remove your own admin access. Ask another admin to do it.');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ full_name: fullName, role, is_active: isActive })
    .eq('id', id);

  if (error) return fail(friendlyError(error));

  // Deactivating should end the session, not just hide the nav.
  if (!isActive) await admin.auth.admin.signOut(id, 'global').catch(() => undefined);

  revalidatePath('/accounts');
  return done(id);
}

type ResetResult = { ok: true; password: string } | { ok: false; error: string };

/** Issues a fresh temporary password and forces the setup screen again. */
export async function resetAccountPassword(userId: string): Promise<ResetResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const password = generateTempPassword();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };

  await admin.from('profiles').update({ must_set_password: true }).eq('id', userId);
  await admin.auth.admin.signOut(userId, 'global').catch(() => undefined);

  revalidatePath('/accounts');
  return { ok: true, password };
}

export async function deleteAccount(userId: string): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (!guard.ok) return fail(guard.error);
  if (userId === guard.session.userId) return fail('You cannot delete your own account.');

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return fail(error.message);

  revalidatePath('/accounts');
  revalidatePath('/players');
  return done();
}
