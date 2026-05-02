// Firebase Admin SDK — server-side only (API routes)
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      // Next.js escapes \n in env — un-escape here
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminApp     = getAdminApp();
export const adminAuth    = getAuth(adminApp);
export const adminDb      = getFirestore(adminApp);
export const adminMsg     = getMessaging(adminApp);
