'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeProvider } from '@/components/theme';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const missingConfig = /supabaseUrl|supabaseKey|SUPABASE/i.test(error.message);

  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Logo size={56} />
        <p className="eyebrow mt-8">Something broke</p>
        <h1 className="mt-2.5 text-[26px] font-bold tracking-tight">
          {missingConfig ? 'Not configured yet' : 'That did not load'}
        </h1>
        <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-muted">
          {missingConfig
            ? 'The Supabase environment variables are missing. Copy .env.example to .env.local and fill them in — the README walks through it.'
            : 'Try again. If it keeps happening, let an admin know what you were doing.'}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-muted">Ref: {error.digest}</p>
        )}
      </div>
    </ThemeProvider>
  );
}
