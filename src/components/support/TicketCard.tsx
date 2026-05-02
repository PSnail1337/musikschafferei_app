'use client';

import { useState } from 'react';
import { ChevronRight, Mic, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { updateTicketStatus } from '@/lib/services/supportService';
import { useAuthStore } from '@/store/authStore';
import { TICKET_STATUSES } from '@/lib/utils/constants';
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
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

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
      toast.error('Fehler beim Aktualisieren.');
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
            <span className={statusClass[ticket.status]}>{STATUS_LABELS[ticket.status]}</span>
            <span className="badge bg-surface-3 text-text-secondary">
              {ticket.type === 'feedback' ? 'Feedback' : 'Reklamation'}
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary mt-1.5 truncate">{ticket.message}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {ticket.userName} ·{' '}
            {format(ticket.createdAt.toDate(), 'd. MMM yyyy', { locale: de })}
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
              <p className="text-xs font-semibold text-text-secondary mb-1">Admin-Notiz</p>
              <p className="text-sm text-text-primary">{ticket.adminNotes}</p>
            </div>
          )}

          {/* Status management (Admin+) */}
          {canManage && ticket.status !== 'done' && (
            <div className="flex flex-wrap gap-2">
              {TICKET_STATUSES.filter((s) => s !== ticket.status).map((status) => (
                <button
                  key={status}
                  disabled={updating}
                  onClick={() => handleStatusChange(status)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  → {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
