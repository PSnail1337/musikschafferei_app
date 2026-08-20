import {
  collection, query, where, getDocs, updateDoc, doc, setDoc,
  serverTimestamp, getDoc, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile } from '@/lib/models/user';
import type { BandQuota } from '@/lib/models/bandQuota';
import type { UserRole, UserType } from '@/lib/utils/constants';
import { getUserBookingsInRange, getBandBookingsInRange } from './bookingService';
import { startOfYear, endOfYear } from 'date-fns';

const COL = 'users';
const QUOTA_COL = 'band_quotas';

// ─── User queries ─────────────────────────────────────────────

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, COL), orderBy('displayName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getUsersByMaster(masterId: string): Promise<UserProfile[]> {
  const q = query(
    collection(db, COL),
    where('masterId', '==', masterId),
    orderBy('displayName', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COL, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ─── Update user ──────────────────────────────────────────────

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, COL, uid), { role, updatedAt: serverTimestamp() });
}

export async function setUserType(uid: string, userType: UserType): Promise<void> {
  await updateDoc(doc(db, COL, uid), { userType, updatedAt: serverTimestamp() });
}

export async function setUserMaster(uid: string, masterId: string | null): Promise<void> {
  await updateDoc(doc(db, COL, uid), { masterId, updatedAt: serverTimestamp() });
}

export async function setCancellationWindow(uid: string, hours: number): Promise<void> {
  await updateDoc(doc(db, COL, uid), {
    cancellationWindowHours: hours,
    updatedAt: serverTimestamp(),
  });
}

export async function setAnnualQuota(uid: string, hours: number | null): Promise<void> {
  await updateDoc(doc(db, COL, uid), {
    annualQuotaHours: hours,
    updatedAt: serverTimestamp(),
  });
}

export async function setBandName(uid: string, bandName: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), {
    bandName: bandName.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), { active: false, updatedAt: serverTimestamp() });
}

export async function activateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), { active: true, updatedAt: serverTimestamp() });
}

// ─── Quota tracking ───────────────────────────────────────────

/** Returns booked hours for a user in the current calendar year */
export async function getUsedHoursThisYear(userId: string): Promise<number> {
  const now = new Date();
  const bookings = await getUserBookingsInRange(userId, startOfYear(now), endOfYear(now));
  const totalMin = bookings.reduce((sum, b) => sum + b.durationMin, 0);
  return totalMin / 60;
}

// ─── Band quota tracking ──────────────────────────────────────

export async function getAllBandQuotas(): Promise<BandQuota[]> {
  const snap = await getDocs(collection(db, QUOTA_COL));
  return snap.docs.map((d) => d.data() as BandQuota);
}

export async function setBandQuota(bandName: string, hours: number | null): Promise<void> {
  await setDoc(doc(db, QUOTA_COL, bandName), {
    bandName,
    annualQuotaHours: hours,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Returns booked hours for a band (shared across every member using it) in the current calendar year */
export async function getUsedHoursThisYearForBand(bandName: string): Promise<number> {
  const now = new Date();
  const bookings = await getBandBookingsInRange(bandName, startOfYear(now), endOfYear(now));
  const totalMin = bookings.reduce((sum, b) => sum + b.durationMin, 0);
  return totalMin / 60;
}

// ─── Export ───────────────────────────────────────────────────

/** Returns CSV string of bookings for a Master's circle */
export async function exportBookingsCSV(masterId: string): Promise<string> {
  const users  = await getUsersByMaster(masterId);
  const uids   = users.map((u) => u.uid);
  const now    = new Date();
  const from   = startOfYear(now);
  const to     = endOfYear(now);

  const rows: string[] = [
    'UserID,Name,Email,Raum,Start,Ende,Dauer (Min),Notizen',
  ];

  for (const user of users) {
    const bookings = await getUserBookingsInRange(user.uid, from, to);
    for (const b of bookings) {
      rows.push(
        [
          b.userId,
          user.displayName,
          user.email,
          b.roomIds.join('+'),
          b.startTime.toDate().toISOString(),
          b.endTime.toDate().toISOString(),
          b.durationMin,
          csvEscape(b.notes),
        ].join(','),
      );
    }
  }

  return rows.join('\n');
}

function csvEscape(value: string): string {
  return `"${(value ?? '').replace(/"/g, '""')}"`;
}
