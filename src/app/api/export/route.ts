export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/adminSdk';
import { hasRole } from '@/lib/utils/roleUtils';
import type { UserRole } from '@/lib/utils/constants';

/** GET /api/export?masterId=xxx — export booking CSV for a Master's circle */
export async function GET(req: NextRequest) {
  try {
    // Verify caller identity from Authorization header
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken    = authHeader.replace('Bearer ', '');
    const decoded    = await adminAuth.verifyIdToken(idToken);

    const callerProfile = await adminDb.collection('users').doc(decoded.uid).get();
    const callerRole    = (callerProfile.data()?.role ?? 'mitglied') as UserRole;

    if (!hasRole(callerRole, 'master')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For Main-Master: can export any masterId; for Master: only own circle
    const masterId = req.nextUrl.searchParams.get('masterId') ?? decoded.uid;
    if (callerRole !== 'main-master' && masterId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch users in circle
    const usersSnap = await adminDb
      .collection('users')
      .where('masterId', '==', masterId)
      .get();

    const year  = new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end   = new Date(`${year}-12-31T23:59:59Z`);

    const rows: string[] = ['UserID,Name,Email,Raum,Start,Ende,Dauer (Min)'];

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const bSnap = await adminDb
        .collection('buchungen')
        .where('userId', '==', userDoc.id)
        .where('cancelled', '==', false)
        .where('startTime', '>=', start)
        .where('startTime', '<=', end)
        .get();

      for (const b of bSnap.docs) {
        const bd = b.data();
        rows.push([
          userDoc.id,
          user.displayName,
          user.email,
          bd.roomIds.join('+'),
          bd.startTime.toDate().toISOString(),
          bd.endTime.toDate().toISOString(),
          bd.durationMin,
        ].join(','));
      }
    }

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="buchungen-${year}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
