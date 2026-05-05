'use client';

import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ROOMS, SLOT_MINUTES } from '@/lib/utils/constants';
import type { Booking } from '@/lib/models/booking';
import { cn } from '@/lib/utils/cn';

interface Props {
  date:        Date;
  bookings:    Booking[];
  onSlotClick: (roomId: string, startTime: Date) => void;
}

const START_HOUR   = 6;
const END_HOUR     = 24;
const HOUR_PX      = 64;
const TOTAL_HOURS  = END_HOUR - START_HOUR;

export function CalendarPortrait({ date, bookings, onSlotClick }: Props) {
  const [roomIdx, setRoomIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const room = ROOMS[roomIdx];

  const handlers = useSwipeable({
    onSwipedLeft:  () => setRoomIdx((i) => Math.min(i + 1, ROOMS.length - 1)),
    onSwipedRight: () => setRoomIdx((i) => Math.max(i - 1, 0)),
    trackMouse:    false,
  });

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
    d.setHours(Math.min(h, 23), m, 0, 0);
    return d;
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top;
    onSlotClick(room.id, yToTime(y));
  }

  const roomBookings = bookings.filter((b) => b.roomIds.includes(room.id));
  const totalHeight  = TOTAL_HOURS * HOUR_PX;

  return (
    <div className="flex flex-col h-full" {...handlers}>
      {/* Room selector tabs */}
      <div className="flex items-center border-b border-border px-2 overflow-x-auto scrollbar-none">
        {ROOMS.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setRoomIdx(i)}
            className={cn(
              'flex-shrink-0 flex flex-col items-center px-4 py-2.5 border-b-2 transition-all',
              i === roomIdx
                ? 'border-current'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
            style={i === roomIdx ? { borderColor: r.color, color: r.color } : undefined}
          >
            <span className="text-xs font-semibold">{r.name}</span>
            <span className="text-[9px] opacity-70">{r.area} m²</span>
          </button>
        ))}
      </div>

      {/* Swipe hint */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-surface-3/60">
        <button
          disabled={roomIdx === 0}
          onClick={() => setRoomIdx((i) => i - 1)}
          className="btn-ghost p-1 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {ROOMS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === roomIdx ? 'w-4' : 'w-1.5 bg-border',
              )}
              style={i === roomIdx ? { backgroundColor: room.color } : undefined}
            />
          ))}
        </div>
        <button
          disabled={roomIdx === ROOMS.length - 1}
          onClick={() => setRoomIdx((i) => i + 1)}
          className="btn-ghost p-1 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex" style={{ height: totalHeight }}>
          {/* Hour labels */}
          <div className="w-14 flex-shrink-0 relative">
            {hours.map((label, i) => (
              <div
                key={label}
                className="absolute right-2 flex items-start"
                style={{ top: i * HOUR_PX }}
              >
                <span className="text-[10px] text-text-tertiary font-medium leading-none">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Booking column */}
          <div
            className="flex-1 relative cursor-pointer"
            onClick={handleGridClick}
          >
            {/* Grid lines */}
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
                  className="absolute inset-x-2 rounded-[10px] px-3 py-2 overflow-hidden"
                  style={{
                    top,
                    height,
                    backgroundColor: room.color + 'dd',
                    color:           room.textColor,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[12px] font-bold truncate">{booking.userName}</p>
                  {height > 30 && (
                    <p className="text-[10px] opacity-80">
                      {format(startDate, 'HH:mm')}–{format(endDate, 'HH:mm')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
