export type AppRole = 'admin' | 'treasurer' | 'exco' | 'coach' | 'player';
export type EventType = 'practice' | 'match' | 'tournament' | 'meeting' | 'event';
export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type RsvpStatus = 'going' | 'not_going' | 'maybe';
export type FinanceKind = 'income' | 'expense';
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * The academy runs two squads. On a player this is which squad they are in,
 * on an event or announcement it is who the row is for, where null means the
 * whole academy.
 */
export type Squad = 'boys' | 'girls';

/**
 * A committee post held by a player. Descriptive only: it grants nothing,
 * and access is still decided entirely by the account's AppRole.
 */
export type ExcoRole =
  | 'vice_president'
  | 'secretary'
  | 'treasurer'
  | 'event_coordinator_boy'
  | 'event_coordinator_girl'
  | 'academy_rep_boy'
  | 'academy_rep_girl';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  must_set_password: boolean;
  theme: ThemePreference;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  profile_id: string | null;
  full_name: string;
  jersey_number: number | null;
  position: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  notes: string | null;
  squad: Squad | null;
  exco_role: ExcoRole | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AcademyEvent = {
  id: string;
  title: string;
  type: EventType;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  visible_to_roles: AppRole[];
  squad: Squad | null;
  rsvp_enabled: boolean;
  is_public: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type EventRsvp = {
  id: string;
  event_id: string;
  profile_id: string;
  status: RsvpStatus;
  updated_at: string;
};

export type AttendanceRow = {
  id: string;
  event_id: string;
  player_id: string;
  status: AttendanceStatus;
  note: string | null;
  recorded_by: string | null;
  recorded_at: string;
};

export type MatchStat = {
  id: string;
  event_id: string;
  player_id: string;
  points: number;
  kills: number;
  blocks: number;
  aces: number;
  digs: number;
  assists: number;
  serve_errors: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  visible_to_roles: AppRole[];
  squad: Squad | null;
  author_id: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
};

export type FinanceEntry = {
  id: string;
  entry_date: string;
  kind: FinanceKind;
  category: string;
  description: string;
  amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Coach-facing plan for a session. Owners only, never sent to a player. */
export type EventPlan = {
  event_id: string;
  plan: string;
  updated_by: string | null;
  updated_by_name: string;
  updated_at: string;
};

export type MonthlySummary = {
  month: string;
  year: number;
  month_number: number;
  income: number;
  expenses: number;
  net: number;
  entry_count: number;
};

export type YearlySummary = {
  year: number;
  income: number;
  expenses: number;
  net: number;
  entry_count: number;
};

export type CategorySummary = {
  year: number;
  kind: FinanceKind;
  category: string;
  total: number;
};

export type AttendanceStats = {
  player_id: string;
  logged: number;
  present: number;
  absent: number;
  excused: number;
  attendance_pct: number | null;
};
