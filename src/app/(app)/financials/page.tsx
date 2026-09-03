import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, requireSession } from '@/lib/supabase/server';
import { canManageFinance, canViewFinance } from '@/lib/roles';
import type { CategorySummary, FinanceEntry, MonthlySummary, YearlySummary } from '@/lib/types';
import { MONTH_NAMES, money, signedMoney } from '@/lib/format';
import { PageHeader, RestrictedBanner, SectionTitle, Stat } from '@/components/ui';
import { IncomeExpenseChart, RunningBalanceChart, toSeries } from '@/components/finance-charts';
import { FinanceLedger } from '@/components/finance-entries';

export const metadata: Metadata = { title: 'Financials' };

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const { profile } = await requireSession();

  // A coach or player never gets here — and if they forced the URL, every
  // query below would come back empty because the RLS policy excludes them.
  if (!canViewFinance(profile.role)) redirect('/dashboard');

  const supabase = createClient();
  const currentYear = new Date().getUTCFullYear();
  const requested = Number(searchParams.year);
  const year = Number.isInteger(requested) && requested > 2000 && requested < 2200
    ? requested
    : currentYear;

  const [yearsRes, yearlyRes, monthlyRes, categoryRes, entriesRes] = await Promise.all([
    supabase.from('finance_yearly_summary').select('year').order('year', { ascending: false }),
    supabase.from('finance_yearly_summary').select('*').eq('year', year).maybeSingle(),
    supabase.from('finance_monthly_summary').select('*').eq('year', year).order('month_number'),
    supabase.from('finance_category_summary').select('*').eq('year', year),
    supabase
      .from('finance_entries')
      .select('*')
      .gte('entry_date', `${year}-01-01`)
      .lte('entry_date', `${year}-12-31`)
      .order('entry_date', { ascending: false }),
  ]);

  const yearly = (yearlyRes.data ?? null) as YearlySummary | null;
  const monthly = (monthlyRes.data ?? []) as MonthlySummary[];
  const categories = (categoryRes.data ?? []) as CategorySummary[];
  const entries = (entriesRes.data ?? []) as FinanceEntry[];

  const availableYears = Array.from(
    new Set([
      currentYear,
      year,
      ...((yearsRes.data ?? []) as { year: number }[]).map((r) => r.year),
    ]),
  ).sort((a, b) => b - a);

  const series = toSeries(monthly);
  const canEdit = canManageFinance(profile.role);

  const income = Number(yearly?.income ?? 0);
  const expenses = Number(yearly?.expenses ?? 0);
  const net = Number(yearly?.net ?? 0);

  return (
    <>
      <PageHeader
        title="Financials"
        description="Monthly entries roll up into the yearly statement automatically."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {availableYears.slice(0, 5).map((y) => (
              <Link
                key={y}
                href={`/financials?year=${y}`}
                aria-current={y === year ? 'page' : undefined}
                className={[
                  'border px-3 py-1.5 text-[13px] font-semibold tabular-nums transition-colors',
                  y === year
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-muted hover:text-ink',
                ].join(' ')}
              >
                {y}
              </Link>
            ))}
          </div>
        }
      />

      <RestrictedBanner audience="the Treasurer, ExCo and Admins" />

      {!canEdit && (
        <p className="mb-6 text-[13px] text-muted">
          You have read access. Only the Treasurer and Admins can add or change entries.
        </p>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Yearly statement                                            */}
      {/* ---------------------------------------------------------- */}
      <section className="mb-10">
        <SectionTitle>Yearly statement · {year}</SectionTitle>
        <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          <Stat label="Total income" value={money(income)} hint={`${yearly?.entry_count ?? 0} entries`} />
          <Stat label="Total expenses" value={money(expenses)} />
          <Stat
            label="Net balance"
            value={signedMoney(net)}
            hint={net >= 0 ? 'in surplus' : 'in deficit'}
            emphasis
          />
          <Stat
            label="Avg. monthly net"
            value={signedMoney(Math.round((net / 12) * 100) / 100)}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Charts                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="mb-10 grid gap-5 xl:grid-cols-2">
        <IncomeExpenseChart data={series} />
        <RunningBalanceChart data={series} />
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Monthly statements                                          */}
      {/* ---------------------------------------------------------- */}
      <section className="mb-10">
        <SectionTitle>Monthly statements</SectionTitle>
        <div className="border border-line">
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-3.5 py-3 font-semibold">Month</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Income</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Expenses</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Net</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Running</th>
                </tr>
              </thead>
              <tbody className="divide-line">
                {series.map((row, i) => {
                  const running = series
                    .slice(0, i + 1)
                    .reduce((acc, r) => acc + r.net, 0);
                  const empty = row.income === 0 && row.expenses === 0;
                  return (
                    <tr key={row.month} className={empty ? 'text-muted' : ''}>
                      <td className="px-3.5 py-2.5 font-medium">{MONTH_NAMES[i]}</td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {row.income ? money(row.income) : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {row.expenses ? money(row.expenses) : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">
                        {empty ? '—' : signedMoney(row.net)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {signedMoney(running)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-subtle font-bold">
                  <td className="px-3.5 py-3">Year total</td>
                  <td className="px-3.5 py-3 text-right tabular-nums">{money(income)}</td>
                  <td className="px-3.5 py-3 text-right tabular-nums">{money(expenses)}</td>
                  <td className="px-3.5 py-3 text-right tabular-nums" colSpan={2}>
                    {signedMoney(net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Categories                                                  */}
      {/* ---------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="mb-10">
          <SectionTitle>By category</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <CategoryBreakdown
              title="Income"
              rows={categories.filter((c) => c.kind === 'income')}
            />
            <CategoryBreakdown
              title="Expenses"
              rows={categories.filter((c) => c.kind === 'expense')}
            />
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Ledger                                                      */}
      {/* ---------------------------------------------------------- */}
      <section>
        <SectionTitle>Entries · {year}</SectionTitle>
        <FinanceLedger entries={entries} canManage={canEdit} year={year} />
      </section>
    </>
  );
}

function CategoryBreakdown({ title, rows }: { title: string; rows: CategorySummary[] }) {
  const sorted = [...rows].sort((a, b) => Number(b.total) - Number(a.total));
  const max = Math.max(...sorted.map((r) => Number(r.total)), 1);

  return (
    <div className="card p-5">
      <p className="eyebrow mb-4">{title}</p>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">Nothing logged.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((row) => (
            <li key={`${row.kind}-${row.category}`}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-[13px]">{row.category}</span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                  {money(row.total)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-subtle">
                <div
                  className="h-full bg-ink"
                  style={{ width: `${(Number(row.total) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
