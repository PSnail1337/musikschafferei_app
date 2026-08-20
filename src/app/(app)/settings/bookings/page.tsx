'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Calendar } from 'lucide-react';
import { getAllUserBookings } from '@/lib/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ROOMS } from '@/lib/utils/constants';
import { formatLocalizedShortDateTime } from '@/lib/utils/dateUtils';
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet';
import { useT } from '@/lib/hooks/useTranslation';
import type { Booking } from '@/lib/models/booking';
import { cn } from '@/lib/utils/cn';

export default function MyBookingsPage() {
  const fbUser  = useAuthStore((s) => s.firebaseUser);
  const locale  = useSettingsStore((s) => s.locale);
  const t       = useT();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  async function load() {
    if (!fbUser) return;
    setLoading(true);
    const data = await getAllUserBookings(fbUser.uid);
    setBookings(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [fbUser?.uid]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" className="btn-ghost p-2 -ml-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-lg font-bold text-text-primary">{t('Meine Buchungen')}</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Calendar className="w-10 h-10 text-text-tertiary" />
          <p className="text-sm text-text-secondary">{t('Noch keine Buchungen.')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const rooms = ROOMS.filter((r) => booking.roomIds.includes(r.id));
            return (
              <button
                key={booking.id}
                onClick={() => setSelected(booking)}
                className={cn(
                  'card p-4 w-full flex items-center gap-3 text-left hover:shadow-card-md transition-shadow',
                  booking.cancelled && 'opacity-50',
                  booking.pendingApproval && !booking.cancelled && 'border-2 border-dashed border-warning',
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: rooms[0]?.color ?? '#5c67f2' }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold text-text-primary', booking.cancelled && 'line-through')}>
                    {rooms.map((r) => r.name).join(' + ')}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {formatLocalizedShortDateTime(booking.startTime.toDate(), locale)}
                    {booking.cancelled && <span className="ml-2 text-danger">{t('Storniert')}</span>}
                    {booking.pendingApproval && !booking.cancelled && <span className="ml-2 text-warning">⏳ {t('Wartet auf Freigabe durch Admin')}</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <BookingDetailSheet
          booking={selected}
          onClose={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
