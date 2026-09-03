import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from './login-form';
import { ACADEMY } from '@/lib/config';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Members"
      title="Sign in"
      description={`Use the email and password an ${ACADEMY.name} admin gave you. Accounts are not open to sign-up.`}
      footer={
        <div className="space-y-3 text-[13px] leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-ink">First time here?</span> Sign in with the
            temporary password you were given — you will be asked to choose your own straight
            away.
          </p>
          <p>
            Forgot your password, or never received one? Ask an admin or your ExCo contact to
            reset it.
          </p>
          <p>
            <Link href="/" className="text-ink underline-offset-4 hover:underline">
              ← Back to the homepage
            </Link>
          </p>
        </div>
      }
    >
      <Suspense fallback={<div className="h-[236px]" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
