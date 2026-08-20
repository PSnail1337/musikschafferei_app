'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { subscribeBookingsForDay } from '@/lib/services/bookingService';
import { useSettingsStore } from '@/store/settingsStore';
import { formatLocalizedDate } from '@/lib/utils/dateUtils';
import { useT } from '@/lib/hooks/useTranslation';
import type { Booking } from '@/lib/models/booking';
import { CalendarLandscape } from '@/components/booking/CalendarLandscape';
import { CalendarPortrait } from '@/components/booking/CalendarPortrait';
import { BookingCreateSheet } from '@/components/booking/BookingCreateSheet';
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet';
import { DatePickerSheet } from '@/components/booking/DatePickerSheet';

export default function BookingPage() {
  const locale     = useSettingsStore((s) => s.locale);
  const t          = useT();
  const [date, setDate]       = useState<Date>(startOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showCreate, setShowCreate]   = useState<{ roomId?: string; startTime?: Date } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);

  // Detect orientation
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (min-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    setIsLandscape(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Real-time bookings subscription
  useEffect(() => {
    const unsub = subscribeBookingsForDay(date, setBookings);
    return () => unsub();
  }, [date]);

  function prevDay() { setDate((d) => addDays(d, -1)); }
  function nextDay() { setDate((d) => addDays(d, 1)); }

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full">
      {/* Date navigation bar */}
      <div className="sticky top-0 z-30 bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={prevDay}
          className="btn-ghost p-2"
          aria-label={t('Vorheriger Tag')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowDatePicker((v) => !v)}
          className="flex flex-col items-center hover:opacity-70 active:opacity-50 transition-opacity"
          aria-label={t('Datum auswählen')}
        >
          <span className="text-sm font-semibold text-text-primary">
            {formatLocalizedDate(date, locale)}
          </span>
          {isToday && (
            <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mt-0.5">
              {t('Heute')}
            </span>
          )}
        </button>

        <button
          onClick={nextDay}
          className="btn-ghost p-2"
          aria-label={t('Nächster Tag')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar view — switches between landscape (all rooms) and portrait (swipe) */}
      <div className="flex-1 overflow-hidden">
        {isLandscape ? (
          <CalendarLandscape
            date={date}
            bookings={bookings}
            onSlotClick={(roomId, startTime) => setShowCreate({ roomId, startTime })}
            onBookingClick={setSelectedBooking}
          />
        ) : (
          <CalendarPortrait
            date={date}
            bookings={bookings}
            onSlotClick={(roomId, startTime) => setShowCreate({ roomId, startTime })}
            onBookingClick={setSelectedBooking}
          />
        )}
      </div>

      {/* FAB — create booking */}
      <button
        onClick={() => setShowCreate({})}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-brand-500 text-white shadow-card-lg flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all"
        aria-label={t('Neue Buchung')}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create booking bottom sheet */}
      {showCreate !== null && (
        <BookingCreateSheet
          defaultRoomId={showCreate.roomId}
          defaultStartTime={showCreate.startTime}
          onClose={() => setShowCreate(null)}
        />
      )}

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {showDatePicker && (
        <DatePickerSheet
          selected={date}
          onSelect={setDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
