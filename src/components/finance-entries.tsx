'use client';

import { useMemo, useState } from 'react';
import type { FinanceEntry } from '@/lib/types';
import { formatDate, money, todayInput } from '@/lib/format';
import { ActionForm, ConfirmButton, Field, Select, TextArea } from '@/components/form';
import { EmptyState } from '@/components/ui';
import {
  createFinanceEntry,
  deleteFinanceEntry,
  updateFinanceEntry,
} from '@/lib/actions/finance';

const KIND_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const SUGGESTED_CATEGORIES = [
  'Membership fees',
  'Sponsorship',
  'Fundraising',
  'Court hire',
  'Equipment',
  'Kit',
  'Tournament fees',
  'Travel',
  'Coaching',
  'Admin',
  'General',
];

export function FinanceLedger({
  entries,
  canManage,
  year,
}: {
  entries: FinanceEntry[];
  canManage: boolean;
  year: number;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<'all' | number>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = useMemo(
    () =>
      entries
        .filter((e) =>
          monthFilter === 'all'
            ? true
            : Number(e.entry_date.slice(5, 7)) === monthFilter,
        )
        .filter((e) => (kindFilter === 'all' ? true : e.kind === kindFilter)),
    [entries, monthFilter, kindFilter],
  );

  const total = filtered.reduce(
    (acc, e) => acc + (e.kind === 'income' ? Number(e.amount) : -Number(e.amount)),
    0,
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          className="field w-auto py-2 text-[13px]"
          value={monthFilter}
          onChange={(e) =>
            setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          aria-label="Filter by month"
        >
          <option value="all">All months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {new Date(Date.UTC(2024, i, 1)).toLocaleString('en-US', {
                month: 'long',
                timeZone: 'UTC',
              })}
            </option>
          ))}
        </select>

        <div className="inline-flex border border-line" role="group" aria-label="Filter by type">
          {(['all', 'income', 'expense'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kindFilter === k}
              onClick={() => setKindFilter(k)}
              className={[
                'px-3 py-2 text-[12px] font-semibold capitalize transition-colors',
                kindFilter === k ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {k}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[13px] text-muted">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} ·{' '}
          <span className="font-bold tabular-nums text-ink">{money(total)}</span> net
        </span>

        {canManage && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => {
              setAdding((v) => !v);
              setEditingId(null);
            }}
            aria-expanded={adding}
          >
            {adding ? 'Cancel' : 'Add entry'}
          </button>
        )}
      </div>

      {adding && canManage && (
        <div className="card mb-6 animate-fade-up p-5 sm:p-6">
          <h3 className="mb-5 text-[15px] font-bold">New entry</h3>
          <EntryForm year={year} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No entries"
          description={
            canManage
              ? 'Add income and expenses as they happen. The monthly and yearly statements build themselves.'
              : 'The treasurer has not logged anything for this selection.'
          }
        />
      ) : (
        <div className="border border-line">
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[620px] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-3.5 py-3 font-semibold">Date</th>
                  <th className="px-3.5 py-3 font-semibold">Category</th>
                  <th className="px-3.5 py-3 font-semibold">Description</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Amount</th>
                  {canManage && <th className="w-28 px-3.5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-line">
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-3.5 py-3 tabular-nums text-muted">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 ${
                            entry.kind === 'income' ? 'bg-ink' : 'border border-ink'
                          }`}
                        />
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-muted">{entry.description || '–'}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-right font-semibold tabular-nums">
                      {entry.kind === 'income' ? '+' : '−'}
                      {money(entry.amount)}
                    </td>
                    {canManage && (
                      <td className="px-3.5 py-3 text-right">
                        <span className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              setEditingId(editingId === entry.id ? null : entry.id);
                              setAdding(false);
                            }}
                          >
                            {editingId === entry.id ? 'Close' : 'Edit'}
                          </button>
                          <ConfirmButton
                            label="Delete"
                            confirmLabel="Sure?"
                            className="btn-ghost btn-sm"
                            onConfirm={() => deleteFinanceEntry(entry.id)}
                          />
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingId && canManage && (
            <div className="animate-fade-up border-t border-line bg-subtle p-5 sm:p-6">
              <h3 className="mb-5 text-[15px] font-bold">Edit entry</h3>
              <EntryForm
                year={year}
                entry={entries.find((e) => e.id === editingId)}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryForm({
  entry,
  year,
  onDone,
  onCancel,
}: {
  entry?: FinanceEntry;
  year: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = !!entry;
  const currentYear = new Date().getUTCFullYear();
  const defaultDate =
    entry?.entry_date ?? (year === currentYear ? todayInput() : `${year}-01-01`);

  return (
    <ActionForm
      action={editing ? updateFinanceEntry : createFinanceEntry}
      submitLabel={editing ? 'Save entry' : 'Add entry'}
      resetOnSuccess={!editing}
      onDone={onDone}
      secondary={
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      }
    >
      {editing && <input type="hidden" name="id" value={entry.id} />}

      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          name="kind"
          label="Type"
          required
          defaultValue={entry?.kind ?? 'expense'}
          options={KIND_OPTIONS}
        />
        <Field
          name="entry_date"
          label="Date"
          type="date"
          required
          defaultValue={defaultDate}
        />
        <Field
          name="amount"
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required
          defaultValue={entry?.amount ?? ''}
          placeholder="0.00"
        />
      </div>

      <div>
        <Field
          name="category"
          label="Category"
          required
          list="finance-categories"
          defaultValue={entry?.category ?? 'General'}
          hint="Pick a suggestion or type your own. Categories roll up in the yearly breakdown."
        />
        <datalist id="finance-categories">
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <TextArea
        name="description"
        label="Description"
        rows={2}
        defaultValue={entry?.description ?? ''}
        placeholder="What was this for?"
      />
    </ActionForm>
  );
}
