'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { X, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBooking, CollisionError, DoubleBookingError,
} from '@/lib/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { ROOMS, STUDIO_COMBO_ROOMS, DEFAULT_BOOKING_HOURS, MIN_BOOKING_HOURS } from '@/lib/utils/constants';
import type { RoomId } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

interface Props {
  defaultRoomId?:    string;
  defaultStartTime?: Date;
  canCombo:          boolean;
  onClose:           () => void;
}

export function BookingCreateSheet({ defaultRoomId, defaultStartTime, canCombo, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);

  const now = new Date();
  const defaultStart = defaultStartTime ?? setMinutes(setHours(new Date(), now.getHours() + 1), 0);
  const defaultEnd   = addHours(defaultStart, DEFAULT_BOOKING_HOURS);

  const [selectedRooms, setSelectedRooms] = useState<RoomId[]>(
    defaultRoomId ? [defaultRoomId as RoomId] : [ROOMS[0].id],
  );
  const [startTime, setStartTime] = useState<Date>(defaultStart);
  const [endTime, setEndTime]     = useState<Date>(defaultEnd);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isCombo, setIsCombo]     = useState(false);

  // Combo mode: select Heros + Unstoppable
  function toggleCombo() {
    if (!isCombo) {
      setSelectedRooms(STUDIO_COMBO_ROOMS as RoomId[]);
    } else {
      setSelectedRooms([ROOMS[0].id]);
    }
    setIsCombo(!isCombo);
  }

  function toggleRoom(roomId: RoomId) {
    if (isCombo) return;
    setSelectedRooms([roomId]);
  }

  function formatTimeInput(d: Date) {
    return format(d, "yyyy-MM-dd'T'HH:mm");
  }

  function parseTimeInput(val: string): Date {
    return new Date(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !fbUser) return;

    const durationHours = (endTime.getTime() - startTime.getTime()) / 3600000;
    if (durationHours < MIN_BOOKING_HOURS) {
      toast.error(`Mindestbuchungszeit: ${MIN_BOOKING_HOURS} Stunde`);
      return;
    }
    if (startTime >= endTime) {
      toast.error('Endzeit muss nach der Startzeit liegen.');
      return;
    }

    setLoading(true);
    try {
      await createBooking({
        userId:    fbUser.uid,
        userEmail: profile.email,
        userName:  profile.displayName,
        roomIds:   selectedRooms,
        startTime,
        endTime,
        notes,
        isCombo,
      });
      toast.success('Buchung erfolgreich gespeichert!');

      // Trigger booking reminder notifications via API
      void fetch('/api/notifications/schedule', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: fbUser.uid, startTime: startTime.toISOString(), endTime: endTime.toISOString() }),
      });

      onClose();
    } catch (err) {
      if (err instanceof CollisionError || err instanceof DoubleBookingError) {
        toast.error((err as Error).message, { duration: 5000 });
      } else {
        const code = (err as { code?: string }).code ?? 'unknown';
        const msg  = (err as { message?: string }).message ?? String(err);
        console.error('[Booking] createBooking failed:', code, msg);
        toast.error(`Fehler: ${code}`, { duration: 6000 });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-lg bg-surface rounded-t-[24px] shadow-card-lg pb-safe overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Neue Buchung</h2>
            <button onClick={onClose} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[55vh]">
            {/* Room selector */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Raum
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROOMS.filter((r) => !isCombo || STUDIO_COMBO_ROOMS.includes(r.id)).map((room) => {
                  const selected = selectedRooms.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => toggleRoom(room.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-[10px] px-3 py-2.5 border-2 transition-all text-left',
                        selected
                          ? 'border-current shadow-card'
                          : 'border-border hover:border-border/80',
                      )}
                      style={selected ? { borderColor: room.color, backgroundColor: room.color + '15' } : undefined}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: room.color }}
                      />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">{room.name}</p>
                        <p className="text-[9px] text-text-tertiary">{room.area} m²</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Studio combo toggle (Master only) */}
              {canCombo && (
                <button
                  type="button"
                  onClick={toggleCombo}
                  className={cn(
                    'mt-2 w-full flex items-center gap-2 rounded-[10px] px-3 py-2.5 border-2 transition-all',
                    isCombo ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-border',
                  )}
                >
                  <Info className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-text-primary">
                    Studio Combo (Heros + Unstoppable)
                  </span>
                </button>
              )}
            </div>

            {/* Time picker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  <Clock className="inline w-3.5 h-3.5 mr-1" />Von
                </label>
                <input
                  type="datetime-local"
                  className="input-base text-sm"
                  value={formatTimeInput(startTime)}
                  onChange={(e) => setStartTime(parseTimeInput(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Bis
                </label>
                <input
                  type="datetime-local"
                  className="input-base text-sm"
                  value={formatTimeInput(endTime)}
                  onChange={(e) => setEndTime(parseTimeInput(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Duration display */}
            {endTime > startTime && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock className="w-4 h-4" />
                <span>
                  Dauer: {((endTime.getTime() - startTime.getTime()) / 3600000).toFixed(1)} Stunden
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Notizen (optional)
              </label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Kurze Notiz…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

          </div>
          <div className="px-5 py-4 border-t border-border">
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || selectedRooms.length === 0}
              >
                {loading ? 'Bitte warten…' : 'Buchen'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
