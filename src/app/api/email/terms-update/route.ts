export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/adminSdk';
import nodemailer from 'nodemailer';

/** POST /api/email/terms-update — email all users about new Terms document */
export async function POST(req: NextRequest) {
  try {
    const { docId, version, label } = await req.json() as {
      docId:   string;
      version: number;
      label:   string;
    };

    // Fetch all active user emails
    const usersSnap = await adminDb
      .collection('users')
      .where('active', '==', true)
      .get();

    const emails = usersSnap.docs
      .map((d) => d.data().email as string)
      .filter(Boolean);

    if (emails.length === 0) return NextResponse.json({ sent: 0 });

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // Send in batches of 50 (BCC)
    const BATCH = 50;
    let sent = 0;
    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH);
      await transporter.sendMail({
        from:    `musicmaker <${process.env.SMTP_FROM}>`,
        bcc:     batch,
        subject: `Neue ${label} (Version ${version}) — musicmaker`,
        html: `
          <p>Hallo,</p>
          <p>die <strong>${label}</strong> wurde aktualisiert (Version ${version}).</p>
          <p>Bitte lies die aktuellen Dokumente unter
             <a href="${process.env.NEXT_PUBLIC_APP_URL}/terms">
               ${process.env.NEXT_PUBLIC_APP_URL}/terms
             </a>.
          </p>
          <p>Mit freundlichen Grüßen,<br/>Musikschafferei · Linz</p>
        `,
      });
      sent += batch.length;
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('Email error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
