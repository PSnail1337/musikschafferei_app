'use client';

import { useRef } from 'react';
import { format } from 'date-fns';
import { ROOMS, SLOT_MINUTES } from '@/lib/utils/constants';
import type { Booking } from '@/lib/models/booking';

interface Props {
  date:           Date;
  bookings:       Booking[];
  canCombo:       boolean;
  onSlotClick:    (roomId: string, startTime: Date) => void;
  onBookingClick: (booking: Booking) => void;
}

const START_HOUR  = 6;
const END_HOUR    = 24;
const HOUR_PX     = 60;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function CalendarLandscape({ date, bookings, canCombo, onSlotClick, onBookingClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hours: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }

  function timeToY(d: Date): number {
    const h = d.getHours() - START_HOUR;
    const m = d.getMinutes();
    return (h + m / 60) * HOUR_PX;
  }

  function yToTime(y: number): Date {
    const totalMins = (y / HOUR_PX) * 60 + START_HOUR * 60;
    const h = Math.floor(totalMins / 60);
    const m = Math.floor((totalMins % 60) / SLOT_MINUTES) * SLOT_MINUTES;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, roomId: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top;
    onSlotClick(roomId, yToTime(y));
  }

  const totalHeight = TOTAL_HOURS * HOUR_PX;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Room headers row (always visible, never scrolls) ── */}
      <div className="flex flex-shrink-0 border-b border-border">
        {/* Spacer for time axis */}
        <div className="w-14 flex-shrink-0" />
        {ROOMS.map((room) => (
          <div
            key={room.id}
            className="flex-1 min-w-[120px] flex flex-col items-center py-2 border-l border-border/30"
            style={{ backgroundColor: room.color + '20' }}
          >
            <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: room.color }} />
            <span className="text-[11px] font-semibold text-text-primary">{room.name}</span>
            <span className="text-[9px] text-text-tertiary">{room.area} m²</span>
          </div>
        ))}
      </div>

      {/* ── Scrollable area: time axis + room grids scroll together ── */}
      <div
        ref={scrollRef}
        className="flex flex-1 overflow-y-auto overflow-x-auto"
      >
        {/* Time axis */}
        <div className="flex-shrink-0 w-14 relative" style={{ height: totalHeight }}>
          {hours.map((label, i) => (
            <div
              key={label}
              className="absolute left-0 right-0 flex items-start justify-end pr-2"
              style={{ top: i * HOUR_PX }}
            >
              <span className="text-[10px] text-text-tertiary font-medium leading-none">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Room columns */}
        {ROOMS.map((room) => {
          const roomBookings = bookings.filter((b) => b.roomIds.includes(room.id));

          return (
            <div
              key={room.id}
              className="flex-1 min-w-[120px] relative cursor-pointer border-l border-border/30"
              style={{ height: totalHeight }}
              onClick={(e) => handleColumnClick(e, room.id)}
            >
              {/* Hour grid lines */}
              {hours.map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: i * HOUR_PX }}
                />
              ))}

              {/* Booking blocks */}
              {roomBookings.map((booking) => {
                const startDate = booking.startTime.toDate();
                const endDate   = booking.endTime.toDate();
                const top    = timeToY(startDate);
                const height = timeToY(endDate) - top;

                return (
                  <div
                    key={booking.id}
                    className="absolute inset-x-0.5 rounded-[8px] px-2 py-1 overflow-hidden cursor-default"
                    style={{
                      top,
                      height,
                      backgroundColor: room.color,
                      color:           room.textColor,
                    }}
                    onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
                  >
                    <p className="text-[10px] font-bold truncate">{booking.userName}</p>
                    <p className="text-[9px] opacity-80">
                      {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
