'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getSession } from '@/lib/supabase/server';
import { done, fail, friendlyError, optionalStr, str, type ActionResult } from './common';

/** Self-service edits. The DB trigger blocks role/status/email changes here. */
export async function updateMyProfile(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const fullName = str(formData, 'full_name');
  if (!fullName) return fail('Enter your name.');

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone: optionalStr(formData, 'phone') })
    .eq('id', session.userId);

  if (error) return fail(friendlyError(error));
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return done();
}
