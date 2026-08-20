'use client';

import { useState } from 'react';
import { ChevronRight, Mic, MessageSquare, Check, X } from 'lucide-react';
import { updateTicketStatus, updateTicketApproval } from '@/lib/services/supportService';
import { cancelBooking, approveBooking } from '@/lib/services/bookingService';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TICKET_STATUSES, TICKET_TYPE_LABELS } from '@/lib/utils/constants';
import { formatLocalizedShortDate } from '@/lib/utils/dateUtils';
import { useT } from '@/lib/hooks/useTranslation';
import type { SupportTicket } from '@/lib/models/support';
import type { TicketStatus } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<TicketStatus, string> = {
  'new':         'Neu',
  'read':        'Gelesen',
  'in-progress': 'In Bearbeitung',
  'done':        'Erledigt',
};

interface Props {
  ticket:    SupportTicket;
  canManage: boolean;
  onRefresh: () => void;
}

export function TicketCard({ ticket, canManage, onRefresh }: Props) {
  const profile  = useAuthStore((s) => s.profile);
  const locale   = useSettingsStore((s) => s.locale);
  const t        = useT();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isPendingDoubleBooking = ticket.type === 'doppelbuchung' && ticket.approvalStatus === 'pending';

  async function handleApproval(approvalStatus: 'accepted' | 'declined') {
    if (!profile) return;
    setUpdating(true);
    try {
      for (const bookingId of ticket.linkedBookingIds ?? []) {
        if (approvalStatus === 'declined') {
          await cancelBooking(bookingId, profile.uid);
        } else {
          await approveBooking(bookingId);
        }
      }
      await updateTicketApproval(ticket.id, approvalStatus, profile.uid);
      toast.success(t(approvalStatus === 'accepted' ? 'Doppelbuchung akzeptiert.' : 'Doppelbuchung abgelehnt, Buchung storniert.'));
      onRefresh();
    } catch {
      toast.error(t('Fehler beim Aktualisieren.'));
    } finally {
      setUpdating(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!profile) return;
    setUpdating(true);
    try {
      await updateTicketStatus(ticket.id, status, profile.uid);

      // Notify user via API
      await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userIds: [ticket.userId],
          payload: {
            title: 'Support-Ticket aktualisiert',
            body:  `Dein Ticket ist jetzt: ${STATUS_LABELS[status]}`,
          },
        }),
      });

      onRefresh();
    } catch {
      toast.error(t('Fehler beim Aktualisieren.'));
    } finally {
      setUpdating(false);
    }
  }

  const statusClass: Record<TicketStatus, string> = {
    'new':         'status-new',
    'read':        'status-read',
    'in-progress': 'status-inprogress',
    'done':        'status-done',
  };

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        {ticket.voiceURL ? (
          <Mic className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5" />
        ) : (
          <MessageSquare className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={statusClass[ticket.status]}>{t(STATUS_LABELS[ticket.status])}</span>
            <span className="badge bg-surface-3 text-text-secondary">
              {t(TICKET_TYPE_LABELS[ticket.type])}
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary mt-1.5 truncate">{ticket.message}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {ticket.userName} ·{' '}
            {formatLocalizedShortDate(ticket.createdAt.toDate(), locale)}
          </p>
        </div>

        <ChevronRight
          className={cn('w-4 h-4 text-text-tertiary flex-shrink-0 transition-transform', open && 'rotate-90')}
        />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          {ticket.voiceURL && (
            <audio controls src={ticket.voiceURL} className="w-full h-8" />
          )}

          {ticket.adminNotes && (
            <div className="bg-surface-3 rounded-[8px] p-3">
              <p className="text-xs font-semibold text-text-secondary mb-1">{t('Admin-Notiz')}</p>
              <p className="text-sm text-text-primary">{ticket.adminNotes}</p>
            </div>
          )}

          {/* Doppelbuchung approval (Admin+) */}
          {canManage && isPendingDoubleBooking ? (
            <div className="flex flex-wrap gap-2">
              <button
                disabled={updating}
                onClick={() => handleApproval('accepted')}
                className="btn-secondary py-1.5 px-3 text-xs text-success"
              >
                <Check className="w-3.5 h-3.5" /> {t('Annehmen')}
              </button>
              <button
                disabled={updating}
                onClick={() => handleApproval('declined')}
                className="btn-secondary py-1.5 px-3 text-xs text-danger"
              >
                <X className="w-3.5 h-3.5" /> {t('Ablehnen')}
              </button>
            </div>
          ) : (
            /* Status management (Admin+) */
            canManage && ticket.status !== 'done' && (
              <div className="flex flex-wrap gap-2">
                {TICKET_STATUSES.filter((s) => s !== ticket.status).map((status) => (
                  <button
                    key={status}
                    disabled={updating}
                    onClick={() => handleStatusChange(status)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    → {t(STATUS_LABELS[status])}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
