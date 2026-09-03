import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { SetPasswordForm } from './set-password-form';
import { getSession } from '@/lib/supabase/server';
import { SignOutLink } from '@/components/sign-out';

export const metadata: Metadata = { title: 'Set your password' };

export default async function SetPasswordPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const first = session.profile.must_set_password;

  return (
    <AuthShell
      eyebrow={first ? 'First login' : 'Account'}
      title={first ? 'Choose your password' : 'Change your password'}
      description={
        first
          ? 'Your account was created by an admin with a temporary password. Pick your own now. Nobody else will know it.'
          : 'Pick a new password for your account.'
      }
      footer={
        <p className="text-[13px] text-muted">
          Not your account?{' '}
          <SignOutLink className="text-ink underline-offset-4 hover:underline">
            Sign out
          </SignOutLink>
        </p>
      }
    >
      <SetPasswordForm email={session.profile.email} />
    </AuthShell>
  );
}
