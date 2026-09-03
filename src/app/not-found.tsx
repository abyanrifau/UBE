import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeProvider } from '@/components/theme';

export default function NotFound() {
  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Logo size={56} />
        <p className="eyebrow mt-8">404</p>
        <h1 className="mt-2.5 text-[26px] font-bold tracking-tight">Not found</h1>
        <p className="mt-2.5 max-w-sm text-[14px] leading-relaxed text-muted">
          This page does not exist, or it belongs to a part of the platform your role cannot
          reach.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Go to the dashboard
          </Link>
          <Link href="/" className="btn-secondary">
            Homepage
          </Link>
        </div>
      </div>
    </ThemeProvider>
  );
}
