import type { Timestamp } from 'firebase/firestore';

/** Single document in app_config collection with id = 'global' */
export interface AppConfig {
  /** Minimum hours before booking that cancellation is allowed (default: 24) */
  defaultCancellationHours: number;
  /** Whether new user registrations are open */
  registrationOpen: boolean;
  /** Maintenance mode message shown to all users */
  maintenanceMessage: string | null;
  updatedBy: string;
  updatedAt: Timestamp;
}

/** Per-user translation cache stored as sub-collection on any doc */
export interface TranslationCache {
  locale:     string;
  translated: Record<string, string>;
  cachedAt:   Timestamp;
}
