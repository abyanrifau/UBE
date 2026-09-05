import type { ExcoRole } from '@/lib/types';
import { EXCO_ROLE_LABEL } from '@/lib/roles';

/**
 * Marks a player who holds a committee post. Nothing renders for the players
 * who do not, which is most of them.
 *
 * The post title shows on hover in a tooltip, and is on the element as an
 * aria-label so it is announced rather than being hover-only information.
 *
 * `focusable` is off wherever the star sits inside a link, since a focusable
 * element nested in another interactive element is a keyboard trap and an
 * accessibility violation. In those places the surrounding link is the thing
 * you tab to, and the label still reaches assistive technology.
 */
export function ExcoStar({
  role,
  focusable = true,
  className = '',
}: {
  role: ExcoRole | null | undefined;
  focusable?: boolean;
  className?: string;
}) {
  if (!role) return null;
  const label = EXCO_ROLE_LABEL[role];

  return (
    <span
      className={`group relative inline-flex shrink-0 items-center align-middle ${className}`}
      tabIndex={focusable ? 0 : undefined}
      role="img"
      aria-label={`ExCo: ${label}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-3.5 w-3.5 fill-current text-ink"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>

      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2
                   whitespace-nowrap border border-ink bg-ink px-2 py-1 text-[11px] font-medium
                   leading-none text-paper opacity-0 transition-opacity duration-150
                   group-hover:block group-hover:opacity-100
                   group-focus-visible:block group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/** The post title as plain text, for places with room to spell it out. */
export function ExcoRoleText({ role }: { role: ExcoRole | null | undefined }) {
  if (!role) return null;
  return <>{EXCO_ROLE_LABEL[role]}</>;
}
