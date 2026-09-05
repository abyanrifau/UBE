import Link from 'next/link';
import type { Squad } from '@/lib/types';
import { SQUAD_LABEL } from '@/lib/roles';

/**
 * Switches between the academy view and each squad view. Rendered as links
 * rather than client state so every view has a real URL that can be
 * bookmarked and shared.
 *
 * Only squads the viewer is allowed to open are passed in, so a boys player
 * simply never sees a Girls tab.
 */
export function SquadTabs({
  base,
  current,
  squads,
  allLabel = 'Academy',
}: {
  /** Route the tabs hang off, for example `/dashboard`. */
  base: string;
  current: Squad | null;
  squads: Squad[];
  allLabel?: string;
}) {
  // With one squad or none there is nothing to switch between.
  if (squads.length === 0) return null;

  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: base, label: allLabel, active: current === null },
    ...squads.map((s) => ({
      href: `${base}/${s}`,
      label: SQUAD_LABEL[s],
      active: current === s,
    })),
  ];

  return (
    <div className="inline-flex border border-line" role="group" aria-label="Squad">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={[
            'px-4 py-2 text-[13px] font-semibold transition-colors',
            tab.active ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

/** Small marker for a row that belongs to one squad. */
export function SquadTag({ squad }: { squad: Squad | null }) {
  if (!squad) return null;
  return <span className="tag">{SQUAD_LABEL[squad]}</span>;
}
