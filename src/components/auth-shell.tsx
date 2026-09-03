import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { ThemeProvider, ThemeToggle } from '@/components/theme';
import { ACADEMY } from '@/lib/config';

/** Shared frame for the login and password-setup screens. */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[13px] font-bold uppercase tracking-[0.2em]">
              {ACADEMY.name}
            </span>
          </Link>
          <ThemeToggle compact />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[380px] animate-fade-up">
            <Logo size={64} className="mb-8" />
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-2.5 text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{description}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6">{footer}</div>}
          </div>
        </main>

        <footer className="px-5 py-6 text-center text-xs text-muted sm:px-8">
          © {new Date().getFullYear()} {ACADEMY.name}
        </footer>
      </div>
    </ThemeProvider>
  );
}
