export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMsg } from '@/lib/firebase/adminSdk';
import { adminAuth } from '@/lib/firebase/adminSdk';
import { REMINDER_BEFORE_START_MIN, REMINDER_BEFORE_END_MIN, LONG_BOOKING_HOURS } from '@/lib/utils/constants';
import { differenceInMinutes } from 'date-fns';

/**
 * POST /api/notifications/schedule
 * Called after a booking is created to queue reminder notifications.
 * In production, replace setTimeout with Cloud Tasks or a cron job.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, startTime, endTime } = await req.json() as {
      userId:    string;
      startTime: string;
      endTime:   string;
    };

    const start   = new Date(startTime);
    const end     = new Date(endTime);
    const durationMin = differenceInMinutes(end, start);

    // Fetch user FCM tokens
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const tokens   = (userSnap.data()?.fcmTokens ?? []) as string[];

    if (tokens.length === 0) return NextResponse.json({ scheduled: false });

    // For production, use Cloud Tasks. Here: setTimeout for dev (not persistent across restarts).
    const msToStart = start.getTime() - Date.now() - REMINDER_BEFORE_START_MIN * 60 * 1000;
    const msToEnd   = end.getTime()   - Date.now() - REMINDER_BEFORE_END_MIN   * 60 * 1000;

    if (msToStart > 0) {
      setTimeout(async () => {
        await adminMsg.sendEachForMulticast({
          tokens,
          notification: {
            title: '🎵 Buchung beginnt bald',
            body:  `In ${REMINDER_BEFORE_START_MIN} Minuten beginnt deine Buchung. Bitte denke daran, den Alarm auszuschalten.`,
          },
        });
      }, msToStart);
    }

    if (msToEnd > 0) {
      setTimeout(async () => {
        await adminMsg.sendEachForMulticast({
          tokens,
          notification: {
            title: '⏰ Buchung endet bald',
            body:  `In ${REMINDER_BEFORE_END_MIN} Minuten endet deine Buchung. Bitte denke daran, den Alarm wieder einzuschalten.`,
          },
        });
      }, msToEnd);
    }

    // Notify Master if booking is >5 hours
    if (durationMin >= LONG_BOOKING_HOURS * 60) {
      // Fetch all masters and notify them
      const mastersSnap = await adminDb
        .collection('users')
        .where('role', 'in', ['master', 'main-master'])
        .get();

      const masterTokens: string[] = [];
      mastersSnap.forEach((d) => {
        masterTokens.push(...((d.data().fcmTokens ?? []) as string[]));
      });

      if (masterTokens.length > 0) {
        await adminMsg.sendEachForMulticast({
          tokens: masterTokens,
          notification: {
            title: '📋 Lange Buchung',
            body:  `Eine Buchung von ${(durationMin / 60).toFixed(1)} Stunden wurde erstellt.`,
          },
        });
      }
    }

    return NextResponse.json({ scheduled: true });
  } catch (err) {
    console.error('Schedule notification error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
