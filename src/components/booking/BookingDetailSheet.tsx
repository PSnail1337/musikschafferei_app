'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cancelBooking, updateBookingNotes } from '@/lib/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/utils/roleUtils';
import { ROOMS } from '@/lib/utils/constants';
import type { Booking } from '@/lib/models/booking';

interface Props {
  booking: Booking;
  onClose: () => void;
}

export function BookingDetailSheet({ booking, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const fbUser  = useAuthStore((s) => s.firebaseUser);

  const startDate = booking.startTime.toDate();
  const endDate   = booking.endTime.toDate();

  const isOwner    = fbUser?.uid === booking.userId;
  const canEdit    = isOwner || (profile ? isAdmin(profile.role) : false);
  const canCancel  = canEdit;

  const rooms = ROOMS.filter((r) => booking.roomIds.includes(r.id));
  const roomColor = rooms[0]?.color ?? '#5c67f2';

  const [notes, setNotes]       = useState(booking.notes ?? '');
  const [loading, setLoading]   = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function handleSaveNotes() {
    setLoading(true);
    try {
      await updateBookingNotes(booking.id, notes);
      toast.success('Notiz gespeichert.');
      onClose();
    } catch {
      toast.error('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!fbUser) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id, fbUser.uid);
      toast.success('Buchung storniert.');
      onClose();
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      const msg  = (err as Error).message ?? String(err);
      console.error('[BookingDetail] cancelBooking failed:', code, msg, err);
      toast.error(`${code}: ${msg}`.slice(0, 80), { duration: 8000 });
    } finally {
      setCancelling(false);
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-lg bg-surface rounded-t-[24px] shadow-card-lg"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: roomColor }} />
              <h2 className="text-lg font-bold text-text-primary">
                {rooms.map((r) => r.name).join(' + ')}
              </h2>
            </div>
            <button onClick={onClose} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[55vh]">
            {/* Time info */}
            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-primary font-semibold">
                <Clock className="w-4 h-4 text-text-tertiary" />
                {format(startDate, 'EEEE, d. MMMM yyyy', { locale: de })}
              </div>
              <p className="text-sm text-text-secondary pl-6">
                {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}
                <span className="ml-2 text-text-tertiary">
                  ({(booking.durationMin / 60).toFixed(1)} h)
                </span>
              </p>
              <p className="text-xs text-text-tertiary pl-6">{booking.userName}</p>
            </div>

            {/* Notes */}
            {canEdit ? (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Notizen
                </label>
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keine Notizen…"
                />
              </div>
            ) : booking.notes ? (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Notizen</p>
                <p className="text-sm text-text-secondary">{booking.notes}</p>
              </div>
            ) : null}

            {/* Cancel confirmation */}
            {confirmCancel && (
              <div className="card p-4 border border-danger/30 bg-danger/5 space-y-3">
                <p className="text-sm font-semibold text-danger">Buchung wirklich stornieren?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-danger flex-1 py-2 text-sm"
                  >
                    {cancelling ? 'Stornieren…' : 'Ja, stornieren'}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="btn-secondary flex-1 py-2 text-sm"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-border flex gap-2">
            {canCancel && !confirmCancel && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="btn-ghost text-danger flex items-center gap-1.5 px-3"
              >
                <Trash2 className="w-4 h-4" />
                Stornieren
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleSaveNotes}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Speichern…' : 'Speichern'}
              </button>
            )}
            {!canEdit && (
              <button onClick={onClose} className="btn-secondary flex-1">Schließen</button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
