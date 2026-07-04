import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

// Detects in-app browsers (WhatsApp, Instagram, FB, TikTok, etc.) that
// partition sessionStorage and break Firebase's redirect-based OAuth flow.
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|TikTok|Line\/|MicroMessenger|GSA\//.test(ua);
}

// ─── Sign-in / sign-up ────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  bandName: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await createUserProfile(credential.user, displayName, bandName);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function signInWithGoogle() {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(credential.user);
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string }).code ?? '';
    // Popup blocked (common on mobile/PWA) — fall back to redirect flow
    if (code === 'auth/popup-blocked' || code === 'auth/popup-cancelled' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null; // page will redirect; caller won't reach this
    }
    throw err;
  }
}

/** Call once on app mount to capture the result after a redirect sign-in */
export async function handleGoogleRedirectResult() {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await ensureUserProfile(result.user);
  }
  return result?.user ?? null;
}

export const logOut = () => signOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

// ─── Profile bootstrapping ────────────────────────────────────

async function createUserProfile(user: User, displayName: string, bandName = '') {
  const role: UserRole = MAIN_MASTER_EMAILS.includes(user.email ?? '')
    ? 'main-master'
    : 'mitglied';

  const profileRef = doc(db, 'users', user.uid);
  await setDoc(profileRef, {
    uid:          user.uid,
    email:        user.email,
    displayName,
    bandName,
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
