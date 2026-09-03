'use client';

import Link from 'next/link';
import type { Profile } from '@/lib/types';
import { ActionForm, Field } from '@/components/form';
import { ThemeToggle } from '@/components/theme';
import { SignOutButton } from '@/components/sign-out';
import { updateMyProfile } from '@/lib/actions/profile';

export function AccountSettings({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <ActionForm
          action={updateMyProfile}
          submitLabel="Save"
          successMessage="Saved."
        >
          <Field name="full_name" label="Name" required defaultValue={profile.full_name} />
          <Field
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={profile.phone ?? ''}
            hint="Optional. Used by ExCo to reach you about fixtures."
          />
          <Field
            label="Email"
            defaultValue={profile.email}
            disabled
            hint="Ask an admin to change your email."
          />
        </ActionForm>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[14px] font-semibold">Appearance</p>
          <p className="mt-0.5 text-[13px] text-muted">
            Remembered on this device and saved to your account.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[14px] font-semibold">Password</p>
          <p className="mt-0.5 text-[13px] text-muted">Change the password you sign in with.</p>
        </div>
        <Link href="/set-password" className="btn-secondary btn-sm">
          Change password
        </Link>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[14px] font-semibold">Session</p>
          <p className="mt-0.5 text-[13px] text-muted">Sign out on this device.</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
