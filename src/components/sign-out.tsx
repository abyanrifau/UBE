'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function useSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return {
    busy,
    signOut: async () => {
      setBusy(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      router.replace('/login');
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
