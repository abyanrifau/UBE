'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getSession } from '@/lib/supabase/server';
import { bool, done, fail, friendlyError, roles, str, type ActionResult } from './common';

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const title = str(formData, 'title');
  const body = str(formData, 'body');
  if (!title) return fail('Give the announcement a title.');
  if (!body) return fail('Write something in the body.');

  const supabase = createClient();
  const { error } = await supabase.from('announcements').insert({
    title,
    body,
    pinned: bool(formData, 'pinned'),
    visible_to_roles: roles(formData),
    author_id: session.userId,
    author_name: session.profile.full_name || session.profile.email,
  });

  if (error) return fail(friendlyError(error));
  revalidatePath('/dashboard');
  return done();
}

export async function updateAnnouncement(formData: FormData): Promise<ActionResult> {
  const id = str(formData, 'id');
  if (!id) return fail('Missing announcement.');

  const title = str(formData, 'title');
  const body = str(formData, 'body');
  if (!title || !body) return fail('Title and body are both required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('announcements')
    .update({
      title,
      body,
      pinned: bool(formData, 'pinned'),
      visible_to_roles: roles(formData),
    })
    .eq('id', id);

  if (error) return fail(friendlyError(error));
  revalidatePath('/dashboard');
  return done();
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return fail(friendlyError(error));
  revalidatePath('/dashboard');
  return done();
}

export async function togglePinned(id: string, pinned: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('announcements').update({ pinned }).eq('id', id);
  if (error) return fail(friendlyError(error));
  revalidatePath('/dashboard');
  return done();
}
