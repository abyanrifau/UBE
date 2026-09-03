import { createPublicClient } from '@/lib/supabase/public';
import { formatDate, formatTime } from '@/lib/format';

type PublicEvent = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  location: string | null;
};

/**
 * Upcoming events an editor has marked public. Reads the `public_events`
 * view, which is the only anon-readable object in the database.
 */
export async function PublicEvents() {
  let events: PublicEvent[] = [];

  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('public_events')
      .select('id,title,type,starts_at,location')
      .limit(4);
    events = (data as PublicEvent[] | null) ?? [];
  } catch {
    events = [];
  }

  if (events.length === 0) {
    return (
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        No public fixtures listed right now. Follow along on Instagram for match days and open
        sessions.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-line border-t border-line">
      {events.map((event) => (
        <li key={event.id} className="flex items-baseline justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{event.title}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {event.location ? `${event.location} · ` : ''}
              <span className="uppercase tracking-[0.1em]">{event.type}</span>
            </p>
          </div>
          <p className="shrink-0 text-right text-[13px] tabular-nums text-muted">
            {formatDate(event.starts_at)}
            <span className="block">{formatTime(event.starts_at)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
