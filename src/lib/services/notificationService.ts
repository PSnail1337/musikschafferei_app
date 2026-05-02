import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getMessagingInstance } from '@/lib/firebase/config';
import { db } from '@/lib/firebase/config';

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

// ─── Client-side: register FCM token ─────────────────────────

export async function registerFCMToken(userId: string): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    const token = await getToken(messaging, { vapidKey: VAPID });
    if (token) {
      // Store token on user profile (array, supports multiple devices)
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(token),
      });
    }
    return token;
  } catch {
    return null;
  }
}

export async function removeFCMToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcmTokens: arrayRemove(token),
  });
}

/** Listen for foreground messages and show a local browser notification */
export async function listenForegroundMessages() {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    const notif = payload.notification;
    if (!notif || Notification.permission !== 'granted') return;
    new Notification(notif.title ?? 'musicmaker', {
      body: notif.body,
      icon: '/icons/icon-192.png',
    });
  });
}

// ─── Server-side helper (called from API routes) ──────────────
// See /api/notifications/route.ts for the actual FCM send logic.
// This file only exports types used by both client and server.

export interface NotificationPayload {
  title: string;
  body:  string;
  data?: Record<string, string>;
}
