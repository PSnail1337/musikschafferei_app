import type { Timestamp } from 'firebase/firestore';
import type { RoomId } from '../utils/constants';

export interface Booking {
  id:          string;
  userId:      string;
  userEmail:   string;
  userName:    string;
  /** Band or artist name at time of booking */
  bandName:    string;
  /** Array of room IDs — usually 1, or 2 for studio combo */
  roomIds:     RoomId[];
  startTime:   Timestamp;
  endTime:     Timestamp;
  /** Duration in minutes (denormalized for easy queries) */
  durationMin: number;
  notes:       string;
  /** true if this was a studio combo (Believe + Unstoppable) */
  isCombo:     boolean;
  /** true for a multi-room combo booking not yet accepted by an admin (see the linked 'doppelbuchung' ticket) */
  pendingApproval: boolean;
  /** Notification tasks already dispatched */
  notifiedStart: boolean;
  notifiedEnd:   boolean;
  createdAt:   Timestamp;
  updatedAt:   Timestamp;
  cancelled:   boolean;
  cancelledAt: Timestamp | null;
  cancelledBy: string | null;
}
