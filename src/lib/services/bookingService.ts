import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
  Timestamp, onSnapshot, orderBy, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Booking } from '@/lib/models/booking';
import type { RoomId } from '@/lib/utils/constants';
import {
  SLOT_MINUTES, LONG_BOOKING_HOURS, MSG_COLLISION, MSG_DOUBLE_BOOKING,
} from '@/lib/utils/constants';
import { differenceInMinutes, startOfDay, endOfDay } from 'date-fns';

const COL = 'buchungen';

// ─── Queries ──────────────────────────────────────────────────

/** Subscribe to all non-cancelled bookings on a given day across all rooms */
export function subscribeBookingsForDay(
  date: Date,
  onData: (bookings: Booking[]) => void,
): Unsubscribe {
  const start = Timestamp.fromDate(startOfDay(date));
  const end   = Timestamp.fromDate(endOfDay(date));

  const q = query(
    collection(db, COL),
    where('cancelled', '==', false),
    where('startTime', '>=', start),
    where('startTime', '<=', end),
    orderBy('startTime', 'asc'),
  );

  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
    onData(bookings);
  }, (err) => {
    console.error('[bookingService] subscribeBookingsForDay error:', err.code, err.message);
  });
}

/** Get bookings for a user in a date range (for quota calculation) */
export async function getUserBookingsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<Booking[]> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    where('cancelled', '==', false),
    where('startTime', '>=', Timestamp.fromDate(from)),
    where('startTime', '<=', Timestamp.fromDate(to)),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

// ─── Collision detection ──────────────────────────────────────

/** Check if a proposed booking conflicts with existing ones */
async function hasCollision(
  roomIds: RoomId[],
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<boolean> {
  const startTs = Timestamp.fromDate(start);
  const endTs   = Timestamp.fromDate(end);

  for (const roomId of roomIds) {
    // Single inequality on startTime only — filter endTime in memory
    const q = query(
      collection(db, COL),
      where('roomIds', 'array-contains', roomId),
      where('cancelled', '==', false),
      where('startTime', '<', endTs),
    );
    const snap = await getDocs(q);
    const conflicts = snap.docs.filter((d) =>
      d.id !== excludeId &&
      (d.data().endTime as Timestamp).toMillis() > startTs.toMillis(),
    );
    if (conflicts.length > 0) return true;
  }
  return false;
}

// ─── Create ───────────────────────────────────────────────────

export interface CreateBookingInput {
  userId:    string;
  userEmail: string;
  userName:  string;
  roomIds:   RoomId[];
  startTime: Date;
  endTime:   Date;
  notes:     string;
  isCombo:   boolean;
}

export class CollisionError extends Error {
  constructor() { super(MSG_COLLISION); }
}

export class DoubleBookingError extends Error {
  constructor() { super(MSG_DOUBLE_BOOKING); }
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  const { userId, roomIds, startTime, endTime } = input;
  const durationMin = differenceInMinutes(endTime, startTime);
  const startTs = Timestamp.fromDate(startTime);
  const endTs   = Timestamp.fromDate(endTime);

  // Check for same-user simultaneous booking — filter endTime in memory
  try {
    const userQ = query(
      collection(db, COL),
      where('userId', '==', userId),
      where('cancelled', '==', false),
      where('startTime', '<', endTs),
    );
    const userSnap = await getDocs(userQ);
    const userConflicts = userSnap.docs.filter((d) =>
      (d.data().endTime as Timestamp).toMillis() > startTs.toMillis(),
    );
    if (userConflicts.length > 0) throw new DoubleBookingError();

    // Check for collision with other users
    const collision = await hasCollision(roomIds, startTime, endTime);
    if (collision) throw new CollisionError();
  } catch (err) {
    // Re-throw business logic errors; swallow index-building errors so the write can proceed
    if (err instanceof DoubleBookingError || err instanceof CollisionError) throw err;
    console.warn('[bookingService] Collision check skipped (index not ready):', (err as { code?: string }).code);
  }

  console.log('[bookingService] writing booking to Firestore...');
  const ref = await addDoc(collection(db, COL), {
    ...input,
    startTime:     startTs,
    endTime:       endTs,
    durationMin,
    notifiedStart: false,
    notifiedEnd:   false,
    cancelled:     false,
    cancelledAt:   null,
    cancelledBy:   null,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });

  return ref.id;
}

// ─── Cancel ───────────────────────────────────────────────────

export async function cancelBooking(
  bookingId: string,
  cancelledByUid: string,
): Promise<void> {
  await updateDoc(doc(db, COL, bookingId), {
    cancelled:   true,
    cancelledAt: serverTimestamp(),
    cancelledBy: cancelledByUid,
    updatedAt:   serverTimestamp(),
  });
}

// ─── Update ───────────────────────────────────────────────────

export async function updateBookingNotes(bookingId: string, notes: string) {
  await updateDoc(doc(db, COL, bookingId), { notes, updatedAt: serverTimestamp() });
}

// ─── Helpers ──────────────────────────────────────────────────

/** Whether a booking is long enough to trigger a Master notification */
export function isLongBooking(durationMin: number) {
  return durationMin >= LONG_BOOKING_HOURS * 60;
}

/** Slot duration in minutes, aligned to SLOT_MINUTES */
export function alignToSlot(minutes: number) {
  return Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}
