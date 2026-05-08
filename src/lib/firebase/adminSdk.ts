// Firebase Admin SDK — server-side only (API routes)
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
  return _app;
}

// Lazy getters — only initialize when actually called
export const adminAuth = new Proxy({} as Auth, {
  get: (_target, prop) => Reflect.get(getAuth(getAdminApp()), prop),
});

export const adminDb = new Proxy({} as Firestore, {
  get: (_target, prop) => Reflect.get(getFirestore(getAdminApp()), prop),
});

export const adminMsg = new Proxy({} as Messaging, {
  get: (_target, prop) => Reflect.get(getMessaging(getAdminApp()), prop),
});