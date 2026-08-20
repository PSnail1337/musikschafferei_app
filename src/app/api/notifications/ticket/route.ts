export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMsg } from '@/lib/firebase/adminSdk';

/**
 * POST /api/notifications/ticket
 * Called after any support ticket is created — pushes a notification to every
 * Admin/Master/Main-Master so a new ticket is never missed.
 */
export async function POST(req: NextRequest) {
  try {
    const { ticketId } = await req.json() as { ticketId: string };
    if (!ticketId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const ticketSnap = await adminDb.collection('support_tickets').doc(ticketId).get();
    const ticket = ticketSnap.data();
    if (!ticket) return NextResponse.json({ sent: 0 });

    const recipientsSnap = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'master', 'main-master'])
      .where('active', '==', true)
      .get();

    const tokens: string[] = [];
    recipientsSnap.forEach((d) => tokens.push(...((d.data().fcmTokens ?? []) as string[])));

    if (tokens.length === 0) return NextResponse.json({ sent: 0 });

    const isDoubleBooking = ticket.type === 'doppelbuchung';
    const title = isDoubleBooking ? '⚠️ Doppelbuchung zur Freigabe' : '🎫 Neues Support-Ticket';
    const body  = isDoubleBooking
      ? `${ticket.userName}: gleichzeitige Buchung in mehreren Räumen benötigt Freigabe.`
      : `${ticket.userName}: ${String(ticket.message ?? '').slice(0, 80)}`;

    const response = await adminMsg.sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { fcmOptions: { link: process.env.NEXT_PUBLIC_APP_URL } },
    });

    return NextResponse.json({ sent: response.successCount });
  } catch (err) {
    console.error('Ticket notification error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
