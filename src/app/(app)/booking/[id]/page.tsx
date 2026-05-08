'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { cancelBooking } from '@/lib/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/utils/roleUtils';
import type { Booking } from '@/lib/models/booking';
import { ROOMS } from '@/lib/utils/constants';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

export default function BookingDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const profile  = useAuthStore((s) => s.profile);
  const fbUser   = useAuthStore((s) => s.firebaseUser);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'buchungen', id)).then((snap) => {
      if (snap.exists()) setBooking({ id: snap.id, ...snap.data() } as Booking);
      setLoading(false);
    });
  }, [id]);

  async function handleCancel() {
    if (!fbUser || !booking) return;
    if (!confirm('Buchung wirklich stornieren?')) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id, fbUser.uid);
      toast.success('Buchung storniert.');
      router.back();
    } catch {
      toast.error('Stornierung fehlgeschlagen.');
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = booking && !booking.cancelled && (
    (fbUser?.uid === booking.userId) || (profile ? isAdmin(profile.role) : false)
  );

  // Check cancellation window
  const withinWindow = booking
    ? (booking.startTime.toDate().getTime() - Date.now()) / 3600000 >= (profile?.cancellationWindowHours ?? 24)
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Calendar className="w-10 h-10 text-text-tertiary" />
        <p className="text-sm text-text-secondary">Buchung nicht gefunden.</p>
      </div>
    );
  }

const rooms = ROOMS.filter((r) => (booking.roomIds as string[]).includes(r.id));

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Room colour header */}
      <div
        className="rounded-[16px] p-5 text-white"
        style={{ backgroundColor: rooms[0]?.color ?? '#5c67f2' }}
      >
        <div className="flex items-center gap-2 mb-1">
          {booking.cancelled && (
            <span className="badge bg-white/20 text-white text-[10px]">Storniert</span>
          )}
          {booking.isCombo && (
            <span className="badge bg-white/20 text-white text-[10px]">Studio Combo</span>
          )}
        </div>
        <p className="text-2xl font-bold">{rooms.map((r) => r.name).join(' + ')}</p>
        <p className="text-sm opacity-80 mt-1">{rooms.map((r) => `${r.area} m²`).join(' + ')}</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-text-tertiary">Datum</p>
            <p className="text-sm font-semibold text-text-primary">
              {format(booking.startTime.toDate(), 'EEEE, d. MMMM yyyy', { locale: de })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-text-tertiary">Zeit</p>
            <p className="text-sm font-semibold text-text-primary">
              {format(booking.startTime.toDate(), 'HH:mm')} – {format(booking.endTime.toDate(), 'HH:mm')}
              <span className="text-text-tertiary font-normal ml-2">
                ({(booking.durationMin / 60).toFixed(1)} Std.)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-text-tertiary">Gebucht von</p>
            <p className="text-sm font-semibold text-text-primary">{booking.userName}</p>
            <p className="text-xs text-text-tertiary">{booking.userEmail}</p>
          </div>
        </div>

        {booking.notes && (
          <div className="bg-surface-2 rounded-[10px] p-3">
            <p className="text-xs text-text-tertiary mb-1">Notizen</p>
            <p className="text-sm text-text-primary">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {canCancel && (withinWindow || (profile && isAdmin(profile.role))) && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="btn-danger w-full"
        >
          <Trash2 className="w-4 h-4" />
          {cancelling ? 'Stornieren…' : 'Buchung stornieren'}
        </button>
      )}

      {canCancel && !withinWindow && !(profile && isAdmin(profile.role)) && (
        <div className="card p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">
            Stornierung ist nur bis {profile?.cancellationWindowHours ?? 24} Stunden vor Buchungsbeginn möglich.
          </p>
        </div>
      )}
    </div>
  );
}
