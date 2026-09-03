'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Notice } from '@/components/ui';

const MIN_LENGTH = 8;

function strength(pw: string) {
  const checks = [
    pw.length >= MIN_LENGTH,
    pw.length >= 12,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  const score = checks.filter(Boolean).length;
  return {
    score,
    label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][score],
  };
}

export function SetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const meter = strength(password);
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    // Clears must_set_password for the signed-in user only (SECURITY DEFINER).
    const { error: rpcError } = await supabase.rpc('complete_password_setup');
    if (rpcError) {
      setError('Your password was saved, but we could not finish setup. Try signing in again.');
      setBusy(false);
      return;
    }

    router.refresh();
    router.replace('/dashboard');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Notice tone="error">{error}</Notice>}

      <div className="border border-line bg-subtle px-3.5 py-3 text-[13px]">
        <span className="text-muted">Setting the password for </span>
        <span className="font-semibold">{email}</span>
      </div>

      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            className="field pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-[12px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex h-1 flex-1 gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-full flex-1 ${i < meter.score ? 'bg-ink' : 'bg-line'}`}
              />
            ))}
          </div>
          <span className="w-16 shrink-0 text-right text-[11px] font-medium text-muted">
            {password ? meter.label : ''}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {tooShort
            ? `At least ${MIN_LENGTH} characters.`
            : `Minimum ${MIN_LENGTH} characters. Mixing cases, numbers and symbols makes it stronger.`}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="confirm">
          Confirm password
        </label>
        <input
          id="confirm"
          type={show ? 'text' : 'password'}
          className="field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {mismatch && <p className="mt-2 text-[12px] font-medium">These do not match yet.</p>}
      </div>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={busy || password.length < MIN_LENGTH || password !== confirm}
      >
        {busy ? 'Saving…' : 'Save password and continue'}
      </button>
    </form>
  );
}
