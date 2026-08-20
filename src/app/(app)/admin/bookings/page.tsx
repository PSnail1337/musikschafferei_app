'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { startOfMonth, endOfMonth, endOfDay } from 'date-fns';
import { getBookingsInRange } from '@/lib/services/bookingService';
import { getUsersByMaster } from '@/lib/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { isMainMaster } from '@/lib/utils/roleUtils';
import { ROOMS } from '@/lib/utils/constants';
import type { RoomId } from '@/lib/utils/constants';
import { formatLocalizedShortDate, formatLocalizedShortDateTime } from '@/lib/utils/dateUtils';
import { DatePickerSheet } from '@/components/booking/DatePickerSheet';
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet';
import type { Booking } from '@/lib/models/booking';
import { cn } from '@/lib/utils/cn';

export default function AdminBookingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const locale  = useSettingsStore((s) => s.locale);

  const [dateFrom, setDateFrom] = useState(startOfMonth(new Date()));
  const [dateTo, setDateTo]     = useState(endOfMonth(new Date()));
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);

  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [visibleUids, setVisibleUids] = useState<Set<string> | null>(null); // null = all
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [roomFilter, setRoomFilter] = useState<RoomId | null>(null);
  const [selected, setSelected]   = useState<Booking | null>(null);

  const isMain = profile ? isMainMaster(profile.role) : false;

  async function load() {
    if (!profile) return;
    setLoading(true);

    if (!isMain) {
      const circle = await getUsersByMaster(profile.uid);
      setVisibleUids(new Set(circle.map((u) => u.uid)));
    } else {
      setVisibleUids(null);
    }

    const data = await getBookingsInRange(dateFrom, endOfDay(dateTo));
    setBookings(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.uid, dateFrom, dateTo]);

  const filtered = bookings.filter((b) => {
    if (visibleUids && !visibleUids.has(b.userId)) return false;
    if (roomFilter && !b.roomIds.includes(roomFilter)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!b.userName.toLowerCase().includes(q) && !(b.bandName ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowPicker('from')} className="input-base text-sm flex-1 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          {formatLocalizedShortDate(dateFrom, locale)}
        </button>
        <span className="text-text-tertiary text-sm">–</span>
        <button onClick={() => setShowPicker('to')} className="input-base text-sm flex-1 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          {formatLocalizedShortDate(dateTo, locale)}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          className="input-base pl-10"
          placeholder="Band oder Mitglied suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Room filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setRoomFilter(null)}
          className={cn(
            'px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all',
            roomFilter === null ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-border text-text-secondary',
          )}
        >
          Alle Räume
        </button>
        {ROOMS.map((room) => (
          <button
            key={room.id}
            onClick={() => setRoomFilter(roomFilter === room.id ? null : room.id)}
            className={cn(
              'px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all',
              roomFilter === room.id ? 'border-current' : 'border-border text-text-secondary',
            )}
            style={roomFilter === room.id ? { borderColor: room.color, backgroundColor: room.color + '15', color: room.textColor } : undefined}
          >
            {room.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-text-secondary">{loading ? '' : `${filtered.length} Buchungen`}</p>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse-soft bg-surface-3" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-secondary">
          Keine Buchungen im gewählten Zeitraum.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => {
            const rooms = ROOMS.filter((r) => booking.roomIds.includes(r.id));
            return (
              <button
                key={booking.id}
                onClick={() => setSelected(booking)}
                className={cn(
                  'card p-4 w-full flex items-center gap-3 text-left hover:shadow-card-md transition-shadow',
                  booking.pendingApproval && 'border-2 border-dashed border-warning',
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: rooms[0]?.color ?? '#5c67f2' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {rooms.map((r) => r.name).join(' + ')}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">
                    {formatLocalizedShortDateTime(booking.startTime.toDate(), locale)} ·{' '}
                    {booking.bandName || booking.userName}
                    {booking.pendingApproval && <span className="ml-2 text-warning">⏳ Wartet auf Freigabe</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showPicker && (
        <DatePickerSheet
          selected={showPicker === 'from' ? dateFrom : dateTo}
          onSelect={(d) => (showPicker === 'from' ? setDateFrom(d) : setDateTo(d))}
          onClose={() => setShowPicker(null)}
        />
      )}

      {selected && (
        <BookingDetailSheet booking={selected} onClose={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
}
