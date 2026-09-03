import Link from 'next/link';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                     */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-col justify-between border border-line p-4 sm:p-5',
        emphasis ? 'bg-ink text-paper' : 'bg-paper',
      ].join(' ')}
    >
      <p
        className={[
          'text-[11px] font-semibold uppercase tracking-[0.12em]',
          emphasis ? 'text-paper/60' : 'text-muted',
        ].join(' ')}
      >
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight sm:text-[26px]">{value}</p>
      {hint && (
        <p className={['mt-1 text-xs', emphasis ? 'text-paper/60' : 'text-muted'].join(' ')}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                             */
/* ------------------------------------------------------------------ */

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'success';
}) {
  if (!children) return null;
  const border = tone === 'error' ? 'border-ink' : 'border-line';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 border ${border} bg-subtle px-3.5 py-3 text-sm`}
    >
      <span aria-hidden className="mt-[2px] font-bold">
        {tone === 'error' ? '!' : tone === 'success' ? '✓' : 'i'}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** A bar that makes it obvious a screen is restricted, without being noisy. */
export function RestrictedBanner({ audience }: { audience: string }) {
  return (
    <div className="mb-6 flex items-center gap-2.5 border border-line bg-subtle px-3.5 py-2.5 text-xs text-muted">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0">
        <rect x="4" y="10" width="16" height="10" rx="1" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <span>
        Restricted — visible to {audience} only. Enforced by database policy, not just this page.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bits                                                                 */
/* ------------------------------------------------------------------ */

export function Tag({ children, solid = false }: { children: ReactNode; solid?: boolean }) {
  return <span className={solid ? 'tag-solid' : 'tag'}>{children}</span>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[14px] font-medium">{value ?? '—'}</dd>
    </div>
  );
}

/** Horizontal meter used for attendance. Greyscale, readable in both themes. */
export function Meter({ value, label }: { value: number | null; label?: string }) {
  const pct = value ?? 0;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-muted">{label ?? 'Attendance'}</span>
        <span className="text-[15px] font-bold tabular-nums">
          {value === null ? '—' : `${pct}%`}
        </span>
      </div>
      <div className="h-2 w-full border border-line bg-subtle" role="presentation">
        <div
          className="h-full bg-ink transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
