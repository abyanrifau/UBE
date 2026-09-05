import type { Squad } from './types';

/**
 * How a squad view filters rows.
 *
 * A squad view shows that squad's own rows plus anything addressed to the
 * whole academy, because those are the things the squad actually needs. The
 * Invitational belongs to nobody in particular but both squads travel to it.
 *
 * The academy view (`view === null`) shows everything the caller can see,
 * which for a player is already narrowed by RLS to their own squad.
 */
export const inSquadView = <T extends { squad: Squad | null }>(
  row: T,
  view: Squad | null,
): boolean => view === null || row.squad === null || row.squad === view;

/** Copy explaining what the current view is showing. */
export function squadScopeNote(view: Squad | null, plural: string): string {
  if (view === null) return `Everything across the academy, both squads included.`;
  const label = view === 'boys' ? 'boys squad' : 'girls squad';
  return `${plural} for the ${label}, plus anything for the whole academy.`;
}
