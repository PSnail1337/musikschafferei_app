import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, orderBy, arrayUnion, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import type { SupportTicket, TicketStatusEvent } from '@/lib/models/support';
import type { TicketStatus, TicketType } from '@/lib/utils/constants';

const COL = 'support_tickets';

// ─── Create ───────────────────────────────────────────────────

export interface CreateTicketInput {
  userId:    string;
  userEmail: string;
  userName:  string;
  type:      TicketType;
  message:   string;
  voiceBlob?: Blob | null;
  /** Only for type 'doppelbuchung' — the new booking to cancel if the admin declines */
  linkedBookingIds?: string[];
}

export async function createTicket(input: CreateTicketInput): Promise<string> {
  let voiceURL: string | null = null;

  if (input.voiceBlob) {
    const filename = `voice_${Date.now()}.webm`;
    const storageRef = ref(storage, `support/${filename}`);
    await uploadBytes(storageRef, input.voiceBlob);
    voiceURL = await getDownloadURL(storageRef);
  }

  const initialStatus: TicketStatus = 'new';
  const docRef = await addDoc(collection(db, COL), {
    userId:      input.userId,
    userEmail:   input.userEmail,
    userName:    input.userName,
    type:        input.type,
    status:      initialStatus,
    message:     input.message,
    voiceURL,
    adminNotes:  '',
    assignedTo:  null,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
    statusHistory: [],
    ...(input.type === 'doppelbuchung'
      ? { linkedBookingIds: input.linkedBookingIds ?? [], approvalStatus: 'pending' }
      : {}),
  });

  // Notify admins/masters — fire and forget, non-critical
  fetch('/api/notifications/ticket', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ticketId: docRef.id }),
  }).catch(() => {});

  return docRef.id;
}

// ─── Status update ────────────────────────────────────────────

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  changedBy: string,
  note = '',
): Promise<void> {
  const event: TicketStatusEvent = {
    status:    newStatus,
    changedBy,
    changedAt: Timestamp.now(),
    note,
  };

  await updateDoc(doc(db, COL, ticketId), {
    status:        newStatus,
    updatedAt:     serverTimestamp(),
    statusHistory: arrayUnion(event),
  });
}

// ─── Doppelbuchung approval ─────────────────────────────────────

export async function updateTicketApproval(
  ticketId: string,
  approvalStatus: 'accepted' | 'declined',
  changedBy: string,
): Promise<void> {
  const event: TicketStatusEvent = {
    status:    'done',
    changedBy,
    changedAt: Timestamp.now(),
    note:      approvalStatus === 'accepted' ? 'Doppelbuchung akzeptiert' : 'Doppelbuchung abgelehnt',
  };

  await updateDoc(doc(db, COL, ticketId), {
    approvalStatus,
    status:        'done',
    updatedAt:     serverTimestamp(),
    statusHistory: arrayUnion(event),
  });
}

// ─── Admin note ───────────────────────────────────────────────

export async function updateAdminNotes(ticketId: string, notes: string): Promise<void> {
  await updateDoc(doc(db, COL, ticketId), {
    adminNotes: notes,
    updatedAt:  serverTimestamp(),
  });
}

// ─── Queries ──────────────────────────────────────────────────

/** All tickets for a given user */
export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
}

/** All tickets (for Admin+) with optional status filter */
export async function getAllTickets(
  statusFilter?: TicketStatus,
): Promise<SupportTicket[]> {
  let q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  if (statusFilter) {
    q = query(
      collection(db, COL),
      where('status', '==', statusFilter),
      orderBy('createdAt', 'desc'),
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
}
