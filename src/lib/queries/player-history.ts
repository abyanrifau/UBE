import { createClient } from '@/lib/supabase/server';
import type { AttendanceRow, EventType, MatchStat } from '@/lib/types';

type EventBits = { id: string; title: string; type: EventType; starts_at: string };

/**
 * Attendance and match-stat history for one player, joined to their events.
 * RLS applies on every table here, so a player calling this for themselves
 * gets their own rows and nothing else.
 */
export async function loadPlayerHistory(playerId: string) {
  const supabase = createClient();

  const [attendanceRes, statsRes] = await Promise.all([
    supabase
      .from('attendance')
      .select('*')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: false })
      .limit(60),
    supabase
      .from('match_stats')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const attendance = (attendanceRes.data ?? []) as AttendanceRow[];
  const stats = (statsRes.data ?? []) as MatchStat[];

  const eventIds = Array.from(
    new Set([...attendance.map((a) => a.event_id), ...stats.map((s) => s.event_id)]),
  );

  const eventsById = new Map<string, EventBits>();
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select('id,title,type,starts_at')
      .in('id', eventIds);
    for (const e of (data ?? []) as EventBits[]) eventsById.set(e.id, e);
  }

  const history = attendance
    .map((a) => {
      const event = eventsById.get(a.event_id);
      return {
        id: a.id,
        status: a.status,
        eventTitle: event?.title ?? 'Session',
        eventType: (event?.type ?? 'practice') as EventType,
        startsAt: event?.starts_at ?? a.recorded_at,
        note: a.note,
      };
    })
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  const matchStats = stats
    .map((s) => {
      const event = eventsById.get(s.event_id);
      return {
        ...s,
        eventTitle: event?.title ?? 'Match',
        startsAt: event?.starts_at ?? s.created_at,
      };
    })
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  return { history, matchStats };
}
