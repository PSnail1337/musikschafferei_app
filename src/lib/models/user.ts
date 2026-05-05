import type { Timestamp } from 'firebase/firestore';
import type { UserRole, UserType } from '../utils/constants';

export interface UserProfile {
  uid:                   string;
  email:                 string;
  displayName:           string;
  photoURL:              string | null;
  role:                  UserRole;
  userType:              UserType;
  /** Cancellation window in hours — overridable by Master */
  cancellationWindowHours: number;
  notificationsEnabled:  boolean;
  language:              string;
  /** Max hours per year (set by Master). null = unlimited */
  annualQuotaHours:      number | null;
  /** UID of the Master this user belongs to (null for master-level+) */
  masterId:              string | null;
  /** FCM device tokens (for push notifications) */
  fcmTokens:             string[];
  createdAt:             Timestamp;
  updatedAt:             Timestamp;
  active:                boolean;
}
