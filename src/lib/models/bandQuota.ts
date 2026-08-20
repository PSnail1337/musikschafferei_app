import type { Timestamp } from 'firebase/firestore';

export interface BandQuota {
  bandName:         string;
  /** Max hours per year shared by every member booking under this band name. null = unlimited */
  annualQuotaHours: number | null;
  updatedAt:        Timestamp;
}
