import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc,
  Timestamp, onSnapshot, orderBy, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Booking } from '@/lib/models/booking';
import type { RoomId } from '@/lib/utils/constants';
import {
  SLOT_MINUTES, LONG_BOOKING_HOURS, MSG_COLLISION, MSG_BAND_QUOTA_EXCEEDED,
} from '@/lib/utils/constants';
import { differenceInMinutes, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';

const COL      = 'buchungen';
const QUOTA_COL = 'band_quotas';

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

/** Get bookings for a band in a date range (for shared band-quota calculation) */
export async function getBandBookingsInRange(
  bandName: string,
  from: Date,
  to: Date,
): Promise<Booking[]> {
  const q = query(
    collection(db, COL),
    where('bandName', '==', bandName),
    where('cancelled', '==', false),
    where('startTime', '>=', Timestamp.fromDate(from)),
    where('startTime', '<=', Timestamp.fromDate(to)),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

/** Get every booking for a user, past and future (for the personal "Meine Buchungen" overview) */
export async function getAllUserBookings(userId: string): Promise<Booking[]> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('startTime', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

/** Get all non-cancelled bookings in a date range across all users (for the admin overview) */
export async function getBookingsInRange(from: Date, to: Date): Promise<Booking[]> {
  const q = query(
    collection(db, COL),
    where('cancelled', '==', false),
    where('startTime', '>=', Timestamp.fromDate(from)),
    where('startTime', '<=', Timestamp.fromDate(to)),
    orderBy('startTime', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

// ─── Collision detection ──────────────────────────────────────

/** Check if a proposed booking conflicts with existing ones in the same room */
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
  bandName:  string;
  roomIds:   RoomId[];
  startTime: Date;
  endTime:   Date;
  notes:     string;
  isCombo:   boolean;
}

export interface CreateBookingResult {
  id: string;
  /** Room IDs involved in a situation that needs admin approval via a support
   *  ticket (see BookingCreateSheet): either a pre-existing booking by the same
   *  user overlapping this one in a different room, or this booking itself
   *  requesting 2+ rooms at once (any combo). Empty means no approval needed. */
  needsApprovalRoomIds: RoomId[];
}

export class CollisionError extends Error {
  constructor() { super(MSG_COLLISION); }
}

export class BandQuotaExceededError extends Error {
  constructor() { super(MSG_BAND_QUOTA_EXCEEDED); }
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { userId, bandName, roomIds, startTime, endTime } = input;
  const durationMin = differenceInMinutes(endTime, startTime);
  const startTs = Timestamp.fromDate(startTime);
  const endTs   = Timestamp.fromDate(endTime);

  let needsApprovalRoomIds: RoomId[] = [];

  // Booking 2+ rooms at once (any combo, including Studio Combo) is allowed,
  // but always needs admin sign-off — held as "pending" (dashed in the UI)
  // until an admin accepts the linked ticket
  const isPendingCombo = roomIds.length > 1;
  if (isPendingCombo) {
    needsApprovalRoomIds = [...roomIds];
  }

  try {
    // Same-user overlap in a *different* room is now allowed, but flagged for
    // admin approval — filter endTime in memory
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
    needsApprovalRoomIds = [...needsApprovalRoomIds, ...userConflicts.flatMap((d) => d.data().roomIds as RoomId[])];

    // Same-room collision with any other booking is still a hard block
    const collision = await hasCollision(roomIds, startTime, endTime);
    if (collision) throw new CollisionError();
  } catch (err) {
    if (err instanceof CollisionError) throw err;
    console.warn('[bookingService] Collision check skipped (index not ready):', (err as { code?: string }).code);
  }

  // Shared band quota — hard block if the band's annual hours would be exceeded
  const trimmedBand = bandName.trim();
  if (trimmedBand) {
    try {
      const quotaSnap = await getDoc(doc(db, QUOTA_COL, trimmedBand));
      const quotaHours = quotaSnap.exists() ? (quotaSnap.data().annualQuotaHours as number | null) : null;
      if (quotaHours != null) {
        const now = new Date();
        const bandBookings = await getBandBookingsInRange(trimmedBand, startOfYear(now), endOfYear(now));
        const usedMin = bandBookings.reduce((sum, b) => sum + b.durationMin, 0);
        if (usedMin + durationMin > quotaHours * 60) throw new BandQuotaExceededError();
      }
    } catch (err) {
      if (err instanceof BandQuotaExceededError) throw err;
      console.warn('[bookingService] Band quota check skipped:', (err as { code?: string }).code);
    }
  }

  console.log('[bookingService] writing booking to Firestore...');
  const ref = await addDoc(collection(db, COL), {
    ...input,
    startTime:     startTs,
    endTime:       endTs,
    durationMin,
    notifiedStart: false,
    notifiedEnd:   false,
    pendingApproval: isPendingCombo,
    cancelled:     false,
    cancelledAt:   null,
    cancelledBy:   null,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });

  return { id: ref.id, needsApprovalRoomIds };
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

/** Clears the pending-approval flag once an admin accepts the linked ticket */
export async function approveBooking(bookingId: string): Promise<void> {
  await updateDoc(doc(db, COL, bookingId), {
    pendingApproval: false,
    updatedAt:       serverTimestamp(),
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
