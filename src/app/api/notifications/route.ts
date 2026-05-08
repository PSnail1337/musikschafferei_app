export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminMsg, adminDb } from '@/lib/firebase/adminSdk';
import type { NotificationPayload } from '@/lib/services/notificationService';

/** POST /api/notifications — send FCM push to one or more users */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userIds:  string[];
      payload:  NotificationPayload;
    };

    const { userIds, payload } = body;
    if (!userIds?.length || !payload?.title) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // Fetch FCM tokens for all users
    const tokens: string[] = [];
    for (const uid of userIds) {
      const snap = await adminDb.collection('users').doc(uid).get();
      const fcmTokens = (snap.data()?.fcmTokens ?? []) as string[];
      tokens.push(...fcmTokens);
    }

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Send multicast message
    const response = await adminMsg.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      data: payload.data ?? {},
      webpush: {
        fcmOptions: { link: process.env.NEXT_PUBLIC_APP_URL },
      },
    });

    return NextResponse.json({ sent: response.successCount });
  } catch (err) {
    console.error('Notification error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
