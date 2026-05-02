'use client';

import { useRef } from 'react';
import { format, setHours, setMinutes, addMinutes } from 'date-fns';
import { ROOMS, SLOT_MINUTES } from '@/lib/utils/constants';
import type { Booking } from '@/lib/models/booking';
import { cn } from '@/lib/utils/cn';

interface Props {
  date:        Date;
  bookings:    Booking[];
  canCombo:    boolean;
  onSlotClick: (roomId: string, startTime: Date) => void;
}

const START_HOUR = 6;
const END_HOUR   = 24;
const HOUR_PX    = 60;  // px per hour — determines zoom
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function CalendarLandscape({ date, bookings, canCombo, onSlotClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build hour labels
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
    const y    = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    onSlotClick(roomId, yToTime(y));
  }

  const totalHeight = TOTAL_HOURS * HOUR_PX;

  return (
    <div className="flex overflow-x-auto scrollbar-thin h-full">
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
      <div
        ref={scrollRef}
        className="flex-1 flex gap-px overflow-y-auto scrollbar-thin"
        style={{ height: '100%' }}
      >
        {ROOMS.map((room) => {
          const roomBookings = bookings.filter((b) =>
            b.roomIds.includes(room.id),
          );

          return (
            <div key={room.id} className="flex-1 min-w-[120px] flex flex-col">
              {/* Room header */}
              <div
                className="sticky top-0 z-10 flex flex-col items-center py-2 border-b border-border"
                style={{ backgroundColor: room.color + '20' }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ backgroundColor: room.color }}
                />
                <span className="text-[11px] font-semibold text-text-primary">
                  {room.name}
                </span>
                <span className="text-[9px] text-text-tertiary">{room.area} m²</span>
              </div>

              {/* Clickable time grid */}
              <div
                className="relative flex-1 cursor-pointer"
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] font-bold truncate">{booking.userName}</p>
                      <p className="text-[9px] opacity-80">
                        {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
