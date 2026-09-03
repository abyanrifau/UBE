import { checkWrite, contextFor, readTable, tableRows, type DemoContext } from './store';

/**
 * A very small stand-in for the parts of the supabase-js query builder this
 * app actually uses. Enough to run every page against the in-memory store in
 * demo mode, and nothing more.
 */

type Result<T> = { data: T; error: PgError | null; count: number | null };
type PgError = { message: string; code?: string };

type Filter =
  | { kind: 'eq' | 'gte' | 'lte'; col: string; value: unknown }
  | { kind: 'in'; col: string; value: unknown[] }
  | { kind: 'notNull'; col: string };

type Row = Record<string, unknown>;

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

class DemoQuery implements PromiseLike<Result<unknown>> {
  private filters: Filter[] = [];
  private orders: { col: string; ascending: boolean; nullsFirst: boolean }[] = [];
  private limitTo: number | null = null;
  private wantSingle: 'none' | 'maybe' | 'one' = 'none';
  private headOnly = false;
  private wantCount = false;
  private returning = false;

  constructor(
    private table: string,
    private ctx: DemoContext,
    private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
    private payload?: Row | Row[],
    private conflictKeys: string[] = [],
  ) {}

  /* -------------------------------------------------- chainable ---- */

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (this.op !== 'select') this.returning = true;
    if (options?.count) this.wantCount = true;
    if (options?.head) this.headOnly = true;
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push({ kind: 'eq', col, value });
    return this;
  }
  gte(col: string, value: unknown) {
    this.filters.push({ kind: 'gte', col, value });
    return this;
  }
  lte(col: string, value: unknown) {
    this.filters.push({ kind: 'lte', col, value });
    return this;
  }
  in(col: string, value: unknown[]) {
    this.filters.push({ kind: 'in', col, value });
    return this;
  }
  /** Only the `.not(col, 'is', null)` form is used. */
  not(col: string, _operator: string, _value: unknown) {
    this.filters.push({ kind: 'notNull', col });
    return this;
  }
  order(col: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({
      col,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst ?? false,
    });
    return this;
  }
  limit(n: number) {
    this.limitTo = n;
    return this;
  }
  maybeSingle() {
    this.wantSingle = 'maybe';
    return this;
  }
  single() {
    this.wantSingle = 'one';
    return this;
  }

  /* ------------------------------------------------------ execute -- */

  private matches(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      switch (f.kind) {
        case 'eq':
          return String(v ?? '') === String(f.value ?? '');
        case 'gte':
          return compare(v, f.value) >= 0;
        case 'lte':
          return compare(v, f.value) <= 0;
        case 'in':
          return f.value.map(String).includes(String(v));
        case 'notNull':
          return v !== null && v !== undefined;
      }
    });
  }

  private sorted(rows: Row[]): Row[] {
    if (this.orders.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const { col, ascending, nullsFirst } of this.orders) {
        const av = a[col];
        const bv = b[col];
        const aNull = av === null || av === undefined;
        const bNull = bv === null || bv === undefined;
        if (aNull || bNull) {
          if (aNull && bNull) continue;
          return (aNull ? 1 : -1) * (nullsFirst ? -1 : 1);
        }
        const c = compare(av, bv);
        if (c !== 0) return ascending ? c : -c;
      }
      return 0;
    });
  }

  private run(): Result<unknown> {
    const rows = tableRows(this.table);

    // ---- writes -------------------------------------------------
    if (this.op !== 'select') {
      if (!rows) return err({ message: `relation "${this.table}" is not writable` });

      const items = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
      const guard = checkWrite(this.table, this.ctx, items[0]);
      if (guard) return err(guard);

      if (this.op === 'delete') {
        const doomed = rows.filter((r) => this.matches(r));
        for (const row of doomed) rows.splice(rows.indexOf(row), 1);
        return ok(this.returning ? doomed : null);
      }

      if (this.op === 'update') {
        const targets = rows.filter((r) => this.matches(r));
        for (const row of targets) Object.assign(row, items[0], { updated_at: nowIso() });
        return ok(this.returning ? targets : null);
      }

      // insert / upsert
      const written: Row[] = [];
      for (const item of items) {
        const existing =
          this.op === 'upsert' && this.conflictKeys.length
            ? rows.find((r) => this.conflictKeys.every((k) => String(r[k]) === String(item[k])))
            : undefined;

        if (existing) {
          Object.assign(existing, item, { updated_at: nowIso() });
          written.push(existing);
        } else {
          const row: Row = {
            id: uuid(),
            created_at: nowIso(),
            updated_at: nowIso(),
            ...item,
          };
          rows.push(row);
          written.push(row);
        }
      }
      return ok(this.returning ? this.shape(written) : null);
    }

    // ---- reads --------------------------------------------------
    const visible = readTable(this.table, this.ctx).filter((r) => this.matches(r));
    const ordered = this.sorted(visible);
    const limited = this.limitTo === null ? ordered : ordered.slice(0, this.limitTo);

    if (this.headOnly) {
      return { data: null, error: null, count: ordered.length };
    }
    return {
      data: this.shape(limited),
      error: null,
      count: this.wantCount ? ordered.length : null,
    };
  }

  /** Applies maybeSingle()/single() shaping. */
  private shape(rows: Row[]): unknown {
    if (this.wantSingle === 'none') return rows;
    return rows[0] ?? null;
  }

  then<R1 = Result<unknown>, R2 = never>(
    onFulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    let result: Result<unknown>;
    try {
      result = this.run();
    } catch (e) {
      result = err({ message: e instanceof Error ? e.message : 'demo store error' });
    }
    if (this.wantSingle === 'one' && !result.error && result.data === null) {
      result = err({ message: 'No rows found', code: 'PGRST116' });
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = String(a ?? '');
  const bs = String(b ?? '');
  return as < bs ? -1 : as > bs ? 1 : 0;
}

const nowIso = () => new Date().toISOString();
const ok = (data: unknown): Result<unknown> => ({ data, error: null, count: null });
const err = (error: PgError): Result<unknown> => ({ data: null, error, count: null });

/* ------------------------------------------------------------------ */
/* The client surface                                                  */
/* ------------------------------------------------------------------ */

export type DemoClient = ReturnType<typeof createDemoClient>;

/**
 * `userId` is resolved by the caller (from the demo session cookie), so the
 * same store can be queried as any role.
 */
export function createDemoClient(userId: string | null) {
  const ctx = contextFor(userId);

  return {
    from(table: string) {
      return {
        select: (columns?: string, options?: { count?: string; head?: boolean }) =>
          new DemoQuery(table, ctx, 'select').select(columns, options),
        insert: (payload: Row | Row[]) => new DemoQuery(table, ctx, 'insert', payload),
        update: (payload: Row) => new DemoQuery(table, ctx, 'update', payload),
        delete: () => new DemoQuery(table, ctx, 'delete'),
        upsert: (payload: Row | Row[], options?: { onConflict?: string }) =>
          new DemoQuery(
            table,
            ctx,
            'upsert',
            payload,
            (options?.onConflict ?? 'id').split(',').map((s) => s.trim()),
          ),
      };
    },

    rpc: async (name: string) => {
      if (name === 'complete_password_setup' && ctx.userId) {
        const rows = tableRows('profiles');
        const me = rows?.find((r) => r.id === ctx.userId);
        if (me) me.must_set_password = false;
      }
      return { data: null, error: null };
    },

    auth: {
      getUser: async () => ({
        data: { user: ctx.userId ? { id: ctx.userId } : null },
        error: null,
      }),
      getSession: async () => ({
        data: { session: ctx.userId ? { user: { id: ctx.userId } } : null },
        error: null,
      }),
    },
  };
}
