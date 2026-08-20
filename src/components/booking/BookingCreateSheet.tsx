'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addHours, addWeeks, addMonths } from 'date-fns';
import { X, Clock, Info, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBooking, CollisionError, BandQuotaExceededError,
} from '@/lib/services/bookingService';
import { createTicket } from '@/lib/services/supportService';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  ROOMS, STUDIO_COMBO_ROOMS, IMAGINE_HEROS_COMBO_ROOMS, DEFAULT_BOOKING_HOURS, MIN_BOOKING_HOURS,
} from '@/lib/utils/constants';
import type { RoomId } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import { formatLocalizedShortDateTime } from '@/lib/utils/dateUtils';
import { useT } from '@/lib/hooks/useTranslation';
import { TimeSelect } from './TimeSelect';

type RecurrenceFreq = 'weekly' | 'biweekly' | 'monthly';

interface Props {
  defaultRoomId?:    string;
  defaultStartTime?: Date;
  onClose:           () => void;
}

export function BookingCreateSheet({ defaultRoomId, defaultStartTime, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);
  const locale  = useSettingsStore((s) => s.locale);
  const t       = useT();

  const defaultStart = defaultStartTime ?? (() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0); // strip seconds + ms so duration calc is exact
    return d;
  })();
  const defaultEnd = addHours(defaultStart, DEFAULT_BOOKING_HOURS);

  const [selectedRooms, setSelectedRooms] = useState<RoomId[]>(
    defaultRoomId ? [defaultRoomId as RoomId] : [ROOMS[0].id],
  );
  const [startTime, setStartTime] = useState<Date>(defaultStart);
  const [endTime, setEndTime]     = useState<Date>(defaultEnd);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isCombo, setIsCombo]     = useState(false);
  const [isImagineHerosCombo, setIsImagineHerosCombo] = useState(false);

  const [recurring, setRecurring]           = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  function toggleCombo() {
    if (!isCombo) {
      setSelectedRooms(STUDIO_COMBO_ROOMS as RoomId[]);
      setIsImagineHerosCombo(false);
    } else {
      setSelectedRooms([ROOMS[0].id]);
    }
    setIsCombo(!isCombo);
  }

  function toggleImagineHerosCombo() {
    if (!isImagineHerosCombo) {
      setSelectedRooms(IMAGINE_HEROS_COMBO_ROOMS as RoomId[]);
      setIsCombo(false);
    } else {
      setSelectedRooms([ROOMS[0].id]);
    }
    setIsImagineHerosCombo(!isImagineHerosCombo);
  }

  function toggleRoom(roomId: RoomId) {
    if (isCombo || isImagineHerosCombo) return;
    setSelectedRooms([roomId]);
  }

  function buildOccurrences(): { start: Date; end: Date }[] {
    const durationMs = endTime.getTime() - startTime.getTime();
    if (!recurring) return [{ start: startTime, end: endTime }];

    return Array.from({ length: recurrenceCount }, (_, i) => {
      let start: Date;
      if (recurrenceFreq === 'weekly')    start = addWeeks(startTime, i);
      else if (recurrenceFreq === 'biweekly') start = addWeeks(startTime, i * 2);
      else                                start = addMonths(startTime, i);
      return { start, end: new Date(start.getTime() + durationMs) };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !fbUser) return;

    const durationHours = (endTime.getTime() - startTime.getTime()) / 3600000;
    if (durationHours < MIN_BOOKING_HOURS) {
      toast.error(t('Mindestbuchungszeit: {n} Stunde', { n: MIN_BOOKING_HOURS }));
      return;
    }
    if (startTime >= endTime) {
      toast.error(t('Endzeit muss nach der Startzeit liegen.'));
      return;
    }

    setLoading(true);
    const occurrences = buildOccurrences();
    let created = 0;
    let skipped = 0;

    for (const occ of occurrences) {
      try {
        const result = await createBooking({
          userId:    fbUser.uid,
          userEmail: profile.email,
          userName:  profile.displayName,
          bandName:  profile.bandName ?? '',
          roomIds:   selectedRooms,
          startTime: occ.start,
          endTime:   occ.end,
          notes,
          isCombo,
        });
        created++;

        fetch('/api/notifications/schedule', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: fbUser.uid, startTime: occ.start.toISOString(), endTime: occ.end.toISOString() }),
        }).catch(() => {});

        if (result.needsApprovalRoomIds.length > 0) {
          const newRoomNames = selectedRooms.map((id) => ROOMS.find((r) => r.id === id)?.name ?? id).join(' + ');
          const message = isCombo || isImagineHerosCombo
            ? `Kombi-Buchung angefragt: ${newRoomNames} am ${formatLocalizedShortDateTime(occ.start, locale)} benötigt Freigabe.`
            : `Gleichzeitige Buchung: ${newRoomNames} überschneidet sich mit einer bestehenden Buchung in ${[...new Set(result.needsApprovalRoomIds)].map((id) => ROOMS.find((r) => r.id === id)?.name ?? id).join(', ')} am ${formatLocalizedShortDateTime(occ.start, locale)}.`;
          createTicket({
            userId:    fbUser.uid,
            userEmail: profile.email,
            userName:  profile.displayName,
            type:      'doppelbuchung',
            message,
            linkedBookingIds: [result.id],
          }).catch(() => {});
        }
      } catch (err) {
        if (err instanceof CollisionError) {
          skipped++;
        } else if (err instanceof BandQuotaExceededError) {
          skipped++;
          toast.error(err.message, { duration: 6000 });
        } else {
          const code = (err as { code?: string }).code ?? 'unknown';
          const msg  = (err as { message?: string }).message ?? String(err);
          console.error('[Booking] createBooking failed:', code, msg);
          toast.error(t('Fehler: {code}', { code }), { duration: 6000 });
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);

    if (recurring) {
      if (created === 0) {
        toast.error(t('Alle Termine haben einen Konflikt – keine Buchung erstellt.'), { duration: 6000 });
      } else if (skipped > 0) {
        toast.success(
          t('{created} von {total} Terminen gebucht. {skipped} übersprungen (Konflikt).',
            { created, total: occurrences.length, skipped }),
          { duration: 6000 },
        );
      } else {
        toast.success(t('Alle {n} Termine erfolgreich gebucht!', { n: created }));
      }
    } else {
      toast.success(t('Buchung erfolgreich gespeichert!'));
    }

    onClose();
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
            <h2 className="text-lg font-bold text-text-primary">{t('Neue Buchung')}</h2>
            <button onClick={onClose} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[65vh]">
              {/* Room selector */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  {t('Raum')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOMS.filter((r) =>
                    (!isCombo && !isImagineHerosCombo)
                    || (isCombo && STUDIO_COMBO_ROOMS.includes(r.id))
                    || (isImagineHerosCombo && IMAGINE_HEROS_COMBO_ROOMS.includes(r.id)),
                  ).map((room) => {
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
                    {t('Studio Combo (Believe + Unstoppable) — benötigt Freigabe durch Admin')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleImagineHerosCombo}
                  className={cn(
                    'mt-2 w-full flex items-center gap-2 rounded-[10px] px-3 py-2.5 border-2 transition-all',
                    isImagineHerosCombo ? 'border-brand-500 bg-brand-500/10' : 'border-dashed border-border',
                  )}
                >
                  <Info className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-text-primary">
                    {t('Kombi (Imagine + Believe) — benötigt Freigabe durch Admin')}
                  </span>
                </button>
                {(isCombo || isImagineHerosCombo) && (
                  <p className="mt-1.5 text-[11px] text-text-tertiary px-1">
                    {t('Diese Buchung wird als Ticket zur Freigabe an die Verwaltung geschickt.')}
                  </p>
                )}
              </div>

              {/* Time picker */}
              <div className="grid grid-cols-1 gap-3">
                <TimeSelect label={t('Von')} value={startTime} onChange={setStartTime} locale={locale} />
                <TimeSelect label={t('Bis')} value={endTime} onChange={setEndTime} locale={locale} />
              </div>

              {/* Duration display */}
              {endTime > startTime && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="w-4 h-4" />
                  <span>
                    {t('Dauer')}: {((endTime.getTime() - startTime.getTime()) / 3600000).toFixed(1)} {t('Stunden')}
                  </span>
                </div>
              )}

              {/* Recurring toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-semibold text-text-primary">{t('Wiederkehrend')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecurring((v) => !v)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                    recurring ? 'bg-brand-500' : 'bg-border',
                  )}
                  aria-pressed={recurring}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                      recurring ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </div>

              {/* Recurrence options */}
              {recurring && (
                <div className="space-y-3 pl-1">
                  {/* Frequency */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                      {t('Wiederholung')}
                    </label>
                    <div className="flex gap-2">
                      {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setRecurrenceFreq(f)}
                          className={cn(
                            'flex-1 py-2 rounded-[10px] text-xs font-semibold border-2 transition-all',
                            recurrenceFreq === f
                              ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                              : 'border-border text-text-secondary hover:border-border/60',
                          )}
                        >
                          {t(f === 'weekly' ? 'Wöchentlich' : f === 'biweekly' ? '2-wöchentlich' : 'Monatlich')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Occurrence count */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                      {t('Anzahl Termine')}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setRecurrenceCount((c) => Math.max(2, c - 1))}
                        className="w-9 h-9 rounded-[10px] border border-border flex items-center justify-center text-base font-bold text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-bold text-text-primary w-8 text-center">
                        {recurrenceCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecurrenceCount((c) => Math.min(52, c + 1))}
                        className="w-9 h-9 rounded-[10px] border border-border flex items-center justify-center text-base font-bold text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        +
                      </button>
                      <span className="text-xs text-text-tertiary">{t('Termine gesamt')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  {t('Notizen (optional)')}
                </label>
                <textarea
                  className="input-base resize-none"
                  rows={2}
                  placeholder={t('Kurze Notiz…')}
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
                {loading
                  ? t('Bitte warten…')
                  : recurring
                    ? t('{n} Termine buchen', { n: recurrenceCount })
                    : t('Buchen')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
