import { IS_DEMO } from '@/lib/demo/config';

/**
 * Always visible while demo mode is on, so nobody mistakes the seeded academy
 * for real data — or leaves the flag set on a live deployment.
 */
export function DemoBanner() {
  if (!IS_DEMO) return null;

  return (
    <div className="border-b border-line bg-ink px-5 py-2 text-center text-paper sm:px-8">
      <p className="text-[12px] leading-snug">
        <span className="font-bold uppercase tracking-[0.12em]">Demo mode</span>
        <span className="mx-2 opacity-40">·</span>
        <span className="opacity-80">
          Sample data, no database. Edits last until the server restarts. Unset{' '}
          <code className="font-mono">NEXT_PUBLIC_DEMO_MODE</code> once Supabase is connected.
        </span>
      </p>
    </div>
  );
}
