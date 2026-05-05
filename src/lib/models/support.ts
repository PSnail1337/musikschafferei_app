import type { Timestamp } from 'firebase/firestore';
import type { TicketStatus, TicketType } from '../utils/constants';

export interface SupportTicket {
  id:          string;
  userId:      string;
  userEmail:   string;
  userName:    string;
  type:        TicketType;     // 'feedback' | 'reklamation'
  status:      TicketStatus;   // new → read → in-progress → done
  /** Plain-text message (from text input) */
  message:     string;
  /** Storage URL for recorded voice memo (optional) */
  voiceURL:    string | null;
  /** Internal notes added by admins */
  adminNotes:  string;
  assignedTo:  string | null;
  createdAt:   Timestamp;
  updatedAt:   Timestamp;
  statusHistory: TicketStatusEvent[];
}

export interface TicketStatusEvent {
  status:    TicketStatus;
  changedBy: string;
  changedAt: Timestamp;
  note:      string;
}
