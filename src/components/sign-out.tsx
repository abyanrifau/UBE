'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function useSignOut() {
  const [busy, setBusy] = useState(false);

  return {
    busy,
    signOut: async () => {
      setBusy(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      // Hard navigation: it drops Next's client Router Cache, so nothing
      // rendered for the signed-out member can reappear for the next one.
      window.location.assign('/login');
    },
  };
}

export function SignOutButton({ className = 'btn-secondary btn-sm' }: { className?: string }) {
  const { busy, signOut } = useSignOut();
  return (
    <button type="button" onClick={signOut} className={className} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

export function SignOutLink({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { busy, signOut } = useSignOut();
  return (
    <button type="button" onClick={signOut} className={className} disabled={busy}>
      {children}
    </button>
  );
}
