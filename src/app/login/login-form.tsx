'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Notice } from '@/components/ui';
import { IS_DEMO } from '@/lib/demo/config';
import { DemoAccountPicker } from './demo-accounts';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('invalid')
          ? 'That email and password do not match. Check both and try again.'
          : signInError.message,
      );
      setBusy(false);
      return;
    }

    // A deactivated account can still hold valid credentials — check the
    // profile before letting them through, and sign them straight back out.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active,must_set_password')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      setError('This account has been deactivated. Speak to an admin.');
      setBusy(false);
      return;
    }

    router.refresh();
    router.replace(profile?.must_set_password ? '/set-password' : (next ?? '/dashboard'));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Notice tone="error">{error}</Notice>}

      {IS_DEMO && (
        <DemoAccountPicker
          onPick={(demoEmail, demoPassword) => {
            setEmail(demoEmail);
            setPassword(demoPassword);
            setError(null);
          }}
        />
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.com"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className="field pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-[12px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
