import type { EventType } from './types';

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  practice: 'Practice',
  match: 'Match',
  tournament: 'Tournament',
  meeting: 'Meeting',
  event: 'Event',
};

export const EVENT_TYPE_OPTIONS = (Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((value) => ({
  value,
  label: EVENT_TYPE_LABEL[value],
}));
