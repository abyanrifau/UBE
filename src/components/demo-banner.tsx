import { IS_DEMO } from '@/lib/demo/config';

/**
 * Always visible while demo mode is on, so nobody mistakes the seeded academy
 * for real data.
 *
 * The copy is written for the people being shown the demo, not for whoever
 * deploys it. The instruction to unset NEXT_PUBLIC_DEMO_MODE once Supabase is
 * connected lives in docs/DEMO.md and in the comment at the top of
 * src/lib/demo/config.ts, where a developer will actually see it.
 */
export function DemoBanner() {
  if (!IS_DEMO) return null;

  return (
    <div className="border-b border-line bg-ink px-5 py-2 text-center text-paper sm:px-8">
      <p className="text-[12px] leading-snug">
        <span className="font-bold uppercase tracking-[0.12em]">Demo mode</span>
        <span className="mx-2 opacity-40">·</span>
        <span className="opacity-80">
          Everything here is sample data, and nothing you change is saved.
        </span>
      </p>
    </div>
  );
}
