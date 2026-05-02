import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { MAIN_MASTER_EMAILS } from '../utils/constants';
import type { UserRole, UserType } from '../utils/constants';

const googleProvider = new GoogleAuthProvider();

// ─── Sign-in / sign-up ────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await createUserProfile(credential.user, displayName);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export const logOut = () => signOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

// ─── Profile bootstrapping ────────────────────────────────────

async function createUserProfile(user: User, displayName: string) {
  const role: UserRole = MAIN_MASTER_EMAILS.includes(user.email ?? '')
    ? 'main-master'
    : 'mitglied';

  const profileRef = doc(db, 'users', user.uid);
  await setDoc(profileRef, {
    uid:          user.uid,
    email:        user.email,
    displayName,
    photoURL:     user.photoURL ?? null,
    role,
    userType:     'abo-kunde' as UserType,
    cancellationWindowHours: 24,
    notificationsEnabled: true,
    language:     'de',
    annualQuotaHours: null,
    masterId:     null,
    fcmTokens:    [],
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
    active:       true,
  });
}

async function ensureUserProfile(user: User) {
  const profileRef = doc(db, 'users', user.uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    await createUserProfile(user, user.displayName ?? user.email ?? 'User');
  }
}

// ─── Auth state listener ──────────────────────────────────────

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
