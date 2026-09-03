'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getSession } from '@/lib/supabase/server';
import type { FinanceKind } from '@/lib/types';
import { done, fail, friendlyError, str, type ActionResult } from './common';

function readEntry(formData: FormData) {
  const kind = str(formData, 'kind') as FinanceKind;
  if (kind !== 'income' && kind !== 'expense') return { ok: false as const, error: 'Pick income or expense.' as const };

  const entryDate = str(formData, 'entry_date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return { ok: false as const, error: 'Pick a valid date.' as const };

  const rawAmount = str(formData, 'amount').replace(/[,\s]/g, '');
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false as const, error: 'Enter a positive amount.' as const };
  if (amount > 99_999_999) return { ok: false as const, error: 'That amount is too large.' as const };

  const category = str(formData, 'category') || 'General';
  const description = str(formData, 'description');

  return {
    ok: true as const,
    values: {
      entry_date: entryDate,
      kind,
      category,
      description,
      amount: Math.round(amount * 100) / 100,
    },
  };
}

export async function createFinanceEntry(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail('You are signed out.');

  const parsed = readEntry(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase
    .from('finance_entries')
    .insert({ ...parsed.values, created_by: session.userId });

  if (error) return fail(friendlyError(error));
  revalidatePath('/financials');
  return done();
}

export async function updateFinanceEntry(formData: FormData): Promise<ActionResult> {
  const id = str(formData, 'id');
  if (!id) return fail('Missing entry.');

  const parsed = readEntry(formData);
  if (!parsed.ok) return fail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase.from('finance_entries').update(parsed.values).eq('id', id);

  if (error) return fail(friendlyError(error));
  revalidatePath('/financials');
  return done(id);
}

export async function deleteFinanceEntry(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) return fail(friendlyError(error));
  revalidatePath('/financials');
  return done();
}
