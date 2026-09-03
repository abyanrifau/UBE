'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  bool,
  done,
  fail,
  friendlyError,
  num,
  optionalStr,
  str,
  type ActionResult,
} from './common';

function readPlayer(formData: FormData) {
  const fullName = str(formData, 'full_name');
  if (!fullName) return { ok: false as const, error: "Enter the player's name." as const };

  const jersey = num(formData, 'jersey_number');
  if (jersey !== null && (jersey < 0 || jersey > 999)) {
    return { ok: false as const, error: 'Jersey number must be between 0 and 999.' as const };
  }

  return {
    ok: true as const,
    values: {
      full_name: fullName,
      jersey_number: jersey === null ? null : Math.round(jersey),
      position: optionalStr(formData, 'position'),
      height_cm: num(formData, 'height_cm'),
      weight_kg: num(formData, 'weight_kg'),
      date_of_birth: optionalStr(formData, 'date_of_birth'),
      email: optionalStr(formData, 'email'),
      phone: optionalStr(formData, 'phone'),
      guardian_name: optionalStr(formData, 'guardian_name'),
      guardian_phone: optionalStr(formData, 'guardian_phone'),
      notes: optionalStr(formData, 'notes'),
      is_active: bool(formData, 'is_active'),
      profile_id: optionalStr(formData, 'profile_id'),
    },
  };
}

export async function createPlayer(formData: FormData): Promise<ActionResult> {
  const parsed = readPlayer(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { data, error } = await supabase
    .from('players')
    .insert(parsed.values)
    .select('id')
    .single();

  if (error) return fail(friendlyError(error));
  revalidatePath('/players');
  return done(data.id as string);
}

export async function updatePlayer(formData: FormData): Promise<ActionResult> {
  const id = str(formData, 'id');
  if (!id) return fail('Missing player.');

  const parsed = readPlayer(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase.from('players').update(parsed.values).eq('id', id);

  if (error) return fail(friendlyError(error));
  revalidatePath('/players');
  revalidatePath(`/players/${id}`);
  return done(id);
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return fail(friendlyError(error));
  revalidatePath('/players');
  return done();
}
