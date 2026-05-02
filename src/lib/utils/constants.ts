// ─── App-wide constants ────────────────────────────────────────

export const APP_NAME = 'musicmaker';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://musicmaker.studio';

// ─── Booking ───────────────────────────────────────────────────
export const SLOT_MINUTES = 15;       // granularity of calendar grid
export const MIN_BOOKING_HOURS = 1;
export const DEFAULT_BOOKING_HOURS = 2;
export const LONG_BOOKING_HOURS = 5;  // triggers Master notification

// Minutes before start/end to send push reminders
export const REMINDER_BEFORE_START_MIN = 10;
export const REMINDER_BEFORE_END_MIN   = 10;

// Default cancellation window in hours (overridable per user by Master)
export const DEFAULT_CANCELLATION_HOURS = 24;

// ─── Rooms ────────────────────────────────────────────────────
export const ROOMS: readonly {
  id:        string;
  name:      string;
  area:      number;
  color:     string;
  textColor: string;
}[] = [
  { id: 'songbird',    name: 'Songbird',    area: 38, color: '#F1C40F', textColor: '#78560a' },
  { id: 'heros',       name: 'Heros',       area: 23, color: '#74B9FF', textColor: '#1a4d8a' },
  { id: 'unstoppable', name: 'Unstoppable', area: 19, color: '#A29BFE', textColor: '#3d2f8a' },
  { id: 'imagine',     name: 'Imagine',     area: 56, color: '#00B894', textColor: '#004d3a' },
];

export type RoomId = 'songbird' | 'heros' | 'unstoppable' | 'imagine';

// Studio combo: only bookable by Master+
export const STUDIO_COMBO_ROOMS: RoomId[] = ['heros', 'unstoppable'];

// ─── User roles & types ────────────────────────────────────────
export const USER_ROLES = ['main-master', 'master', 'admin', 'mitglied'] as const;
export type UserRole = typeof USER_ROLES[number];

export const USER_TYPES = ['abo-kunde', 'lehrer', 'schüler', 'sondermitglied'] as const;
export type UserType = typeof USER_TYPES[number];

// Emails that are automatically granted Main-Master role on first login
export const MAIN_MASTER_EMAILS = [
  'elias@musikschafferei.at',
  'elias@musicmaker.studio',
  'p.strohbach@icloud.com',
];

// ─── Role limits ──────────────────────────────────────────────
export const MAX_MASTERS   = 15;
export const MAX_ADMINS    = 30;  // per Master

// ─── Support ticket statuses ──────────────────────────────────
export const TICKET_STATUSES = ['new', 'read', 'in-progress', 'done'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_TYPES = ['feedback', 'reklamation'] as const;
export type TicketType = typeof TICKET_TYPES[number];

// ─── Inventory ────────────────────────────────────────────────
export const INVENTORY_REF_PREFIX = 'ART-';
export const INVENTORY_REF_DIGITS = 5;

// ─── Rating ───────────────────────────────────────────────────
export const RATING_CRITERIA = [
  { id: 'aufwand',      label: 'Aufwand / Ansprüche' },
  { id: 'zahlungsmoral', label: 'Zahlungsmoral' },
  { id: 'ruecksichtnahme', label: 'Rücksichtnahme' },
  { id: 'sauberkeit',   label: 'Sauberkeit' },
] as const;

export type RatingCriterionId = typeof RATING_CRITERIA[number]['id'];

// ─── Billing ──────────────────────────────────────────────────
// Lehrer billing confirmation window in days
export const LEHRER_CONFIRM_DAYS = 4;

// ─── Translation ──────────────────────────────────────────────
export const SUPPORTED_LOCALES = ['de', 'en'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = 'de';

// Fields / names that are NEVER translated
export const TRANSLATION_EXCLUSIONS = [
  'Songbird', 'Heros', 'Unstoppable', 'Imagine', // room names
  'Winterhafen', 'Linz', 'GMK-Center',             // location names
  'Musikschafferei',
];

// ─── German UX strings (collision, restricted) ────────────────
export const MSG_COLLISION =
  'Bitte um Verzeihung, aber da hat sich grade jemand direkt vor dir eingebucht.';
export const MSG_DOUBLE_BOOKING =
  'Bitte Kontakt mit Elias aufnehmen.';
export const MSG_SCHUELER_RESTRICTED =
  'Diese Funktion ist nur für Studio- und Proberaumnutzer verfügbar.';
